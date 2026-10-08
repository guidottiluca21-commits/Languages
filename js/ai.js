/* AI LAYER — LOS.AIProvider + LOS.AI.
 * The deterministic learning engine (queue, scheduling, mastery, errors, sessions) never needs AI.
 * AI is used only where generative reasoning adds value: explanations, examples, conversation,
 * open-production feedback, transformations, content adaptation. Every call has a local fallback.
 *
 * Providers (Settings → AI):
 *   local   — no AI: deterministic implementations only (default; always available)
 *   remote  — YOUR backend proxy: POST <endpoint> { task, lang, payload, tutor } → JSON.
 *             API keys live on that backend, never in this frontend.
 *   ollama  — an optional local model on this computer (http://localhost:11434), free, no key.
 * Adding a provider = LOS.AIProvider.register(name, { label, call(task, lang, payload, tutor) → object|null }). */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const cfg = () => LOS.store.state.settings.ai || {};

  function tutorFor(lang) {
    try { return LOS.ped && lang ? LOS.ped.tutorContext(lang) : null; } catch (e) { return null; }
  }
  async function postJSON(url, body, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms || 30000);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }
  function parseJSON(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { /* model wrapped the JSON in prose */ }
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (e) { return null; }
  }

  /* Prompts for providers that need them (the remote backend receives the raw task instead). */
  const LANG_NAME = (code) => (LOS.lang.get(code) || {}).name || code;
  const PROMPTS = {
    explain: (l, p) => `Explain to an Italian-speaking learner (level ${p.level}) in simple English, max 120 words: ${p.question}. Give 2 example sentences in ${LANG_NAME(l)}. JSON: {"text": string, "examples": [string]}`,
    examples: (l, p) => `Give 4 natural, varied example sentences in ${LANG_NAME(l)} using "${p.w}" (${p.def || ''}), level ${p.level}, contexts: ${p.domains || 'everyday, work'}. JSON: {"examples": [string]}`,
    simTurn: (l, p) => `You are role-playing in ${LANG_NAME(l)}: ${p.role}. Situation: ${p.situation}. Stay in role, speak only ${LANG_NAME(l)}, at level ${p.level}, one or two sentences, and ask one follow-up question that pushes the learner a little further (why / what if / clarification). Conversation so far:\n${p.history.map((h) => (h.who === 'ai' ? 'YOU: ' : 'LEARNER: ') + h.text).join('\n')}\nJSON: {"reply": string}`,
    assess: (l, p) => `Assess this ${p.kind || 'answer'} in ${LANG_NAME(l)} by an Italian-speaking learner (level ${p.level}). Task: ${p.prompt || '-'}. Text: """${p.text}""". Do not just praise. Return at most 3 important errors (those that most affect intelligibility, naturalness, professional communication or that recur), each with the corrected version. JSON: {"communicated": [string], "errors": [{"wrong": string, "right": string, "why": string}], "alternatives": [{"from": string, "to": string}], "missing": [string], "priorities": [string], "followUp": string}`,
    transform: (l, p) => `Rewrite this ${LANG_NAME(l)} text "${p.text}" as: ${p.target} (natural = how a native speaker would say it; formal; informal; professional = workplace email/meeting; different = same idea, different wording; native = several native-like alternatives). Keep the meaning. Explain briefly in English. JSON: {"versions": [string], "note": string}`,
    adaptContent: (l, p) => `From this ${LANG_NAME(l)} text, pick ONLY the language useful for an Italian learner at level ${p.level} with goals ${p.goals}: up to 8 vocabulary items or chunks (with Italian translation, short definition and the sentence from the text), up to 4 useful expressions, 3 comprehension questions (multiple choice, 3 options) and 1 speaking prompt. Text: """${String(p.text).slice(0, 6000)}""". JSON: {"vocab": [{"w": string, "tr": string, "def": string, "ex": string}], "expressions": [string], "questions": [{"q": string, "o": [string], "a": number}], "prompts": [string]}`,
  };
  const SYSTEM = (tutor) => `You are a language tutor inside a structured learning app. Follow these rules: ${(tutor && tutor.rules || []).join(' ')} Learner context: ${JSON.stringify(tutor ? { level: tutor.level, knownVocabulary: (tutor.knownVocabulary || []).slice(0, 40), learningNow: tutor.learningNow, recurringErrors: tutor.recurringErrors, domain: tutor.domain, goal: tutor.goal } : {})}. Always answer with JSON only.`;

  const providers = {
    local: { label: 'Local only (no AI)', available: () => true, call: async () => null },
    remote: {
      label: 'My backend (proxy)',
      available: () => !!cfg().endpoint,
      async call(task, lang, payload, tutor) {
        const data = await postJSON(cfg().endpoint, { task, lang, payload, tutor });
        return data && typeof data === 'object' ? data : null;
      },
    },
    ollama: {
      label: 'Local model (Ollama on this computer)',
      available: () => true,
      async call(task, lang, payload, tutor) {
        const pr = PROMPTS[task];
        if (!pr) return null; // structured legacy tasks stay local with this provider
        const o = cfg().ollama || {};
        const data = await postJSON((o.url || 'http://localhost:11434').replace(/\/$/, '') + '/api/chat', {
          model: o.model || 'llama3.1', stream: false, format: 'json',
          messages: [{ role: 'system', content: SYSTEM(tutor) }, { role: 'user', content: pr(lang, payload) }],
        }, 90000);
        return parseJSON(data && data.message && data.message.content);
      },
    },
  };
  LOS.AIProvider = {
    register(name, impl) { providers[name] = impl; },
    list() { return Object.entries(providers).map(([k, v]) => ({ id: k, label: v.label })); },
    current() { const c = cfg(); const p = providers[c.provider] ? c.provider : 'local'; return p !== 'local' && providers[p].available() ? p : 'local'; },
    /** True when a generative model is configured (the UI then labels feedback as AI feedback). */
    active() { return this.current() !== 'local'; },
    async call(task, lang, payload) {
      const name = this.current();
      if (name === 'local') return null;
      try {
        const r = await providers[name].call(task, lang, payload, tutorFor(lang));
        return r && typeof r === 'object' ? Object.assign({ _source: name }, r) : null;
      } catch (e) {
        console.warn(`[AI] ${name} ${task} failed, using the local implementation:`, e.message);
        return null;
      }
    },
  };

  /* Legacy structured tasks: only the remote backend may replace the local result (same JSON shape). */
  async function run(task, lang, payload, local) {
    if (LOS.AIProvider.current() === 'remote') { const r = await LOS.AIProvider.call(task, lang, payload); if (r) return r; }
    const out = local();
    return out && typeof out === 'object' && !Array.isArray(out) ? Object.assign({ _source: 'local' }, out) : out;
  }
  /* Generative tasks: any provider; local fallback otherwise. */
  async function gen(task, lang, payload, local) {
    const r = await LOS.AIProvider.call(task, lang, payload);
    if (r) return r;
    const out = local();
    return Object.assign({ _source: 'local' }, out || {});
  }
  const lvl = (lang) => { try { return U.LEVELS[LOS.learn.targetLevelIdx(lang, 'writing')]; } catch (e) { return 'B1'; } };

  LOS.AI = {
    /** Exercise for a grammar topic at a difficulty (local: curated bank, adaptive selection). */
    generateExercise: (lang, { topicId, difficulty }) => run('generateExercise', lang, { topicId, difficulty }, () => {
      const t = LOS.lang.get(lang).index.grammar[topicId];
      const pool = t.x.filter((x) => (x.d || 1) === difficulty);
      return { exercise: U.pick(pool.length ? pool : t.x) };
    }),
    /** Writing feedback: corrections, natural versions, dimension scores, CEFR estimate. */
    evaluateWriting: (lang, { text, level, reg, keys, words, genre }) => run('evaluateWriting', lang, { text, level, reg, keys, words, genre }, () => LOS.writing.analyze(lang, text, { level, reg, keys, words })),
    /** Speaking feedback from transcript + duration (local: fluency proxies and rule checks). */
    evaluateSpeaking: (lang, { transcript, secs, level, keys }) => run('evaluateSpeaking', lang, { transcript, secs, level, keys }, () => LOS.writing.analyzeSpeech(lang, transcript, secs, { level, keys })),
    /** New vocabulary to introduce (local: level/frequency/goal-weighted selection from the pack). */
    generateVocabulary: (lang, { count }) => run('generateVocabulary', lang, { count }, () => ({ items: LOS.learn.newVocabCandidates(lang, count) })),
    /** Listening task (local: TTS text at the right level, or an authentic-content suggestion). */
    generateListeningTask: (lang, { minutes }) => run('generateListeningTask', lang, { minutes }, () => ({ text: LOS.learn.pickText(lang, 'listening') })),
    /** Free-production answer check (local: rule checks + target-phrase coverage). */
    evaluateAnswer: (lang, { prompt, answer, keys, model, level }) => run('evaluateAnswer', lang, { prompt, answer, keys, model, level }, () => {
      const a = LOS.writing.analyze(lang, answer, { level, keys, reg: 'neutral' });
      return { analysis: a, keysUsed: a.keysUsed, keysMissing: a.keysMissing, model };
    }),
    /** Professional/medical role-play scenario (local: curated scenario bank). */
    generateScenario: (lang, { area, cat }) => run('generateScenario', lang, { area, cat }, () => LOS.learn.pickScenario(lang, area, { cat })),
    /** Weekly plan (local: planner forecast). */
    generateWeeklyPlan: (lang, { start }) => run('generateWeeklyPlan', lang, { start }, () => LOS.planner.generateWeeklyPlan(start)),

    /* ---------- tutor tasks (generative; local fallbacks from the curriculum) ---------- */
    /** Explain a grammar topic, an item or a question. */
    explain: (lang, { question, topicId, itemId }) => gen('explain', lang, { question: question || topicId || itemId, level: lvl(lang) }, () => {
      const p = LOS.lang.get(lang);
      const t = topicId && p.index.grammar[topicId];
      if (t) return { text: t.explain.join(' '), examples: t.ex.slice(0, 3) };
      const v = itemId && LOS.learn.vocabItem(lang, itemId);
      if (v) return { text: [v.def, v.ctx, v.ff].filter(Boolean).join(' '), examples: [v.ex].concat(v.ctxs || []).filter(Boolean).slice(0, 3) };
      return { text: '', examples: [] };
    }),
    /** More contextual examples for an item (local: the item's own and corpus sentences). */
    examples: (lang, { itemId }) => {
      const v = LOS.learn.vocabItem(lang, itemId) || {};
      return gen('examples', lang, { w: v.w, def: v.def, level: v.l, domains: (LOS.queue.goalDomains(LOS.store.lang(lang)) || []).join(', ') }, () => ({ examples: [v.ex].concat(v.ctxs || []).filter(Boolean).slice(0, 4) }));
    },
    /** Next line of the conversation partner in a scenario simulation (local: scripted follow-ups). */
    simTurn: (lang, payload, local) => gen('simTurn', lang, payload, local),
    /** Structured feedback on free production; the local analysis is always computed (scores, error bank). */
    assess: async (lang, { text, kind, prompt, keys, level, analysis }) => {
      const a = analysis || LOS.writing.analyze(lang, text, { level, keys, reg: 'neutral' });
      const local = LOS.feedback.build(lang, a, { keys, text });
      const r = await LOS.AIProvider.call('assess', lang, { text, kind, prompt, level: level || lvl(lang) });
      if (!r) return local;
      return LOS.feedback.merge(local, r);
    },
    /** Say it differently / make it natural / formal / informal / professional / native-like alternatives. */
    transform: (lang, { text, target }) => gen('transform', lang, { text, target }, () => LOS.feedback.localTransform(lang, text, target)),
    /** Turn a text from the learner's input library into learning material (only what is useful). */
    adaptContent: (lang, { text, title }) => gen('adaptContent', lang, { text, title, level: lvl(lang), goals: (LOS.store.lang(lang).goals || []).join(', ') }, () => LOS.library.localAdapt(lang, text)),

    isRemote() { return LOS.AIProvider.current() === 'remote'; },
    active() { return LOS.AIProvider.active(); },
    providerLabel() { const c = LOS.AIProvider.current(); return (LOS.AIProvider.list().find((p) => p.id === c) || {}).label || 'Local'; },
  };
})();

/* AI-READY ABSTRACTION LAYER.
 * Every "intelligent" operation goes through LOS.AI. Today each one has a local implementation
 * (deterministic, offline). If Settings → AI points to a backend endpoint, the same call is sent as
 *   POST <endpoint>  { task: 'evaluateWriting', lang: 'en', payload: {...} }
 * and the JSON response is used; on any error we fall back to the local implementation.
 * API keys must live on that backend (a small proxy), never in this frontend. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;

  async function remote(task, lang, payload) {
    const cfg = LOS.store.state.settings.ai || {};
    if (cfg.provider !== 'remote' || !cfg.endpoint) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    // Tutor context: what the learner knows, the tutor rules (teach before test, one step at a time, …).
    let tutor = null;
    try { tutor = LOS.ped && lang ? LOS.ped.tutorContext(lang) : null; } catch (e) { tutor = null; }
    try {
      const res = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, lang, payload, tutor }), signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return data && typeof data === 'object' ? Object.assign({ _source: 'remote' }, data) : null;
    } catch (e) {
      console.warn(`[AI] remote ${task} failed, using local implementation:`, e.message);
      return null;
    } finally { clearTimeout(t); }
  }
  async function run(task, lang, payload, local) {
    const r = await remote(task, lang, payload);
    if (r) return r;
    const out = local();
    return out && typeof out === 'object' && !Array.isArray(out) ? Object.assign({ _source: 'local' }, out) : out;
  }

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
    isRemote() { const c = LOS.store.state.settings.ai || {}; return c.provider === 'remote' && !!c.endpoint; },
  };
})();

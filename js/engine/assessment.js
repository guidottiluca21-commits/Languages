/* ADAPTIVE PLACEMENT TEST.
 * Each section keeps its own ability estimate (theta, 0–6). Every next item is the unused item whose
 * difficulty is closest to the current estimate; answers update theta with a Rasch step whose size
 * shrinks as evidence accumulates (big jumps early, fine-tuning later).
 * Productive skills (writing, speaking) combine a performance sample with indirect evidence. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;

  const SECTIONS = [
    { key: 'grammar', label: 'Grammar', n: 7, desc: 'Choose the correct form. Questions adapt to your answers.' },
    { key: 'vocabulary', label: 'Vocabulary', n: 7, desc: 'Meaning, collocations and word choice.' },
    { key: 'reading', label: 'Reading', n: 4, desc: 'Read the text and answer the questions.' },
    { key: 'usage', label: 'Natural use & register', n: 5, desc: 'Which option would a competent speaker actually use?' },
    { key: 'listening', label: 'Listening', n: 4, needs: 'tts', desc: 'Listen (synthesised voice) and answer. You can replay twice.' },
    { key: 'writing', label: 'Writing', desc: 'A short writing sample, analysed locally.' },
    { key: 'speaking', label: 'Speaking (self-assessment)', desc: 'Tick what you can do confidently. Honest answers give a better plan.' },
  ];
  const hasTTS = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

  function bankFor(code, key) {
    const p = LOS.lang.get(code);
    if (key === 'reading' || key === 'listening') {
      const out = [];
      p.texts.filter((t) => t.assess === key).forEach((t) => t.qs.forEach((q, qi) => out.push({ id: `${t.id}#${qi}`, l: t.l, textId: t.id, qi, q: q.q, o: q.o, a: q.a })));
      return out;
    }
    return (p.assessment[key] || []).map((x, i) => Object.assign({ id: `${key}:${i}` }, x));
  }

  function start(code, estimateIdx) {
    const est = estimateIdx == null ? 1.5 : estimateIdx + 0.5;
    const draft = {
      code, started: Date.now(), est,
      si: 0, theta: {}, n: {}, used: [], log: [], queue: [], textPlays: {},
      writing: null, speaking: null, tts: hasTTS(),
    };
    SECTIONS.forEach((s) => { draft.theta[s.key] = est; draft.n[s.key] = 0; });
    if (!draft.tts) draft.skipped = ['listening'];
    return draft;
  }

  function section(draft) { return SECTIONS[draft.si]; }
  function sectionDone(draft) {
    const s = section(draft);
    if (!s) return true;
    if (s.n) return draft.n[s.key] >= s.n && !draft.queue.length;
    if (s.key === 'writing') return !!draft.writing;
    if (s.key === 'speaking') return !!draft.speaking;
    return true;
  }
  function advance(draft) {
    while (draft.si < SECTIONS.length && (sectionDone(draft) || (draft.skipped || []).includes(SECTIONS[draft.si].key))) {
      draft.si++;
      draft.queue = [];
      // carry information forward: later sections start from what we already know
      const next = SECTIONS[draft.si];
      if (next && next.n && draft.n[next.key] === 0) {
        const known = ['grammar', 'vocabulary', 'reading'].filter((k) => draft.n[k] > 0).map((k) => draft.theta[k]);
        if (known.length) draft.theta[next.key] = U.avg(known);
      }
    }
    return draft.si >= SECTIONS.length;
  }

  /** Next item for the current section (or null when the section needs a special UI). */
  function current(draft) {
    advance(draft);
    const s = section(draft);
    if (!s) return { done: true };
    if (!s.n) return { section: s, special: s.key };
    if (draft.queue.length) return { section: s, item: draft.queue[0] };
    const bank = bankFor(draft.code, s.key).filter((x) => !draft.used.includes(x.id));
    if (!bank.length) { draft.n[s.key] = s.n; return current(draft); }
    const th = draft.theta[s.key];
    let best = null;
    bank.forEach((x) => { const d = Math.abs(U.levelIndex(x.l) + 0.5 - th) + Math.random() * 0.15; if (!best || d < best.d) best = { x, d }; });
    let item = best.x;
    if (item.textId) {
      // ask up to two questions on the chosen passage, in order
      const same = bank.filter((x) => x.textId === item.textId).sort((a, b) => a.qi - b.qi).slice(0, 2);
      draft.queue = same;
      item = same[0];
    } else draft.queue = [item];
    return { section: s, item };
  }

  function answer(draft, value) {
    const s = section(draft);
    const item = draft.queue.shift();
    if (!item) return null;
    const correct = Number(value) === item.a;
    const b = U.levelIndex(item.l) + 0.5;
    const n = draft.n[s.key];
    const k = 1.3 / (1 + 0.45 * n);
    const p = LOS.skills.prob(draft.theta[s.key], b);
    draft.theta[s.key] = U.clamp(draft.theta[s.key] + k * ((correct ? 1 : 0) - p), 0.05, 5.95);
    draft.n[s.key] = n + 1;
    draft.used.push(item.id);
    draft.log.push({ section: s.key, id: item.id, l: item.l, correct, topic: item.topic || null, sub: item.sub || null });
    return { correct, expected: item.o[item.a] };
  }

  function skipSection(draft) {
    const s = section(draft);
    if (!s) return;
    draft.skipped = (draft.skipped || []).concat([s.key]);
    draft.queue = [];
  }

  function writingPrompt(draft) {
    const lvlIdx = U.clamp(Math.round(U.avg([draft.theta.grammar, draft.theta.vocabulary]) - 0.5), 0, 5);
    const p = LOS.lang.get(draft.code);
    return { level: U.LEVELS[lvlIdx], prompt: p.assessment.writing[U.LEVELS[lvlIdx]] };
  }
  function submitWriting(draft, text, level) {
    const res = LOS.writing.analyze(draft.code, text, { level, reg: 'neutral' });
    draft.writing = { text, level, est: res.estTheta, scores: res.scores, words: res.words };
    return res;
  }
  function speakingLevels(draft) {
    const base = U.clamp(Math.round(U.avg([draft.theta.grammar, draft.theta.vocabulary, draft.theta.usage]) - 0.5), 0, 5);
    const lo = U.clamp(base - 1, 0, 3);
    return U.LEVELS.slice(lo, lo + 3);
  }
  /** checks: { 'B1': [true,false,true], … } */
  function submitSpeaking(draft, checks) {
    const levels = Object.keys(checks).sort((a, b) => U.levelIndex(a) - U.levelIndex(b));
    let theta = U.levelIndex(levels[0]);
    for (const l of levels) {
      const arr = checks[l] || [];
      const r = arr.length ? arr.filter(Boolean).length / arr.length : 0;
      theta = U.levelIndex(l) + r * 0.99;
      if (r < 0.67) break;
    }
    draft.speaking = { self: U.clamp(theta, 0, 5.95), checks };
  }

  /** Turn the draft into a skill profile and apply it to the language state. */
  function finish(draft) {
    const code = draft.code;
    const lang = LOS.store.lang(code);
    const th = draft.theta;
    const n = draft.n;
    const measured = (k) => n[k] > 0;
    const usage = measured('usage') ? th.usage : U.avg([th.grammar, th.vocabulary]) - 0.2;
    const out = {};
    out.grammar = { theta: th.grammar, conf: 'medium' };
    out.vocabulary = { theta: th.vocabulary, conf: 'medium' };
    out.reading = measured('reading') ? { theta: th.reading, conf: 'medium' } : { theta: U.avg([th.grammar, th.vocabulary]), conf: 'low' };
    out.listening = measured('listening') ? { theta: th.listening, conf: 'medium' } : { theta: out.reading.theta - 0.5, conf: 'low' };
    if (draft.writing) out.writing = { theta: 0.6 * draft.writing.est + 0.4 * U.avg([th.grammar, usage]), conf: 'medium' };
    else out.writing = { theta: U.avg([th.grammar, usage]) - 0.3, conf: 'low' };
    if (draft.speaking) out.speaking = { theta: 0.6 * draft.speaking.self + 0.4 * usage, conf: 'low' };
    else out.speaking = { theta: usage - 0.3, conf: 'low' };
    Object.keys(out).forEach((k) => (out[k].theta = U.clamp(U.round(out[k].theta, 2), 0, 5.95)));

    // apply skills
    Object.keys(out).forEach((k) => LOS.skills.set(lang, k, out[k].theta, out[k].conf));
    const overall = LOS.skills.calculateLevel(lang);

    // sub-indicators
    const subAcc = (sub) => { const l = draft.log.filter((x) => x.sub === sub); return l.length ? l.filter((x) => x.correct).length / l.length : null; };
    const adv = draft.log.filter((x) => U.levelIndex(x.l) >= 4);
    const sub = {
      register: subAcc('register'),
      naturalness: subAcc('naturalness'),
      complexity: draft.writing ? draft.writing.scores.syntax / 5 : null,
      abstract: adv.length ? adv.filter((x) => x.correct).length / adv.length : null,
      fluency: draft.speaking ? U.clamp(draft.speaking.self / 6, 0, 1) : null,
    };

    // strengths / weaknesses / priorities
    const entries = Object.keys(out).map((k) => ({ k, t: out[k].theta }));
    const strengths = entries.filter((e) => e.t >= overall.theta + 0.35).map((e) => e.k);
    let weaknesses = entries.filter((e) => e.t <= overall.theta - 0.35).map((e) => e.k);
    if (!weaknesses.length) weaknesses = entries.sort((a, b) => a.t - b.t).slice(0, 1).map((e) => e.k);
    const missedTopics = [...new Set(draft.log.filter((x) => x.section === 'grammar' && !x.correct && x.topic).map((x) => x.topic))];
    const p = LOS.lang.get(code);
    const priorities = [];
    weaknesses.forEach((w) => priorities.push(`${U.SKILL_LABEL[w]} (${U.thetaInfo(out[w].theta).sub})`));
    missedTopics.slice(0, 3).forEach((t) => p.index.grammar[t] && priorities.push(p.index.grammar[t].title));
    if (sub.register != null && sub.register < 0.6) priorities.push('Register & politeness');
    if (sub.naturalness != null && sub.naturalness < 0.6) priorities.push('Collocations & natural phrasing');

    // seed curriculum: don't make the learner restart from zero
    const gBand = U.thetaInfo(out.grammar.theta).band;
    const vBand = U.thetaInfo(out.vocabulary.theta).band;
    const today = U.today();
    p.grammar.forEach((t) => {
      if (lang.grammar[t.id] && lang.grammar[t.id].last) return;
      const li = U.levelIndex(t.l);
      if (missedTopics.includes(t.id)) lang.grammar[t.id] = LOS.srs.create({ d: 1, seen: [], mastery: 30, interval: 1, last: today, due: today, flagged: true });
      else if (li < gBand - 1) lang.grammar[t.id] = LOS.srs.create({ d: 3, seen: [], mastery: 82, interval: 30, last: today, due: U.addDays(today, 14 + Math.floor(Math.random() * 50)), assumed: true });
      else if (li === gBand - 1) lang.grammar[t.id] = LOS.srs.create({ d: 2, seen: [], mastery: 62, interval: 7, last: today, due: U.addDays(today, 2 + Math.floor(Math.random() * 14)), assumed: true });
    });
    LOS.learn.vocabItems(code).forEach((v) => {
      if (lang.vocab[v.id]) return;
      const li = U.levelIndex(v.l);
      if (li < vBand - 1) lang.vocab[v.id] = LOS.srs.create({ stage: 4, mastery: 80, interval: 60, last: today, due: U.addDays(today, 20 + Math.floor(Math.random() * 70)), assumed: true, introduced: today, stableAt: null });
      else if (li === vBand - 1) lang.vocab[v.id] = LOS.srs.create({ stage: 2, mastery: 50, interval: 5, last: today, due: U.addDays(today, 1 + Math.floor(Math.random() * 12)), assumed: true, introduced: today });
    });

    const frontier = LOS.learn.pickTopic(code, { rnd: () => 0.5 });
    const weakest = weaknesses[0];
    const startingPoint = `Grammar from ${U.LEVELS[Math.min(5, gBand)]} (${frontier ? frontier.topic.title : '—'}), vocabulary around ${U.LEVELS[Math.min(5, vBand + 1)]}, with extra ${U.SKILL_LABEL[weakest].toLowerCase()} practice.`;

    const result = {
      date: today, skills: out, overall: { theta: overall.theta, label: overall.label, sub: overall.sub }, sub,
      strengths, weaknesses, priorities, missedTopics, startingPoint,
      measured: { listening: measured('listening'), writing: !!draft.writing, speaking: !!draft.speaking },
      items: draft.log.length, minutes: Math.max(1, Math.round((Date.now() - draft.started) / 60000)),
    };
    lang.assessments.push(result);
    lang.assessed = true;
    delete lang.assessDraft;
    LOS.store.save(true);
    return result;
  }

  /** Quick start without a test: use the self-estimate as a low-confidence profile. */
  function fromEstimate(code, idx) {
    const lang = LOS.store.lang(code);
    const t = idx + 0.4;
    const offs = { grammar: 0.1, vocabulary: 0, reading: 0.15, listening: -0.35, writing: -0.2, speaking: -0.25 };
    U.SKILLS.forEach((s) => LOS.skills.set(lang, s, U.clamp(t + offs[s], 0, 5.95), 'low'));
    lang.assessed = false;
    LOS.store.save();
  }

  LOS.assessment = { SECTIONS, start, current, answer, skipSection, writingPrompt, submitWriting, speakingLevels, submitSpeaking, finish, fromEstimate, section, hasTTS };
})();

/* PEDAGOGY ENGINE 2.0 — "what does the learner already know, what are they learning now,
 * and what is the next smallest useful step?"
 *
 * Central rule: TEACH → RECOGNIZE → RECALL → PRACTICE → USE → RECYCLE → AUTOMATIZE → EXPAND.
 *
 *  · Every vocabulary item / chunk has a learning stage 0–7 and counters (exposures, recalls, hints…).
 *  · Every grammar topic has a learning stage 0–6.
 *  · The exercise for an item is chosen from its CURRENT stage (never two stages ahead).
 *  · Results are classified (easy · hesitant · after hint · wrong · repeated error) and drive both the
 *    stage and the spaced-repetition grade; scaffolding (hints) is added or removed accordingly.
 *  · Every task (writing, speaking, scenario) has requirements — vocabulary, chunks, grammar — plus
 *    separate language level, task complexity, cognitive load and output length. A complex task is only
 *    generated when the learner is ready; otherwise the engine builds the preparation lesson first.
 *  · Production grows on a ladder (1 sentence → 3 sentences → paragraph → text → essay), independently
 *    of the CEFR label. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const L = (c) => LOS.store.lang(c);
  const P = (c) => LOS.lang.get(c);

  /* ------------------------------------------------------------------ *
   * Stages
   * ------------------------------------------------------------------ */
  const VSTAGES = ['Unseen', 'Exposed', 'Recognized', 'Recalled', 'Controlled production', 'Guided production', 'Spontaneous use', 'Automatic'];
  const VSTAGE_SHORT = ['New', 'Seen', 'Recognize', 'Recall', 'Controlled', 'Guided', 'Spontaneous', 'Automatic'];
  const GSTAGES = ['Not introduced', 'Recognized', 'Understood', 'Controlled use', 'Guided production', 'Independent production', 'Automatic'];
  /* what the learner practises to LEAVE each stage */
  const VNEXT = ['See it', 'Recognize it', 'Recall it', 'Complete it', 'Use it in one sentence', 'Use it freely', 'Use it fast', 'Keep it'];

  function vstage(st) { return st ? U.clamp(st.stage == null ? 0 : st.stage, 0, 7) : 0; }
  function gstage(st) {
    if (!st) return 0;
    if (st.gs != null) return U.clamp(st.gs, 0, 6);
    // states created before Engine 2.0: derive from mastery
    if (!st.last) return st.assumed ? 3 : 0;
    const m = LOS.srs.effective(st);
    return m >= 85 && st.interval >= 14 ? 6 : m >= 70 ? 4 : m >= 45 ? 3 : m >= 20 ? 2 : 1;
  }
  /** Old 0–4 vocabulary scale (before Engine 2.0) → new 0–7 scale. */
  const FROM_OLD_STAGE = { 0: 1, 1: 1, 2: 2, 3: 3, 4: 6 };

  /* ------------------------------------------------------------------ *
   * Chunks & module vocabulary — derived from the content packs (no extra storage)
   * Sources: module.words (core vocabulary of a module), module.col (collocations),
   * module.expr (key phrases), task keys (target phrases of writing/speaking/scenarios).
   * ------------------------------------------------------------------ */
  const cache = {};
  function sentencesWith(pool, phrase) {
    const n = U.norm(phrase);
    if (n.length < 3) return [];
    return pool.filter((s) => U.norm(s).includes(n));
  }
  function buildChunks(code) {
    const p = P(code);
    const out = {};
    const corpus = [];
    const mods = (p.medical || []).concat(p.professional || [], p.abroad || []);
    mods.forEach((m) => { (m.scen || []).forEach((s) => s.model && corpus.push(...U.sentences(s.model))); (m.expr || []).forEach((e) => corpus.push(e.p)); });
    p.vocab.forEach((v) => v.ex && corpus.push(v.ex));
    p.grammar.forEach((t) => corpus.push(...t.ex));
    const add = (w, extra) => {
      w = String(w || '').trim();
      if (!w || w.length < 3 || w.length > 140) return null;
      // a phrase that already is a vocabulary item is taught as that item
      const existing = p.vocab.find((v) => U.norm(v.w) === U.norm(w));
      if (existing) return existing.id;
      const id = code + ':c-' + U.slug(w);
      if (out[id]) { if (extra.tr && !out[id].tr) out[id].tr = extra.tr; return id; }
      const ctx = sentencesWith(corpus, w).filter((s) => U.norm(s) !== U.norm(w));
      out[id] = Object.assign({ id, w, tr: '', def: '', ex: ctx[0] || '', ctxs: ctx.slice(0, 4), pos: '', l: 'B1', k: 'chunk', d: 'general', col: [], syn: [], ant: [], reg: 'neutral', ipa: '', f: 3, ctx: '', ff: '', gen: true }, extra);
      if (!out[id].ex && out[id].k === 'expression') out[id].ex = w;
      return id;
    };
    mods.forEach((m) => {
      const d = (p.medical || []).includes(m) ? 'medical' : (p.abroad || []).includes(m) ? 'abroad' : 'professional';
      const ids = [];
      (m.words || []).forEach((x) => { const id = add(x.w, { tr: x.tr || '', def: x.def || '', ex: x.ex || '', pl: x.pl, g: x.g, l: x.l || m.l, k: x.w.includes(' ') ? 'chunk' : 'word', d, mod: m.id }); if (id) ids.push(id); });
      (m.col || []).forEach((x) => { const id = add(x.p, { def: x.n || '', l: m.l, k: 'collocation', d, mod: m.id }); if (id) ids.push(id); });
      (m.expr || []).forEach((x) => {
        const text = x.p;
        if (text.split(' ').length > 14) return;
        const id = add(text, { def: x.weak ? `Instead of: “${x.weak}”` : x.n || '', alt: x.weak || '', ctx: x.n || '', l: m.l, k: 'expression', d, mod: m.id, reg: d === 'professional' ? 'professional' : 'neutral' });
        if (id) ids.push(id);
      });
      m._req = ids;
    });
    return out;
  }
  function chunks(code) {
    const p = P(code);
    if (!cache[code] || cache[code].pack !== p) cache[code] = { pack: p, items: buildChunks(code) };
    return cache[code].items;
  }
  function chunkItem(code, id) { return chunks(code)[id] || null; }
  /** Teachable item for a target phrase (task key): an existing vocab item, a module chunk, or a context chunk. */
  function itemForPhrase(code, phrase) {
    const p = P(code);
    const n = U.norm(phrase);
    const v = p.vocab.find((x) => U.norm(x.w) === n) || Object.values(chunks(code)).find((x) => U.norm(x.w) === n);
    if (v) return v.id;
    const all = chunks(code);
    const id = code + ':c-' + U.slug(phrase);
    if (all[id]) return id;
    // build a context chunk on the fly if we can find a sentence that uses it (otherwise it is not teachable)
    const pool = Object.values(all).map((x) => x.ex).concat(p.vocab.map((x) => x.ex), ...(p.medical || []).concat(p.professional || [], p.abroad || []).map((m) => (m.scen || []).flatMap((s) => (s.model ? U.sentences(s.model) : []))));
    const ctx = sentencesWith(pool.filter(Boolean), phrase).filter((s) => U.norm(s) !== n);
    if (!ctx.length) return null;
    all[id] = { id, w: phrase, tr: '', def: '', ex: ctx[0], ctxs: ctx.slice(0, 4), pos: '', l: 'B1', k: 'chunk', d: 'general', col: [], syn: [], ant: [], reg: 'neutral', ipa: '', f: 3, ctx: '', ff: '', gen: true };
    return id;
  }

  /* ------------------------------------------------------------------ *
   * Item states: exposure, outcomes, stages
   * ------------------------------------------------------------------ */
  function itemFor(code, id) { return LOS.learn.vocabItem(code, id); }
  function ensureState(code, id) {
    const lang = L(code);
    if (!lang.vocab[id]) lang.vocab[id] = LOS.srs.create({ stage: 0, introduced: null, exp: 0, ok: 0, fail: 0, hints: 0 });
    return lang.vocab[id];
  }
  /** STAGE 0 → 1: the learner has seen/heard the item (no production requested). */
  function expose(code, ids, src = 'lesson') {
    ids.forEach((id) => {
      const st = ensureState(code, id);
      st.exp = (st.exp || 0) + 1;
      st.seen = U.today();
      if (vstage(st) === 0) { st.stage = 1; st.introduced = U.today(); st.src = src; st.due = U.today(); st.last = st.last || null; }
      if (st.reteach) st.reteach = false;
    });
  }

  /** Classify a result. timing in ms; expected depends on the exercise. */
  function classify(res, st) {
    if (!res.correct) return (st && (st.errStreak || 0) >= 1) || res.repeated ? 'repeated' : 'wrong';
    if (res.hint) return 'hint';
    if (res.close || (res.ms && res.expectedMs && res.ms > res.expectedMs)) return 'hesitant';
    return 'easy';
  }
  const OUTCOME_LABEL = { easy: 'Correct — easily', hesitant: 'Correct — with hesitation', hint: 'Correct — with a hint', wrong: 'Not yet', repeated: 'Repeated error — let\'s look at it again' };
  const OUTCOME_GRADE = { easy: 3, hesitant: 2, hint: 1, wrong: 0, repeated: 0 };

  /** Apply an outcome of an exercise practised at item stage `at`. Returns {from, to, outcome}. */
  /* ------------------------------------------------------------------ *
   * Mastery dimensions: recognizing a word is not the same as using it.
   * Each exercise kind feeds one dimension; retention comes from the review schedule.
   * ------------------------------------------------------------------ */
  const DIMS = [['rec', 'Recognition'], ['ctx', 'Contextual comprehension'], ['rcl', 'Recall'], ['ctl', 'Controlled production'], ['fre', 'Free production'], ['pro', 'Professional usage'], ['ret', 'Long-term retention']];
  const DIM_OF = { 'mc-meaning': 'rec', 'mc-reverse': 'rec', audio: 'rec', match: 'rec', choose: 'rec', listen: 'ctx', 'mc-context': 'ctx', 'type-tr': 'rcl', 'type-def': 'rcl', rapid: 'rcl', translate: 'rcl', cloze: 'ctl', build: 'ctl', complete: 'ctl', use: 'fre', free: 'fre', respond: 'fre', spontaneous: 'fre' };
  const PRIOR = { rec: [0, 0.35, 0.8, 0.85, 0.9, 0.92, 0.95, 0.97], ctx: [0, 0.2, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95], rcl: [0, 0, 0.25, 0.7, 0.8, 0.85, 0.9, 0.95], ctl: [0, 0, 0, 0.3, 0.7, 0.8, 0.88, 0.95], fre: [0, 0, 0, 0, 0.3, 0.55, 0.8, 0.92], pro: [0, 0, 0, 0, 0.2, 0.45, 0.7, 0.85] };
  function noteDim(st, dim, score) {
    st.dm = st.dm || {};
    const c = (st.dm[dim] = st.dm[dim] || [0, 0]);
    c[0] = U.round(c[0] + score, 2); c[1] += 1;
    if (c[1] > 12) { c[0] = U.round(c[0] * 12 / c[1], 2); c[1] = 12; } // recent evidence weighs more
  }
  /** Mastery of one item per dimension, 0–1 (null for professional usage of a non-professional item). */
  function mastery(code, id, st) {
    st = st || L(code).vocab[id];
    const out = {};
    const s = vstage(st);
    const v = itemFor(code, id);
    const proItem = v && ['medical', 'professional', 'abroad', 'academic'].includes(v.d);
    DIMS.forEach(([k]) => {
      if (k === 'ret') { out.ret = st && s > 0 ? U.round((LOS.srs.effective(st) || 0) / 100, 2) : 0; return; }
      if (k === 'pro' && !proItem) { out.pro = null; return; }
      const prior = st && st.assumed ? PRIOR[k][5] : PRIOR[k][s];
      const c = (st && st.dm && st.dm[k]) || [0, 0];
      out[k] = U.round((c[0] + prior * 2) / (c[1] + 2), 2);
    });
    return out;
  }
  /** Average of the dimensions over the items the learner has met (assumed items excluded). */
  function masteryProfile(code) {
    const lang = L(code);
    const ids = Object.keys(lang.vocab).filter((id) => !lang.vocab[id].assumed && vstage(lang.vocab[id]) >= 1);
    const sums = {}, ns = {};
    ids.forEach((id) => { const m = mastery(code, id); Object.keys(m).forEach((k) => { if (m[k] == null) return; sums[k] = (sums[k] || 0) + m[k]; ns[k] = (ns[k] || 0) + 1; }); });
    return { n: ids.length, dims: DIMS.map(([k, label]) => ({ k, label, v: ns[k] ? U.round(sums[k] / ns[k], 2) : null })) };
  }

  function recordVocab(code, id, outcome, at, opts = {}) {
    const lang = L(code);
    const st = ensureState(code, id);
    const from = vstage(st);
    const g = OUTCOME_GRADE[outcome];
    LOS.srs.grade(st, g, U.today(), opts.recovery ? { maxInterval: 7 } : {});
    lang.reviewLog = (lang.reviewLog || []).concat([{ id: U.uuid(), k: id, r: g, at: Date.now() }]).slice(-2000);
    st.seen = U.today();
    {
      const dim = DIM_OF[opts.kind] || (opts.spontaneous ? 'fre' : ['rec', 'rec', 'rcl', 'ctl', 'fre', 'fre', 'fre', 'fre'][at == null ? from : at]);
      const sc = outcome === 'easy' ? 1 : outcome === 'hesitant' ? 0.8 : outcome === 'hint' ? 0.5 : 0;
      noteDim(st, dim, sc);
      const vi = itemFor(code, id);
      if (vi && ['medical', 'professional', 'abroad', 'academic'].includes(vi.d) && (dim === 'fre' || dim === 'ctl')) noteDim(st, 'pro', sc);
    }
    if (outcome === 'easy' || outcome === 'hesitant') st.ok = (st.ok || 0) + 1;
    if (outcome === 'hint') st.hints = (st.hints || 0) + 1;
    if (outcome === 'wrong' || outcome === 'repeated') st.fail = (st.fail || 0) + 1;
    if (st.assumed && g >= 2) st.assumed = false;
    const stageOf = at == null ? from : at;
    let to = from;
    const today = U.today();
    const advance = () => {
      // above "recalled", climb at most one stage per day: spacing beats cramming
      if (from >= 3 && st.advAt === today && !opts.sameDayOk) return;
      to = Math.min(7, Math.max(from, stageOf + 1));
      st.advAt = today; st.hes = 0;
    };
    if (outcome === 'easy') advance();
    else if (outcome === 'hesitant') { if ((st.hes || 0) >= 1) advance(); else st.hes = (st.hes || 0) + 1; }
    else if (outcome === 'wrong') { to = Math.max(1, from - 1); st.hes = 0; }
    else if (outcome === 'repeated') { to = 1; st.reteach = true; st.hes = 0; } // TEACH again before the next test
    // the last two stages need evidence over time, not one good answer
    if (to === 7 && !(st.interval >= 21 && (st.streak || 0) >= 3)) to = 6;
    if (to === 6 && from < 6 && !opts.spontaneous && !(st.interval >= 7 && (st.streak || 0) >= 2)) to = Math.min(to, 5);
    st.stage = to;
    if (to >= 4 && !st.stableAt) st.stableAt = today;
    const v = itemFor(code, id);
    if (v && from >= 2) LOS.skills.update(lang, 'vocabulary', U.levelIndex(v.l) + 0.5, g >= 2 ? 1 : g === 1 ? 0.6 : 0, 0.012);
    if ((outcome === 'repeated' || (outcome === 'wrong' && from >= 3)) && v) {
      LOS.learn.recordError(code, { src: 'vocabulary', cat: v.k === 'collocation' ? 'collocation' : 'vocabulary', label: v.k === 'word' ? 'Vocabulary recall' : 'Chunks & collocations', wrong: opts.given || '', right: v.w, note: v.def || v.tr, vocab: id });
    }
    return { from, to, outcome };
  }

  /** Scaffolding: 2 = show hints proactively, 1 = hints on request (first letter), 0 = no hints shown. */
  function hintLevel(st) {
    if (!st) return 2;
    if ((st.errStreak || 0) >= 1 || st.reteach) return 2;
    if ((st.streak || 0) >= 2 && (st.ok || 0) > (st.fail || 0)) return 0;
    return 1;
  }

  /* ------------------------------------------------------------------ *
   * Exercise choice — strictly from the CURRENT stage
   * ------------------------------------------------------------------ */
  const ARTS = (code) => (P(code).articles || []).map((a) => a.toLowerCase());
  function contentTokens(code, w) {
    const stop = new Set((P(code).stop || []).concat(ARTS(code)));
    return U.words(w).filter((t) => !stop.has(t) && t.length > 1);
  }
  /** Locate the item inside a sentence (handles inflection, articles and chunks). */
  function locate(code, v, sentence) {
    if (!sentence) return null;
    const a = LOS.learn.anchor(code, v, sentence);
    if (a) return { start: a.before.length, end: a.before.length + a.target.length, target: a.target };
    // inflected single word: match the first 5 letters
    const toks = contentTokens(code, v.w);
    if (toks.length === 1 && toks[0].length >= 4) {
      const m = new RegExp('(?:^|[^\\p{L}])(' + toks[0].slice(0, Math.max(4, toks[0].length - 2)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\p{L}*)', 'iu').exec(sentence);
      if (m) { const s = m.index + m[0].length - m[1].length; return { start: s, end: s + m[1].length, target: m[1] }; }
    }
    return null;
  }
  function distractors(code, v, field, n, rnd) {
    const pool = LOS.learn.vocabItems(code).concat(Object.values(chunks(code))).filter((x) => x.id !== v.id && x[field] && x[field] !== v[field]);
    const same = pool.filter((x) => x.k === v.k && Math.abs(U.levelIndex(x.l) - U.levelIndex(v.l)) <= 1);
    return U.shuffle(same.length >= n ? same : pool, rnd).slice(0, n).map((x) => x[field]);
  }
  function mcFrom(right, wrong, rnd) { const o = U.shuffle([right].concat(wrong), rnd); return { options: o, answer: o.indexOf(right) }; }

  /** Build the exercise for an item at its current stage. */
  function vocabExercise(code, id, opts = {}) {
    const rnd = opts.rnd || Math.random;
    const v = itemFor(code, id);
    if (!v) return null;
    const st = L(code).vocab[id];
    const stage = opts.stage != null ? opts.stage : vstage(st);
    const hl = hintLevel(st);
    const ctxSentence = v.ex || (v.ctxs || [])[0] || '';
    const loc = locate(code, v, ctxSentence);
    const base = { id, v, stage, hintLevel: hl, next: VNEXT[stage] };
    if (stage === 0 || (st && st.reteach)) return Object.assign(base, { kind: 'expose', stage: 0 });
    if (stage === 1) {
      const kinds = [];
      if (v.tr) kinds.push('mc-meaning', 'mc-reverse');
      if (loc) kinds.push('mc-context');
      if (LOS.speech.ttsSupported && v.tr) kinds.push('audio');
      const kind = opts.kind || U.pick(kinds.length ? kinds : ['mc-context'], rnd);
      if (kind === 'mc-meaning') return Object.assign(base, { kind, prompt: v.w, expectedMs: 7000 }, mcFrom(v.tr, distractors(code, v, 'tr', 3, rnd), rnd));
      if (kind === 'mc-reverse' || kind === 'audio') return Object.assign(base, { kind, prompt: kind === 'audio' ? '' : v.tr, audio: kind === 'audio' ? v.w : null, expectedMs: 8000 }, mcFrom(v.w, distractors(code, v, 'w', 3, rnd), rnd));
      if (!loc) return Object.assign(base, { kind: 'expose', stage: 0 });
      const target = loc.target || ctxSentence.slice(loc.start, loc.end);
      return Object.assign(base, { kind: 'mc-context', before: ctxSentence.slice(0, loc.start), after: ctxSentence.slice(loc.end), expectedMs: 9000 }, mcFrom(target, distractors(code, v, 'w', 3, rnd), rnd));
    }
    if (stage === 2) {
      if (v.tr && (!loc || rnd() < 0.6)) return Object.assign(base, { kind: 'type-tr', prompt: v.tr, sub: v.def, answers: [v.w], hint: v.w.charAt(0) + ' … (' + v.w.length + ')', expectedMs: 14000 });
      if (v.def && !v.gen && rnd() < 0.5) return Object.assign(base, { kind: 'type-def', prompt: v.def, sub: v.tr, answers: [v.w], hint: v.w.charAt(0) + ' …', expectedMs: 15000 });
      if (loc) { const target = loc.target || ctxSentence.slice(loc.start, loc.end); return Object.assign(base, { kind: 'cloze', before: ctxSentence.slice(0, loc.start), after: ctxSentence.slice(loc.end), answers: [target, v.w], hint: target.charAt(0) + ' … (' + target.length + ')', bank: [target].concat(distractors(code, v, 'w', 2, rnd)), expectedMs: 14000 }); }
      return Object.assign(base, { kind: 'type-tr', prompt: v.tr || v.def || v.w, answers: [v.w], hint: v.w.charAt(0) + ' …', expectedMs: 14000 });
    }
    if (stage === 3) {
      const toks = ctxSentence.split(/\s+/).filter(Boolean);
      if (toks.length >= 4 && toks.length <= 14 && rnd() < 0.35) return Object.assign(base, { kind: 'build', tokens: U.shuffle(toks, rnd), answers: [ctxSentence], expectedMs: 30000 });
      if (loc) { const target = loc.target || ctxSentence.slice(loc.start, loc.end); return Object.assign(base, { kind: 'cloze', before: ctxSentence.slice(0, loc.start), after: ctxSentence.slice(loc.end), answers: [target, v.w], hint: target.charAt(0) + ' …', bank: hl >= 2 ? [target].concat(distractors(code, v, 'w', 2, rnd)) : null, expectedMs: 14000 }); }
      return Object.assign(base, { kind: 'type-tr', prompt: v.tr || v.def, answers: [v.w], hint: v.w.charAt(0) + ' …', expectedMs: 12000 });
    }
    if (stage === 4) return Object.assign(base, { kind: 'use', situation: situationFor(code, v, rnd), model: ctxSentence, expectedMs: 90000 });
    // 5–7: fast, automatic retrieval (spontaneous use is recognised in free writing/speaking)
    if (v.tr) return Object.assign(base, { kind: 'rapid', prompt: v.tr, answers: [v.w], expectedMs: stage >= 6 ? 6000 : 8000, timed: true });
    return Object.assign(base, { kind: 'use', situation: situationFor(code, v, rnd), model: ctxSentence, expectedMs: 60000 });
  }
  const SITUATIONS = {
    medical: ['to a patient', 'to a colleague on the ward', 'in a handover', 'in a clinical note'],
    professional: ['in a message to a colleague', 'in a meeting', 'in an email to your manager'],
    academic: ['in the discussion of a study', 'in a presentation'],
    general: ['about your day', 'about your work', 'about a friend', 'about your last holiday'],
  };
  function situationFor(code, v, rnd) { return U.pick(SITUATIONS[v.d] || SITUATIONS.general, rnd); }

  /** Check an exercise answer. Returns {correct, close, note, expected}. */
  function checkVocab(code, ex, given, extra = {}) {
    if (ex.options) { const ok = Number(given) === ex.answer; return { correct: ok, expected: ex.options[ex.answer] }; }
    if (ex.kind === 'build') { const r = LOS.learn.checkAnswer({ t: 'fix', a: ex.answers }, given, code); return r; }
    if (ex.kind === 'use') return checkUse(code, ex.v, given);
    return LOS.learn.checkAnswer({ t: 'gap', a: ex.answers }, given, code);
  }
  /** Guided production: does the learner's sentence actually use the item, without rule-based errors? */
  function usesItem(code, v, text) {
    const toks = contentTokens(code, v.w);
    if (!toks.length) return U.norm(text).includes(U.norm(v.w));
    const words = U.words(text);
    const has = (t) => words.some((w) => w === t || (t.length >= 5 && w.startsWith(t.slice(0, Math.max(4, t.length - 2)))) || (t.length >= 4 && w.includes(t.slice(0, 4)) && Math.abs(w.length - t.length) <= 4));
    const n = toks.filter(has).length;
    return n >= Math.max(1, Math.ceil(toks.length * 0.7));
  }
  function checkUse(code, v, text) {
    const t = String(text || '').trim();
    if (U.words(t).length < 3) return { correct: false, note: 'Write a complete sentence (at least 3 words).', expected: v.ex || v.w };
    if (!usesItem(code, v, t)) return { correct: false, note: `The sentence does not use “${v.w}”.`, expected: v.ex || v.w };
    const a = LOS.writing.analyze(code, t, { level: v.l });
    if (a.errors.length) return { correct: false, close: false, note: a.errors[0].why, expected: a.sentencesOut[0] ? a.sentencesOut[0].corrected : v.ex, analysis: a };
    return { correct: true, close: a.hints.length > 0, note: a.hints.length ? a.hints[0].why : '', expected: v.ex, analysis: a };
  }

  /** Free text (writing, speaking transcript, think answer): items at stage ≥ 4 used correctly become "spontaneous". */
  function detectUse(code, text) {
    const lang = L(code);
    const used = [];
    Object.keys(lang.vocab).forEach((id) => {
      const st = lang.vocab[id];
      const s = vstage(st);
      if (s < 4 || s >= 6) return;
      const v = itemFor(code, id);
      if (v && usesItem(code, v, text)) { recordVocab(code, id, 'easy', s, { spontaneous: true, sameDayOk: true }); if (vstage(st) < 6 && s >= 5) st.stage = 6; used.push(v.w); }
    });
    return used;
  }

  /* ------------------------------------------------------------------ *
   * Grammar stages
   * ------------------------------------------------------------------ */
  /** Exercise types allowed at a grammar stage: recognition first, transformation last. */
  function grammarTypes(gs) {
    if (gs <= 1) return ['mc'];
    if (gs === 2) return ['mc', 'gap'];
    if (gs === 3) return ['gap', 'fix', 'mc'];
    return ['gap', 'fix', 'tr', 'mc'];
  }
  /** Update a topic's stage from a drill's results [{t, correct}] and whether production succeeded. */
  function updateGrammarStage(code, topicId, results, opts = {}) {
    const st = LOS.learn.topicState(code, topicId);
    const before = gstage(st);
    const acc = (t) => { const r = results.filter((x) => t.includes(x.t)); return r.length ? { n: r.length, a: r.filter((x) => x.correct).length / r.length } : { n: 0, a: 0 }; };
    const all = results.length ? results.filter((x) => x.correct).length / results.length : 0;
    let gs = Math.max(before, opts.taught ? 1 : 0);
    const mc = acc(['mc']), ctl = acc(['gap', 'fix']), trf = acc(['tr']);
    if (gs >= 1 && mc.n >= 1 && mc.a >= 0.8) gs = Math.max(gs, 2);
    if (gs >= 2 && ctl.n >= 2 && ctl.a >= 0.75) gs = Math.max(gs, 3);
    if (gs >= 3 && opts.produced && (trf.n === 0 || trf.a >= 0.6) && all >= 0.75) gs = Math.max(gs, 4);
    if (gs >= 4 && all >= 0.9 && (st.gs4 || 0) >= 1 && !LOS.learn.errorPressure(code, topicId, 14)) gs = Math.max(gs, 5);
    if (gs >= 4) st.gs4 = (st.gs4 || 0) + 1;
    if (results.length >= 3 && all < 0.5) gs = Math.max(1, Math.min(gs, before) - 1);
    if (gs >= 5 && LOS.srs.status(st) === 'mastered') gs = 6;
    st.gs = gs;
    return { before, after: gs };
  }

  /* ------------------------------------------------------------------ *
   * Tasks: requirements, difficulty dimensions, readiness
   * ------------------------------------------------------------------ */
  const COMPLEXITY = { describe: 1, roleplay: 2, explain: 2, interview: 3, debate: 4, presentation: 4 };
  function genreComplexity(g) {
    const s = String(g || '').toLowerCase();
    if (/essay|ensayo|erörterung|essai|dissertation|crit|reseñ|stellungnahme|prise de position|propo|vorschlag|variation|registr/.test(s)) return 4;
    if (/opinion|opinión|meinung|argument/.test(s)) return 3;
    if (/narra|erzähl|récit|description|beschreibung|descripción/.test(s)) return 2;
    if (/mess|nachricht|mail|correo|courriel|lettre|brief|carta/.test(s)) return 2;
    return 3;
  }
  function vocabInText(code, text, maxLevel) {
    if (!text) return [];
    const n = ' ' + U.norm(text) + ' ';
    return LOS.learn.vocabItems(code).filter((v) => !v.custom && U.levelIndex(v.l) <= maxLevel && v.w.length >= 4 && n.includes(' ' + U.norm(v.w).split(' ').slice(ARTS(code).includes(U.norm(v.w).split(' ')[0]) ? 1 : 0).join(' '))).slice(0, 14).map((v) => v.id);
  }
  /** meta(code, kind, task, module?) → requirements and difficulty dimensions of a task. */
  function taskMeta(code, kind, task, mod) {
    const p = P(code);
    const level = (mod && mod.l) || task.l || 'B1';
    const li = U.levelIndex(level);
    chunks(code); // makes sure module._req is built
    let chunkIds = (task.keys || []).map((k) => itemForPhrase(code, k)).filter(Boolean);
    let vocabIds = [];
    let complexity, load, out;
    if (kind === 'scenario') {
      chunkIds = chunkIds.concat((mod._req || []).slice(0, 10));
      vocabIds = vocabInText(code, task.model, li);
      complexity = task.mode === 'write' ? 3 : Math.min(5, 2 + Math.round((task.model || '').length / 400));
      load = li >= 4 ? 4 : 3;
      out = { unit: task.mode === 'write' ? 'sentences' : 'seconds', min: task.mode === 'write' ? 4 : 60, max: task.mode === 'write' ? 8 : 120, label: task.mode === 'write' ? '4–8 sentences' : '1–2 minutes' };
    } else if (kind === 'writing') {
      vocabIds = vocabInText(code, task.p, li);
      complexity = genreComplexity(task.genre);
      load = task.words[1] >= 250 ? 5 : task.words[1] >= 150 ? 4 : task.words[1] >= 90 ? 3 : 2;
      out = { unit: 'words', min: task.words[0], max: task.words[1], label: `${task.words[0]}–${task.words[1]} words` };
    } else {
      vocabIds = vocabInText(code, task.p, li);
      complexity = COMPLEXITY[task.type] || 2;
      load = (task.secs || 60) >= 120 ? 4 : (task.secs || 60) >= 90 ? 3 : 2;
      out = { unit: 'seconds', min: task.secs || 60, max: task.secs || 60, label: `${task.secs || 60} seconds` };
    }
    const grammar = p.grammar.filter((t) => { const d = li - U.levelIndex(t.l); return d >= 0 && d <= 1; }).map((t) => t.id);
    const uniq = (a) => [...new Set(a)];
    return {
      key: kind + ':' + (mod ? mod.id + ':' + (mod.scen || []).indexOf(task) : task.id), kind, level,
      requiredVocabulary: uniq(vocabIds).filter((id) => !chunkIds.includes(id)), requiredChunks: uniq(chunkIds), requiredGrammar: grammar,
      languageLevel: level, taskComplexity: complexity, cognitiveLoad: load, outputLength: out,
    };
  }
  /** Is the learner ready for this task? Returns detailed counts (shown to the learner). */
  function readiness(code, meta) {
    const lang = L(code);
    const need = meta.taskComplexity >= 4 ? 4 : 3; // complex tasks need controlled production, others recall
    const known = (id) => { const st = lang.vocab[id]; return vstage(st) >= need || (st && st.assumed && vstage(st) >= 3); };
    const v = meta.requiredVocabulary, c = meta.requiredChunks;
    const vHave = v.filter(known), cHave = c.filter(known);
    const g = meta.requiredGrammar;
    const gHave = g.filter((id) => gstage(lang.grammar[id]) >= 3 || (lang.grammar[id] && lang.grammar[id].assumed));
    const share = (h, a) => (a.length ? h.length / a.length : 1);
    const vPct = share(vHave, v), cPct = share(cHave, c), gPct = share(gHave, g);
    const lexical = share(vHave.concat(cHave), v.concat(c));
    const gNeed = meta.taskComplexity >= 4 ? 0.7 : 0.55;
    // a placement / practice estimate comfortably above the task level also covers its grammar
    const thG = LOS.skills.theta(lang, 'grammar');
    const gEst = thG != null && thG >= U.levelIndex(meta.languageLevel) + 0.5;
    const ready = lexical >= 0.7 && (gPct >= gNeed || gEst);
    return {
      ready, need, grammarOk: gPct >= gNeed || gEst,
      vocab: { have: vHave.length, total: v.length, pct: vPct, missing: v.filter((id) => !known(id)) },
      chunks: { have: cHave.length, total: c.length, pct: cPct, missing: c.filter((id) => !known(id)) },
      grammar: { have: gHave.length, total: g.length, pct: gPct, missing: g.filter((id) => !gHave.includes(id)).slice(0, 4) },
    };
  }
  /** Store requirements, readiness and progress of a task (synced as learning_tasks). */
  function taskState(code, meta) {
    const lang = L(code);
    lang.tasks = lang.tasks || {};
    const t = (lang.tasks[meta.key] = lang.tasks[meta.key] || { step: 0, attempts: 0, best: null });
    Object.assign(t, { kind: meta.kind, level: meta.languageLevel, complexity: meta.taskComplexity, load: meta.cognitiveLoad, out: meta.outputLength.label, req: { v: meta.requiredVocabulary, c: meta.requiredChunks, g: meta.requiredGrammar } });
    return t;
  }

  /* ------------------------------------------------------------------ *
   * Production ladder (output length grows with evidence, not with the CEFR label)
   * ------------------------------------------------------------------ */
  const LADDER = {
    writing: [null, { label: 'one sentence', words: [5, 25], sentences: 1 }, { label: '2–3 sentences', words: [15, 45], sentences: 3 }, { label: '3–5 sentences', words: [30, 80], sentences: 5 }, { label: 'a paragraph (80–120 words)', words: [80, 120] }, { label: 'a short text (120–200 words)', words: [120, 200] }, { label: 'the full task', words: null }],
    speaking: [null, { label: 'one sentence (15 s)', secs: 15 }, { label: '2–3 sentences (30 s)', secs: 30 }, { label: '45–60 seconds', secs: 60 }, { label: '90 seconds', secs: 90 }, { label: '2 minutes', secs: 120 }, { label: 'the full task', secs: null }],
  };
  function prodStep(code, kind) {
    const lang = L(code);
    lang.prod = lang.prod || {};
    if (lang.prod[kind] == null) {
      const th = LOS.skills.theta(lang, kind === 'writing' ? 'writing' : 'speaking');
      lang.prod[kind] = U.clamp(th == null ? 1 : Math.round(th), 1, 4);
    }
    return lang.prod[kind];
  }
  /** Adapt a task to the learner's current step: smaller output, same communicative goal. */
  function scaleTask(code, kind, task) {
    const step = prodStep(code, kind);
    const rung = LADDER[kind][step];
    if (kind === 'writing') {
      if (!rung.words || task.words[0] <= rung.words[1]) return { task, scaled: false, step, rung };
      return { task: Object.assign({}, task, { words: rung.words, scaledFrom: task.words }), scaled: true, step, rung };
    }
    const secs = task.secs || 60;
    if (!rung.secs || secs <= rung.secs) return { task, scaled: false, step, rung };
    return { task: Object.assign({}, task, { secs: rung.secs, scaledFrom: secs }), scaled: true, step, rung };
  }
  /** After a production: two good results at the current step unlock the next one. */
  /* Speaking progression ladder: what KIND of speaking, from one sentence to professional discussion. */
  const SPEAK_LADDER = [null,
    { label: 'One-sentence answers', think: ['rapid', 'situational'] },
    { label: '2–3 sentence answers', think: ['describe', 'synonym', 'situational'] },
    { label: 'Explain something', speak: ['explain'], think: ['explain', 'conceptual'] },
    { label: 'Narrate an experience', speak: ['describe'], think: ['monologue', 'describe'] },
    { label: 'Express and justify an opinion', speak: ['debate'], think: ['opinion', 'defend'] },
    { label: 'React spontaneously', speak: ['spontaneous', 'problem'], think: ['spontaneous'] },
    { label: 'Handle interruptions, disagreement and uncertainty', speak: ['roleplay', 'problem'], sim: true },
    { label: 'Professional discussion', speak: ['presentation', 'interview'], sim: true },
  ];
  function speakLevel(code) {
    const lang = L(code);
    if (lang.speakLevel == null) { const th = LOS.skills.theta(lang, 'speaking'); lang.speakLevel = U.clamp(1 + Math.round((th == null ? 0.5 : th) * 1.3), 1, 6); }
    return lang.speakLevel;
  }
  /** Two good results at a level → next level; two weak results in a row → one level down (trend, not one score). */
  function recordSpeak(code, score) {
    const lang = L(code);
    const lv = speakLevel(code);
    lang.speakWins = lang.speakWins || {};
    let moved = 0;
    if (score >= 0.7) { lang.speakWins[lv] = (lang.speakWins[lv] || 0) + 1; if (lang.speakWins[lv] >= 2 && lv < 8) { lang.speakLevel = lv + 1; moved = 1; } }
    else if (score < 0.4 && lang.speakLast != null && lang.speakLast < 0.5 && lv > 1) { lang.speakLevel = lv - 1; lang.speakWins[lv] = 0; moved = -1; }
    lang.speakLast = score;
    return { level: lang.speakLevel, moved, label: SPEAK_LADDER[lang.speakLevel].label };
  }

  function recordProduction(code, kind, score, scaled) {
    const lang = L(code);
    const step = prodStep(code, kind);
    lang.prodWins = lang.prodWins || {};
    const k = kind + step;
    let moved = 0;
    if (score >= 0.7) {
      lang.prodWins[k] = (lang.prodWins[k] || 0) + 1;
      if (lang.prodWins[k] >= 2 && step < 6) { lang.prod[kind] = step + 1; moved = 1; }
    } else if (score < 0.4 && step > 1) {
      // step down on a trend, not on a single bad day: two weak results in a row
      lang.prodWins[k] = 0;
      if (!scaled && (lang.prodLast || {})[kind] != null && lang.prodLast[kind] < 0.5) { lang.prod[kind] = step - 1; moved = -1; }
    }
    lang.prodLast = Object.assign({}, lang.prodLast, { [kind]: score });
    return { step: lang.prod[kind], moved };
  }

  /* ------------------------------------------------------------------ *
   * Micro-tasks — small, varied exercises built from material already taught
   * ------------------------------------------------------------------ */
  function learnedIds(code, minStage, max = 40) {
    const lang = L(code);
    return Object.keys(lang.vocab).filter((id) => vstage(lang.vocab[id]) >= minStage && itemFor(code, id))
      .sort((a, b) => String(lang.vocab[b].seen || lang.vocab[b].last || '').localeCompare(String(lang.vocab[a].seen || lang.vocab[a].last || ''))).slice(0, max);
  }
  function microSet(code, focus, n, opts = {}) {
    const rnd = opts.rnd || Math.random;
    const p = P(code), lang = L(code);
    const lvl = LOS.learn.targetLevelIdx(code, 'grammar');
    const out = [];
    const recent = learnedIds(code, 1);
    const recall = learnedIds(code, 2);
    const topics = p.grammar.filter((t) => gstage(lang.grammar[t.id]) >= 2);
    const gen = {
      choose: () => { const id = U.pick(recent, rnd); return id && Object.assign(vocabExercise(code, id, { rnd, stage: 1 }) || {}, { micro: 'choose', title: 'Choose' }); },
      listen: () => { if (!LOS.speech.ttsSupported) return null; const id = U.pick(recent.filter((x) => itemFor(code, x).tr), rnd); return id && Object.assign(vocabExercise(code, id, { rnd, stage: 1, kind: 'audio' }) || {}, { micro: 'listen', title: 'Listen' }); },
      complete: () => { const id = U.pick(recall.length ? recall : recent, rnd); const e = id && vocabExercise(code, id, { rnd, stage: 3 }); return e && e.kind === 'cloze' ? Object.assign(e, { micro: 'complete', title: 'Complete' }) : null; },
      translate: () => { const id = U.pick(recall.filter((x) => itemFor(code, x).tr), rnd); return id && Object.assign(vocabExercise(code, id, { rnd, stage: 2 }) || {}, { kind: 'type-tr', prompt: itemFor(code, id).tr, answers: [itemFor(code, id).w], hint: itemFor(code, id).w.charAt(0) + ' …', micro: 'translate', title: 'Translate' }); },
      build: () => { const id = U.pick(recall.length ? recall : recent, rnd); const v = id && itemFor(code, id); const s = v && (v.ex || (v.ctxs || [])[0]); const toks = s ? s.split(/\s+/) : []; return toks.length >= 4 && toks.length <= 13 ? { micro: 'build', title: 'Build the sentence', kind: 'build', id, v, tokens: U.shuffle(toks, rnd), answers: [s], stage: 3 } : null; },
      match: () => { const ids = U.shuffle(recent.filter((x) => itemFor(code, x).tr), rnd).slice(0, 4); return ids.length >= 3 ? { micro: 'match', title: 'Match', kind: 'match', pairs: ids.map((x) => ({ id: x, w: itemFor(code, x).w, tr: itemFor(code, x).tr })), order: U.shuffle(ids, rnd) } : null; },
      correct: () => {
        const errs = (lang.errors || []).filter((e) => !e.resolved && e.wrong && e.right && e.wrong.length < 160);
        if (errs.length && rnd() < 0.5) { const e = U.pick(errs, rnd); return { micro: 'correct', title: 'Correct', kind: 'fix', ex: { t: 'fix', q: e.wrong, a: [e.right], w: e.note || '', d: 1 }, errorId: e.id }; }
        const t = U.pick(topics, rnd); const x = t && U.pick(t.x.filter((y) => y.t === 'fix'), rnd);
        return x ? { micro: 'correct', title: 'Correct', kind: 'fix', ex: x, topic: t.id } : null;
      },
      grammar: () => { const t = U.pick(topics.length ? topics : p.grammar.filter((y) => lang.grammar[y.id]), rnd); if (!t) return null; const types = grammarTypes(gstage(lang.grammar[t.id])); const x = U.pick(t.x.filter((y) => types.includes(y.t) && y.t !== 'tr'), rnd); return x ? { micro: 'grammar', title: x.t === 'mc' ? 'Choose' : 'Complete', kind: 'gram', ex: x, topic: t.id } : null; },
      natural: () => { const u = (p.assessment.usage || []).filter((x) => U.levelIndex(x.l) <= lvl + 1); const x = U.pick(u.filter((y) => y.sub === 'naturalness'), rnd); return x ? { micro: 'natural', title: 'Choose the natural expression', kind: 'mcq', prompt: x.q, options: x.o, answer: x.a } : null; },
      register: () => {
        const pairs = (p.professional || []).filter((m) => U.levelIndex(m.l) <= lvl + 1).flatMap((m) => m.expr.filter((e) => e.weak));
        const e = U.pick(pairs, rnd);
        if (e) { const o = U.shuffle([e.p, e.weak], rnd); return { micro: 'register', title: 'Formal or informal?', kind: 'mcq', prompt: 'Which version fits a professional email or meeting?', options: o, answer: o.indexOf(e.p), why: e.n || '' }; }
        const x = U.pick((p.assessment.usage || []).filter((y) => y.sub === 'register' && U.levelIndex(y.l) <= lvl + 1), rnd);
        return x ? { micro: 'register', title: 'Choose the right register', kind: 'mcq', prompt: x.q, options: x.o, answer: x.a } : null;
      },
      dialogue: () => {
        const ts = p.texts.filter((t) => t.kind === 'dialogue' || / — /.test(t.text)).filter((t) => U.levelIndex(t.l) <= lvl + 1);
        const t = U.pick(ts, rnd);
        const turns = t ? t.text.split(/\s+—\s+/).filter((x) => x.length > 2) : [];
        if (turns.length < 3) return null;
        const i = 1 + Math.floor(rnd() * (turns.length - 1));
        const wrong = U.shuffle(p.texts.filter((x) => x !== t).flatMap((x) => x.text.split(/\s+—\s+|(?<=[.!?])\s+/)).filter((x) => x.length > 8 && x.length < 90), rnd).slice(0, 2);
        const o = U.shuffle([turns[i]].concat(wrong), rnd);
        return { micro: 'dialogue', title: 'Complete the dialogue', kind: 'mcq', prompt: turns.slice(Math.max(0, i - 2), i).join(' — ') + ' — …', options: o, answer: o.indexOf(turns[i]) };
      },
      respond: () => { const ts = p.think.filter((t) => ['rapid', 'situational', 'describe'].includes(t.type) && U.levelIndex(t.l) <= lvl); const t = U.pick(ts.length ? ts : p.think, rnd); return t ? { micro: 'respond', title: 'Respond in one sentence', kind: 'free', prompt: t.p, sentences: 1, model: t.model || '', keys: t.keys || [] } : null; },
      respond3: () => { const ts = p.think.filter((t) => ['describe', 'explain', 'opinion', 'situational'].includes(t.type) && U.levelIndex(t.l) <= lvl); const t = U.pick(ts.length ? ts : p.think, rnd); return t ? { micro: 'respond3', title: 'Now respond in three sentences', kind: 'free', prompt: t.p, sentences: 3, model: t.model || '', keys: t.keys || [] } : null; },
      differently: () => { const t = U.pick(p.think.filter((y) => ['paraphrase', 'reformulate'].includes(y.type) && U.levelIndex(y.l) <= lvl + 1), rnd); return t ? { micro: 'differently', title: 'Say it differently', kind: 'free', prompt: t.p, sentences: 1, model: t.model || '' } : null; },
      repeat: () => { const id = U.pick(recent, rnd); const v = id && itemFor(code, id); return v && (v.ex || v.w) ? { micro: 'repeat', title: 'Listen and repeat', kind: 'repeat', id, v, text: v.ex || v.w } : null; },
    };
    const MIX = {
      controlled: ['choose', 'complete', 'translate', 'match', 'build', 'listen', 'grammar'],
      application: ['complete', 'build', 'register', 'natural', 'dialogue', 'respond', 'correct', 'differently'],
      sentence: ['respond'],
      commute: ['listen', 'repeat', 'choose', 'match', 'listen', 'repeat'], // no typing: listening, recognition, shadowing
      break: ['translate', 'complete', 'correct', 'grammar', 'choose'], // 5-minute retrieval
      retrieval: ['translate', 'complete', 'choose', 'match'],
      dialogue: ['dialogue', 'respond', 'register', 'natural', 'respond3'],
      mixed: ['choose', 'complete', 'translate', 'build', 'match', 'correct', 'natural', 'register', 'dialogue', 'respond', 'listen', 'repeat', 'grammar'],
    };
    const kinds = MIX[focus] || MIX.mixed;
    let guard = 0;
    while (out.length < n && guard++ < n * 12) {
      const k = focus === 'sentence' ? 'respond' : kinds[(out.length + Math.floor(rnd() * kinds.length)) % kinds.length];
      if (out.length && out[out.length - 1].micro === k && kinds.length > 1) continue;
      const m = gen[k] && gen[k]();
      if (m && (m.kind !== 'expose')) out.push(m);
    }
    // a gentle ending: "one sentence" then "three sentences" when the focus is application
    if (focus === 'application' && out.length >= 3 && !out.some((m) => m.micro === 'respond3')) { const r = gen.respond3(); if (r) out[out.length - 1] = r; }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Error-based teaching
   * ------------------------------------------------------------------ */
  /** The recurring error most worth a remediation mini-lesson (≥2 occurrences, not yet remedied recently). */
  function remedyCandidate(code) {
    const lang = L(code);
    const since = U.addDays(U.today(), -30);
    const groups = {};
    (lang.errors || []).filter((e) => !e.resolved && e.date >= since).forEach((e) => {
      const k = e.topic || e.label;
      const g = (groups[k] = groups[k] || { key: k, topic: e.topic || null, label: e.label, count: 0, errors: [] });
      g.count += e.count || 1; g.errors.push(e);
    });
    lang.remedied = lang.remedied || {};
    const list = Object.values(groups).filter((g) => g.count >= 2 && (!lang.remedied[g.key] || U.diffDays(lang.remedied[g.key].date, U.today()) >= 4)).sort((a, b) => b.count - a.count);
    return list[0] || null;
  }
  function markRemedied(code, key, persist) {
    const lang = L(code);
    lang.remedied = lang.remedied || {};
    const r = (lang.remedied[key] = lang.remedied[key] || { times: 0 });
    r.times++; r.date = U.today(); if (persist) r.persist = (r.persist || 0) + 1;
    return r;
  }

  /* ------------------------------------------------------------------ *
   * Curriculum phases (long-term): unlock by mastery, not by CEFR label
   * ------------------------------------------------------------------ */
  const PHASES = ['Foundation', 'Core vocabulary', 'Core grammar', 'Everyday communication', 'Professional communication', 'Academic language', 'Medical language', 'Advanced C1–C2'];
  function phase(code) {
    const lang = L(code), p = P(code);
    const states = Object.values(lang.vocab);
    const stable = states.filter((s) => vstage(s) >= 4).length;
    const g3 = p.grammar.filter((t) => gstage(lang.grammar[t.id]) >= 3);
    const gl = (lvl) => { const ts = p.grammar.filter((t) => U.levelIndex(t.l) <= lvl); return ts.length ? ts.filter((t) => g3.includes(t)).length / ts.length : 0; };
    const steps = [true, stable >= 40, gl(1) >= 0.6, stable >= 120 && gl(2) >= 0.5, stable >= 200 && gl(2) >= 0.7, stable >= 300 && gl(3) >= 0.6, stable >= 300 && gl(3) >= 0.6, stable >= 500 && gl(4) >= 0.6];
    let i = 0; while (i + 1 < steps.length && steps[i + 1]) i++;
    return { index: i, label: PHASES[i], next: PHASES[i + 1] || null, stable, grammarA2: Math.round(gl(1) * 100), grammarB1: Math.round(gl(2) * 100) };
  }

  /* ------------------------------------------------------------------ *
   * Selective correction: what to show at which level
   * ------------------------------------------------------------------ */
  function correctionPolicy(code) {
    const idx = LOS.learn.targetLevelIdx(code, 'writing');
    if (idx <= 1) return { maxErrors: 3, hints: false, style: false, label: 'Beginner focus: only the most important corrections are shown.' };
    if (idx === 2) return { maxErrors: 6, hints: true, style: false, label: '' };
    return { maxErrors: 12, hints: true, style: true, label: '' };
  }

  /** Context passed to an AI tutor backend so it follows the same pedagogy. */
  const TUTOR_RULES = [
    'Never assume the learner knows vocabulary that has not been introduced or is not clearly inferable.',
    'Prefer short tasks before long tasks.',
    'Introduce useful language before demanding it.',
    'Recycle recently learned vocabulary.',
    'Reuse old vocabulary in new contexts.',
    'Correct selectively.',
    'Explain errors according to learner level.',
    'Increase difficulty gradually.',
    'Ask follow-up questions based on the learner\'s answer.',
    'Prefer conversation over artificial exam prompts when appropriate.',
  ];
  function tutorContext(code) {
    const lang = L(code);
    const ids = learnedIds(code, 2, 30);
    return {
      level: LOS.skills.calculateLevel(lang).sub,
      rules: TUTOR_RULES,
      knownVocabulary: ids.map((id) => itemFor(code, id).w),
      learningNow: learnedIds(code, 1, 15).filter((id) => vstage(lang.vocab[id]) <= 3).map((id) => itemFor(code, id).w),
      grammarInProgress: P(code).grammar.filter((t) => { const g = gstage(lang.grammar[t.id]); return g >= 1 && g <= 3; }).slice(0, 8).map((t) => t.title),
      recurringErrors: LOS.learn.errorStats(code, 30).byLabel.slice(0, 5).map((x) => x.label),
      productionStep: { writing: prodStep(code, 'writing'), speaking: prodStep(code, 'speaking') },
      correction: correctionPolicy(code),
      domain: LOS.goals ? LOS.goals.domainOf() : '',
      goal: LOS.goals ? LOS.goals.targetOf(code) : null,
      weaknesses: LOS.goals ? LOS.goals.readiness(code).impact.map((x) => x.label) : [],
      errorBank: LOS.errorBank ? LOS.errorBank.patterns(code).filter((x) => x.status === 'active').slice(0, 6).map((x) => ({ category: x.catLabel, label: x.label, example: x.examples[0] || null })) : [],
      recentLessons: (lang.sessions || []).slice(-6).map((x) => ({ type: x.type, title: x.title, score: x.score })),
      native: (LOS.store.state.profile || {}).native || 'it',
    };
  }

  /* ------------------------------------------------------------------ *
   * Pathways: ordered modules unlocked by mastery of their language (not by CEFR label)
   * ------------------------------------------------------------------ */
  function moduleProgress(code, m) {
    chunks(code);
    const lang = L(code);
    const req = m._req || [];
    const known = req.filter((id) => vstage(lang.vocab[id]) >= 3 || (lang.vocab[id] && lang.vocab[id].assumed)).length;
    const met = req.filter((id) => vstage(lang.vocab[id]) >= 1).length;
    const tasks = lang.tasks || {};
    const steps = (m.scen || []).map((sc, i) => (tasks['scenario:' + m.id + ':' + i] || {}).step || 0);
    const pct = req.length ? known / req.length : 1;
    return { id: m.id, title: m.title, l: m.l, total: req.length, known, met, pct, scenStep: steps.length ? Math.max(...steps) : 0, scenarios: steps.length };
  }
  function pathway(code, key) {
    const def = (LOS.PATHWAYS || {})[key];
    if (!def) return null;
    const p = P(code);
    let prevReady = true;
    const steps = def.steps.map((st, n) => {
      const mods = (st[code] || []).map((x) => p.index.modules[code + '-' + (def.prefix || 'med') + '-' + x]).filter(Boolean);
      if (!mods.length) return null;
      const prog = mods.map((m) => moduleProgress(code, m));
      const total = U.sum(prog.map((x) => x.total)), known = U.sum(prog.map((x) => x.known));
      const pct = total ? known / total : 1;
      const started = prog.some((x) => x.met > 0 || x.scenStep > 0);
      const done = pct >= 0.8 && prog[0].scenStep >= 3;
      const ready = pct >= 0.7;
      const state = done ? 'done' : ready ? 'ready' : prevReady || started ? 'learning' : 'locked';
      prevReady = ready || done;
      return { n: n + 1, key: st.key, title: st.title, level: st.level || null, mods: prog, total, known, pct, state };
    }).filter(Boolean);
    const next = steps.find((x) => x.state === 'learning' || x.state === 'ready');
    return { key, title: def.title, intro: def.intro, levels: def.levels || null, optional: !!def.optional, steps, next, done: steps.filter((x) => x.state === 'done').length, pct: steps.length ? U.sum(steps.map((x) => x.known)) / Math.max(1, U.sum(steps.map((x) => x.total))) : 0 };
  }

  LOS.ped = {
    VSTAGES, VSTAGE_SHORT, GSTAGES, VNEXT, FROM_OLD_STAGE, OUTCOME_LABEL, OUTCOME_GRADE, LADDER, PHASES, TUTOR_RULES,
    vstage, gstage, chunks, chunkItem, itemForPhrase, ensureState, expose, classify, recordVocab, hintLevel,
    vocabExercise, checkVocab, usesItem, detectUse, grammarTypes, updateGrammarStage,
    taskMeta, readiness, taskState, prodStep, scaleTask, recordProduction,
    SPEAK_LADDER, speakLevel, recordSpeak, DIMS, mastery, masteryProfile, learnedIds, microSet, remedyCandidate, markRemedied, phase, correctionPolicy, tutorContext, moduleProgress, pathway,
  };
})();

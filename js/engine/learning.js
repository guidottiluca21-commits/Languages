/* LEARNING ENGINE — grammar mastery, vocabulary acquisition, error log, sessions, content selection. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const S = () => LOS.store.state;
  const L = (c) => LOS.store.lang(c);
  const P = (c) => LOS.lang.get(c || LOS.store.active());

  /* ------------------------------------------------------------------ *
   * Answer checking
   * ------------------------------------------------------------------ */
  function checkAnswer(ex, input, code) {
    if (ex.t === 'mc') {
      const correct = Number(input) === ex.a;
      return { correct, close: false, expected: ex.o[ex.a] };
    }
    const pack = LOS.lang.get(code || LOS.store.active()) || {};
    const given = U.norm(input).replace(/ß/g, 'ss');
    const answers = ex.a.map((a) => U.norm(a).replace(/ß/g, 'ss'));
    if (answers.includes(given)) return { correct: true, close: false, expected: ex.a[0] };
    // a noun learnt without its article (German/French/Spanish): the article is part of the word
    const arts = pack.articles || [];
    const bare = answers.find((a) => { const m = a.split(' '); return m.length > 1 && arts.includes(m[0]) && m.slice(1).join(' ') === given; });
    if (bare) return { correct: false, close: false, note: `Learn the noun with its article: ${ex.a[answers.indexOf(bare)]}.`, expected: ex.a[answers.indexOf(bare)] };
    // accents/umlauts missing (e.g. "esta" for "está", "schon" for "schön") → accepted, flagged
    const ga = U.stripAccents(given);
    const hit = answers.find((a) => U.stripAccents(a) === ga);
    if (hit) return { correct: true, close: true, note: pack.accentNote || 'Check the accents.', expected: ex.a[answers.indexOf(hit)] };
    // small typo tolerance on longer answers
    let best = null;
    answers.forEach((a, i) => {
      const d = U.lev(ga, U.stripAccents(a));
      const tol = a.length > 18 ? 2 : a.length > 6 ? 1 : 0;
      if (d <= tol && (!best || d < best.d)) best = { d, i };
    });
    if (best) return { correct: true, close: true, note: 'Almost — watch the spelling.', expected: ex.a[best.i] };
    return { correct: false, close: false, expected: ex.a[0] };
  }

  /** Builds a full sentence from an exercise and an answer (for the error log). */
  function sentenceFor(ex, value) {
    if (ex.t === 'mc') return ex.q.includes('___') ? ex.q.replace('___', ex.o[value] != null ? ex.o[value] : value) : `${ex.q} → ${ex.o[value] != null ? ex.o[value] : value}`;
    if (ex.t === 'gap') return ex.q.replace(/\s*\([^)]*\)/, '').replace('___', value);
    return value;
  }

  /* ------------------------------------------------------------------ *
   * Grammar
   * ------------------------------------------------------------------ */
  function prefDelta() {
    const p = S().profile.difficulty;
    return p === 'gentle' ? -0.5 : p === 'challenging' ? 0.5 : 0;
  }
  function topicState(code, id) {
    const lang = L(code);
    if (!lang.grammar[id]) lang.grammar[id] = LOS.srs.create({ d: 1, seen: [], attempts: 0, correct: 0 });
    return lang.grammar[id];
  }
  function topicStatus(code, id, date = U.today()) {
    const st = L(code).grammar[id];
    return LOS.srs.status(st, date);
  }
  function grammarList(code, date = U.today()) {
    const p = P(code);
    return p.grammar.map((t) => {
      const st = L(code).grammar[t.id];
      return { topic: t, state: st || null, status: LOS.srs.status(st, date), eff: st ? Math.round(LOS.srs.effective(st, date)) : 0, due: st ? LOS.srs.isDue(st, date) : false };
    });
  }
  function prereqsMet(code, topic) {
    return (topic.pre || []).every((id) => ['familiar', 'mastered'].includes(topicStatus(code, id)));
  }
  function errorPressure(code, topicId, days = 21) {
    const since = U.addDays(U.today(), -days);
    return L(code).errors.filter((e) => e.topic === topicId && e.date >= since && !e.resolved).length;
  }

  /** Highest-value grammar topic right now (and why). */
  function pickTopic(code, opts = {}) {
    const lang = L(code);
    const p = P(code);
    const date = opts.date || U.today();
    const gθ = LOS.skills.theta(lang, 'grammar');
    const band = gθ == null ? 1 : U.thetaInfo(gθ).band;
    const exclude = new Set(opts.exclude || []);
    let best = null;
    p.grammar.forEach((t) => {
      if (exclude.has(t.id)) return;
      const st = lang.grammar[t.id];
      const status = LOS.srs.status(st, date);
      const li = U.levelIndex(t.l);
      let score = 0;
      const why = [];
      const ep = errorPressure(code, t.id);
      if (ep) { score += Math.min(6, ep * 2); why.push(`${ep} recent error${ep > 1 ? 's' : ''}`); }
      if (st && LOS.srs.isDue(st, date)) { const od = LOS.srs.overdueDays(st, date); score += 2.5 + Math.min(2, od / Math.max(1, st.interval)); why.push('due for review'); }
      if (status === 'new') {
        if (li === band || li === band + 1) { if (prereqsMet(code, t)) { score += li === band ? 2 : 1.4; why.push(`next step at ${t.l}`); } else score += 0.2; }
        else if (li < band) { score += 0.6; why.push(`gap below your level (${t.l})`); }
      } else if (status === 'learning') { score += 1.4; why.push('still learning'); }
      else if (status === 'familiar') score += 0.3;
      else score -= 2;
      if (st && st.last === date) score -= 5;
      score += (opts.rnd || Math.random)() * 0.3;
      if (!best || score > best.score) best = { topic: t, score, reason: why[0] || `${t.l} topic`, status };
    });
    return best;
  }

  /** In-session adaptive drill for a grammar topic. */
  class GrammarDrill {
    constructor(code, topicId, count = 6) {
      this.code = code;
      this.topic = P(code).index.grammar[topicId];
      this.state = topicState(code, topicId);
      this.count = Math.max(1, Math.min(count, this.topic.x.length + 2));
      this.d = U.clamp(Math.round((this.state.d || 1) + prefDelta()), 1, 3);
      this.used = new Set();
      this.retry = [];
      this.results = [];
      this.okRun = 0;
      this.badRun = 0;
      this.med = medicalPriority(code) > 0.3;
      this.events = []; // "difficulty up", "simplified" messages for the UI
    }
    next() {
      if (this.retry.length && this.retry[0].after <= this.results.length) return this.retry.shift().ex;
      if (this.results.length >= this.count && !this.retry.length) return null;
      const recent = new Set(this.state.seen || []);
      const pool = this.topic.x.filter((x) => !this.used.has(x));
      if (!pool.length) return this.retry.length ? this.retry.shift().ex : null;
      const scored = pool.map((x) => ({ x, s: Math.abs((x.d || 1) - this.d) * 2 + (recent.has(this.topic.x.indexOf(x)) ? 0.8 : 0) - (this.med && x.m ? 0.5 : 0) + Math.random() * 0.4 }));
      scored.sort((a, b) => a.s - b.s);
      const ex = scored[0].x;
      this.used.add(ex);
      return ex;
    }
    answer(ex, input) {
      const res = checkAnswer(ex, input, this.code);
      const lang = L(this.code);
      this.results.push({ correct: res.correct, close: res.close, d: ex.d || 1 });
      this.state.attempts = (this.state.attempts || 0) + 1;
      if (res.correct) this.state.correct = (this.state.correct || 0) + 1;
      const b = U.levelIndex(this.topic.l) + 0.3 + 0.25 * ((ex.d || 1) - 1);
      LOS.skills.update(lang, 'grammar', b, res.correct ? (res.close ? 0.8 : 1) : 0, 0.03);
      if (res.correct) {
        this.okRun++; this.badRun = 0;
        if (this.okRun >= 2 && this.d < 3) { this.d++; this.okRun = 0; this.events.push('up'); res.adapt = 'up'; }
      } else {
        this.badRun++; this.okRun = 0;
        if (this.badRun >= 2 && this.d > 1) { this.d--; this.events.push('down'); res.adapt = 'down'; }
        if (!ex._retried) { ex._retried = true; this.retry.push({ ex, after: this.results.length + 2 }); }
        recordError(this.code, {
          src: 'grammar', cat: this.topic.ecat || 'grammar', label: this.topic.cat + ' · ' + this.topic.title, topic: this.topic.id,
          wrong: sentenceFor(ex, input), right: ex.t === 'mc' ? sentenceFor(ex, ex.a) : sentenceFor(ex, res.expected), note: ex.w || '',
        });
      }
      const idx = this.topic.x.indexOf(ex);
      this.state.seen = [idx].concat((this.state.seen || []).filter((i) => i !== idx)).slice(0, 6);
      return res;
    }
    accuracy() {
      if (!this.results.length) return 0;
      return U.sum(this.results.map((r) => (r.correct ? (r.close ? 0.8 : 1) : 0))) / this.results.length;
    }
    finish(opts = {}) {
      const acc = this.accuracy();
      const before = LOS.srs.status(this.state);
      const g = this.results.length ? LOS.srs.gradeFromAccuracy(acc) : 1;
      LOS.srs.grade(this.state, g, U.today(), opts.recovery ? { maxInterval: 7 } : {});
      this.state.d = this.d;
      const after = LOS.srs.status(this.state);
      if (after === 'mastered' && !this.state.masteredAt) this.state.masteredAt = U.today();
      if (after !== 'mastered' && this.state.masteredAt && LOS.srs.effective(this.state) < 70) delete this.state.masteredAt;
      // resolve errors linked to this topic after a strong session
      if (acc >= 0.85) L(this.code).errors.forEach((e) => { if (e.topic === this.topic.id && !e.resolved) e.improved = (e.improved || 0) + 1; });
      return { acc, grade: g, before, after, d: this.d, mastery: Math.round(this.state.mastery) };
    }
  }

  /* ------------------------------------------------------------------ *
   * Vocabulary
   * ------------------------------------------------------------------ */
  const STAGE_LABEL = ['New', 'Recognition', 'Recall', 'Production', 'Automatic'];
  const STAGE_MIN_INTERVAL = [0, 0, 1, 3, 7];
  function vocabItems(code) { return P(code).vocab.concat(L(code).custom || []); }
  function vocabItem(code, id) { return P(code).index.vocab[id] || (L(code).custom || []).find((v) => v.id === id); }
  function vocabState(code, id) { return L(code).vocab[id]; }

  function dueVocab(code, date = U.today()) {
    const lang = L(code);
    return Object.keys(lang.vocab)
      .filter((id) => vocabItem(code, id) && LOS.srs.isDue(lang.vocab[id], date))
      .sort((a, b) => LOS.srs.priority(lang.vocab[b], date) - LOS.srs.priority(lang.vocab[a], date));
  }

  function medicalPriority(code) {
    const lang = L(code);
    const prof = S().profile;
    let p = 0;
    if (lang.goals.includes('medical')) p += 0.45;
    if (/medic|doctor|physician|anest|anaest|nurs|clinic|health|sanit/i.test((prof.field || '') + ' ' + (prof.specialty || ''))) p += 0.1;
    return Math.min(0.6, p);
  }
  function proPriority(code) { return L(code).goals.includes('work') ? 0.3 : 0.1; }

  /** generateVocabulary() (local): picks the next items to introduce. */
  function newVocabCandidates(code, n, opts = {}) {
    const lang = L(code);
    const vθ = LOS.skills.theta(lang, 'vocabulary');
    const band = vθ == null ? 1 : U.thetaInfo(vθ).band;
    const med = medicalPriority(code);
    const pro = proPriority(code);
    const interests = (S().profile.interests || []).map((s) => s.toLowerCase());
    const rnd = opts.rnd || Math.random;
    const cands = vocabItems(code).filter((v) => !lang.vocab[v.id]).map((v) => {
      const li = U.levelIndex(v.l);
      let s = li === band + 1 ? 3 : li === band ? 2.6 : li === band + 2 ? 1 : li < band ? 0.6 : 0.2;
      s += (v.f || 3) * 0.35;
      if (['collocation', 'chunk', 'phrasal', 'idiom', 'expression'].includes(v.k)) s += 0.8;
      if (v.d === 'medical') s += med * 3;
      if (v.d === 'professional') s += pro * 2.5;
      if (v.custom) s += 5;
      if (v.ff) s += 0.4;
      if (interests.length && interests.some((i) => (v.def + ' ' + v.ex).toLowerCase().includes(i))) s += 0.5;
      s += rnd() * 0.6;
      return { v, s };
    });
    cands.sort((a, b) => b.s - a.s);
    return cands.slice(0, n).map((c) => c.v);
  }

  function introduceVocab(code, ids, src = 'session') {
    const lang = L(code);
    ids.forEach((id) => {
      if (!lang.vocab[id]) lang.vocab[id] = LOS.srs.create({ stage: 0, introduced: U.today(), src });
    });
  }

  /** Builds a review card appropriate to the item's acquisition stage. */
  function vocabCard(code, id, rnd = Math.random) {
    const v = vocabItem(code, id);
    const st = vocabState(code, id) || { stage: 0 };
    const stage = st.stage || 0;
    if (stage <= 1) {
      const pool = vocabItems(code).filter((x) => x.id !== id && x.tr && x.tr !== v.tr);
      const same = pool.filter((x) => x.k === v.k);
      const distract = U.shuffle(same.length >= 3 ? same : pool, rnd).slice(0, 3).map((x) => x.tr);
      const options = U.shuffle([v.tr].concat(distract), rnd);
      return { mode: 'recognition', v, options, answer: options.indexOf(v.tr) };
    }
    if (stage === 2) return { mode: 'recall', v };
    if (stage === 3) {
      const ex = v.ex || '';
      const idx = ex.toLowerCase().indexOf(v.w.toLowerCase());
      if (idx >= 0) return { mode: 'production', v, before: ex.slice(0, idx), after: ex.slice(idx + v.w.length), hint: v.w.charAt(0) };
      // try a shorter anchor (first word of a chunk, e.g. inflected verbs)
      const head = v.w.split(' ')[0];
      const j = head.length > 3 ? ex.toLowerCase().indexOf(head.toLowerCase().slice(0, -1)) : -1;
      if (j >= 0) { const end = ex.indexOf(' ', j); const word = ex.slice(j, end < 0 ? undefined : end).replace(/[.,;!?]$/, ''); return { mode: 'production', v, before: ex.slice(0, j), after: ex.slice(j + word.length), hint: word.charAt(0), target: word }; }
      return { mode: 'recall', v };
    }
    return { mode: 'automatic', v };
  }

  function gradeVocab(code, id, g, opts = {}) {
    const lang = L(code);
    const st = lang.vocab[id] || (lang.vocab[id] = LOS.srs.create({ stage: 0, introduced: U.today() }));
    const prevStage = st.stage || 0;
    LOS.srs.grade(st, g, U.today(), opts.recovery ? { maxInterval: 7 } : {});
    lang.reviewLog = (lang.reviewLog || []).concat([{ id: U.uuid(), k: id, r: g, at: Date.now() }]).slice(-2000);
    if (g >= 2) {
      if (prevStage < 4 && (prevStage < 2 || st.interval >= STAGE_MIN_INTERVAL[prevStage + 1] || g === 3)) st.stage = prevStage + 1;
    } else if (g === 0) st.stage = Math.max(1, prevStage - 1);
    else if (prevStage === 0) st.stage = 1;
    if (st.stage >= 3 && !st.stableAt) st.stableAt = U.today();
    if (st.assumed && g >= 2) st.assumed = false;
    const v = vocabItem(code, id);
    if (v && prevStage >= 2) LOS.skills.update(lang, 'vocabulary', U.levelIndex(v.l) + 0.5, g >= 2 ? 1 : g === 1 ? 0.6 : 0, 0.012);
    if (g === 0 && prevStage >= 2 && v) recordError(code, { src: 'vocabulary', cat: v.k === 'collocation' ? 'collocation' : 'vocabulary', label: v.k === 'word' ? 'Vocabulary recall' : 'Chunks & collocations', wrong: '', right: v.w, note: v.def, vocab: id, quiet: true });
    return st;
  }

  function addCustomVocab(code, data) {
    const lang = L(code);
    const w = String(data.w || '').trim();
    if (!w) throw new Error('Please enter a word or phrase.');
    const id = code + ':u-' + U.slug(w) + '-' + Date.now().toString(36).slice(-4);
    const item = Object.assign({ id, w, pos: '', l: 'B2', k: w.includes(' ') ? 'chunk' : 'word', d: 'general', tr: '', def: '', ex: '', col: [], syn: [], ant: [], reg: 'neutral', ipa: '', f: 3, ctx: '', ff: '', custom: true, added: U.today() }, data, { id, w });
    ['col', 'syn', 'ant'].forEach((k) => { if (typeof item[k] === 'string') item[k] = item[k].split(/[,;\n]/).map((s) => s.trim()).filter(Boolean); });
    lang.custom.push(item);
    return item;
  }

  /* ------------------------------------------------------------------ *
   * Error log
   * ------------------------------------------------------------------ */
  function recordError(code, e) {
    const lang = L(code);
    const entry = Object.assign({ id: U.uid('err'), date: U.today(), ts: Date.now(), src: 'manual', cat: 'grammar', label: 'Other', wrong: '', right: '', note: '', topic: null, resolved: false }, e);
    delete entry.quiet;
    // the same mistake twice on the same day is one error seen twice, not two entries
    const same = lang.errors.find((x) => x.date === entry.date && !x.resolved && x.label === entry.label && U.norm(x.wrong) === U.norm(entry.wrong) && U.norm(x.right) === U.norm(entry.right));
    if (same) { same.count = (same.count || 1) + 1; return same; }
    lang.errors.unshift(entry);
    if (lang.errors.length > 1500) lang.errors.length = 1500;
    // sentence-level errors become review cards (one per corrected sentence)
    if (entry.wrong && entry.right && entry.wrong !== entry.right && entry.wrong.length < 220) {
      const dup = Object.keys(lang.errorCards).some((id) => { const x = lang.errors.find((er) => er.id === id); return x && U.norm(x.right) === U.norm(entry.right); });
      if (!dup) lang.errorCards[entry.id] = LOS.srs.create({ due: U.addDays(U.today(), 1) });
    }
    return entry;
  }
  function errorStats(code, days = 60) {
    const lang = L(code);
    const today = U.today();
    const since = U.addDays(today, -days);
    const recent = lang.errors.filter((e) => e.date >= since && !e.resolved);
    const by = {};
    recent.forEach((e) => {
      const age = U.diffDays(e.date, today);
      const w = age <= 14 ? 1 : age <= 30 ? 0.6 : 0.3;
      const key = e.label || 'Other';
      const o = (by[key] = by[key] || { label: key, count: 0, weight: 0, cat: e.cat, topics: {} });
      const n = e.count || 1; o.count += n; o.weight += w * n;
      if (e.topic) o.topics[e.topic] = (o.topics[e.topic] || 0) + 1;
    });
    const byLabel = Object.values(by).sort((a, b) => b.weight - a.weight);
    const byCat = U.countBy(recent, (e) => e.cat);
    return { byLabel, byCat, total: recent.length };
  }
  function dueErrorCards(code, date = U.today()) {
    const lang = L(code);
    return Object.keys(lang.errorCards).filter((id) => {
      const e = lang.errors.find((x) => x.id === id);
      return e && !e.resolved && LOS.srs.isDue(lang.errorCards[id], date);
    }).sort((a, b) => LOS.srs.priority(lang.errorCards[b], date) - LOS.srs.priority(lang.errorCards[a], date));
  }
  function gradeErrorCard(code, id, g) {
    const lang = L(code);
    const st = lang.errorCards[id];
    if (!st) return;
    LOS.srs.grade(st, g);
    const e = lang.errors.find((x) => x.id === id);
    if (e && st.streak >= 3 && st.interval >= 14) e.resolved = true; // stable → resolved
  }

  /* ------------------------------------------------------------------ *
   * Sessions, XP, streak, achievements
   * ------------------------------------------------------------------ */
  const ACHIEVEMENTS = [
    { id: 'first', label: 'First session', test: (lang) => lang.sessions.length >= 1 },
    { id: 'week', label: '7 days of continuity', test: () => streak() >= 7 },
    { id: 'month', label: '30 days of continuity', test: () => streak() >= 30 },
    { id: 'words50', label: '50 stable words & chunks', test: (lang) => Object.values(lang.vocab).filter((v) => v.stage >= 3 && !v.assumed).length >= 50 },
    { id: 'words200', label: '200 stable words & chunks', test: (lang) => Object.values(lang.vocab).filter((v) => v.stage >= 3 && !v.assumed).length >= 200 },
    { id: 'grammar10', label: '10 grammar topics mastered', test: (lang) => Object.values(lang.grammar).filter((g) => g.masteredAt).length >= 10 },
    { id: 'listen10h', label: '10 hours of listening', test: (lang) => U.sum(lang.sessions.filter((s) => s.skill === 'listening').map((s) => s.minutes)) >= 600 },
    { id: 'writer', label: '10 writing tasks', test: (lang) => lang.writings.length >= 10 },
    { id: 'speaker', label: '10 speaking tasks', test: (lang) => lang.speakings.length >= 10 },
    { id: 'scenario', label: 'First professional scenario', test: (lang) => Object.keys(lang.seen.scenarios || {}).length >= 1 },
  ];

  function recordSession(code, rec) {
    const lang = L(code);
    const entry = Object.assign({ id: U.uid('ses'), date: U.today(), ts: Date.now(), type: 'practice', skill: 'grammar', minutes: 1, score: null, title: '' }, rec);
    entry.minutes = Math.max(1, Math.round(entry.minutes));
    lang.sessions.push(entry);
    if (lang.sessions.length > 4000) lang.sessions = lang.sessions.slice(-4000);
    lang.xp += entry.minutes + 5;
    ACHIEVEMENTS.forEach((a) => {
      if (!lang.achievements.includes(a.id) && a.test(lang)) { lang.achievements.push(a.id); LOS.bus.emit('achievement', a); }
    });
    LOS.store.save();
    return entry;
  }
  function minutesByDate(code) {
    const out = {};
    const codes = code ? [code] : Object.keys(S().langs);
    codes.forEach((c) => (S().langs[c].sessions || []).forEach((s) => { out[s.date] = (out[s.date] || 0) + s.minutes; }));
    return out;
  }
  function studyDates() { const m = minutesByDate(); return new Set(Object.keys(m).filter((d) => m[d] >= 3)); }
  function streak() {
    const dates = studyDates();
    let d = U.today();
    if (!dates.has(d)) d = U.addDays(d, -1);
    let n = 0;
    for (let i = 0; i < 2000; i++) {
      if (dates.has(d)) n++;
      else if (!(S().days[d] && S().days[d].rest)) break;
      d = U.addDays(d, -1);
    }
    return n;
  }

  /* ------------------------------------------------------------------ *
   * Content selection (local implementations used by the AI facade)
   * ------------------------------------------------------------------ */
  function targetLevelIdx(code, skill) {
    const t = LOS.skills.theta(L(code), skill);
    if (t == null) return 1;
    const i = U.thetaInfo(t);
    return Math.min(5, i.frac > 0.55 ? i.band + 1 : i.band); // comprehensible input: at or slightly above
  }
  function pickBy(list, idx, seenMap, med, rnd, extra) {
    const scored = list.map((x) => {
      let s = Math.abs(U.levelIndex(x.l) - idx) * 2;
      if (seenMap[x.id]) s += 2 + 1 / (1 + U.diffDays(seenMap[x.id], U.today()));
      if (x.d === 'medical') s -= med * 2.2; else if (med > 0.3 && rnd() < med) s += 0.6;
      if (extra) s += extra(x);
      return { x, s: s + rnd() * 0.8 };
    });
    scored.sort((a, b) => a.s - b.s);
    return scored.length ? scored[0].x : null;
  }
  function pickText(code, skill = 'reading', opts = {}) {
    const p = P(code), lang = L(code);
    const idx = opts.level != null ? opts.level : targetLevelIdx(code, skill);
    return pickBy(p.texts, idx, lang.seen.texts, medicalPriority(code), opts.rnd || Math.random);
  }
  function pickWriting(code, opts = {}) {
    const p = P(code), lang = L(code);
    const idx = opts.level != null ? opts.level : targetLevelIdx(code, 'writing');
    return pickBy(p.writing, idx, lang.seen.prompts, medicalPriority(code), opts.rnd || Math.random, (x) => (x.d === 'professional' ? -proPriority(code) : 0));
  }
  function pickSpeaking(code, opts = {}) {
    const p = P(code), lang = L(code);
    const idx = opts.level != null ? opts.level : targetLevelIdx(code, 'speaking');
    return pickBy(p.speaking, idx, lang.seen.prompts, medicalPriority(code), opts.rnd || Math.random);
  }
  function pickThink(code, n = 4, opts = {}) {
    const p = P(code), lang = L(code);
    const idx = targetLevelIdx(code, 'speaking');
    const rnd = opts.rnd || Math.random;
    const med = medicalPriority(code);
    const pool = p.think.filter((t) => Math.abs(U.levelIndex(t.l) - idx) <= 1 && (!opts.type || t.type === opts.type));
    const list = (pool.length ? pool : p.think).map((t, i) => {
      const key = t.type + ':' + t.p.slice(0, 30);
      let s = rnd() + (lang.seen.think[key] ? 1.2 : 0) - (t.d === 'medical' ? med : 0);
      return { t, s, key };
    }).sort((a, b) => a.s - b.s);
    // interleave types
    const out = [], types = new Set();
    for (const c of list) { if (out.length >= n) break; if (!types.has(c.t.type) || types.size >= 6) { out.push(c.t); types.add(c.t.type); } }
    for (const c of list) { if (out.length >= n) break; if (!out.includes(c.t)) out.push(c.t); }
    return out;
  }
  /** generateScenario() (local): next professional/medical scenario at the right level. */
  function pickScenario(code, area = 'medical', opts = {}) {
    const p = P(code), lang = L(code);
    const idx = targetLevelIdx(code, 'speaking');
    const rnd = opts.rnd || Math.random;
    const mods = (area === 'medical' ? p.medical : p.professional).filter((m) => !opts.cat || m.cat === opts.cat);
    let best = null;
    mods.forEach((m) => (m.scen || []).forEach((sc, i) => {
      const key = m.id + ':' + i;
      let s = Math.abs(U.levelIndex(m.l) - idx) * 1.5 + (lang.seen.scenarios[key] ? 2 : 0) + rnd();
      if (!best || s < best.s) best = { s, module: m, idx: i, scen: sc };
    }));
    return best;
  }

  LOS.learn = {
    checkAnswer, sentenceFor,
    topicState, topicStatus, grammarList, pickTopic, prereqsMet, errorPressure, GrammarDrill,
    STAGE_LABEL, vocabItems, vocabItem, vocabState, dueVocab, newVocabCandidates, introduceVocab, vocabCard, gradeVocab, addCustomVocab,
    recordError, errorStats, dueErrorCards, gradeErrorCard,
    ACHIEVEMENTS, recordSession, minutesByDate, studyDates, streak,
    medicalPriority, proPriority, targetLevelIdx, pickText, pickWriting, pickSpeaking, pickThink, pickScenario,
  };
})();

/* ADAPTIVE ENGINE — deterministic, local, always available (no AI needed):
 *   LOS.errorBank  personal error bank: meaningful recurring patterns, classified, recycled into lessons
 *   LOS.queue      the central learning queue: what is worth doing now, in priority order
 *   LOS.goals      real-world goal, readiness per dimension, highest-impact areas, skill allocation
 *   LOS.analytics  consistency, retention, active vocabulary, speaking, transfer
 *   LOS.exposure   lightweight weekly real-world exposure checklist
 * Everything here is computed from stored learning data; AI only adds explanations and open feedback. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const L = (code) => LOS.store.lang(code);
  const P = (code) => LOS.lang.get(code);

  /* ==================================================================
   * ERROR BANK
   * ================================================================== */
  const BANK_CATS = [
    ['grammar', 'Grammar'], ['vocabulary', 'Vocabulary'], ['collocation', 'Collocation'], ['preposition', 'Prepositions'],
    ['articles', 'Articles'], ['wordorder', 'Word order'], ['pronunciation', 'Pronunciation'], ['fluency', 'Fluency'],
    ['register', 'Register'], ['professional', 'Professional communication'], ['interference', 'Italian interference'], ['unnatural', 'Unnatural phrasing'],
  ];
  const BANK_LABEL = Object.fromEntries(BANK_CATS);
  /** Map a raw error entry (writing rule, grammar drill, vocabulary, speaking) to a bank category. */
  function classify(e) {
    const t = `${e.label || ''} ${e.note || ''} ${e.cat || ''} ${e.rule || ''}`.toLowerCase();
    if (e.cat === 'pronunciation') return 'pronunciation';
    if (e.cat === 'fluency' || /hesitation|filler|fluen/.test(t)) return 'fluency';
    if (/prepos|präpos|preposici|prépos/.test(t)) return 'preposition';
    if (/article|artikel|artículo|artículos|articles?\b/.test(t)) return 'articles';
    if (e.cat === 'syntax' || /word order|wortstellung|orden de|ordre des|verb.?(final|second|end)|v2\b|inversion/.test(t)) return 'wordorder';
    if (e.cat === 'falsefriend' || e.cat === 'interference' || /italian|italiano|false friend|calque|calco/.test(t)) return 'interference';
    if (e.cat === 'register') return ['scenario', 'medical', 'professional', 'sim'].includes(e.src) ? 'professional' : 'register';
    if (e.cat === 'naturalness' || e.cat === 'wordchoice') return 'unnatural';
    if (e.cat === 'collocation') return 'collocation';
    if (e.cat === 'vocabulary') return 'vocabulary';
    if (['scenario', 'sim'].includes(e.src) && /professional|tone|polite/.test(t)) return 'professional';
    return 'grammar';
  }
  /** Trivial slips (a single spelling or capitalisation error) do not enter the bank. */
  function meaningful(e, count) {
    if ((e.cat === 'spelling' || e.cat === 'capitalisation') && count < 3) return false;
    return !!(e.label || e.wrong);
  }
  function keyOf(e) { return e.rule ? 'r:' + e.rule : e.topic ? 't:' + e.topic : 'l:' + (e.label || 'Other'); }
  /** Recurring patterns (≥2 occurrences, or 1 occurrence of a high-impact category), newest evidence first. */
  function patterns(code, opts = {}) {
    const lang = L(code);
    const since = U.addDays(U.today(), -(opts.days || 90));
    const g = {};
    (lang.errors || []).filter((e) => e.date >= since).forEach((e) => {
      const k = keyOf(e);
      const o = (g[k] = g[k] || { key: k, label: e.label || 'Other', cat: classify(e), topic: e.topic || null, rule: e.rule || null, count: 0, open: 0, last: e.date, first: e.date, examples: [], pat: e.pat || null, sources: {} });
      const n = e.count || 1;
      o.count += n; if (!e.resolved) o.open += n;
      if (e.date > o.last) o.last = e.date;
      if (e.date < o.first) o.first = e.date;
      o.sources[e.src || 'other'] = true;
      if (e.wrong && e.right && o.examples.length < 3 && !o.examples.some((x) => U.norm(x.right) === U.norm(e.right))) o.examples.push({ wrong: e.wrong, right: e.right, natural: e.natural || '', note: e.note || '', pat: e.pat || '', sugg: e.sugg || '' });
      if (!o.pat && e.pat) o.pat = e.pat;
    });
    const rem = lang.remedied || {};
    const out = Object.values(g).filter((o) => meaningful({ cat: o.cat === 'grammar' ? (lang.errors.find((e) => keyOf(e) === o.key) || {}).cat : o.cat, label: o.label, wrong: 1 }, o.count) && (o.count >= 2 || ['interference', 'preposition', 'collocation', 'professional'].includes(o.cat)));
    out.forEach((o) => {
      const r = rem[o.topic || o.label];
      const recent = U.diffDays(o.last, U.today());
      o.status = o.open === 0 ? 'resolved' : r && r.date >= o.last ? 'improving' : recent > 21 ? 'fading' : 'active';
      o.catLabel = BANK_LABEL[o.cat];
      o.sources = Object.keys(o.sources);
      o.weight = o.open * (recent <= 14 ? 1 : recent <= 30 ? 0.6 : 0.3) * (['interference', 'preposition', 'collocation', 'professional', 'unnatural'].includes(o.cat) ? 1.2 : 1);
    });
    return out.sort((a, b) => b.weight - a.weight || b.count - a.count);
  }
  function bankSummary(code) {
    const ps = patterns(code);
    const byCat = {};
    ps.filter((p) => p.status !== 'resolved').forEach((p) => { byCat[p.cat] = (byCat[p.cat] || 0) + p.open; });
    return { patterns: ps, active: ps.filter((p) => p.status === 'active'), byCat: BANK_CATS.map(([k, l]) => ({ k, label: l, n: byCat[k] || 0 })).filter((x) => x.n) };
  }
  LOS.errorBank = { CATS: BANK_CATS, LABEL: BANK_LABEL, classify, meaningful, patterns, summary: bankSummary };

  /* ==================================================================
   * LEARNING QUEUE
   * ================================================================== */
  function goalDomains(lang) {
    const g = lang.goals || [];
    const d = ['general'];
    if (g.includes('medical')) d.push('medical');
    if (g.includes('work') || g.includes('medical')) d.push('professional');
    if (g.includes('academic')) d.push('academic');
    if (lang.target && ['work_abroad', 'study_abroad', 'travel'].includes(lang.target.type)) d.push('abroad');
    return d;
  }
  /** Value of an item for this learner: frequency, goal relevance, recurring problems. */
  function itemValue(code, id, lang, doms) {
    const v = LOS.learn.vocabItem(code, id);
    if (!v) return 0;
    const st = lang.vocab[id] || {};
    return (v.f || 3) / 3 + (doms.includes(v.d) && v.d !== 'general' ? 0.6 : 0) + Math.min(1, (st.fail || 0) * 0.25) + (v.k === 'collocation' || v.k === 'chunk' ? 0.2 : 0);
  }
  /**
   * build(code) → { items, counts }. Categories:
   *  due        overdue / due reviews (vocabulary, grammar, error cards) — highest value first
   *  reinforce  recurring weaknesses, weak collocations, partially mastered items (introduced, not yet usable)
   *  new        new material ready for introduction (prerequisites met)
   *  task       one production task (speaking / scenario) chosen from the weakest skill and the goal
   * Order: overdue high-value → recurring weaknesses → partially mastered → new → enrichment.
   */
  function build(code, date = U.today()) {
    const lang = L(code);
    const doms = goalDomains(lang);
    const ped = LOS.ped;
    const items = [];
    LOS.learn.dueVocab(code, date).forEach((id) => {
      const st = lang.vocab[id];
      const over = st.due ? Math.max(0, U.diffDays(st.due, date)) : 0;
      items.push({ cat: 'due', kind: 'vocab', id, prio: 100 + Math.min(20, over) + itemValue(code, id, lang, doms) * 5 });
    });
    LOS.learn.grammarList(code, date).filter((g) => g.due && ped.gstage(g.state) >= 1).forEach((g) => items.push({ cat: 'due', kind: 'grammar', id: g.topic.id, prio: 95 + LOS.srs.priority(g.state, date) / 10 }));
    LOS.learn.dueErrorCards(code, date).forEach((id) => items.push({ cat: 'due', kind: 'error', id, prio: 98 }));
    // recurring weaknesses
    patterns(code).filter((p) => p.status === 'active').slice(0, 4).forEach((p) => items.push({ cat: 'reinforce', kind: 'pattern', id: p.key, label: p.label, bank: p.cat, prio: 80 + Math.min(10, p.weight * 2) }));
    // partially mastered: introduced, not due, still weak in recall or use
    Object.keys(lang.vocab).forEach((id) => {
      const st = lang.vocab[id];
      if (st.assumed || (st.due && st.due <= date)) return;
      const s = ped.vstage(st);
      if (s < 1 || s > 4) return;
      if (!LOS.learn.vocabItem(code, id)) return;
      const m = ped.mastery(code, id, st);
      const weak = Math.min(m.rcl, m.ctl + 0.2, m.fre + 0.4);
      if (weak >= 0.6) return;
      const v = LOS.learn.vocabItem(code, id);
      items.push({ cat: 'reinforce', kind: 'vocab', id, collocation: v.k === 'collocation', prio: 60 + (1 - weak) * 10 + itemValue(code, id, lang, doms) * 3 + ((st.fail || 0) > (st.ok || 0) ? 5 : 0) });
    });
    // weaknesses from the latest scenario simulation (last 7 days) shape the next sessions
    const sim = (lang.sims || [])[0];
    if (sim && U.diffDays(sim.date, date) <= 7) (sim.weak || []).forEach((k, i) => items.push({ cat: 'reinforce', kind: 'sim-weak', id: k, moduleId: (sim.key || '').split(':')[0], prio: 78 - i }));
    // new material (prerequisite-aware candidates)
    LOS.learn.newVocabCandidates(code, 6).forEach((v, i) => items.push({ cat: 'new', kind: 'vocab', id: v.id, prio: 40 - i }));
    // one production task: weakest of speaking/listening, or the goal's professional track
    const th = LOS.skills.thetas(lang);
    const spk = th.speaking == null ? 1 : th.speaking;
    const lis = th.listening == null ? 1 : th.listening;
    items.push(spk <= lis ? { cat: 'task', kind: 'speaking', id: 'speaking', prio: 30 } : { cat: 'task', kind: 'listening', id: 'listening', prio: 30 });
    items.sort((a, b) => b.prio - a.prio);
    const counts = { due: 0, reinforce: 0, new: 0, task: 0 };
    items.forEach((x) => counts[x.cat]++);
    counts.reinforce = Math.min(counts.reinforce, 12);
    counts.new = Math.min(counts.new, 5);
    return { items, counts, date };
  }
  /** Review set for a session of `cap` items: due first (highest value), then reinforcement; interleaved later by the runner. */
  function reviewSet(code, cap = 20, opts = {}) {
    const q = build(code);
    const due = q.items.filter((x) => x.cat === 'due');
    const pick = (kind, n) => due.filter((x) => x.kind === kind).slice(0, n).map((x) => x.id);
    const errors = opts.handsFree ? [] : pick('error', Math.max(1, Math.round(cap * 0.2)));
    const grammar = opts.handsFree ? [] : pick('grammar', cap >= 12 ? 3 : 1);
    let vocab = pick('vocab', Math.max(2, cap - errors.length - grammar.length * 3));
    let extra = false;
    if (vocab.length < Math.min(cap, 6)) {
      const more = q.items.filter((x) => x.cat === 'reinforce' && x.kind === 'vocab' && !vocab.includes(x.id)).slice(0, Math.min(8, cap) - vocab.length).map((x) => x.id);
      if (more.length) { extra = !vocab.length && !grammar.length && !errors.length; vocab = vocab.concat(more); }
    }
    return { vocab, grammar, errors, extra };
  }
  /** Days since the learner last studied (0 = studied today). */
  function daysAway(code) {
    const ses = (L(code).sessions || []);
    if (!ses.length) return null;
    const last = ses.reduce((m, x) => (x.date > m ? x.date : m), ses[0].date);
    return Math.max(0, U.diffDays(last, U.today()));
  }
  LOS.queue = { build, reviewSet, daysAway, goalDomains };

  /* ==================================================================
   * GOALS, READINESS, ALLOCATION
   * ================================================================== */
  const GOAL_TYPES = [
    { id: 'work_abroad', label: 'Work abroad', target: 3.5, dims: ['speaking', 'workplace', 'profvocab', 'listening', 'abroad', 'interview', 'general'] },
    { id: 'study_abroad', label: 'Study abroad', target: 4, dims: ['academic', 'listening', 'writing', 'speaking', 'abroad', 'general'] },
    { id: 'fellowship', label: 'Fellowship / training abroad', target: 4, dims: ['profvocab', 'speaking', 'presentation', 'interview', 'writing', 'general'] },
    { id: 'conference', label: 'Conference presentation', target: 4, dims: ['presentation', 'speaking', 'profvocab', 'listening', 'general'] },
    { id: 'interview', label: 'Professional interview', target: 3.5, dims: ['interview', 'speaking', 'profvocab', 'workplace', 'general'] },
    { id: 'university', label: 'University', target: 4, dims: ['academic', 'reading', 'writing', 'listening', 'general'] },
    { id: 'travel', label: 'Travel', target: 2, dims: ['abroad', 'speaking', 'listening', 'general'] },
    { id: 'fluency', label: 'General fluency', target: null, dims: ['speaking', 'listening', 'vocab', 'general', 'writing'] },
  ];
  const DIM_LABEL = { general: 'General language', workplace: 'Workplace communication', profvocab: 'Professional vocabulary', speaking: 'Speaking', listening: 'Listening', reading: 'Reading', writing: 'Writing', interview: 'Interview readiness', presentation: 'Presentations', academic: 'Academic language', abroad: 'Everyday life abroad', vocab: 'Active vocabulary' };
  const DIM_IMPACT = { speaking: 'spontaneous speaking', workplace: 'workplace interaction (meetings, disagreement, clarification)', profvocab: 'professional vocabulary', listening: 'understanding natural speech', interview: 'answering interview questions', presentation: 'explaining and presenting complex ideas', academic: 'academic reading and writing', abroad: 'everyday situations abroad', writing: 'clear written communication', reading: 'reading at speed', general: 'core grammar and vocabulary', vocab: 'using vocabulary actively, not only recognising it' };
  const DOMAINS = [['medicine', 'Medicine'], ['healthcare', 'Healthcare'], ['engineering', 'Engineering'], ['it', 'IT'], ['finance', 'Finance'], ['academia', 'Academia'], ['business', 'Business'], ['research', 'Research'], ['hospitality', 'Hospitality'], ['other', 'Other']];
  function domainOf() {
    const pr = LOS.store.state.profile || {};
    if (pr.domain) return pr.domain;
    return /medic|doctor|anest|nurs|clinic|medizin|médec|medicina/i.test(pr.field || '') ? 'medicine' : '';
  }
  function targetOf(code) {
    const lang = L(code);
    if (lang.target && lang.target.type) return lang.target;
    const g = lang.goals || [];
    return { type: g.includes('medical') || g.includes('work') ? 'work_abroad' : g.includes('academic') ? 'study_abroad' : g.includes('travel') ? 'travel' : 'fluency' };
  }
  const ratio = (theta, target) => (theta == null ? 0 : U.clamp((theta + 0.4) / (target + 0.4), 0, 1));
  function trackPct(code, key) { const pw = LOS.ped.pathway(code, key); return pw && pw.steps.length ? pw.pct : null; }
  function modulesPct(code, ids) {
    const p = P(code);
    const mods = ids.map((id) => p.index.modules[id]).filter(Boolean);
    if (!mods.length) return null;
    const pr = mods.map((m) => LOS.ped.moduleProgress(code, m));
    return U.sum(pr.map((x) => x.known)) / Math.max(1, U.sum(pr.map((x) => x.total)));
  }
  function simAvg(code, filter) {
    const sims = (L(code).sims || []).filter(filter || (() => true)).slice(0, 5);
    return sims.length ? U.avg(sims.map((x) => x.overall)) : null;
  }
  function readiness(code) {
    const lang = L(code);
    const tg = targetOf(code);
    const type = GOAL_TYPES.find((x) => x.id === tg.type) || GOAL_TYPES[GOAL_TYPES.length - 1];
    const target = type.target != null ? type.target : U.levelIndex(lang.targetLevel || 'C1') + 0.5;
    const th = LOS.skills.thetas(lang);
    const prof = LOS.ped.masteryProfile(code);
    const dimV = (k) => (prof.dims.find((d) => d.k === k) || {}).v;
    const dom = domainOf();
    const med = dom === 'medicine' || dom === 'healthcare';
    const p = P(code);
    const byCat = (cat) => p.professional.filter((m) => m.cat === cat).map((m) => m.id);
    const val = {
      general: U.avg([ratio(th.grammar, target), ratio(th.vocabulary, target), ratio(th.reading, target)]),
      speaking: ratio(th.speaking, target) * 0.7 + (dimV('fre') || 0) * 0.3,
      listening: ratio(th.listening, target),
      reading: ratio(th.reading, target),
      writing: ratio(th.writing, target),
      vocab: ratio(th.vocabulary, target) * 0.5 + (dimV('fre') || 0) * 0.5,
      profvocab: (med ? trackPct(code, 'medical') : trackPct(code, 'professional')) || 0,
      workplace: U.avg([trackPct(code, 'professional') || 0, ratio(th.speaking, target)]) * (simAvg(code, (x) => x.area === 'professional') == null ? 1 : 0.7) + (simAvg(code, (x) => x.area === 'professional') || 0) * (simAvg(code, (x) => x.area === 'professional') == null ? 0 : 0.3),
      interview: U.avg([modulesPct(code, byCat('career')) || 0, ratio(th.speaking, target), simAvg(code, (x) => /interview/.test(x.key || '')) || ratio(th.speaking, target) * 0.6]),
      presentation: U.avg([modulesPct(code, byCat('presenting').concat(p.medical.filter((m) => m.cat === 'research').map((m) => m.id))) || 0, ratio(th.speaking, target)]),
      academic: U.avg([modulesPct(code, p.medical.filter((m) => m.cat === 'research').map((m) => m.id)) || 0, ratio(th.reading, target), ratio(th.writing, target)]),
      abroad: U.avg([trackPct(code, 'abroad') || 0, ratio(th.listening, Math.min(target, 3)), ratio(th.speaking, Math.min(target, 3))]),
    };
    const dims = type.dims.map((k, i) => ({ k, label: k === 'profvocab' && med ? 'Medical vocabulary' : DIM_LABEL[k], v: U.round(U.clamp(val[k] || 0, 0, 1), 2), w: 1 - i * 0.08 }));
    const overall = U.round(U.sum(dims.map((d) => d.v * d.w)) / U.sum(dims.map((d) => d.w)), 2);
    const impact = dims.slice().sort((a, b) => (1 - b.v) * b.w - (1 - a.v) * a.w).slice(0, 3).map((d) => ({ k: d.k, label: DIM_IMPACT[d.k], v: d.v }));
    return { type: type.id, label: type.label, country: tg.country || '', date: tg.date || '', dims, overall, impact };
  }
  /** Current focus: the single highest-impact area, phrased for the home screen. */
  function focus(code) { const r = readiness(code); return r.impact[0] ? U.cap(r.impact[0].label) : 'Keep the momentum'; }
  /** Share of study time per skill, from the planner's weights (weakest skills, goals, errors, balance). */
  function allocation(code) {
    const ctx = LOS.planner.context(code, U.today());
    const w = LOS.planner.skillWeights(ctx, 'standard');
    const groups = { vocabulary: w.vocabulary, grammar: w.grammar, listening: w.listening + w.reading * 0.5, speaking: w.speaking + w.think, writing: w.writing + w.reading * 0.5 };
    const tot = U.sum(Object.values(groups));
    const out = {};
    Object.keys(groups).forEach((k) => (out[k] = Math.round((groups[k] / tot) * 100)));
    return out;
  }
  /** Store one allocation snapshot per week, to show how the curriculum adapts. */
  function snapshotAllocation(code) {
    const lang = L(code);
    const wk = U.weekStart(U.today(), LOS.store.state.settings.weekStart);
    lang.allocHist = lang.allocHist || [];
    if (lang.allocHist[0] && lang.allocHist[0].week === wk) return lang.allocHist;
    lang.allocHist.unshift({ week: wk, a: allocation(code) });
    lang.allocHist.length = Math.min(lang.allocHist.length, 12);
    return lang.allocHist;
  }
  /** Weakness profile: sub-skill estimates (CEFR labels), including recognition vs recall vs active use. */
  function profile(code) {
    const lang = L(code);
    const th = LOS.skills.thetas(lang);
    const prof = LOS.ped.masteryProfile(code);
    const dv = (k) => (prof.dims.find((d) => d.k === k) || {}).v;
    const lab = (t) => (t == null ? '—' : U.thetaInfo(U.clamp(t, 0, 5.99)).sub);
    const vt = th.vocabulary;
    const rows = [
      ['Vocabulary recognition', vt == null ? null : vt + ((dv('rec') || 0.5) - 0.7) * 1.2],
      ['Vocabulary recall', vt == null ? null : vt + ((dv('rcl') || 0.3) - 0.7) * 1.5],
      ['Active vocabulary use', vt == null ? null : vt + ((dv('fre') || 0.1) - 0.7) * 1.8],
      ['Grammar', th.grammar], ['Listening', th.listening], ['Reading', th.reading], ['Writing', th.writing], ['Speaking fluency', th.speaking],
    ];
    const pro = trackPct(code, domainOf() === 'medicine' || domainOf() === 'healthcare' ? 'medical' : 'professional');
    if (pro != null && th.speaking != null) rows.push(['Professional communication', Math.min(th.speaking, th.speaking - 1 + pro * 1.2)]);
    return rows.map(([label, t]) => ({ label, theta: t == null ? null : U.round(U.clamp(t, 0, 6), 2), level: lab(t) }));
  }
  /** Trend of a skill over the last ~2 weeks: 'up' | 'flat' | 'down' | null. */
  function trend(code, skill) {
    const sk = (L(code).skills || {})[skill];
    if (!sk || !sk.hist || sk.hist.length < 2) return null;
    const now = sk.theta;
    const old = sk.hist.slice().reverse().find((h) => U.diffDays(h[0], U.today()) >= 10) || sk.hist[0];
    const d = now - old[1];
    return d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat';
  }
  /** "Why am I learning this?" — a short reason linking an activity to the stated goal (used sparingly). */
  function why(code, item) {
    const tg = targetOf(code);
    const label = (GOAL_TYPES.find((x) => x.id === tg.type) || {}).label;
    if (!label || tg.type === 'fluency') return '';
    const where = tg.country ? ` in ${tg.country}` : '';
    const ty = item.type;
    const m = item.payload && item.payload.moduleId && P(code).index.modules[item.payload.moduleId];
    if (m && m.id.includes('-med-')) return `Why: clinical conversations like "${m.title}" are part of working with colleagues and patients${where}.`;
    if (m && m.id.includes('-abr-')) return `Why: "${m.title}" is one of the situations you will meet in your first weeks${where}.`;
    if (m && m.id.includes('-pro-')) return `Why: "${m.title}" is core workplace language for your goal (${label.toLowerCase()}).`;
    if (ty === 'speaking' || ty === 'sim') return `Why: spontaneous speaking is the skill that most limits real conversations${where}.`;
    return '';
  }
  LOS.goals = { TYPES: GOAL_TYPES, DIM_LABEL, DOMAINS, domainOf, targetOf, readiness, focus, allocation, snapshotAllocation, profile, trend, why };

  /* ==================================================================
   * ANALYTICS
   * ================================================================== */
  function overview(code) {
    const lang = L(code);
    const since = U.addDays(U.today(), -6);
    const ses = (lang.sessions || []).filter((s) => s.date >= since);
    const minutes = U.sum(ses.map((s) => s.minutes || 0));
    const days = new Set(ses.map((s) => s.date)).size;
    // retention: items reviewed in the last 30 days that were recalled successfully at their last review
    const m30 = U.addDays(U.today(), -30);
    const reviewed = Object.values(lang.vocab).filter((st) => !st.assumed && st.last && st.last >= m30 && (st.reps || 0) >= 2);
    const retained = reviewed.filter((st) => (st.streak || 0) >= 1).length;
    const active = Object.values(lang.vocab).filter((st) => !st.assumed && (LOS.ped.vstage(st) >= 5 || (st.dm && st.dm.fre && st.dm.fre[0] >= 1))).length;
    const sims = (lang.sims || []).slice(0, 5);
    const spk = (lang.speakings || []).slice(0, 5);
    const dimAvg = (k) => { const a = sims.map((x) => x.dims && x.dims[k]).filter((x) => x != null); return a.length ? U.round(U.avg(a), 2) : null; };
    const rat = (k) => { const a = spk.map((x) => x.ratings && x.ratings[k]).filter((x) => x != null); return a.length ? U.round(U.avg(a) / 5, 2) : null; };
    const speaking = { fluency: dimAvg('fluency') != null ? dimAvg('fluency') : rat('fluency'), accuracy: dimAvg('accuracy') != null ? dimAvg('accuracy') : rat('accuracy'), range: dimAvg('vocabulary') != null ? dimAvg('vocabulary') : rat('lexis') != null ? rat('lexis') : rat('vocabulary'), interaction: dimAvg('interaction') };
    const ex = LOS.exposure.history(code, 4);
    return {
      minutes, days,
      retention: reviewed.length >= 5 ? U.round(retained / reviewed.length, 2) : null, reviewedN: reviewed.length,
      active,
      weaknesses: readiness(code).impact,
      errors: patterns(code).filter((p) => p.status === 'active').slice(0, 3),
      speaking,
      readiness: readiness(code),
      transfer: ex,
    };
  }
  LOS.analytics = { overview };

  /* ==================================================================
   * WEEKLY REAL-WORLD EXPOSURE (lightweight, optional)
   * ================================================================== */
  function exposureItems(code) {
    const dom = domainOf();
    const pro = dom && dom !== 'other';
    return [
      { k: 'listen', icon: 'listening', label: 'Listen to 15 minutes of a podcast or video' },
      { k: 'read', icon: 'reading', label: pro ? 'Read one short article from your field' : 'Read one short article' },
      { k: 'talk', icon: 'speaking', label: 'Have one 5-minute conversation' },
      { k: 'write', icon: 'writing', label: pro ? 'Write one professional message' : 'Write one real message' },
    ];
  }
  function weekKey() { return U.weekStart(U.today(), LOS.store.state.settings.weekStart); }
  function week(code) {
    const lang = L(code);
    lang.exposure = lang.exposure || {};
    const done = lang.exposure[weekKey()] || {};
    return exposureItems(code).map((x) => Object.assign({ done: !!done[x.k] }, x));
  }
  function toggle(code, k) {
    const lang = L(code);
    lang.exposure = lang.exposure || {};
    const wk = weekKey();
    const cur = (lang.exposure[wk] = lang.exposure[wk] || {});
    cur[k] = !cur[k];
    const keys = Object.keys(lang.exposure).sort();
    if (keys.length > 26) keys.slice(0, keys.length - 26).forEach((x) => delete lang.exposure[x]);
    return cur[k];
  }
  function history(code, weeks) {
    const lang = L(code);
    const ex = lang.exposure || {};
    let n = 0, done = 0;
    for (let i = 0; i < weeks; i++) { const wk = U.addDays(weekKey(), -7 * i); const w = ex[wk] || {}; n += 4; done += Object.values(w).filter(Boolean).length; }
    return { done, n };
  }
  LOS.exposure = { week, toggle, history, items: exposureItems };
})();

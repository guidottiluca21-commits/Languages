/* CERTIFICATIONS ENGINE — exam profiles, task types (strategy + language), original practice tasks,
 * local scoring against each exam's public criteria (labelled as estimates), mocks, exam goal & readiness,
 * recommendations and the planner hook. Content lives in js/content/exams-<code>.js.
 * Nothing here claims affiliation with any exam body; formats must be verified on the official websites. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const L = (code) => LOS.store.lang(code);

  const reg = { exams: {}, types: {}, tasks: [] };
  function register(pack) {
    (pack.exams || []).forEach((e) => { reg.exams[e.id] = e; });
    Object.keys(pack.types || {}).forEach((k) => { reg.types[k] = Object.assign({ id: k }, pack.types[k]); });
    (pack.tasks || []).forEach((t) => reg.tasks.push(t));
  }
  const examsOf = (t) => (Array.isArray(t.exam) ? t.exam : [t.exam]);
  function list(code) { return Object.values(reg.exams).filter((e) => e.lang === code); }
  function exam(id) { return reg.exams[id] || null; }
  function type(id) { return reg.types[id] || null; }
  function task(id) { return reg.tasks.find((t) => t.id === id) || null; }
  function tasksFor(examId, paperId) { return reg.tasks.filter((t) => examsOf(t).includes(examId) && (!paperId || paperOf(examId, t) === paperId)); }
  /** A task's paper inside a given exam (shared tasks may sit in papers with the same id). */
  function paperOf(examId, t) { const ty = type(t.type); return (t.papers && t.papers[examId]) || t.paper || (ty && ty.paper); }
  function typesFor(examId, paperId) { const e = exam(examId); const p = e && e.papers.find((x) => x.id === paperId); return p ? p.types.map(type).filter(Boolean) : []; }

  /* ---------------- scales: every result is an ESTIMATE, never an official score ---------------- */
  const IELTS_T = [[0.9, 8.5], [0.85, 8], [0.78, 7.5], [0.7, 7], [0.62, 6.5], [0.55, 6], [0.45, 5.5], [0.37, 5], [0.3, 4.5], [0.22, 4], [0, 3.5]];
  const SCALES = {
    ielts: (pct) => { const b = IELTS_T.find(([p]) => pct >= p)[1]; return { value: b, label: `band ~${b.toFixed(1)}` }; },
    cambridge: (pct, e) => {
      const base = { B2: 140, C1: 160, C2: 180 }[(e && e.level) || 'C1'] || 160;
      const sc = Math.round(base + pct * 50);
      const grade = pct >= 0.8 ? 'Grade A (above level)' : pct >= 0.73 ? 'Grade B' : pct >= 0.6 ? 'Grade C (pass)' : 'below the level';
      return { value: sc, label: `~${sc} on the Cambridge English Scale · ${grade}` };
    },
    pass60: (pct) => ({ value: Math.round(pct * 100), label: `${Math.round(pct * 100)}% · ${pct >= 0.6 ? 'pass level reached' : 'not yet at pass level (60%)'}` }),
    pass50: (pct) => { const s = Math.round(pct * 100); return { value: s, label: `~${s}/100 · ${s >= 50 ? 'pass level (50/100) reached' : 'not yet at pass level (50/100)'}` }; },
    oet: (pct) => { const s = Math.round((pct * 500) / 10) * 10; const g = s >= 450 ? 'A' : s >= 350 ? 'B' : s >= 300 ? 'C+' : s >= 200 ? 'C' : 'D'; return { value: s, label: `~${s}/500 · grade ${g}${s >= 350 ? ' (B = the level most regulators ask for)' : ''}` }; },
    toefl6: (pct) => { const b = Math.round((1 + pct * 5) * 2) / 2; return { value: b, label: `band ~${b.toFixed(1)} of 6` }; },
    siele: (pct) => { const s = Math.round(pct * 250); return { value: s, label: `~${s}/250 for this test` }; },
    tdn: (pct) => ({ value: pct, label: pct >= 0.8 ? 'TDN 5 range' : pct >= 0.6 ? 'TDN 4 range' : pct >= 0.4 ? 'TDN 3 range' : 'below TDN 3' }),
    tcf: (pct) => { const s = Math.round(100 + pct * 599); const lv = s >= 600 ? 'C2' : s >= 500 ? 'C1' : s >= 400 ? 'B2' : s >= 300 ? 'B1' : s >= 200 ? 'A2' : 'A1'; return { value: s, label: `~${s}/699 · ${lv}` }; },
    cefr: (pct, e) => { const li = U.levelIndex((e && e.level) || 'B2'); const lv = pct >= 0.85 ? U.LEVELS[Math.min(5, li + 1)] : pct >= 0.6 ? U.LEVELS[li] : U.LEVELS[Math.max(0, li - 1)]; return { value: pct, label: `${Math.round(pct * 100)}% · ~${lv}` }; },
  };
  function estimate(e, pct, opts = {}) {
    const f = SCALES[e.scale] || SCALES.pass60;
    const r = f(U.clamp(pct, 0, 1), Object.assign({ level: opts.level || e.focus }, e));
    return Object.assign(r, { note: 'estimated — practice only, not an official score' });
  }
  function passMark(e) { return e.scale === 'pass50' ? 0.5 : e.scale === 'ielts' ? 0.62 : e.scale === 'oet' ? 0.7 : e.scale === 'toefl6' ? 0.6 : 0.6; }

  /* ---------------- checking answers ---------------- */
  function normAns(s) { return U.stripAccents(U.norm(s)).replace(/ß/g, 'ss').replace(/[.!?,;:]+$/, '').replace(/\s+/g, ' ').trim(); }
  function checkItem(code, it, given) {
    if (it.o) return { correct: given !== '' && given != null && +given === it.a, expected: it.o[it.a] };
    const g = normAns(given);
    const ans = (Array.isArray(it.a) ? it.a : [it.a]).map(String);
    const ok = ans.some((a) => normAns(a) === g || (it.t === 'kwt' && normAns(a).split(' ').every((w) => g.includes(w)) && Math.abs(g.split(' ').length - normAns(a).split(' ').length) <= 1));
    return { correct: ok, expected: ans[0] };
  }
  function scoreObjective(code, t, answers) {
    const items = t.qs || t.items || [];
    const res = items.map((it, i) => checkItem(code, it, answers[i] == null ? '' : answers[i]));
    const correct = res.filter((r) => r.correct).length;
    return { pct: items.length ? correct / items.length : 0, correct, total: items.length, results: res };
  }
  /* Content points: "a|b" alternatives, checked case-insensitively in the text. */
  function pointsCovered(text, points) {
    const nt = ' ' + U.stripAccents(U.norm(text)) + ' ';
    return (points || []).map((p) => ({ p, ok: String(p).split('|').some((alt) => nt.includes(U.stripAccents(U.norm(alt)))) }));
  }
  function lenScore(n, range) {
    if (!range) return 1;
    const [lo, hi] = range;
    if (n >= lo && n <= hi * 1.15) return 1;
    if (n >= lo * 0.8) return 0.65;
    return U.clamp(n / lo, 0.1, 0.5);
  }
  const avg5 = (...v) => U.clamp(U.avg(v.filter((x) => x != null)) / 5, 0, 1);
  /** Local criterion values (0–1) from the analysis; `criteria` = [{ label, key }] of the exam/paper. */
  function criterionValues(a, t, extra = {}) {
    const sc = a.scores || {};
    const sentences = Math.max(1, a.sentences || 1);
    const errRate = Math.min(0.5, (a.errors || []).length / sentences * 0.5);
    const pts = pointsCovered((a.sentencesOut || []).map((x) => x.original).join(' '), t.points);
    const ptsShare = pts.length ? pts.filter((p) => p.ok).length / pts.length : 0.7;
    const len = lenScore(a.words || 0, t.words || (t.secs ? [Math.round(t.secs / 60 * 70), Math.round(t.secs / 60 * 150)] : null));
    return {
      v: {
        task: U.round(0.6 * ptsShare + 0.4 * len, 2),
        coherence: U.round(avg5(sc.cohesion, sc.coherence), 2),
        lexis: U.round(avg5(sc.vocabulary, sc.variety), 2),
        grammar: U.round(avg5(sc.grammar, sc.syntax) * (1 - errRate), 2),
        register: U.round(((a.register && a.register.ok) ? 0.5 : 0.25) + avg5(sc.naturalness) * 0.5, 2),
        fluency: a.speech && a.speech.fluency != null ? U.round(a.speech.fluency / 5, 2) : U.round(Math.min(1, len * 0.9), 2),
        pron: extra.pron != null ? extra.pron : null,
        clinical: U.round(ptsShare, 2),
        interaction: U.round(0.5 * ptsShare + 0.5 * len, 2),
      },
      points: pts,
    };
  }
  function scoreProduction(code, examId, t, text, opts = {}) {
    const e = exam(examId);
    const lv = t.level || e.cefr || 'B2';
    const a = opts.speech ? LOS.writing.analyzeSpeech(code, text, opts.secs || 0, { level: lv, keys: t.keys || [] }) : LOS.writing.analyze(code, text, { level: lv, keys: t.keys || [], reg: t.register || 'neutral', words: t.words });
    const cv = criterionValues(a, t, opts);
    const crit = (opts.speech ? e.criteria.speaking : e.criteria.writing) || [];
    const rows = crit.map((c) => ({ label: c.label, key: c.key, v: cv.v[c.key] == null ? null : cv.v[c.key], self: c.key === 'pron' }));
    const scored = rows.filter((r) => r.v != null);
    const pct = scored.length ? U.avg(scored.map((r) => r.v)) : 0;
    // IELTS writing/speaking are rated per criterion as bands
    const bands = e.scale === 'ielts' ? rows.map((r) => (r.v == null ? null : Math.round((4 + r.v * 5) * 2) / 2)) : null;
    return { analysis: a, criteria: rows, bands, pct: U.round(pct, 3), points: cv.points, est: e.scale === 'ielts' ? { value: bands && U.avg(bands.filter((b) => b != null)), label: `band ~${(Math.round(U.avg(bands.filter((b) => b != null)) * 2) / 2).toFixed(1)}`, note: 'estimated — practice only, not an official score' } : estimate(e, pct, { level: t.level }) };
  }

  /* ---------------- progress, attempts, readiness ---------------- */
  function progress(code, typeId) { return ((L(code).examProg || {})[typeId]) || { step: 0 }; }
  function setStep(code, typeId, step) {
    const lang = L(code);
    lang.examProg = lang.examProg || {};
    const p = (lang.examProg[typeId] = Object.assign({ step: 0 }, lang.examProg[typeId]));
    p.step = Math.max(p.step, step); p.last = U.today();
    return p;
  }
  function record(code, at) {
    const lang = L(code);
    lang.examAttempts = lang.examAttempts || [];
    const entry = Object.assign({ id: U.uid('exa'), date: U.today() }, at);
    lang.examAttempts.unshift(entry);
    if (lang.examAttempts.length > 300) lang.examAttempts.length = 300;
    // weak criteria feed the error bank (as recurring patterns) and therefore the queue and the planner
    (at.criteria || []).filter((c) => c.v != null && c.v < 0.5 && !c.self).forEach((c) => LOS.learn.recordError(code, { src: 'exam', cat: c.key === 'grammar' ? 'grammar' : c.key === 'lexis' ? 'vocabulary' : c.key === 'register' ? 'register' : c.key === 'coherence' ? 'naturalness' : 'grammar', label: `${exam(at.exam).name}: ${c.label}`, wrong: '', right: '', note: `Exam criterion below 50% in ${at.paper}` }));
    if (at.paper) setStep(code, at.type, at.mode === 'timed' || at.mode === 'mock' ? 3 : 2);
    return entry;
  }
  function attempts(code, examId, paperId) { return (L(code).examAttempts || []).filter((a) => a.exam === examId && (!paperId || a.paper === paperId)); }
  function readiness(code, examId) {
    const e = exam(examId);
    if (!e) return null;
    const pass = passMark(e);
    const papers = e.papers.map((p) => {
      const at = attempts(code, examId, p.id).slice(0, 3);
      const types = typesFor(examId, p.id);
      const learned = types.length ? types.filter((ty) => progress(code, ty.id).step >= 2).length / types.length : 0;
      const avgPct = at.length ? U.avg(at.map((a) => a.pct)) : null;
      const v = avgPct == null ? learned * 0.3 : 0.75 * Math.min(1, avgPct / pass) + 0.25 * learned;
      return { id: p.id, name: p.name, v: U.round(U.clamp(v, 0, 1), 2), avg: avgPct, attempts: at.length, learned: U.round(learned, 2), est: avgPct == null ? null : estimate(e, avgPct) };
    });
    const overall = U.round(U.avg(papers.map((p) => p.v)), 2);
    const impact = papers.slice().sort((a, b) => a.v - b.v).slice(0, 2);
    // weakest criteria over the last attempts
    const crit = {};
    (L(code).examAttempts || []).filter((a) => a.exam === examId).slice(0, 10).forEach((a) => (a.criteria || []).forEach((c) => { if (c.v == null) return; (crit[c.label] = crit[c.label] || []).push(c.v); }));
    const weakCriteria = Object.keys(crit).map((k) => ({ label: k, v: U.round(U.avg(crit[k]), 2) })).sort((a, b) => a.v - b.v).slice(0, 3);
    return { exam: e, papers, overall, impact, weakCriteria };
  }

  /* ---------------- goal & countdown ---------------- */
  function goal(code) {
    const g = L(code).exam;
    if (!g || !g.id || !exam(g.id)) return null;
    const e = exam(g.id);
    const daysLeft = g.date ? U.diffDays(U.today(), g.date) : null;
    return Object.assign({ exam: e, name: e.name, daysLeft }, g);
  }
  function setGoal(code, g) { L(code).exam = g && g.id ? { id: g.id, level: g.level || exam(g.id).focus, date: g.date || '' } : null; }
  /** Share of a session given to exam-format practice: grows as the date approaches (still interleaved). */
  function share(code) {
    const g = goal(code);
    if (!g) return 0;
    if (g.daysLeft == null) return 0.15;
    if (g.daysLeft < 0) return 0;
    return g.daysLeft <= 14 ? 0.5 : g.daysLeft <= 45 ? 0.35 : g.daysLeft <= 120 ? 0.22 : 0.15;
  }
  /** Next exam activity: learn the weakest paper's next task type, otherwise practise it (timed close to the date). */
  function nextActivity(code, rnd = Math.random, exclude) {
    exclude = exclude || new Set();
    const g = goal(code);
    if (!g) return null;
    const rd = readiness(code, g.id);
    for (const p of rd.papers.slice().sort((a, b) => a.v - b.v)) {
      const types = typesFor(g.id, p.id);
      const toLearn = types.find((ty) => progress(code, ty.id).step < 2 && !exclude.has(ty.id));
      if (toLearn) { const t = tasksFor(g.id, p.id).find((x) => x.type === toLearn.id); if (t) return { task: t, type: toLearn, mode: 'learn', paper: p }; }
      const pool = tasksFor(g.id, p.id).filter((x) => !exclude.has(x.type));
      if (pool.length) {
        const done = new Set((L(code).examAttempts || []).map((a) => a.task));
        const t = pool.find((x) => !done.has(x.id)) || pool[Math.floor(rnd() * pool.length)];
        return { task: t, type: type(t.type), mode: g.daysLeft != null && g.daysLeft <= 30 ? 'timed' : 'practice', paper: p };
      }
    }
    return null;
  }

  /* ---------------- recommendations ---------------- */
  function recommend(code) {
    const lang = L(code);
    const tg = LOS.goals.targetOf(code);
    const dom = LOS.goals.domainOf();
    const health = dom === 'medicine' || dom === 'healthcare';
    const country = String(tg.country || '').toLowerCase();
    const study = ['study_abroad', 'university'].includes(tg.type) || (lang.goals || []).includes('academic');
    const out = [];
    const add = (id, why) => { if (exam(id) && !out.some((x) => x.id === id)) out.push({ id, why }); };
    if (code === 'en') {
      if (health) { add('oet', 'Healthcare professionals: OET is accepted by many medical and nursing regulators (e.g. UK, Ireland, Australia, New Zealand).'); add('ielts-ac', 'IELTS Academic is the most widely accepted alternative for registration and visas.'); }
      if (study) { add('ielts-ac', 'Most universities in the UK, Ireland and Australia accept IELTS Academic.'); add(/united states|usa|us\b/.test(country) ? 'toefl' : 'cambridge', /united states|usa|us\b/.test(country) ? 'TOEFL iBT is common for universities in the United States.' : 'Cambridge C1 Advanced is a lifelong certificate accepted by many universities.'); }
      if (tg.type === 'work_abroad' && !health) add('ielts-gt', 'IELTS General Training is used for work and migration (e.g. UK, Canada, Australia).');
      add('cambridge', 'Cambridge English (B2 First / C1 Advanced) does not expire and is widely recognised by employers.');
    } else if (code === 'de') {
      if (health && dom === 'medicine') { add('telc-med', 'Doctors: many German medical chambers accept telc Deutsch B2·C1 Medizin for the language requirement.'); add('fsp', 'The Fachsprachprüfung of the medical chamber (C1, medical language) is required in most federal states.'); }
      if (dom === 'healthcare') add('telc-pflege', 'Nurses and carers: telc Deutsch B1·B2 Pflege is designed for recognition in nursing.');
      if (study) { add('testdaf', 'TestDaF is accepted by German universities (TDN 4 in all parts is the usual requirement).'); add('goethe', 'Goethe-Zertifikat C1/C2 is also accepted by many universities.'); }
      add('goethe', 'The Goethe-Zertifikat (B2/C1) is the most widely known general certificate.');
    } else if (code === 'es') {
      add('dele', 'DELE is the official Spanish diploma (Instituto Cervantes), valid for life; B2/C1 are often requested for work and study.');
      add('siele', 'SIELE is a single, faster online-based exam (valid 5 years), useful when you need a certificate quickly.');
    } else if (code === 'fr') {
      if (/canada|québec|quebec/.test(country)) { add('tef', 'Canada (immigration, Québec): TEF Canada / TEF are widely used.'); add('tcf', 'TCF Canada is also accepted for Canadian immigration.'); }
      if (study) { add('dalf-c1', 'French universities often require B2–C1; DALF C1 opens almost all programmes.'); add('tcf', 'The TCF is frequently used for university admission (TCF DAP).'); }
      add('delf-b2', 'DELF B2 is valid for life and is the level most often requested for work and study in France.');
    }
    return out.map((x) => Object.assign(x, { verify: 'Requirements depend on the institution or authority — always check what they accept before booking.' }));
  }

  (LOS.EXAM_PACKS || []).forEach(register);
  LOS.exams = { register, list, exam, type, task, tasksFor, typesFor, paperOf, examsOf, SCALES, estimate, passMark, checkItem, scoreObjective, pointsCovered, scoreProduction, progress, setStep, record, attempts, readiness, goal, setGoal, share, nextActivity, recommend, _reg: reg };
})();

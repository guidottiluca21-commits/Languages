/* PLANNER — WORKLOAD → ENERGY → STUDY LOAD → highest-value activities.
 *
 * 1. calculateWorkload(date): reads the work calendar (weekly pattern + per-day overrides), detects
 *    night shifts and the day after them, and classifies the day as heavy / normal / free.
 * 2. dayBudget(date): turns that into minutes using editable rules (heavy 10–20, normal 20–40,
 *    free 45–90 by default), the user's min/target/max, the weekly realism factor and a gentle
 *    re-entry ramp after missed days (never a backlog).
 * 3. generateDailyPlan(lang, date, minutes): asks "what is the highest-value thing to practise today?"
 *    — due reviews first (retrieval practice), then the remaining time is split across skills in
 *    proportion to their gap from the strongest skill, adjusted for goals, recent practice, error
 *    pressure, skips and the weekly focus. Blocks are ordered input → practice → production. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const S = () => LOS.store.state;
  const LG = (c) => LOS.store.lang(c);

  const MIN_BLOCK = { grammar: 6, vocabulary: 5, reading: 8, listening: 8, writing: 12, speaking: 8, think: 5 };
  const ORDER = ['review', 'listening', 'reading', 'grammar', 'vocabulary', 'think', 'speaking', 'scenario', 'writing'];
  const TYPE_LABEL = { work: 'Work', night: 'Night shift', off: 'Day off', vacation: 'Vacation', recovery: 'Recovery day' };

  /* ---------------- workload ---------------- */
  function scheduleEntry(date) {
    const s = S().schedule;
    return s.overrides[date] || s.weekly[U.weekday(date)] || { type: 'off' };
  }
  function calculateWorkload(date) {
    const st = S();
    const e = scheduleEntry(date);
    const prev = scheduleEntry(U.addDays(date, -1));
    const day = st.days[date] || {};
    const hours = e.type === 'work' || e.type === 'night' ? U.hoursBetween(e.start, e.end) : 0;
    let kind = e.type, load = 0.15, category = 'free';
    if (e.type === 'night') { kind = 'night'; load = 0.95; category = 'heavy'; }
    else if (e.type === 'work') {
      if (prev.type === 'night') { kind = 'work'; load = 1; category = 'heavy'; }
      else if (hours >= st.rules.longShiftHours) { kind = 'long'; load = 0.8; category = 'heavy'; }
      else { load = U.clamp(0.35 + (hours / 8) * 0.25, 0.3, 0.7); category = 'normal'; }
    } else if (prev.type === 'night') { kind = 'postnight'; load = 0.7; category = 'heavy'; }
    else if (e.type === 'recovery') { load = 0.6; category = 'heavy'; }
    else if (e.type === 'vacation') { load = 0.05; category = 'free'; }
    const autoRest = st.settings.restDay != null && !st.schedule.overrides[date] && U.weekday(date) === Number(st.settings.restDay);
    const rest = !!day.rest || autoRest;
    const label = kind === 'postnight' ? 'After a night shift' : kind === 'long' ? `Long shift ${e.start}–${e.end}` : e.type === 'work' || e.type === 'night' ? `${TYPE_LABEL[e.type]} ${e.start}–${e.end}` : TYPE_LABEL[e.type] || 'Day off';
    return { date, type: e.type, kind, start: e.start, end: e.end, hours: U.round(hours, 1), note: e.note || '', load: U.round(load, 2), energy: U.round(1 - load, 2), category, lowEnergy: !!day.lowEnergy, rest, label };
  }

  /* ---------------- missed days: gentle re-entry ---------------- */
  function isRestDay(d) { const x = S().days[d]; return !!(x && x.rest); }
  function recoveryState(date = U.today()) {
    const dates = LOS.learn.studyDates();
    if (!dates.size) return { active: false, factor: 1 };
    const first = [...dates].sort()[0];
    let empty = 0, d = U.addDays(date, -1);
    while (!dates.has(d) && d >= first && empty < 120) { if (!isRestDay(d)) empty++; d = U.addDays(d, -1); }
    if (!dates.has(date) && empty >= 3) return { active: true, day: 0, factor: 0.6, gap: empty };
    // returning streak after a gap?
    let back = 0; d = U.addDays(date, -1);
    while (dates.has(d) && back < 4) { back++; d = U.addDays(d, -1); }
    let gap = 0;
    while (!dates.has(d) && d >= first && gap < 120) { if (!isRestDay(d)) gap++; d = U.addDays(d, -1); }
    if (gap >= 3 && back >= 1 && back <= 2) return { active: true, day: back, factor: [0.6, 0.75, 0.9][back], gap };
    return { active: false, factor: 1 };
  }

  /* ---------------- daily budget ---------------- */
  function dayBudget(date = U.today()) {
    const st = S();
    const info = calculateWorkload(date);
    const why = [];
    if (info.rest) return { date, minutes: 0, mode: 'rest', info, why: ['Planned rest day — recovery is part of learning.'] };
    const range = st.rules[info.category] || [20, 40];
    const t = st.time;
    let m;
    if (info.category === 'free') { m = Math.min(range[1], Math.max(t.target, U.lerp(range[0], range[1], 0.7))); why.push(info.type === 'vacation' ? 'Vacation — deep learning opportunity' : 'Free day — deep learning opportunity'); }
    else if (info.category === 'normal') { m = U.clamp(t.target, range[0], range[1]) - (info.hours >= 9 ? 5 : 0); why.push(`${info.label} — focused session`); }
    else { m = range[0] + (info.kind === 'recovery' || info.kind === 'postnight' ? 5 : 0); why.push(info.kind === 'night' ? 'Night shift — maintenance only' : info.kind === 'postnight' ? 'After a night shift — light session' : `${info.label} — light session recommended`); }
    const lf = st.meta.loadFactor || 1;
    if (Math.abs(lf - 1) > 0.01) { m *= lf; why.push(lf < 1 ? 'Load reduced after a heavy week' : 'Load increased — you handled last week well'); }
    const rec = date === U.today() ? recoveryState(date) : { active: false, factor: 1 };
    if (rec.active) { m *= rec.factor; why.push(rec.day === 0 ? `Welcome back after ${rec.gap} days — gentle restart, no backlog` : `Re-entry day ${rec.day + 1} — building back up`); }
    let mode;
    if (info.lowEnergy) { m = U.clamp(Math.min(t.min, 15), 5, 15); mode = 'mvs'; why.unshift('Low-energy mode — minimum viable study'); }
    else {
      m = U.clamp(m, Math.min(t.min, range[0]), t.max);
      mode = rec.active ? 'recovery' : m <= 20 ? 'light' : m >= 50 ? 'deep' : 'standard';
    }
    m = Math.max(5, Math.round(m / 5) * 5);
    return { date, minutes: m, mode, info, recovery: rec, why };
  }

  /* ---------------- languages sharing the day ---------------- */
  function daysSinceStudied(code, date) {
    const ses = LG(code).sessions;
    if (!ses.length) return 30;
    return Math.max(0, U.diffDays(ses[ses.length - 1].date, date));
  }
  function splitLanguages(date, minutes) {
    const codes = LOS.store.studying();
    if (!codes.length || !minutes) return [];
    const w = S().settings.langWeights;
    const weight = (c) => Math.max(1, w[c] == null ? 50 : w[c]);
    if (codes.length === 1) return [{ code: codes[0], minutes }];
    if (minutes < 25) {
      const due = (c) => LOS.learn.dueVocab(c, date).length + LOS.learn.dueErrorCards(c, date).length;
      const need = (c) => weight(c) * (1 + daysSinceStudied(c, date) * 0.5) * (1 + due(c) / 60);
      const best = codes.slice().sort((a, b) => need(b) - need(a))[0];
      return [{ code: best, minutes }];
    }
    const tot = U.sum(codes.map(weight));
    let parts = codes.map((c) => ({ code: c, minutes: Math.max(10, Math.round((minutes * weight(c)) / tot / 5) * 5) }));
    const diff = minutes - U.sum(parts.map((p) => p.minutes));
    parts.sort((a, b) => weight(b.code) - weight(a.code));
    parts[0].minutes = Math.max(10, parts[0].minutes + diff);
    const active = LOS.store.active();
    return parts.sort((a, b) => (a.code === active ? -1 : b.code === active ? 1 : 0));
  }

  /* ---------------- context & skill weights ---------------- */
  function context(code, date) {
    const lang = LG(code);
    const th = LOS.skills.thetas(lang);
    const known = Object.values(th).filter((v) => v != null);
    const mean = known.length ? U.avg(known) : 1.5;
    U.SKILLS.forEach((s) => { if (th[s] == null) th[s] = mean; });
    const since = U.addDays(date, -7);
    const recent = lang.sessions.filter((s) => s.date >= since && s.date < date);
    const bySkill = {};
    recent.forEach((s) => { bySkill[s.skill] = (bySkill[s.skill] || 0) + s.minutes; });
    const dueV = LOS.learn.dueVocab(code, date).length;
    const dueG = LOS.learn.grammarList(code, date).filter((g) => g.due).map((g) => g.topic.id);
    const dueE = LOS.learn.dueErrorCards(code, date).length;
    const backlog = Object.values(lang.vocab).filter((v) => (v.stage || 0) <= 1 && !v.assumed).length;
    const errs = LOS.learn.errorStats(code, 21);
    return { code, date, lang, th, mean, bySkill, recentTotal: U.sum(Object.values(bySkill)), dueV, dueG, dueE, backlog, errs, med: LOS.learn.medicalPriority(code), goals: lang.goals };
  }

  function skillWeights(ctx, mode) {
    const th = ctx.th;
    const maxT = Math.max(...U.SKILLS.map((s) => th[s]));
    const w = {};
    U.SKILLS.forEach((s) => { w[s] = Math.pow(maxT - th[s] + 0.6, 1.5); });
    const g = ctx.goals || [];
    if (g.includes('medical') || g.includes('work')) { w.writing *= 1.15; w.speaking *= 1.2; }
    if (g.includes('fluency')) { w.speaking *= 1.25; w.listening *= 1.15; }
    if (g.includes('academic')) { w.writing *= 1.2; w.reading *= 1.15; }
    if (g.includes('certification')) { w.grammar *= 1.15; w.reading *= 1.1; w.writing *= 1.1; }
    if (g.includes('travel')) { w.speaking *= 1.2; w.listening *= 1.1; }
    if (g.includes('c2')) { w.vocabulary *= 1.1; w.writing *= 1.1; }
    // error pressure → grammar / vocabulary
    const cats = ctx.errs.byLabel.reduce((o, x) => { o[x.cat] = (o[x.cat] || 0) + x.weight; return o; }, {});
    w.grammar *= 1 + Math.min(0.6, ((cats.grammar || 0) + (cats.syntax || 0)) * 0.06);
    w.vocabulary *= 1 + Math.min(0.5, ((cats.collocation || 0) + (cats.vocabulary || 0) + (cats.wordchoice || 0) + (cats.falsefriend || 0) + (cats.interference || 0)) * 0.05);
    // recent balance: over-practised skills step back, neglected ones come forward
    const totW = U.sum(Object.values(w));
    if (ctx.recentTotal > 30) U.SKILLS.forEach((s) => {
      const share = (ctx.bySkill[s] || 0) / ctx.recentTotal;
      const ideal = w[s] / totW;
      if (share > ideal * 1.6) w[s] *= 0.75; else if (share < ideal * 0.5) w[s] *= 1.2;
    });
    const skips = (ctx.lang.recentSkips || []).filter((x) => U.diffDays(x.date, ctx.date) <= 7);
    skips.forEach((x) => { if (w[x.skill]) w[x.skill] *= 1.1; });
    const wf = ctx.lang.weekFocus;
    if (wf && wf.until >= ctx.date && w[wf.skill]) w[wf.skill] *= 1.35;
    if (ctx.backlog > 40) w.vocabulary *= 0.5;
    // "think in the language" draws on the speaking budget
    w.think = w.speaking * 0.55 + 0.25;
    w.speaking *= 0.75;
    if (mode === 'recovery') { w.writing *= 0.4; w.speaking *= 0.6; }
    return w;
  }

  function allocate(rem, w, mode) {
    if (rem < 5) return [];
    const maxBlocks = rem <= 12 ? 1 : rem <= 22 ? 2 : rem <= 40 ? 3 : rem <= 60 ? 4 : 5;
    const sorted = Object.keys(w).sort((a, b) => w[b] - w[a]);
    const chosen = [];
    for (const s of sorted) {
      if (chosen.length >= maxBlocks) break;
      if (U.sum(chosen.map((c) => MIN_BLOCK[c])) + MIN_BLOCK[s] <= rem) chosen.push(s);
    }
    const production = ['writing', 'speaking', 'think'];
    const input = ['listening', 'reading'];
    const ensure = (group) => {
      if (chosen.some((c) => group.includes(c))) return;
      const cand = sorted.find((s) => group.includes(s) && MIN_BLOCK[s] <= rem);
      if (!cand) return;
      if (chosen.length < maxBlocks && U.sum(chosen.map((c) => MIN_BLOCK[c])) + MIN_BLOCK[cand] <= rem) chosen.push(cand);
      else if (chosen.length > 1) { chosen.pop(); if (U.sum(chosen.map((c) => MIN_BLOCK[c])) + MIN_BLOCK[cand] <= rem) chosen.push(cand); }
    };
    if (rem >= 20) ensure(production); // no passive-only days
    if (mode === 'deep') ensure(input);
    if (!chosen.length) chosen.push(sorted.find((s) => MIN_BLOCK[s] <= rem) || 'vocabulary');
    const tw = U.sum(chosen.map((c) => w[c]));
    let alloc = chosen.map((c) => ({ skill: c, minutes: Math.max(MIN_BLOCK[c], (rem * w[c]) / tw) }));
    const over = U.sum(alloc.map((a) => a.minutes)) - rem;
    if (over > 0) {
      const flex = U.sum(alloc.map((a) => a.minutes - MIN_BLOCK[a.skill]));
      alloc.forEach((a) => { const f = a.minutes - MIN_BLOCK[a.skill]; a.minutes -= flex ? (over * f) / flex : 0; });
    }
    alloc.forEach((a) => (a.minutes = Math.round(a.minutes)));
    const diff = rem - U.sum(alloc.map((a) => a.minutes));
    if (alloc.length) alloc[0].minutes += diff;
    return alloc.filter((a) => a.minutes > 0);
  }

  /* ---------------- content for each block ---------------- */
  function reasonFor(ctx, skill, w) {
    const wk = U.SKILLS.slice().sort((a, b) => ctx.th[a] - ctx.th[b])[0];
    const lvl = U.thetaInfo(ctx.th[skill === 'think' ? 'speaking' : skill]).sub;
    const wf = ctx.lang.weekFocus;
    if (wf && wf.skill === skill && wf.until >= ctx.date) return `This week's focus (${lvl})`;
    if (skill === wk) return `Weakest skill (${lvl}) — gets extra time`;
    if ((ctx.lang.recentSkips || []).some((x) => x.skill === skill && U.diffDays(x.date, ctx.date) <= 7)) return 'Rescheduled after a skip — no backlog added';
    if (skill === 'think') return 'Reduce mental translation: respond directly in the language';
    const share = ctx.recentTotal ? (ctx.bySkill[skill] || 0) / ctx.recentTotal : 0;
    if (ctx.recentTotal > 30 && share < 0.08) return 'Not practised recently — interleaving';
    if (ctx.th[skill] >= Math.max(...U.SKILLS.map((s) => ctx.th[s])) - 0.15) return `Strong skill (${lvl}) — keep it active`;
    return `Gap of ${U.round(Math.max(...U.SKILLS.map((s) => ctx.th[s])) - ctx.th[skill], 1)} levels to your strongest skill`;
  }

  function makeItem(ctx, skill, minutes, mode, rnd, reason) {
    const code = ctx.code;
    const p = LOS.lang.get(code);
    const id = U.uid('it');
    const base = { id, skill, minutes, status: 'pending', reason };
    if (skill === 'grammar') {
      const pick = LOS.learn.pickTopic(code, { date: ctx.date, rnd });
      if (!pick) return null;
      const learn = pick.status === 'new';
      return Object.assign(base, { type: 'grammar', title: 'Grammar', subtitle: pick.topic.title, level: pick.topic.l, reason: `${U.cap(pick.reason)} · ${reason}`, payload: { topicId: pick.topic.id, count: U.clamp(Math.round(minutes / 1.3), 2, 12), learn } });
    }
    if (skill === 'vocabulary') {
      let n = U.clamp(Math.round(minutes * 0.7), 3, 10);
      if (ctx.backlog > 40) n = Math.min(n, 4);
      if (mode === 'recovery') n = Math.min(n, 3);
      const med = ctx.med > 0.3;
      return Object.assign(base, { type: 'vocabulary', title: 'Vocabulary', subtitle: `${n} new words & chunks${med ? ' · incl. medical' : ''}`, payload: { count: n } });
    }
    if (skill === 'reading') {
      const t = LOS.learn.pickText(code, 'reading', { rnd });
      if (!t) return null;
      return Object.assign(base, { type: 'reading', title: 'Reading', subtitle: t.title, level: t.l, payload: { textId: t.id } });
    }
    if (skill === 'listening') {
      const lt = LOS.learn.targetLevelIdx(code, 'listening');
      if (minutes >= 15 && mode !== 'light' && mode !== 'mvs') {
        const lvl = U.LEVELS[lt];
        const pool = (ctx.med > 0.3 && rnd() < ctx.med ? p.listeningSources.medical : null) || p.listeningSources[lvl] || [];
        const sug = pool.length ? pool[Math.floor(rnd() * pool.length)] : { type: 'Audio', desc: 'Any authentic audio at your level', min: minutes };
        return Object.assign(base, { type: 'listening', title: 'Listening', subtitle: `${sug.type} · ${lvl}`, level: lvl, payload: { mode: 'external', suggestion: sug, level: lvl, objective: LOS.shared.LISTENING_STAGE[lvl].objective } });
      }
      const t = LOS.learn.pickText(code, 'listening', { rnd });
      return Object.assign(base, { type: 'listening', title: 'Listening', subtitle: `Guided: ${t.title}`, level: t.l, payload: { mode: 'guided', textId: t.id } });
    }
    if (skill === 'writing') {
      const w = LOS.learn.pickWriting(code, { rnd });
      return Object.assign(base, { type: 'writing', title: 'Writing', subtitle: `${w.genre}: ${w.title}`, level: w.l, payload: { promptId: w.id } });
    }
    if (skill === 'speaking') {
      const pro = ctx.goals.includes('work') ? 0.3 : 0;
      if (ctx.med > 0.3 && rnd() < ctx.med + 0.1) {
        const sc = LOS.learn.pickScenario(code, 'medical', { rnd });
        if (sc) return Object.assign(base, { type: 'scenario', title: 'Medical scenario', subtitle: sc.module.title, level: sc.module.l, payload: { moduleId: sc.module.id, idx: sc.idx } });
      } else if (rnd() < pro) {
        const sc = LOS.learn.pickScenario(code, 'professional', { rnd });
        if (sc) return Object.assign(base, { type: 'scenario', title: 'Professional scenario', subtitle: sc.module.title, level: sc.module.l, payload: { moduleId: sc.module.id, idx: sc.idx } });
      }
      const t = LOS.learn.pickSpeaking(code, { rnd });
      return Object.assign(base, { type: 'speaking', title: 'Speaking', subtitle: t.title, level: t.l, payload: { taskId: t.id } });
    }
    if (skill === 'think') {
      const n = U.clamp(Math.round(minutes / 1.5), 3, 8);
      return Object.assign(base, { type: 'think', title: 'Think in ' + p.name, subtitle: `${n} rapid drills · no translating`, payload: { count: n } });
    }
    return null;
  }

  function focusFrom(item, p) {
    if (!item) return { title: 'Keep the momentum', sub: '' };
    const map = {
      grammar: () => `Master ${item.subtitle.charAt(0).toLowerCase() + item.subtitle.slice(1)}`,
      vocabulary: () => 'Grow your active vocabulary',
      listening: () => 'Strengthen listening',
      reading: () => `Read: ${item.subtitle}`,
      writing: () => `Write: ${item.subtitle.split(': ').pop()}`,
      speaking: () => `Speak: ${item.subtitle}`,
      scenario: () => item.subtitle,
      think: () => `Think directly in ${p.name}`,
      review: () => 'Consolidate what you know',
    };
    return { title: (map[item.type] || map.review)(), sub: item.reason };
  }

  /** generateDailyPlan(): the core decision of the app. */
  function generateDailyPlan(code, date, minutes, opts = {}) {
    const p = LOS.lang.get(code);
    const ctx = context(code, date);
    const rnd = U.rng(`${date}|${code}|${opts.salt || ''}`);
    const mode = opts.mode || (minutes <= 15 ? 'mvs' : minutes <= 20 ? 'light' : minutes >= 50 ? 'deep' : 'standard');
    const items = [];
    const dueLine = [ctx.dueV && `${ctx.dueV} vocabulary`, ctx.dueG.length && `${ctx.dueG.length} grammar`, ctx.dueE && `${ctx.dueE} error card${ctx.dueE > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
    if (mode === 'mvs') {
      const a = Math.max(2, Math.round(minutes * 0.3)), b = Math.max(2, Math.round(minutes * 0.3)), c = Math.max(3, minutes - a - b);
      items.push({ id: U.uid('it'), type: 'review', skill: 'review', title: 'Quick review', subtitle: `${Math.min(5, Math.max(ctx.dueV, 5))} cards`, minutes: a, status: 'pending', reason: 'Keep the spaced-repetition chain alive', payload: { cap: 5 } });
      const g = makeItem(ctx, 'grammar', b, mode, rnd, 'One targeted exercise');
      if (g) { g.payload.count = 2; g.payload.learn = false; g.title = 'Grammar'; items.push(g); }
      const t = LOS.learn.pickText(code, 'listening', { rnd });
      items.push({ id: U.uid('it'), type: 'listening', skill: 'listening', title: 'Listening', subtitle: `5-minute guided: ${t.title}`, level: t.l, minutes: c, status: 'pending', reason: 'Short input keeps your ear tuned', payload: { mode: 'guided', textId: t.id, short: true } });
    } else {
      const reviewLoad = ctx.dueV * 0.3 + ctx.dueG.length * 1.5 + ctx.dueE * 0.6;
      const any = ctx.dueV + ctx.dueG.length + ctx.dueE > 0;
      const reviewMin = any ? U.clamp(Math.round(reviewLoad), 3, Math.round(minutes * (mode === 'recovery' ? 0.45 : 0.3))) : 0;
      if (reviewMin) items.push({ id: U.uid('it'), type: 'review', skill: 'review', title: 'Review', subtitle: dueLine || 'Due items', minutes: reviewMin, status: 'pending', reason: mode === 'recovery' ? 'Recovery: most important reviews only — the rest are spread out' : 'Spaced repetition: retrieve before you forget', payload: { cap: Math.round(reviewMin / 0.3) } });
      const w = skillWeights(ctx, mode);
      const blocks = allocate(minutes - reviewMin, w, mode);
      blocks.forEach((b) => { const it = makeItem(ctx, b.skill, b.minutes, mode, rnd, reasonFor(ctx, b.skill, w)); if (it) items.push(it); });
    }
    items.sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
    const main = items.filter((i) => i.type !== 'review').sort((a, b) => b.minutes - a.minutes)[0] || items[0];
    return { date, code, minutes: U.sum(items.map((i) => i.minutes)), mode, items, focus: focusFrom(main, p), generatedAt: Date.now(), sig: opts.sig || '', extra: !!opts.extra };
  }

  /* ---------------- today's plans (stored, regenerated when inputs change) ---------------- */
  function closePastPlans() {
    const today = U.today();
    LOS.store.studying().forEach((c) => {
      const plans = LG(c).plans;
      Object.keys(plans).forEach((d) => {
        if (d >= today || plans[d].closed) return;
        plans[d].items.forEach((it) => { if (it.status === 'pending') it.status = 'missed'; });
        plans[d].closed = true;
      });
      // keep ~120 days of plan history
      const keys = Object.keys(plans).sort();
      if (keys.length > 120) keys.slice(0, keys.length - 120).forEach((k) => delete plans[k]);
    });
  }

  function ensureToday(force) {
    closePastPlans();
    const date = U.today();
    const b = dayBudget(date);
    const split = splitLanguages(date, b.minutes);
    const out = [];
    LOS.store.studying().forEach((code) => {
      const lang = LG(code);
      const share = split.find((x) => x.code === code);
      const existing = lang.plans[date];
      const started = existing && existing.items.some((i) => i.status !== 'pending');
      const sig = `${share ? share.minutes : 0}|${b.mode}|${b.info.kind}|${b.info.lowEnergy}|${b.info.rest}`;
      if (!share) {
        if (existing && !started && !existing.extra) delete lang.plans[date];
        else if (existing) out.push({ code, plan: existing });
        return;
      }
      if (!existing || force === code || force === true || (!started && existing.sig !== sig && !existing.extra)) {
        lang.plans[date] = generateDailyPlan(code, date, share.minutes, { mode: b.mode === 'recovery' ? 'recovery' : b.mode === 'mvs' ? 'mvs' : undefined, sig, salt: force ? Date.now() : '' });
      }
      out.push({ code, plan: lang.plans[date] });
    });
    LOS.store.save();
    return { budget: b, plans: out };
  }

  function findItem(code, date, itemId) {
    const plan = LG(code).plans[date];
    return plan ? { plan, item: plan.items.find((i) => i.id === itemId) } : {};
  }
  function completeItem(code, date, itemId, result = {}) {
    const { plan, item } = findItem(code, date, itemId);
    if (!item) return;
    item.status = 'done';
    item.doneAt = Date.now();
    item.actual = result.minutes;
    item.score = result.score;
    if (plan.items.every((i) => i.status !== 'pending')) plan.completedAt = Date.now();
    LOS.store.save();
  }
  function skipItem(code, date, itemId) {
    const { item } = findItem(code, date, itemId);
    if (!item) return;
    item.status = 'skipped';
    const lang = LG(code);
    lang.recentSkips = (lang.recentSkips || []).concat([{ date, skill: item.skill }]).slice(-12);
    LOS.store.save();
  }
  function swapItem(code, date, itemId) {
    const { plan, item } = findItem(code, date, itemId);
    if (!item || item.status !== 'pending') return null;
    const ctx = context(code, date);
    const w = skillWeights(ctx, plan.mode);
    const used = new Set(plan.items.filter((i) => i.status === 'pending').map((i) => i.skill));
    const rnd = U.rng(date + itemId + Date.now());
    const options = Object.keys(w).filter((s) => !used.has(s) && MIN_BLOCK[s] <= item.minutes + 3).sort((a, b) => w[b] - w[a]);
    const skill = options[0] || (item.skill === 'grammar' ? 'vocabulary' : 'grammar');
    const neu = makeItem(ctx, skill, item.minutes, plan.mode, rnd, 'Swapped in at your request');
    if (!neu) return null;
    plan.items[plan.items.indexOf(item)] = neu;
    LOS.store.save();
    return neu;
  }
  function addExtraSession(code, minutes = 15) {
    const date = U.today();
    const lang = LG(code);
    const existing = lang.plans[date];
    const extra = generateDailyPlan(code, date, minutes, { extra: true, salt: 'extra' + Date.now() });
    if (existing) { existing.items = existing.items.concat(extra.items); existing.minutes += extra.minutes; existing.extra = true; delete existing.completedAt; }
    else lang.plans[date] = extra;
    LOS.store.save();
    return lang.plans[date];
  }

  /* ---------------- forecasts: calendar + weekly plan ---------------- */
  function forecast(date) {
    const b = dayBudget(date);
    const split = splitLanguages(date, b.minutes);
    const langs = split.map((s) => {
      const ctx = context(s.code, date);
      if (b.mode === 'mvs') return { code: s.code, minutes: s.minutes, blocks: [{ skill: 'review', minutes: 3 }, { skill: 'grammar', minutes: 3 }, { skill: 'listening', minutes: Math.max(3, s.minutes - 6) }] };
      const reviewMin = U.clamp(Math.round(ctx.dueV * 0.3 + ctx.dueG.length * 1.5 + ctx.dueE * 0.6), ctx.dueV + ctx.dueG.length ? 3 : 0, Math.round(s.minutes * 0.3));
      const blocks = (reviewMin ? [{ skill: 'review', minutes: reviewMin }] : []).concat(allocate(s.minutes - reviewMin, skillWeights(ctx, b.mode), b.mode));
      return { code: s.code, minutes: s.minutes, blocks };
    });
    return { date, budget: b, langs };
  }

  /** generateWeeklyPlan(): 7-day outlook with load, focus and priorities. */
  function generateWeeklyPlan(start = U.weekStart(U.today(), S().settings.weekStart)) {
    const days = U.range(start, U.addDays(start, 6)).map(forecast);
    const total = U.sum(days.map((d) => d.budget.minutes));
    const byLang = {};
    days.forEach((d) => d.langs.forEach((l) => { byLang[l.code] = (byLang[l.code] || 0) + l.minutes; }));
    const priorities = {};
    LOS.store.studying().forEach((code) => {
      const lang = LG(code);
      const wk = LOS.skills.weakest(lang);
      const errs = LOS.learn.errorStats(code, 21).byLabel.slice(0, 3).map((e) => e.label);
      const topic = LOS.learn.pickTopic(code, { rnd: () => 0.5 });
      const listenMin = U.sum(days.map((d) => U.sum(d.langs.filter((l) => l.code === code).map((l) => U.sum(l.blocks.filter((b) => b.skill === 'listening').map((b) => b.minutes))))));
      priorities[code] = { weakest: wk ? wk.skill : null, focus: lang.weekFocus && lang.weekFocus.until >= start ? lang.weekFocus.skill : wk && wk.skill, errors: errs, topic: topic ? topic.topic.title : null, listening: listenMin };
    });
    return { start, days, total, byLang, priorities, deepDays: days.filter((d) => d.budget.mode === 'deep').length, lightDays: days.filter((d) => ['light', 'mvs'].includes(d.budget.mode)).length };
  }

  LOS.planner = {
    MIN_BLOCK, TYPE_LABEL,
    calculateWorkload, dayInfo: calculateWorkload, recoveryState, dayBudget, splitLanguages, context, skillWeights, allocate,
    generateDailyPlan, ensureToday, completeItem, skipItem, swapItem, addExtraSession, forecast, generateWeeklyPlan, scheduleEntry,
  };
})();

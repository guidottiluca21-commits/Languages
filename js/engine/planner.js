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
  /** Share the day's budget between languages. Never more languages than the time allows (≥ ~12 min each):
   * on short days the languages that most need it today get the time, the others rotate in on the next days. */
  function splitLanguages(date, minutes) {
    const codes = LOS.store.studying();
    if (!codes.length || !minutes) return [];
    const w = S().settings.langWeights;
    const weight = (c) => Math.max(1, w[c] == null ? 50 : w[c]);
    if (codes.length === 1) return [{ code: codes[0], minutes }];
    const due = (c) => LOS.learn.dueVocab(c, date).length + LOS.learn.dueErrorCards(c, date).length;
    const need = (c) => weight(c) * (1 + daysSinceStudied(c, date) * 0.5) * (1 + due(c) / 60);
    const maxLangs = minutes < 25 ? 1 : Math.max(1, Math.min(codes.length, Math.floor(minutes / 12)));
    const chosen = codes.slice().sort((a, b) => need(b) - need(a)).slice(0, maxLangs);
    if (chosen.length === 1) return [{ code: chosen[0], minutes }];
    const tot = U.sum(chosen.map(weight));
    const parts = chosen.map((c) => ({ code: c, minutes: Math.max(10, Math.round((minutes * weight(c)) / tot / 5) * 5) }));
    // keep the total exactly on budget: trim or extend the largest share
    let diff = minutes - U.sum(parts.map((p) => p.minutes));
    parts.sort((a, b) => b.minutes - a.minutes);
    while (diff < 0 && parts.some((p) => p.minutes > 10)) { const p = parts.find((x) => x.minutes > 10); const d = Math.min(-diff, p.minutes - 10); p.minutes -= d; diff += d; parts.sort((a, b) => b.minutes - a.minutes); }
    if (diff > 0) parts[0].minutes += diff;
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
    const backlog = Object.values(lang.vocab).filter((v) => (v.stage || 0) <= 2 && !v.assumed).length;
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
    const pressure = { grammar: 0, vocabulary: 0, speaking: 0 };
    Object.keys(cats).forEach((c) => { const sk = LOS.shared.errorSkill(c); if (sk in pressure) pressure[sk] += cats[c]; });
    w.grammar *= 1 + Math.min(0.6, pressure.grammar * 0.06);
    w.vocabulary *= 1 + Math.min(0.5, pressure.vocabulary * 0.05);
    w.speaking *= 1 + Math.min(0.3, pressure.speaking * 0.05);
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
      const sl = LOS.ped.speakLevel(code);
      const rung = LOS.ped.SPEAK_LADDER[sl];
      if (sl <= 2) {
        const n = U.clamp(Math.round(minutes / 1.2), 3, 8);
        return Object.assign(base, { type: 'think', skill: 'speaking', title: `Speaking · level ${sl} of 8`, subtitle: `${rung.label} · ${n} prompts`, payload: { count: n, type: rung.think[0] } });
      }
      if (rung.sim && minutes >= 8 && rnd() < 0.6) {
        const sim = LOS.sim && LOS.sim.pick(code, { rnd });
        if (sim) return Object.assign(base, { type: 'sim', title: `Speaking · level ${sl} of 8`, subtitle: `${rung.label}: ${sim.title}`, level: sim.l, payload: { moduleId: sim.moduleId, idx: sim.idx } });
      }
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
      micro: () => 'Use what you are learning',
      remedy: () => `Fix a recurring error: ${item.subtitle}`,
    };
    return { title: (map[item.type] || map.review)(), sub: item.reason };
  }

  /* ---------------- daily lesson (Engine 2.0) ----------------
   * Not a list of unrelated activities but one coherent lesson, built around the next smallest useful step:
   *   review → new language → controlled practice → grammar (or error clinic) → application → [input → production]
   * plus an OPTIONAL challenge that is never counted in the day's minutes.
   * Minimum sessions: ≤7 min = 5 reviews + 2 grammar questions + 1 sentence; ≤12 min = vocab + grammar + mini dialogue. */
  function reviewItem(ctx, minutes, cap, title, reason, dueLine) {
    return { id: U.uid('it'), type: 'review', skill: 'review', title, subtitle: dueLine || `${cap} items`, minutes, status: 'pending', reason, payload: { cap } };
  }
  function microItem(minutes, focus, count, reason) {
    const sub = { controlled: 'Controlled practice', application: 'Apply today’s language', sentence: 'Use it in one sentence', dialogue: 'Mini dialogue', mixed: 'Short tasks', retrieval: 'Recall without seeing the answer', commute: 'Listen · repeat · recognise', break: 'Quick retrieval' }[focus];
    return { id: U.uid('it'), type: 'micro', skill: focus === 'controlled' || focus === 'retrieval' ? 'vocabulary' : focus === 'commute' ? 'listening' : 'think', title: { controlled: 'Controlled practice', dialogue: 'Mini dialogue', retrieval: 'Retrieval', commute: 'Shadowing & listening', sentence: 'One sentence' }[focus] || 'Application', subtitle: `${sub} · ${count} short tasks`, minutes, status: 'pending', reason, payload: { focus, count } };
  }
  function grammarOrRemedy(ctx, minutes, mode, rnd, allowRemedy) {
    const rem = allowRemedy && LOS.ped.remedyCandidate(ctx.code);
    if (rem) return { id: U.uid('it'), type: 'remedy', skill: 'grammar', title: 'Error clinic', subtitle: rem.label || 'Recurring error', minutes, status: 'pending', reason: `Recurring error (${rem.count}× recently): explain → practise → use → check later`, payload: { key: rem.key, topic: rem.topic, label: rem.label } };
    const g = makeItem(ctx, 'grammar', minutes, mode, rnd, 'Today’s grammar step');
    if (g) g.payload.count = U.clamp(Math.round(minutes * 0.9), 2, 8);
    return g;
  }
  function applicationItem(ctx, minutes, mode, rnd) {
    // A scenario already in progress continues at its step; otherwise a short application set.
    const tasks = ctx.lang.tasks || {};
    const open = Object.keys(tasks).find((k) => k.startsWith('scenario:') && tasks[k].step >= 1 && tasks[k].step < 3);
    if (open && mode !== 'recovery') {
      const [, moduleId, idx] = open.split(':');
      const m = LOS.lang.get(ctx.code).index.modules[moduleId];
      if (m) return { id: U.uid('it'), type: 'scenario', skill: 'speaking', title: m.id.includes('-med-') ? 'Medical scenario' : 'Professional scenario', subtitle: `${m.title} · next step`, level: m.l, minutes, status: 'pending', reason: 'Scenario path: language → controlled → guided → free', payload: { moduleId, idx: +idx || 0 } };
    }
    // a weakness found in the last scenario simulation decides the kind of application
    const sim = (ctx.lang.sims || [])[0];
    const weak = sim && U.diffDays(sim.date, ctx.date) <= 7 ? (sim.weak || [])[0] : null;
    if (weak === 'interaction') return microItem(minutes, 'dialogue', U.clamp(Math.round(minutes * 1.2), 4, 8), 'Your last simulation: interaction was the weakest point \u2014 short exchanges');
    if (weak === 'fluency') return { id: U.uid('it'), type: 'think', skill: 'speaking', title: 'Fluency', subtitle: 'Rapid responses \u00b7 no translating', minutes, status: 'pending', reason: 'Your last simulation: fluency was the weakest point', payload: { count: U.clamp(Math.round(minutes / 1.2), 3, 8), type: 'rapid' } };
    if (weak === 'vocabulary' && sim.key) { const mid = sim.key.split(':')[0]; return { id: U.uid('it'), type: 'lesson', skill: 'vocabulary', title: 'The language you need', subtitle: sim.title, minutes, status: 'pending', reason: 'Your last simulation: vocabulary was the weakest point \u2014 learn the language of the scenario', payload: { kind: 'scenario', moduleId: mid, idx: 0, title: sim.title } }; }
    return microItem(minutes, 'application', U.clamp(Math.round(minutes * 1.2), 4, 10), weak === 'professional' || weak === 'naturalness' ? 'Your last simulation: register and naturalness \u2014 practise them in context' : 'Use the language you just practised');
  }
  function challengeItem(ctx, mode, rnd) {
    if (mode === 'recovery' || mode === 'mvs') return null;
    const code = ctx.code;
    const pick = rnd() < 0.5 ? 'writing' : 'speaking';
    const base = { id: U.uid('ch'), status: 'pending', optional: true, minutes: 10, reason: 'Optional challenge — not required, not counted in today’s plan' };
    if (ctx.med > 0.3 && rnd() < 0.5) {
      const sc = LOS.learn.pickScenario(code, 'medical', { rnd });
      if (sc) return Object.assign(base, { type: 'scenario', skill: 'speaking', title: 'Challenge · medical scenario', subtitle: sc.module.title, level: sc.module.l, payload: { moduleId: sc.module.id, idx: sc.idx } });
    }
    if (pick === 'writing') { const w = LOS.learn.pickWriting(code, { rnd }); return Object.assign(base, { type: 'writing', skill: 'writing', title: 'Challenge · full writing task', subtitle: `${w.genre}: ${w.title}`, level: w.l, minutes: 15, payload: { promptId: w.id, challenge: true } }); }
    const t = LOS.learn.pickSpeaking(code, { rnd });
    return Object.assign(base, { type: 'speaking', skill: 'speaking', title: 'Challenge · full speaking task', subtitle: t.title, level: t.l, payload: { taskId: t.id, challenge: true } });
  }

  /* Production slot: speaking (on the speaking ladder), writing, or a scenario simulation for the goal. */
  function productionItem(ctx, minutes, mode, rnd) {
    const w = skillWeights(ctx, mode);
    const goalPro = (ctx.goals || []).some((g) => g === 'medical' || g === 'work') || (ctx.lang.target && ctx.lang.target.type !== 'fluency');
    if (minutes >= 8 && goalPro && mode !== 'recovery' && rnd() < 0.45) {
      const sim = LOS.sim && LOS.sim.pick(ctx.code, { rnd });
      if (sim) return { id: U.uid('it'), type: 'sim', skill: 'speaking', title: 'Scenario simulation', subtitle: sim.title, level: sim.l, minutes, status: 'pending', reason: 'A realistic conversation: the other person reacts to what you say', payload: { moduleId: sim.moduleId, idx: sim.idx } };
    }
    const skill = minutes >= 10 && w.writing > w.speaking * 1.15 ? 'writing' : 'speaking';
    return makeItem(ctx, skill, minutes, mode, rnd, reasonFor(ctx, skill, w));
  }
  const STUDY_MODES = {
    commute: { label: 'Commute', desc: 'Listening, recognition, pronunciation, shadowing — no typing' },
    break: { label: 'Break', desc: '5-minute retrieval: vocabulary, grammar correction, one sentence' },
    evening: { label: 'Evening', desc: 'A balanced 20–30 minute session' },
    deep: { label: 'Deep study', desc: '45+ minutes: new material, speaking, writing, scenarios' },
  };

  /** generateDailyPlan(): the core decision of the app. */
  function generateDailyPlan(code, date, minutes, opts = {}) {
    const p = LOS.lang.get(code);
    const ctx = context(code, date);
    const rnd = U.rng(`${date}|${code}|${opts.salt || ''}`);
    const mode = opts.mode || (minutes <= 15 ? 'mvs' : minutes <= 20 ? 'light' : minutes >= 50 ? 'deep' : 'standard');
    const study = opts.study || null; // commute | break | evening | deep (chosen by the learner)
    const items = [];
    const push = (it) => { if (it) items.push(it); };
    const dueLine = [ctx.dueV && `${ctx.dueV} vocabulary`, ctx.dueG.length && `${ctx.dueG.length} grammar`, ctx.dueE && `${ctx.dueE} error card${ctx.dueE > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
    const hasMemory = Object.keys(ctx.lang.vocab).some((id) => !ctx.lang.vocab[id].assumed) || ctx.dueG.length || ctx.dueE;
    const newN = mode === 'recovery' ? 3 : ctx.backlog > 40 ? 3 : 5;
    const handsFree = study === 'commute';
    const review = (m, cap, title, reason) => { const r = reviewItem(ctx, m, cap, title || 'Review', reason || (mode === 'recovery' ? 'Welcome back: the most useful reviews only — nothing to catch up on' : 'Spaced retrieval: recall before you forget'), dueLine); if (handsFree) { r.payload.handsFree = true; r.subtitle = 'Listen and recognise · no typing'; } return r; };
    const vocabNew = (m, n) => { const v = makeItem(ctx, 'vocabulary', m, mode, rnd, 'New language before it is tested: see → hear → recognize → recall'); if (v) { v.payload.count = n; v.payload.handsFree = handsFree || undefined; v.subtitle = `${n} new words & chunks${ctx.med > 0.3 ? ' · incl. medical' : ''}`; } return v; };
    let challenge = null;

    if (handsFree) {
      // COMMUTE: listening, recognition, pronunciation, shadowing, short dialogues — never typing
      const m = Math.max(5, minutes);
      if (hasMemory) push(review(Math.max(2, Math.round(m * 0.25)), Math.round(m * 0.8)));
      if (m >= 10) push(vocabNew(Math.round(m * 0.2), 3));
      const t = LOS.learn.pickText(code, 'listening', { rnd });
      if (t && m >= 10) push({ id: U.uid('it'), type: 'listening', skill: 'listening', title: 'Listening', subtitle: `Guided: ${t.title}`, level: t.l, minutes: Math.round(m * 0.35), status: 'pending', reason: 'Input you can follow on the move', payload: { mode: 'guided', textId: t.id, short: m < 20 } });
      push(microItem(Math.max(2, m - U.sum(items.map((i) => i.minutes))), 'commute', U.clamp(Math.round(m * 0.5), 3, 8), 'Listen, repeat, recognise — shadowing builds pronunciation and fluency'));
    } else if (minutes <= 7 || study === 'break') {
      // 5 MINUTES: 2–3 reviews · 1–2 high-value new items · one retrieval · one very short production
      if (hasMemory) push(review(2, 3, 'Quick review'));
      push(vocabNew(1, hasMemory ? 1 : 2));
      push(microItem(1, 'retrieval', 2, 'One retrieval: recall without seeing the answer'));
      push(microItem(Math.max(1, minutes - U.sum(items.map((i) => i.minutes))), 'sentence', 1, 'One sentence of your own with what you know'));
    } else if (minutes <= 12) {
      // 10 minutes: vocabulary, grammar, mini dialogue
      push(hasMemory ? review(3, 8) : vocabNew(3, 3));
      const g = makeItem(ctx, 'grammar', 3, mode, rnd, 'One grammar step');
      if (g) { g.payload.count = 3; g.payload.learn = g.payload.learn && mode !== 'recovery'; push(g); }
      push(microItem(Math.max(3, minutes - 6), 'dialogue', 3, 'A short exchange using known language'));
    } else if (minutes <= 20) {
      // 15 MINUTES: review 2 · new input 5 · retrieval 4 · production 4
      const f = minutes / 15;
      const rv = hasMemory ? Math.max(2, Math.round(2 * f)) : 0;
      if (rv) push(review(rv, 6));
      push(vocabNew(Math.round(5 * f) + (rv ? 0 : 2), mode === 'recovery' ? 3 : 4));
      push(microItem(Math.round(4 * f), 'retrieval', 5, 'Retrieval: recall the new and recent language'));
      const rem = minutes - U.sum(items.map((i) => i.minutes));
      const pr = mode !== 'recovery' && ctx.th.speaking <= ctx.th.writing + 0.3 ? makeItem(ctx, 'speaking', rem, mode, rnd, 'Production: say it, at your speaking-ladder step') : null;
      push(pr && pr.type === 'speaking' ? pr : microItem(rem, 'application', 4, 'Production: use today’s language'));
    } else if (minutes <= 25) {
      // 20 minutes: review · new · controlled · grammar (or error clinic)
      const rv = hasMemory ? 5 : 0;
      if (rv) push(review(rv, 15));
      push(vocabNew(rv ? 5 : 7, newN));
      push(microItem(5, 'controlled', 8, 'Controlled practice of what you are learning'));
      push(grammarOrRemedy(ctx, Math.max(3, minutes - U.sum(items.map((i) => i.minutes))), mode, rnd, true));
    } else if (minutes <= 37) {
      // 30 MINUTES: spaced review 5 · new material 8 · controlled/guided practice 7 · production 10
      const f = minutes / 30;
      const rv = hasMemory ? Math.round(5 * f) : 0;
      if (rv) push(review(rv, 15));
      push(vocabNew(Math.round(4 * f) + (rv ? 0 : 3), newN));
      push(grammarOrRemedy(ctx, Math.round(4 * f) + (rv ? 0 : 2), mode, rnd, true));
      push(applicationItem(ctx, Math.round(7 * f), mode, rnd));
      push(productionItem(ctx, Math.max(6, minutes - U.sum(items.map((i) => i.minutes))), mode, rnd));
      challenge = challengeItem(ctx, mode, rnd);
    } else {
      // 45+ MINUTES (deep study): new material, deeper practice, input, speaking, writing, scenario simulation
      const rv = hasMemory ? 5 : 0;
      if (rv) push(review(rv, 15));
      push(vocabNew(rv ? 5 : 8, newN));
      push(grammarOrRemedy(ctx, 6, mode, rnd, true));
      push(microItem(5, 'controlled', 8, 'Controlled practice of what you are learning'));
      push(applicationItem(ctx, 6, mode, rnd));
      let rem = minutes - U.sum(items.map((i) => i.minutes));
      const w = skillWeights(ctx, mode);
      const input = (w.listening >= w.reading ? 'listening' : 'reading');
      const im = Math.min(12, Math.max(8, Math.round(rem * 0.4)));
      push(makeItem(ctx, input, im, mode, rnd, reasonFor(ctx, input, w)));
      rem = minutes - U.sum(items.map((i) => i.minutes));
      if (rem >= 8) { push(productionItem(ctx, Math.min(rem, 15), mode, rnd)); rem = minutes - U.sum(items.map((i) => i.minutes)); }
      if (rem >= 8) {
        const pool = {}; ['writing', 'speaking', 'think', 'listening', 'reading'].forEach((k) => { if (!items.some((i) => i.skill === k)) pool[k] = w[k]; });
        allocate(rem, pool, mode).forEach((b) => push(makeItem(ctx, b.skill, b.minutes, mode, rnd, reasonFor(ctx, b.skill, w))));
      }
      rem = minutes - U.sum(items.map((i) => i.minutes));
      if (rem > 0 && items.length) items[items.length - 1].minutes += rem;
      challenge = challengeItem(ctx, mode, rnd);
    }
    // "Why am I learning this?" — only where it adds relevance (goal-linked activities)
    items.forEach((it) => { const y = LOS.goals ? LOS.goals.why(code, it) : ''; if (y) it.why = y; });
    const main = items.filter((i) => i.type !== 'review' && i.type !== 'micro').sort((a, b) => b.minutes - a.minutes)[0] || items[0];
    return { date, code, minutes: U.sum(items.map((i) => i.minutes)), mode, study, items, challenge, focus: focusFrom(main, p), generatedAt: Date.now(), sig: opts.sig || '', extra: !!opts.extra, v: 3 };
  }

  /** The learner says "I have N minutes" (and optionally a study mode): today's plan is rebuilt around it.
   * Completed activities stay; only the pending ones are replaced. The chosen language gets the whole session. */
  function setSession(code, minutes, study) {
    const date = U.today();
    const day = LOS.store.day(date);
    day.session = { code, minutes, study: study || null };
    const lang = LG(code);
    const existing = lang.plans[date];
    const done = existing ? existing.items.filter((i) => i.status !== 'pending') : [];
    const mode = recoveryState(date).active ? 'recovery' : undefined;
    const plan = generateDailyPlan(code, date, minutes, { mode, study, salt: 'session' + Date.now(), sig: 'session' });
    plan.items = done.concat(plan.items);
    plan.chosen = { minutes, study: study || null };
    lang.plans[date] = plan;
    LOS.store.save();
    return plan;
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
        if (existing && !started && !existing.extra && !existing.chosen) delete lang.plans[date];
        else if (existing) out.push({ code, plan: existing });
        return;
      }
      if (existing && existing.chosen && !force) { out.push({ code, plan: existing }); return; }
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
    return plan ? { plan, item: plan.items.find((i) => i.id === itemId) || (plan.challenge && plan.challenge.id === itemId ? plan.challenge : undefined) } : {};
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
    const langs = split.map((x) => {
      const plan = generateDailyPlan(x.code, date, x.minutes, { mode: b.mode === 'recovery' ? 'recovery' : b.mode === 'mvs' ? 'mvs' : undefined });
      return { code: x.code, minutes: x.minutes, blocks: plan.items.map((i) => ({ skill: i.skill, type: i.type, minutes: i.minutes })) };
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
    STUDY_MODES, setSession, generateDailyPlan, ensureToday, completeItem, skipItem, swapItem, addExtraSession, forecast, generateWeeklyPlan, scheduleEntry,
  };
})();

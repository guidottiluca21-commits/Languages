/* PROGRESS — statistics, competence-based roadmap, target pace, weekly review. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const S = () => LOS.store.state;
  const LG = (c) => LOS.store.lang(c);

  function stats(code, from, to = U.today()) {
    const lang = LG(code);
    const ses = lang.sessions.filter((s) => s.date >= from && s.date <= to);
    const bySkill = {};
    ses.forEach((s) => (bySkill[s.skill] = (bySkill[s.skill] || 0) + s.minutes));
    const days = U.diffDays(from, to) + 1;
    const studied = new Set(ses.map((s) => s.date));
    const vocab = Object.values(lang.vocab);
    const reviews = ses.filter((s) => s.type === 'review' && s.score != null);
    const plans = Object.values(lang.plans).filter((p) => p.date >= from && p.date <= to);
    const planned = U.sum(plans.map((p) => U.sum(p.items.map((i) => i.minutes))));
    const doneMin = U.sum(plans.map((p) => U.sum(p.items.filter((i) => i.status === 'done').map((i) => i.minutes))));
    const items = [].concat(...plans.map((p) => p.items));
    return {
      from, to, days,
      minutes: U.sum(ses.map((s) => s.minutes)),
      bySkill,
      listening: bySkill.listening || 0,
      sessions: ses.length,
      wordsIntroduced: vocab.filter((v) => v.introduced >= from && v.introduced <= to && !v.assumed).length,
      wordsStable: vocab.filter((v) => v.stableAt && v.stableAt >= from && v.stableAt <= to).length,
      grammarMastered: Object.values(lang.grammar).filter((g) => g.masteredAt && g.masteredAt >= from && g.masteredAt <= to).length,
      writings: lang.writings.filter((w) => w.date >= from && w.date <= to).length,
      speakings: lang.speakings.filter((w) => w.date >= from && w.date <= to).length,
      listeningSessions: ses.filter((s) => s.skill === 'listening').length,
      reviewAcc: reviews.length ? U.avg(reviews.map((r) => r.score)) : null,
      daysStudied: studied.size,
      consistency: days ? studied.size / days : 0,
      planned, done: doneMin,
      realism: planned ? doneMin / planned : null,
      skipped: items.filter((i) => i.status === 'skipped').length,
      missed: items.filter((i) => i.status === 'missed').length,
      errors: LOS.learn.errorStats(code, days).byLabel,
    };
  }

  /** Competence-based readiness for completing the current CEFR band. */
  function roadmap(code) {
    const lang = LG(code);
    const p = LOS.lang.get(code);
    const overall = LOS.skills.calculateLevel(lang);
    if (!overall) return null;
    const B = overall.band;
    const lvl = U.LEVELS[B];
    const th = LOS.skills.thetas(lang);
    const skillPart = U.avg(U.SKILLS.map((s) => U.clamp((th[s] == null ? overall.theta : th[s]) - B, 0, 1)));
    const gTopics = p.grammar.filter((t) => t.l === lvl);
    const gDone = gTopics.filter((t) => ['familiar', 'mastered'].includes(LOS.learn.topicStatus(code, t.id)));
    const vItems = LOS.learn.vocabItems(code).filter((v) => v.l === lvl);
    const vDone = vItems.filter((v) => { const s = lang.vocab[v.id]; return s && s.stage >= 3; });
    const prodDone = lang.writings.filter((w) => U.levelIndex(w.level) >= B && (w.overall || 0) >= 3.5).length + lang.speakings.filter((w) => U.levelIndex(w.level) >= B && (w.overall || 0) >= 3.5).length;
    const comps = [
      { key: 'skills', label: 'Skill profile', weight: 0.35, value: skillPart, detail: `${U.SKILLS.filter((s) => th[s] != null && th[s] >= B + 1).length}/6 skills already at ${U.LEVELS[Math.min(5, B + 1)]}` },
      { key: 'grammar', label: `${lvl} grammar`, weight: 0.25, value: gTopics.length ? gDone.length / gTopics.length : 1, detail: `${gDone.length}/${gTopics.length} topics familiar or mastered` },
      { key: 'vocabulary', label: `${lvl} vocabulary`, weight: 0.2, value: vItems.length ? vDone.length / vItems.length : 1, detail: `${vDone.length}/${vItems.length} items at production level` },
      { key: 'production', label: 'Production at level', weight: 0.2, value: Math.min(1, prodDone / 6), detail: `${prodDone}/6 writing or speaking tasks at ${lvl}+ scored ≥ 3.5` },
    ];
    const readiness = U.sum(comps.map((c) => c.value * c.weight));
    const next = [];
    const sortedComps = comps.slice().sort((a, b) => a.value - b.value);
    sortedComps.slice(0, 3).forEach((c) => {
      if (c.value >= 0.98) return;
      if (c.key === 'grammar') { const todo = gTopics.filter((t) => !gDone.includes(t)).slice(0, 2).map((t) => t.title); if (todo.length) next.push(`Grammar: work on ${todo.join(' and ')}.`); }
      if (c.key === 'vocabulary') next.push(`Vocabulary: bring ${Math.max(1, Math.ceil(vItems.length * 0.8) - vDone.length)} more ${lvl} items to production level.`);
      if (c.key === 'skills') { const lag = U.SKILLS.filter((s) => th[s] != null && th[s] < B + 0.5).sort((a, b) => th[a] - th[b]).slice(0, 2); if (lag.length) next.push(`Skills: raise ${lag.map((s) => U.SKILL_LABEL[s].toLowerCase()).join(' and ')} (currently ${lag.map((s) => U.thetaInfo(th[s]).sub).join(', ')}).`); }
      if (c.key === 'production') next.push(`Production: complete ${Math.max(1, 6 - prodDone)} more ${lvl}-level writing or speaking tasks with good scores.`);
    });
    const milestones = U.LEVELS.map((l, i) => ({ level: l, state: i < B ? 'done' : i === B ? 'current' : i === B + 1 ? 'next' : 'future' }));
    return { overall, band: B, level: lvl, nextLevel: U.LEVELS[Math.min(5, B + 1)], comps, readiness, next, milestones, target: lang.targetLevel };
  }

  /** Is the learner on pace for their target date? Uses the last 28 days of skill history. */
  function pace(code) {
    const lang = LG(code);
    if (!lang.targetDate) return null;
    const overall = LOS.skills.calculateLevel(lang);
    if (!overall) return null;
    const goal = U.levelIndex(lang.targetLevel) + 0.5;
    const weeksLeft = Math.max(0.5, U.diffDays(U.today(), lang.targetDate) / 7);
    const need = Math.max(0, goal - overall.theta) / weeksLeft;
    const ago = U.addDays(U.today(), -28);
    const past = U.SKILLS.map((s) => LOS.skills.thetaAt(lang, s, ago)).filter((v) => v != null);
    const trend = past.length ? Math.max(0, (U.avg(U.SKILLS.map((s) => LOS.skills.theta(lang, s)).filter((v) => v != null)) - U.avg(past)) / 4) : null;
    return { need: U.round(need, 3), trend: trend == null ? null : U.round(trend, 3), weeksLeft: Math.round(weeksLeft), status: trend == null ? 'unknown' : trend >= need ? 'on track' : trend >= need * 0.6 ? 'slightly behind' : 'behind' };
  }

  function weekStartOf(d = U.today()) { return U.weekStart(d, S().settings.weekStart); }
  function weeklyReviewDue(code) {
    const lang = LG(code);
    const ws = weekStartOf();
    const last = lang.reviews[lang.reviews.length - 1];
    if (last && last.weekStart === ws) return false;
    const hasActivity = lang.sessions.some((s) => s.date >= U.addDays(ws, -7));
    return hasActivity && (U.weekday(U.today()) === Number(S().settings.reviewDay) || (last && U.diffDays(last.date, U.today()) > 8));
  }

  function saveWeeklyReview(code, data) {
    const st = S();
    const lang = LG(code);
    const to = U.today();
    const from = U.addDays(to, -6);
    const s = stats(code, from, to);
    let lf = st.meta.loadFactor || 1;
    if (data.workload === 'too much' || (s.realism != null && s.realism < 0.6)) lf = Math.max(0.7, lf - 0.1);
    else if (data.workload === 'too little' && (s.realism == null || s.realism > 0.85)) lf = Math.min(1.25, lf + 0.1);
    else lf = lf + (1 - lf) * 0.3;
    st.meta.loadFactor = U.round(lf, 2);
    const wk = LOS.skills.weakest(lang);
    const focus = data.focus || (wk && wk.skill);
    if (focus) lang.weekFocus = { skill: focus, until: U.addDays(to, 7) };
    const entry = { date: to, weekStart: weekStartOf(), stats: { minutes: s.minutes, listening: s.listening, wordsStable: s.wordsStable, grammarMastered: s.grammarMastered, consistency: s.consistency, realism: s.realism }, answers: data.answers || {}, workload: data.workload, focus, loadFactor: st.meta.loadFactor };
    lang.reviews.push(entry);
    LOS.store.save(true);
    return { entry, next: LOS.planner.generateWeeklyPlan(U.addDays(weekStartOf(), 7)) };
  }

  LOS.progress = { stats, roadmap, pace, weeklyReviewDue, saveWeeklyReview, weekStartOf };
})();

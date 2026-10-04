/* SKILL MODEL — each skill has an ability estimate theta on a 0–6 CEFR scale
 * (A1 = 0–1, A2 = 1–2, … C2 = 5–6), updated with a Rasch-style rule:
 *   p = P(success | theta, item difficulty b);  theta += k · (score − p)
 * This makes progress evidence-based: hard items answered well move you up,
 * easy items missed move you down, and expected results barely move anything. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const SKILLS = U.SKILLS;

  const prob = (theta, b) => 1 / (1 + Math.exp(-1.7 * (theta - b)));

  const skills = (LOS.skills = {
    SKILLS,
    prob,
    get(L, s) { return (L.skills[s] = L.skills[s] || { theta: null, n: 0, hist: [], conf: 'low' }); },
    theta(L, s) { const t = L.skills[s] && L.skills[s].theta; return t == null ? null : t; },
    thetas(L) { const o = {}; SKILLS.forEach((s) => (o[s] = skills.theta(L, s))); return o; },

    set(L, s, theta, conf) {
      const sk = skills.get(L, s);
      sk.theta = U.clamp(theta, 0, 6);
      if (conf) sk.conf = conf;
      skills.snapshot(L, s);
      // initialise band memory without generating "gains"
      if (L.bands[s] == null) L.bands[s] = U.thetaInfo(sk.theta).band;
    },

    /** Evidence update. b = item difficulty (theta scale), score 0–1, k = learning rate. */
    update(L, s, b, score, k = 0.04) {
      const sk = skills.get(L, s);
      if (sk.theta == null) sk.theta = b; // first evidence anchors the estimate
      const p = prob(sk.theta, b);
      sk.theta = U.clamp(sk.theta + k * (score - p), 0, 6);
      sk.n = (sk.n || 0) + 1;
      if (sk.n > 25 && sk.conf === 'low') sk.conf = 'medium';
      if (sk.n > 120) sk.conf = 'high';
      skills.snapshot(L, s);
      skills.checkGain(L, s);
      return sk.theta;
    },

    /** Move an estimate part of the way toward a measured level (used for writing/speaking analyses). */
    nudge(L, s, target, weight = 0.15) {
      const sk = skills.get(L, s);
      if (sk.theta == null) sk.theta = target;
      else sk.theta = U.clamp(sk.theta + weight * (target - sk.theta), 0, 6);
      sk.n = (sk.n || 0) + 1;
      skills.snapshot(L, s);
      skills.checkGain(L, s);
      return sk.theta;
    },

    snapshot(L, s) {
      const sk = skills.get(L, s);
      const d = U.today();
      sk.hist = sk.hist || [];
      const last = sk.hist[sk.hist.length - 1];
      const v = U.round(sk.theta, 3);
      if (last && last[0] === d) last[1] = v; else sk.hist.push([d, v]);
      if (sk.hist.length > 400) sk.hist = sk.hist.slice(-400);
    },

    /** Records a concrete "you can now…" gain when a skill crosses into a new CEFR band. */
    checkGain(L, s) {
      const t = skills.theta(L, s);
      if (t == null) return;
      const band = U.thetaInfo(t).band;
      if (L.bands[s] == null) { L.bands[s] = band; return; }
      if (band > L.bands[s]) {
        const lvl = U.LEVELS[band];
        const txt = (LOS.shared.CANDO[s] && LOS.shared.CANDO[s][lvl] && LOS.shared.CANDO[s][lvl][0]) || `${U.SKILL_LABEL[s]} reached ${lvl}.`;
        L.gains.unshift({ date: U.today(), skill: s, level: lvl, text: txt, kind: 'level' });
        L.bands[s] = band;
        LOS.bus.emit('gain', { lang: L.code, skill: s, level: lvl, text: txt });
      }
    },

    /** calculateLevel(): overall CEFR level derived from the skill profile, not an arithmetic mean.
     * Rule: the highest band B such that at least two-thirds of the measured skills are ≥ B
     * and no skill is more than one band below B. Theta is the mean, clamped into that band. */
    calculateLevel(L) {
      const vals = SKILLS.map((s) => skills.theta(L, s)).filter((v) => v != null);
      if (!vals.length) return null;
      const need = Math.ceil((vals.length * 2) / 3);
      const min = Math.min(...vals);
      let band = 0;
      for (let b = 5; b >= 0; b--) {
        const atOrAbove = vals.filter((v) => v >= b).length;
        if (atOrAbove >= need && min >= b - 1) { band = b; break; }
      }
      const mean = U.avg(vals);
      const theta = U.clamp(mean, band, band + 0.99);
      return Object.assign(U.thetaInfo(theta), { spread: U.round(Math.max(...vals) - min, 2) });
    },

    weakest(L) {
      let w = null;
      SKILLS.forEach((s) => { const t = skills.theta(L, s); if (t != null && (w == null || t < w.theta)) w = { skill: s, theta: t }; });
      return w;
    },
    strongest(L) {
      let w = null;
      SKILLS.forEach((s) => { const t = skills.theta(L, s); if (t != null && (w == null || t > w.theta)) w = { skill: s, theta: t }; });
      return w;
    },
    /** Value of theta some days ago (for trends). */
    thetaAt(L, s, date) {
      const h = (L.skills[s] && L.skills[s].hist) || [];
      let v = null;
      for (const [d, t] of h) { if (d <= date) v = t; else break; }
      return v;
    },
  });
})();

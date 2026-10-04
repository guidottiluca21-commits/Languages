/* SPACED REPETITION ENGINE (SM-2 family, adapted).
 * Every reviewable item (grammar topic, vocabulary item, error card) carries:
 *   mastery 0–100, ease, interval (days), reps, lapses, streak (consecutive correct),
 *   errStreak (consecutive errors), last, due, hist.
 * Grades: 0 Again · 1 Hard · 2 Good · 3 Easy. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const GRADES = ['Again', 'Hard', 'Good', 'Easy'];

  const srs = (LOS.srs = {
    GRADES,
    create(extra) {
      return Object.assign({ mastery: 0, ease: 2.5, interval: 0, reps: 0, lapses: 0, streak: 0, errStreak: 0, last: null, due: null, hist: [] }, extra || {});
    },

    /** Apply a grade. `today` is a date string. Returns the item (mutated). */
    grade(item, g, today = U.today(), opts = {}) {
      g = U.clamp(Math.round(g), 0, 3);
      const prevInterval = item.interval || 0;
      item.reps = (item.reps || 0) + 1;

      if (g === 0) {
        item.lapses = (item.lapses || 0) + 1;
        item.streak = 0;
        item.errStreak = (item.errStreak || 0) + 1;
        item.ease = Math.max(1.3, (item.ease || 2.5) - 0.2);
        item.interval = 1; // see it again tomorrow (the runner also re-queues it within the session)
        item.mastery = Math.max(0, (item.mastery || 0) - 18 - 4 * Math.min(3, item.errStreak - 1));
      } else {
        item.errStreak = 0;
        item.streak = (item.streak || 0) + 1;
        if (g === 1) {
          item.ease = Math.max(1.3, (item.ease || 2.5) - 0.15);
          item.interval = Math.max(1, Math.round(prevInterval * 1.2));
          item.mastery = Math.min(100, (item.mastery || 0) + 4);
        } else if (g === 2) {
          item.interval = prevInterval < 1 ? 1 : prevInterval < 3 ? 3 : Math.round(prevInterval * item.ease);
          item.mastery = Math.min(100, (item.mastery || 0) + (100 - (item.mastery || 0)) * 0.18 + 2);
        } else {
          item.ease = Math.min(3.2, (item.ease || 2.5) + 0.15);
          item.interval = prevInterval < 1 ? 3 : Math.round(Math.max(prevInterval * item.ease * 1.3, prevInterval + 2));
          item.mastery = Math.min(100, (item.mastery || 0) + (100 - (item.mastery || 0)) * 0.28 + 3);
        }
        // Items with a history of lapses are kept on a shorter leash until they prove stable.
        if ((item.lapses || 0) >= 3 && item.streak < 3) item.interval = Math.min(item.interval, 7);
      }
      // Optional cap (e.g. the planner keeps new material close during recovery).
      if (opts.maxInterval) item.interval = Math.min(item.interval, opts.maxInterval);
      item.interval = Math.min(item.interval, 365);
      // Light fuzz so reviews don't all pile up on the same day.
      if (item.interval > 4) item.interval = Math.round(item.interval * (0.95 + Math.random() * 0.1));
      item.last = today;
      item.due = U.addDays(today, item.interval);
      item.hist = (item.hist || []).concat([[today, g]]).slice(-20);
      return item;
    },

    isDue(item, date = U.today()) { return !!(item && item.due && item.due <= date); },
    overdueDays(item, date = U.today()) { return item && item.due ? Math.max(0, U.diffDays(item.due, date)) : 0; },

    /** Mastery adjusted for forgetting: decays while an item is overdue. */
    effective(item, date = U.today()) {
      if (!item || !item.last) return 0;
      const od = srs.overdueDays(item, date);
      if (!od) return item.mastery;
      const decay = Math.max(0.55, 1 - od / (item.interval * 3 + 4));
      return item.mastery * decay;
    },

    /** Priority for review queues: more overdue relative to interval and weaker items first. */
    priority(item, date = U.today()) {
      const od = srs.overdueDays(item, date);
      return (od + 1) / ((item.interval || 1) + 1) + (100 - (item.mastery || 0)) / 100 + (item.errStreak || 0) * 0.5;
    },

    /** Grammar-style status labels. */
    status(item, date = U.today()) {
      if (!item || !item.last) return 'new';
      const m = srs.effective(item, date);
      if (m >= 85 && item.interval >= 14) return 'mastered';
      if (m >= 60) return 'familiar';
      if (m >= 20) return 'learning';
      return 'new';
    },
    STATUS_LABEL: { new: 'Not learned', learning: 'Learning', familiar: 'Familiar', mastered: 'Mastered' },

    /** Convert a session accuracy (0–1) and speed hint into a grade. */
    gradeFromAccuracy(acc, opts = {}) {
      if (acc >= 0.9 && !opts.slow) return 3;
      if (acc >= 0.7) return 2;
      if (acc >= 0.5) return 1;
      return 0;
    },
  });
})();

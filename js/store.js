/* DATA LAYER — single source of truth persisted to localStorage.
 * Shape is versioned so imports from older backups can be migrated. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const KEY = 'los:v1';
  const VERSION = 1;

  function defaultState() {
    return {
      version: VERSION,
      createdAt: new Date().toISOString(),
      settings: {
        theme: 'system', // light | dark | system
        activeLang: null,
        onboarded: false,
        weekStart: 1, // Monday
        reviewDay: 0, // weekly review on Sunday
        ai: { provider: 'local', endpoint: '' },
        tts: {}, // per language: { voice, rate }
        langWeights: {}, // per language share of the daily budget
        restDay: null, // optional automatic weekly rest day (0–6)
      },
      profile: { name: '', field: '', specialty: '', interests: [], difficulty: 'balanced', studyTime: 'evening' },
      time: { min: 15, target: 40, max: 90 },
      rules: { heavy: [10, 20], normal: [20, 40], free: [45, 90], longShiftHours: 10 },
      schedule: {
        weekly: {
          1: { type: 'work', start: '08:00', end: '17:00' },
          2: { type: 'work', start: '08:00', end: '17:00' },
          3: { type: 'work', start: '08:00', end: '17:00' },
          4: { type: 'work', start: '08:00', end: '17:00' },
          5: { type: 'work', start: '08:00', end: '17:00' },
          6: { type: 'off' },
          0: { type: 'off' },
        },
        overrides: {}, // 'YYYY-MM-DD' → { type, start, end, note }
      },
      days: {}, // 'YYYY-MM-DD' → { lowEnergy, rest }
      meta: { loadFactor: 1, lastOpen: null, lastReviewPrompt: null },
      langs: {},
    };
  }

  function defaultLang(code) {
    return {
      code,
      enabled: true,
      onboarded: false,
      assessed: false,
      estimate: null, // self-estimated level index
      targetLevel: 'C2',
      targetDate: '',
      goals: [],
      skills: {}, // skill → { theta, n, hist: [[date, theta]], conf }
      assessments: [], // history of placement results
      grammar: {}, // topicId → SRS state + extras
      vocab: {}, // vocabId → SRS state + stage
      custom: [], // user-added vocabulary items (full objects)
      errors: [], // error log entries
      errorCards: {}, // errorId → SRS state
      sessions: [], // completed activities
      listening: [], // external listening log
      writings: [],
      speakings: [],
      plans: {}, // date → daily plan
      reviews: [], // weekly reviews
      gains: [], // competence gains ("what you can do now")
      bands: {}, // skill → highest band reached (for gains)
      xp: 0,
      achievements: [],
      recentSkips: [], // [{date, skill}]
      weekFocus: null, // { skill, until }
      seen: { texts: {}, prompts: {}, think: {}, scenarios: {} },
    };
  }

  let state = null;
  let saveTimer = null;

  function merge(target, src) {
    // fill missing keys of target from src (deep for plain objects)
    Object.keys(src).forEach((k) => {
      if (target[k] === undefined) target[k] = JSON.parse(JSON.stringify(src[k]));
      else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) merge(target[k], src[k]);
    });
    return target;
  }

  function migrate(s) {
    s = s && typeof s === 'object' ? s : {};
    merge(s, defaultState());
    Object.keys(s.langs || {}).forEach((code) => merge(s.langs[code], defaultLang(code)));
    s.version = VERSION;
    return s;
  }

  const store = (LOS.store = {
    KEY,
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        state = migrate(raw ? JSON.parse(raw) : null);
      } catch (e) {
        console.warn('Could not read saved data; starting fresh.', e);
        state = defaultState();
      }
      return state;
    },
    get state() { return state; },
    save(immediate) {
      clearTimeout(saveTimer);
      const write = () => {
        try {
          localStorage.setItem(KEY, JSON.stringify(state));
          LOS.bus.emit('saved');
        } catch (e) {
          console.error(e);
          LOS.bus.emit('save-error', e);
        }
      };
      if (immediate) write(); else saveTimer = setTimeout(write, 250);
    },
    /** Active language code (falls back to the first enabled language). */
    active() {
      const s = state.settings;
      if (s.activeLang && state.langs[s.activeLang]) return s.activeLang;
      const first = Object.keys(state.langs)[0];
      return first || null;
    },
    setActive(code) { state.settings.activeLang = code; this.ensureLang(code); this.save(); LOS.bus.emit('lang-changed', code); },
    ensureLang(code) {
      if (!state.langs[code]) {
        state.langs[code] = defaultLang(code);
        if (state.settings.langWeights[code] == null) state.settings.langWeights[code] = 50;
      }
      return state.langs[code];
    },
    lang(code) { code = code || this.active(); return code ? this.ensureLang(code) : null; },
    /** Languages the user is actively studying (onboarded). */
    studying() { return Object.keys(state.langs).filter((c) => state.langs[c].enabled && state.langs[c].onboarded && LOS.lang.get(c)); },
    day(date) { return (state.days[date] = state.days[date] || {}); },

    exportJSON() {
      return JSON.stringify({ app: 'lingua-os', exportedAt: new Date().toISOString(), state }, null, 2);
    },
    importJSON(text) {
      const data = JSON.parse(text);
      const incoming = data && data.state ? data.state : data;
      if (!incoming || typeof incoming !== 'object' || !incoming.langs || !incoming.settings) throw new Error('This file is not a Lingua OS backup.');
      state = migrate(incoming);
      this.save(true);
      LOS.bus.emit('imported');
      return state;
    },
    reset() {
      localStorage.removeItem(KEY);
      state = defaultState();
      this.save(true);
    },
    defaultLang,
  });

  window.addEventListener('beforeunload', () => { if (state) try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && state) store.save(true); });
})();

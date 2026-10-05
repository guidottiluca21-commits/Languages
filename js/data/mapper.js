/* MAPPER — converts the in-memory app state ⇄ normalized database rows.
 * toRows(state, uid)  → { table: [row, …] }   (what the database should contain)
 * fromRows(rows)      → state                  (rebuild the app state from the database)
 * The conversion is lossless for everything the app uses; values are sanitized so that a row
 * always satisfies the CHECK constraints in supabase-schema.sql. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;

  /* Order matters: parents before children on upsert (reverse on delete). */
  const SPEEDS = ['slow', 'moderate', 'normal', 'fast'];
  const TABLES = [
    { name: 'profiles', key: ['user_id'], conflict: 'user_id' },
    { name: 'user_settings', key: ['user_id'], conflict: 'user_id' },
    { name: 'language_profiles', key: ['language_code'], conflict: 'user_id,language_code' },
    { name: 'vocabulary', key: ['language_code', 'item_key'], conflict: 'user_id,language_code,item_key' },
    { name: 'vocabulary_reviews', key: ['id'], conflict: 'id', appendOnly: true, writeOnly: true },
    { name: 'grammar_progress', key: ['language_code', 'topic'], conflict: 'user_id,language_code,topic' },
    { name: 'work_schedule', key: ['date'], conflict: 'user_id,date' },
    { name: 'study_sessions', key: ['client_id'], conflict: 'user_id,client_id', appendOnly: true },
    { name: 'errors', key: ['client_id'], conflict: 'user_id,client_id' },
    { name: 'listening_content', key: ['client_id'], conflict: 'user_id,client_id' },
    { name: 'productions', key: ['client_id'], conflict: 'user_id,client_id' },
    { name: 'daily_plans', key: ['language_code', 'plan_date'], conflict: 'user_id,language_code,plan_date' },
    { name: 'assessments', key: ['client_id'], conflict: 'user_id,client_id' },
    { name: 'weekly_reviews', key: ['client_id'], conflict: 'user_id,client_id' },
  ];
  const BY_NAME = Object.fromEntries(TABLES.map((t) => [t.name, t]));
  const keyOf = (table, row) => BY_NAME[table].key.map((k) => String(row[k])).join('|');

  /* ---------------- sanitizers ---------------- */
  const CEFR = new Set(U.LEVELS);
  const lvl = (v) => (v && CEFR.has(String(v).slice(0, 2)) ? String(v).slice(0, 2) : null);
  const lvlSub = (v) => (v && /^(A1|A2|B1|B2|C1|C2)(\.[12])?$/.test(v) ? v : null);
  const txt = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));
  const num = (v, lo, hi, d = 2) => (v == null || isNaN(v) ? null : U.round(U.clamp(+v, lo, hi), d));
  const int = (v, lo, hi) => (v == null || isNaN(v) ? null : Math.round(U.clamp(+v, lo, hi)));
  const date = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const iso = (ts) => { const d = new Date(ts || Date.now()); return isNaN(d) ? new Date().toISOString() : d.toISOString(); };
  const url = (v) => { v = String(v || '').trim(); if (!v) return null; if (!/^https?:\/\//i.test(v)) v = 'https://' + v; return v.slice(0, 2000); };
  const time = (v) => (v && /^\d{1,2}:\d{2}/.test(v) ? v.slice(0, 5) : null);
  const omit = (o, keys) => { const r = {}; Object.keys(o || {}).forEach((k) => { if (!keys.includes(k) && o[k] !== undefined) r[k] = o[k]; }); return r; };
  const cid = (o, prefix) => String(o.id || prefix + '-' + U.hash(JSON.stringify(o)).toString(36)).slice(0, 64);
  const SCHED_TYPES = new Set(['work', 'night', 'off', 'vacation', 'recovery']);

  function workloadOf(o, rules) {
    if (!o || !o.type) return null;
    if (o.type === 'night' || o.type === 'recovery') return 'heavy';
    if (o.type === 'work') return U.hoursBetween(o.start, o.end) >= ((rules && rules.longShiftHours) || 10) ? 'heavy' : 'normal';
    return 'free';
  }

  /* ---------------- state → rows ---------------- */
  function toRows(st, uid) {
    const out = {};
    TABLES.forEach((t) => (out[t.name] = []));
    const push = (t, row) => out[t].push(Object.assign({ user_id: uid }, row));

    const prof = st.profile || {};
    push('profiles', { display_name: txt(prof.name, 80), native_language: txt(prof.native || 'it', 10), data: omit(prof, ['name', 'native']) });

    const tm = st.time || {};
    const [mn, tg, mx] = [int(tm.min, 0, 600) || 0, int(tm.target, 0, 600) || 0, int(tm.max, 0, 600) || 0].sort((a, b) => a - b);
    const set = st.settings || {};
    push('user_settings', {
      daily_minimum: mn, daily_target: tg, daily_maximum: mx,
      preferred_language: LOS.lang.get(set.activeLang) ? set.activeLang : null,
      dark_mode: ['light', 'dark', 'system'].includes(set.theme) ? set.theme : 'system',
      notifications_enabled: !!set.notifications,
      data: { settings: omit(set, ['theme', 'activeLang', 'notifications']), rules: st.rules, weekly: (st.schedule || {}).weekly, meta: st.meta },
    });

    // schedule overrides + day flags
    const ov = (st.schedule || {}).overrides || {};
    const days = st.days || {};
    const dates = new Set(Object.keys(ov).concat(Object.keys(days).filter((d) => days[d] && (days[d].rest || days[d].lowEnergy))));
    [...dates].sort().forEach((d) => {
      if (!date(d)) return;
      const o = ov[d];
      const okType = o && SCHED_TYPES.has(o.type) ? o.type : null;
      push('work_schedule', {
        date: d, type: okType, start_time: okType ? time(o.start) : null, end_time: okType ? time(o.end) : null,
        workload: okType ? workloadOf(o, st.rules) : null, rest: !!(days[d] && days[d].rest), low_energy: !!(days[d] && days[d].lowEnergy), notes: o ? txt(o.note, 500) : null,
      });
    });

    Object.keys(st.langs || {}).forEach((code) => {
      if (!LOS.lang.get(code)) return;
      const L = st.langs[code];
      const pack = LOS.lang.get(code);
      const th = {};
      U.SKILLS.forEach((s) => (th[s] = L.skills && L.skills[s] ? L.skills[s].theta : null));
      let overall = null;
      try { overall = LOS.skills.calculateLevel(L); } catch (e) { overall = null; }
      const lastA = (L.assessments || [])[(L.assessments || []).length - 1];
      push('language_profiles', {
        language_code: code, current_level: overall ? lvlSub(overall.sub) : null, target_level: lvl(L.targetLevel) || 'C2',
        grammar_level: num(th.grammar, 0, 6), vocabulary_level: num(th.vocabulary, 0, 6), reading_level: num(th.reading, 0, 6),
        listening_level: num(th.listening, 0, 6), writing_level: num(th.writing, 0, 6), speaking_level: num(th.speaking, 0, 6),
        fluency_level: lastA && lastA.sub && lastA.sub.fluency != null ? num(lastA.sub.fluency * 6, 0, 6) : null,
        onboarded: !!L.onboarded, assessed: !!L.assessed, enabled: L.enabled !== false, goals: (L.goals || []).map(String), target_date: date(L.targetDate),
        data: omit(L, ['code', 'enabled', 'onboarded', 'assessed', 'targetLevel', 'targetDate', 'goals', 'assessments', 'grammar', 'vocab', 'custom', 'errors', 'errorCards', 'sessions', 'listening', 'writings', 'speakings', 'plans', 'reviews', 'reviewLog', 'assessDraft']),
      });

      // vocabulary: items being learned + the user's own items
      const custom = Object.fromEntries((L.custom || []).map((c) => [c.id, c]));
      const keys = new Set(Object.keys(L.vocab || {}).concat(Object.keys(custom)));
      keys.forEach((k) => {
        const item = custom[k] || pack.index.vocab[k];
        const s = (L.vocab || {})[k];
        if (!item && !s) return;
        const c = !!custom[k];
        push('vocabulary', {
          language_code: code, item_key: String(k).slice(0, 200), word: txt(item ? item.w : k, 200) || '?',
          translation: txt(item && item.tr, 500), definition: txt(item && item.def, 1000), example: txt(item && item.ex, 1000),
          part_of_speech: txt(item && item.pos, 60), register: txt(item && item.reg, 30), cefr_level: lvl(item && item.l),
          kind: txt(item && item.k, 30), domain: txt(item && item.d, 30), is_custom: c,
          stage: s ? int(s.stage || 0, 0, 4) : null, mastery: s ? num(s.mastery || 0, 0, 100) : null, ease_factor: s ? num(s.ease || 2.5, 1, 5) : null,
          interval: s ? int(s.interval || 0, 0, 100000) : null, next_review: s ? date(s.due) : null, last_review: s ? date(s.last) : null,
          data: { srs: s ? omit(s, ['stage', 'mastery', 'ease', 'interval', 'due', 'last']) : null, custom: c ? omit(item, ['id', 'w', 'tr', 'def', 'ex', 'pos', 'reg', 'l', 'k', 'd', 'custom']) : null },
        });
      });
      (L.reviewLog || []).forEach((r) => push('vocabulary_reviews', { id: r.id, language_code: code, item_key: String(r.k).slice(0, 200), rating: int(r.r, 0, 3), reviewed_at: iso(r.at) }));

      Object.keys(L.grammar || {}).forEach((topic) => {
        const g = L.grammar[topic];
        const t = pack.index.grammar[topic];
        push('grammar_progress', {
          language_code: code, topic: topic.slice(0, 120), cefr_level: lvl(t && t.l), mastery: num(g.mastery || 0, 0, 100), ease_factor: num(g.ease || 2.5, 1, 5),
          interval: int(g.interval || 0, 0, 100000), difficulty: int(g.d || 1, 1, 3), last_review: date(g.last), next_review: date(g.due), notes: txt(g.notes, 2000),
          data: omit(g, ['mastery', 'ease', 'interval', 'd', 'last', 'due', 'notes']),
        });
      });

      (L.sessions || []).forEach((s) => push('study_sessions', {
        client_id: cid(s, 'ses'), language_code: code, activity_type: txt(s.type || 'practice', 30), skill: txt(s.skill, 30), title: txt(s.title, 200),
        duration_minutes: int(s.minutes || 0, 0, 600), score: s.score == null ? null : num(s.score, 0, 1, 3), session_date: date(s.date) || U.today(), completed_at: iso(s.ts),
        data: omit(s, ['id', 'type', 'skill', 'title', 'minutes', 'score', 'date', 'ts']),
      }));

      (L.errors || []).forEach((e) => push('errors', {
        client_id: cid(e, 'err'), language_code: code, category: txt(e.cat || 'grammar', 30), label: txt(e.label, 120), source: txt(e.src, 30),
        original: txt(e.wrong, 2000), correction: txt(e.right, 2000), explanation: txt(e.note, 2000), improved_version: txt(e.natural, 2000), topic: txt(e.topic, 120),
        occurrences: int(e.count || 1, 1, 100000), resolved: !!e.resolved, error_date: date(e.date) || U.today(), created_at: iso(e.ts),
        card: (L.errorCards || {})[e.id] || null, data: omit(e, ['id', 'cat', 'label', 'src', 'wrong', 'right', 'note', 'natural', 'topic', 'count', 'resolved', 'date', 'ts']),
      }));

      (L.listening || []).forEach((x) => push('listening_content', {
        client_id: cid(x, 'lis'), language_code: code, title: txt(x.title, 300), url: url(x.url), source: txt(x.source || 'external', 60), cefr_level: lvl(x.level),
        duration: int(x.minutes || 0, 0, 600), completed: x.completed !== false, comprehension: int(x.comprehension, 0, 100), difficulty: int(x.difficulty || 3, 1, 5),
        notes: txt(x.notes, 5000), listened_on: date(x.date),
        topic: txt(x.topic, 80) || null, accent: txt(x.accent, 60) || null, speed: SPEEDS.includes(x.speed) ? x.speed : null, has_transcript: typeof x.transcript === 'boolean' ? x.transcript : null,
        data: omit(x, ['id', 'title', 'url', 'source', 'level', 'minutes', 'completed', 'comprehension', 'difficulty', 'notes', 'date', 'topic', 'accent', 'speed', 'transcript']),
      }));

      (L.writings || []).forEach((w) => push('productions', {
        client_id: cid(w, 'wri'), language_code: code, kind: 'writing', prompt_id: txt(w.promptId, 120), title: txt(w.title, 200), cefr_level: lvl(w.level),
        content: txt(w.text, 20000), scores: w.scores || null, overall: num(w.overall, 0, 5), est_level: num(w.estTheta, 0, 6), produced_on: date(w.date) || U.today(),
        data: omit(w, ['id', 'promptId', 'title', 'level', 'text', 'scores', 'overall', 'estTheta', 'date']),
      }));
      (L.speakings || []).forEach((w) => push('productions', {
        client_id: cid(w, 'spk'), language_code: code, kind: 'speaking', prompt_id: txt(w.taskId, 120), title: txt(w.title, 200), cefr_level: lvl(w.level),
        content: txt(w.transcript, 20000), scores: w.ratings || null, overall: num(w.overall, 0, 5), est_level: null, produced_on: date(w.date) || U.today(),
        data: omit(w, ['id', 'taskId', 'title', 'level', 'transcript', 'ratings', 'overall', 'date']),
      }));

      Object.keys(L.plans || {}).forEach((d) => { if (date(d)) push('daily_plans', { language_code: code, plan_date: d, data: L.plans[d] }); });
      (L.assessments || []).forEach((a) => push('assessments', { client_id: cid(a, 'asm'), language_code: code, taken_on: date(a.date) || U.today(), overall_level: a.overall ? lvlSub(a.overall.sub) : null, result: a }));
      (L.reviews || []).forEach((r) => push('weekly_reviews', { client_id: cid(r, 'rev'), language_code: code, week_start: date(r.weekStart) || date(r.date) || U.today(), review: r }));
    });
    return out;
  }

  /* ---------------- rows → state ---------------- */
  function fromRows(rows) {
    const st = LOS.store.defaultState();
    const one = (t) => (rows[t] || [])[0];
    const p = one('profiles');
    if (p) Object.assign(st.profile, p.data || {}, { name: p.display_name || '', native: p.native_language || 'it' });
    const s = one('user_settings');
    if (s) {
      const d = s.data || {};
      Object.assign(st.settings, d.settings || {}, { theme: s.dark_mode || 'system', activeLang: s.preferred_language || null, notifications: !!s.notifications_enabled });
      st.time = { min: s.daily_minimum, target: s.daily_target, max: s.daily_maximum };
      if (d.rules) st.rules = Object.assign(st.rules, d.rules);
      if (d.weekly) st.schedule.weekly = d.weekly;
      if (d.meta) st.meta = Object.assign(st.meta, d.meta);
    }
    (rows.work_schedule || []).forEach((r) => {
      if (r.type) st.schedule.overrides[r.date] = Object.assign({ type: r.type }, r.start_time ? { start: time(r.start_time) } : {}, r.end_time ? { end: time(r.end_time) } : {}, r.notes ? { note: r.notes } : {});
      if (r.rest || r.low_energy) st.days[r.date] = Object.assign({}, r.rest ? { rest: true } : {}, r.low_energy ? { lowEnergy: true } : {});
    });
    const L = (code) => {
      if (!st.langs[code]) st.langs[code] = LOS.store.defaultLang(code);
      return st.langs[code];
    };
    (rows.language_profiles || []).forEach((r) => {
      if (!LOS.lang.get(r.language_code)) return;
      const lg = L(r.language_code);
      Object.assign(lg, r.data || {}, {
        code: r.language_code, enabled: r.enabled !== false, onboarded: !!r.onboarded, assessed: !!r.assessed,
        targetLevel: r.target_level || 'C2', targetDate: r.target_date || '', goals: r.goals || [],
      });
      lg.skills = lg.skills || {};
      U.SKILLS.forEach((sk) => {
        const col = r[sk + '_level'];
        if (!lg.skills[sk] && col != null) lg.skills[sk] = { theta: +col, n: 0, hist: [], conf: 'low' };
      });
    });
    const known = (code) => LOS.lang.get(code);
    (rows.vocabulary || []).forEach((r) => {
      if (!known(r.language_code)) return;
      const lg = L(r.language_code);
      if (r.is_custom) {
        lg.custom.push(Object.assign({ id: r.item_key, w: r.word, tr: r.translation || '', def: r.definition || '', ex: r.example || '', pos: r.part_of_speech || '', reg: r.register || 'neutral', l: r.cefr_level || 'B2', k: r.kind || 'word', d: r.domain || 'general', col: [], syn: [], ant: [], ipa: '', f: 3, ctx: '', ff: '' }, (r.data && r.data.custom) || {}, { custom: true }));
      }
      if (r.stage != null || r.next_review) {
        lg.vocab[r.item_key] = Object.assign(LOS.srs.create(), (r.data && r.data.srs) || {}, {
          stage: r.stage || 0, mastery: r.mastery == null ? 0 : +r.mastery, ease: r.ease_factor == null ? 2.5 : +r.ease_factor,
          interval: r.interval || 0, due: r.next_review || null, last: r.last_review || null,
        });
      }
    });
    (rows.grammar_progress || []).forEach((r) => {
      if (!known(r.language_code)) return;
      L(r.language_code).grammar[r.topic] = Object.assign(LOS.srs.create(), r.data || {}, {
        mastery: r.mastery == null ? 0 : +r.mastery, ease: r.ease_factor == null ? 2.5 : +r.ease_factor, interval: r.interval || 0,
        d: r.difficulty || 1, last: r.last_review || null, due: r.next_review || null,
      }, r.notes ? { notes: r.notes } : {});
    });
    (rows.study_sessions || []).slice().sort((a, b) => String(a.completed_at).localeCompare(String(b.completed_at))).forEach((r) => {
      if (!known(r.language_code)) return;
      L(r.language_code).sessions.push(Object.assign({}, r.data || {}, { id: r.client_id, date: r.session_date, ts: Date.parse(r.completed_at) || Date.now(), type: r.activity_type, skill: r.skill, minutes: r.duration_minutes, score: r.score == null ? null : +r.score, title: r.title || '' }));
    });
    (rows.errors || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).forEach((r) => {
      if (!known(r.language_code)) return;
      const lg = L(r.language_code);
      const e = Object.assign({}, r.data || {}, { id: r.client_id, date: r.error_date, ts: Date.parse(r.created_at) || Date.now(), src: r.source || 'manual', cat: r.category, label: r.label || 'Other', wrong: r.original || '', right: r.correction || '', note: r.explanation || '', topic: r.topic || null, resolved: !!r.resolved });
      if (r.improved_version) e.natural = r.improved_version;
      if (r.occurrences > 1) e.count = r.occurrences;
      lg.errors.push(e);
      if (r.card) lg.errorCards[r.client_id] = r.card;
    });
    (rows.listening_content || []).slice().sort((a, b) => String(b.listened_on).localeCompare(String(a.listened_on))).forEach((r) => {
      if (!known(r.language_code)) return;
      L(r.language_code).listening.push(Object.assign({}, r.data || {}, { id: r.client_id, date: r.listened_on, title: r.title || '', url: r.url || '', minutes: r.duration || 0, level: r.cefr_level || 'B1', comprehension: r.comprehension == null ? 0 : r.comprehension, difficulty: r.difficulty || 3, notes: r.notes || '' }, r.completed === false ? { completed: false } : {}, r.source && r.source !== 'external' ? { source: r.source } : {},
        r.topic ? { topic: r.topic } : {}, r.accent ? { accent: r.accent } : {}, r.speed ? { speed: r.speed } : {}, r.has_transcript != null ? { transcript: r.has_transcript } : {}));
    });
    (rows.productions || []).slice().sort((a, b) => String(b.produced_on).localeCompare(String(a.produced_on)) || String(b.created_at).localeCompare(String(a.created_at))).forEach((r) => {
      if (!known(r.language_code)) return;
      const lg = L(r.language_code);
      if (r.kind === 'writing') lg.writings.push(Object.assign({}, r.data || {}, { id: r.client_id, date: r.produced_on, promptId: r.prompt_id, title: r.title || '', level: r.cefr_level || 'B1', text: r.content || '', scores: r.scores || {}, overall: r.overall == null ? null : +r.overall, estTheta: r.est_level == null ? null : +r.est_level }));
      else lg.speakings.push(Object.assign({}, r.data || {}, { id: r.client_id, date: r.produced_on, taskId: r.prompt_id, title: r.title || '', level: r.cefr_level || 'B1', transcript: r.content || '', ratings: r.scores || {}, overall: r.overall == null ? null : +r.overall }));
    });
    (rows.daily_plans || []).forEach((r) => { if (known(r.language_code)) L(r.language_code).plans[r.plan_date] = r.data; });
    (rows.assessments || []).slice().sort((a, b) => String(a.taken_on).localeCompare(String(b.taken_on))).forEach((r) => { if (known(r.language_code)) L(r.language_code).assessments.push(Object.assign({}, r.result, { id: r.client_id })); });
    (rows.weekly_reviews || []).slice().sort((a, b) => String(a.week_start).localeCompare(String(b.week_start))).forEach((r) => { if (known(r.language_code)) L(r.language_code).reviews.push(Object.assign({}, r.review, { id: r.client_id })); });
    return st;
  }

  LOS.mapper = { TABLES, BY_NAME, keyOf, toRows, fromRows };
})();

/* Lingua OS — core utilities, event bus, icon set.
 * Plain scripts (no ES modules) so the app runs from file:// without a server. */
(function () {
  'use strict';
  const LOS = (window.LOS = window.LOS || {});
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const pad = (n) => String(n).padStart(2, '0');

  const U = (LOS.util = {
    LEVELS,
    SKILLS: ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking'],
    SKILL_LABEL: { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking', think: 'Think', review: 'Review' },

    uid(p = 'id') { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    uuid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      const b = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(16)) : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    },

    /* ---------- dates (local, YYYY-MM-DD) ---------- */
    dateStr(d = new Date()) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    today() { return U.dateStr(new Date()); },
    parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    addDays(s, n) { const d = U.parse(s); d.setDate(d.getDate() + n); return U.dateStr(d); },
    diffDays(a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); }, // b - a
    weekday(s) { return U.parse(s).getDay(); }, // 0 = Sunday
    weekStart(s, startDay = 1) { const wd = U.weekday(s); const back = (wd - startDay + 7) % 7; return U.addDays(s, -back); },
    monthStart(s) { return s.slice(0, 8) + '01'; },
    range(from, to) { const out = []; let d = from; while (d <= to) { out.push(d); d = U.addDays(d, 1); } return out; },
    fmtDate(s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
      try { return U.parse(s).toLocaleDateString('en-GB', opts); } catch (e) { return s; }
    },
    relDate(s, ref = U.today()) {
      if (!s) return '—';
      const n = U.diffDays(ref, s);
      if (n === 0) return 'today';
      if (n === 1) return 'tomorrow';
      if (n === -1) return 'yesterday';
      if (n > 1) return n < 14 ? `in ${n} days` : n < 60 ? `in ${Math.round(n / 7)} weeks` : `in ${Math.round(n / 30)} months`;
      const m = -n;
      return m < 14 ? `${m} days ago` : m < 60 ? `${Math.round(m / 7)} weeks ago` : `${Math.round(m / 30)} months ago`;
    },
    timeToMin(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); },
    hoursBetween(start, end) {
      if (!start || !end) return 0;
      let a = U.timeToMin(start), b = U.timeToMin(end);
      if (b <= a) b += 1440; // overnight
      return (b - a) / 60;
    },
    fmtMin(m) {
      m = Math.round(m || 0);
      if (m < 60) return m + ' min';
      const h = Math.floor(m / 60), r = m % 60;
      return r ? `${h} h ${r} min` : `${h} h`;
    },
    greeting() { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; },

    /* ---------- numbers ---------- */
    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp(a, b, t) { return a + (b - a) * t; },
    round(v, d = 0) { const p = Math.pow(10, d); return Math.round(v * p) / p; },
    sum(a) { return a.reduce((s, x) => s + (+x || 0), 0); },
    avg(a) { return a.length ? U.sum(a) / a.length : 0; },
    median(a) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
    countBy(arr, fn) { const o = {}; arr.forEach((x) => { const k = fn(x); if (k != null) o[k] = (o[k] || 0) + 1; }); return o; },
    groupBy(arr, fn) { const o = {}; arr.forEach((x) => { const k = fn(x); (o[k] = o[k] || []).push(x); }); return o; },

    /* ---------- randomness (seedable, so a day's plan is stable) ---------- */
    hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    rng(seed) { let a = typeof seed === 'number' ? seed : U.hash(String(seed)); return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    shuffle(arr, rnd = Math.random) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    pick(arr, rnd = Math.random) { return arr.length ? arr[Math.floor(rnd() * arr.length)] : undefined; },

    /* ---------- text ---------- */
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    stripAccents(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); },
    norm(s) {
      return String(s == null ? '' : s).toLowerCase().normalize('NFC')
        .replace(/[’‘`´]/g, "'").replace(/[“”«»]/g, '"').replace(/\s+/g, ' ')
        .replace(/^[\s¿¡"'(]+|[\s.!?;:,"')]+$/g, '').trim();
    },
    lev(a, b) {
      if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
      let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
      }
      return prev[b.length];
    },
    words(text) { return (String(text).match(/[\p{L}][\p{L}'’-]*/gu) || []).map((w) => w.toLowerCase().replace(/’/g, "'")); },
    sentences(text) {
      return String(text).replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+(?=[\p{Lu}¿¡"“(0-9])/u).map((s) => s.trim()).filter(Boolean);
    },
    /** Moving-average type/token ratio: length-robust lexical variety. */
    mattr(words, win = 40) {
      if (!words.length) return 0;
      if (words.length <= win) return new Set(words).size / words.length;
      let total = 0, n = 0;
      for (let i = 0; i + win <= words.length; i += 5) { total += new Set(words.slice(i, i + win)).size / win; n++; }
      return total / n;
    },
    slug(s) { return U.stripAccents(String(s)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); },
    cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); },

    /* ---------- CEFR scale: theta 0..6 (A1 = 0–1 … C2 = 5–6) ---------- */
    levelIndex(l) { if (l == null) return 0; const i = LEVELS.indexOf(String(l).slice(0, 2).toUpperCase()); return i < 0 ? 0 : i; },
    thetaInfo(theta) {
      if (theta == null || isNaN(theta)) return { band: 0, label: '—', sub: '—', pct: 0, frac: 0, next: 'A1', theta: null };
      const t = U.clamp(theta, 0, 6);
      const band = Math.min(5, Math.floor(t));
      const frac = t - band;
      return {
        theta: t, band, frac,
        label: LEVELS[band],
        sub: LEVELS[band] + (frac < 0.5 ? '.1' : '.2'),
        pct: Math.round((t / 6) * 100),
        next: band < 5 ? LEVELS[band + 1] : 'C2+',
      };
    },

    debounce(fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; },
  });

  /* ---------- tiny event bus ---------- */
  const handlers = {};
  LOS.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => LOS.bus.off(ev, fn); },
    off(ev, fn) { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); },
    emit(ev, data) { (handlers[ev] || []).slice().forEach((f) => { try { f(data); } catch (e) { console.error(e); } }); },
  };

  /* ---------- icons: linear, monochrome, Lucide-style (24×24, stroke 2) ---------- */
  const I = {
    dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    today: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    grammar: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    vocabulary: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    reading: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>',
    listening: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    writing: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    speaking: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    think: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    medical: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
    professional: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    progress: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    errors: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    review: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    settings: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    stop: '<rect width="14" height="14" x="5" y="5" rx="2"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    battery: '<rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/><line x1="6" x2="6" y1="11" y2="13"/>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    circle: '<circle cx="12" cy="12" r="9"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    skip: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
    swap: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    wind: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
    microscope: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    rest: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    briefcase: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    sparkle: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  };
  LOS.icon = function (name, size = 18, cls = '') {
    const body = I[name] || I.circle;
    return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  };
})();

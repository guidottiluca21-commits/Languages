/* Node test: state → rows → (simulated Postgres) → state must be lossless.
 * Run: node tests/mapper-roundtrip.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const mem = {};
const ctx = {
  console, Math, Date, JSON, setTimeout, clearTimeout, setInterval, clearInterval, URLSearchParams,
  localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } },
  navigator: { onLine: true }, document: { addEventListener() {}, visibilityState: 'visible' }, addEventListener() {},
};
ctx.window = ctx;
vm.createContext(ctx);
['js/core.js', 'js/content/shared.js', 'js/content/en.js', 'js/content/en-pro.js', 'js/content/es.js', 'js/content/es-pro.js', 'js/state/store.js',
 'js/engine/srs.js', 'js/engine/skills.js', 'js/engine/learning.js', 'js/engine/writing.js', 'js/engine/assessment.js', 'js/engine/planner.js', 'js/engine/progress.js', 'js/data/mapper.js']
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const LOS = ctx.LOS, U = LOS.util;
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('FAIL', msg); } else console.log('ok  ', msg); };

/* ---- build a rich state with the real engine ---- */
const st = LOS.store.state;
st.settings.onboarded = true; st.profile.name = 'Luca'; st.profile.native = 'it'; st.profile.field = 'Medicine';
st.time = { min: 20, target: 45, max: 100 }; st.settings.langWeights = { en: 60, es: 40 }; st.settings.theme = 'dark';
st.schedule.overrides[U.addDays(U.today(), 1)] = { type: 'night', start: '20:00', end: '08:00', note: 'ICU' };
st.schedule.overrides[U.addDays(U.today(), 5)] = { type: 'vacation' };
st.days[U.addDays(U.today(), 2)] = { rest: true };
st.days[U.today()] = { lowEnergy: true };
for (const code of ['en', 'es']) {
  const L = LOS.store.ensureLang(code);
  const d = LOS.assessment.start(code, 3);
  for (let i = 0; i < 40; i++) { const c = LOS.assessment.current(d); if (c.done) break; if (c.special === 'writing') { LOS.assessment.submitWriting(d, 'I have been working in a hospital since many years and the patients is often tired. However, we manage.', 'B2'); continue; } if (c.special === 'speaking') { LOS.assessment.submitSpeaking(d, { B1: [true, true, true], B2: [true, false, true], C1: [false, false, false] }); continue; } LOS.assessment.answer(d, i % 3); }
  LOS.assessment.finish(d);
  L.onboarded = true; L.goals = ['medical', 'work']; L.targetDate = '2027-12-31';
  st.settings.activeLang = code;
  const t = LOS.lang.get(code).grammar[12].id;
  const drill = new LOS.learn.GrammarDrill(code, t, 4);
  for (let i = 0; i < 6; i++) { const ex = drill.next(); if (!ex) break; drill.answer(ex, ex.t === 'mc' ? ex.a : i % 2 ? ex.a[0] : 'wrong'); }
  drill.finish();
  const ids = LOS.learn.newVocabCandidates(code, 5).map((v) => v.id);
  LOS.learn.introduceVocab(code, ids);
  ids.forEach((id, i) => LOS.learn.gradeVocab(code, id, i % 4));
  const cv = LOS.learn.addCustomVocab(code, { w: 'bottleneck', tr: 'collo di bottiglia', def: 'a point of congestion', col: 'a major bottleneck, create a bottleneck', l: 'C1' });
  LOS.learn.introduceVocab(code, [cv.id]);
  LOS.learn.recordError(code, { src: 'writing', cat: 'grammar', label: 'Agreement', wrong: 'People is tired.', right: 'People are tired.', natural: 'People are exhausted.', note: 'plural' });
  LOS.learn.recordError(code, { src: 'writing', cat: 'grammar', label: 'Agreement', wrong: 'People is tired.', right: 'People are tired.' }); // same-day duplicate → count 2
  LOS.learn.recordSession(code, { type: 'grammar', skill: 'grammar', minutes: 12, score: 0.75, title: 'Conditionals' });
  L.listening.unshift({ id: U.uid('lis'), date: U.today(), title: 'Podcast', url: 'www.youtube.com/watch?v=abcdefghijk', minutes: 20, level: 'B2', comprehension: 70, difficulty: 3, steps: ['general'], notes: 'nice', words: ['x'] });
  L.writings.unshift({ id: U.uid('wri'), date: U.today(), promptId: 'p', title: 'Essay', genre: 'Essay', level: 'B2', text: 'Some text', words: 2, scores: { grammar: 3 }, overall: 3.4, estTheta: 3.2, checks: 1 });
  L.speakings.unshift({ id: U.uid('spk'), date: U.today(), taskId: 't', title: 'Talk', level: 'B2', transcript: 'hello', secs: 30, ratings: { fluency: 3 }, overall: 3 });
}
LOS.planner.ensureToday();
LOS.progress.saveWeeklyReview('en', { answers: { learned: 'a lot' }, workload: 'right', focus: 'listening' });
LOS.store.lang('en').gains.unshift({ date: U.today(), skill: 'speaking', level: 'B2', text: 'test gain', kind: 'scenario', key: 'k' });

/* ---- state → rows → simulated database → state ---- */
const uid = '11111111-1111-1111-1111-111111111111';
const rows = LOS.mapper.toRows(st, uid);
const counts = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length]));
console.log('rows per table', JSON.stringify(counts));
ok(rows.vocabulary_reviews.length > 0, 'vocabulary review log produces rows');
ok(rows.listening_content.every((r) => /^https:\/\//.test(r.url)), 'listening URLs are normalized to pass the CHECK constraint');
ok(rows.errors.some((r) => r.occurrences === 2), 'same-day duplicate errors are merged (occurrences=2)');
ok(rows.language_profiles.every((r) => r.current_level && /^(A1|A2|B1|B2|C1|C2)\.[12]$/.test(r.current_level)), 'language_profiles carry a valid CEFR sub-level');
ok(Object.values(rows).every((list) => list.every((r) => r.user_id === uid)), 'every row is stamped with the owner user_id');
const asDb = JSON.parse(JSON.stringify(rows), (k, v) => (['start_time', 'end_time'].includes(k) && typeof v === 'string' ? v + ':00' : v));
delete asDb.vocabulary_reviews; // write-only log, never downloaded
const st2 = LOS.mapper.fromRows(asDb);

/* ---- compare ---- */
const canon = (x) => {
  if (Array.isArray(x)) { const a = x.map(canon); return a.length && a[0] && typeof a[0] === 'object' && 'id' in a[0] ? a.sort((p, q) => String(p.id).localeCompare(String(q.id))) : a; }
  if (x && typeof x === 'object') { const o = {}; Object.keys(x).sort().forEach((k) => { if (x[k] !== undefined && x[k] !== null && k !== 'reviewLog' && k !== 'createdAt') o[k] = canon(x[k]); }); return o; }
  if (typeof x === 'number') return Math.round(x * 100) / 100;
  return x;
};
const a = canon(JSON.parse(JSON.stringify(st))), b = canon(JSON.parse(JSON.stringify(st2)));
// URL normalization is an intended change
a.langs.en.listening.forEach((x) => (x.url = 'https://' + x.url)); a.langs.es.listening.forEach((x) => (x.url = 'https://' + x.url));
function firstDiff(x, y, p = '') {
  if (JSON.stringify(x) === JSON.stringify(y)) return null;
  if (typeof x !== 'object' || typeof y !== 'object' || !x || !y) return p + ': ' + String(JSON.stringify(x)).slice(0, 120) + ' ≠ ' + String(JSON.stringify(y)).slice(0, 120);
  for (const k of new Set(Object.keys(x).concat(Object.keys(y)))) { const d = firstDiff(x[k], y[k], p + '.' + k); if (d) return d; }
  return p + ': differs';
}
const d = firstDiff(a, b);
ok(!d, 'state → rows → database → state is lossless' + (d ? '\n     first difference ' + d : ''));
const rows2 = LOS.mapper.toRows(st2, uid);
delete rows.vocabulary_reviews; delete rows2.vocabulary_reviews;
ok(JSON.stringify(rows2) === JSON.stringify(Object.assign({}, rows, { listening_content: rows.listening_content })), 're-mapping the rebuilt state yields identical rows (no spurious re-uploads)');
ok(Object.keys(st2.langs.en.vocab).length === Object.keys(st.langs.en.vocab).length && st2.langs.es.custom.length === 1, 'English and Spanish vocabulary stay separate');
process.exitCode = failures ? 1 : 0;
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');

/* Optional: dump the generated rows as SQL to insert into a real database (see tests/README). */
if (process.argv[2] === '--sql') {
  const lit = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  let sql = `set role authenticated; select set_config('request.jwt.claim.sub', ${lit(uid)}, false);\n`;
  const all = LOS.mapper.toRows(st, uid);
  for (const t of LOS.mapper.TABLES) {
    const list = all[t.name];
    if (!list.length) continue;
    const cols = Object.keys(list[0]);
    sql += `insert into public.${t.name} (${cols.join(',')}) select ${cols.join(',')} from jsonb_populate_recordset(null::public.${t.name}, ${lit(JSON.stringify(list))}::jsonb) on conflict (${t.conflict}) do update set ${cols.filter((c) => !t.conflict.split(',').includes(c)).map((c) => `${c}=excluded.${c}`).join(',') || 'user_id=excluded.user_id'};\n`;
  }
  fs.writeFileSync(process.argv[3], sql);
}

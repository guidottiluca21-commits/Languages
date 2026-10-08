/* Node test: the adaptive learning engine (deterministic, no browser).
 * Covers: new and returning users, missed days, review scheduling, mastery dimensions, error bank,
 * learning queue, session generation (5/15/30/45+ and study modes), goal readiness, speaking ladder,
 * trend-based difficulty, AI unavailable (local fallbacks) and AI available (remote + local model, mocked).
 * Run: node tests/engine.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const mem = {};
let fetchMock = null;
const ctx = {
  console, Math, Date, JSON, setTimeout, clearTimeout, setInterval, clearInterval, URLSearchParams, AbortController,
  localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } },
  navigator: { onLine: true }, document: { addEventListener() {}, visibilityState: 'visible' }, addEventListener() {},
  fetch: (...a) => (fetchMock ? fetchMock(...a) : Promise.reject(new Error('offline'))),
};
ctx.window = ctx;
vm.createContext(ctx);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
[...html.matchAll(/<script src="(js\/(?:core|config|content\/[^"]+|state\/[^"]+|engine\/[^"]+|ai))\.js"><\/script>/g)].map((m) => m[1] + '.js')
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const LOS = ctx.LOS, U = LOS.util;
let failures = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { failures++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
const st = LOS.store.state;
st.settings.onboarded = true;
st.profile.domain = 'medicine';
const today = U.today();
const types = (p) => p.items.map((i) => i.type);

(async () => {
  /* ---------- new user ---------- */
  const code = 'en';
  const L = LOS.store.ensureLang(code);
  L.onboarded = true; L.goals = ['medical', 'work'];
  st.settings.activeLang = code;
  for (const [m, label] of [[5, '5'], [15, '15'], [30, '30'], [45, '45']]) {
    const p = LOS.planner.generateDailyPlan(code, today, m, {});
    ok(Math.abs(p.minutes - m) <= 2, `new user · ${label}-minute session totals ${p.minutes} min`);
    ok(p.items[0].type === 'vocabulary', `new user · ${label} min starts with new language (nothing to review yet): ${types(p).join(', ')}`);
  }
  const p5 = LOS.planner.generateDailyPlan(code, today, 5, {});
  ok(p5.items.some((i) => i.type === 'micro' && i.payload.focus === 'retrieval') && p5.items.some((i) => i.type === 'micro' && i.payload.focus === 'sentence'), '5 min = new item + one retrieval + one very short production (not a cut-down long lesson)');

  /* ---------- learning: stages, scheduling, mastery dimensions ---------- */
  const ids = LOS.learn.newVocabCandidates(code, 12).map((v) => v.id);
  LOS.learn.introduceVocab(code, ids);
  const a = ids[0];
  LOS.ped.recordVocab(code, a, 'easy', 1, { kind: 'mc-meaning', sameDayOk: true });
  ok(LOS.ped.vstage(L.vocab[a]) === 2, 'easy recognition → stage 2 (recognized)');
  const due1 = L.vocab[a].due;
  ok(due1 > today, 'a successful review schedules the next one in the future');
  LOS.ped.recordVocab(code, a, 'easy', 2, { kind: 'type-tr', sameDayOk: true });
  ok(LOS.ped.vstage(L.vocab[a]) === 3, 'easy recall → stage 3 (recalled)');
  const m = LOS.ped.mastery(code, a);
  ok(m.rec > m.fre && m.rcl > m.ctl, `recognition/recall above active use (rec ${m.rec}, recall ${m.rcl}, controlled ${m.ctl}, free ${m.fre})`);
  LOS.ped.recordVocab(code, a, 'wrong', 3, { kind: 'cloze' });
  ok(LOS.ped.vstage(L.vocab[a]) === 2 && LOS.learn.dueVocab(code).includes(a) === (L.vocab[a].due <= today), 'a wrong answer steps back one stage and brings the item back soon');
  LOS.ped.recordVocab(code, a, 'repeated', 2, {});
  ok(LOS.ped.vstage(L.vocab[a]) === 1 && L.vocab[a].reteach, 'a repeated error → re-teach (exposure) before the next test');
  const prof = LOS.ped.masteryProfile(code);
  ok(prof.n >= 10 && prof.dims.length === 7 && prof.dims.find((d) => d.k === 'rec').v != null, 'mastery profile: 7 dimensions over the items met');

  /* ---------- error bank ---------- */
  for (let i = 0; i < 2; i++) LOS.learn.recordError(code, { src: 'writing', cat: 'grammar', label: 'Prepositions', rule: 'discuss-about', pat: 'discuss about', sugg: 'discuss', wrong: `We discussed about the plan ${i}.`, right: `We discussed the plan ${i}.` });
  LOS.learn.recordError(code, { src: 'writing', cat: 'spelling', label: 'Spelling', wrong: 'recieve', right: 'receive' });
  const pats = LOS.errorBank.patterns(code);
  const disc = pats.find((p) => p.rule === 'discuss-about');
  ok(disc && disc.count === 2 && disc.cat === 'preposition' && disc.status === 'active', 'recurring "discuss about" becomes an active preposition pattern');
  ok(!pats.some((p) => p.label === 'Spelling'), 'a single typo does not enter the error bank');
  ok(LOS.queue.build(code).items.some((x) => x.kind === 'pattern' && x.id === disc.key), 'the recurring error is part of the learning queue');
  const micro = LOS.ped.microSet(code, 'application', 12, { rnd: U.rng('x') });
  ok(micro.length >= 6, 'application micro-set builds from taught material');

  /* ---------- learning queue ---------- */
  ids.slice(1, 8).forEach((id) => { L.vocab[id].stage = 3; L.vocab[id].due = U.addDays(today, -2); });
  const q = LOS.queue.build(code);
  const firstOf = (cat) => q.items.findIndex((x) => x.cat === cat);
  ok(q.counts.due >= 7 && firstOf('due') < firstOf('reinforce') && firstOf('reinforce') < firstOf('new'), `queue order: due (${q.counts.due}) → reinforcement (${q.counts.reinforce}) → new (${q.counts.new})`);
  const rs = LOS.queue.reviewSet(code, 5);
  ok(rs.vocab.length + rs.grammar.length * 3 + rs.errors.length <= 7, 'a 5-item review set stays small');

  /* ---------- returning user after missed days: no backlog, no guilt ---------- */
  ids.forEach((id) => { L.vocab[id].stage = 3; L.vocab[id].due = U.addDays(today, -9); });
  L.sessions = [{ id: 'x1', date: U.addDays(today, -10), minutes: 20, skill: 'vocabulary', type: 'vocabulary', score: 0.8 }, { id: 'x2', date: U.addDays(today, -11), minutes: 20, skill: 'grammar', type: 'grammar', score: 0.7 }];
  const rec = LOS.planner.recoveryState(today);
  const b = LOS.planner.dayBudget(today);
  ok(rec.active && b.mode === 'recovery' && b.why.some((w) => /Welcome back/.test(w)), 'after 10 days away: gentle restart, "Welcome back" (no lost-streak message)');
  ok(LOS.queue.daysAway(code) === 10, 'days away detected');
  const pr = LOS.planner.generateDailyPlan(code, today, 20, { mode: 'recovery' });
  const revIt = pr.items.find((i) => i.type === 'review');
  ok(revIt && revIt.payload.cap <= 20 && pr.minutes <= 22, `returning user: one normal-size session (${pr.minutes} min, review cap ${revIt && revIt.payload.cap}) — the backlog is not piled on`);
  ok(LOS.queue.reviewSet(code, revIt.payload.cap).vocab.length <= revIt.payload.cap, 'the review queue is capped, highest-value items first');

  /* ---------- sessions: time chosen by the learner, study modes ---------- */
  const plan = LOS.planner.setSession(code, 15, null);
  ok(plan.chosen.minutes === 15 && LOS.planner.ensureToday().plans.find((x) => x.code === code).plan === L.plans[today], '"I have 15 minutes" rebuilds today\'s plan and the choice is kept');
  plan.items[0].status = 'done';
  const plan2 = LOS.planner.setSession(code, 30, null);
  ok(plan2.items[0].status === 'done' && plan2.items.length > 1, 'changing the time keeps completed activities');
  const com = LOS.planner.setSession(code, 15, 'commute');
  ok(!com.items.some((i) => ['writing', 'grammar'].includes(i.type)) && com.items.some((i) => i.payload && i.payload.handsFree) && com.items.some((i) => i.payload && i.payload.focus === 'commute'), 'commute mode: hands-free review, listening and shadowing — no writing');
  const brk = LOS.planner.setSession(code, 5, 'break');
  ok(brk.items.filter((i) => i.status === 'pending').length <= 4 && U.sum(brk.items.filter((i) => i.status === 'pending').map((i) => i.minutes)) <= 6, 'break mode: a 5-minute retrieval session');
  const deep = LOS.planner.generateDailyPlan(code, today, 60, { study: 'deep' });
  ok(deep.items.some((i) => i.type === 'listening' || i.type === 'reading') && deep.items.some((i) => ['speaking', 'writing', 'sim', 'scenario', 'think'].includes(i.type)) && Math.abs(deep.minutes - 60) <= 3, `deep study (60 min): input + production (${types(deep).join(', ')})`);
  ok(deep.challenge && deep.challenge.optional && !deep.items.includes(deep.challenge), 'the challenge is optional and not counted in the minutes');

  /* ---------- goals, readiness, allocation ---------- */
  L.target = { type: 'work_abroad', country: 'United Kingdom' };
  const rd = LOS.goals.readiness(code);
  ok(rd.dims.length >= 5 && rd.impact.length === 3 && rd.overall >= 0 && rd.overall <= 1, `goal readiness "${rd.label}": ${rd.dims.map((d) => d.label + ' ' + Math.round(d.v * 100)).join(', ')}`);
  ok(rd.dims[0].label && LOS.goals.focus(code).length > 3, 'current focus derived from the highest-impact area');
  const al = LOS.goals.allocation(code);
  ok(Math.abs(U.sum(Object.values(al)) - 100) <= 2, `allocation sums to 100%: ${JSON.stringify(al)}`);
  ok(LOS.goals.why(code, { type: 'scenario', payload: { moduleId: 'en-med-handover' } }).includes('United Kingdom'), '"Why am I learning this?" links a medical scenario to the goal');

  /* ---------- speaking ladder & trend-based difficulty ---------- */
  L.speakLevel = 3;
  LOS.ped.recordSpeak(code, 0.8); LOS.ped.recordSpeak(code, 0.85);
  ok(L.speakLevel === 4, 'two good speaking results → next speaking level');
  LOS.ped.recordSpeak(code, 0.3);
  ok(L.speakLevel === 4, 'one bad result does not drop the level');
  LOS.ped.recordSpeak(code, 0.3);
  ok(L.speakLevel === 3, 'two weak results in a row → one level down');
  L.prod = { writing: 3 }; L.prodLast = {};
  LOS.ped.recordProduction(code, 'writing', 0.2, false);
  ok(L.prod.writing === 3, 'production ladder: a single weak text does not step down');
  LOS.ped.recordProduction(code, 'writing', 0.2, false);
  ok(L.prod.writing === 2, 'production ladder: a weak trend steps down');

  /* ---------- exposure ---------- */
  LOS.exposure.toggle(code, 'talk');
  ok(LOS.exposure.week(code).find((x) => x.k === 'talk').done && LOS.exposure.history(code, 4).done === 1, 'weekly real-world exposure is recorded');

  /* ---------- AI unavailable: local fallbacks ---------- */
  st.settings.ai = { provider: 'local', endpoint: '' };
  const fb = await LOS.AI.assess(code, { text: 'We discussed about the plan yesterday. I have went to the meeting.', level: 'B1' });
  ok(fb._source === 'local' && Array.isArray(fb.errors) && fb.errors.length <= 3 && fb.followUp && fb.followUp.href, `local assessment: ${fb.errors.length} prioritised corrections (≤3), follow-up "${fb.followUp.label}"`);
  ok(fb.errors.some((e) => e.recurring), 'the recurring error is flagged as recurring in the feedback');
  const tr = await LOS.AI.transform(code, { text: "I don't think we can't finish today.", target: 'formal' });
  ok(tr._source === 'local' && (tr.versions || []).some((v) => /do not/.test(v)), 'local "make it formal" expands contractions');
  const lib = LOS.library.add(code, { title: 'T', text: LOS.lang.get(code).vocab.filter((v) => v.l === 'B1').slice(0, 8).map((v) => v.ex).join(' ') + ' Furthermore, the epidemiological considerations remain unresolved.' });
  const ad = await LOS.AI.adaptContent(code, { text: lib.text });
  ok(ad._source === 'local' && ad.vocab.length >= 1 && ad.vocab.length <= 8 && ad.unknown.length >= 1, `local content adapter: ${ad.vocab.length} useful items, ${ad.unknown.length} words to look up, ${ad.questions.length} questions`);
  const sm = LOS.sim.pick(code, { rnd: () => 0.1 });
  const mod = sm ? LOS.lang.get(code).index.modules[sm.moduleId] : LOS.lang.get(code).abroad[0];
  const ln = LOS.sim.lines(code, mod, mod.scen[0]);
  ok(ln.open && ln.follow.length === 3, 'simulator: local partner has an opener and three follow-ups');
  const ev = LOS.sim.evaluate(code, mod, mod.scen[0], [{ text: mod.scen[0].model }, { text: 'Yes.' }, { text: mod.expr[0].p }, { text: mod.expr[1].p }], 4);
  ok(Object.keys(ev.dims).length === 7 && ev.weak.length === 2 && ev.overall > 0, `simulation report: 7 dimensions, weakest = ${ev.weak.map((w) => w.label).join(' & ')}`);
  LOS.sim.save(code, mod, 0, Object.assign({}, ev, { weak: [{ k: 'interaction' }, { k: 'fluency' }] }), [1, 2, 3, 4]);
  ok(LOS.queue.build(code).items.some((x) => x.kind === 'sim-weak' && x.id === 'interaction'), 'simulation weaknesses enter the learning queue');
  const pw = LOS.planner.generateDailyPlan(code, today, 30, { mode: 'standard' });
  ok(pw.items.some((i) => i.type === 'micro' && i.payload.focus === 'dialogue' && /simulation/.test(i.reason)), 'the next session targets the weakest simulation dimension (interaction → dialogues)');

  /* ---------- AI available: remote backend (mocked) ---------- */
  st.settings.ai = { provider: 'remote', endpoint: 'https://proxy.example.com/lingua' };
  let sent = null;
  fetchMock = async (url, init) => { sent = JSON.parse(init.body); return { ok: true, json: async () => ({ communicated: ['Clear message'], errors: [{ wrong: 'discussed about', right: 'discussed', why: 'no preposition' }], alternatives: [], missing: [], priorities: ['Drop "about" after discuss'], followUp: 'Write two sentences with discuss.' }) }; };
  const rfb = await LOS.AI.assess(code, { text: 'We discussed about the plan.', level: 'B1' });
  ok(rfb._source === 'remote' && rfb.errors[0].right === 'discussed' && rfb.followUp.href, 'remote AI feedback is merged (and keeps a follow-up task link)');
  ok(sent && sent.task === 'assess' && sent.tutor && sent.tutor.rules.length && sent.tutor.errorBank.length && sent.tutor.domain === 'medicine' && sent.tutor.goal.type === 'work_abroad', 'the AI receives learner context: rules, error bank, domain, goal');
  fetchMock = async () => { throw new Error('network down'); };
  const ffb = await LOS.AI.assess(code, { text: 'We discussed about the plan.', level: 'B1' });
  ok(ffb._source === 'local', 'AI failure → local fallback (no error shown)');
  /* ---------- AI available: local model (Ollama, mocked) ---------- */
  st.settings.ai = { provider: 'ollama', ollama: { url: 'http://localhost:11434', model: 'llama3.1' } };
  fetchMock = async (url, init) => ({ ok: true, json: async () => ({ message: { content: 'Sure! {"versions": ["We talked about the plan."], "note": "talk about = discuss"}' } }) });
  const otr = await LOS.AI.transform(code, { text: 'We discussed about the plan.', target: 'different' });
  ok(otr._source === 'ollama' && otr.versions[0] === 'We talked about the plan.', 'local model provider: JSON parsed even when wrapped in prose');
  const st0 = await LOS.AI.simTurn(code, { role: 'x', situation: 'y', level: 'B1', history: [{ who: 'ai', text: 'Hi' }, { who: 'me', text: 'Hello' }] }, () => ({ reply: 'local' }));
  ok(st0._source === 'ollama' || st0.reply === 'local', 'simulator turn goes through the provider');
  st.settings.ai = { provider: 'local', endpoint: '' };
  fetchMock = null;

  /* ---------- other languages: abroad track + pathways ---------- */
  for (const c of ['es', 'de', 'fr']) {
    const LL = LOS.store.ensureLang(c); LL.onboarded = true; LL.goals = ['work'];
    const pw = LOS.ped.pathway(c, 'abroad');
    ok(pw && pw.steps.length === 8 && pw.steps[0].state === 'learning', `[${c}] life-abroad pathway: 8 steps, first one open`);
    const p = LOS.planner.generateDailyPlan(c, today, 30, {});
    ok(Math.abs(p.minutes - 30) <= 2, `[${c}] 30-minute session generated (${types(p).join(', ')})`);
  }

  console.log(`${n} checks · ${failures ? failures + ' FAILED' : 'ALL PASSED'}`);
  process.exitCode = failures ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; });

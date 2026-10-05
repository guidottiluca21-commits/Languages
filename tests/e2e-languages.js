/* Browser E2E: four independent languages (en, es, de, fr) with the mock Supabase backend.
 * Run: SUPABASE_URL=https://x.supabase.co SUPABASE_ANON_KEY=test npm run build; npx http-server dist -p 5180; node tests/e2e-languages.js */
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:5180/';
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8');
const SHOTS = process.env.SHOTS || '/tmp/shots/';
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const CODES = ['en', 'es', 'de', 'fr'];

async function device(browser, name, db, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await ctx.route('**/vendor/supabase.js', (r) => r.fulfill({ body: MOCK, contentType: 'application/javascript' }));
  if (db) await ctx.addInitScript((d) => { if (!localStorage.getItem('__mockdb')) localStorage.setItem('__mockdb', d); }, db);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(name + ' PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(name + ' CONSOLE ' + m.text()); });
  return page;
}
const rows = (page, t) => page.evaluate((t) => (JSON.parse(localStorage.getItem('__mockdb')).tables[t] || []), t);
const waitSynced = (page) => page.waitForFunction(() => LOS.sync.info.status === 'synced' && LOS.sync.pendingCount() === 0, null, { timeout: 15000 });

(async () => {
  const browser = await chromium.launch();
  const A = await device(browser, 'A');
  await A.goto(BASE);
  await A.waitForSelector('text=Bentornato');
  await A.click('text=Crea un account'); await A.waitForSelector('text=Crea il tuo account');
  await A.fill('#email', 'poly@example.com'); await A.fill('#pw', 'Poliglotta2026'); await A.fill('#pw2', 'Poliglotta2026');
  await A.click('button[type=submit]');
  await A.waitForSelector('text=Let\'s build your');
  await A.click('text=Begin');
  for (const c of CODES) ok(!!(await A.$(`button.choice[data-v="${c}"]`)), `onboarding offers ${c}`);
  await A.screenshot({ path: SHOTS + 'l01-pick.png' });
  for (const c of CODES) await A.click(`button.choice[data-v="${c}"]`);
  await A.fill('#o-name', 'Luca');
  await A.click('button[data-act="next"]');
  const est = { en: 3, es: 2, de: 1, fr: 0 }; // B2, B1, A2, A1
  for (const c of CODES) await A.click(`button[data-act="est"][data-l="${c}"][data-v="${est[c]}"]`);
  await A.click('button[data-act="next"]');
  await A.click('button[data-act="skipTest"]');
  await A.click('button.choice[data-v="medical"]');
  await A.click('button[data-act="next"]'); await A.click('button[data-act="next"]'); await A.click('button[data-act="next"]');
  await A.click('button[data-act="generate"]');
  await A.waitForSelector('.focus-card');
  await waitSynced(A);

  /* 1. four independent CEFR profiles */
  const lp = await rows(A, 'language_profiles');
  ok(lp.length === 4 && CODES.every((c) => lp.some((r) => r.language_code === c)), 'one language_profiles row per language, keyed by language_code');
  const lvl = Object.fromEntries(lp.map((r) => [r.language_code, r.current_level.slice(0, 2)]));
  ok(lvl.en === 'B2' && lvl.es === 'B1' && lvl.de === 'A2' && lvl.fr === 'A1', `independent levels: ${JSON.stringify(lvl)}`);

  /* 2. dashboard overview & language selector */
  const cards = await A.$$eval('.lang-card', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok(cards.length === 4 && /Deutsch/.test(cards.join()) && /Français/.test(cards.join()), 'dashboard overview shows the four languages');
  await A.screenshot({ path: SHOTS + 'l02-dashboard.png', fullPage: true });
  await A.click('.sidebar [data-lang-menu]');
  const opts = await A.$$eval('.sidebar .lang-pop .lang-opt', (els) => els.map((e) => e.textContent.trim()));
  ok(opts.length === 4 && ['English', 'Español', 'Deutsch', 'Français'].every((n, i) => opts[i].includes(n)), `language menu lists 🇬🇧 English, 🇪🇸 Español, 🇩🇪 Deutsch, 🇫🇷 Français (${opts.map((o) => o.split(' ')[0]).join(' ')})`);
  await A.screenshot({ path: SHOTS + 'l03-menu.png' });
  await A.click('.sidebar .lang-pop [data-lang="de"]');
  await A.waitForFunction(() => LOS.store.active() === 'de');
  ok(true, 'switching language without logout');
  await A.goto(BASE + '#/grammar'); await A.waitForSelector('text=German curriculum');
  ok(await A.isVisible('text=Kasus') || (await A.content()).includes('Akkusativ'), 'German grammar roadmap shows German-specific topics (cases)');
  await A.goto(BASE + '#/grammar/de-adjektiv'); await A.waitForSelector('text=Adjektivdeklination');
  ok(true, 'German adjective-declension topic opens');

  /* 3. German drill → error lands in the German log with a German category */
  await A.evaluate(() => {
    const d = new LOS.learn.GrammarDrill('de', 'de-akkusativ', 3);
    const ex = d.next(); d.answer(ex, ex.t === 'mc' ? (ex.a + 1) % ex.o.length : 'falsch'); d.finish(); LOS.store.save();
  });
  const errDe = await A.evaluate(() => LOS.store.lang('de').errors.map((e) => e.cat));
  ok(errDe.includes('case'), `German error recorded with category "case" (${errDe})`);
  ok(await A.evaluate(() => LOS.store.lang('fr').errors.length === 0 && LOS.store.lang('en').errors.length === 0), 'other languages\' error logs untouched');
  await A.goto(BASE + '#/errors'); await A.waitForSelector('text=Error Log');
  ok((await A.content()).includes('Cases'), 'German error log shows the "Cases" category');

  /* 4. German writing checks (Italian speaker) */
  const w = await A.evaluate(() => { const a = LOS.writing.analyze('de', 'Heute ich arbeite im Krankenhaus. Ich komme nicht, weil ich habe keine Zeit. Ich habe 30 Jahre.', { level: 'A2' }); return { cats: a.errors.map((e) => e.cat), fixed: a.sentencesOut.map((s) => s.corrected) }; });
  ok(w.cats.filter((c) => c === 'wordorder').length >= 2 && w.cats.includes('interference'), `German writing: word order (V2, verb-final) and age interference detected (${w.cats})`);
  ok(w.fixed.includes('Heute arbeite ich im Krankenhaus.') && w.fixed.includes('Ich komme nicht, weil ich keine Zeit habe.') && w.fixed.includes('Ich bin 30 Jahre alt.'), 'German corrected versions are right');
  const f = await A.evaluate(() => LOS.writing.analyze('fr', 'Vous avez fièvre ? Le douleur est forte. Il faut que vous êtes à jeun.', { level: 'B1' }).sentencesOut.map((s) => s.corrected));
  ok(f.includes('Vous avez de la fièvre ?') && f.includes('La douleur est forte.') && f.includes('Il faut que vous soyez à jeun.'), `French writing: partitive, gender, subjonctif corrected (${f.join(' | ')})`);

  /* 5. vocabulary with article and plural, SRS per language */
  await A.evaluate(() => { LOS.learn.introduceVocab('de', ['de:der-termin']); LOS.learn.gradeVocab('de', 'de:der-termin', 2); LOS.learn.introduceVocab('fr', ['fr:la-voiture']); LOS.store.save(); });
  await waitSynced(A);
  const voc = await rows(A, 'vocabulary');
  ok(voc.some((r) => r.language_code === 'de' && r.item_key === 'de:der-termin') && voc.some((r) => r.language_code === 'fr' && r.item_key === 'fr:la-voiture'), 'German and French vocabulary saved with their language_code');
  ok(voc.every((r) => r.item_key.startsWith(r.language_code + ':')), 'no vocabulary row is filed under the wrong language');
  const card = await A.evaluate(() => { const c = LOS.learn.vocabCard('de', 'de:der-termin'); return c.v.w + ' — ' + c.v.pl; });
  ok(card === 'der Termin — die Termine', 'noun stored as "der Termin — die Termine"');
  const bare = await A.evaluate(() => LOS.learn.checkAnswer({ t: 'gap', a: ['der Termin'] }, 'Termin', 'de'));
  ok(!bare.correct && /article/.test(bare.note), 'answering a German noun without its article is not accepted');

  /* 6. placement test only for German */
  await A.evaluate(() => {
    const d = LOS.assessment.start('de', 1);
    for (let i = 0; i < 60; i++) { const c = LOS.assessment.current(d); if (c.done) break; if (c.special === 'writing') { LOS.assessment.submitWriting(d, 'Ich heiße Luca. Ich bin Arzt und ich wohne in Mailand. Ich lerne Deutsch.', 'A2'); continue; } if (c.special === 'speaking') { LOS.assessment.submitSpeaking(d, { A1: [true, true, true], A2: [true, false, false], B1: [false, false, false] }); continue; } LOS.assessment.answer(d, c.item.a); }
    LOS.assessment.finish(d);
  });
  await waitSynced(A);
  const asm = await rows(A, 'assessments');
  ok(asm.length === 1 && asm[0].language_code === 'de', 'placement result stored only for German');
  ok(await A.evaluate(() => LOS.store.lang('fr').assessments.length === 0 && LOS.store.lang('en').assessments.length === 0), 'other languages keep their own profile');

  /* 7. planner: realistic multi-language day */
  const plan = await A.evaluate(() => { const r = LOS.planner.ensureToday(true); return { budget: r.budget.minutes, langs: r.plans.map((p) => [p.code, p.plan.minutes]) }; });
  const tot = plan.langs.reduce((s, [, m]) => s + m, 0);
  ok(plan.langs.length >= 1 && tot <= plan.budget + 5 && plan.langs.every(([, m]) => m >= 10), `daily plan fits the budget (${plan.budget} min → ${JSON.stringify(plan.langs)})`);
  const short = await A.evaluate(() => LOS.planner.splitLanguages(LOS.util.today(), 20));
  ok(short.length === 1 && short[0].minutes === 20, 'short day → one language gets the whole session (minimum viable study)');
  const long = await A.evaluate(() => LOS.planner.splitLanguages(LOS.util.today(), 70));
  ok(long.length === 4 && long.reduce((s, x) => s + x.minutes, 0) === 70, `long day → all four languages share exactly the budget (${JSON.stringify(long)})`);
  await A.goto(BASE + '#/today'); await A.waitForSelector('h1:text("Today")');
  await A.screenshot({ path: SHOTS + 'l04-today.png', fullPage: true });

  /* 8. views: pronunciation, compare, think ladder, medical in German/French */
  await A.goto(BASE + '#/pronunciation'); await A.waitForSelector('text=Umlaute');
  ok(true, 'German pronunciation guide (umlauts, ich/ach-Laut…)');
  await A.click('button[data-act="toggle"][data-id="de-p-ch"]'); await A.waitForSelector('text=Ach-Laut');
  await A.screenshot({ path: SHOTS + 'l05-pron-de.png', fullPage: true });
  await A.evaluate(() => LOS.store.setActive('fr'));
  await A.goto(BASE + '#/pronunciation'); await A.waitForSelector('text=voyelles nasales');
  ok(true, 'French pronunciation guide (nasal vowels, liaison…)');
  await A.goto(BASE + '#/compare'); await A.waitForSelector('text=Duration up to now');
  const cmp = await A.textContent('.view');
  ok(['Lavoro qui da tre anni', 'I have been working', 'Llevo tres años', 'seit drei Jahren', 'depuis trois ans'].every((s) => cmp.includes(s)), 'compare view shows it/en/es/de/fr with explanations');
  await A.screenshot({ path: SHOTS + 'l06-compare.png', fullPage: true });
  await A.goto(BASE + '#/think'); await A.waitForSelector('text=Your ladder in French');
  ok(await A.isVisible('.ladder-step.on'), 'think ladder shows the current step for French');
  await A.goto(BASE + '#/medical'); await A.waitForSelector('text=interrogatoire');
  ok((await A.content()).includes('Consultation d') || (await A.content()).includes('consultation d'), 'French medical module (consultation d\'anesthésie…)');
  await A.evaluate(() => LOS.store.setActive('de'));
  await A.goto(BASE + '#/medical'); await A.waitForSelector('text=Anamnese');
  ok((await A.content()).includes('Übergabe'), 'German medical modules (Anamnese, Übergabe…)');

  /* 9. mobile: compact selector */
  const M = await device(browser, 'M', await A.evaluate(() => localStorage.getItem('__mockdb')), { viewport: { width: 390, height: 844 } });
  await M.goto(BASE + '#/login'); await M.waitForSelector('#email');
  await M.fill('#email', 'poly@example.com'); await M.fill('#pw', 'Poliglotta2026'); await M.click('button[type=submit]');
  await M.waitForSelector('.focus-card');
  ok(await M.isVisible('.topbar [data-lang-menu]'), 'mobile: language selector visible in the top bar');
  await M.click('.topbar [data-lang-menu]');
  await M.screenshot({ path: SHOTS + 'l07-mobile-menu.png' });
  const overflow = await M.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok(!overflow, 'mobile: no horizontal overflow');

  /* 10. device B: restore all four languages */
  await waitSynced(A);
  const B = await device(browser, 'B', await A.evaluate(() => localStorage.getItem('__mockdb')));
  await B.goto(BASE + '#/login'); await B.waitForSelector('#email');
  await B.fill('#email', 'poly@example.com'); await B.fill('#pw', 'Poliglotta2026'); await B.click('button[type=submit]');
  await B.waitForSelector('.focus-card');
  const restored = await B.evaluate(() => ({ codes: LOS.store.studying(), deErr: LOS.store.lang('de').errors.length, frErr: LOS.store.lang('fr').errors.length, deAsm: LOS.store.lang('de').assessments.length, deV: !!LOS.store.lang('de').vocab['de:der-termin'], frV: !!LOS.store.lang('fr').vocab['fr:la-voiture'], enV: Object.keys(LOS.store.lang('en').vocab).some((k) => !k.startsWith('en:')) }));
  ok(restored.codes.length === 4, `device B restores the four languages (${restored.codes})`);
  ok(restored.deErr >= 1 && restored.frErr === 0 && restored.deAsm === 1 && restored.deV && restored.frV && !restored.enV, 'device B: data restored and still separated by language');

  const errs = [].concat(A.errors, B.errors, M.errors).filter((e) => !/favicon|ERR_|net::/.test(e));
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? '\n' + errs.join('\n') : ''));
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exitCode = fails ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });

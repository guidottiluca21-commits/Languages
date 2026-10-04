/* Browser E2E with a mock Supabase backend (tests/mock-supabase.js) served instead of the real client.
 * Run: SUPABASE_URL=https://x.supabase.co SUPABASE_ANON_KEY=test npm run build; npx http-server dist -p 5180; node tests/e2e-cloud.js */
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:5180/';
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8');
const SHOTS = process.env.SHOTS || '/tmp/shots/';
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

async function device(browser, name, db) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await ctx.route('**/vendor/supabase.js', (r) => r.fulfill({ body: MOCK, contentType: 'application/javascript' }));
  if (db) await ctx.addInitScript((d) => { if (!localStorage.getItem('__mockdb')) localStorage.setItem('__mockdb', d); }, db);
  const page = await ctx.newPage();
  page.errors = []; page.devName = name; (global.__pages = global.__pages || []).push(page);
  page.on('pageerror', (e) => page.errors.push(name + ' PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(name + ' CONSOLE ' + m.text()); });
  return page;
}
const rows = (page, t) => page.evaluate((t) => (JSON.parse(localStorage.getItem('__mockdb')).tables[t] || []), t);
const waitSynced = (page) => page.waitForFunction(() => LOS.sync.info.status === 'synced' && LOS.sync.pendingCount() === 0, null, { timeout: 15000 });

(async () => {
  const browser = await chromium.launch();
  /* ---------------- Device A: sign-up → onboarding → data ---------------- */
  const A = await device(browser, 'A');
  await A.goto(BASE);
  await A.waitForSelector('text=Bentornato');
  ok(!(await A.$('.sidebar-inner a')), 'signed out: login screen only, no app shell or data');
  await A.screenshot({ path: SHOTS + 'c01-login.png' });
  await A.goto(BASE + '#/dashboard');
  await A.waitForTimeout(200);
  ok(A.url().endsWith('#/login'), 'protected route redirects to login when signed out');
  await A.click('text=Crea un account'); await A.waitForSelector('text=Crea il tuo account');
  await A.fill('#email', 'luca@example.com');
  await A.fill('#pw', 'short1');
  await A.fill('#pw2', 'short1');
  await A.click('button[type=submit]');
  ok(/troppo debole/.test(await A.textContent('.auth-msg')), 'weak password rejected with a clear message');
  await A.fill('#pw', 'Anestesia2026');
  await A.fill('#pw2', 'Anestesia2027');
  await A.click('button[type=submit]');
  ok(/non coincidono/.test(await A.textContent('.auth-msg')), 'password mismatch detected');
  await A.screenshot({ path: SHOTS + 'c02-signup.png' });
  await A.fill('#pw2', 'Anestesia2026');
  await A.click('button[type=submit]');
  await A.waitForSelector('text=Let\'s build your');
  ok(true, 'sign-up → signed in → onboarding');
  await A.click('text=Begin');
  await A.click('button.choice[data-v="en"]');
  await A.click('button.choice[data-v="es"]');
  await A.fill('#o-name', 'Luca');
  await A.selectOption('#o-native', 'it');
  await A.click('button[data-act="next"]');
  await A.click('button[data-act="est"][data-l="en"][data-v="3"]');
  await A.click('button[data-act="est"][data-l="es"][data-v="1"]');
  await A.screenshot({ path: SHOTS + 'c03-levels.png' });
  await A.click('button[data-act="next"]');
  await A.click('button[data-act="skipTest"]');
  await A.click('button.choice[data-v="medical"]');
  await A.click('button[data-act="next"]');
  await A.click('button[data-act="next"]');
  await A.click('button[data-act="next"]');
  await A.click('button[data-act="generate"]');
  await A.waitForSelector('.focus-card');
  await waitSynced(A);
  const lp = await rows(A, 'language_profiles');
  ok(lp.length === 2 && lp.some((r) => r.language === 'en') && lp.some((r) => r.language === 'es'), 'a language_profile row exists for each chosen language (en, es)');
  ok((await rows(A, 'profiles'))[0].display_name === 'Luca' && (await rows(A, 'profiles'))[0].native_language === 'it', 'profile (display name, native language) saved to the database');
  ok(lp.find((r) => r.language === 'es').current_level.startsWith('A2') && lp.find((r) => r.language === 'en').current_level.startsWith('B2'), 'independent levels per language (EN B2, ES A2)');
  await A.screenshot({ path: SHOTS + 'c04-dashboard.png' });
  ok(/Sincronizzato/.test(await A.textContent('.sidebar [data-sync-pill]')), 'sync indicator shows "Online · Sincronizzato"');

  // add a word (English), log listening, change calendar, settings
  await A.goto(BASE + '#/vocabulary/add');
  await A.fill('#v-w', 'bottleneck');
  await A.fill('#v-tr', 'collo di bottiglia');
  await A.click('#addv button[type=submit]');
  await A.goto(BASE + '#/practice/listening/external');
  await A.fill('#f-title', 'TED talk on sleep');
  await A.fill('#f-url', 'https://www.youtube.com/watch?v=abcdefghijk');
  await A.click('[data-act="save"]');
  await A.waitForSelector('.complete-mark');
  await A.evaluate(() => { LOS.store.state.schedule.overrides[LOS.util.addDays(LOS.util.today(), 1)] = { type: 'night', start: '20:00', end: '08:00' }; LOS.store.state.time.target = 50; LOS.store.save(); });
  await waitSynced(A);
  const vocab = await rows(A, 'vocabulary');
  ok(vocab.some((r) => r.word === 'bottleneck' && r.language === 'en' && r.is_custom), 'new word saved to the database (vocabulary, language=en)');
  ok((await rows(A, 'listening_content')).some((r) => r.url.includes('youtube') && r.language === 'en'), 'YouTube listening entry saved');
  ok((await rows(A, 'study_sessions')).length >= 1, 'completed session saved (study_sessions)');
  ok((await rows(A, 'work_schedule')).some((r) => r.type === 'night'), 'calendar change saved (work_schedule)');
  ok((await rows(A, 'user_settings'))[0].daily_target === 50, 'settings change saved (user_settings)');

  /* ---------------- offline → queued → back online ---------------- */
  await A.evaluate(() => { window.__mockOffline = true; window.dispatchEvent(new Event('offline')); });
  await A.evaluate(() => { const it = LOS.learn.addCustomVocab('en', { w: 'offline word', tr: 'parola offline' }); LOS.learn.introduceVocab('en', [it.id]); LOS.store.save(); });
  await A.waitForTimeout(1600);
  const pillOff = await A.textContent('.sidebar [data-sync-pill]');
  ok(/Offline · \d+ modific/.test(pillOff), 'offline: indicator shows pending changes ("' + pillOff.trim() + '")');
  ok(!(await rows(A, 'vocabulary')).some((r) => r.word === 'offline word'), 'offline: change not yet in the database, app still usable');
  await A.screenshot({ path: SHOTS + 'c05-offline.png' });
  await A.evaluate(() => { sessionStorage.setItem('__mockOffline', '1'); location.hash = '#/dashboard'; });
  await A.reload();
  await A.waitForSelector('.focus-card');
  ok(await A.evaluate(() => LOS.store.state.langs.en.custom.some((c) => c.w === 'offline word')), 'still offline after closing/reopening: app opens from the local cache with the pending change');
  ok(!(await rows(A, 'vocabulary')).some((r) => r.word === 'offline word'), 'still offline: nothing lost, nothing sent yet');
  await A.evaluate(() => { sessionStorage.removeItem('__mockOffline'); window.__mockOffline = false; window.dispatchEvent(new Event('online')); });
  await waitSynced(A);
  ok((await rows(A, 'vocabulary')).some((r) => r.word === 'offline word'), 'back online: queued change synced to the database');

  /* ---------------- logout ---------------- */
  const uidA = await A.evaluate(() => LOS.auth.userId);
  await A.goto(BASE + '#/settings');
  await A.click('[data-act="logout"]');
  await A.waitForSelector('text=Bentornato');
  ok(await A.evaluate((u) => !localStorage.getItem('los:cache:v1:' + u), uidA), 'logout removes the local copy of the data from this device');
  ok((await rows(A, 'vocabulary')).length > 0, 'logout keeps the data in the cloud');
  const dbDump = await A.evaluate(() => localStorage.getItem('__mockdb'));

  /* ---------------- Device B (e.g. iPhone): login → data restored ---------------- */
  const B = await device(browser, 'B', dbDump);
  await B.setViewportSize({ width: 390, height: 844 });
  await B.goto(BASE);
  await B.waitForSelector('#email');
  await B.fill('#email', 'luca@example.com');
  await B.fill('#pw', 'wrong-password-1');
  await B.click('button[type=submit]');
  await B.waitForFunction(() => document.querySelector('.auth-msg').textContent.length > 5);
  ok((await B.textContent('.auth-msg')).includes('Email o password non corrette.'), 'wrong credentials → "Email o password non corrette."');
  await B.fill('#pw', 'Anestesia2026');
  await B.click('button[type=submit]');
  await B.waitForSelector('.focus-card');
  await B.screenshot({ path: SHOTS + 'c06-deviceB-mobile.png' });
  ok((await B.textContent('.greet')).includes('Luca'), 'device B: personalised dashboard with the user name');
  const enCustom = await B.evaluate(() => LOS.store.state.langs.en.custom.map((c) => c.w));
  const esCustom = await B.evaluate(() => LOS.store.state.langs.es.custom.map((c) => c.w));
  ok(enCustom.includes('bottleneck') && enCustom.includes('offline word'), 'device B: words added on device A are there');
  ok(!esCustom.includes('bottleneck'), 'device B: English words do not leak into Spanish');
  ok(await B.evaluate(() => LOS.store.state.langs.en.listening.length === 1 && LOS.store.state.time.target === 50 && Object.values(LOS.store.state.schedule.overrides).some((o) => o.type === 'night')), 'device B: listening log, settings and calendar restored');
  ok(await B.evaluate(() => LOS.store.state.langs.en.sessions.length >= 1), 'device B: study history restored');

  /* ---------------- second user: isolation + account deletion ---------------- */
  await B.evaluate(() => LOS.app.logout(true));
  await B.waitForSelector('text=Bentornato');
  await B.click('text=Crea un account'); await B.waitForSelector('text=Crea il tuo account');
  await B.fill('#email', 'other@example.com'); await B.fill('#pw', 'Altrachiave99xq'); await B.fill('#pw2', 'Altrachiave99xq');
  await B.click('button[type=submit]');
  await B.waitForSelector('text=Let\'s build your');
  ok(await B.evaluate(() => Object.keys(LOS.store.state.langs).length === 0), 'second user starts empty (sees none of user A data)');
  const uidC = await B.evaluate(() => LOS.auth.userId);
  const attack = await B.evaluate(async (a) => (await LOS.auth.client.from('vocabulary').upsert([{ user_id: a, language: 'en', item_key: 'x', word: 'hack' }], { onConflict: 'user_id,language,item_key' })).error, uidA);
  ok(attack && attack.code === '42501', 'writing a row with another user_id is refused (RLS, also proven on real Postgres)');
  await B.goto(BASE + '#/welcome');
  await B.evaluate(() => { LOS.store.state.settings.onboarded = true; LOS.store.ensureLang('en').onboarded = true; LOS.assessment.fromEstimate('en', 2); LOS.store.save(true); });
  await waitSynced(B);
  ok((await rows(B, 'language_profiles')).filter((r) => r.user_id === uidC).length === 1, 'second user has own rows');
  await B.goto(BASE + '#/settings');
  await B.click('[data-act="deleteAccount"]');
  await B.fill('#del-confirm', 'ELIMINA');
  await B.click('.modal [data-ok]');
  await B.waitForSelector('text=Account e dati eliminati');
  const left = await B.evaluate((u) => { const db = JSON.parse(localStorage.getItem('__mockdb')); return Object.values(db.tables).flat().filter((r) => r.user_id === u).length + db.users.filter((x) => x.id === u).length; }, uidC);
  ok(left === 0, 'delete account removes the user and all their rows');
  ok((await rows(B, 'vocabulary')).some((r) => r.user_id === uidA), 'deleting one account leaves other users untouched');

  /* ---------------- session expiry keeps pending work ---------------- */
  await B.fill('#email', 'luca@example.com'); await B.fill('#pw', 'Anestesia2026');
  await B.click('button[type=submit]');
  await B.waitForSelector('.focus-card');
  B.on('console', (m) => { if (process.env.DEBUG) console.log('B>', m.text().slice(0, 200)); });
  await B.evaluate(() => { window.__mockExpire = true; const it = LOS.learn.addCustomVocab('en', { w: 'expired word' }); LOS.learn.introduceVocab('en', [it.id]); LOS.store.save(); });
  await B.waitForSelector('text=La sessione è scaduta', { timeout: 10000 });
  ok(true, 'expired session → back to login with a clear message');
  await B.evaluate(() => { window.__mockExpire = false; });
  await B.fill('#email', 'luca@example.com'); await B.fill('#pw', 'Anestesia2026');
  await B.click('button[type=submit]');
  await B.waitForSelector('.focus-card');
  await waitSynced(B);
  ok((await rows(B, 'vocabulary')).some((r) => r.word === 'expired word'), 'after re-login the change made during the expired session is synced (no data loss)');

  /* ---------------- email confirmation flow ---------------- */
  const C = await device(browser, 'C');
  await C.goto(BASE);
  await C.evaluate(() => { window.__mockConfirm = true; });
  await C.click('text=Crea un account'); await C.waitForSelector('text=Crea il tuo account');
  await C.fill('#email', 'new@example.com'); await C.fill('#pw', 'Nuovachiave77qz'); await C.fill('#pw2', 'Nuovachiave77qz');
  await C.click('button[type=submit]');
  await C.waitForSelector('text=Controlla la tua email');
  ok(true, 'email confirmation required → "Controlla la tua email" screen');
  await C.click('text=Vai al login'); await C.waitForSelector('text=Bentornato');
  await C.fill('#email', 'new@example.com'); await C.fill('#pw', 'Nuovachiave77qz');
  await C.click('button[type=submit]');
  await C.waitForFunction(() => document.querySelector('.auth-msg').textContent.length > 5);
  ok((await C.textContent('.auth-msg')).includes('confermare'), 'unconfirmed login → asks to confirm the email');
  await C.click('text=Password dimenticata?'); await C.waitForSelector('text=Recupera la password');
  await C.fill('#email', 'new@example.com');
  await C.click('button[type=submit]');
  await C.waitForFunction(() => document.querySelector('.auth-msg').textContent.length > 5);
  ok((await C.textContent('.auth-msg')).includes('Se esiste un account'), 'password reset request (no account enumeration)');

  const errs = [].concat(A.errors, B.errors, C.errors).filter((e) => !/Failed to load resource/.test(e));
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ':\n  ' + errs.join('\n  ') : ''));
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exitCode = fails ? 1 : 0;
})().catch(async (e) => { console.error(e); for (const p of (global.__pages || [])) { try { await p.screenshot({ path: SHOTS + 'fail-' + p.devName + '.png' }); console.log(p.devName, 'url=', p.url(), 'errors=', p.errors, 'text=', (await p.textContent('body')).slice(0, 400)); } catch (x) {} } process.exit(1); });

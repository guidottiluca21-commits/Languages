/* Browser E2E: every learning activity runs to completion while signed in (mock Supabase backend).
 * LANG=en|es|de|fr selects the language (default en). */
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const SHOTS = process.env.SHOTS || '/tmp/shots/';
const URL = 'http://localhost:5180/';
const L = process.env.LANG_CODE || 'en';
const ROUTES = {
  en: ['practice/grammar/en-cond-3/learn', 'practice/reading/en-t-b2-4day', 'practice/listening/en-t-b1-wfh', 'practice/writing/en-w-b2-essay', 'practice/speaking/en-s-b2-explain', 'practice/scenario/en-med-handover/0', 'practice/scenario/en-pro-emails/0'],
  es: ['practice/grammar/es-cond-3/learn', 'practice/reading/es-t-b1-sueno', 'practice/listening/es-t-b1-teletrabajo', 'practice/writing/es-w-b2-ensayo', 'practice/speaking/es-s-b2-explicar', 'practice/scenario/es-med-pase/0', 'practice/scenario/es-pro-correos/0'],
  de: ['practice/grammar/de-adjektiv/learn', 'practice/reading/de-t-b2-antibiotika', 'practice/listening/de-t-b1-homeoffice', 'practice/writing/de-w-b2-eroerterung', 'practice/speaking/de-s-b2-team', 'practice/scenario/de-med-uebergabe/0', 'practice/scenario/de-pro-mails/0'],
  fr: ['practice/grammar/fr-subjonctif/learn', 'practice/reading/fr-t-b2-antibiotiques', 'practice/listening/fr-t-b1-teletravail', 'practice/writing/fr-w-b2-essai', 'practice/speaking/fr-s-b2-equipe', 'practice/scenario/fr-med-transmissions/0', 'practice/scenario/fr-pro-courriels/0'],
};
const MOCK = require('fs').readFileSync(__dirname + '/mock-supabase.js', 'utf8');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await ctx.route('**/vendor/supabase.js', (r) => r.fulfill({ body: MOCK, contentType: 'application/javascript' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push('CONSOLE ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(URL);
  await page.waitForSelector('#email'); await page.click('text=Crea un account'); await page.waitForSelector('text=Crea il tuo account');
  await page.fill('#email', `learner-${L}@example.com`); await page.fill('#pw', 'Zmqxkw2026tt'); await page.fill('#pw2', 'Zmqxkw2026tt'); await page.click('button[type=submit]');
  await page.click('text=Begin'); await page.click(`button.choice[data-v="${L}"]`); await page.click('button[data-act="next"]');
  await page.click(`button[data-act="est"][data-l="${L}"][data-v="3"]`); await page.click('button[data-act="next"]');
  await page.click('button[data-act="skipTest"]');
  await page.click('button.choice[data-v="medical"]'); await page.click('button[data-act="next"]');
  await page.click('button[data-act="next"]'); await page.click('button[data-act="next"]'); await page.click('button[data-act="generate"]');
  await page.waitForTimeout(300);
  // generic driver: click whatever is actionable until done screen
  async function drive(label, max = 80) {
    for (let i = 0; i < max; i++) {
      await page.waitForTimeout(60);
      if (await page.$('.complete-mark')) { await page.screenshot({ path: SHOTS + 'done-' + label + '.png' }); return 'done'; }
      const b = page.locator('.runner-body');
      const tryClick = async (sel) => { const el = await page.$('.runner-body ' + sel); if (el && await el.isVisible() && await el.isEnabled()) { await el.click(); return true; } return false; };
      if (i === 2) await page.screenshot({ path: SHOTS + 'run-' + label + '.png' });
      const inp = await page.$('.runner-body #ans:not([readonly])');
      if (inp) { await inp.fill('test answer'); if (await tryClick('[data-act="submit"]') || await tryClick('[data-act="vsubmit"]') || await tryClick('[data-act="esubmit"]')) continue; }
      for (const id of ['#prod', '#sum', '#sct', '#ta', '#tr']) { const t = await page.$('.runner-body ' + id); if (t && !(await t.inputValue())) await t.fill('I have been working here since two years and I am agree with the plan. However, the patients is fine.'); }
      const wt = await page.$('.runner-body #wt');
      if (wt && !(await wt.inputValue())) { await wt.fill('I write you because I want discuss about the new rota. The life in hospital is hard. People is tired. However, we should take into account the wellbeing of staff, whereas costs are significant. In my opinion I think we need more informations.'); await tryClick('[data-act="check"]'); await page.screenshot({ path: SHOTS + 'run-writing-feedback.png', fullPage: true }); await tryClick('[data-act="finish"]'); continue; }
      // Engine 2.0 exercise kinds: match pairs, build the sentence
      const mw = await page.$$('.runner-body [data-act="mw"]:not([disabled])');
      if (mw.length) { await mw[0].click(); const mt = await page.$$('.runner-body [data-act="mt"]:not([disabled])'); if (mt.length) await mt[i % mt.length].click(); continue; }
      if (await tryClick('[data-act="tok"]:not([disabled])')) continue;
      const order = ['[data-act="got"]', '[data-act="learnFirst"]', '[data-act="learn"]', '[data-act="shortTask"]', '[data-act="rep"][data-v="1"]', '[data-act="submit"]:not([disabled])', '[data-act="start"]','[data-act="go"]','[data-act="toQ"]','[data-act="opt"]','[data-act="vopt"]','[data-act="grade"][data-g="2"]','[data-act="next"]','[data-act="nextMeet"]','[data-act="toSum"]','[data-act="play"]','[data-act="finishDrill"][data-enter]','[data-act="done"]','[data-act="skipToType"]','[data-act="save"]','[data-act="analyse"]','[data-act="self"][data-v="2"]','[data-act="toQuiz"]','[data-act="saveW"]','[data-act="checkW"]','[data-act="finish"]','[data-act="fin"]','[data-act="finishEmpty"]'];
      let clicked = false;
      for (const s of order) { if (await tryClick(s)) { clicked = true; break; } }
      if (!clicked) { await page.screenshot({ path: SHOTS + 'stuck-' + label + '.png', fullPage: true }); return 'stuck'; }
    }
    return 'maxed';
  }
  const R = ROUTES[L];
  const BASICS = L + '-med-' + { en: 'basics', es: 'basicos', de: 'grundlagen', fr: 'bases' }[L];
  const LOS_W = R[3].split('/').pop();
  const routes = [R[0], 'practice/vocab/new', 'practice/review/all', R[1], R[2], 'practice/listening/external', R[3], R[4], 'practice/think/mix', R[5], R[6],
    'practice/lesson/scenario/' + BASICS, 'practice/scenario/' + BASICS + '/0', 'practice/lesson/writing/' + LOS_W,
    'practice/micro/controlled', 'practice/micro/application', 'practice/micro/dialogue', 'practice/micro/sentence', 'practice/remedy', 'practice/vocab/new', 'practice/review/all'];
  for (const r of routes) { await page.goto(URL + '#/' + r); await page.waitForTimeout(200); console.log(r, await drive(r.replace(/\//g, '_'))); }
  // today session from plan
  await page.goto(URL + '#/today'); await page.waitForTimeout(200);
  for (let k = 0; k < 8; k++) {
    await page.goto(URL + '#/today'); await page.waitForTimeout(200);
    const t = await page.$('.today-item:not(.optional) .tick[data-act="go"]'); if (!t) break;
    const ty = await page.evaluate(() => { const c = LOS.store.active(); const p = LOS.store.lang(c).plans[LOS.util.today()]; const it = p.items.find((i) => i.status === 'pending'); return it && it.type; });
    await t.click(); console.log('plan item', ty, await drive('plan-' + k));
  }
  console.log('plan state:', await page.evaluate(() => { const c = LOS.store.active(); const p = LOS.store.lang(c).plans[LOS.util.today()]; return JSON.stringify({ items: p.items.map((i) => i.type + ':' + i.status), challenge: p.challenge && p.challenge.type, completed: !!p.completedAt }); }));
  // pathway view + engine state checks
  await page.goto(URL + '#/medical'); await page.waitForTimeout(250); await page.screenshot({ path: SHOTS + 'after-medical-pathway.png', fullPage: true });
  const pathOk = await page.evaluate(() => document.querySelectorAll('.path-step').length);
  console.log('pathway steps shown:', pathOk);
  console.log('engine:', await page.evaluate((b) => { const c = LOS.store.active(); const L = LOS.store.lang(c); const st = Object.values(L.vocab).map((v) => LOS.ped.vstage(v)); const pw = LOS.ped.pathway(c, 'medical'); return JSON.stringify({ stages: [0,1,2,3,4,5,6,7].map((k) => st.filter((x) => x === k).length), tasks: Object.keys(L.tasks || {}).length, basics: pw.steps[0].known + '/' + pw.steps[0].total + ' ' + pw.steps[0].state, prod: L.prod }); }, BASICS));
  for (const r of ['dashboard', 'errors', 'vocabulary', 'progress', 'review']) { await page.goto(URL + '#/' + r); await page.waitForTimeout(200); await page.screenshot({ path: SHOTS + 'after-' + r + '.png', fullPage: true }); }
  // weekly review submit
  await page.goto(URL + '#/review'); await page.click('#wr button[type="submit"]'); await page.waitForTimeout(300); await page.screenshot({ path: SHOTS + 'after-review-next.png', fullPage: true });
  // mobile
  await page.setViewportSize({ width: 390, height: 844 });
  for (const r of ['dashboard', 'calendar', 'practice/writing/free']) { await page.goto(URL + '#/' + r); await page.waitForTimeout(250); await page.screenshot({ path: SHOTS + 'm-' + r.replace(/\//g,'_') + '.png', fullPage: false }); }
  // dark
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => LOS.app.setTheme('dark')); await page.goto(URL + '#/dashboard'); await page.waitForTimeout(250); await page.screenshot({ path: SHOTS + 'dark-dashboard.png' });
  const json = await page.evaluate(() => LOS.store.exportJSON());
  await page.evaluate((j) => LOS.store.importJSON(j), json);
  await page.waitForFunction(() => LOS.sync.info.status === 'synced' && LOS.sync.pendingCount() === 0, null, { timeout: 15000 });
  console.log('synced after all activities:', await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('__mockdb')).tables).map(([k, v]) => [k, v.length])))));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();

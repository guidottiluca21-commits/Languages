/* Browser E2E: every learning activity runs to completion while signed in (mock Supabase backend). */
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const SHOTS = process.env.SHOTS || '/tmp/shots/';
const URL = 'http://localhost:5180/';
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
  await page.fill('#email', 'learner@example.com'); await page.fill('#pw', 'Zmqxkw2026tt'); await page.fill('#pw2', 'Zmqxkw2026tt'); await page.click('button[type=submit]');
  await page.click('text=Begin'); await page.click('button.choice[data-v="en"]'); await page.click('button[data-act="next"]');
  await page.click('button[data-act="est"][data-l="en"][data-v="3"]'); await page.click('button[data-act="next"]');
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
      const order = ['[data-act="start"]','[data-act="go"]','[data-act="toQ"]','[data-act="opt"]','[data-act="vopt"]','[data-act="grade"][data-g="2"]','[data-act="next"]','[data-act="nextMeet"]','[data-act="toSum"]','[data-act="play"]','[data-act="finishDrill"][data-enter]','[data-act="done"]','[data-act="skipToType"]','[data-act="save"]','[data-act="analyse"]','[data-act="self"][data-v="2"]','[data-act="toQuiz"]','[data-act="saveW"]','[data-act="checkW"]','[data-act="finish"]','[data-act="fin"]','[data-act="finishEmpty"]'];
      let clicked = false;
      for (const s of order) { if (await tryClick(s)) { clicked = true; break; } }
      if (!clicked) { await page.screenshot({ path: SHOTS + 'stuck-' + label + '.png', fullPage: true }); return 'stuck'; }
    }
    return 'maxed';
  }
  const routes = ['practice/grammar/en-cond-3/learn', 'practice/vocab/new', 'practice/review/all', 'practice/reading/en-t-b2-4day', 'practice/listening/en-t-b1-wfh', 'practice/listening/external', 'practice/writing/en-w-b2-essay', 'practice/speaking/en-s-b2-explain', 'practice/think/mix', 'practice/scenario/en-med-handover/0', 'practice/scenario/en-pro-emails/0'];
  for (const r of routes) { await page.goto(URL + '#/' + r); await page.waitForTimeout(200); console.log(r, await drive(r.replace(/\//g, '_'))); }
  // today session from plan
  await page.goto(URL + '#/today'); await page.waitForTimeout(200);
  const t = await page.$('.today-item .tick[data-act="go"]'); if (t) { await t.click(); console.log('plan item', await drive('plan')); }
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

/* APP — boot, route guards, auth lifecycle, theme, global wiring.
 *
 * Boot:  config check → Supabase Auth session → (signed out) login screen, no data loaded
 *                                              → (signed in) cached copy shown at once, then
 *                                                push pending changes → pull from the cloud. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const AUTH_ROUTES = ['login', 'signup', 'forgot', 'check-email', 'reset-password'];
  const BUSY_ROUTES = ['session', 'practice', 'assessment', 'welcome'];
  let current = null;
  let phase = 'boot'; // boot | config | auth | loading | app
  let uid = null;
  let lastDay = U.today();
  let lastPull = 0;

  const main = () => document.getElementById('view');
  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || 'dashboard', params: parts.slice(1) };
  }
  function raw(html) {
    if (current && current.view.unmount) { try { current.view.unmount(); } catch (e) { /* ignore */ } }
    current = null;
    document.body.classList.add('no-shell');
    main().innerHTML = html;
  }

  function closeDrawer() {
    document.getElementById('sidebar').classList.remove('open');
    const scrim = document.getElementById('scrim');
    scrim.classList.remove('show');
    setTimeout(() => { if (!scrim.classList.contains('show')) scrim.hidden = true; }, 200);
  }
  function openDrawer() {
    const scrim = document.getElementById('scrim');
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('show'));
    document.getElementById('sidebar').classList.add('open');
    const first = document.querySelector('#sidebar a, #sidebar button');
    if (first) first.focus();
  }

  /* ---------------- rendering with guards ---------------- */
  function render(opts = {}) {
    if (phase === 'boot' || phase === 'config' || phase === 'loading') return;
    const { name, params } = parse();
    const signedIn = !!LOS.auth.user && phase !== 'auth';
    if (!signedIn) {
      if (!AUTH_ROUTES.includes(name) || name === 'reset-password' && !LOS.auth.recovery) { location.replace('#/login'); return; }
    } else {
      if (LOS.auth.recovery && name !== 'reset-password') { location.replace('#/reset-password'); return; }
      if (phase !== 'app' && name !== 'reset-password') return;
      if (AUTH_ROUTES.includes(name) && name !== 'reset-password') { location.replace('#/dashboard'); return; }
      if (!LOS.store.state.settings.onboarded && name !== 'welcome' && name !== 'reset-password' && !(name === 'assessment' && params[0] === 'onb')) { location.replace('#/welcome'); return; }
    }
    const view = LOS.views[name] || LOS.views.dashboard;
    const sameRoute = current && current.name === name && current.params.join('/') === params.join('/');
    const scrollY = opts.keepScroll && sameRoute ? window.scrollY : 0;
    if (current && current.view.unmount) { try { current.view.unmount(); } catch (e) { console.error(e); } }
    const shell = signedIn && phase === 'app' && (typeof view.shell === 'function' ? view.shell(params) : view.shell !== false);
    document.body.classList.toggle('no-shell', !shell);
    if (shell) LOS.shell.render(name);
    try {
      main().innerHTML = view.render(params);
      const root = main().firstElementChild || main();
      if (view.mount) view.mount(root, params);
    } catch (e) {
      console.error(e);
      main().innerHTML = `<div class="view narrow">${ui.empty({ icon: 'errors', title: 'Something went wrong', text: U.esc(LOS.errors.friendly(e)), action: '<a class="btn" href="#/dashboard">Dashboard</a>' })}</div>`;
    }
    ui.animateBars(main());
    current = { view, name, params };
    document.title = `${view.title || 'Lingua OS'} · Lingua OS`;
    closeDrawer();
    window.scrollTo(0, scrollY);
    if (!opts.keepScroll && !sameRoute) { try { main().focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    updateSyncPills(LOS.sync.info);
  }

  /* ---------------- theme ---------------- */
  function effectiveDark() {
    const t = LOS.store.state.settings.theme;
    return t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t || 'system');
    try { localStorage.setItem('los:theme', t || 'system'); } catch (e) { /* ignore */ }
  }
  function setTheme(t) { LOS.store.state.settings.theme = t; applyTheme(t); LOS.store.save(); }

  /* ---------------- sync status indicator ---------------- */
  function updateSyncPills(i) {
    const label = LOS.sync.label(i);
    const cls = i.status === 'synced' ? 'ok' : i.status === 'offline' || i.status === 'pending' || i.status === 'syncing' ? 'wait' : i.status === 'idle' ? '' : 'bad';
    document.querySelectorAll('[data-sync-pill]').forEach((el) => {
      el.className = 'sync-pill ' + cls;
      el.title = i.message || label;
      const t = el.querySelector('.t');
      if (t) t.textContent = label;
      el.hidden = !label;
    });
  }

  /* ---------------- user lifecycle ---------------- */
  async function startUser(user) {
    if (uid === user.id) return; // already started (or starting) for this user
    uid = user.id;
    const cached = LOS.sync.startFromCache(uid);
    applyTheme(LOS.store.state.settings.theme);
    if (cached) {
      phase = 'app';
      safeEnsureToday();
      render();
      pullFromServer(true);
      return;
    }
    phase = 'loading';
    raw(LOS.authUI.loading('Caricamento dei tuoi dati…'));
    try {
      await LOS.sync.pull();
    } catch (e) {
      if (uid !== user.id) return;
      const k = LOS.errors.kind(e);
      raw(k === 'network' ? LOS.authUI.offlineNoData() : LOS.authUI.loading(LOS.errors.friendly(e)).replace('<div class="spinner" aria-hidden="true"></div>', ''));
      if (k !== 'network') main().querySelector('.onb-inner').insertAdjacentHTML('beforeend', '<div class="cluster" style="justify-content:center"><button class="btn primary" id="retry">Riprova</button><button class="btn ghost" id="out">Esci</button></div>');
      const r = main().querySelector('#retry'); if (r) r.addEventListener('click', () => { uid = null; startUser(user); });
      const o = main().querySelector('#out'); if (o) o.addEventListener('click', () => logout(true));
      return;
    }
    if (uid !== user.id) return;
    phase = 'app';
    applyTheme(LOS.store.state.settings.theme);
    await offerLegacyImport();
    safeEnsureToday();
    render();
  }
  function safeEnsureToday() {
    if (!LOS.store.state.settings.onboarded) return;
    try { LOS.planner.ensureToday(); } catch (e) { console.error(e); }
  }
  /** Background refresh (another device may have changed data). Never while an activity is open. */
  async function pullFromServer(force) {
    if (phase !== 'app' || !LOS.auth.user) return;
    if (!force && Date.now() - lastPull < 60000) return;
    if (current && BUSY_ROUTES.includes(current.name)) { LOS.sync.flush(); return; }
    lastPull = Date.now();
    try {
      const pulled = await LOS.sync.pull();
      if (pulled && !(current && BUSY_ROUTES.includes(current.name))) { safeEnsureToday(); render({ keepScroll: true }); }
    } catch (e) { /* status indicator already shows the problem; the cached copy stays usable */ }
  }
  async function offerLegacyImport() {
    const legacy = LOS.store.legacyData();
    if (!legacy || LOS.store.state.settings.onboarded) return;
    try { if (localStorage.getItem('los:legacy-dismissed:' + uid)) return; } catch (e) { /* ignore */ }
    const yes = await ui.confirm('Dati trovati su questo dispositivo', 'Su questo browser ci sono progressi salvati dalla versione precedente di Lingua OS (senza account). Vuoi importarli nel tuo account? Verranno sincronizzati su tutti i tuoi dispositivi.', 'Importa');
    if (yes) { LOS.store.importJSON(JSON.stringify(legacy)); LOS.store.dropLegacy(); ui.toast('Progressi importati nel tuo account'); }
    else { try { localStorage.setItem('los:legacy-dismissed:' + uid, '1'); } catch (e) { /* ignore */ } }
  }
  function teardown(message) {
    uid = null;
    phase = 'auth';
    LOS.store.replace(LOS.store.defaultState());
    if (message) LOS.authUI.setFlash(message);
    if (parse().name !== 'login') location.hash = '#/login'; else render();
  }
  async function logout(skipCheck) {
    if (!skipCheck) {
      if (LOS.sync.pendingCount()) await LOS.sync.flush();
      const n = LOS.sync.pendingCount();
      if (n && !(await ui.confirm('Modifiche non sincronizzate', `${n} modific${n === 1 ? 'a non è ancora stata salvata' : 'he non sono ancora state salvate'} nel cloud (forse sei offline). Se esci ora, andranno perse.`, 'Esci comunque', true))) return;
    }
    LOS.sync.stop(true); // remove this user's cached copy from this device
    try { await LOS.auth.signOut(); } catch (e) { /* signed out locally anyway */ }
    teardown({ type: 'ok', text: 'Sei uscito. A presto!' });
  }
  async function deleteAccount() {
    await LOS.auth.deleteAccount();
    LOS.sync.stop(true);
    teardown({ type: 'ok', text: 'Account e dati eliminati definitivamente.' });
  }

  LOS.app = {
    get phase() { return phase; },
    refresh(full) { if (full) current = null; render({ keepScroll: !full }); },
    setTheme,
    go(hash) { location.hash = hash; },
    logout,
    deleteAccount,
    syncNow: () => pullFromServer(true),
    afterRecovery() { location.hash = '#/dashboard'; if (phase !== 'app' && LOS.auth.user) startUser(LOS.auth.user); else render(); },
  };

  function checkDayChange() {
    const d = U.today();
    if (d !== lastDay) {
      lastDay = d;
      safeEnsureToday();
      if (current && !BUSY_ROUTES.includes(current.name)) render({ keepScroll: true });
    }
  }

  function closeLangMenu(btn) { btn.setAttribute('aria-expanded', 'false'); if (btn.nextElementSibling) btn.nextElementSibling.hidden = true; }

  function wireGlobals() {
    // any language switch (selector, dashboard card, settings) refreshes the current view with that language's data
    LOS.bus.on('lang-changed', () => { if (phase === 'app' && current && !['session', 'practice', 'assessment'].includes(current.name)) render({ keepScroll: true }); });
    window.addEventListener('hashchange', () => render());
    document.addEventListener('click', (e) => {
      const trig = e.target.closest('[data-lang-menu]');
      document.querySelectorAll('[data-lang-menu]').forEach((b) => { if (b !== trig) closeLangMenu(b); });
      if (trig) { const open = trig.getAttribute('aria-expanded') !== 'true'; if (open) { trig.setAttribute('aria-expanded', 'true'); trig.nextElementSibling.hidden = false; const f = trig.nextElementSibling.querySelector('.active, .lang-opt'); if (f) f.focus(); } else closeLangMenu(trig); return; }
      const lang = e.target.closest('[data-lang]');
      if (lang) {
        const c = lang.dataset.lang;
        if (c === LOS.store.active()) return;
        LOS.store.setActive(c);
        const n = current && current.name;
        if (['session', 'practice', 'assessment'].includes(n) || (current && current.params.length && ['grammar', 'medical', 'professional'].includes(n))) location.hash = '#/' + (n === 'grammar' ? 'grammar' : n === 'medical' || n === 'professional' ? n : 'dashboard');
        // otherwise the 'lang-changed' listener re-renders the current view for the new language
        return;
      }
      if (e.target.closest('[data-drawer]')) { openDrawer(); return; }
      if (e.target.closest('#scrim')) { closeDrawer(); return; }
      if (e.target.closest('[data-sync-pill]')) { pullFromServer(true); return; }
      const bn = e.target.closest('[data-bn]');
      if (bn) {
        const r = bn.dataset.bn;
        if (r === 'more') openDrawer();
        else if (r === 'practice') location.hash = '#/practice/review/all';
        else location.hash = '#/' + r;
        return;
      }
      if (e.target.closest('[data-theme-toggle]')) { setTheme(effectiveDark() ? 'light' : 'dark'); LOS.shell.render(current ? current.name : 'dashboard'); return; }
      if (e.target.closest('#sidebar a')) closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const openMenu = document.querySelector('[data-lang-menu][aria-expanded="true"]');
      if (openMenu) { closeLangMenu(openMenu); openMenu.focus(); return; }
      if (document.getElementById('sidebar').classList.contains('open')) closeDrawer();
    });

    LOS.bus.on('gain', (g) => ui.toast(`New: ${g.text}`, 'award'));
    LOS.bus.on('achievement', (a) => ui.toast(a.label, 'award'));
    LOS.bus.on('sync-status', updateSyncPills);
    LOS.bus.on('cache-full', () => ui.toast('Memoria locale piena: i dati restano salvati nel cloud.', 'info'));
    LOS.bus.on('session-expired', () => {
      if (phase !== 'app') return;
      LOS.sync.stop(false); // keep the cache: pending changes are pushed after the next login
      LOS.auth.signOutLocal();
      teardown({ type: 'error', text: 'La sessione è scaduta. Accedi di nuovo: le modifiche non sincronizzate restano salvate su questo dispositivo.' });
    });
    LOS.bus.on('auth', ({ event, session }) => {
      if (event === 'PASSWORD_RECOVERY') { location.hash = '#/reset-password'; if (session) startUser(session.user); return; }
      if (event === 'SIGNED_OUT') { if (phase === 'app' || phase === 'loading') { LOS.sync.stop(false); teardown(); } return; }
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && session.user && session.user.id !== uid) startUser(session.user);
      if (event === 'TOKEN_REFRESHED') LOS.sync.flush();
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (LOS.store.state.settings.theme === 'system' && current && phase === 'app') LOS.shell.render(current.name); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { checkDayChange(); pullFromServer(); } else LOS.sync.flush(); });
    window.addEventListener('online', () => pullFromServer(true));
    setInterval(checkDayChange, 60000);
    setInterval(() => pullFromServer(), 5 * 60000);
  }

  async function boot() {
    try { applyTheme(localStorage.getItem('los:theme') || 'system'); } catch (e) { applyTheme('system'); }
    wireGlobals();
    const cfg = LOS.config.check();
    if (!cfg.ok || !window.supabase) { phase = 'config'; raw(LOS.authUI.configError(cfg.ok ? ['library'] : cfg.problems)); return; }
    raw(LOS.authUI.loading('Avvio…'));
    try { await LOS.auth.init(cfg); }
    catch (e) { console.error(e); raw(LOS.authUI.loading(LOS.errors.friendly(e))); return; }
    if (LOS.auth.user) await startUser(LOS.auth.user);
    else { phase = 'auth'; render(); }
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker not registered', e));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

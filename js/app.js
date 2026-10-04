/* APP — router, theme, global wiring, boot. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  let current = null;
  let lastDay = U.today();

  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || 'dashboard', params: parts.slice(1) };
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

  function render(opts = {}) {
    const st = LOS.store.state;
    const { name, params } = parse();
    if (!st.settings.onboarded && name !== 'welcome' && !(name === 'assessment' && params[0] === 'onb')) { location.replace('#/welcome'); return; }
    const view = LOS.views[name] || LOS.views.dashboard;
    const sameRoute = current && current.name === name && current.params.join('/') === params.join('/');
    const scrollY = opts.keepScroll && sameRoute ? window.scrollY : 0;
    if (current && current.view.unmount) { try { current.view.unmount(); } catch (e) { console.error(e); } }
    const shell = typeof view.shell === 'function' ? view.shell(params) : view.shell !== false;
    document.body.classList.toggle('no-shell', !shell);
    if (shell) LOS.shell.render(name);
    const main = document.getElementById('view');
    try {
      main.innerHTML = view.render(params);
      const root = main.firstElementChild || main;
      if (view.mount) view.mount(root, params);
    } catch (e) {
      console.error(e);
      main.innerHTML = `<div class="view narrow">${ui.empty({ icon: 'errors', title: 'Something went wrong', text: U.esc(e.message), action: '<a class="btn" href="#/dashboard">Dashboard</a>' })}</div>`;
    }
    ui.animateBars(main);
    current = { view, name, params };
    document.title = `${view.title || 'Lingua OS'} · Lingua OS`;
    closeDrawer();
    window.scrollTo(0, scrollY);
    if (!opts.keepScroll && !sameRoute) { try { main.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }

  function effectiveDark() {
    const t = LOS.store.state.settings.theme;
    return t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function setTheme(t) {
    LOS.store.state.settings.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    LOS.store.save();
  }

  LOS.app = {
    refresh(full) { if (full) current = null; render({ keepScroll: !full }); },
    setTheme,
    go(hash) { location.hash = hash; },
  };

  function checkDayChange() {
    const d = U.today();
    if (d !== lastDay) {
      lastDay = d;
      if (LOS.store.state.settings.onboarded) LOS.planner.ensureToday();
      if (current && !['session', 'practice', 'assessment'].includes(current.name)) render({ keepScroll: true });
    }
  }

  function boot() {
    LOS.store.load();
    document.documentElement.setAttribute('data-theme', LOS.store.state.settings.theme || 'system');
    if (LOS.store.state.settings.onboarded) { try { LOS.planner.ensureToday(); } catch (e) { console.error(e); } }

    window.addEventListener('hashchange', () => render());

    // global clicks: language switch, drawer, bottom nav, theme toggle
    document.addEventListener('click', (e) => {
      const lang = e.target.closest('[data-lang]');
      if (lang) {
        const c = lang.dataset.lang;
        if (c === LOS.store.active()) return;
        LOS.store.setActive(c);
        const n = current && current.name;
        if (['session', 'practice', 'assessment'].includes(n) || (current && current.params.length && ['grammar', 'medical', 'professional'].includes(n))) location.hash = '#/' + (n === 'grammar' ? 'grammar' : n === 'medical' || n === 'professional' ? n : 'dashboard');
        else render({ keepScroll: true });
        return;
      }
      if (e.target.closest('[data-drawer]')) { openDrawer(); return; }
      if (e.target.closest('#scrim')) { closeDrawer(); return; }
      const bn = e.target.closest('[data-bn]');
      if (bn) {
        const r = bn.dataset.bn;
        if (r === 'more') openDrawer();
        else if (r === 'practice') location.hash = '#/practice/review/all';
        else location.hash = '#/' + r;
        return;
      }
      if (e.target.closest('[data-theme-toggle]')) { setTheme(effectiveDark() ? 'light' : 'dark'); LOS.shell.render(current ? current.name : 'dashboard'); return; }
      const navLink = e.target.closest('#sidebar a');
      if (navLink) closeDrawer();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('sidebar').classList.contains('open')) closeDrawer(); });

    LOS.bus.on('gain', (g) => ui.toast(`New: ${g.text}`, 'award'));
    LOS.bus.on('achievement', (a) => ui.toast(a.label, 'award'));
    LOS.bus.on('save-error', () => ui.toast('Could not save — storage may be full. Export a backup.', 'errors'));

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (LOS.store.state.settings.theme === 'system' && current) LOS.shell.render(current.name); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkDayChange(); });
    setInterval(checkDayChange, 60000);

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

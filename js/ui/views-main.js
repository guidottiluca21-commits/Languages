/* VIEWS — shell (sidebar / topbar / bottom nav), Dashboard, Today, Session. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const V = (LOS.views = LOS.views || {});
  const S = () => LOS.store.state;

  /* ---------------- shell ---------------- */
  const NAV = [
    { group: 'Learn', items: [['dashboard', 'Dashboard', 'dashboard'], ['today', 'Today', 'today'], ['grammar', 'Grammar', 'grammar'], ['vocabulary', 'Vocabulary', 'vocabulary'], ['reading', 'Reading', 'reading'], ['listening', 'Listening', 'listening'], ['writing', 'Writing', 'writing'], ['speaking', 'Speaking', 'speaking'], ['pronunciation', 'Pronunciation', 'volume'], ['think', 'Think in the language', 'think'], ['compare', 'Compare languages', 'swap']] },
    { group: 'Professional', items: [['medical', 'Medical Language', 'medical'], ['professional', 'Professional Communication', 'professional']] },
    { group: 'Track', items: [['calendar', 'Calendar', 'calendar'], ['progress', 'Progress', 'progress'], ['errors', 'Error Log', 'errors'], ['review', 'Weekly Review', 'review']] },
  ];
  const ROUTE_TITLE = { dashboard: 'Dashboard', today: 'Today', grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking', think: 'Think', pronunciation: 'Pronunciation', compare: 'Compare', medical: 'Medical', professional: 'Professional', calendar: 'Calendar', progress: 'Progress', errors: 'Error Log', review: 'Weekly Review', settings: 'Settings', assessment: 'Assessment', session: 'Session', practice: 'Practice' };

  /** Compact language selector: "🇩🇪 Deutsch · A2 ▾" with a menu of all languages. */
  function langSwitch(where) {
    const codes = LOS.lang.codes();
    const active = LOS.store.active();
    const lvlOf = (c) => { const L = S().langs[c]; return L && L.onboarded ? LOS.skills.calculateLevel(L) : null; };
    const cur = lvlOf(active);
    const id = 'lang-pop-' + where;
    return `<div class="lang-menu">
      <button class="lang-trigger" data-lang-menu aria-haspopup="true" aria-expanded="false" aria-controls="${id}" title="Change language">${ui.langFlag(active)}<span class="nm">${esc(ui.langNative(active))}</span>${cur ? `<span class="lvl">${cur.label}</span>` : ''}${icon('chevronDown', 14)}</button>
      <div class="lang-pop" id="${id}" hidden>${codes.map((c) => {
        const l = lvlOf(c);
        if (!l) return `<a class="lang-opt" href="#/welcome/${c}">${ui.langFlag(c)}<span class="nm">${esc(ui.langNative(c))}</span><span class="faint xs">Set up</span></a>`;
        return `<button class="lang-opt ${c === active ? 'active' : ''}" data-lang="${c}" aria-current="${c === active}">${ui.langFlag(c)}<span class="nm">${esc(ui.langNative(c))}</span><span class="lvl">${l.label}</span>${c === active ? icon('check', 14) : ''}</button>`;
      }).join('')}</div></div>`;
  }

  LOS.shell = {
    render(route) {
      const sb = document.getElementById('sidebar-inner');
      const dueCount = (() => { const c = LOS.store.active(); if (!c || !S().langs[c] || !S().langs[c].onboarded) return 0; return LOS.learn.dueVocab(c).length + LOS.learn.dueErrorCards(c).length + LOS.learn.grammarList(c).filter((g) => g.due).length; })();
      const pending = (() => { const c = LOS.store.active(); const p = c && S().langs[c] && S().langs[c].plans[U.today()]; return p ? p.items.filter((i) => i.status === 'pending').length : 0; })();
      const reviewDue = LOS.store.studying().some((c) => LOS.progress.weeklyReviewDue(c));
      const streak = LOS.learn.streak();
      sb.innerHTML = `<div class="brand"><span class="brand-mark">L</span>Lingua OS<small>${streak ? `${icon('flame', 12)} ${streak}` : ''}</small></div>
        ${langSwitch('side')}
        <nav aria-label="Sections">${NAV.map((g) => `<div class="nav-label">${g.group}</div>${g.items.map(([r, l, ic]) => `<a class="nav-item ${route === r ? 'active' : ''}" href="#/${r}" ${route === r ? 'aria-current="page"' : ''}>${icon(ic, 17)}<span>${l}</span>${r === 'today' && pending ? `<span class="badge">${pending}</span>` : ''}${r === 'grammar' || r === 'vocabulary' ? '' : ''}${r === 'review' && reviewDue ? '<span class="badge accent">1</span>' : ''}</a>`).join('')}`).join('')}</nav>
        <div class="sidebar-foot">
          <button class="sync-pill" data-sync-pill hidden title="Stato della sincronizzazione"><i aria-hidden="true"></i><span class="t"></span></button>
          ${dueCount ? `<a class="nav-item" href="#/practice/review/all">${icon('review', 17)}<span>Reviews due</span><span class="badge">${dueCount}</span></a>` : ''}
          <a class="nav-item ${route === 'settings' ? 'active' : ''}" href="#/settings">${icon('settings', 17)}<span>Settings</span></a>
          <button class="nav-item" data-theme-toggle aria-label="Toggle dark mode">${icon(document.documentElement.getAttribute('data-theme') === 'dark' || (document.documentElement.getAttribute('data-theme') === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'sun' : 'moon', 17)}<span>Appearance</span></button>
        </div>`;
      const tb = document.getElementById('topbar');
      tb.innerHTML = `<button class="btn ghost icon" data-drawer aria-label="Open menu">${icon('menu', 20)}</button><div class="t">${esc(ROUTE_TITLE[route] || 'Lingua OS')}</div><button class="sync-pill dot-only" data-sync-pill hidden aria-label="Stato della sincronizzazione"><i aria-hidden="true"></i><span class="t sr-only"></span></button>${langSwitch('top')}`;
      const bn = document.getElementById('bottom-nav');
      const items = [['dashboard', 'Home', 'dashboard'], ['today', 'Today', 'today'], ['practice', 'Review', 'review'], ['calendar', 'Calendar', 'calendar'], ['more', 'More', 'menu']];
      bn.innerHTML = items.map(([r, l, ic]) => `<button class="${route === r ? 'active' : ''}" data-bn="${r}" aria-label="${l}">${icon(ic, 21)}<span>${l}</span></button>`).join('');
    },
  };

  /* ---------------- helpers ---------------- */
  function planItemRow(code, date, it, opts = {}) {
    const st = it.status;
    const href = `#/session/${code}/${date}/${it.id}`;
    const cat = ui.CAT_OF[it.type] || 'study';
    return `<div class="today-item ${st}" data-id="${it.id}">
      <button class="tick" ${st === 'pending' ? `data-act="go" data-href="${href}" aria-label="Start ${esc(it.title)}"` : `aria-label="${st}" disabled`}>${st === 'done' ? icon('check', 14) : ''}</button>
      <div><div class="t"><span>${esc(it.title)}</span>${it.level ? `<span class="pill">${esc(it.level)}</span>` : ''}${st === 'skipped' ? '<span class="pill">skipped</span>' : st === 'missed' ? '<span class="pill">missed</span>' : ''}</div>
        <div class="s">${esc(it.subtitle || '')}</div>${opts.reasons !== false && it.reason ? `<div class="r">${esc(it.reason)}</div>` : ''}</div>
      <div><div class="m">${it.minutes} min</div>${st === 'pending' && opts.actions !== false ? `<div class="acts"><a class="btn sm" href="${href}">Start</a><button class="btn ghost icon sm" data-act="swap" data-code="${code}" data-id="${it.id}" title="Swap for another activity" aria-label="Swap activity">${icon('swap', 14)}</button><button class="btn ghost icon sm" data-act="skip" data-code="${code}" data-id="${it.id}" title="Skip — no backlog is created" aria-label="Skip activity">${icon('skip', 14)}</button></div>` : st === 'done' && it.actual ? `<div class="faint xs" style="text-align:right">${it.actual} min done</div>` : ''}</div>
    </div>`;
  }
  LOS.views._planItemRow = planItemRow;

  function modeLabel(mode) {
    return { rest: 'Rest day', mvs: 'Minimum viable study', light: 'Light session recommended', recovery: 'Gentle restart', standard: 'Focused session', deep: 'Deep learning opportunity' }[mode] || mode;
  }
  function itemHandlers(refresh) {
    return {
      go(el) { location.hash = el.dataset.href; },
      skip(el) { LOS.planner.skipItem(el.dataset.code, U.today(), el.dataset.id); ui.toast('Skipped — nothing is carried over'); refresh(); },
      swap(el) { const n = LOS.planner.swapItem(el.dataset.code, U.today(), el.dataset.id); if (n) ui.toast(`Swapped for ${n.title}`, 'swap'); refresh(); },
    };
  }

  /* ---------------- Dashboard ---------------- */
  V.dashboard = {
    title: 'Dashboard',
    render() {
      const st = S();
      const code = LOS.store.active();
      const L = code && st.langs[code];
      if (!L || !L.onboarded) return setupCTA(code);
      const p = LOS.lang.get(code);
      const { budget, plans } = LOS.planner.ensureToday();
      const mine = plans.find((x) => x.code === code);
      const plan = mine && mine.plan;
      const overall = LOS.skills.calculateLevel(L);
      const rm = LOS.progress.roadmap(code);
      const first = plan && plan.items.find((i) => i.status === 'pending');
      const other = plans.find((x) => x.code !== code && x.plan.items.some((i) => i.status === 'pending'));
      const remaining = plan ? U.sum(plan.items.filter((i) => i.status === 'pending').map((i) => i.minutes)) : 0;
      const info = budget.info;
      const name = st.profile.name ? `, ${esc(st.profile.name.split(' ')[0])}` : '';
      const wk = LOS.skills.weakest(L);
      const topic = LOS.learn.pickTopic(code, { rnd: () => 0.5 });
      const week = LOS.progress.stats(code, U.addDays(U.today(), -6));
      const reviewDue = LOS.progress.weeklyReviewDue(code);

      let focus;
      if (budget.mode === 'rest') focus = `<div class="focus-card"><div><div class="ctx">${ui.langFlag(code)} ${esc(p.name)} · ${overall.sub} → ${overall.next}</div><h1>Rest day</h1><p class="why">Recovery is part of learning. If you feel like it, a short review keeps the chain alive.</p></div><div class="go"><a class="btn" href="#/practice/review/all">Quick review</a></div></div>`;
      else if (!plan) focus = `<div class="focus-card"><div><div class="ctx">${ui.langFlag(code)} ${esc(p.name)} · ${overall.sub} → ${overall.next}</div><h1>Today belongs to ${esc(other ? ui.langName(other.code) : 'another language')}</h1><p class="why">On short days, one language gets the whole session. You can still add ${esc(p.name)}.</p></div><div class="go"><button class="btn primary lg" data-act="extra">Add a ${esc(p.name)} session</button></div></div>`;
      else if (!first) focus = `<div class="focus-card"><div><div class="ctx">${ui.langFlag(code)} ${esc(p.name)} · ${overall.sub} → ${overall.next}</div><h1>Today is done.</h1><p class="why">${plan.items.filter((i) => i.status === 'done').length} activities completed. ${other ? `${esc(ui.langName(other.code))} still has activities waiting.` : 'See you tomorrow.'}</p></div><div class="go">${other ? `<button class="btn primary lg" data-act="switch" data-code="${other.code}">Continue with ${esc(ui.langName(other.code))}</button>` : `<button class="btn" data-act="extra">Extra 15 min</button>`}</div></div>`;
      else focus = `<div class="focus-card"><div><div class="ctx">${ui.langFlag(code)} ${esc(p.name)} · <span class="level">${overall.sub}</span> ${icon('arrowRight', 13)} ${overall.next}</div><div class="eyebrow">Today's focus</div><h1 class="mt-4">${esc(plan.focus.title)}</h1><p class="why">${esc(plan.focus.sub || '')}</p></div>
          <div class="go"><span class="mins">${remaining} min · ${plan.items.filter((i) => i.status === 'pending').length} activities left</span><a class="btn primary lg" href="#/session/${code}/${U.today()}/${first.id}">${plan.items.some((i) => i.status === 'done') ? 'Continue' : 'Start session'} ${icon('arrowRight', 16)}</a></div></div>`;

      const today = plan ? `<div class="section"><div class="section-head"><h2>Today</h2><a class="small" href="#/today">${plan.minutes} min · ${plan.items.length} activities</a></div>
        <div class="list">${plan.items.map((it) => planItemRow(code, U.today(), it, { reasons: false })).join('')}</div></div>` : '';

      const langs = LOS.lang.codes().map((c) => {
        const LL = st.langs[c];
        if (!LL || !LL.onboarded) return `<a class="lang-card off" href="#/welcome/${c}"><div class="top">${ui.langFlag(c)}<span class="nm">${esc(ui.langNative(c))}</span></div><div class="faint small mt-8">Not started · placement test ~15 min</div><span class="btn sm mt-12">Set up</span></a>`;
        const o = LOS.skills.calculateLevel(LL);
        const r = LOS.progress.roadmap(c);
        const lp = plans.find((x) => x.code === c);
        const due = LOS.learn.dueVocab(c).length + LOS.learn.dueErrorCards(c).length + LOS.learn.grammarList(c).filter((g) => g.due).length;
        return `<button class="lang-card ${c === code ? 'on' : ''}" data-act="switch" data-code="${c}" aria-pressed="${c === code}" aria-label="Open the ${esc(ui.langName(c))} dashboard">
          <div class="top">${ui.langFlag(c)}<span class="nm">${esc(ui.langNative(c))}</span><span class="lv"><span class="level">${o.sub}</span> → ${r.nextLevel}</span></div>
          <div class="mt-12">${ui.bar(r.readiness * 100, 'thin', 'Progress to ' + r.nextLevel)}</div>
          <div class="meta faint xs mt-8"><span>${Math.round(r.readiness * 100)}% to ${r.nextLevel}</span><span>target ${esc(LL.targetLevel)}</span><span>${lp ? lp.plan.minutes + ' min today' : 'rest / rotation today'}</span>${due ? `<span>${due} due</span>` : ''}</div></button>`;
      }).join('');

      const matrix = `<div class="matrix">${U.SKILLS.map((s) => { const t = LOS.skills.theta(L, s); return `<span class="lbl">${U.SKILL_LABEL[s]}</span>${ui.dots(t)}<span class="lv ${L.skills[s] && L.skills[s].conf === 'low' ? 'low' : ''}">${t == null ? '—' : U.thetaInfo(t).sub}</span>`; }).join('')}</div>`;

      const gains = L.gains.slice(0, 3);
      const panel = contextPanel(code, budget, plan, week, reviewDue);

      return `<div class="view wide"><div class="with-panel"><div>
        <div class="hero"><div class="greet">${U.greeting()}${name}.</div>${focus}
          <div class="energy-strip">${icon(budget.mode === 'mvs' ? 'battery' : 'activity', 14)}<span>${esc(info.label)}</span><span>·</span><span>${esc(modeLabel(budget.mode))}</span>${budget.why[1] ? `<span>·</span><span>${esc(budget.why[1])}</span>` : ''}
          <button class="btn ghost sm" data-act="lowEnergy">${info.lowEnergy ? 'Normal energy' : 'Low energy today'}</button></div></div>
        ${today}
        <div class="section"><div class="section-head"><h2>Language overview</h2><a class="small" href="#/progress">Roadmap</a></div><div class="lang-cards">${langs}</div></div>
        <div class="section grid grid-2" style="--gap:48px">
          <div><div class="section-head"><h2>Skill matrix</h2><span class="faint small">A1 → C2</span></div>${matrix}</div>
          <div class="stack" style="--gap:22px">
            <div><div class="eyebrow">Weakest skill</div><div class="mt-4" style="font-size:18px;font-weight:600">${wk ? U.SKILL_LABEL[wk.skill] : '—'} <span class="faint small">${wk ? U.thetaInfo(wk.theta).sub : ''}</span></div></div>
            <div><div class="eyebrow">Today's priority</div><div class="mt-4" style="font-size:18px;font-weight:600">${esc(topic ? topic.topic.title : '—')}</div><div class="faint small">${esc(topic ? U.cap(topic.reason) : '')}</div></div>
            <div><div class="eyebrow">Next milestone</div><div class="mt-4" style="font-size:18px;font-weight:600">${rm.nextLevel === rm.level ? 'C2 consolidation' : `${rm.nextLevel} ${esc(p.name)}`}</div><div class="mt-8">${ui.bar(rm.readiness * 100, 'accent thin')}</div><div class="faint xs mt-4">${Math.round(rm.readiness * 100)}% of the evidence for ${rm.level} completion</div></div>
          </div></div>
        ${gains.length ? `<div class="section"><div class="section-head"><h2>What you can do now</h2><a class="small" href="#/progress">All</a></div><div class="list">${gains.map((g) => `<div class="gain">${icon('checkCircle', 18)}<div><div>${esc(g.text)}</div><div class="faint xs">${U.fmtDate(g.date)} · ${U.SKILL_LABEL[g.skill] || ''} ${esc(g.level)}</div></div></div>`).join('')}</div></div>` : ''}
        <div class="section"><div class="section-head"><h2>This week</h2><span class="faint small">last 7 days · ${esc(p.name)}</span></div>
          <div class="stats-row">
            <div class="stat"><span class="v">${U.fmtMin(week.minutes)}</span><span class="k">Study time</span></div>
            <div class="stat"><span class="v">${U.fmtMin(week.listening)}</span><span class="k">Listening</span></div>
            <div class="stat"><span class="v">${week.wordsStable}</span><span class="k">Words became stable</span></div>
            <div class="stat"><span class="v">${week.grammarMastered}</span><span class="k">Grammar mastered</span></div>
            <div class="stat"><span class="v">${week.writings} · ${week.speakings}</span><span class="k">Writing · speaking</span></div>
            <div class="stat"><span class="v">${Math.round(week.consistency * 100)}%</span><span class="k">Consistency</span></div>
            <div class="stat"><span class="v">${week.reviewAcc == null ? '—' : Math.round(week.reviewAcc * 100) + '%'}</span><span class="k">Review accuracy</span></div>
          </div></div>
      </div>${panel}</div></div>`;
    },
    mount(root) {
      ui.delegate(root, Object.assign(itemHandlers(() => LOS.app.refresh()), {
        switch(el, e) { e.preventDefault(); LOS.store.setActive(el.dataset.code); },
        extra() { LOS.planner.addExtraSession(LOS.store.active(), 15); LOS.app.refresh(); },
        lowEnergy() { const d = LOS.store.day(U.today()); d.lowEnergy = !d.lowEnergy; LOS.store.save(); LOS.planner.ensureToday(); ui.toast(d.lowEnergy ? 'Low-energy mode: minimum viable study' : 'Back to the normal plan', 'battery'); LOS.app.refresh(); },
        reviewNow() { location.hash = '#/review'; },
      }));
    },
  };

  function contextPanel(code, budget, plan, week, reviewDue) {
    const st = S();
    const ws = U.weekStart(U.today(), st.settings.weekStart);
    const days = U.range(ws, U.addDays(ws, 6));
    const minsByDate = LOS.learn.minutesByDate();
    const strip = days.map((d) => {
      const w = LOS.planner.calculateWorkload(d);
      const b = d === U.today() ? budget : LOS.planner.dayBudget(d);
      const done = minsByDate[d] || 0;
      const studyH = Math.min(100, ((d <= U.today() ? done : b.minutes) / Math.max(30, st.time.max)) * 100);
      return `<div class="d ${d === U.today() ? 'today' : ''}" title="${esc(U.fmtDate(d))}: ${esc(w.label)} · ${d <= U.today() ? done + ' min studied' : b.minutes + ' min planned'}"><div class="col"><div class="work" style="height:${Math.round(w.load * 45)}%"></div><div class="study" style="height:${Math.round(studyH * 0.55)}%;opacity:${d <= U.today() ? 1 : 0.4}"></div></div><span>${U.fmtDate(d, { weekday: 'narrow' })}</span></div>`;
    }).join('');
    const w = budget.info;
    const due = LOS.learn.dueVocab(code).length + LOS.learn.dueErrorCards(code).length + LOS.learn.grammarList(code).filter((g) => g.due).length;
    const streak = LOS.learn.streak();
    const L = st.langs[code];
    return `<aside class="context-panel" aria-label="Context">
      <div><div class="section-head"><h3>This week</h3><a class="small" href="#/calendar">Calendar</a></div><div class="week-strip">${strip}</div>
        <div class="legend mt-12"><span><i class="cat-dot work"></i>Work load</span><span><i class="cat-dot study"></i>Study</span></div></div>
      <div><div class="section-head"><h3>Workload today</h3></div>
        <div class="load-rows"><span>Work</span>${ui.bar(w.load * 100, '', 'Work load').replace('<i ', '<i class="work" ')}<span>Study</span>${ui.bar(budget.minutes / Math.max(1, st.time.max) * 100, '', 'Study load').replace('<i ', '<i class="study" ')}<span>Recovery</span>${ui.bar(w.kind === 'night' || w.kind === 'postnight' ? 80 : w.category === 'heavy' ? 55 : w.category === 'normal' ? 30 : 10, '', 'Recovery need').replace('<i ', '<i class="rec" ')}</div>
        <p class="faint small mt-12">${esc(budget.why[0] || '')}</p></div>
      <div class="stack" style="--gap:14px">
        <div class="between"><span class="muted small">${icon('review', 15)}</span><span class="grow small">Reviews due</span><a class="strong num" href="#/practice/review/all">${due}</a></div>
        <div class="between"><span class="muted small">${icon('flame', 15)}</span><span class="grow small">Continuity</span><span class="strong num">${streak} day${streak === 1 ? '' : 's'}</span></div>
        <div class="between"><span class="muted small">${icon('award', 15)}</span><span class="grow small">Experience</span><span class="num faint">${L.xp} XP</span></div>
      </div>
      ${reviewDue ? `<div class="card soft"><div class="strong">Weekly review</div><p class="muted small mt-4">Look back at your week and let the planner adapt next week's load.</p><a class="btn sm mt-12" href="#/review">Start review</a></div>` : ''}
    </aside>`;
  }

  function setupCTA(code) {
    const name = code ? ui.langName(code) : 'a language';
    return `<div class="view narrow">${ui.empty({ icon: 'globe', title: `Set up ${name}`, text: `Take the placement test and build a personal plan for ${esc(name)}. Your other languages are not affected.`, action: `<a class="btn primary lg" href="#/welcome/${esc(code || '')}">Build my ${esc(name)} profile</a>` })}</div>`;
  }

  /* ---------------- Today ---------------- */
  V.today = {
    title: 'Today',
    render() {
      const code = LOS.store.active();
      if (!code || !S().langs[code] || !S().langs[code].onboarded) return setupCTA(code);
      const { budget, plans } = LOS.planner.ensureToday();
      const info = budget.info;
      const studying = LOS.store.studying();
      const missing = studying.filter((c) => !plans.find((p) => p.code === c));
      const total = U.sum(plans.map((p) => p.plan.minutes));
      const done = U.sum(plans.map((p) => U.sum(p.plan.items.filter((i) => i.status === 'done').map((i) => i.minutes))));
      return `<div class="view narrow">
        <div class="page-head"><div><div class="eyebrow">${U.fmtDate(U.today(), { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1 class="mt-4">Today</h1>
          <p class="sub">${budget.mode === 'rest' ? 'Rest day.' : `${total} minutes · ${U.sum(plans.map((p) => p.plan.items.length))} activities`} ${done ? `· ${done} min done` : ''}</p></div>
          <div class="cluster"><button class="btn sm" data-act="lowEnergy">${icon('battery', 14)} ${info.lowEnergy ? 'Normal energy' : 'Low energy'}</button><button class="btn sm" data-act="rest">${icon('rest', 14)} ${info.rest ? 'Undo rest day' : 'Rest day'}</button><button class="btn ghost sm" data-act="regen">${icon('swap', 14)} Regenerate</button></div></div>
        <div class="notice">${icon('activity', 16)}<div><strong>${esc(info.label)}</strong> → ${esc(modeLabel(budget.mode))}. ${budget.why.map(esc).join(' · ')}</div></div>
        ${plans.length > 1 ? `<div class="section"><div class="list">${plans.map(({ code: c, plan }) => `<div class="row" style="min-height:44px"><span class="grow">${ui.langFlag(c)} <strong>${esc(ui.langNative(c))}</strong> — ${plan.minutes} min</span><span class="muted small">${esc([...new Set(plan.items.map((i) => U.SKILL_LABEL[i.skill] || i.skill))].slice(0, 3).join(' + '))}</span></div>`).join('')}</div></div>` : ''}
        ${plans.map(({ code: c, plan }) => `<div class="section"><div class="section-head"><h2>${ui.langFlag(c)} ${esc(ui.langName(c))} · ${plan.minutes} min</h2><span class="faint small">${esc(modeLabel(plan.mode))}</span></div>
          <p class="muted small">Focus: <strong>${esc(plan.focus.title)}</strong></p>
          <div class="list mt-8">${plan.items.map((it) => planItemRow(c, U.today(), it)).join('')}</div></div>`).join('')}
        ${budget.mode === 'rest' ? ui.empty({ icon: 'rest', title: 'Rest day', text: 'Nothing scheduled. Spaced repetition waits for you; nothing piles up.', action: '<a class="btn" href="#/practice/review/all">Optional quick review</a>' }) : ''}
        ${missing.length && budget.mode !== 'rest' ? `<div class="section">${missing.map((c) => `<div class="between card soft"><div><strong>${esc(ui.langName(c))}</strong><div class="muted small">Not scheduled today: the time available is shared by rotation, so this language gets priority on one of the next days. Its reviews keep their own schedule.</div></div><button class="btn sm" data-act="extraFor" data-code="${c}">Add 15 min</button></div>`).join('')}</div>` : ''}
        <div class="section"><div class="section-head"><h3>How today was planned</h3></div>
          <ol class="muted small lesson" style="padding-left:18px">
            <li>Workload: ${esc(info.label)} → ${info.category} day (${S().rules[info.category].join('–')} min rule).</li>
            <li>Due reviews come first (retrieval practice); nothing missed is piled on top.</li>
            <li>Remaining time goes to your weakest skills, adjusted for goals, recent practice, errors and skips.</li>
            <li>Order: input → controlled practice → production.</li>
          </ol></div>
      </div>`;
    },
    mount(root) {
      ui.delegate(root, Object.assign(itemHandlers(() => LOS.app.refresh()), {
        lowEnergy() { const d = LOS.store.day(U.today()); d.lowEnergy = !d.lowEnergy; LOS.store.save(); LOS.app.refresh(); },
        rest() { const d = LOS.store.day(U.today()); d.rest = !d.rest; LOS.store.save(); ui.toast(d.rest ? 'Rest day — enjoy it' : 'Plan restored', 'rest'); LOS.app.refresh(); },
        regen() { LOS.store.studying().forEach((c) => { const p = LOS.store.lang(c).plans[U.today()]; if (p && p.items.every((i) => i.status === 'pending')) delete LOS.store.lang(c).plans[U.today()]; }); LOS.planner.ensureToday(true); ui.toast('Plan regenerated', 'swap'); LOS.app.refresh(); },
        extraFor(el) { LOS.planner.addExtraSession(el.dataset.code, 15); LOS.app.refresh(); },
      }));
    },
  };

  /* ---------------- Session (planned) & Practice (ad hoc) ---------------- */
  let currentSession = null;
  V.session = {
    title: 'Session',
    render() { return '<div class="view" id="runner-root"></div>'; },
    mount(root, params) {
      const [code, date, itemId] = params;
      const plan = LOS.store.lang(code) && LOS.store.lang(code).plans[date];
      const item = plan && plan.items.find((i) => i.id === itemId);
      const host = root.id === 'runner-root' ? root : root.querySelector('#runner-root') || root;
      if (!item) { host.innerHTML = ui.empty({ icon: 'today', title: 'Activity not found', text: 'This activity belongs to an older plan.', action: '<a class="btn" href="#/today">Back to Today</a>' }); return; }
      if (item.status !== 'pending') { host.innerHTML = ui.empty({ icon: 'checkCircle', title: `Already ${item.status}`, text: 'You can still practise it from its section.', action: '<a class="btn" href="#/today">Back to Today</a>' }); return; }
      if (code !== LOS.store.active()) { S().settings.activeLang = code; LOS.shell.render('session'); }
      currentSession = LOS.run.start(host, { code, item: Object.assign({ mode: plan.mode }, item), date, planned: true });
    },
    unmount() { if (currentSession) { currentSession.dispose(); currentSession = null; } },
  };

  /** #/practice/<type>/<arg> — ad-hoc activities launched from any section. */
  V.practice = {
    title: 'Practice',
    render() { return '<div class="view" id="runner-root"></div>'; },
    mount(root, params) {
      const code = LOS.store.active();
      const host = root.id === 'runner-root' ? root : root.querySelector('#runner-root');
      const [type, arg, arg2] = params;
      const p = LOS.lang.get(code);
      const item = { id: U.uid('adhoc'), status: 'pending', minutes: 0 };
      const map = {
        grammar: () => { const t = p.index.grammar[arg]; return t && { type: 'grammar', skill: 'grammar', title: 'Grammar', subtitle: t.title, level: t.l, payload: { topicId: arg, count: 7, learn: arg2 === 'learn' } }; },
        review: () => ({ type: 'review', skill: 'review', title: 'Review', subtitle: 'Due items', payload: { cap: 30 } }),
        vocab: () => ({ type: 'vocabulary', skill: 'vocabulary', title: 'Vocabulary', subtitle: 'New words & chunks', payload: arg && arg !== 'new' ? { ids: decodeURIComponent(arg).split(',') } : { count: 6 } }),
        reading: () => ({ type: 'reading', skill: 'reading', title: 'Reading', subtitle: (p.index.texts[arg] || {}).title, payload: { textId: arg } }),
        listening: () => (arg === 'external' ? { type: 'listening', skill: 'listening', title: 'Listening', subtitle: 'Authentic content', payload: { mode: 'external', level: U.LEVELS[LOS.learn.targetLevelIdx(code, 'listening')] } } : { type: 'listening', skill: 'listening', title: 'Listening', subtitle: (p.index.texts[arg] || {}).title, payload: { mode: 'guided', textId: arg } }),
        writing: () => ({ type: 'writing', skill: 'writing', title: 'Writing', subtitle: arg === 'free' ? 'Free writing' : (p.writing.find((w) => w.id === arg) || {}).title, payload: { promptId: arg } }),
        speaking: () => ({ type: 'speaking', skill: 'speaking', title: 'Speaking', subtitle: (p.speaking.find((w) => w.id === arg) || {}).title, payload: { taskId: arg } }),
        think: () => ({ type: 'think', skill: 'think', title: 'Think in ' + p.name, subtitle: arg && arg !== 'mix' ? LOS.shared.THINK_TYPES[arg].label : 'Mixed drills', payload: { count: 5, type: arg && arg !== 'mix' ? arg : undefined } }),
        scenario: () => { const m = p.index.modules[arg]; return m && { type: 'scenario', skill: 'speaking', title: m.id.includes('-med-') ? 'Medical scenario' : 'Professional scenario', subtitle: m.title, level: m.l, payload: { moduleId: arg, idx: +(arg2 || 0) } }; },
      };
      const make = map[type];
      const spec = make && make();
      if (!spec) { host.innerHTML = ui.empty({ icon: 'errors', title: 'Nothing to practise here', action: '<a class="btn" href="#/dashboard">Dashboard</a>' }); return; }
      currentSession = LOS.run.start(host, { code, item: Object.assign(item, spec), planned: false });
    },
    unmount() { if (currentSession) { currentSession.dispose(); currentSession = null; } },
  };
})();

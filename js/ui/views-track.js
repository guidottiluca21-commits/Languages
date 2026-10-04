/* VIEWS — Calendar, Progress, Error log, Weekly review. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const V = LOS.views;
  const S = () => LOS.store.state;
  const code = () => LOS.store.active();
  const lang = () => LOS.store.lang(code());
  const TYPES = [['work', 'Work'], ['night', 'Night shift'], ['off', 'Day off'], ['vacation', 'Vacation'], ['recovery', 'Recovery day']];
  const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ======================================================================
   * Calendar
   * ====================================================================== */
  const cal = { month: null, mode: 'month', sel: null };

  function dayEvents(d) {
    const today = U.today();
    const w = LOS.planner.calculateWorkload(d);
    const ev = [];
    if (w.type === 'work' || w.type === 'night') ev.push(['work', `${w.type === 'night' ? 'Night ' : ''}${w.start}–${w.end}`]);
    else if (w.type === 'vacation') ev.push(['work', 'Vacation']);
    else if (w.type === 'recovery' || w.kind === 'postnight') ev.push(['rest', w.kind === 'postnight' ? 'Post-night' : 'Recovery']);
    if (w.rest) { ev.push(['rest', 'Rest']); return ev; }
    if (d < today || d === today) {
      const minutes = LOS.learn.minutesByDate()[d] || 0;
      const plans = LOS.store.studying().map((c) => LOS.store.lang(c).plans[d]).filter(Boolean);
      const items = [].concat(...plans.map((p) => p.items));
      if (minutes) ev.push(['study', `✓ ${minutes} min`, true]);
      else if (d === today && items.length) ev.push(['study', `${U.sum(items.map((i) => i.minutes))} min planned`]);
      if (items.some((i) => i.type === 'listening')) ev.push(['listening', 'Listening', items.find((i) => i.type === 'listening').status === 'done']);
      if (items.some((i) => i.type === 'review')) ev.push(['review', 'Review', items.find((i) => i.type === 'review').status === 'done']);
      const missed = items.filter((i) => i.status === 'missed' || i.status === 'skipped').length;
      if (missed && d < today) ev.push(['rest', `${missed} skipped`]);
    } else {
      const f = LOS.planner.forecast(d);
      if (f.budget.minutes) ev.push(['study', `${f.budget.minutes} min`]);
      const blocks = [].concat(...f.langs.map((l) => l.blocks));
      if (blocks.some((b) => b.skill === 'listening')) ev.push(['listening', 'Listening']);
      if (blocks.some((b) => b.skill === 'review')) ev.push(['review', 'Review']);
    }
    return ev;
  }

  V.calendar = {
    title: 'Calendar',
    render() {
      const st = S();
      const today = U.today();
      cal.month = cal.month || U.monthStart(today);
      const ws = st.settings.weekStart;
      const legend = `<div class="legend"><span><i class="cat-dot work"></i>Work</span><span><i class="cat-dot study"></i>Study</span><span><i class="cat-dot listening"></i>Listening</span><span><i class="cat-dot review"></i>Review</span><span><i class="cat-dot rest"></i>Rest</span></div>`;
      const dowHead = Array.from({ length: 7 }, (_, i) => `<div class="cal-dow">${DOW[(i + ws) % 7].slice(0, 3)}</div>`).join('');
      let grid = '', start, end;
      if (cal.mode === 'month') {
        start = U.weekStart(cal.month, ws);
        const mEnd = U.addDays(U.monthStart(U.addDays(cal.month, 32)), -1);
        end = U.addDays(U.weekStart(mEnd, ws), 6);
      } else {
        start = U.weekStart(cal.sel || today, ws);
        end = U.addDays(start, 6);
      }
      const days = U.range(start, end);
      grid = days.map((d) => {
        const ev = dayEvents(d);
        const out = cal.mode === 'month' && d.slice(0, 7) !== cal.month.slice(0, 7);
        return `<button class="cal-day ${out ? 'out' : ''} ${d === today ? 'today' : ''} ${d === cal.sel ? 'sel' : ''}" data-act="day" data-d="${d}" style="${cal.mode === 'week' ? 'min-height:200px' : ''}" aria-label="${esc(U.fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }))}">
          <span class="n">${+d.slice(8)}</span>${ev.map(([c, t, done]) => `<span class="ev ${done ? 'done' : ''}"><i class="cat-dot ${c}"></i>${esc(t)}</span>`).join('')}</button>`;
      }).join('');
      const agendaDays = U.range(today, U.addDays(today, 13));
      const agenda = `<div class="agenda mobile-only mt-16">${agendaDays.map((d) => `<div class="a-day ${d === today ? 'today' : ''}" data-act="day" data-d="${d}" role="button" tabindex="0"><div class="a-date"><div class="dw">${U.fmtDate(d, { weekday: 'short' })}</div><div class="dn">${+d.slice(8)}</div></div><div class="stack" style="--gap:4px">${dayEvents(d).map(([c, t, done]) => `<span class="ev ${done ? 'done' : ''}" style="font-size:13.5px"><i class="cat-dot ${c}"></i>${esc(t)}</span>`).join('') || '<span class="faint small">—</span>'}</div></div>`).join('')}</div>`;
      const label = cal.mode === 'month' ? U.parse(cal.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : `${U.fmtDate(start, { day: 'numeric', month: 'short' })} – ${U.fmtDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      const wk = LOS.planner.generateWeeklyPlan();
      return `<div class="view wide">
        <div class="page-head"><div><h1>Calendar</h1><p class="sub">Your work shapes your study. Heavy days get short sessions, free days deep ones — and missed days never turn into a backlog.</p></div>
          <div class="cluster"><button class="btn" data-act="pattern">${icon('briefcase', 15)} Work pattern</button><button class="btn" data-act="bulk">${icon('plus', 15)} Shifts / vacation</button></div></div>
        <div class="cal-head"><button class="btn icon sm" data-act="prev" aria-label="Previous">${icon('chevronLeft', 16)}</button><button class="btn sm" data-act="today">Today</button><button class="btn icon sm" data-act="next" aria-label="Next">${icon('chevronRight', 16)}</button><h2 style="font-size:18px" class="grow">${esc(label)}</h2>${ui.seg('mode', [['month', 'Month'], ['week', 'Week']], cal.mode)}</div>
        ${legend}
        <div class="cal-grid mt-16">${dowHead}${grid}</div>
        ${agenda}
        <div class="section"><div class="section-head"><h3>This week at a glance</h3><span class="faint small">${U.fmtMin(wk.total)} planned · ${wk.deepDays} deep · ${wk.lightDays} light</span></div>
          <div class="list">${wk.days.map((d) => `<div class="row clickable" data-act="day" data-d="${d.date}"><span style="width:90px" class="${d.date === U.today() ? 'strong' : 'muted'}">${U.fmtDate(d.date)}</span><span class="grow small">${esc(d.budget.info.label)}</span><span class="pill ${d.budget.mode === 'deep' ? 'ok' : d.budget.mode === 'rest' ? '' : d.budget.mode === 'mvs' || d.budget.mode === 'light' ? 'warn' : 'accent'}">${d.budget.mode === 'rest' ? 'rest' : d.budget.minutes + ' min'}</span></div>`).join('')}</div></div>
      </div>`;
    },
    mount(root) {
      ui.delegate(root, {
        prev() { if (cal.mode === 'month') cal.month = U.monthStart(U.addDays(cal.month, -1)); else cal.sel = U.addDays(cal.sel || U.today(), -7); LOS.app.refresh(); },
        next() { if (cal.mode === 'month') cal.month = U.monthStart(U.addDays(cal.month, 32)); else cal.sel = U.addDays(cal.sel || U.today(), 7); LOS.app.refresh(); },
        today() { cal.month = U.monthStart(U.today()); cal.sel = U.today(); LOS.app.refresh(); },
        mode(el) { cal.mode = el.dataset.v; LOS.app.refresh(); },
        day(el) { cal.sel = el.dataset.d; dayPanel(el.dataset.d); },
        pattern() { patternEditor(); },
        bulk() { bulkEditor(); },
      });
      root.querySelectorAll('.a-day').forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { cal.sel = el.dataset.d; dayPanel(el.dataset.d); } }));
    },
  };

  function shiftFields(prefix, e = {}) {
    return `<div class="shift-row"><select class="select" data-${prefix}="type" aria-label="Type">${TYPES.map(([v, l]) => `<option value="${v}" ${e.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input class="input" type="time" data-${prefix}="start" value="${esc(e.start || '08:00')}" aria-label="Start"><span class="faint">–</span><input class="input" type="time" data-${prefix}="end" value="${esc(e.end || '17:00')}" aria-label="End"></div>`;
  }

  function dayPanel(d) {
    const st = S();
    const today = U.today();
    const w = LOS.planner.calculateWorkload(d);
    const b = LOS.planner.dayBudget(d);
    const ov = st.schedule.overrides[d];
    const entry = LOS.planner.scheduleEntry(d);
    const dayRec = st.days[d] || {};
    let plansHTML = '';
    if (d <= today) {
      const blocks = LOS.store.studying().map((c) => { const p = LOS.store.lang(c).plans[d]; return p ? `<div class="mt-12"><div class="strong small">${ui.langDot(c)} ${esc(ui.langName(c))}</div><div class="list">${p.items.map((it) => `<div class="row" style="min-height:40px;padding:8px 0"><span class="pill ${it.status === 'done' ? 'ok' : it.status === 'pending' ? 'accent' : ''}">${it.status}</span><span class="grow small">${esc(it.title)} · ${esc(it.subtitle || '')}</span><span class="faint small">${it.minutes} min</span></div>`).join('')}</div></div>` : ''; }).join('');
      const ses = [].concat(...LOS.store.studying().map((c) => LOS.store.lang(c).sessions.filter((s) => s.date === d).map((s) => Object.assign({ c }, s))));
      plansHTML = (blocks || '<p class="muted small">No plan stored for this day.</p>') + (ses.length ? `<div class="mt-16"><div class="eyebrow">Completed</div><div class="list">${ses.map((s) => `<div class="row" style="min-height:36px;padding:6px 0">${icon(ui.SKILL_ICON[s.type] || 'check', 15)}<span class="grow small">${esc(ui.langName(s.c))} · ${esc(s.title || s.type)}</span><span class="faint small">${s.minutes} min</span></div>`).join('')}</div></div>` : '');
    } else {
      const f = LOS.planner.forecast(d);
      plansHTML = f.langs.length ? f.langs.map((l) => `<div class="mt-12"><div class="strong small">${ui.langDot(l.code)} ${esc(ui.langName(l.code))} · ${l.minutes} min</div><div class="cluster mt-8">${l.blocks.map((bk) => `<span class="pill outline"><i class="cat-dot ${ui.CAT_OF[bk.skill] || 'study'}"></i>${esc(U.SKILL_LABEL[bk.skill] || bk.skill)} ${bk.minutes}′</span>`).join('')}</div></div>`).join('') + '<p class="faint xs mt-12">Forecast — the exact activities are chosen on the day, from your latest performance.</p>' : '<p class="muted small">No study planned.</p>';
    }
    ui.modal({
      title: U.fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }), wide: true,
      body: `<div class="grid grid-2" style="--gap:28px">
        <div><div class="eyebrow">Work</div><div class="mt-8">${shiftFields('o', ov || entry)}</div>
          <input class="input mt-8" data-o="note" placeholder="Note (optional)" value="${esc((ov && ov.note) || '')}" aria-label="Note">
          <p class="faint xs mt-8">${ov ? 'Override for this day.' : `From your weekly pattern (${DOW[U.weekday(d)]}).`}</p>
          <div class="cluster mt-12"><button class="btn sm primary" data-save>Save day</button>${ov ? '<button class="btn sm" data-clear>Use weekly pattern</button>' : ''}</div></div>
        <div><div class="eyebrow">Availability</div>
          <div class="mt-8"><strong>${b.mode === 'rest' ? 'Rest' : b.minutes + ' min'}</strong> <span class="muted">· ${esc(w.category)} day · ${esc(w.label)}</span></div>
          <div class="load-rows mt-12"><span>Work</span>${ui.bar(w.load * 100).replace('<i ', '<i class="work" ')}<span>Energy</span>${ui.bar(w.energy * 100).replace('<i ', '<i class="study" ')}</div>
          <p class="muted small mt-12">${b.why.map(esc).join(' · ')}</p>
          <div class="stack mt-12" style="--gap:2px"><label class="check small"><input type="checkbox" data-rest ${dayRec.rest ? 'checked' : ''}> Rest day (no study)</label><label class="check small"><input type="checkbox" data-low ${dayRec.lowEnergy ? 'checked' : ''}> Low-energy day (5–15 min)</label></div></div>
      </div>
      <div class="divider"></div><div class="eyebrow">${d < today ? 'Sessions' : d === today ? 'Today\'s plan' : 'Planned study'}</div>${plansHTML}`,
      onMount(m, close) {
        const val = (k) => m.querySelector(`[data-o="${k}"]`).value;
        m.querySelector('[data-save]').addEventListener('click', () => {
          st.schedule.overrides[d] = { type: val('type'), start: val('start'), end: val('end'), note: val('note') };
          LOS.store.save(); LOS.planner.ensureToday(); close(); ui.toast('Day updated — plan recalculated'); LOS.app.refresh();
        });
        const clr = m.querySelector('[data-clear]');
        if (clr) clr.addEventListener('click', () => { delete st.schedule.overrides[d]; LOS.store.save(); LOS.planner.ensureToday(); close(); LOS.app.refresh(); });
        m.querySelector('[data-rest]').addEventListener('change', (e) => { LOS.store.day(d).rest = e.target.checked; LOS.store.save(); LOS.planner.ensureToday(); close(); LOS.app.refresh(); });
        m.querySelector('[data-low]').addEventListener('change', (e) => { LOS.store.day(d).lowEnergy = e.target.checked; LOS.store.save(); LOS.planner.ensureToday(); close(); LOS.app.refresh(); });
      },
    });
  }

  function patternEditor(after) {
    const st = S();
    const order = [1, 2, 3, 4, 5, 6, 0];
    ui.modal({
      title: 'Weekly work pattern', wide: true,
      body: `<p class="muted small">Your default week. Use the calendar for exceptions (shifts, nights, vacations).</p>
        <div class="cluster mt-12"><button class="btn sm" data-preset="office">Mon–Fri 08–17</button><button class="btn sm" data-preset="hospital">Hospital (Mon–Fri 07:30–16:00)</button><button class="btn sm" data-preset="free">All days off</button></div>
        <div class="week-editor mt-16">${order.map((d) => `<span class="label">${DOW[d]}</span>${shiftFields('w' + d, st.schedule.weekly[d] || { type: 'off' })}`).join('')}</div>`,
      foot: '<button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Save pattern</button>',
      onMount(m, close) {
        const set = (d, e) => { const q = (k) => m.querySelector(`[data-w${d}="${k}"]`); q('type').value = e.type; if (e.start) q('start').value = e.start; if (e.end) q('end').value = e.end; };
        m.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
          const p = b.dataset.preset;
          order.forEach((d) => {
            if (p === 'free') set(d, { type: 'off' });
            else if (d >= 1 && d <= 5) set(d, p === 'office' ? { type: 'work', start: '08:00', end: '17:00' } : { type: 'work', start: '07:30', end: '16:00' });
            else set(d, { type: 'off' });
          });
        }));
        m.querySelector('[data-ok]').addEventListener('click', () => {
          order.forEach((d) => { const q = (k) => m.querySelector(`[data-w${d}="${k}"]`).value; const type = q('type'); st.schedule.weekly[d] = type === 'work' || type === 'night' ? { type, start: q('start'), end: q('end') } : { type }; });
          LOS.store.save(); LOS.planner.ensureToday(); close(); ui.toast('Work pattern saved'); if (after) after(); else LOS.app.refresh();
        });
      },
    });
  }
  LOS.views._patternEditor = patternEditor;

  function bulkEditor() {
    const st = S();
    const today = U.today();
    ui.modal({
      title: 'Add shifts or vacation',
      body: `<p class="muted small">Apply the same entry to a range of days — e.g. a week of nights or a vacation.</p>
        <div class="grid grid-2 mt-12"><div class="field"><label for="b-from">From</label><input class="input" type="date" id="b-from" value="${today}"></div><div class="field"><label for="b-to">To</label><input class="input" type="date" id="b-to" value="${U.addDays(today, 6)}"></div></div>
        <div class="field mt-12"><label>Entry</label>${shiftFields('b', { type: 'vacation', start: '20:00', end: '08:00' })}</div>
        <div class="field mt-12"><label>Repeat</label><select class="select" id="b-rep"><option value="1">Every day</option><option value="2">Every other day</option><option value="7">Same weekday each week</option></select></div>`,
      foot: '<button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Apply</button>',
      onMount(m, close) {
        m.querySelector('[data-ok]').addEventListener('click', () => {
          const from = m.querySelector('#b-from').value, to = m.querySelector('#b-to').value;
          if (!from || !to || to < from) { ui.toast('Check the dates', 'errors'); return; }
          if (U.diffDays(from, to) > 370) { ui.toast('Maximum one year at a time', 'errors'); return; }
          const step = +m.querySelector('#b-rep').value;
          const q = (k) => m.querySelector(`[data-b="${k}"]`).value;
          let n = 0;
          for (let d = from; d <= to; d = U.addDays(d, step)) { st.schedule.overrides[d] = { type: q('type'), start: q('start'), end: q('end') }; n++; }
          LOS.store.save(); LOS.planner.ensureToday(); close(); ui.toast(`${n} days updated`); LOS.app.refresh();
        });
      },
    });
  }

  /* ======================================================================
   * Progress & roadmap
   * ====================================================================== */
  V.progress = {
    title: 'Progress',
    render() {
      const L = lang();
      if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'progress', title: 'No progress yet', action: `<a class="btn primary" href="#/welcome/${code()}">Set up ${esc(ui.langName(code()))}</a>` })}</div>`;
      const p = LOS.lang.get(code());
      const rm = LOS.progress.roadmap(code());
      const o = rm.overall;
      const pace = LOS.progress.pace(code());
      const target = U.levelIndex(L.targetLevel);
      const youPct = (o.theta / 6) * 100;
      const mStart = U.monthStart(U.today());
      const month = LOS.progress.stats(code(), mStart);
      const mins = LOS.learn.minutesByDate(code());
      const last28 = U.range(U.addDays(U.today(), -27), U.today());
      const maxMin = Math.max(30, ...last28.map((d) => mins[d] || 0));
      const ach = LOS.learn.ACHIEVEMENTS;
      return `<div class="view">
        <div class="page-head"><div><div class="eyebrow">${ui.langDot(code())} ${esc(p.name)}</div><h1 class="mt-4"><span class="level">${o.sub}</span> → ${rm.nextLevel}</h1><p class="sub">Progress is measured from evidence — skill estimates, grammar mastery, active vocabulary and production quality — not from time spent.</p></div>
          <a class="btn" href="#/assessment">${icon('target', 15)} Retake placement test</a></div>
        <div class="card"><div class="roadmap" aria-label="Roadmap from A1 to C2">
          <div class="you" style="left:${youPct}%">YOU</div>
          <div class="track"><div class="fill" style="width:${youPct}%"></div></div>
          <div class="nodes">${rm.milestones.map((m, i) => `<div class="node ${m.state} ${i === target ? 'target' : ''}"><i></i>${m.level}${i === target ? ' · target' : ''}</div>`).join('')}</div></div>
          <div class="three-col mt-24">
            <div><div class="eyebrow">Where you are</div><div style="font-size:20px;font-weight:600"><span class="level">${o.sub}</span> overall</div><p class="muted small mt-4">Skill spread ${o.spread} levels. ${(() => { const w = LOS.skills.weakest(L), s = LOS.skills.strongest(L); return w && s ? `Strongest: ${U.SKILL_LABEL[s.skill]} (${U.thetaInfo(s.theta).sub}); weakest: ${U.SKILL_LABEL[w.skill]} (${U.thetaInfo(w.theta).sub}).` : ''; })()}</p></div>
            <div><div class="eyebrow">Where you're going</div><div style="font-size:20px;font-weight:600">${esc(L.targetLevel)}${L.targetDate ? ` by ${U.fmtDate(L.targetDate, { month: 'short', year: 'numeric' })}` : ''}</div><p class="muted small mt-4">${pace ? `Needed: +${pace.need} levels/week · recent trend: ${pace.trend == null ? 'not enough data' : '+' + pace.trend}/week — <strong>${pace.status}</strong>.` : '<a href="#/settings">Set a target date</a> to see your pace.'}</p></div>
            <div><div class="eyebrow">What to do next</div><div class="stack small mt-4" style="--gap:6px">${rm.next.map((n) => `<div>· ${esc(n)}</div>`).join('') || '<div class="muted">Keep going — you are close to the next level.</div>'}</div></div>
          </div></div>
        <div class="section"><div class="section-head"><h2>Evidence for ${rm.level} completion</h2><span class="faint small">${Math.round(rm.readiness * 100)}%</span></div>
          <div class="stack" style="--gap:16px">${rm.comps.map((c) => `<div><div class="between small"><span>${esc(c.label)} <span class="faint">· weight ${Math.round(c.weight * 100)}%</span></span><span class="muted">${esc(c.detail)}</span></div><div class="mt-8">${ui.bar(c.value * 100, 'thin accent')}</div></div>`).join('')}</div></div>
        <div class="section"><div class="section-head"><h2>Skills</h2><span class="faint small">estimate · trend</span></div>
          <div class="list">${U.SKILLS.map((s) => { const sk = L.skills[s] || {}; const t = sk.theta; const h = (sk.hist || []).slice(-40).map((x) => x[1]); return `<div class="row"><span style="width:110px">${U.SKILL_LABEL[s]}</span>${ui.dots(t)}<span class="level" style="width:46px">${t == null ? '—' : U.thetaInfo(t).sub}</span><div class="grow hide-sm" style="max-width:240px">${ui.spark(h)}</div><span class="faint xs" style="width:130px;text-align:right;white-space:nowrap">${sk.conf || 'low'} confidence</span></div>`; }).join('')}</div></div>
        <div class="section"><div class="section-head"><h2>This month</h2><span class="faint small">since ${U.fmtDate(mStart, { day: 'numeric', month: 'short' })}</span></div>
          <div class="stats-row"><div class="stat"><span class="v">+${month.wordsStable}</span><span class="k">words & chunks mastered</span></div><div class="stat"><span class="v">+${month.grammarMastered}</span><span class="k">grammar topics</span></div><div class="stat"><span class="v">+${month.listeningSessions}</span><span class="k">listening sessions</span></div><div class="stat"><span class="v">+${month.writings}</span><span class="k">writing exercises</span></div><div class="stat"><span class="v">+${month.speakings}</span><span class="k">speaking tasks</span></div><div class="stat"><span class="v">${U.fmtMin(month.minutes)}</span><span class="k">study time</span></div></div>
          <div class="mt-24"><div class="bars-mini" aria-label="Minutes per day, last 28 days">${last28.map((d) => `<i class="${d === U.today() ? 'today' : (mins[d] ? 'on' : '')}" style="height:${Math.max(3, ((mins[d] || 0) / maxMin) * 100)}%" title="${U.fmtDate(d)}: ${mins[d] || 0} min"></i>`).join('')}</div><div class="between faint xs mt-4"><span>4 weeks ago</span><span>today</span></div></div></div>
        <div class="section"><div class="section-head"><h2>Competence gained</h2><span class="faint small">What can you do now that you couldn't before?</span></div>
          ${L.gains.length ? `<div class="list">${L.gains.slice(0, 20).map((g) => `<div class="gain">${icon('checkCircle', 18)}<div><div>${esc(g.text)}</div><div class="faint xs">${U.fmtDate(g.date)} · ${esc(U.SKILL_LABEL[g.skill] || '')} ${esc(g.level)}${g.kind === 'scenario' ? ' · professional scenario' : ''}</div></div></div>`).join('')}</div>` : `<p class="muted small">Gains appear when a skill crosses into a new level or when you complete a professional scenario well.</p>`}
          <div class="mt-16"><div class="eyebrow">At your current level you can…</div><div class="stack small mt-8" style="--gap:6px">${U.SKILLS.map((s) => { const t = LOS.skills.theta(L, s); const lv = t == null ? null : U.thetaInfo(t).label; const c = lv && LOS.shared.CANDO[s][lv]; return c ? `<div><span class="faint">${U.SKILL_LABEL[s]}:</span> ${esc(c[0])}</div>` : ''; }).join('')}</div></div></div>
        <div class="section grid grid-2" style="--gap:40px">
          <div><div class="section-head"><h3>Placement tests</h3></div>${L.assessments.length ? `<div class="list">${L.assessments.slice().reverse().map((a) => `<div class="row"><span class="grow">${U.fmtDate(a.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span class="level">${esc(a.overall.sub)}</span><span class="faint small">${a.items} items</span></div>`).join('')}</div>` : '<p class="muted small">Estimated from self-assessment only.</p>'}</div>
          <div><div class="section-head"><h3>Milestones</h3><span class="faint small">${L.xp} XP</span></div><div class="list">${ach.map((a) => `<div class="row" style="min-height:40px;padding:8px 0"><span class="${L.achievements.includes(a.id) ? 'ok' : 'faint'}">${icon(L.achievements.includes(a.id) ? 'checkCircle' : 'circle', 16)}</span><span class="small ${L.achievements.includes(a.id) ? '' : 'faint'}">${esc(a.label)}</span></div>`).join('')}</div></div>
        </div>
      </div>`;
    },
  };

  /* ======================================================================
   * Error log
   * ====================================================================== */
  const errState = { cat: 'all', label: null, showResolved: false };
  V.errors = {
    title: 'Error Log',
    render() {
      const L = lang();
      if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'errors', title: 'No errors yet' })}</div>`;
      const stats = LOS.learn.errorStats(code(), 60);
      const max = stats.byLabel.length ? stats.byLabel[0].weight : 1;
      const list = L.errors.filter((e) => (errState.showResolved || !e.resolved) && (errState.cat === 'all' || e.cat === errState.cat) && (!errState.label || e.label === errState.label));
      const catLabel = Object.fromEntries(LOS.shared.ERROR_CATS);
      const dueCards = LOS.learn.dueErrorCards(code()).length;
      return `<div class="view">
        <div class="page-head"><div><h1>Error Log</h1><p class="sub">Every mistake from exercises, writing, speaking and reviews — classified, counted and fed back into your plan. Frequent patterns get more practice; fixed ones fade out.</p></div>
          <div class="cluster"><button class="btn" data-act="add">${icon('plus', 15)} Add an error</button><button class="btn primary" data-act="practise">${icon('review', 15)} Practise errors${dueCards ? ` · ${dueCards} due` : ''}</button></div></div>
        <div class="grid grid-2" style="--gap:40px">
          <div><div class="section-head"><h2>Most frequent errors</h2><span class="faint small">last 60 days, recent weighted</span></div>
            ${stats.byLabel.length ? stats.byLabel.slice(0, 8).map((x, i) => `<div class="freq-row clickable" data-act="label" data-v="${esc(x.label)}" role="button" style="cursor:pointer"><span class="n">${i + 1}.</span><span class="${errState.label === x.label ? 'strong' : ''}">${esc(x.label)}</span>${ui.bar((x.weight / max) * 100, 'thin')}<span class="num faint">${x.count}</span></div>`).join('') : '<p class="muted small">No errors recorded yet. They will appear automatically as you practise.</p>'}</div>
          <div><div class="section-head"><h2>By category</h2></div>
            <div class="list">${LOS.shared.ERROR_CATS.filter(([k]) => stats.byCat[k]).map(([k, l]) => `<div class="row" style="min-height:40px;padding:8px 0"><span class="grow">${l}</span><span class="num">${stats.byCat[k]}</span></div>`).join('') || '<p class="muted small">—</p>'}</div>
            <p class="faint small mt-16">How the planner uses this: grammar-type errors raise grammar time and pull the linked topic forward; collocation, word-choice, false-friend and Italian-interference errors raise vocabulary work; every corrected sentence becomes a review card.</p></div>
        </div>
        <div class="section"><div class="between" style="flex-wrap:wrap">${ui.chips('cat', [['all', 'All']].concat(LOS.shared.ERROR_CATS), errState.cat)}
          <label class="check small"><input type="checkbox" data-act="resolved" ${errState.showResolved ? 'checked' : ''}> Show resolved</label></div>
          ${errState.label ? `<div class="mt-12"><span class="pill accent">${esc(errState.label)} <button class="btn ghost icon sm" data-act="clearLabel" aria-label="Clear filter" style="height:18px;width:18px">${icon('x', 12)}</button></span></div>` : ''}
          <div class="list mt-16">${list.slice(0, 150).map((e) => `<div class="err"><div>${e.wrong ? `<div class="w">${esc(e.wrong)}</div>` : ''}<div class="r">${esc(e.right)}</div>${e.note ? `<div class="faint small mt-4">${esc(e.note)}</div>` : ''}<div class="faint xs mt-4">${esc(e.label)} · ${esc(catLabel[e.cat] || e.cat)} · ${esc(e.src)} · ${U.relDate(e.date)}</div></div>
            <div class="cluster" style="align-items:flex-start"><button class="btn ghost sm" data-act="resolve" data-id="${e.id}">${e.resolved ? 'Reopen' : 'Resolved'}</button><button class="btn ghost icon sm" data-act="del" data-id="${e.id}" aria-label="Delete">${icon('trash', 14)}</button></div></div>`).join('') || ui.empty({ icon: 'checkCircle', title: 'Nothing here', text: 'No errors match this filter.' })}</div></div>
      </div>`;
    },
    mount(root) {
      const L = lang();
      ui.delegate(root, {
        cat(el) { errState.cat = el.dataset.v; LOS.app.refresh(); },
        label(el) { errState.label = errState.label === el.dataset.v ? null : el.dataset.v; LOS.app.refresh(); },
        clearLabel() { errState.label = null; LOS.app.refresh(); },
        resolved(el) { errState.showResolved = el.checked; LOS.app.refresh(); },
        resolve(el) { const e = L.errors.find((x) => x.id === el.dataset.id); if (e) e.resolved = !e.resolved; LOS.store.save(); LOS.app.refresh(); },
        del(el) { L.errors = L.errors.filter((x) => x.id !== el.dataset.id); delete L.errorCards[el.dataset.id]; LOS.store.save(); LOS.app.refresh(); },
        practise() {
          // bring the most relevant error cards forward (filtered label first), then run a review
          const ids = Object.keys(L.errorCards).filter((id) => { const e = L.errors.find((x) => x.id === id); return e && !e.resolved && (!errState.label || e.label === errState.label); }).slice(0, 12);
          if (!ids.length) { ui.toast('No error cards to practise yet', 'info'); return; }
          ids.forEach((id) => (L.errorCards[id].due = U.today()));
          LOS.store.save();
          location.hash = '#/practice/review/errors';
        },
        add() {
          ui.modal({
            title: 'Add an error',
            body: `<div class="stack" style="--gap:12px"><div class="field"><label for="e-w">What you said / wrote</label><input class="input" id="e-w"></div><div class="field"><label for="e-r">Correct version</label><input class="input" id="e-r"></div>
              <div class="grid grid-2"><div class="field"><label for="e-c">Category</label><select class="select" id="e-c">${LOS.shared.ERROR_CATS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div class="field"><label for="e-l">Area (e.g. Prepositions)</label><input class="input" id="e-l" placeholder="Prepositions"></div></div>
              <div class="field"><label for="e-n">Note</label><input class="input" id="e-n"></div></div>`,
            foot: '<button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Save</button>',
            onMount(m, close) {
              m.querySelector('[data-ok]').addEventListener('click', () => {
                const v = (id) => m.querySelector(id).value.trim();
                if (!v('#e-r')) { ui.toast('Add the correct version', 'errors'); return; }
                const cat = v('#e-c');
                LOS.learn.recordError(code(), { src: 'manual', cat, label: v('#e-l') || (LOS.shared.ERROR_CATS.find((c) => c[0] === cat) || [])[1], wrong: v('#e-w'), right: v('#e-r'), note: v('#e-n') });
                LOS.store.save(); close(); LOS.app.refresh();
              });
            },
          });
        },
      });
    },
  };

  /* ======================================================================
   * Weekly review
   * ====================================================================== */
  let lastNext = null;
  V.review = {
    title: 'Weekly Review',
    render() {
      const L = lang();
      if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'review', title: 'Nothing to review yet' })}</div>`;
      const s = LOS.progress.stats(code(), U.addDays(U.today(), -6));
      const wk = LOS.skills.weakest(L);
      const repeated = s.errors.filter((e) => e.count >= 2);
      const stableWords = Object.keys(L.vocab).filter((id) => { const st = L.vocab[id]; return st.stableAt && st.stableAt >= U.addDays(U.today(), -6); }).map((id) => (LOS.learn.vocabItem(code(), id) || {}).w).filter(Boolean);
      const last = L.reviews[L.reviews.length - 1];
      const next = lastNext;
      const improved = U.SKILLS.map((sk) => { const now = LOS.skills.theta(L, sk), then = LOS.skills.thetaAt(L, sk, U.addDays(U.today(), -7)); return { sk, d: now != null && then != null ? now - then : 0 }; }).filter((x) => x.d > 0.02).sort((a, b) => b.d - a.d);
      return `<div class="view narrow">
        <div class="page-head"><div><div class="eyebrow">${ui.langDot(code())} ${esc(ui.langName(code()))} · ${U.fmtDate(U.addDays(U.today(), -6), { day: 'numeric', month: 'short' })} – ${U.fmtDate(U.today(), { day: 'numeric', month: 'short' })}</div><h1 class="mt-4">Weekly review</h1><p class="sub">Look back honestly; the planner adapts next week's load and focus to your answers.</p></div></div>
        <div class="stats-row"><div class="stat"><span class="v">${U.fmtMin(s.minutes)}</span><span class="k">Study time</span></div><div class="stat"><span class="v">${U.fmtMin(s.listening)}</span><span class="k">Listening</span></div><div class="stat"><span class="v">${s.wordsStable}</span><span class="k">Vocabulary learned</span></div><div class="stat"><span class="v">${s.grammarMastered}</span><span class="k">Grammar mastered</span></div><div class="stat"><span class="v">${s.writings}</span><span class="k">Writing</span></div><div class="stat"><span class="v">${s.speakings}</span><span class="k">Speaking</span></div><div class="stat"><span class="v">${s.daysStudied}/7</span><span class="k">Consistency</span></div><div class="stat"><span class="v">${s.realism == null ? '—' : Math.round(s.realism * 100) + '%'}</span><span class="k">Plan completed</span></div></div>
        <div class="section grid grid-2" style="--gap:32px">
          <div><div class="eyebrow">What improved</div><div class="mt-8 small">${improved.length ? improved.map((x) => `${U.SKILL_LABEL[x.sk]} +${U.round(x.d, 2)}`).join(' · ') : '<span class="muted">No measurable change yet.</span>'}</div>
            <div class="eyebrow mt-16">Repeated mistakes</div><div class="mt-8 small">${repeated.length ? repeated.slice(0, 5).map((e) => `${esc(e.label)} (${e.count})`).join(' · ') : '<span class="muted">None repeated.</span>'}</div></div>
          <div><div class="eyebrow">Vocabulary that became stable</div><div class="mt-8 small">${stableWords.length ? esc(stableWords.slice(0, 12).join(', ')) : '<span class="muted">None this week.</span>'}</div>
            <div class="eyebrow mt-16">Weakest skill</div><div class="mt-8 small">${wk ? `${U.SKILL_LABEL[wk.skill]} (${U.thetaInfo(wk.theta).sub})` : '—'} · ${s.skipped} skipped · ${s.missed} missed activities</div></div>
        </div>
        <div class="section card"><form id="wr" class="stack" style="--gap:14px">
          <div class="field"><label for="q1">What did you learn?</label><textarea class="textarea" id="q1" name="learned" rows="2"></textarea></div>
          <div class="field"><label for="q2">What did you struggle with?</label><textarea class="textarea" id="q2" name="struggled" rows="2"></textarea></div>
          <div class="field"><label for="q3">What improved?</label><textarea class="textarea" id="q3" name="improved" rows="2"></textarea></div>
          <div class="field"><label>Was the workload realistic?</label>${ui.seg('wl', [['too little', 'Too little'], ['right', 'About right'], ['too much', 'Too much']], 'right')}</div>
          <div class="field"><label for="q5">Focus next week</label><select class="select" id="q5" name="focus">${U.SKILLS.map((sk) => `<option value="${sk}" ${wk && wk.skill === sk ? 'selected' : ''}>${U.SKILL_LABEL[sk]}${wk && wk.skill === sk ? ' (weakest)' : ''}</option>`).join('')}</select></div>
          <div class="cluster"><span class="faint small">Current load factor: ${S().meta.loadFactor || 1}×</span><button class="btn primary right" type="submit">Save & plan next week</button></div>
        </form></div>
        ${next ? nextWeekHTML(next) : last ? `<p class="faint small mt-24">Last review: ${U.fmtDate(last.date)} · focus ${U.SKILL_LABEL[last.focus] || '—'} · load ${last.loadFactor}×</p>` : ''}
      </div>`;
    },
    mount(root) {
      let wl = 'right';
      ui.delegate(root, { wl(el) { wl = el.dataset.v; root.querySelectorAll('[data-act="wl"]').forEach((b) => b.classList.toggle('active', b === el)); } });
      const form = root.querySelector('#wr');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const res = LOS.progress.saveWeeklyReview(code(), { answers: { learned: data.learned, struggled: data.struggled, improved: data.improved }, workload: wl, focus: data.focus });
        lastNext = res.next;
        ui.toast('Review saved — next week adapted');
        LOS.app.refresh();
        setTimeout(() => { const n = document.getElementById('next-week'); if (n) n.scrollIntoView({ behavior: 'smooth' }); }, 60);
      });
    },
  };

  function nextWeekHTML(nw) {
    return `<div class="section" id="next-week"><div class="section-head"><h2>Next week</h2><span class="faint small">${U.fmtMin(nw.total)} · ${nw.deepDays} deep days · ${nw.lightDays} light days</span></div>
      <div class="list">${nw.days.map((d) => `<div class="row"><span style="width:96px" class="strong small">${U.fmtDate(d.date)}</span><div class="grow"><div class="small">${esc(d.budget.info.label)}</div><div class="cluster mt-4">${d.langs.map((l) => l.blocks.map((b) => `<span class="pill outline xs"><i class="cat-dot ${ui.CAT_OF[b.skill] || 'study'}"></i>${LOS.lang.get(l.code).short} ${esc(U.SKILL_LABEL[b.skill] || b.skill)} ${b.minutes}′</span>`).join('')).join('')}</div></div><span class="pill">${d.budget.mode === 'rest' ? 'rest' : d.budget.minutes + ' min'}</span></div>`).join('')}</div>
      <div class="mt-24">${Object.keys(nw.priorities).map((c) => { const pr = nw.priorities[c]; return `<div class="card soft mt-8"><div class="strong">${ui.langDot(c)} ${esc(ui.langName(c))} priorities</div><div class="small muted mt-8">Focus skill: <strong>${U.SKILL_LABEL[pr.focus] || '—'}</strong> · Grammar: ${esc(pr.topic || '—')} · Planned listening: ${U.fmtMin(pr.listening)}${pr.errors.length ? ` · Error patterns: ${esc(pr.errors.join(', '))}` : ''}</div></div>`; }).join('')}</div></div>`;
  }
})();

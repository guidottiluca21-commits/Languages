/* VIEWS — adaptive layer: the home screen ("What should I do now?"), the input library,
 * analytics (consistency, retention, active vocabulary, weaknesses, speaking, readiness, transfer)
 * and the personal error bank. Calm, one obvious next action, low cognitive load. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const V = LOS.views;
  const code = () => LOS.store.active();
  const lang = () => LOS.store.lang(code());

  const TIMES = [[5, '5 min'], [15, '15 min'], [30, '30 min'], [45, '45+ min']];
  const ARROW = { up: ['↑', 'ok'], flat: ['→', ''], down: ['↓', 'warn'] };

  /** "8 reviews · 1 new concept · 1 speaking task" from the plan items still pending. */
  function sessionSummary(code, items) {
    const due = LOS.learn.dueVocab(code).length + LOS.learn.dueErrorCards(code).length;
    const parts = [];
    const add = (n, one, many) => { if (n) parts.push(`${n} ${n === 1 ? one : many}`); };
    let rev = 0, nw = 0, tasks = 0, speak = 0, write = 0, input = 0, gram = 0;
    items.forEach((i) => {
      if (i.type === 'review') rev += Math.max(1, Math.min(i.payload.cap || 5, due || i.payload.cap || 5));
      else if (i.type === 'vocabulary') nw += i.payload.count || 5;
      else if (i.type === 'micro') tasks += i.payload.count || 5;
      else if (i.type === 'grammar' || i.type === 'remedy') gram++;
      else if (['speaking', 'sim', 'scenario'].includes(i.type) || (i.type === 'think' && i.skill === 'speaking')) speak++;
      else if (i.type === 'writing') write++;
      else if (i.type === 'listening' || i.type === 'reading') input++;
      else if (i.type === 'think') tasks += i.payload.count || 4;
    });
    add(rev, 'review', 'reviews'); add(nw, 'new item', 'new items'); add(gram, 'grammar step', 'grammar steps'); add(tasks, 'short task', 'short tasks'); add(input, 'listening / reading', 'listening / reading'); add(speak, 'speaking task', 'speaking tasks'); add(write, 'writing task', 'writing tasks');
    return parts;
  }

  /* ---------------- HOME ---------------- */
  function home(c, o) {
    const L = LOS.store.lang(c);
    const plan = o.plan;
    const away = LOS.queue.daysAway(c);
    const chosen = plan && plan.chosen ? plan.chosen.minutes : null;
    const study = plan && plan.chosen ? plan.chosen.study : null;
    const pending = plan ? plan.items.filter((i) => i.status === 'pending') : [];
    const mins = U.sum(pending.map((i) => i.minutes));
    const q = LOS.queue.build(c);
    const rd = LOS.goals.readiness(c);
    const welcome = away != null && away >= 3 ? `<div class="welcome-back">${icon('sparkle', 16)}<div><strong>Welcome back.</strong> Nothing to catch up on — today's session is rebuilt from what matters most now.</div></div>` : '';
    const sessionCard = o.first
      ? `<div class="session-card">
          <div class="eyebrow">Your session</div>
          <div class="sess-lines">${sessionSummary(c, pending).map((x) => `<span>${esc(x)}</span>`).join('')}</div>
          <div class="between mt-16" style="flex-wrap:wrap;gap:12px"><span class="muted small">${mins} min · ${esc(plan.focus.title)}</span>
            <a class="btn primary lg" href="#/session/${c}/${U.today()}/${o.first.id}">${plan.items.some((i) => i.status === 'done') ? 'Continue' : 'Start'} ${icon('arrowRight', 16)}</a></div>
        </div>`
      : `<div class="session-card">${o.focus}</div>`;
    const dot = (cls, n, label) => `<span class="q-dot ${cls}"><i></i>${n} ${label}</span>`;
    const skills = [['speaking', 'Speaking'], ['vocabulary', 'Vocabulary'], ['listening', 'Listening'], ['grammar', 'Grammar'], ['writing', 'Writing']];
    const prog = skills.map(([k, l]) => { const t = LOS.goals.trend(c, k); const a = ARROW[t] || ['·', 'faint']; return `<span class="trend ${a[1]}">${l} <b>${a[0]}</b></span>`; }).join('');
    const goalFlag = rd.country ? `${esc(rd.country)} · ` : '';
    const ex = LOS.exposure.week(c);
    return `${welcome}
      <div class="today-card">
        <div class="between" style="flex-wrap:wrap;gap:10px"><div><div class="eyebrow">Today</div><h2 class="mt-4">How much time do you have?</h2></div>
          <span class="faint small">${esc(o.info.label)}</span></div>
        <div class="cluster mt-12">${TIMES.map(([m, l]) => `<button class="chip ${chosen === m || (!chosen && plan && Math.abs(plan.minutes - m) <= 4 && m !== 45) ? 'active' : ''}" data-act="time" data-v="${m}">${l}</button>`).join('')}</div>
        <div class="cluster mt-8 small">${Object.entries(LOS.planner.STUDY_MODES).map(([k, x]) => `<button class="chip sm ${study === k ? 'active' : ''}" data-act="mode" data-v="${k}" title="${esc(x.desc)}">${esc(x.label)}</button>`).join('')}</div>
        ${sessionCard}
        <div class="q-row mt-12">${dot('due', q.counts.due, 'due for review')}${dot('reinf', q.counts.reinforce, 'need reinforcement')}${dot('new', q.counts.new, 'new ready')}${dot('task', q.counts.task, q.counts.task === 1 ? 'speaking task' : 'tasks')}</div>
      </div>
      <div class="home-grid">
        <div class="home-box"><div class="eyebrow">Your progress</div><div class="trends mt-8">${prog}</div><div class="faint xs mt-8">Trend over the last two weeks</div></div>
        <div class="home-box"><div class="eyebrow">Your goal</div><div class="mt-4"><strong>${goalFlag}${esc(rd.label)}</strong></div>
          <div class="between mt-8 small"><span class="muted">Readiness</span><span class="num strong">${Math.round(rd.overall * 100)}%</span></div><div class="mt-4">${ui.bar(Math.round(rd.overall * 100), 'thin')}</div>
          <a class="small mt-8" style="display:inline-block" href="#/progress">Details</a></div>
        <div class="home-box"><div class="eyebrow">Your current focus</div><div class="mt-4 strong">${esc(LOS.goals.focus(c))}</div>
          ${rd.impact.length > 1 ? `<div class="faint xs mt-8">Then: ${esc(rd.impact.slice(1).map((x) => x.label).join(' · '))}</div>` : ''}</div>
      </div>
      <div class="home-box mt-16"><div class="between"><div class="eyebrow">This week in the real world</div><span class="faint xs">optional · ${ex.filter((x) => x.done).length}/4</span></div>
        <div class="exposure mt-8">${ex.map((x) => `<button class="exp-item ${x.done ? 'done' : ''}" data-act="exposure" data-v="${x.k}" aria-pressed="${x.done}">${icon(x.done ? 'checkCircle' : x.icon, 15)}<span>${esc(x.label)}</span></button>`).join('')}</div></div>`;
  }
  const homeHandlers = {
    time(el) { LOS.planner.setSession(code(), +el.dataset.v, (lang().plans[U.today()] || {}).chosen ? lang().plans[U.today()].chosen.study : null); ui.toast(`Session rebuilt for ${el.dataset.v} minutes`, 'today'); LOS.app.refresh(); },
    mode(el) {
      const cur = lang().plans[U.today()];
      const study = cur && cur.chosen && cur.chosen.study === el.dataset.v ? null : el.dataset.v;
      const def = { commute: 15, break: 5, evening: 25, deep: 45 }[el.dataset.v];
      const m = cur && cur.chosen ? cur.chosen.minutes : def;
      LOS.planner.setSession(code(), study ? (el.dataset.v === 'break' ? Math.min(m, 7) : el.dataset.v === 'deep' ? Math.max(m, 45) : m) : m, study);
      LOS.app.refresh();
    },
    exposure(el) { LOS.exposure.toggle(code(), el.dataset.v); LOS.store.save(); LOS.app.refresh(); },
  };

  /* ---------------- ANALYTICS ---------------- */
  function pct(v) { return v == null ? '—' : Math.round(v * 100) + '%'; }
  function analyticsHTML(c) {
    const a = LOS.analytics.overview(c);
    const prof = LOS.ped.masteryProfile(c);
    const sub = LOS.goals.profile(c);
    const alloc = LOS.goals.allocation(c);
    const hist = LOS.goals.snapshotAllocation(c);
    const prev = hist[1] && hist[1].a;
    const rd = a.readiness;
    const bar = (v) => `<span class="mini-bar"><i style="width:${Math.round((v || 0) * 100)}%"></i></span>`;
    return `<div class="section"><div class="section-head"><h2>Learning analytics</h2><span class="faint small">what matters, not points</span></div>
      <div class="stats-row">
        <div class="stat"><span class="v">${U.fmtMin(a.minutes)}</span><span class="k">Consistency · ${a.days} day${a.days === 1 ? '' : 's'} this week</span></div>
        <div class="stat"><span class="v">${pct(a.retention)}</span><span class="k">Retention${a.retention == null ? ' (needs more reviews)' : ` · ${a.reviewedN} items`}</span></div>
        <div class="stat"><span class="v">${a.active}</span><span class="k">Active vocabulary (used in production)</span></div>
        <div class="stat"><span class="v">${a.transfer.done}/${a.transfer.n}</span><span class="k">Real-world transfer · 4 weeks</span></div>
      </div>
      <div class="grid grid-2 mt-24" style="--gap:32px">
        <div><div class="section-head"><h3>Goal readiness · ${esc(rd.label)}</h3><span class="num strong">${pct(rd.overall)}</span></div>
          <div class="dims">${rd.dims.map((d) => `<div class="dim"><span>${esc(d.label)}</span>${ui.bar(Math.round(d.v * 100), 'thin')}<span class="num faint">${Math.round(d.v * 100)}</span></div>`).join('')}</div>
          <div class="mt-12 small"><strong>Your highest-impact areas</strong><ol class="mt-4">${rd.impact.map((x) => `<li>${esc(x.label)}</li>`).join('')}</ol></div></div>
        <div><div class="section-head"><h3>Current profile</h3><span class="faint small">estimates</span></div>
          <div class="list">${sub.map((r) => `<div class="row" style="min-height:34px"><span class="grow small">${esc(r.label)}</span><span class="pill">${esc(r.level)}</span></div>`).join('')}</div></div>
      </div>
      <div class="grid grid-2 mt-24" style="--gap:32px">
        <div><div class="section-head"><h3>Vocabulary: knowing vs using</h3><span class="faint small">${prof.n} items</span></div>
          <div class="dims">${prof.dims.map((d) => `<div class="dim"><span>${esc(d.label)}</span>${ui.bar(Math.round((d.v || 0) * 100), 'thin')}<span class="num faint">${d.v == null ? '—' : Math.round(d.v * 100)}</span></div>`).join('')}</div>
          <p class="faint xs mt-8">Recognising a word is not the same as using it: exercises are chosen from the weakest dimension.</p></div>
        <div><div class="section-head"><h3>How your study time is allocated</h3><span class="faint small">adapts to your weaknesses</span></div>
          <div class="dims">${Object.keys(alloc).map((k) => `<div class="dim"><span>${esc(U.SKILL_LABEL[k] || k)}</span>${bar(alloc[k] / 100)}<span class="num faint">${alloc[k]}%${prev && prev[k] != null && prev[k] !== alloc[k] ? ` <span class="${alloc[k] > prev[k] ? 'ok' : 'faint'}">(${alloc[k] > prev[k] ? '+' : ''}${alloc[k] - prev[k]})</span>` : ''}</span></div>`).join('')}</div>
          ${a.speaking.fluency != null || a.speaking.accuracy != null ? `<div class="section-head mt-16"><h3>Speaking</h3></div><div class="dims">${[['Fluency', a.speaking.fluency], ['Accuracy', a.speaking.accuracy], ['Lexical range', a.speaking.range], ['Interaction', a.speaking.interaction]].filter((x) => x[1] != null).map(([l, v]) => `<div class="dim"><span>${l}</span>${ui.bar(Math.round(v * 100), 'thin')}<span class="num faint">${Math.round(v * 100)}</span></div>`).join('')}</div>` : ''}</div>
      </div></div>`;
  }

  /* ---------------- ERROR BANK ---------------- */
  function errorBankHTML(c) {
    const b = LOS.errorBank.summary(c);
    if (!b.patterns.length) return `<div class="section"><div class="section-head"><h2>Personal error bank</h2></div><p class="muted small">No recurring patterns yet. Meaningful errors that repeat (not single typos) are collected here and recycled into your lessons.</p></div>`;
    const ST = { active: ['warn', 'Recurring'], improving: ['accent', 'Improving'], fading: ['', 'Fading'], resolved: ['ok', 'Resolved'] };
    return `<div class="section"><div class="section-head"><h2>Personal error bank</h2><span class="faint small">recurring patterns · part of your curriculum</span></div>
      ${b.byCat.length ? `<div class="cluster">${b.byCat.map((x) => `<span class="pill outline">${esc(x.label)} · ${x.n}</span>`).join('')}</div>` : ''}
      <div class="list mt-12">${b.patterns.slice(0, 12).map((p) => {
        const ex = p.examples[0];
        const [cls, lab] = ST[p.status];
        return `<div class="row" style="align-items:flex-start"><div class="grow"><div class="cluster"><strong>${esc(p.label)}</strong><span class="pill ${cls}">${lab}</span><span class="faint xs">${esc(p.catLabel)} · ${p.count}× · last ${U.relDate(p.last)}</span></div>
          ${ex ? `<div class="small mt-4"><span class="strike faint">${esc(ex.pat || ex.wrong)}</span> → <strong>${esc(ex.sugg || ex.right)}</strong></div>` : ''}</div>
          ${p.status !== 'resolved' ? `<a class="btn sm" href="#/practice/remedy/${encodeURIComponent(p.topic || p.label)}">Fix it</a>` : ''}</div>`;
      }).join('')}</div>
      <p class="faint xs mt-8">Recurring errors come back in reviews, in micro-tasks and as corrected sentences in later lessons until they stop appearing in your writing and speaking.</p></div>`;
  }

  /* ---------------- INPUT LIBRARY ---------------- */
  const KINDS = [['article', 'Article'], ['transcript', 'Transcript'], ['video', 'Video'], ['podcast', 'Podcast'], ['paper', 'Scientific paper'], ['notes', 'Notes'], ['web', 'Web text'], ['other', 'Other']];
  const libState = { open: null };
  V.library = {
    title: 'Input library',
    render() {
      const L = lang();
      if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'reading', title: 'Set up a language first' })}</div>`;
      const items = LOS.library.list(code());
      const open = items.find((x) => x.id === libState.open);
      return `<div class="view">
        <div class="page-head"><div><h1>Input library</h1><p class="sub">Articles, transcripts, papers, notes: add what you read and listen to. The app picks <strong>only</strong> the language that is useful for your level and goals — not a huge lesson from every text.</p></div></div>
        <div class="card"><form id="libf" class="stack" style="--gap:12px" autocomplete="off">
          <div class="grid grid-2"><div class="field"><label for="lib-t">Title</label><input class="input" id="lib-t" name="title" required maxlength="160"></div>
            <div class="field"><label for="lib-k">Type</label><select class="select" id="lib-k" name="kind">${KINDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
          <div class="field"><label for="lib-u">Link (optional)</label><input class="input" id="lib-u" name="url" placeholder="https://…"></div>
          <div class="field"><label for="lib-x">Text or transcript (${esc(LOS.lang.get(code()).name)}, up to ${LOS.library.MAX_TEXT} characters)</label><textarea class="textarea" id="lib-x" name="text" rows="6" required></textarea></div>
          <div class="cluster"><span class="faint xs grow">${LOS.AI.active() ? `Prepared by your AI provider (${esc(LOS.AI.providerLabel())}), with the local engine as fallback.` : 'Prepared locally: known curriculum items, words to look up, comprehension questions.'}</span><button class="btn primary" type="submit">${icon('plus', 15)} Add and prepare</button></div>
        </form></div>
        ${open ? libDetail(open) : ''}
        <div class="section"><div class="section-head"><h2>Your texts</h2><span class="faint small">${items.length}</span></div>
          <div class="list">${items.length ? items.map((x) => `<div class="row"><div class="grow clickable" data-act="openLib" data-id="${x.id}" role="button" tabindex="0"><div class="title">${esc(x.title)}</div><div class="meta">${esc((KINDS.find((k) => k[0] === x.kind) || [])[1] || '')} · ${U.fmtDate(x.date)}${x.out ? ` · ${(x.out.vocab || []).length} items selected` : ''}</div></div>
            ${x.out ? `<a class="btn sm primary" href="#/practice/library/${x.id}">Practise</a>` : `<button class="btn sm" data-act="prep" data-id="${x.id}">Prepare</button>`}<button class="btn ghost icon sm" data-act="delLib" data-id="${x.id}" aria-label="Delete">${icon('trash', 14)}</button></div>`).join('') : '<p class="muted small">Nothing yet.</p>'}</div></div>
      </div>`;
    },
    mount(root) {
      ui.delegate(root, {
        openLib(el) { libState.open = libState.open === el.dataset.id ? null : el.dataset.id; LOS.app.refresh(); },
        async prep(el) { await prepare(el.dataset.id); },
        async delLib(el) { if (!(await ui.confirm('Delete this text?', '', 'Delete', true))) return; LOS.library.remove(code(), el.dataset.id); LOS.store.save(); LOS.app.refresh(); },
        addWord(el) {
          const it = LOS.library.list(code()).find((x) => x.id === el.dataset.id);
          const w = el.dataset.w;
          const ex = it ? (U.sentences(it.text).find((s) => U.norm(s).includes(U.norm(w))) || '') : '';
          try { const c = LOS.learn.addCustomVocab(code(), { w, ex, def: '', tr: '', src: 'library', ctx: it ? it.title : '' }); LOS.learn.introduceVocab(code(), [c.id], 'library'); LOS.store.save(); ui.toast(`“${w}” added — add a translation in Vocabulary`); } catch (e) { ui.toast('Already in your vocabulary', 'info'); }
        },
      });
      const f = root.querySelector('#libf');
      if (f) f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(f).entries());
        if (!d.text.trim()) return;
        const it = LOS.library.add(code(), d);
        LOS.store.save();
        libState.open = it.id;
        await prepare(it.id);
      });
    },
  };
  async function prepare(id) {
    const it = LOS.library.list(code()).find((x) => x.id === id);
    if (!it) return;
    ui.toast('Preparing the text…', 'reading');
    const r = await LOS.AI.adaptContent(code(), { text: it.text, title: it.title });
    const local = LOS.library.localAdapt(code(), it.text);
    it.out = { vocab: (r.vocab || []).slice(0, 8), expressions: (r.expressions || []).slice(0, 4), questions: (r.questions || []).filter((q) => q && q.q && Array.isArray(q.o) && q.a >= 0 && q.a < q.o.length).slice(0, 3), prompts: (r.prompts || []).slice(0, 2), unknown: r.unknown || local.unknown, src: r._source || 'local' };
    if (!it.out.vocab.length && !it.out.questions.length) it.out = Object.assign({}, local, { src: 'local' });
    libState.open = id;
    LOS.store.save();
    LOS.app.refresh();
  }
  function libDetail(it) {
    const o = it.out;
    if (!o) return `<div class="card soft mt-16"><strong>${esc(it.title)}</strong><p class="muted small mt-4">Not prepared yet.</p><button class="btn sm mt-8" data-act="prep" data-id="${it.id}">Prepare</button></div>`;
    return `<div class="card soft mt-16"><div class="between"><strong>${esc(it.title)}</strong><span class="pill ${o.src === 'local' ? 'outline' : 'accent'}">${o.src === 'local' ? 'Local' : 'AI'}</span></div>
      <div class="grid grid-2 mt-12" style="--gap:20px">
        <div><div class="eyebrow">Useful for you (${(o.vocab || []).length})</div>${(o.vocab || []).length ? `<ul class="small mt-4">${o.vocab.map((v) => `<li><strong>${esc(v.w)}</strong>${v.tr ? ` — ${esc(v.tr)}` : ''}</li>`).join('')}</ul>` : '<p class="faint small">Nothing at your level from the curriculum.</p>'}</div>
        <div><div class="eyebrow">Words to look up</div><div class="cluster mt-4">${(o.unknown || []).map((w) => `<button class="chip sm" data-act="addWord" data-id="${it.id}" data-w="${esc(w)}" title="Add to my vocabulary">${esc(w)} +</button>`).join('') || '<span class="faint small">—</span>'}</div>
          <div class="eyebrow mt-12">Practice</div><p class="small">${(o.questions || []).length} comprehension question${(o.questions || []).length === 1 ? '' : 's'} · ${(o.prompts || []).length ? '1 speaking prompt' : ''}</p></div></div>
      <div class="cluster mt-12"><a class="btn primary sm" href="#/practice/library/${it.id}">Practise this text</a></div></div>`;
  }

  LOS.adaptUI = { home, homeHandlers, analyticsHTML, errorBankHTML, sessionSummary };
})();

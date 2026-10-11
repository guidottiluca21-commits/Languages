/* VIEWS — Certifications: recommended exams, exam goal with countdown and readiness per paper,
 * exam profiles (papers, timing, scoring, traps), task types (learn → practise → timed) and mocks. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const V = LOS.views;
  const X = LOS.exams;
  const code = () => LOS.store.active();
  const lang = () => LOS.store.lang(code());
  const STEP = ['Not started', 'Strategy seen', 'Learned', 'Done in exam conditions'];

  function goalCard(c) {
    const g = X.goal(c);
    const exams = X.list(c);
    const ex = g ? g.exam : exams[0];
    if (!g) {
      return `<div class="card"><div class="eyebrow">Your exam goal</div><p class="small muted mt-4">Choose an exam and a date: the planner adds exam-format practice that grows as the date approaches — always interleaved with the rest, never a backlog.</p>
        <div class="form-grid mt-12"><div class="field"><label for="g-ex">Exam</label><select class="select" id="g-ex">${exams.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="g-lv">Level / target</label><select class="select" id="g-lv">${(ex ? ex.levels : []).map((l) => `<option ${ex && l === ex.focus ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
          <div class="field"><label for="g-dt">Exam date (optional)</label><input class="input" type="date" id="g-dt"></div></div>
        <button class="btn primary mt-12" data-act="setGoal">Set as my goal</button></div>`;
    }
    const rd = X.readiness(c, g.id);
    const nx = X.nextActivity(c);
    return `<div class="card"><div class="between" style="flex-wrap:wrap;gap:8px"><div><div class="eyebrow">Your exam goal</div><h2 class="mt-4">${esc(g.name)} ${esc(g.level || '')}</h2>
        <div class="small muted">${g.date ? `${U.fmtDate(g.date)} · ${g.daysLeft >= 0 ? `${g.daysLeft} day${g.daysLeft === 1 ? '' : 's'} left` : 'date passed'}` : 'No date set'} · exam practice is ${Math.round(X.share(c) * 100)}% of your sessions</div></div>
        <div class="cluster"><a class="btn sm" href="#/exams/${g.id}">Exam profile</a><button class="btn ghost sm" data-act="clearGoal">Change</button></div></div>
      <div class="between mt-16 small"><span class="muted">Readiness (estimate)</span><span class="num strong">${Math.round(rd.overall * 100)}%</span></div><div class="mt-4">${ui.bar(Math.round(rd.overall * 100))}</div>
      <div class="dims mt-12">${rd.papers.map((p) => `<div class="dim"><span>${esc(p.name)}</span>${ui.bar(Math.round(p.v * 100), 'thin')}<span class="num faint">${p.est ? esc(p.est.label.split(' · ')[0]) : '—'}</span></div>`).join('')}</div>
      <div class="small mt-12"><strong>Highest impact:</strong> ${rd.impact.map((p) => esc(p.name)).join(' · ')}${rd.weakCriteria.length ? ` · weakest criteria: ${rd.weakCriteria.map((w) => esc(w.label)).join(', ')}` : ''}</div>
      ${nx ? `<div class="between mt-16" style="flex-wrap:wrap;gap:8px"><span class="small">Next: <strong>${esc(nx.type.name)}</strong> · ${nx.mode === 'learn' ? 'learn it (strategy + language first)' : nx.mode === 'timed' ? 'in exam conditions' : 'practice'}</span><a class="btn primary" href="#/practice/exam/${nx.task.id}/${nx.mode}/${g.id}">Start ${icon('arrowRight', 15)}</a></div>` : ''}
      <p class="faint xs mt-12">Estimates for practice only — not official scores.</p></div>`;
  }

  V.exams = {
    title: 'Certifications',
    render(params) {
      const L = lang();
      if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'award', title: 'Set up a language first' })}</div>`;
      if (params[0]) return profile(params[0]);
      const c = code();
      const rec = X.recommend(c);
      const exams = X.list(c);
      return `<div class="view">
        <div class="page-head"><div><h1>Certifications</h1><p class="sub">Exam preparation for ${esc(LOS.lang.get(c).name)}: strategy and language first, then practice in the real format, then mocks with the real timing. All tasks are original and written for this app, following the published formats; no affiliation with any exam body.</p></div></div>
        ${goalCard(c)}
        ${rec.length ? `<div class="section"><div class="section-head"><h2>Recommended for your goal</h2></div><div class="list">${rec.map((r) => `<a class="row clickable" href="#/exams/${r.id}"><div class="grow"><div class="title">${esc(X.exam(r.id).name)}</div><div class="meta">${esc(r.why)}</div></div>${icon('chevronRight', 16)}</a>`).join('')}</div><p class="faint xs mt-8">${esc(rec[0].verify)}</p></div>` : ''}
        <div class="section"><div class="section-head"><h2>All exams</h2><span class="faint small">${exams.length}</span></div>
          <div class="exam-grid">${exams.map((e) => `<a class="exam-card" href="#/exams/${e.id}"><div class="between"><strong>${esc(e.name)}</strong><span class="pill">${esc(e.levels.join(' · '))}</span></div><div class="faint small mt-4">${esc(e.body)}</div><div class="small mt-8">${esc(e.who)}</div></a>`).join('')}</div></div>
      </div>`;
    },
    mount(root) {
      const sel = root.querySelector('#g-ex');
      if (sel) sel.addEventListener('change', () => { const e = X.exam(sel.value); const lv = root.querySelector('#g-lv'); lv.innerHTML = e.levels.map((l) => `<option ${l === e.focus ? 'selected' : ''}>${esc(l)}</option>`).join(''); });
      ui.delegate(root, {
        setGoal(el) {
          const id = (root.querySelector('#g-ex') || {}).value || el.dataset.id;
          X.setGoal(code(), { id, level: (root.querySelector('#g-lv') || {}).value, date: (root.querySelector('#g-dt') || {}).value });
          LOS.store.save(); LOS.planner.ensureToday(true); ui.toast('Exam goal saved — your plan now includes exam practice'); LOS.app.refresh();
        },
        clearGoal() { X.setGoal(code(), null); LOS.store.save(); LOS.planner.ensureToday(true); LOS.app.refresh(); },
      });
    },
  };

  function profile(id) {
    const e = X.exam(id);
    if (!e || e.lang !== code()) return `<div class="view narrow">${ui.empty({ icon: 'errors', title: 'Exam not found for this language', action: '<a class="btn" href="#/exams">Certifications</a>' })}</div>`;
    const c = code();
    const at = X.attempts(c, id).slice(0, 10);
    const g = X.goal(c);
    return `<div class="view">
      <a class="small" href="#/exams">${icon('chevronLeft', 14)} Certifications</a>
      <div class="page-head mt-8"><div><div class="cluster"><span class="pill">${esc(e.levels.join(' · '))}</span><span class="faint small">${esc(e.body)}</span></div><h1 class="mt-8">${esc(e.name)}</h1><p class="sub">${esc(e.who)}</p></div>
        <div class="cluster">${g && g.id === id ? '<span class="pill ok">Your goal</span>' : `<button class="btn" data-act="setGoal" data-id="${id}">Set as my goal</button>`}<a class="btn primary" href="#/practice/mock/${id}/all">Full mock</a></div></div>
      <div class="notice">${icon('info', 16)}<div>Formats change: check the details on the <a href="${esc(e.url)}" target="_blank" rel="noopener">official website</a> before booking. Profile last reviewed: ${esc(e.lastReviewed)}. Tasks here are original practice material, not official papers.</div></div>
      <div class="grid grid-2 mt-24" style="--gap:28px">
        <div><div class="section-head"><h3>Scoring</h3></div><p class="small">${esc(e.scoring)}</p><p class="small mt-8"><strong>Pass / target:</strong> ${esc(e.pass)}</p></div>
        <div><div class="section-head"><h3>Typical traps for Italian speakers</h3></div><ul class="small">${e.traps.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div>
      ${e.papers.map((p) => {
        const types = X.typesFor(id, p.id);
        return `<div class="section"><div class="section-head"><h2>${esc(p.name)}</h2><span class="faint small">${p.minutes} min · ${esc(p.format)}</span></div>
          <p class="small muted">${esc(p.tests)}</p>
          <div class="list mt-8">${types.map((ty) => {
            const pr = X.progress(c, ty.id);
            const t = X.tasksFor(id, p.id).find((x) => x.type === ty.id);
            return `<div class="row" style="flex-wrap:wrap"><div class="grow"><div class="title">${esc(ty.name)}</div><div class="meta">${esc(STEP[pr.step || 0])}</div></div>
              ${t ? `<div class="cluster"><a class="btn sm ${pr.step < 2 ? 'primary' : ''}" href="#/practice/exam/${t.id}/learn/${id}">Learn</a><a class="btn sm" href="#/practice/exam/${t.id}/practice/${id}">Practise</a><a class="btn sm ${pr.step >= 2 ? 'primary' : ''}" href="#/practice/exam/${t.id}/timed/${id}">Timed</a></div>` : '<span class="faint small">no task yet</span>'}</div>`;
          }).join('')}</div>
          <div class="mt-8"><a class="btn sm" href="#/practice/mock/${id}/${p.id}">Mock: ${esc(p.name)} (${p.minutes} min)</a></div></div>`;
      }).join('')}
      <div class="section"><div class="section-head"><h2>Your results</h2><span class="faint small">estimates · practice only</span></div>
        ${at.length ? `<div class="list">${at.map((a) => `<div class="row"><span class="faint small" style="width:90px">${U.fmtDate(a.date)}</span><span class="grow small">${esc((e.papers.find((p) => p.id === a.paper) || {}).name || a.paper)} · ${esc(a.mode)}</span><span class="small">${esc(a.est || Math.round(a.pct * 100) + '%')}</span></div>`).join('')}</div>` : '<p class="muted small">No attempts yet.</p>'}</div>
    </div>`;
  }
})();

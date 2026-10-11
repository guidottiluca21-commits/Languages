/* RUNNERS — certification practice:
 *   examTask   one task type, taught before tested: strategy lesson → controlled → guided → timed full task
 *              (modes: learn | practice (untimed, with help) | timed (exam conditions))
 *   mock       a section mock (one paper) or a full mock with the real timing, no help, results per paper/criterion
 * Scores are local estimates against the exam's public criteria — never official scores. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const R = LOS.run.runners;
  const H = LOS.run.helpers;
  const X = LOS.exams;
  const wc = (t) => (String(t).match(/[\p{L}\d][\p{L}\d'’-]*/gu) || []).length;

  /* ---------------- shared rendering ---------------- */
  function tableHTML(tb) { return tb ? `<table class="data-table mt-8"><thead><tr>${tb.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${tb.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''; }
  function itemHTML(t, it, i, st) {
    const res = st.res && st.res.results[i];
    const mark = res ? (res.correct ? `<span class="ok small">${icon('check', 13)}</span>` : `<span class="bad small">${icon('x', 13)} ${esc(res.expected)}</span>`) : '';
    if (it.o) return `<div class="mt-12"><div class="small"><strong>${i + 1}.</strong> ${esc(it.q)} ${mark}</div><div class="cluster mt-4">${it.o.map((o, k) => `<button class="chip ${String(st.ans[i]) === String(k) ? 'active' : ''} ${res && k === it.a ? 'correct-chip' : ''}" data-act="ans" data-i="${i}" data-v="${k}" ${st.res ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>${res && it.why ? `<div class="faint xs mt-4">${esc(it.why)}</div>` : ''}</div>`;
    const label = it.t === 'wf' ? `${esc(it.q)} <span class="pill outline">${esc(it.base)}</span>` : it.t === 'kwt' ? `${esc(it.q)}<div class="mt-4"><span class="pill accent">${esc(it.key)}</span> ${esc(it.start || '')}</div>` : esc(it.q);
    return `<div class="mt-12"><div class="small"><strong>${i + 1}.</strong> ${label} ${mark}</div><input class="input mt-4" data-q="${i}" value="${esc(st.ans[i] || '')}" ${st.res ? 'readonly' : ''} autocomplete="off" spellcheck="false">${res && it.why ? `<div class="faint xs mt-4">${esc(it.why)}</div>` : ''}</div>`;
  }
  function objectiveHTML(s, t, st, opts) {
    const items = t.qs || t.items || [];
    const body = t.kind === 'listening'
      ? `<div class="player"><div class="between"><div><div class="ttl">${esc(t.title)}</div><div class="meta">${opts.timed ? `You can play it ${t.plays || 2} times` : 'Replay as often as you need'} · synthesised voice</div></div>
          <div class="cluster"><button class="btn" data-act="play" ${opts.timed && st.plays >= (t.plays || 2) ? 'disabled' : ''}>${icon('play', 15)} Play${opts.timed ? ` (${(t.plays || 2) - st.plays} left)` : ''}</button>${opts.timed ? '' : '<button class="btn ghost" data-act="playSlow">Slow</button>'}</div></div></div>
          ${st.res ? `<details class="mt-12" open><summary class="small muted">Transcript</summary><div class="transcript small mt-8">${LOS.inputUI.wordsHTML(t.script)}</div></details>` : ''}`
      : t.text ? `<div class="card soft mt-8 exam-text"><div class="strong">${esc(t.title || '')}</div><div class="transcript small mt-8">${LOS.inputUI.wordsHTML(t.text)}</div></div>` : '';
    return `${t.instructions ? `<p class="small muted">${esc(t.instructions)}</p>` : ''}${body}<div class="mt-8">${items.map((it, i) => itemHTML(t, it, i, st)).join('')}</div>`;
  }
  function productionHTML(s, t, st, opts) {
    const words = t.words ? `${t.words[0]}–${t.words[1]} words` : '';
    const head = `<div class="prompt sm">${esc(t.prompt)}</div>
      ${t.card ? `<ul class="small mt-8">${t.card.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ${t.notes ? `<div class="notes-box mt-8">${esc(t.notes)}</div>` : ''}${tableHTML(t.table)}`;
    const bank = opts.help && st.type && st.type.language ? `<details class="mt-12"><summary class="small muted">Useful language</summary><div class="cluster mt-8">${st.type.language.map((x) => `<span class="pill outline" title="${esc(x.n || '')}">${esc(x.p)}</span>`).join('')}</div></details>` : '';
    const checklist = opts.help && (t.points || []).length ? `<details class="mt-8"><summary class="small muted">What the task requires</summary><ul class="small mt-4">${t.points.map((p) => `<li>${esc(String(p).split('|')[0])}</li>`).join('')}</ul></details>` : '';
    if (t.kind === 'writing') {
      return `${head}${bank}${checklist}<textarea class="textarea mt-12" id="prod" rows="12" ${st.res ? 'readonly' : ''} placeholder="Write in ${esc(s.pack.name)}…">${esc(st.text || '')}</textarea>
        <div class="between small faint mt-4"><span data-wc>${wc(st.text || '')} words</span><span>${esc(words)}</span></div>`;
    }
    const prep = t.prep || 0;
    return `${head}${bank}${checklist}
      <div class="cluster mt-12"><span class="faint small">${prep ? `Preparation ${prep >= 60 ? Math.round(prep / 60) + ' min' : prep + ' s'} · ` : ''}speak for about ${t.secs >= 60 ? Math.round(t.secs / 60 * 10) / 10 + ' min' : t.secs + ' s'}</span></div>
      ${st.res ? '' : `<div class="big-actions">${LOS.speech.srSupported || LOS.speech.recSupported ? `<button class="btn ${st.recording ? 'danger' : 'primary'}" data-act="rec">${icon(st.recording ? 'stop' : 'speaking', 18)} ${st.recording ? 'Stop' : 'Start speaking'}</button>` : ''}<button class="btn" data-act="typeIt">${icon('writing', 16)} Type my answer instead</button></div>`}
      ${st.typing || st.text ? `<textarea class="textarea mt-12" id="prod" rows="6" ${st.res ? 'readonly' : ''} placeholder="Your answer (transcript)">${esc(st.text || '')}</textarea>` : ''}
      ${st.recUrl ? `<div class="cluster mt-8"><button class="btn sm" data-act="playMine">${icon('play', 14)} Listen to yourself</button></div>` : ''}`;
  }
  function resultHTML(s, examId, t, st) {
    const r = st.res;
    if (r.results) {
      return `<div class="feedback ${r.pct >= X.passMark(X.exam(examId)) ? 'ok' : 'bad'} mt-16">${icon('target', 18)}<div class="body"><strong>${r.correct}/${r.total} correct</strong> · ${esc(r.est.label)}<div class="faint xs">${esc(r.est.note)}</div></div></div>`;
    }
    const crit = r.criteria.map((c, k) => `<div class="dim"><span>${esc(c.label)}</span>${c.v == null ? '<span class="faint small">self-assessed</span>' : ui.bar(Math.round(c.v * 100), 'thin')}<span class="num faint">${r.bands && r.bands[k] != null ? r.bands[k].toFixed(1) : c.v == null ? '—' : Math.round(c.v * 100)}</span></div>`).join('');
    return `<div class="card mt-16"><div class="between"><div class="eyebrow">Estimated result</div><span class="strong">${esc(r.est.label)}</span></div><div class="faint xs">${esc(r.est.note)} · rule-based local checks${LOS.AI.active() ? ' (+ AI feedback below)' : ''}</div>
        <div class="dims mt-12">${crit}</div>
        ${(r.points || []).length ? `<div class="small mt-12"><strong>Task requirements</strong>${r.points.map((p) => `<div>${p.ok ? icon('check', 12) : icon('x', 12)} ${esc(String(p.p).split('|')[0])}</div>`).join('')}</div>` : ''}</div>
      <div class="mt-12">${H.feedbackPanel(st.fb)}</div>
      ${t.model ? `<details class="mt-8"><summary class="small">Model answer</summary><div class="card soft mt-8 small" style="white-space:pre-wrap">${esc(t.model)}</div></details>` : ''}`;
  }

  /** Mount one task in session s. opts: { examId, timed, help, onDone(result) } */
  function runTask(s, t, opts) {
    const examId = opts.examId;
    const ty = X.type(t.type);
    const st = { ans: {}, res: null, text: '', plays: 0, type: ty, recording: false, typing: false, recUrl: null, fb: null, t0: Date.now() };
    const limit = opts.timed ? (t.minutes || (ty && ty.minutes) || 0) * 60 : 0;
    let rec = null, sr = null;
    function header() {
      const left = limit ? Math.max(0, limit - Math.round((Date.now() - st.t0) / 1000)) : null;
      return `<div class="between"><div class="stage-label">${esc(X.exam(examId).name)} · ${esc(ty ? ty.name : t.title)}${opts.timed ? ' · exam conditions' : ''}</div>${left != null ? `<span class="timer-big" data-left>${ui.fmtTimer(left)}</span>` : ''}</div>`;
    }
    function draw() {
      const isObj = ['reading', 'listening', 'use'].includes(t.kind);
      const body = isObj ? objectiveHTML(s, t, st, opts) : productionHTML(s, t, st, opts);
      s.render(`${header()}<h3 class="mt-8">${esc(t.title)}</h3>${body}${st.res ? resultHTML(s, examId, t, st) : ''}
        <div class="runner-foot"><span class="faint xs">${opts.timed ? 'No hints in exam conditions.' : ''}</span>${st.res ? `<button class="btn primary" data-act="taskDone" data-enter>Continue ${icon('arrowRight', 15)}</button>` : `<button class="btn primary" data-act="submitTask">Submit</button>`}</div>`);
      const ta = s.body.querySelector('#prod');
      if (ta) ta.addEventListener('input', () => { st.text = ta.value; const w = s.body.querySelector('[data-wc]'); if (w) w.textContent = wc(ta.value) + ' words'; });
      s.body.querySelectorAll('[data-q]').forEach((el) => el.addEventListener('input', () => { st.ans[+el.dataset.q] = el.value; }));
    }
    async function submit(auto) {
      if (st.res) return;
      if (rec || sr) await stopRec();
      const ta = s.body.querySelector('#prod'); if (ta) st.text = ta.value;
      s.body.querySelectorAll('[data-q]').forEach((el) => { st.ans[+el.dataset.q] = el.value; });
      const secs = Math.round((Date.now() - st.t0) / 1000);
      if (['reading', 'listening', 'use'].includes(t.kind)) {
        const r = X.scoreObjective(s.code, t, st.ans);
        r.est = X.estimate(X.exam(examId), r.pct, { level: t.level });
        st.res = r;
        LOS.skills.update(s.lang, t.kind === 'use' ? 'grammar' : t.kind, U.levelIndex(t.level || X.exam(examId).cefr || 'B2') + 0.5, r.pct, 0.05);
      } else {
        if (!st.text.trim() && !auto) { ui.toast(t.kind === 'writing' ? 'Write your answer first' : 'Record or type your answer first', 'info'); return; }
        const r = X.scoreProduction(s.code, examId, t, st.text || '', { speech: t.kind === 'speaking', secs: st.speakSecs || secs, pron: st.pron });
        st.res = r;
        H.logAnalysisErrors(s.code, r.analysis, 'exam');
        LOS.ped.detectUse(s.code, st.text || '');
        LOS.skills.update(s.lang, t.kind, U.levelIndex(t.level || X.exam(examId).cefr || 'B2') + 0.5, r.pct, 0.05);
        draw();
        st.fb = await LOS.AI.assess(s.code, { text: st.text || '', kind: `${X.exam(examId).name} ${ty ? ty.name : ''}`, prompt: t.prompt, keys: t.keys, level: t.level, analysis: r.analysis });
      }
      draw();
    }
    async function stopRec() {
      st.recording = false;
      if (rec) { const r = await rec.stop(); rec = null; if (r && r.url) st.recUrl = r.url; st.speakSecs = r ? r.secs : 0; }
      if (sr) { const txt = sr.text; sr.stop(); sr = null; if (txt) st.text = ((st.text || '') + ' ' + txt).trim(); st.typing = true; }
    }
    s.on({
      ans(el) { st.ans[+el.dataset.i] = el.dataset.v; s.body.querySelectorAll(`[data-act="ans"][data-i="${el.dataset.i}"]`).forEach((b) => b.classList.toggle('active', b === el)); },
      play() { if (opts.timed && st.plays >= (t.plays || 2)) return; st.plays++; LOS.speech.speak(t.script, s.code, { rate: 0.95 }); if (opts.timed) draw(); },
      playSlow() { LOS.speech.speak(t.script, s.code, { rate: 0.75 }); },
      async rec() {
        if (st.recording) { await stopRec(); draw(); return; }
        st.recording = true;
        if (LOS.speech.recSupported) { try { rec = await LOS.speech.record(); } catch (e) { rec = null; } }
        if (LOS.speech.srSupported) sr = LOS.speech.recognize(s.code, { onResult: () => {} });
        if (!rec && !sr) { st.recording = false; st.typing = true; ui.toast('Microphone not available — type your answer', 'info'); }
        s.disposers.push(() => { try { if (rec) rec.stop(); if (sr) sr.stop(); } catch (e) { /* ignore */ } });
        draw();
      },
      typeIt() { st.typing = true; draw(); const ta = s.body.querySelector('#prod'); if (ta) ta.focus(); },
      playMine() { if (st.recUrl) new Audio(st.recUrl).play().catch(() => {}); },
      submitTask() { if (t.kind === 'speaking' && !opts.timed && st.pron == null && !st.res) return selfRate(); submit(false); },
      taskDone() { if (tid) clearInterval(tid); opts.onDone(st.res, st); },
    });
    function selfRate() {
      ui.modal({ title: 'Pronunciation — your own rating', body: '<p class="small muted">The browser cannot score pronunciation sound by sound. Listen to your recording and rate how clear you were (this is shown as self-assessed).</p>', foot: [1, 2, 3, 4, 5].map((v) => `<button class="btn" data-pr="${v}">${v}</button>`).join(''), onMount(m, close) { m.querySelectorAll('[data-pr]').forEach((b) => b.addEventListener('click', () => { st.pron = +b.dataset.pr / 5; close(); submit(false); })); } });
    }
    let tid = null;
    if (limit) tid = s.every(1000, () => { const left = Math.max(0, limit - Math.round((Date.now() - st.t0) / 1000)); const el = s.body.querySelector('[data-left]'); if (el) el.textContent = ui.fmtTimer(left); if (left === 0 && !st.res) submit(true); });
    draw();
    return st;
  }
  LOS.run.examTaskView = runTask;

  /* ====================================================================
   * EXAM TASK (learn → controlled → guided → timed)
   * ==================================================================== */
  R.examTask = function (s) {
    const pl = s.item.payload;
    const t = X.task(pl.taskId);
    if (!t) return s.fail('Task not found.');
    const examId = pl.examId || X.examsOf(t)[0];
    const e = X.exam(examId), ty = X.type(t.type);
    const mode = pl.mode || (X.progress(s.code, t.type).step < 2 ? 'learn' : 'practice');
    let phase = mode === 'learn' ? 'lesson' : 'task';
    function finish(res) {
      const pct = res ? res.pct : 0.7;
      X.record(s.code, { exam: examId, paper: X.paperOf(examId, t), type: t.type, task: t.id, mode, pct: U.round(pct, 3), est: res && res.est ? res.est.label : '', criteria: res && res.criteria ? res.criteria.map((c) => ({ label: c.label, key: c.key, v: c.v, self: c.self })) : [] });
      LOS.store.save();
      s.finish({ score: pct, headline: mode === 'learn' ? 'Task type learned' : 'Practice done', summary: [res && res.est ? `${res.est.label} — ${res.est.note}` : '', mode === 'learn' ? 'Next time: the full task in exam conditions.' : 'Weak criteria go to your error bank and shape your next sessions.'].filter(Boolean) });
    }
    function lesson() {
      X.setStep(s.code, t.type, 1);
      s.render(`<div class="stage-label">${esc(e.name)} · ${esc(ty.name)} · strategy</div><h2>${esc(ty.name)}</h2>
        <p class="lead mt-8">${esc(ty.tests)}</p>
        <div class="grid grid-2 mt-16" style="--gap:20px">
          <div><div class="eyebrow">Strategy</div><ol class="small mt-8">${ty.strategy.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
            ${(ty.traps || []).length ? `<div class="eyebrow mt-16">Traps for Italian speakers</div><ul class="small mt-8">${ty.traps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
          <div><div class="eyebrow">Useful language</div><div class="list mt-8">${ty.language.map((x) => `<div class="row" style="min-height:36px"><div class="grow small">${esc(x.p)}${x.n ? `<div class="faint xs">${esc(x.n)}</div>` : ''}</div>${ui.speakBtn(x.p, s.code)}</div>`).join('')}</div>
            <button class="btn sm mt-8" data-act="addLang">${icon('plus', 14)} Add these to my learning</button></div></div>
        ${t.model ? `<details class="mt-16"><summary class="small">Model answer for this task type</summary><div class="card soft small mt-8" style="white-space:pre-wrap">${esc(t.model)}</div></details>` : ''}
        <div class="runner-foot"><span class="faint xs">Teach before test: strategy and language first, then controlled practice, then the task.</span><button class="btn primary" data-act="toControlled" data-enter>Controlled practice ${icon('arrowRight', 16)}</button></div>`);
    }
    // controlled: production → complete the model with the key language; objective → first items with explanations
    function controlled() {
      const isObj = ['reading', 'listening', 'use'].includes(t.kind);
      if (isObj) { phase = 'guided'; return task(true, false); }
      const model = t.model || '';
      const phr = ty.language.map((x) => x.p).filter((p) => p.length > 3 && model.toLowerCase().includes(p.toLowerCase())).slice(0, 5);
      if (!phr.length) { phase = 'guided'; return task(true, false); }
      let filled = model;
      phr.forEach((p, k) => { const i = filled.toLowerCase().indexOf(p.toLowerCase()); if (i >= 0) filled = filled.slice(0, i) + `[${k + 1}]` + filled.slice(i + p.length); });
      const bank = U.shuffle(phr.slice());
      s.render(`<div class="stage-label">${esc(ty.name)} · controlled practice</div><p class="small muted">Complete the model answer with the key language (choose from the bank).</p>
        <div class="card soft small mt-8" style="white-space:pre-wrap">${esc(filled)}</div>
        <div class="mt-12">${phr.map((p, k) => `<div class="cluster mt-8"><span class="pill">${k + 1}</span><select class="select" data-c="${k}" style="max-width:420px"><option value="">—</option>${bank.map((b) => `<option>${esc(b)}</option>`).join('')}</select><span data-cr="${k}"></span></div>`).join('')}</div>
        <div class="runner-foot"><span></span><div class="cluster"><button class="btn" data-act="checkC">Check</button><button class="btn primary" data-act="toGuided">Guided task ${icon('arrowRight', 15)}</button></div></div>`);
      s.on({ checkC() { phr.forEach((p, k) => { const v = s.body.querySelector(`[data-c="${k}"]`).value; s.body.querySelector(`[data-cr="${k}"]`).innerHTML = v === p ? `<span class="ok">${icon('check', 13)}</span>` : `<span class="bad small">${esc(p)}</span>`; }); } });
    }
    function task(help, timed) {
      runTask(s, t, { examId, timed, help, onDone: (res) => {
        if (mode === 'learn' && phase === 'guided') {
          X.setStep(s.code, t.type, 2);
          s.render(`<div class="stage-label">${esc(ty.name)}</div><h2>Guided task done</h2><p class="lead mt-8">${res && res.est ? esc(res.est.label) : ''}</p><p class="muted small">You now know the strategy and the language. The full task in exam conditions comes in your next exam sessions — or try it now.</p>
            <div class="runner-foot"><button class="btn" data-act="finishLearn">Finish</button><button class="btn primary" data-act="timedNow">Try it timed now ${icon('arrowRight', 15)}</button></div>`);
          s.on({ finishLearn() { finish(res); }, timedNow() { phase = 'timed'; task(false, true); } });
          return;
        }
        finish(res);
      } });
    }
    s.on({
      addLang() { ty.language.slice(0, 8).forEach((x) => { try { LOS.input.mine(s.code, { w: x.p, meaning: x.n || '', sentence: '', src: 'exam' }); } catch (er) { /* ignore */ } }); LOS.store.save(); ui.toast('Added — they come in your next new-language steps'); },
      toControlled() { phase = 'controlled'; controlled(); },
      toGuided() { phase = 'guided'; task(true, false); },
    });
    if (phase === 'lesson') lesson();
    else task(mode !== 'timed', mode === 'timed');
  };

  /* ====================================================================
   * MOCK EXAM (one paper or the full exam, real timing, no help)
   * ==================================================================== */
  R.mock = function (s) {
    const pl = s.item.payload;
    const e = X.exam(pl.examId);
    if (!e) return s.fail('Exam not found.');
    const papers = pl.paper && pl.paper !== 'all' ? e.papers.filter((p) => p.id === pl.paper) : e.papers;
    const notLearned = [].concat(...papers.map((p) => X.typesFor(e.id, p.id))).filter((ty) => X.progress(s.code, ty.id).step < 2);
    const seq = [];
    papers.forEach((p) => { const ts = X.tasksFor(e.id, p.id).filter((t) => !t.level || t.level === (pl.level || e.focus) || !X.tasksFor(e.id, p.id).some((x) => x.level === (pl.level || e.focus))); ts.forEach((t) => seq.push({ p, t })); });
    if (!seq.length) return s.fail('No tasks for this mock yet.');
    const results = [];
    let i = 0;
    function intro() {
      s.render(`<div class="stage-label">Mock exam · ${esc(e.name)}</div><h2>${papers.length === 1 ? esc(papers[0].name) : 'Full mock exam'}</h2>
        <div class="list mt-12">${papers.map((p) => `<div class="row"><span class="grow">${esc(p.name)}</span><span class="faint small">${p.minutes} min · ${X.tasksFor(e.id, p.id).length} task${X.tasksFor(e.id, p.id).length === 1 ? '' : 's'}</span></div>`).join('')}</div>
        <p class="small muted mt-12">Exam conditions: real timing per task, no hints, listening played a limited number of times. Results are estimates — practice only, not an official score.</p>
        ${notLearned.length ? `<div class="notice mt-12">${icon('info', 16)}<div><strong>Teach before test:</strong> you have not learned these task types yet — ${esc(notLearned.map((x) => x.name).join(', '))}. Learning them first makes the mock useful.</div></div>` : ''}
        <div class="runner-foot">${notLearned.length ? `<a class="btn" href="#/exams/${e.id}">Learn first</a>` : '<span></span>'}<button class="btn primary" data-act="startMock" data-enter>${notLearned.length ? 'Start anyway' : 'Start'} ${icon('arrowRight', 16)}</button></div>`);
    }
    function next() {
      if (i >= seq.length) return summary();
      const { t } = seq[i];
      s.progress(i / seq.length);
      runTask(s, t, { examId: e.id, timed: true, help: false, onDone: (res) => { results.push({ p: seq[i].p, t, res }); i++; next(); } });
    }
    function summary() {
      const byPaper = papers.map((p) => {
        const rs = results.filter((r) => r.p.id === p.id && r.res);
        const pct = rs.length ? U.avg(rs.map((r) => r.res.pct)) : 0;
        const crit = [].concat(...rs.map((r) => (r.res.criteria || [])));
        X.record(s.code, { exam: e.id, paper: p.id, type: rs[0] ? rs[0].t.type : null, task: rs.map((r) => r.t.id).join(','), mode: 'mock', pct: U.round(pct, 3), est: X.estimate(e, pct).label, criteria: crit.map((c) => ({ label: c.label, key: c.key, v: c.v, self: c.self })) });
        return { p, pct, est: X.estimate(e, pct) };
      });
      const overall = U.avg(byPaper.map((b) => b.pct));
      LOS.store.save();
      s.finish({ score: overall, headline: 'Mock exam complete', summary: byPaper.map((b) => `${b.p.name}: ${b.est.label}`).concat(['Estimates for practice — not official scores. Weak papers and criteria shape your next exam sessions.']) });
    }
    s.on({ startMock() { next(); } });
    intro();
  };
})();

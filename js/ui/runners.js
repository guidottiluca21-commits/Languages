/* SESSION RUNNERS — one interactive player per activity type.
 * Pedagogy inside every runner: Input → Understanding → Controlled practice → Active recall → Production → Feedback.
 * Runners share a frame (progress bar, timer, keyboard shortcuts) and report back through s.finish(). */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const R = {};

  /* ======================================================================
   * Frame
   * ====================================================================== */
  function createSession(root, opts) {
    const code = opts.code;
    const s = {
      code, pack: LOS.lang.get(code), lang: LOS.store.lang(code), item: opts.item, date: opts.date || U.today(), planned: !!opts.planned,
      t0: Date.now(), timers: [], disposers: [], done: false,
    };
    root.innerHTML = `<div class="runner">
      <div class="runner-head">
        <button class="btn ghost icon sm" data-x="exit" aria-label="Leave session">${icon('x', 18)}</button>
        <div class="bar accent" aria-label="Activity progress"><i style="width:0%"></i></div>
        <span class="tm num" aria-label="Elapsed time">00:00</span>
      </div>
      <div class="runner-body" aria-live="polite"></div>
    </div>`;
    s.root = root;
    s.body = root.querySelector('.runner-body');
    const tm = root.querySelector('.tm');
    const fill = root.querySelector('.runner-head .bar > i');
    s.every = (ms, fn) => { const id = setInterval(fn, ms); s.timers.push(id); return id; };
    s.every(1000, () => { tm.textContent = ui.fmtTimer((Date.now() - s.t0) / 1000); });
    s.progress = (f) => { fill.style.width = Math.round(U.clamp(f, 0, 1) * 100) + '%'; };
    s.render = (html) => { s.body.innerHTML = html; ui.animateBars(s.body); const f = s.body.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 20); };
    s.elapsedMin = () => (Date.now() - s.t0) / 60000;
    s.on = (handlers) => ui.delegate(s.body, handlers);
    s.fail = (msg) => s.render(ui.empty({ icon: 'errors', title: 'Unable to start', text: esc(msg), action: '<a class="btn" href="#/today">Back to Today</a>' }));
    s.dispose = () => {
      s.timers.forEach(clearInterval);
      s.disposers.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
      document.removeEventListener('keydown', onKey);
      LOS.speech.stop();
    };
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === 'Enter' && !e.shiftKey && tag !== 'textarea') {
        const b = s.body.querySelector('[data-enter]:not([disabled])');
        if (b) { e.preventDefault(); b.click(); }
      } else if (!typing && /^[1-4]$/.test(e.key)) {
        const b = s.body.querySelector(`[data-key="${e.key}"]:not([disabled])`);
        if (b) { e.preventDefault(); b.click(); }
      } else if (!typing && e.key === ' ') {
        const b = s.body.querySelector('[data-space]');
        if (b) { e.preventDefault(); b.click(); }
      }
    };
    document.addEventListener('keydown', onKey);
    root.querySelector('[data-x="exit"]').addEventListener('click', async () => {
      if (s.done || s.elapsedMin() < 0.3 || (await ui.confirm('Leave this activity?', 'Answers you have already given are saved to your spaced-repetition history, but this activity will not be marked as completed.', 'Leave'))) {
        s.dispose();
        history.length > 1 ? history.back() : (location.hash = '#/today');
      }
    });

    s.finish = (result = {}) => {
      if (s.done) return;
      s.done = true;
      const planned = s.item.minutes || 0;
      let minutes = result.minutes != null ? result.minutes : Math.max(1, Math.round(s.elapsedMin()));
      minutes = Math.min(minutes, 240);
      const skill = s.item.type === 'scenario' ? 'speaking' : s.item.skill || s.item.type;
      LOS.learn.recordSession(code, { type: s.item.type, skill, minutes, score: result.score != null ? U.round(result.score, 2) : null, title: s.item.subtitle || s.item.title, planItem: s.planned ? s.item.id : null });
      if (s.planned) LOS.planner.completeItem(code, s.date, s.item.id, { minutes, score: result.score });
      LOS.store.save(true);
      s.timers.forEach(clearInterval);
      s.progress(1);
      const next = nextPending(code, s.item.id);
      s.render(`<div class="stack" style="--gap:18px;align-items:center;text-align:center;padding:24px 0">
        <div class="complete-mark">${icon('check', 28)}</div>
        <h2>${esc(result.headline || 'Done')}</h2>
        <p class="muted">${esc(s.item.title)}${s.item.subtitle ? ' · ' + esc(s.item.subtitle) : ''} · ${minutes} min${planned ? ` <span class="faint">(planned ${planned})</span>` : ''}</p>
        ${(result.summary || []).length ? `<div class="card flat" style="text-align:left;width:100%;max-width:520px"><div class="stack" style="--gap:8px">${result.summary.map((l) => `<div class="cluster small"><span class="faint">${icon('arrowRight', 14)}</span><span>${l}</span></div>`).join('')}</div></div>` : ''}
        <div class="cluster" style="justify-content:center">
          ${next ? `<a class="btn primary lg" data-enter href="#/session/${next.code}/${next.date}/${next.item.id}" autofocus>Next: ${esc(next.item.title)} · ${next.item.minutes} min ${icon('arrowRight', 16)}</a>` : ''}
          <a class="btn ${next ? '' : 'primary lg'}" href="#/today" ${next ? '' : 'data-enter autofocus'}>${next ? 'Back to Today' : 'Back to Today'}</a>
        </div>
      </div>`);
    };
    return s;
  }

  function nextPending(code, afterId) {
    const date = U.today();
    const codes = [code].concat(LOS.store.studying().filter((c) => c !== code));
    for (const c of codes) {
      const plan = LOS.store.lang(c).plans[date];
      if (!plan) continue;
      const it = plan.items.find((i) => i.status === 'pending' && i.id !== afterId);
      if (it) return { code: c, date, item: it };
    }
    return null;
  }

  /* ======================================================================
   * Shared bits
   * ====================================================================== */
  const blank = (q) => esc(q).replace(/_{3,}/g, '<span class="blank" aria-label="blank"></span>');
  const TYPE_LABEL = { mc: 'Choose the correct option', gap: 'Complete the sentence', fix: 'Correct the sentence', tr: 'Rewrite the sentence' };

  function exerciseHTML(ex, res, given, opts = {}) {
    let h = `<div class="stage-label">${opts.stage ? esc(opts.stage) + ' · ' : ''}${TYPE_LABEL[ex.t]}</div>`;
    h += `<div class="prompt">${ex.t === 'gap' || ex.t === 'mc' ? blank(ex.q) : esc(ex.q)}</div>`;
    if (ex.t === 'tr') h += `<div class="prompt-sub">Start with: <strong>${esc(ex.s)}</strong></div>`;
    if (ex.t === 'mc') {
      h += `<div class="options" role="group" aria-label="Options">${ex.o.map((o, i) => {
        const cls = res ? (i === ex.a ? 'correct' : String(i) === String(given) ? 'wrong' : '') : '';
        return `<button class="option ${cls}" data-act="opt" data-v="${i}" data-key="${i + 1}" ${res ? 'disabled' : ''}><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`;
      }).join('')}</div>`;
    } else {
      const pre = res ? given : ex.t === 'fix' ? ex.q : ex.t === 'tr' ? ex.s + ' ' : '';
      h += `<div class="answer-row"><input class="input lg" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(pre)}" ${res ? 'readonly' : 'autofocus'} aria-label="Your answer"><button class="btn primary lg" data-act="submit" ${res ? 'disabled' : 'data-enter'}>Check</button></div>`;
    }
    if (res) h += feedbackHTML(ex, res);
    return h;
  }
  function feedbackHTML(ex, res) {
    const adapt = res.adapt === 'up' ? `<div class="adapt-note">${icon('progress', 14)} Going up a level of difficulty.</div>` : res.adapt === 'down' ? `<div class="adapt-note">${icon('info', 14)} Simplifying for a moment — read the rule below, then we'll retry.</div>` : '';
    if (res.correct) {
      return `<div class="feedback ok">${icon('checkCircle', 20)}<div class="body"><strong>${res.close ? 'Accepted' : 'Correct'}</strong>${res.note ? ` — ${esc(res.note)} <span class="faint">(${esc(res.expected)})</span>` : ''}${ex.w ? `<div class="why">${esc(ex.w)}</div>` : ''}${adapt}</div></div>`;
    }
    return `<div class="feedback bad">${icon('errors', 20)}<div class="body"><strong>Not quite.</strong> Answer: <strong>${esc(res.expected)}</strong>${ex.w ? `<div class="why">${esc(ex.w)}</div>` : ''}${adapt}</div></div>`;
  }
  function nextBtn(label = 'Continue') { return `<div class="runner-foot"><span class="faint xs">Enter ↵ to continue</span><button class="btn primary" data-act="next" data-enter autofocus>${esc(label)} ${icon('arrowRight', 16)}</button></div>`; }

  function lessonHTML(s, t) {
    return `<div class="stage-label">Input · Understanding</div>
      <div class="between"><h2>${esc(t.title)}</h2><span class="pill">${t.l}</span></div>
      <p class="lead mt-8">${esc(t.sum)}</p>
      <div class="lesson mt-16"><ul>${t.explain.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>
      <div class="mt-16">${t.ex.map((e) => `<div class="example between"><span>${esc(e)}</span>${ui.speakBtn(e, s.code)}</div>`).join('')}</div>`;
  }

  /** Mic + transcript + recorder, reused by speaking, think and scenarios. */
  function micController(s, onUpdate) {
    let rec = null, sr = null, t0 = 0, active = false;
    let finalText = '', interim = '', conf = null;
    return {
      get active() { return active; },
      get text() { return finalText; },
      get conf() { return conf; },
      async start() {
        if (active) return;
        active = true; t0 = Date.now(); finalText = ''; interim = '';
        if (LOS.speech.recSupported) { try { rec = await LOS.speech.record(); } catch (e) { ui.toast(e.message || 'Microphone not available', 'errors'); } }
        if (LOS.speech.srSupported) sr = LOS.speech.recognize(s.code, { onResult: (f, i, c) => { finalText = f; interim = i; conf = c; onUpdate && onUpdate(f, i); }, onError: (e) => ui.toast(e.message, 'errors') });
        s.disposers.push(() => this.stop());
      },
      async stop() {
        if (!active) return { secs: 0 };
        active = false;
        const secs = Math.round((Date.now() - t0) / 1000);
        let a = null;
        if (rec) { a = await rec.stop(); rec = null; }
        if (sr) { sr.stop(); sr = null; }
        return { secs, url: a && a.url, transcript: (finalText + ' ' + interim).trim() };
      },
    };
  }

  function correctionsHTML(analysis, max = 8) {
    const withIssues = analysis.sentencesOut.filter((x) => x.issues.length).slice(0, max);
    if (!withIssues.length) return `<p class="muted small">No rule-based issues found. ${LOS.AI.isRemote() ? '' : '<span class="faint">(Local checks cover frequent patterns; an AI backend would catch more.)</span>'}</p>`;
    return withIssues.map((x) => {
      let yours = esc(x.original);
      x.issues.forEach((i) => { if (i.match) yours = yours.replace(esc(i.match), `<mark>${esc(i.match)}</mark>`); });
      const errs = x.issues.filter((i) => i.severity === 'error');
      const hints = x.issues.filter((i) => i.severity !== 'error');
      return `<div class="corr">
        <div class="k">Your sentence</div><div class="yours">${yours}</div>
        ${x.corrected !== x.original ? `<div class="k mt-8">Corrected version</div><div class="fixed">${esc(x.corrected)}</div>` : ''}
        ${x.natural !== x.corrected ? `<div class="k mt-8">More natural version</div><div class="fixed">${esc(x.natural)}</div>` : ''}
        <div class="k mt-8">Why?</div>
        ${errs.map((i) => `<div class="why">${icon('errors', 13)} <strong>${esc(i.label)}:</strong> ${esc(i.why)}</div>`).join('')}
        ${hints.map((i) => `<div class="why">${icon('info', 13)} <strong>Check · ${esc(i.label)}:</strong> ${esc(i.why)}</div>`).join('')}
      </div>`;
    }).join('');
  }
  function logAnalysisErrors(code, analysis, src) {
    const seen = new Set();
    analysis.issues.filter((i) => i.severity === 'error').forEach((i) => {
      const key = i.rule + '|' + i.sentence;
      if (seen.has(key)) return;
      seen.add(key);
      const sent = analysis.sentencesOut.find((x) => x.original === i.sentence);
      LOS.learn.recordError(code, { src, cat: i.cat, label: i.label, topic: i.topic, wrong: i.sentence, right: sent ? sent.corrected : i.suggestion || '', natural: sent && sent.natural !== sent.corrected ? sent.natural : undefined, note: i.why });
    });
    return seen.size;
  }

  function gradeButtons(state, suggested) {
    const labels = LOS.srs.GRADES;
    const prev = (g) => { const c = JSON.parse(JSON.stringify(state || LOS.srs.create())); LOS.srs.grade(c, g); return c.interval <= 1 ? (g === 0 ? 'again soon' : '1 day') : c.interval < 30 ? `${c.interval} days` : `${Math.round(c.interval / 30)} mo`; };
    return `<div class="grade-row" role="group" aria-label="How well did you know it?">${labels.map((l, g) => `<button class="btn ${g === suggested ? 'primary' : ''}" data-act="grade" data-g="${g}" data-key="${g + 1}" ${g === suggested ? 'data-enter' : ''}>${l}<small>${prev(g)}</small></button>`).join('')}</div>`;
  }

  /* ======================================================================
   * Grammar: lesson → adaptive drill → production → result
   * ====================================================================== */
  R.grammar = function (s) {
    const t = s.pack.index.grammar[s.item.payload.topicId];
    if (!t) return s.fail('Grammar topic not found.');
    const drill = new LOS.learn.GrammarDrill(s.code, t.id, s.item.payload.count || 6);
    let phase = s.item.payload.learn ? 'lesson' : 'drill';
    let ex = null, res = null, given = null, summary = null, prodText = '', prodAnalysis = null;

    function draw() {
      if (phase === 'lesson') {
        s.progress(0.02);
        s.render(`${lessonHTML(s, t)}<div class="runner-foot"><span class="faint small">Then: ${drill.count} adaptive exercises</span><button class="btn primary" data-act="start" data-enter autofocus>Start practice ${icon('arrowRight', 16)}</button></div>`);
      } else if (phase === 'drill') {
        if (!ex) ex = drill.next();
        if (!ex) { phase = 'produce'; return draw(); }
        s.progress((drill.results.length + (res ? 0 : 0)) / (drill.count + 1));
        const lvl = ['easier', 'core', 'harder'][drill.d - 1];
        let html = `<div class="between"><span class="faint small">${esc(t.title)} · ${t.l}</span><span class="faint xs">Difficulty: ${lvl}</span></div><div class="mt-16">${exerciseHTML(ex, res, given)}</div>`;
        if (res && res.adapt === 'down') html += `<div class="card soft mt-16 lesson small"><strong>Rule reminder</strong><ul>${t.explain.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
        html += res ? nextBtn() : `<div class="runner-foot"><button class="btn ghost sm" data-act="rule">${icon('grammar', 14)} Show the rule</button><span class="faint xs">${ex.t === 'mc' ? 'Keys 1–4' : 'Enter ↵ to check'}</span></div>`;
        s.render(html);
      } else if (phase === 'produce') {
        s.progress(0.9);
        s.render(`<div class="stage-label">Production · use it yourself</div><div class="prompt sm">${esc(t.use || 'Write two sentences of your own using this structure.')}</div>
          <textarea class="textarea mt-16" id="prod" rows="4" placeholder="Write in ${esc(s.pack.name)}…" autofocus>${esc(prodText)}</textarea>
          ${prodAnalysis ? `<div class="card flat mt-16">${correctionsHTML(prodAnalysis, 4)}</div>` : ''}
          <div class="runner-foot"><button class="btn ghost" data-act="finishDrill">Skip</button><div class="cluster"><button class="btn" data-act="checkProd">Check</button><button class="btn primary" data-act="finishDrill" data-enter>Finish</button></div></div>`);
      } else if (phase === 'result') {
        const r = summary;
        const st = drill.state;
        s.progress(1);
        s.render(`<div class="stack" style="--gap:22px">
          <div class="stage-label">Result</div>
          <div class="between"><div><div class="result-big">${Math.round(r.acc * 100)}%</div><div class="muted">accuracy on ${drill.results.length} exercises</div></div>
          <div class="cluster">${ui.statusPill(r.before)} ${icon('arrowRight', 14)} ${ui.statusPill(r.after)}</div></div>
          <div><div class="between small"><span class="muted">Mastery</span><span class="num">${r.mastery}%</span></div><div class="mt-8">${ui.bar(r.mastery, 'thick')}</div></div>
          <div class="grid grid-3"><div class="stat"><span class="k">Next review</span><span class="v" style="font-size:18px">${U.relDate(st.due)}</span></div><div class="stat"><span class="k">Interval</span><span class="v" style="font-size:18px">${st.interval} d</span></div><div class="stat"><span class="k">Next difficulty</span><span class="v" style="font-size:18px">${['Easier', 'Core', 'Harder'][r.d - 1]}</span></div></div>
          ${r.acc < 0.6 ? ui.notice('This topic will come back soon, with simpler exercises first. Missed items were added to your error log.', 'info') : r.acc >= 0.9 ? ui.notice('Strong result — the review interval grows and the next exercises will be harder.', 'progress', 'accent') : ''}
          <div class="runner-foot"><span></span><button class="btn primary" data-act="done" data-enter autofocus>Finish ${icon('check', 16)}</button></div></div>`);
      }
    }
    s.on({
      start() { phase = 'drill'; draw(); },
      rule() { ui.modal({ title: t.title, body: lessonHTML(s, t) }); },
      opt(el) { if (res) return; given = el.dataset.v; res = drill.answer(ex, given); draw(); },
      submit() { if (res) return; given = s.body.querySelector('#ans').value; if (!given.trim()) return; res = drill.answer(ex, given); draw(); },
      next() { ex = null; res = null; given = null; draw(); },
      async checkProd() { prodText = s.body.querySelector('#prod').value; if (!prodText.trim()) return; const r = await LOS.AI.evaluateAnswer(s.code, { prompt: t.use, answer: prodText, level: t.l }); prodAnalysis = r.analysis || r; draw(); },
      finishDrill() {
        const ta = s.body.querySelector('#prod');
        if (ta) prodText = ta.value;
        if (prodText.trim() && prodAnalysis) logAnalysisErrors(s.code, prodAnalysis, 'grammar');
        summary = drill.finish({ recovery: false });
        phase = 'result'; draw();
      },
      done() { s.finish({ score: summary.acc, headline: summary.after === 'mastered' ? 'Topic mastered' : 'Practice complete', summary: [`${t.title}: ${Math.round(summary.acc * 100)}% accuracy`, `Status: ${LOS.srs.STATUS_LABEL[summary.after]} · next review ${U.relDate(drill.state.due)}`] }); },
    });
    draw();
  };

  /* ======================================================================
   * Review: vocabulary by acquisition stage + due grammar + error cards
   * ====================================================================== */
  R.review = function (s) {
    const cap = s.item.payload.cap || 20;
    const errIds = LOS.learn.dueErrorCards(s.code).slice(0, Math.max(2, Math.round(cap * 0.25)));
    const gIds = LOS.learn.grammarList(s.code).filter((g) => g.due).sort((a, b) => LOS.srs.priority(b.state) - LOS.srs.priority(a.state)).slice(0, cap >= 12 ? 3 : 1).map((g) => g.topic.id);
    let vIds = LOS.learn.dueVocab(s.code).slice(0, Math.max(3, cap - errIds.length - gIds.length * 3));
    let extraMode = false;
    if (!vIds.length && !gIds.length && !errIds.length) {
      vIds = Object.keys(s.lang.vocab).filter((id) => !s.lang.vocab[id].assumed && LOS.learn.vocabItem(s.code, id)).sort((a, b) => (s.lang.vocab[a].mastery || 0) - (s.lang.vocab[b].mastery || 0)).slice(0, Math.min(8, cap));
      extraMode = vIds.length > 0;
    }
    // interleave
    const queue = [];
    const v = vIds.map((id) => ({ kind: 'vocab', id })), g = gIds.map((id) => ({ kind: 'grammar', id })), e = errIds.map((id) => ({ kind: 'error', id }));
    while (v.length || g.length || e.length) { queue.push(...v.splice(0, 3)); if (g.length) queue.push(g.shift()); if (e.length) queue.push(e.shift()); }
    const total = queue.length;
    let i = 0, correct = 0, answered = 0, card = null, res = null, given = '', drill = null, dEx = null, dRes = null, dGiven = null, t0 = 0;

    if (!total) {
      s.render(ui.empty({ icon: 'checkCircle', title: 'Nothing to review', text: 'Your spaced-repetition queue is empty. New material will enter it as you learn.', action: '<button class="btn primary" data-act="finishEmpty" data-enter>Finish</button>' }));
      s.on({ finishEmpty() { s.finish({ minutes: 1, headline: 'All caught up' }); } });
      return;
    }
    function cur() { return queue[i]; }
    function draw() {
      s.progress(i / queue.length);
      const q = cur();
      if (!q) {
        const acc = answered ? correct / answered : 1;
        return s.finish({ score: acc, headline: 'Review complete', summary: [`${total} items reviewed · ${Math.round(acc * 100)}% recalled`, extraMode ? 'Nothing was due, so you reinforced your weakest items.' : 'Each item now has a new review date based on your answers.'] });
      }
      const head = `<div class="between"><span class="faint small">${extraMode ? 'Extra practice' : 'Review'} · ${i + 1} of ${queue.length}</span><span class="pill">${q.kind === 'vocab' ? 'Vocabulary' : q.kind === 'grammar' ? 'Grammar' : 'Error card'}</span></div>`;
      if (q.kind === 'vocab') {
        if (!card) { card = LOS.learn.vocabCard(s.code, q.id); res = null; given = ''; t0 = Date.now(); }
        const vv = card.v;
        const st = s.lang.vocab[q.id];
        let html = head + `<div class="mt-24">`;
        if (card.mode === 'recognition') {
          html += `<div class="stage-label">Recognition</div><div class="between"><div class="prompt">${esc(vv.w)}</div>${ui.speakBtn(vv.w, s.code)}</div>${vv.pos ? `<div class="faint small mt-4">${esc(vv.pos)}</div>` : ''}
            <div class="options">${card.options.map((o, k) => `<button class="option ${res ? (k === card.answer ? 'correct' : String(k) === given ? 'wrong' : '') : ''}" data-act="vopt" data-v="${k}" data-key="${k + 1}" ${res ? 'disabled' : ''}><span class="k">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
        } else if (card.mode === 'recall' || card.mode === 'automatic') {
          html += `<div class="stage-label">${card.mode === 'recall' ? 'Active recall' : 'Automatic use · answer fast'}</div><div class="prompt sm">${esc(card.mode === 'recall' ? vv.def : vv.tr)}</div>${card.mode === 'recall' && vv.tr ? `<div class="prompt-sub">${esc(vv.tr)}${vv.pos ? ' · ' + esc(vv.pos) : ''}</div>` : `<div class="prompt-sub">${esc(vv.ctx || vv.def)}</div>`}
            <div class="answer-row"><input class="input lg" id="ans" autocomplete="off" spellcheck="false" ${res ? `value="${esc(given)}" readonly` : 'autofocus'} aria-label="Type the ${esc(s.pack.name)} word or phrase"><button class="btn primary lg" data-act="vsubmit" ${res ? 'disabled' : 'data-enter'}>Check</button></div>`;
        } else if (card.mode === 'production') {
          html += `<div class="stage-label">Production · complete the sentence</div><div class="prompt sm">${esc(card.before)}<span class="blank"></span>${esc(card.after)}</div><div class="prompt-sub">${esc(vv.tr)} · starts with “${esc(card.hint)}”</div>
            <div class="answer-row"><input class="input lg" id="ans" autocomplete="off" spellcheck="false" ${res ? `value="${esc(given)}" readonly` : 'autofocus'} aria-label="Missing words"><button class="btn primary lg" data-act="vsubmit" ${res ? 'disabled' : 'data-enter'}>Check</button></div>`;
        }
        if (res) {
          html += `<div class="feedback ${res.correct ? 'ok' : 'bad'}">${icon(res.correct ? 'checkCircle' : 'errors', 20)}<div class="body">${res.note ? `<div class="why strong">${esc(res.note)}</div>` : ''}<strong>${esc(vv.w)}</strong>${vv.pl ? ` <span class="muted">— ${esc(vv.pl)}</span>` : ''} ${vv.ipa ? `<span class="faint">${esc(vv.ipa)}</span>` : ''} — ${esc(vv.tr)}<div class="why">${esc(vv.ex)}</div>${vv.col && vv.col.length ? `<div class="why">Collocations: ${esc(vv.col.slice(0, 4).join(' · '))}</div>` : ''}</div></div>`;
          html += `<div class="faint xs mt-16">Stage: ${LOS.learn.STAGE_LABEL[st ? st.stage || 0 : 0]} — how well did you know it?</div>` + gradeButtons(st, res.suggested);
        }
        html += '</div>';
        s.render(html);
      } else if (q.kind === 'grammar') {
        const t = s.pack.index.grammar[q.id];
        if (!drill) { drill = new LOS.learn.GrammarDrill(s.code, q.id, 2); dEx = drill.next(); dRes = null; }
        s.render(head + `<div class="faint small mt-16">${esc(t.title)} · ${t.l}</div><div class="mt-8">${exerciseHTML(dEx, dRes, dGiven, { stage: 'Grammar check' })}</div>${dRes ? nextBtn() : ''}`);
      } else {
        const err = s.lang.errors.find((x) => x.id === q.id);
        if (!err) { i++; return draw(); }
        s.render(head + `<div class="mt-24"><div class="stage-label">Fix your own past mistake${err.label ? ' · ' + esc(err.label) : ''}</div><div class="prompt sm">${esc(err.wrong)}</div>
          <div class="answer-row"><input class="input lg" id="ans" value="${esc(res ? given : err.wrong)}" ${res ? 'readonly' : 'autofocus'} autocomplete="off" spellcheck="false" aria-label="Corrected sentence"><button class="btn primary lg" data-act="esubmit" ${res ? 'disabled' : 'data-enter'}>Check</button></div>
          ${res ? `<div class="feedback ${res.correct ? 'ok' : 'neutral'}">${icon(res.correct ? 'checkCircle' : 'info', 20)}<div class="body">Correct version: <strong>${esc(err.right)}</strong>${err.note ? `<div class="why">${esc(err.note)}</div>` : ''}${!res.correct ? '<div class="why">Your version may still be valid — grade yourself honestly.</div>' : ''}</div></div>${gradeButtons(s.lang.errorCards[q.id], res.correct ? 2 : 0)}` : ''}</div>`);
      }
    }
    s.on({
      vopt(el) { if (res) return; given = el.dataset.v; const ok = +given === card.answer; res = { correct: ok, suggested: ok ? ((Date.now() - t0) < 4000 ? 3 : 2) : 0 }; draw(); },
      vsubmit() {
        if (res) return;
        given = s.body.querySelector('#ans').value;
        const target = card.target || card.v.w;
        const chk = LOS.learn.checkAnswer({ t: 'gap', a: [target, card.v.w] }, given, s.code);
        const fast = Date.now() - t0 < 8000;
        res = { correct: chk.correct, note: chk.note, suggested: !chk.correct ? 0 : chk.close ? 1 : card.mode === 'automatic' ? (fast ? 3 : 1) : 2 };
        draw();
      },
      grade(el) {
        const gv = +el.dataset.g;
        const q = cur();
        answered++; if (gv >= 2) correct++;
        if (q.kind === 'vocab') LOS.learn.gradeVocab(s.code, q.id, gv, { recovery: s.item.mode === 'recovery' });
        else if (q.kind === 'error') LOS.learn.gradeErrorCard(s.code, q.id, gv);
        if (gv === 0 && q.kind === 'vocab' && !q.requeued) queue.splice(Math.min(queue.length, i + 4), 0, Object.assign({}, q, { requeued: true }));
        i++; card = null; res = null; draw();
      },
      opt(el) { if (dRes) return; dGiven = el.dataset.v; dRes = drill.answer(dEx, dGiven); answered++; if (dRes.correct) correct++; draw(); },
      submit() { if (dRes) return; dGiven = s.body.querySelector('#ans').value; if (!dGiven.trim()) return; dRes = drill.answer(dEx, dGiven); answered++; if (dRes.correct) correct++; draw(); },
      next() {
        const nx = drill.results.length < drill.count ? drill.next() : null;
        if (nx) { dEx = nx; dRes = null; dGiven = null; return draw(); }
        drill.finish(); drill = null; dEx = null; dRes = null; dGiven = null; i++; draw();
      },
      esubmit() {
        if (res) return;
        given = s.body.querySelector('#ans').value;
        const err = s.lang.errors.find((x) => x.id === cur().id);
        res = LOS.learn.checkAnswer({ t: 'fix', a: [err.right] }, given, s.code);
        draw();
      },
    });
    draw();
  };

  /* ======================================================================
   * Vocabulary acquisition: meet → recognise → recall (→ SRS takes over)
   * ====================================================================== */
  R.vocabulary = async function (s) {
    s.render(`<p class="muted">Selecting words for you…</p>`);
    const n = s.item.payload.count || 6;
    const ids = s.item.payload.ids;
    let items;
    if (ids) items = ids.map((id) => LOS.learn.vocabItem(s.code, id)).filter(Boolean);
    else { const r = await LOS.AI.generateVocabulary(s.code, { count: n }); items = (r.items || []).filter(Boolean); }
    if (!items.length) { s.render(ui.empty({ icon: 'vocabulary', title: 'No new items available', text: 'You have met every item in the built-in bank. Add your own words from listening and reading — they will be prioritised.', action: '<a class="btn" href="#/vocabulary/add">Add words</a> <button class="btn primary" data-act="fin">Finish</button>' })); s.on({ fin() { s.finish({ minutes: 1 }); } }); return; }
    const results = {}; // id → {rec, recall, known}
    let phase = 'meet', idx = 0, res = null, given = '', mcq = null;
    const total = items.length * 3;
    function stepDone() { return (phase === 'meet' ? 0 : phase === 'recog' ? items.length : items.length * 2) + idx; }
    function dictHTML(v) { return ui.dictCard(v, s.code, null, { mastery: false }); }
    function draw() {
      s.progress(stepDone() / total);
      const v = items[idx];
      if (phase === 'meet') {
        s.render(`<div class="stage-label">Input · new item ${idx + 1} of ${items.length}</div>${dictHTML(v)}
          <div class="runner-foot"><button class="btn ghost" data-act="known">I already know this</button><button class="btn primary" data-act="nextMeet" data-enter autofocus>Next ${icon('arrowRight', 16)}</button></div>`);
      } else if (phase === 'recog') {
        if (!mcq) { mcq = LOS.learn.vocabCard(s.code, v.id); }
        s.render(`<div class="stage-label">Recognition · ${idx + 1} of ${items.length}</div><div class="between"><div class="prompt">${esc(v.w)}</div>${ui.speakBtn(v.w, s.code)}</div>
          <div class="options">${mcq.options.map((o, k) => `<button class="option ${res ? (k === mcq.answer ? 'correct' : String(k) === given ? 'wrong' : '') : ''}" data-act="opt" data-v="${k}" data-key="${k + 1}" ${res ? 'disabled' : ''}><span class="k">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>${res ? nextBtn() : ''}`);
      } else if (phase === 'recall') {
        s.render(`<div class="stage-label">Active recall · ${idx + 1} of ${items.length}</div><div class="prompt sm">${esc(v.def)}</div><div class="prompt-sub">${esc(v.tr)}</div>
          <div class="answer-row"><input class="input lg" id="ans" autocomplete="off" spellcheck="false" ${res ? `value="${esc(given)}" readonly` : 'autofocus'} aria-label="Type the word"><button class="btn primary lg" data-act="submit" ${res ? 'disabled' : 'data-enter'}>Check</button></div>
          ${res ? `<div class="feedback ${res.correct ? 'ok' : 'bad'}">${icon(res.correct ? 'checkCircle' : 'errors', 20)}<div class="body"><strong>${esc(v.w)}</strong><div class="why">${esc(v.ex)}</div></div></div>${nextBtn()}` : `<div class="runner-foot"><button class="btn ghost sm" data-act="reveal">Show answer</button><span></span></div>`}`);
      }
    }
    function advance() {
      res = null; given = ''; mcq = null; idx++;
      if (idx >= items.length) {
        idx = 0;
        if (phase === 'meet') { phase = items.some((v) => !(results[v.id] || {}).known) ? 'recog' : 'save'; }
        else if (phase === 'recog') phase = 'recall';
        else phase = 'save';
      }
      while (phase !== 'save' && phase !== 'meet' && items[idx] && (results[items[idx].id] || {}).known) {
        idx++;
        if (idx >= items.length) { idx = 0; phase = phase === 'recog' ? 'recall' : 'save'; }
      }
      if (phase === 'save') return save();
      draw();
    }
    function save() {
      LOS.learn.introduceVocab(s.code, items.map((v) => v.id));
      let learned = 0;
      items.forEach((v) => {
        const r = results[v.id] || {};
        const st = s.lang.vocab[v.id];
        if (r.known) { LOS.learn.gradeVocab(s.code, v.id, 3); st.stage = 3; st.interval = Math.max(st.interval, 7); st.due = U.addDays(U.today(), 7); return; }
        const g = r.rec && r.recall ? 2 : r.rec || r.recall ? 1 : 0;
        LOS.learn.gradeVocab(s.code, v.id, g);
        st.stage = r.rec && r.recall ? 2 : 1;
        if (g >= 1) learned++;
      });
      s.finish({ score: items.length ? learned / items.length : 1, headline: `${items.length} new items`, summary: [`${learned} recalled correctly on first contact`, 'They will return tomorrow for spaced review — first recognition, then recall, then production.', items.map((v) => esc(v.w)).join(' · ')] });
    }
    s.on({
      nextMeet() { advance(); },
      known() { results[items[idx].id] = { known: true }; advance(); },
      opt(el) { if (res) return; given = el.dataset.v; const ok = +given === mcq.answer; (results[items[idx].id] = results[items[idx].id] || {}).rec = ok; res = { correct: ok }; draw(); },
      submit() { if (res) return; given = s.body.querySelector('#ans').value; const chk = LOS.learn.checkAnswer({ t: 'gap', a: [items[idx].w] }, given, s.code); (results[items[idx].id] = results[items[idx].id] || {}).recall = chk.correct; res = chk; draw(); },
      reveal() { given = '—'; (results[items[idx].id] = results[items[idx].id] || {}).recall = false; res = { correct: false }; draw(); },
      next() { advance(); },
    });
    draw();
  };

  /* ======================================================================
   * Reading: pre-read → read (tap words) → questions → vocabulary → summary
   * ====================================================================== */
  function wordsHTML(text) {
    return esc(text).split(/(\s+)/).map((tok) => /\S/.test(tok) ? `<span class="w" data-act="word" data-w="${tok.replace(/[.,;:!?¿¡"“”()]/g, '')}">${tok}</span>` : tok).join('');
  }
  function addWordsHTML(sel) {
    if (!sel.size) return `<p class="muted small">No words selected. Tap words in the text to collect them.</p>`;
    return `<div class="stack" style="--gap:8px">${[...sel].map((w, k) => `<div class="cluster"><input class="input" style="max-width:200px" value="${esc(w)}" data-word="${k}" aria-label="Word"><input class="input grow" placeholder="Meaning (Italian or definition)" data-mean="${k}" aria-label="Meaning"></div>`).join('')}</div>`;
  }
  function saveSelectedWords(s, sel, src, level) {
    let n = 0;
    [...sel].forEach((w, k) => {
      const word = (s.body.querySelector(`[data-word="${k}"]`) || {}).value || w;
      const mean = (s.body.querySelector(`[data-mean="${k}"]`) || {}).value || '';
      if (!word.trim()) return;
      const item = LOS.learn.addCustomVocab(s.code, { w: word.trim(), tr: mean.trim(), def: mean.trim(), l: level || 'B2', src });
      LOS.learn.introduceVocab(s.code, [item.id], src);
      n++;
    });
    return n;
  }

  R.reading = function (s) {
    const t = s.pack.index.texts[s.item.payload.textId];
    if (!t) return s.fail('Text not found.');
    const sel = new Set();
    let phase = 'pre', qi = 0, res = null, given = null, correct = 0, sumText = '', sumAnalysis = null;
    const words = U.words(t.text).length;
    function draw() {
      const steps = { pre: 0, read: 0.15, q: 0.4 + (qi / t.qs.length) * 0.3, vocab: 0.75, summary: 0.88 };
      s.progress(steps[phase] || 0);
      if (phase === 'pre') {
        s.render(`<div class="stage-label">Reading · before you start</div><h2>${esc(t.title)}</h2><div class="cluster mt-8"><span class="pill">${t.l}</span><span class="pill outline">${words} words</span>${t.d === 'medical' ? '<span class="pill accent">Medical</span>' : ''}</div>
          <div class="lesson mt-16 muted"><ul><li>Read once for the general idea — don't stop for unknown words.</li><li>Then answer ${t.qs.length} questions.</li><li>Tap words you want to learn; you'll add them at the end.</li></ul></div>
          <div class="runner-foot"><span></span><button class="btn primary" data-act="go" data-enter autofocus>Start reading ${icon('arrowRight', 16)}</button></div>`);
      } else if (phase === 'read') {
        s.render(`<div class="between"><div class="stage-label">Input · read for gist</div>${ui.speakBtn(t.text, s.code, 'Read aloud')}</div><h2>${esc(t.title)}</h2>
          <div class="transcript mt-16">${wordsHTML(t.text)}</div>
          <div class="runner-foot"><span class="faint small">${sel.size} word${sel.size === 1 ? '' : 's'} selected</span><button class="btn primary" data-act="toQ" data-enter>Questions ${icon('arrowRight', 16)}</button></div>`);
        s.body.querySelectorAll('.w').forEach((el) => { if (sel.has(el.dataset.w)) el.classList.add('sel'); });
      } else if (phase === 'q') {
        const q = t.qs[qi];
        s.render(`<div class="stage-label">Comprehension · ${qi + 1} of ${t.qs.length}</div><div class="prompt sm">${esc(q.q)}</div>
          <div class="options">${q.o.map((o, k) => `<button class="option ${res ? (k === q.a ? 'correct' : String(k) === given ? 'wrong' : '') : ''}" data-act="opt" data-v="${k}" data-key="${k + 1}" ${res ? 'disabled' : ''}><span class="k">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>
          ${res ? nextBtn() : `<div class="runner-foot"><button class="btn ghost sm" data-act="peek">${icon('eye', 14)} Look at the text</button><span></span></div>`}`);
      } else if (phase === 'vocab') {
        s.render(`<div class="stage-label">Vocabulary extraction</div><h3>Add the words you selected</h3><p class="muted small mt-4">They become personal vocabulary items and are prioritised in your next sessions.</p><div class="mt-16">${addWordsHTML(sel)}</div>
          <div class="runner-foot"><span></span><button class="btn primary" data-act="toSum" data-enter>Continue ${icon('arrowRight', 16)}</button></div>`);
      } else if (phase === 'summary') {
        s.render(`<div class="stage-label">Production · summary</div><div class="prompt sm">Summarise the text in 2–3 sentences in ${esc(s.pack.name)} — without looking at it.</div>
          <textarea class="textarea mt-16" id="sum" rows="4" autofocus>${esc(sumText)}</textarea>
          ${sumAnalysis ? `<div class="card flat mt-16">${correctionsHTML(sumAnalysis, 4)}</div>` : ''}
          <div class="runner-foot"><button class="btn ghost" data-act="done">Skip</button><div class="cluster"><button class="btn" data-act="checkSum">Check</button><button class="btn primary" data-act="done" data-enter>Finish</button></div></div>`);
      }
    }
    s.on({
      go() { phase = 'read'; draw(); },
      word(el) { const w = el.dataset.w; if (!w) return; if (sel.has(w)) { sel.delete(w); } else sel.add(w); s.body.querySelectorAll(`.w[data-w="${CSS.escape(w)}"]`).forEach((x) => x.classList.toggle('sel', sel.has(w))); const f = s.body.querySelector('.runner-foot .faint'); if (f) f.textContent = `${sel.size} word${sel.size === 1 ? '' : 's'} selected`; },
      toQ() { phase = 'q'; qi = 0; draw(); },
      peek() { ui.modal({ title: t.title, body: `<div class="transcript">${esc(t.text)}</div>` }); },
      opt(el) {
        if (res) return; given = el.dataset.v; const ok = +given === t.qs[qi].a; if (ok) correct++; res = { correct: ok };
        LOS.skills.update(s.lang, 'reading', U.levelIndex(t.l) + 0.5, ok ? 1 : 0, 0.06); draw();
      },
      next() { res = null; given = null; qi++; if (qi >= t.qs.length) phase = sel.size ? 'vocab' : 'summary'; draw(); },
      toSum() { const n = saveSelectedWords(s, sel, 'reading', t.l); if (n) ui.toast(`${n} word${n > 1 ? 's' : ''} added to vocabulary`); sel.clear(); phase = 'summary'; draw(); },
      async checkSum() { sumText = s.body.querySelector('#sum').value; if (!sumText.trim()) return; const r = await LOS.AI.evaluateAnswer(s.code, { prompt: 'summary', answer: sumText, level: t.l }); sumAnalysis = r.analysis || r; draw(); },
      done() {
        const ta = s.body.querySelector('#sum'); if (ta) sumText = ta.value;
        if (sumText.trim()) { const a = sumAnalysis || LOS.writing.analyze(s.code, sumText, { level: t.l }); logAnalysisErrors(s.code, a, 'reading'); }
        s.lang.seen.texts[t.id] = U.today();
        const acc = correct / t.qs.length;
        s.finish({ score: acc, headline: 'Reading complete', summary: [`${correct}/${t.qs.length} comprehension questions`, sumText.trim() ? 'Summary written — production practice done.' : 'Tip: writing a short summary turns input into output.'] });
      },
    });
    draw();
  };

  /* ======================================================================
   * Listening — guided (TTS) or authentic content (log + active-listening steps)
   * ====================================================================== */
  R.listening = function (s) {
    if (s.item.payload.mode === 'external') return R.listeningExternal(s);
    const t = s.pack.index.texts[s.item.payload.textId];
    if (!t) return s.fail('Audio text not found.');
    const short = !!s.item.payload.short;
    const tts = LOS.speech.ttsSupported;
    const sentences = U.sentences(t.text);
    const sel = new Set();
    const STEPS = short ? ['general', 'detailed', 'transcript'] : ['general', 'detailed', 'transcript', 'vocabulary', 'shadowing', 'summary'];
    let step = 0, qi = 0, res = null, given = null, correct = 0, answered = 0, rate = U.levelIndex(t.l) <= 1 ? 0.85 : 1, plays = 0, shadowDone = new Set(), sumText = '', sumAnalysis = null;
    let mic = null, shadowRec = {};
    const gistQ = [t.qs[0]], detailQ = t.qs.slice(1);
    function playAll() { plays++; LOS.speech.speak(t.text, s.code, { rate }); }
    function player(extra = '') {
      return `<div class="player"><div class="between"><div><div class="ttl">${esc(t.title)}</div><div class="meta">${t.kind === 'dialogue' ? 'Dialogue' : 'Audio'} · ${t.l} · synthesised voice</div></div><span class="pill">${t.l}</span></div>
        <div class="controls"><button class="play-btn" data-act="play" data-space aria-label="Play">${icon('play', 22)}</button><button class="btn sm" data-act="stop">${icon('stop', 14)} Stop</button>
        ${ui.seg('rate', [['0.75', '0.75×'], ['0.85', '0.85×'], ['1', '1×'], ['1.15', '1.15×']], String(rate))}<span class="faint xs">Space = play</span></div>${extra}</div>`;
    }
    function stepper() {
      return `<div class="cluster xs faint mb">${STEPS.map((k, n) => { const st = LOS.shared.ACTIVE_LISTENING_STEPS.find((x) => x[0] === k); return `<span class="${n === step ? 'strong' : ''}" style="${n === step ? 'color:var(--text)' : ''}">${n + 1}. ${st ? st[1].split(' ')[0] : k}</span>`; }).join('<span>·</span>')}</div>`;
    }
    function qHTML(q) {
      return `<div class="prompt sm mt-24">${esc(q.q)}</div><div class="options">${q.o.map((o, k) => `<button class="option ${res ? (k === q.a ? 'correct' : String(k) === given ? 'wrong' : '') : ''}" data-act="opt" data-v="${k}" data-key="${k + 1}" ${res ? 'disabled' : ''}><span class="k">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
    }
    function draw() {
      s.progress(step / STEPS.length);
      const key = STEPS[step];
      if (!tts && key !== 'transcript' && step < 2) {
        s.render(ui.notice('Your browser has no speech synthesis, so this exercise falls back to reading. Use the authentic-content log in Listening for real audio.', 'info', 'warn') + `<div class="transcript mt-16">${esc(t.text)}</div>` + qHTML(t.qs[qi]) + (res ? nextBtn() : ''));
        return;
      }
      if (key === 'general') {
        s.render(`${stepper()}<div class="stage-label mt-16">1 · General understanding</div><p class="muted mb">Listen once, without the text. What is it about?</p>${player()}${plays ? qHTML(gistQ[0]) : '<p class="faint small mt-16">Press play to begin. The question appears after the first listen.</p>'}${res ? nextBtn() : ''}`);
      } else if (key === 'detailed') {
        const q = detailQ[qi];
        s.render(`${stepper()}<div class="stage-label mt-16">2 · Detailed listening</div><p class="muted">Listen again, as many times as you need.</p>${player()}${q ? qHTML(q) : '<p class="muted mt-16">No more questions.</p>'}${res || !q ? nextBtn() : ''}`);
      } else if (key === 'transcript') {
        s.render(`${stepper()}<div class="stage-label mt-16">3 · Transcript</div><p class="muted">Read while listening. Tap any sentence to hear it; tap words you didn't catch.</p>
          <div class="mt-16 stack" style="--gap:6px">${sentences.map((x, k) => `<div class="cluster" style="flex-wrap:nowrap;align-items:flex-start">${tts ? `<button class="btn ghost icon sm" data-act="say" data-k="${k}" aria-label="Play sentence">${icon('play', 14)}</button>` : ''}<div class="transcript" style="font-size:16px">${wordsHTML(x)}</div></div>`).join('')}</div>
          ${nextBtn(short ? 'Finish' : 'Continue')}`);
        s.body.querySelectorAll('.w').forEach((el) => { if (sel.has(el.dataset.w)) el.classList.add('sel'); });
      } else if (key === 'vocabulary') {
        s.render(`${stepper()}<div class="stage-label mt-16">4 · Vocabulary extraction</div><p class="muted">Turn what you heard into active vocabulary.</p><div class="mt-16">${addWordsHTML(sel)}</div>${nextBtn()}`);
      } else if (key === 'shadowing') {
        s.render(`${stepper()}<div class="stage-label mt-16">5 · Shadowing</div><p class="muted">Play each sentence, then repeat it aloud copying rhythm and intonation. ${LOS.speech.recSupported ? 'Record yourself to compare.' : ''}</p>
          <div class="steps mt-16">${sentences.slice(0, 6).map((x, k) => `<div class="step"><input type="checkbox" data-act="shadow" data-k="${k}" ${shadowDone.has(k) ? 'checked' : ''} aria-label="Done"><div class="grow"><div>${esc(x)}</div><div class="cluster mt-8"><button class="btn sm" data-act="say" data-k="${k}">${icon('play', 13)} Play</button>${LOS.speech.recSupported ? `<button class="btn sm" data-act="recShadow" data-k="${k}">${icon('speaking', 13)} ${shadowRec[k] === 'rec' ? 'Stop' : 'Record'}</button>${shadowRec[k] && shadowRec[k] !== 'rec' ? `<audio controls src="${shadowRec[k]}" style="height:32px"></audio>` : ''}` : ''}</div></div></div>`).join('')}</div>${nextBtn()}`);
      } else if (key === 'summary') {
        s.render(`${stepper()}<div class="stage-label mt-16">6 · Summary / retelling</div><div class="prompt sm">Retell what you heard in ${esc(s.pack.name)} (2–4 sentences).</div>
          <textarea class="textarea mt-16" id="sum" rows="4" autofocus>${esc(sumText)}</textarea>
          ${LOS.speech.srSupported ? `<button class="btn sm mt-8" data-act="dictate">${icon('speaking', 14)} ${mic && mic.active ? 'Stop dictation' : 'Speak instead'}</button>` : ''}
          ${sumAnalysis ? `<div class="card flat mt-16">${correctionsHTML(sumAnalysis, 4)}</div>` : ''}
          <div class="runner-foot"><button class="btn ghost" data-act="finish">Skip</button><div class="cluster"><button class="btn" data-act="checkSum">Check</button><button class="btn primary" data-act="finish" data-enter>Finish</button></div></div>`);
      }
    }
    function finishAll() {
      if (mic && mic.active) mic.stop();
      const ta = s.body.querySelector('#sum'); if (ta) sumText = ta.value;
      if (sumText.trim()) logAnalysisErrors(s.code, sumAnalysis || LOS.writing.analyze(s.code, sumText, { level: t.l }), 'listening');
      const n = sel.size ? saveSelectedWords(s, sel, 'listening', t.l) : 0;
      s.lang.seen.texts[t.id] = U.today();
      const acc = answered ? correct / answered : null;
      s.finish({ score: acc, headline: 'Listening complete', summary: [answered ? `${correct}/${answered} questions answered correctly` : 'Transcript and shadowing practice', `Played ${plays} time${plays === 1 ? '' : 's'} at up to ${rate}× speed`, n ? `${n} words added to vocabulary` : ''].filter(Boolean) });
    }
    s.on({
      play() { playAll(); if (STEPS[step] === 'general' && plays === 1) draw(); },
      stop() { LOS.speech.stop(); },
      rate(el) { rate = +el.dataset.v; s.body.querySelectorAll('[data-act="rate"]').forEach((b) => b.classList.toggle('active', b === el)); },
      say(el) { LOS.speech.speak(sentences[+el.dataset.k], s.code, { rate }); },
      word(el) { const w = el.dataset.w; if (!w) return; sel.has(w) ? sel.delete(w) : sel.add(w); el.classList.toggle('sel', sel.has(w)); },
      opt(el) {
        if (res) return; given = el.dataset.v;
        const q = STEPS[step] === 'general' ? gistQ[0] : detailQ[qi];
        const ok = +given === q.a; answered++; if (ok) correct++; res = { correct: ok };
        LOS.skills.update(s.lang, 'listening', U.levelIndex(t.l) + 0.5 + (rate > 1 ? 0.2 : rate < 0.9 ? -0.2 : 0), ok ? 1 : 0, 0.06);
        draw();
      },
      next() {
        LOS.speech.stop();
        res = null; given = null;
        if (STEPS[step] === 'detailed' && qi < detailQ.length - 1) { qi++; return draw(); }
        if (STEPS[step] === 'vocabulary' && sel.size) { const n = saveSelectedWords(s, sel, 'listening', t.l); if (n) ui.toast(`${n} words added`); sel.clear(); }
        step++; if (step >= STEPS.length) return finishAll();
        draw();
      },
      shadow(el) { const k = +el.dataset.k; el.checked ? shadowDone.add(k) : shadowDone.delete(k); },
      async recShadow(el) {
        const k = +el.dataset.k;
        if (shadowRec[k] === 'rec') { const r = await shadowRec['ctl' + k].stop(); shadowRec[k] = r.url; shadowDone.add(k); draw(); return; }
        try { shadowRec['ctl' + k] = await LOS.speech.record(); shadowRec[k] = 'rec'; draw(); } catch (e) { ui.toast(e.message || 'Microphone unavailable', 'errors'); }
      },
      async dictate() {
        if (mic && mic.active) { const r = await mic.stop(); const ta = s.body.querySelector('#sum'); sumText = ((ta && ta.value) || '') + ' ' + (r.transcript || ''); draw(); return; }
        mic = micController(s, (f, i) => { const ta = s.body.querySelector('#sum'); if (ta) ta.value = sumText + (f ? ' ' + f : '') + (i ? ' ' + i : ''); });
        const ta = s.body.querySelector('#sum'); sumText = ta ? ta.value : sumText;
        await mic.start(); draw();
      },
      async checkSum() { sumText = s.body.querySelector('#sum').value; if (!sumText.trim()) return; const r = await LOS.AI.evaluateAnswer(s.code, { prompt: 'retell', answer: sumText, level: t.l }); sumAnalysis = r.analysis || r; draw(); },
      finish() { finishAll(); },
    });
    draw();
  };

  function ytId(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  R.listeningExternal = function (s) {
    const p = s.item.payload;
    const sug = p.suggestion || { type: 'Authentic audio', desc: 'Any podcast, video or radio at your level', min: s.item.minutes || 20 };
    const lvl = p.level || U.LEVELS[LOS.learn.targetLevelIdx(s.code, 'listening')];
    const checks = new Set();
    const form = { title: '', url: '', minutes: sug.min || s.item.minutes || 20, level: lvl, comp: 70, diff: 3, words: '', notes: '', topic: sug.topic || '', accent: sug.accent || '', speed: ['slow', 'moderate', 'normal', 'fast'].includes(sug.speed) ? sug.speed : '', transcript: !!sug.transcript };
    function draw() {
      const id = ytId(form.url);
      s.progress(checks.size / 6);
      s.render(`<div class="stage-label">Listening · authentic content</div>
        <div class="player"><div class="between"><div><div class="ttl">${esc(sug.type)}</div><div class="meta">${esc(sug.desc)}</div></div><span class="pill">${esc(lvl)}</span></div>
        <div class="cluster mt-16 small muted"><span>${icon('clock', 14)} ${sug.min || s.item.minutes} min</span>${sug.accent ? `<span>${icon('globe', 14)} ${esc(sug.accent)}</span>` : ''}${sug.speed ? `<span>${icon('activity', 14)} ${esc(sug.speed)}</span>` : ''}${sug.transcript != null ? `<span>${icon('reading', 14)} ${sug.transcript ? 'transcript available' : 'no transcript'}</span>` : ''}<span>${icon('target', 14)} ${esc(p.objective || LOS.shared.LISTENING_STAGE[lvl].objective)}</span></div></div>
        <div class="section"><div class="section-head"><h3>What are you listening to?</h3></div>
          <div class="grid grid-2"><div class="field"><label for="f-title">Title</label><input class="input" id="f-title" data-f="title" value="${esc(form.title)}" placeholder="e.g. The future of anaesthesia"></div>
          <div class="field"><label for="f-url">Link (YouTube or other)</label><input class="input" id="f-url" data-f="url" value="${esc(form.url)}" placeholder="https://…" inputmode="url"></div></div>
          ${id ? `<div class="yt mt-16"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe></div><p class="faint xs mt-4">Embedded player needs an internet connection.</p>` : form.url ? `<a class="btn sm mt-8" href="${esc(form.url)}" target="_blank" rel="noopener">${icon('link', 14)} Open link</a>` : ''}
        </div>
        <div class="section"><div class="section-head"><h3>Active listening</h3><span class="faint small">${checks.size}/6</span></div>
          <div class="steps">${LOS.shared.ACTIVE_LISTENING_STEPS.map(([k, l, d]) => `<label class="step"><input type="checkbox" data-act="chk" data-k="${k}" ${checks.has(k) ? 'checked' : ''}><div><div>${esc(l)}</div><div class="d">${esc(d)}</div></div></label>`).join('')}</div></div>
        <div class="section"><div class="section-head"><h3>Log it</h3></div>
          <div class="form-grid"><div class="field"><label for="f-min">Duration (min)</label><input class="input" id="f-min" type="number" min="1" max="300" data-f="minutes" value="${form.minutes}"></div>
          <div class="field"><label for="f-lvl">Perceived level</label><select class="select" id="f-lvl" data-f="level">${U.LEVELS.map((l) => `<option ${l === form.level ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="f-diff">Difficulty (1–5)</label><input class="input" id="f-diff" type="number" min="1" max="5" data-f="diff" value="${form.diff}"></div>
          <div class="field"><label for="f-topic">Topic</label><input class="input" id="f-topic" data-f="topic" maxlength="80" value="${esc(form.topic)}" placeholder="e.g. medicine, politics"></div>
          <div class="field"><label for="f-accent">Accent</label><input class="input" id="f-accent" data-f="accent" maxlength="60" value="${esc(form.accent)}" placeholder="e.g. Austria, Québec, Andalusia"></div>
          <div class="field"><label for="f-speed">Speed</label><select class="select" id="f-speed" data-f="speed">${['', 'slow', 'moderate', 'normal', 'fast'].map((v) => `<option value="${v}" ${v === form.speed ? 'selected' : ''}>${v || '—'}</option>`).join('')}</select></div></div>
          <label class="check small mt-12"><input type="checkbox" data-f="transcript" ${form.transcript ? 'checked' : ''}> Transcript / subtitles in ${esc(s.pack.native)} available</label>
          <div class="field mt-16"><label for="f-comp">How much did you understand? <span class="num" id="compv">${form.comp}%</span></label><input type="range" id="f-comp" min="0" max="100" step="5" data-f="comp" value="${form.comp}"></div>
          <div class="field mt-16"><label for="f-words">New words (one per line: word — meaning)</label><textarea class="textarea" id="f-words" data-f="words" rows="3" placeholder="bottleneck — collo di bottiglia">${esc(form.words)}</textarea></div>
          <div class="field mt-16"><label for="f-notes">Summary or notes (in ${esc(s.pack.name)})</label><textarea class="textarea" id="f-notes" data-f="notes" rows="3">${esc(form.notes)}</textarea></div>
        </div>
        <div class="runner-foot"><span class="faint small">Saved to your listening log</span><button class="btn primary" data-act="save">Save session ${icon('check', 16)}</button></div>`);
      s.body.querySelectorAll('[data-f]').forEach((el) => el.addEventListener('input', () => {
        form[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' ? +el.value : el.value;
        if (el.dataset.f === 'comp') s.body.querySelector('#compv').textContent = el.value + '%';
        if (el.dataset.f === 'url' && ytId(el.value) !== id) draw();
      }));
    }
    s.on({
      chk(el) { el.checked ? checks.add(el.dataset.k) : checks.delete(el.dataset.k); s.progress(checks.size / 6); s.body.querySelector('.section-head .faint').textContent = `${checks.size}/6`; },
      save() {
        const minutes = U.clamp(+form.minutes || 1, 1, 300);
        const cleanUrl = form.url.trim() && !/^https?:\/\//i.test(form.url.trim()) ? 'https://' + form.url.trim() : form.url.trim();
        const entry = { id: U.uid('lis'), date: U.today(), title: form.title || sug.desc, url: cleanUrl, minutes, level: form.level, comprehension: form.comp, difficulty: form.diff, steps: [...checks], notes: form.notes, words: [], topic: form.topic.trim(), accent: form.accent.trim(), speed: form.speed, transcript: !!form.transcript };
        form.words.split('\n').map((l) => l.trim()).filter(Boolean).forEach((line) => {
          const [w, ...rest] = line.split(/\s+[—–-]\s+|:\s+/);
          const item = LOS.learn.addCustomVocab(s.code, { w: w.trim(), tr: rest.join(' ').trim(), def: rest.join(' ').trim(), l: form.level, src: 'listening' });
          LOS.learn.introduceVocab(s.code, [item.id], 'listening');
          entry.words.push(item.w);
        });
        s.lang.listening.unshift(entry);
        LOS.skills.update(s.lang, 'listening', U.levelIndex(form.level) + 0.5, form.comp / 100, 0.05 * Math.min(1.5, minutes / 20));
        if (form.notes.trim()) logAnalysisErrors(s.code, LOS.writing.analyze(s.code, form.notes, { level: form.level }), 'listening');
        s.finish({ minutes, score: form.comp / 100, headline: 'Listening logged', summary: [`${minutes} min · ${form.level} · understood ~${form.comp}%`, `${checks.size}/6 active-listening steps`, entry.words.length ? `${entry.words.length} words added to vocabulary` : ''].filter(Boolean) });
      },
    });
    draw();
  };

  /* ======================================================================
   * Writing environment
   * ====================================================================== */
  R.writing = function (s) {
    const pid = s.item.payload.promptId;
    const free = !pid || pid === 'free';
    const w = free ? { id: 'free', l: U.LEVELS[LOS.learn.targetLevelIdx(s.code, 'writing')], genre: 'Free writing', reg: 'neutral', title: 'Free writing', p: s.item.payload.text || 'Write about anything: your day, a case, an opinion. Aim for clarity and natural phrasing.', words: [80, 300], keys: [] } : s.pack.writing.find((x) => x.id === pid);
    if (!w) return s.fail('Writing prompt not found.');
    const draftKey = `los:draft:${s.code}:${w.id}`;
    let text = '';
    try { text = localStorage.getItem(draftKey) || ''; } catch (e) { /* ignore */ }
    let analysis = null, full = false, checks = 0;
    function feedbackPanel() {
      if (!analysis) return `<div class="card soft"><div class="eyebrow">Feedback</div><p class="muted small mt-8">Write, then press <strong>Check</strong>. You can revise and check as many times as you like.</p></div>
        ${w.keys && w.keys.length ? `<div><div class="eyebrow">Try to use</div><div class="cluster mt-8">${w.keys.map((k) => `<span class="pill outline">${esc(k)}</span>`).join('')}</div></div>` : ''}`;
      const a = analysis;
      const est = U.thetaInfo(a.estTheta);
      return `<div><div class="eyebrow">Feedback</div><div class="score-rows mt-12">${LOS.shared.WRITING_DIMENSIONS.map(([k, l]) => `<span class="lbl">${l}</span>${ui.score5(a.scores[k])}`).join('')}</div></div>
        <div class="between"><div class="stat"><span class="k">This text reads like</span><span class="v" style="font-size:22px">${est.sub}</span></div><div class="stat" style="text-align:right"><span class="k">Words</span><span class="v" style="font-size:22px">${a.words}</span></div></div>
        ${w.keys && w.keys.length ? `<div><div class="eyebrow">Target phrases</div><div class="cluster mt-8">${w.keys.map((k) => `<span class="pill ${a.keysUsed.includes(k) ? 'ok' : 'outline'}">${a.keysUsed.includes(k) ? icon('check', 12) : ''} ${esc(k)}</span>`).join('')}</div></div>` : ''}
        ${a.notes.length ? `<div class="stack small" style="--gap:6px">${a.notes.map((n) => `<div class="muted">· ${esc(n)}</div>`).join('')}</div>` : ''}
        ${a.register ? `<div><div class="eyebrow">Register</div><div class="small mt-4">${a.register.ok ? `${icon('check', 13)} Consistent with a ${esc(a.register.target)} text.` : `${icon('info', 13)} Not fully consistent with a ${esc(a.register.target)} text — see the notes above.`}</div></div>` : ''}
        ${a.upgrades && a.upgrades.length ? `<div><div class="eyebrow">Vocabulary you could upgrade</div><div class="stack small mt-8" style="--gap:4px">${a.upgrades.map((u) => `<div><strong>${esc(u.w)}</strong> → ${esc(u.alts.join(', '))}</div>`).join('')}</div></div>` : ''}
        ${a.nextConnectors && a.nextConnectors.length ? `<div><div class="eyebrow">More advanced version — connectors to try (${esc(a.nextLevel)})</div><div class="cluster mt-8">${a.nextConnectors.map((c) => `<span class="pill outline">${esc(c)}</span>`).join('')}</div></div>` : ''}
        ${a.review && a.review.length ? `<div><div class="eyebrow">Structures to review</div><div class="stack small mt-8" style="--gap:4px">${a.review.map((t) => `<a href="#/grammar/${esc(t.id)}">${esc(t.title)}</a> <span class="faint">${esc(t.l)}</span>`).join('<br>')}</div></div>` : ''}
        <p class="faint xs">${a._source === 'remote' ? 'Feedback from your AI backend.' : 'Local analysis: rule-based checks for frequent errors, lexical and structural indicators. Connect an AI backend in Settings for full rewriting.'}</p>`;
    }
    function draw() {
      const words = U.words(text).length;
      s.progress(Math.min(0.9, words / (w.words[0] || 100)));
      s.render(`<div class="${full ? 'fullscreen-editor' : ''}"><div class="editor">
        <div class="stack" style="--gap:16px">
          <div><div class="cluster"><span class="pill">${w.l}</span><span class="pill outline">${esc(w.genre)}</span>${w.reg && w.reg !== 'neutral' ? `<span class="pill outline">${esc(w.reg)} register</span>` : ''}${w.d === 'medical' ? '<span class="pill accent">Medical</span>' : ''}</div>
          <h2 class="mt-8">${esc(w.title)}</h2><p class="muted mt-4">${esc(w.p)}</p><p class="faint small mt-4">${w.words[0]}–${w.words[1]} words</p></div>
          <div class="paper"><textarea class="write" id="wt" placeholder="Start writing in ${esc(s.pack.name)}…" aria-label="Your text" spellcheck="false" lang="${esc(s.pack.locale)}">${esc(text)}</textarea>
            <div class="bar-under"><span class="num" id="wc">${words} words</span><div class="cluster"><button class="btn ghost sm" data-act="full">${full ? 'Exit full screen' : 'Full screen'}</button><button class="btn sm" data-act="check">${icon('sparkle', 14)} Check</button><button class="btn primary sm" data-act="finish">Finish</button></div></div></div>
          ${analysis ? `<div class="card"><div class="section-head"><h3>Corrections</h3><span class="faint small">${analysis.errors.length} errors · ${analysis.hints.length} things to check</span></div>${correctionsHTML(analysis, 12)}</div>` : ''}
        </div>
        <aside class="side-panel" aria-label="Feedback">${feedbackPanel()}</aside>
      </div></div>`);
      const ta = s.body.querySelector('#wt');
      ta.addEventListener('input', () => {
        text = ta.value;
        s.body.querySelector('#wc').textContent = U.words(text).length + ' words';
        try { localStorage.setItem(draftKey, text); } catch (e) { /* ignore */ }
      });
      if (!analysis) setTimeout(() => ta.focus(), 30);
    }
    s.on({
      full() { full = !full; draw(); },
      async check() {
        text = s.body.querySelector('#wt').value;
        if (U.words(text).length < 5) { ui.toast('Write a little more first', 'info'); return; }
        checks++;
        analysis = await LOS.AI.evaluateWriting(s.code, { text, level: w.l, reg: w.reg, keys: w.keys, words: w.words, genre: w.genre });
        draw();
      },
      async finish() {
        text = s.body.querySelector('#wt').value;
        if (U.words(text).length < 5) { ui.toast('Nothing to save yet', 'info'); return; }
        if (!analysis || checks === 0) analysis = await LOS.AI.evaluateWriting(s.code, { text, level: w.l, reg: w.reg, keys: w.keys, words: w.words, genre: w.genre });
        const logged = logAnalysisErrors(s.code, analysis, 'writing');
        const entry = { id: U.uid('wri'), date: U.today(), promptId: w.id, title: w.title, genre: w.genre, level: w.l, text, words: analysis.words, scores: analysis.scores, overall: analysis.overall, estTheta: analysis.estTheta, checks };
        s.lang.writings.unshift(entry);
        if (s.lang.writings.length > 300) s.lang.writings.length = 300;
        LOS.skills.nudge(s.lang, 'writing', analysis.estTheta, U.clamp(analysis.words / 600, 0.06, 0.25));
        if (!free) s.lang.seen.prompts[w.id] = U.today();
        try { localStorage.removeItem(draftKey); } catch (e) { /* ignore */ }
        s.finish({ score: analysis.overall / 5, headline: 'Writing saved', summary: [`${analysis.words} words · overall ${analysis.overall}/5 · reads like ${U.thetaInfo(analysis.estTheta).sub}`, logged ? `${logged} error${logged > 1 ? 's' : ''} saved to your error log for review` : 'No rule-based errors to log', checks > 1 ? `You revised ${checks - 1} time${checks > 2 ? 's' : ''} — that's where most learning happens.` : 'Tip: check, revise, check again.'] });
      },
    });
    draw();
  };

  /* ======================================================================
   * Speaking practice
   * ====================================================================== */
  function speakingCore(s, task, opts = {}) {
    // task: { p, secs, keys, l, title, type, model }
    let phase = 'ready', left = task.secs || 90, tick = null, mic = null, rec = null, transcript = '', interim = '', analysis = null, ratings = {}, secsUsed = 0;
    const canSR = LOS.speech.srSupported, canRec = LOS.speech.recSupported;
    function liveHTML() { return `<div class="live" id="live">${esc(transcript)} <span class="interim">${esc(interim)}</span>${!transcript && !interim ? `<span class="faint">${canSR ? 'Your words will appear here as you speak…' : 'Live transcription is not available in this browser — you can type a summary of what you said after recording.'}</span>` : ''}</div>`; }
    function draw() {
      if (phase === 'ready' || phase === 'rec') {
        s.render(`<div class="stage-label">${esc(opts.stage || 'Speaking practice')} · ${esc(task.type || '')}</div><div class="prompt sm">${esc(task.p)}</div>
          ${task.keys && task.keys.length ? `<div class="cluster mt-12">${task.keys.map((k) => `<span class="pill outline">${esc(k)}</span>`).join('')}</div>` : ''}
          <div class="stack mt-32" style="align-items:center;--gap:16px"><div class="timer" id="timer" aria-live="off">${ui.fmtTimer(left)}</div>
          <button class="rec-btn ${phase === 'rec' ? 'on' : ''}" data-act="${phase === 'rec' ? 'stopRec' : 'startRec'}" data-space aria-label="${phase === 'rec' ? 'Stop recording' : 'Start recording'}">${icon(phase === 'rec' ? 'stop' : 'speaking', 28)}</button>
          <span class="faint small">${phase === 'rec' ? 'Recording… press to stop' : canRec ? 'Press to start recording' : 'Recording not available — press to start the timer and speak aloud'}</span></div>
          <div class="mt-24">${liveHTML()}</div>
          ${phase === 'ready' ? `<div class="runner-foot"><span class="faint xs">Tip: think in ${esc(s.pack.name)} from the first second. No notes in Italian.</span><button class="btn ghost sm" data-act="skipToType">Type instead</button></div>` : ''}`);
      } else if (phase === 'review') {
        const a = analysis;
        s.render(`<div class="stage-label">Performance</div>
          ${rec && rec.url ? `<audio controls src="${rec.url}" style="width:100%"></audio><div class="faint xs mt-4">Recordings stay in memory only (not saved). <a href="${rec.url}" download="speaking-${U.today()}.webm">Download</a></div>` : ''}
          <div class="field mt-16"><label for="tr">Transcript ${canSR ? '(edit if recognition misheard)' : '(type what you said, roughly)'}</label><textarea class="textarea" id="tr" rows="4">${esc(transcript)}</textarea></div>
          <div class="cluster mt-8"><button class="btn sm" data-act="analyse">${icon('sparkle', 14)} Analyse transcript</button></div>
          ${a ? `<div class="grid grid-3 mt-16"><div class="stat"><span class="k">Speed</span><span class="v" style="font-size:20px">${a.speech.wpm || '—'} <span class="faint small">wpm</span></span><span class="k">target ${a.speech.band[0]}–${a.speech.band[1]}</span></div><div class="stat"><span class="k">Fillers</span><span class="v" style="font-size:20px">${a.speech.fillers}</span></div><div class="stat"><span class="k">Lexical variety</span><span class="v" style="font-size:20px">${Math.round(a.mattr * 100)}%</span></div></div>
            ${task.keys && task.keys.length ? `<div class="cluster mt-16">${task.keys.map((k) => `<span class="pill ${a.keysUsed.includes(k) ? 'ok' : 'outline'}">${a.keysUsed.includes(k) ? icon('check', 12) : ''} ${esc(k)}</span>`).join('')}</div>` : ''}
            <div class="card flat mt-16">${correctionsHTML(a, 5)}</div>` : ''}
          ${task.model ? `<details class="mt-16"><summary class="btn ghost sm">Show a model answer</summary><div class="example mt-8">${esc(task.model)} ${ui.speakBtn(task.model, s.code)}</div></details>` : ''}
          <div class="section"><div class="section-head"><h3>Rate your performance</h3><span class="faint small">pre-filled from the analysis where possible</span></div>
          <div class="rubric">${LOS.shared.SPEAKING_RUBRIC.map(([k, l, d]) => `<div><div>${l}</div><div class="faint xs">${d}</div></div><div class="rate" role="group" aria-label="${l}">${[1, 2, 3, 4, 5].map((n) => `<button class="${ratings[k] === n ? 'on' : ''}" data-act="rate" data-k="${k}" data-n="${n}" aria-label="${l} ${n}">${n}</button>`).join('')}</div>`).join('')}</div>
          ${mic && mic.conf ? `<p class="faint xs mt-8">Speech-recognition confidence ${Math.round(mic.conf * 100)}% — a rough proxy for intelligibility, not a pronunciation score.</p>` : ''}</div>
          <div class="runner-foot"><button class="btn ghost" data-act="again">Try again</button><button class="btn primary" data-act="save" data-enter>Save ${icon('check', 16)}</button></div>`);
      }
    }
    function prefill(a) {
      if (a.speech.fluency) ratings.fluency = ratings.fluency || Math.round(a.speech.fluency);
      ratings.accuracy = ratings.accuracy || Math.round(a.scores.grammar);
      ratings.vocabulary = ratings.vocabulary || Math.round(a.scores.vocabulary);
      ratings.complexity = ratings.complexity || Math.round(a.scores.syntax);
      ratings.coherence = ratings.coherence || Math.round((a.scores.coherence + a.scores.cohesion) / 2);
      ratings.naturalness = ratings.naturalness || Math.round(a.scores.naturalness);
    }
    async function stopAll() {
      if (tick) { clearInterval(tick); tick = null; }
      if (mic) { const r = await mic.stop(); rec = r; secsUsed = r.secs; transcript = r.transcript || transcript; }
      phase = 'review';
      if (transcript.trim()) { analysis = LOS.writing.analyzeSpeech(s.code, transcript, secsUsed, { level: task.l, keys: task.keys }); prefill(analysis); }
      draw();
    }
    const handlers = {
      async startRec() {
        phase = 'rec'; left = task.secs || 90; transcript = ''; interim = ''; const t0 = Date.now();
        mic = micController(s, (f, i) => { transcript = f; interim = i; const el = s.body.querySelector('#live'); if (el) el.innerHTML = `${esc(f)} <span class="interim">${esc(i)}</span>`; });
        draw();
        await mic.start();
        tick = setInterval(() => { left = (task.secs || 90) - (Date.now() - t0) / 1000; const el = s.body.querySelector('#timer'); if (el) { el.textContent = (left < 0 ? '+' : '') + ui.fmtTimer(Math.abs(left)); el.style.color = left < 0 ? 'var(--warning)' : ''; } }, 250);
        s.timers.push(tick);
      },
      stopRec() { stopAll(); },
      skipToType() { phase = 'review'; draw(); },
      analyse() {
        transcript = s.body.querySelector('#tr').value;
        if (!transcript.trim()) return;
        analysis = LOS.writing.analyzeSpeech(s.code, transcript, secsUsed || task.secs || 60, { level: task.l, keys: task.keys });
        prefill(analysis); draw();
      },
      rate(el) { ratings[el.dataset.k] = +el.dataset.n; s.body.querySelectorAll(`[data-act="rate"][data-k="${el.dataset.k}"]`).forEach((b) => b.classList.toggle('on', +b.dataset.n === +el.dataset.n)); },
      again() { phase = 'ready'; analysis = null; ratings = {}; transcript = ''; draw(); },
      save() {
        const ta = s.body.querySelector('#tr'); if (ta) transcript = ta.value;
        if (transcript.trim() && !analysis) { analysis = LOS.writing.analyzeSpeech(s.code, transcript, secsUsed || task.secs, { level: task.l, keys: task.keys }); prefill(analysis); }
        const vals = Object.values(ratings);
        const overall = vals.length ? U.avg(vals) : analysis ? analysis.overall : 3;
        if (analysis) logAnalysisErrors(s.code, analysis, 'speaking');
        opts.onSave({ transcript, secs: secsUsed, ratings, overall, analysis });
      },
    };
    return { draw, handlers };
  }

  R.speaking = function (s) {
    const t = s.pack.speaking.find((x) => x.id === s.item.payload.taskId);
    if (!t) return s.fail('Speaking task not found.');
    const core = speakingCore(s, t, {
      onSave({ transcript, secs, ratings, overall }) {
        s.lang.speakings.unshift({ id: U.uid('spk'), date: U.today(), taskId: t.id, title: t.title, level: t.l, transcript, secs, ratings, overall });
        if (s.lang.speakings.length > 300) s.lang.speakings.length = 300;
        LOS.skills.update(s.lang, 'speaking', U.levelIndex(t.l) + 0.5, (overall - 1) / 4, 0.06);
        s.lang.seen.prompts[t.id] = U.today();
        s.finish({ score: overall / 5, headline: 'Speaking saved', summary: [`Self-rated ${U.round(overall, 1)}/5`, transcript ? `${U.words(transcript).length} words in ${secs || '?'} s` : 'No transcript', 'Recurring errors from the transcript were added to your error log.'] });
      },
    });
    s.on(core.handlers);
    core.draw();
  };

  /* ======================================================================
   * Think in the language — rapid, timed, no translation
   * ====================================================================== */
  R.think = function (s) {
    const drills = LOS.learn.pickThink(s.code, s.item.payload.count || 4, { type: s.item.payload.type });
    if (!drills.length) return s.fail('No drills available.');
    const T = LOS.shared.THINK_TYPES;
    let i = 0, phase = 'prompt', left = 0, tick = null, mic = null, answer = '', analysis = null, scores = [];
    function stopTick() { if (tick) { clearInterval(tick); tick = null; } }
    function draw() {
      const d = drills[i];
      if (!d) {
        const avg = scores.length ? U.avg(scores) : 0.6;
        return s.finish({ score: avg, headline: 'Thinking drills done', summary: [`${drills.length} prompts answered directly in ${esc(s.pack.name)}`, 'The aim: shorter gap between idea and words, no Italian in between.'] });
      }
      const tp = T[d.type];
      s.progress(i / drills.length);
      if (phase === 'prompt') {
        left = tp.secs;
        s.render(`<div class="between"><span class="pill">${esc(tp.label)}</span><span class="faint small">${i + 1} of ${drills.length}</span></div>
          <p class="faint small mt-8">${esc(tp.desc)}</p><div class="prompt mt-16">${esc(d.p)}</div>
          <div class="stack mt-24" style="align-items:center;--gap:6px"><div class="timer" id="timer" style="font-size:40px">${ui.fmtTimer(left)}</div></div>
          ${d.type === 'monologue' ? `<p class="muted mt-16" style="text-align:center">Do it silently, in your head, in ${esc(s.pack.name)}. Press done when finished.</p>` : `<textarea class="textarea mt-16" id="ta" rows="3" placeholder="Answer in ${esc(s.pack.name)}… (or speak)" autofocus></textarea>`}
          <div class="runner-foot">${LOS.speech.srSupported && d.type !== 'monologue' ? `<button class="btn sm" data-act="mic">${icon('speaking', 14)} ${mic && mic.active ? 'Stop' : 'Speak'}</button>` : '<span></span>'}<button class="btn primary" data-act="done" data-enter>Done ${icon('arrowRight', 16)}</button></div>`);
        stopTick();
        const t0 = Date.now();
        tick = setInterval(() => { const el = s.body.querySelector('#timer'); const l = tp.secs - (Date.now() - t0) / 1000; if (el) { el.textContent = (l < 0 ? '+' : '') + ui.fmtTimer(Math.abs(l)); el.style.color = l < 0 ? 'var(--warning)' : ''; } }, 250);
        s.timers.push(tick);
      } else {
        s.render(`<div class="between"><span class="pill">${esc(tp.label)}</span><span class="faint small">${i + 1} of ${drills.length}</span></div><div class="prompt sm mt-16">${esc(d.p)}</div>
          ${answer ? `<div class="card soft mt-16"><div class="eyebrow">Your answer</div><div class="mt-4">${esc(answer)}</div></div>` : ''}
          ${d.model ? `<div class="mt-16"><div class="eyebrow">A natural answer</div><div class="example between"><span>${esc(d.model)}</span>${ui.speakBtn(d.model, s.code)}</div></div>` : ''}
          ${d.keys ? `<div class="mt-16"><div class="eyebrow">Useful language</div><div class="cluster mt-8">${d.keys.map((k) => `<span class="pill ${analysis && analysis.keysUsed.includes(k) ? 'ok' : 'outline'}">${esc(k)}</span>`).join('')}</div></div>` : ''}
          ${analysis && analysis.issues.length ? `<div class="card flat mt-16">${correctionsHTML(analysis, 3)}</div>` : ''}
          <div class="faint small mt-24">How did it feel?</div>
          <div class="grid grid-3 mt-8"><button class="btn" data-act="self" data-v="0" data-key="1">Struggled — translated in my head</button><button class="btn" data-act="self" data-v="2" data-key="2">OK — some hesitation</button><button class="btn primary" data-act="self" data-v="3" data-key="3" data-enter>Fluent — thought in ${esc(s.pack.name)}</button></div>`);
      }
    }
    s.on({
      async mic() {
        if (mic && mic.active) { const r = await mic.stop(); const ta = s.body.querySelector('#ta'); if (ta) ta.value = (ta.value + ' ' + (r.transcript || '')).trim(); s.body.querySelector('[data-act="mic"]').innerHTML = `${icon('speaking', 14)} Speak`; return; }
        mic = micController(s, (f, it) => { const ta = s.body.querySelector('#ta'); if (ta) ta.value = (f + ' ' + it).trim(); });
        await mic.start();
        s.body.querySelector('[data-act="mic"]').innerHTML = `${icon('stop', 14)} Stop`;
      },
      async done() {
        stopTick();
        if (mic && mic.active) { const r = await mic.stop(); const ta = s.body.querySelector('#ta'); if (ta && r.transcript) ta.value = r.transcript; }
        const ta = s.body.querySelector('#ta');
        answer = ta ? ta.value.trim() : '';
        const d = drills[i];
        analysis = answer ? LOS.writing.analyze(s.code, answer, { level: d.l, keys: d.keys }) : null;
        if (analysis) logAnalysisErrors(s.code, analysis, 'think');
        phase = 'reveal'; draw();
      },
      self(el) {
        const v = +el.dataset.v;
        const d = drills[i];
        const score = { 0: 0.25, 2: 0.65, 3: 1 }[v];
        scores.push(score);
        LOS.skills.update(s.lang, 'speaking', U.levelIndex(d.l) + 0.5, score, 0.02);
        s.lang.seen.think[d.type + ':' + d.p.slice(0, 30)] = U.today();
        i++; phase = 'prompt'; answer = ''; analysis = null; draw();
      },
    });
    draw();
  };

  /* ======================================================================
   * Professional / medical scenario: input → controlled practice → production → model → self-rating
   * ====================================================================== */
  R.scenario = function (s) {
    const m = s.pack.index.modules[s.item.payload.moduleId];
    if (!m) return s.fail('Module not found.');
    const idx = s.item.payload.idx || 0;
    const sc = (m.scen || [])[idx];
    if (!sc) return s.fail('Scenario not found.');
    const isPro = !!(m.expr[0] && m.expr[0].weak);
    let phase = 'input', qi = 0, res = null, given = null, correct = 0;
    // controlled practice items
    const rnd = U.rng(m.id + U.today());
    const quiz = isPro
      ? U.shuffle(m.expr, rnd).slice(0, 3).map((e) => { const others = U.shuffle(m.expr.filter((x) => x !== e), rnd).slice(0, 1).map((x) => x.weak); const o = U.shuffle([e.p, e.weak].concat(others), rnd); return { t: 'mc', q: `More professional way to say: “${e.weak}”`, o, a: o.indexOf(e.p), w: e.n }; })
      : U.shuffle(m.expr.filter((e) => U.words(e.p).length >= 4), rnd).slice(0, 3).map((e) => {
        const toks = e.p.split(' ');
        let k = toks.map((w, j) => ({ w, j, len: w.replace(/[^\p{L}]/gu, '').length })).sort((a, b) => b.len - a.len)[0].j;
        const word = toks[k].replace(/[.,;:!?…]+$/, '');
        const q = toks.map((w, j) => (j === k ? w.replace(word, '___') : w)).join(' ');
        return { t: 'gap', q, a: [word], w: e.n };
      });
    let text = '', analysis = null, ratings = {}, writtenMode = sc.mode === 'write';
    let speak = null;
    function draw() {
      if (phase === 'input') {
        s.progress(0.05);
        s.render(`<div class="stage-label">Input · ${esc(m.title)}</div><p class="muted">${esc(m.intro || '')}</p>
          <div class="card mt-16"><div class="list">${m.expr.map((e) => `<div class="expr"><div>${e.weak ? `<div class="weak">${esc(e.weak)}</div>` : ''}<div class="p">${esc(e.p)}</div>${e.n ? `<div class="n">${esc(e.n)}</div>` : ''}</div>${ui.speakBtn(e.p, s.code)}</div>`).join('')}</div></div>
          ${m.col && m.col.length ? `<div class="mt-16"><div class="eyebrow">Collocations</div><div class="cluster mt-8">${m.col.map((c) => `<span class="pill outline">${esc(c.p)}</span>`).join('')}</div></div>` : ''}
          <div class="runner-foot"><span class="faint xs">${s.lang.goals.includes('medical') || !isPro ? 'Language & communication practice — not clinical guidance.' : ''}</span><button class="btn primary" data-act="toQuiz" data-enter autofocus>Practise ${icon('arrowRight', 16)}</button></div>`);
      } else if (phase === 'quiz') {
        const q = quiz[qi];
        if (!q) { phase = 'task'; return draw(); }
        s.progress(0.15 + (qi / quiz.length) * 0.25);
        s.render(`<div class="faint small">${esc(m.title)} · controlled practice ${qi + 1}/${quiz.length}</div><div class="mt-16">${exerciseHTML(q, res, given)}</div>${res ? nextBtn() : ''}`);
      } else if (phase === 'task') {
        s.progress(0.5);
        if (!writtenMode) {
          if (!speak) {
            speak = speakingCore(s, { p: sc.p, secs: 120, keys: sc.keys, l: m.l, type: 'role play', model: sc.model }, {
              stage: 'Scenario',
              onSave({ transcript, ratings: rt, overall, analysis: a }) { text = transcript; ratings = rt; analysis = a; complete(overall); },
            });
          }
          return speak.draw();
        }
        s.render(`<div class="stage-label">Scenario · write</div><div class="prompt sm">${esc(sc.p)}</div>
          <div class="cluster mt-12">${(sc.keys || []).map((k) => `<span class="pill ${analysis && analysis.keysUsed.includes(k) ? 'ok' : 'outline'}">${esc(k)}</span>`).join('')}</div>
          <textarea class="textarea mt-16" id="sct" rows="9" autofocus>${esc(text)}</textarea>
          ${analysis ? `<div class="card flat mt-16">${correctionsHTML(analysis, 5)}</div><details class="mt-16" open><summary class="btn ghost sm">Model answer</summary><div class="example mt-8" style="white-space:pre-wrap">${esc(sc.model)}</div></details>
            <div class="section"><div class="section-head"><h3>Self-assessment</h3></div><div class="rubric">${[['clarity', 'Clarity'], ['accuracy', 'Accuracy'], ['register', 'Register & tone'], ['completeness', 'Completeness']].map(([k, l]) => `<div>${l}</div><div class="rate">${[1, 2, 3, 4, 5].map((n) => `<button class="${ratings[k] === n ? 'on' : ''}" data-act="rate" data-k="${k}" data-n="${n}">${n}</button>`).join('')}</div>`).join('')}</div></div>` : ''}
          <div class="runner-foot"><span></span><div class="cluster">${analysis ? `<button class="btn" data-act="checkW">Re-check</button><button class="btn primary" data-act="saveW" data-enter>Save</button>` : `<button class="btn primary" data-act="checkW">Check ${icon('sparkle', 14)}</button>`}</div></div>`);
      }
    }
    function complete(overall) {
      const key = m.id + ':' + idx;
      s.lang.seen.scenarios[key] = U.today();
      LOS.skills.update(s.lang, writtenMode ? 'writing' : 'speaking', U.levelIndex(m.l) + 0.5, (overall - 1) / 4, 0.06);
      if (writtenMode) s.lang.writings.unshift({ id: U.uid('wri'), date: U.today(), promptId: key, title: m.title, genre: 'Scenario', level: m.l, text, words: U.words(text).length, scores: analysis ? analysis.scores : {}, overall, estTheta: analysis ? analysis.estTheta : null });
      else s.lang.speakings.unshift({ id: U.uid('spk'), date: U.today(), taskId: key, title: m.title, level: m.l, transcript: text, ratings, overall });
      let gained = false;
      if (overall >= 3.5 && sc.cando && !s.lang.gains.some((g) => g.key === key)) { s.lang.gains.unshift({ date: U.today(), skill: writtenMode ? 'writing' : 'speaking', level: m.l, text: sc.cando, kind: 'scenario', key }); gained = true; }
      s.finish({ score: overall / 5, headline: 'Scenario complete', summary: [`${m.title} · self-rated ${U.round(overall, 1)}/5`, `Controlled practice: ${correct}/${quiz.length}`, gained ? `New competence: ${esc(sc.cando)}` : 'Repeat this scenario later to make the phrases automatic.'] });
    }
    const own = {
      toQuiz() { phase = quiz.length ? 'quiz' : 'task'; draw(); },
      opt(el) { if (res) return; given = el.dataset.v; res = LOS.learn.checkAnswer(quiz[qi], given, s.code); if (res.correct) correct++; draw(); },
      submit() { if (res) return; given = s.body.querySelector('#ans').value; res = LOS.learn.checkAnswer(quiz[qi], given, s.code); if (res.correct) correct++; draw(); },
      next() { res = null; given = null; qi++; draw(); },
      async checkW() { text = s.body.querySelector('#sct').value; if (U.words(text).length < 5) return; analysis = await LOS.AI.evaluateWriting(s.code, { text, level: m.l, reg: 'formal', keys: sc.keys }); draw(); },
      rate(el) {
        if (speak && phase === 'task' && !writtenMode) return speak.handlers.rate(el);
        ratings[el.dataset.k] = +el.dataset.n; s.body.querySelectorAll(`[data-act="rate"][data-k="${el.dataset.k}"]`).forEach((b) => b.classList.toggle('on', +b.dataset.n === +el.dataset.n));
      },
      saveW() {
        const ta = s.body.querySelector('#sct'); if (ta) text = ta.value;
        if (analysis) logAnalysisErrors(s.code, analysis, 'scenario');
        const v = Object.values(ratings);
        complete(v.length ? U.avg(v) : analysis ? analysis.overall : 3);
      },
    };
    // route speaking-core handlers when in spoken task
    const proxy = {};
    ['startRec', 'stopRec', 'skipToType', 'analyse', 'again', 'save'].forEach((k) => { proxy[k] = (el, e) => speak && speak.handlers[k](el, e); });
    s.on(Object.assign(proxy, own));
    draw();
  };

  /* ======================================================================
   * Public: start a runner for a plan item or an ad-hoc practice item
   * ====================================================================== */
  LOS.run = {
    runners: R,
    start(root, opts) {
      const s = createSession(root, opts);
      const r = R[opts.item.type];
      if (!r) { s.fail('Unknown activity type: ' + opts.item.type); return s; }
      try { r(s); } catch (e) { console.error(e); s.fail(e.message); }
      return s;
    },
  };
})();

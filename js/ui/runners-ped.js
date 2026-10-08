/* RUNNERS — Pedagogy Engine 2.0.
 * One exercise player for every staged item (vocabulary, chunks, micro-tasks), and the runners built on it:
 *   vocabulary  SEE → HEAR → UNDERSTAND → RECOGNIZE → RECALL (new items never jump to production)
 *   review      each due item gets the exercise of ITS stage
 *   micro       small tasks (choose, complete, translate, match, build, correct, register, dialogue, respond…)
 *   lesson      "You are not quite ready for this task yet — let's learn the language you need first"
 *   remedy      recurring error → explain → controlled → contextual → review later
 * and gates in front of writing, speaking and scenarios (readiness check + production ladder + scenario path). */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const R = LOS.run.runners;
  const H = LOS.run.helpers;
  const ped = LOS.ped;

  /* ====================================================================
   * Exercise player
   * ==================================================================== */
  const KIND_TITLE = {
    expose: 'New', 'mc-meaning': 'Recognize · meaning', 'mc-reverse': 'Recognize · which word?', 'mc-context': 'Recognize · in context', audio: 'Recognize · listen',
    'type-tr': 'Recall', 'type-def': 'Recall · from the definition', cloze: 'Complete the sentence', build: 'Build the sentence', use: 'Use it in one sentence',
    rapid: 'Fast recall', match: 'Match', fix: 'Correct the sentence', gram: 'Grammar', mcq: 'Choose', free: 'Respond', repeat: 'Listen and repeat',
  };
  function makePlayer(s, cb) {
    let ex = null, res = null, given = '', hintShown = false, bankUsed = false, t0 = 0, built = [], match = null, outcome = null, change = null;
    const st = () => (ex && ex.id ? s.lang.vocab[ex.id] : null);
    function show(e) {
      ex = e; res = null; given = ''; outcome = null; change = null; built = []; t0 = Date.now(); bankUsed = false;
      hintShown = !!(e && e.hintLevel >= 2 && e.hint && e.kind !== 'rapid');
      match = e && e.kind === 'match' ? { sel: null, done: {}, errors: 0 } : null;
      if (e && (e.kind === 'audio' || e.kind === 'expose' || e.kind === 'repeat') && LOS.speech.ttsSupported) setTimeout(() => LOS.speech.speak(e.kind === 'repeat' ? e.text : e.v.w, s.code), 250);
    }
    const stagePill = (n) => `<span class="pill ${n >= 4 ? 'ok' : n >= 2 ? 'accent' : ''}" title="${esc(ped.VSTAGES[n])}">${esc(ped.VSTAGE_SHORT[n])}</span>`;
    function itemLine(v) { return `<strong>${esc(v.w)}</strong>${v.pl ? ` <span class="muted">— ${esc(v.pl)}</span>` : ''}${v.tr ? ` — ${esc(v.tr)}` : ''}${v.ex ? `<div class="why">${esc(v.ex)}</div>` : ''}`; }
    function feedback() {
      if (!res) return '';
      const ok = res.correct;
      const lab = outcome ? ped.OUTCOME_LABEL[outcome] : ok ? 'Correct' : 'Not yet';
      const ch = change && change.to !== change.from ? `<div class="adapt-note">${icon(change.to > change.from ? 'progress' : 'info', 14)} ${esc(ped.VSTAGES[change.from])} → <strong>${esc(ped.VSTAGES[change.to])}</strong></div>` : '';
      const body = ex.v ? itemLine(ex.v) : res.expected ? `Answer: <strong>${esc(res.expected)}</strong>` : '';
      const extra = ex.why ? `<div class="why">${esc(ex.why)}</div>` : ex.ex && ex.ex.w ? `<div class="why">${esc(ex.ex.w)}</div>` : '';
      const model = ex.model && (ex.kind === 'use' || ex.kind === 'free') ? `<div class="why">Example: ${esc(ex.model)}</div>` : '';
      return `<div class="feedback ${ok ? 'ok' : 'bad'}">${icon(ok ? 'checkCircle' : 'errors', 20)}<div class="body"><strong>${esc(lab)}</strong>${res.note ? ` — ${esc(res.note)}` : ''}<div class="mt-4">${body}</div>${!ok && res.expected && ex.v ? `<div class="why">Expected: ${esc(res.expected)}</div>` : ''}${extra}${model}${ch}</div></div>`;
    }
    function hintBtn() {
      if (res || !ex.hint || hintShown) return '';
      return `<button class="btn ghost sm" data-act="hint">${icon('info', 14)} Hint</button>`;
    }
    function inputRow(placeholder) {
      return `<div class="answer-row"><input class="input lg" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" ${res ? `value="${esc(given)}" readonly` : 'autofocus'} placeholder="${esc(placeholder || '')}" aria-label="Your answer"><button class="btn primary lg" data-act="submit" ${res ? 'disabled' : 'data-enter'}>Check</button></div>
        ${hintShown && ex.hint && !res ? `<div class="faint small mt-8">Hint: ${esc(ex.hint)}</div>` : ''}
        ${ex.bank && !res && (hintShown || ex.hintLevel >= 2) ? `<div class="cluster mt-8">${ex.bank.map((b) => `<button class="chip" data-act="bank" data-v="${esc(b)}">${esc(b)}</button>`).join('')}</div>` : ''}`;
    }
    function options(list, answer) {
      return `<div class="options" role="group">${list.map((o, k) => `<button class="option ${res ? (k === answer ? 'correct' : String(k) === given ? 'wrong' : '') : ''}" data-act="opt" data-v="${k}" data-key="${k + 1}" ${res ? 'disabled' : ''}><span class="k">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
    }
    function html(head = '') {
      if (!ex) return '';
      const v = ex.v;
      const title = `<div class="stage-label">${esc(KIND_TITLE[ex.kind] || 'Practice')}${ex.micro ? '' : ex.stage != null && v ? ` · ${stagePill(ped.vstage(st()))} <span class="faint">${esc(ped.VNEXT[ex.stage] || '')}</span>` : ''}</div>`;
      let b = '';
      switch (ex.kind) {
        case 'expose':
          b = `${st() && st().reteach ? ui.notice('Let\'s look at this one again before practising it.', 'info') : ''}${ui.dictCard(v, s.code, null, { mastery: false })}
            ${v.alt ? `<div class="mt-12 small"><span class="faint">Plain version:</span> “${esc(v.alt)}”</div>` : ''}
            ${(v.ctxs || []).length > 1 ? `<div class="mt-12"><div class="eyebrow">In context</div>${v.ctxs.slice(0, 3).map((c) => `<div class="example between"><span>${esc(c)}</span>${ui.speakBtn(c, s.code)}</div>`).join('')}</div>` : ''}
            <div class="runner-foot"><span class="faint xs">No test yet — just see, hear and understand it.</span><button class="btn primary" data-act="got" data-enter autofocus>Got it ${icon('arrowRight', 16)}</button></div>`;
          return head + title + b;
        case 'mc-meaning': b = `<div class="between"><div class="prompt">${esc(ex.prompt)}</div>${ui.speakBtn(v.w, s.code)}</div><p class="faint small">What does it mean?</p>${options(ex.options, ex.answer)}`; break;
        case 'mc-reverse': b = `<div class="prompt sm">${esc(ex.prompt)}</div><p class="faint small">Which ${esc(s.pack.name)} word or phrase means this?</p>${options(ex.options, ex.answer)}`; break;
        case 'audio': b = `<div class="stack" style="align-items:center"><button class="rec-btn" data-act="speak" data-text="${esc(ex.audio)}" data-code="${esc(s.code)}" aria-label="Play again">${icon('volume', 26)}</button><span class="faint small">Which word or phrase did you hear?</span></div>${options(ex.options, ex.answer)}`; break;
        case 'mc-context': b = `<div class="prompt sm">${esc(ex.before)}<span class="blank"></span>${esc(ex.after)}</div><p class="faint small">Which word fits?</p>${options(ex.options, ex.answer)}`; break;
        case 'type-tr': case 'type-def': case 'rapid':
          b = `<div class="prompt sm">${esc(ex.prompt)}</div>${ex.sub ? `<div class="prompt-sub">${esc(ex.sub)}</div>` : ''}${ex.kind === 'rapid' ? '<div class="faint xs">Answer as fast as you can — this trains automatic retrieval.</div>' : ''}${inputRow(`Type it in ${s.pack.name}`)}`; break;
        case 'cloze': b = `<div class="prompt sm">${esc(ex.before)}<span class="blank"></span>${esc(ex.after)}</div>${v && v.tr ? `<div class="prompt-sub">${esc(v.tr)}</div>` : ''}${inputRow('Missing word(s)')}`; break;
        case 'build':
          b = `<p class="faint small">Put the words in order.</p><div class="built prompt sm" style="min-height:2.4em">${esc((res ? given : built.map((i) => ex.tokens[i]).join(' ')) || ' ')}</div>
            ${res ? '' : `<div class="cluster mt-12">${ex.tokens.map((t, i) => `<button class="chip" data-act="tok" data-i="${i}" ${built.includes(i) ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
            <div class="cluster mt-12"><button class="btn ghost sm" data-act="undo">Undo</button><button class="btn primary" data-act="submit" ${built.length === ex.tokens.length ? 'data-enter' : 'disabled'}>Check</button></div>`}`; break;
        case 'use':
          b = `<div class="prompt sm">Write ONE sentence using <strong>“${esc(v.w)}”</strong> — ${esc(ex.situation)}.</div>${v.tr ? `<div class="prompt-sub">${esc(v.tr)}</div>` : ''}
            <textarea class="textarea mt-16" id="ans" rows="2" ${res ? 'readonly' : 'autofocus'}>${esc(given)}</textarea>
            ${hintShown && !res && ex.model ? `<div class="faint small mt-8">Example: ${esc(ex.model)}</div>` : ''}
            ${res ? '' : `<div class="cluster mt-8">${ex.model && !hintShown ? `<button class="btn ghost sm" data-act="hint">${icon('info', 14)} Show an example</button>` : ''}<button class="btn primary" data-act="submit">Check</button></div>`}`; break;
        case 'match': {
          const m = match;
          b = `<p class="faint small">Tap a word, then its meaning.</p><div class="grid grid-2" style="--gap:10px">
            <div class="stack" style="--gap:8px">${ex.pairs.map((p) => `<button class="option ${m.done[p.id] ? 'correct' : m.sel === p.id ? 'sel' : ''}" data-act="mw" data-id="${esc(p.id)}" ${m.done[p.id] ? 'disabled' : ''}>${esc(p.w)}</button>`).join('')}</div>
            <div class="stack" style="--gap:8px">${ex.order.map((id) => { const p = ex.pairs.find((x) => x.id === id); return `<button class="option ${m.done[id] ? 'correct' : ''}" data-act="mt" data-id="${esc(id)}" ${m.done[id] ? 'disabled' : ''}>${esc(p.tr)}</button>`; }).join('')}</div></div>`;
          break;
        }
        case 'fix': case 'gram': return head + title + H.exerciseHTML(ex.ex, res, given) + (res ? H.nextBtn() : '');
        case 'mcq': b = `<div class="prompt sm">${esc(ex.prompt)}</div>${options(ex.options, ex.answer)}`; break;
        case 'free':
          b = `<div class="prompt sm">${esc(ex.prompt)}</div><p class="faint small">${ex.sentences === 1 ? 'One sentence is enough.' : `About ${ex.sentences} sentences.`} Use language you have practised.</p>
            <textarea class="textarea mt-12" id="ans" rows="${ex.sentences > 1 ? 4 : 2}" ${res ? 'readonly' : 'autofocus'}>${esc(given)}</textarea>
            ${res ? (res.analysis ? `<div class="card flat mt-12">${H.correctionsHTML(res.analysis, 3)}</div>` : '') : `<div class="cluster mt-8"><button class="btn primary" data-act="submit">Check</button></div>`}`; break;
        case 'repeat':
          b = `<div class="example between"><span>${esc(ex.text)}</span><span class="cluster">${ui.speakBtn(ex.text, s.code)}<button class="btn ghost sm" data-act="speak" data-text="${esc(ex.text)}" data-code="${esc(s.code)}" data-rate="0.65">Slow</button></span></div>
            <p class="faint small mt-8">Listen, then say it aloud two or three times, copying rhythm and stress.</p>
            ${res ? '' : `<div class="cluster mt-12"><button class="btn" data-act="rep" data-v="0">It was hard</button><button class="btn primary" data-act="rep" data-v="1" data-enter>Done</button></div>`}`; break;
        default: b = '';
      }
      return head + title + b + feedback() + (res ? H.nextBtn() : `<div class="runner-foot"><span>${hintBtn()}</span><span class="faint xs">${ex.options ? 'Keys 1–4' : 'Enter ↵ to check'}</span></div>`);
    }
    function settle(r) {
      res = r;
      r.hint = r.hint || hintShown || bankUsed;
      r.ms = Date.now() - t0; r.expectedMs = ex.expectedMs;
      if (ex.id && ex.v) {
        outcome = ped.classify(r, st());
        change = ped.recordVocab(s.code, ex.id, outcome, ex.stage != null ? ex.stage : ped.vstage(st()), { given, sameDayOk: !!cb.sameDayOk });
      } else outcome = r.correct ? (r.hint ? 'hint' : 'easy') : 'wrong';
      if (cb.onResult) cb.onResult(ex, r, outcome);
      cb.redraw();
    }
    const handlers = {
      got() { ped.expose(s.code, [ex.id]); outcome = 'easy'; if (cb.onResult) cb.onResult(ex, { correct: true, exposed: true }, 'easy'); cb.next(); },
      opt(el) {
        if (res) return; given = el.dataset.v;
        if (ex.kind === 'fix' || ex.kind === 'gram') return settle(gramCheck(given));
        settle({ correct: +given === ex.answer, expected: ex.options[ex.answer] });
      },
      submit() {
        if (res) return;
        if (ex.kind === 'build') { given = built.map((i) => ex.tokens[i]).join(' '); return settle(LOS.learn.checkAnswer({ t: 'fix', a: ex.answers }, given, s.code)); }
        const el = s.body.querySelector('#ans'); if (!el) return; given = el.value; if (!given.trim()) return;
        if (ex.kind === 'fix' || ex.kind === 'gram') return settle(gramCheck(given));
        if (ex.kind === 'free') return settle(freeCheck(given));
        settle(ped.checkVocab(s.code, ex, given));
      },
      hint() { hintShown = true; cb.redraw(); },
      bank(el) { bankUsed = true; const i = s.body.querySelector('#ans'); if (i) { i.value = el.dataset.v; i.focus(); } },
      tok(el) { built.push(+el.dataset.i); cb.redraw(); },
      undo() { built.pop(); cb.redraw(); },
      mw(el) { match.sel = el.dataset.id; cb.redraw(); },
      mt(el) {
        if (!match.sel) return;
        if (match.sel === el.dataset.id) { match.done[el.dataset.id] = true; if (ex.pairs.every((p) => match.done[p.id])) { ex.pairs.forEach((p) => ped.recordVocab(s.code, p.id, match.errors ? 'hesitant' : 'easy', Math.min(1, ped.vstage(s.lang.vocab[p.id])), { sameDayOk: true })); return settle({ correct: match.errors <= 1, note: match.errors ? `${match.errors} mismatch${match.errors > 1 ? 'es' : ''}` : '' }); } }
        else match.errors++;
        match.sel = null; cb.redraw();
      },
      rep(el) { if (ex.id) ped.recordVocab(s.code, ex.id, el.dataset.v === '1' ? 'easy' : 'hint', Math.min(ped.vstage(st()), 2)); res = { correct: el.dataset.v === '1' }; outcome = res.correct ? 'easy' : 'hint'; if (cb.onResult) cb.onResult(ex, res, outcome); cb.redraw(); },
      next() { cb.next(); },
    };
    function gramCheck(value) {
      const r = LOS.learn.checkAnswer(ex.ex, value, s.code);
      if (ex.errorId) LOS.learn.gradeErrorCard(s.code, ex.errorId, r.correct ? 2 : 0);
      if (!r.correct && ex.topic) { const t = s.pack.index.grammar[ex.topic]; LOS.learn.recordError(s.code, { src: 'micro', cat: (t && t.ecat) || 'grammar', label: t ? t.cat + ' · ' + t.title : 'Grammar', topic: ex.topic, wrong: LOS.learn.sentenceFor(ex.ex, value), right: LOS.learn.sentenceFor(ex.ex, ex.ex.t === 'mc' ? ex.ex.a : r.expected), note: ex.ex.w || '' }); }
      if (ex.topic) { const t = s.pack.index.grammar[ex.topic]; LOS.skills.update(s.lang, 'grammar', U.levelIndex(t.l) + 0.3, r.correct ? 1 : 0, 0.02); }
      return r;
    }
    function freeCheck(text) {
      const a = LOS.writing.analyze(s.code, text, { level: U.LEVELS[LOS.learn.targetLevelIdx(s.code, 'writing')], keys: ex.keys || [] });
      const nS = Math.max(1, U.sentences(text).length);
      const used = ped.detectUse(s.code, text);
      H.logAnalysisErrors(s.code, a, 'micro');
      const enough = nS >= Math.min(ex.sentences || 1, 3) || a.words >= (ex.sentences || 1) * 6;
      const ok = enough && a.errors.length === 0;
      return { correct: ok, close: a.hints.length > 0, note: !enough ? `Try ${ex.sentences} sentences.` : a.errors.length ? `${a.errors.length} thing${a.errors.length > 1 ? 's' : ''} to fix — see below.` : used.length ? `You used: ${used.join(', ')}` : '', analysis: a };
    }
    return { show, html, handlers, get ex() { return ex; }, get res() { return res; }, get outcome() { return outcome; } };
  }
  LOS.run.makePlayer = makePlayer;

  /* ====================================================================
   * Vocabulary: SEE → HEAR → UNDERSTAND → RECOGNIZE → RECALL (first contact)
   * ==================================================================== */
  R.vocabulary = async function (s) {
    s.render('<p class="muted">Selecting words for you…</p>');
    const n = s.item.payload.count || 6;
    let items;
    if (s.item.payload.ids) items = s.item.payload.ids.map((id) => LOS.learn.vocabItem(s.code, id)).filter(Boolean);
    else { const r = await LOS.AI.generateVocabulary(s.code, { count: n }); items = (r.items || []).filter(Boolean); }
    if (!items.length) { s.render(ui.empty({ icon: 'vocabulary', title: 'No new items available', text: 'You have met every item in the built-in bank. Add your own words from listening and reading — they will be prioritised.', action: '<a class="btn" href="#/vocabulary/add">Add words</a>' })); return; }
    // a single item opened from the dictionary continues at its own stage
    const single = items.length === 1 && ped.vstage(s.lang.vocab[items[0].id]) >= 1;
    const steps = [];
    if (single) steps.push(items[0].id);
    else {
      items.forEach((v) => steps.push({ id: v.id, stage: 0 }));       // 1–3 see, hear, understand
      items.forEach((v) => steps.push({ id: v.id, stage: 1 }));       // 4 recognize
      items.forEach((v) => steps.push({ id: v.id, stage: 2, ifEasy: 1 })); // 5 recall — only after an easy recognition
    }
    const known = new Set();
    const firstOutcome = {};
    let i = 0;
    const player = makePlayer(s, { redraw: draw, next, sameDayOk: true, onResult(ex, r, outcome) { if (ex.stage === 1) firstOutcome[ex.id] = outcome; } });
    function stepEx(step) {
      if (typeof step === 'string') return ped.vocabExercise(s.code, step);
      return ped.vocabExercise(s.code, step.id, { stage: step.stage });
    }
    function next() {
      i++;
      while (i < steps.length) {
        const st = steps[i];
        if (typeof st === 'object' && known.has(st.id) && st.stage < 2) { i++; continue; }
        if (typeof st === 'object' && st.ifEasy && firstOutcome[st.id] !== 'easy' && !known.has(st.id)) { i++; continue; }
        break;
      }
      if (i >= steps.length) return finish();
      player.show(stepEx(steps[i])); draw();
    }
    function draw() {
      s.progress(i / steps.length);
      const extra = player.ex && player.ex.kind === 'expose' && !single ? `<div class="faint xs mb-8">New item ${(i % items.length) + 1} of ${items.length}</div>` : '';
      s.render(extra + player.html() + (player.ex && player.ex.kind === 'expose' && !single ? `<div class="mt-8"><button class="btn ghost sm" data-act="known">I already know this</button></div>` : ''));
    }
    function finish() {
      const sum = items.map((v) => `${v.w}: ${ped.VSTAGES[ped.vstage(s.lang.vocab[v.id])]}`);
      const rec = items.filter((v) => ped.vstage(s.lang.vocab[v.id]) >= 2).length;
      s.finish({ score: items.length ? rec / items.length : 1, headline: single ? 'Practised' : `${items.length} new items`, summary: [single ? '' : `${rec} of ${items.length} recognized on first contact`, 'They come back on their own schedule: recognition → recall → completing sentences → using them yourself.', sum.slice(0, 8).join(' · ')].filter(Boolean) });
    }
    s.on(Object.assign({}, player.handlers, {
      known() {
        // "I know this" is not mastery: the item skips exposure and will be checked by recall
        const id = player.ex.id; known.add(id); ped.expose(s.code, [id]);
        const st = s.lang.vocab[id]; st.stage = Math.max(st.stage, 2); st.claimed = true; st.due = U.today();
        next();
      },
    }));
    player.show(stepEx(steps[0])); draw();
  };

  /* ====================================================================
   * Review: due vocabulary at its own stage + due grammar + error cards
   * ==================================================================== */
  R.review = function (s) {
    const cap = s.item.payload.cap || 20;
    const errIds = LOS.learn.dueErrorCards(s.code).slice(0, Math.max(2, Math.round(cap * 0.25)));
    const gIds = LOS.learn.grammarList(s.code).filter((g) => g.due && ped.gstage(g.state) >= 1).sort((a, b) => LOS.srs.priority(b.state) - LOS.srs.priority(a.state)).slice(0, cap >= 12 ? 3 : 1).map((g) => g.topic.id);
    let vIds = LOS.learn.dueVocab(s.code).slice(0, Math.max(3, cap - errIds.length - gIds.length * 3));
    let extraMode = false;
    if (!vIds.length && !gIds.length && !errIds.length) {
      vIds = Object.keys(s.lang.vocab).filter((id) => ped.vstage(s.lang.vocab[id]) >= 1 && LOS.learn.vocabItem(s.code, id)).sort((a, b) => (s.lang.vocab[a].mastery || 0) - (s.lang.vocab[b].mastery || 0)).slice(0, Math.min(8, cap));
      extraMode = vIds.length > 0;
    }
    const queue = [];
    const v = vIds.map((id) => ({ kind: 'vocab', id })), g = gIds.map((id) => ({ kind: 'grammar', id })), e = errIds.map((id) => ({ kind: 'error', id }));
    while (v.length || g.length || e.length) { queue.push(...v.splice(0, 3)); if (g.length) queue.push(g.shift()); if (e.length) queue.push(e.shift()); }
    if (!queue.length) {
      s.render(ui.empty({ icon: 'checkCircle', title: 'Nothing to review', text: 'Your spaced-repetition queue is empty. New material enters it as you learn.', action: '<button class="btn primary" data-act="finishEmpty" data-enter>Finish</button>' }));
      s.on({ finishEmpty() { s.finish({ minutes: 1, headline: 'All caught up' }); } });
      return;
    }
    let i = 0, correct = 0, answered = 0, requeued = new Set();
    let drill = null, dEx = null, dRes = null, dGiven = null;
    const player = makePlayer(s, {
      redraw: draw, next,
      onResult(ex, r, outcome) {
        if (r.exposed) return;
        answered++; if (r.correct) correct++;
        if (!r.correct && ex.id && !requeued.has(ex.id)) { requeued.add(ex.id); queue.splice(Math.min(queue.length, i + 4), 0, { kind: 'vocab', id: ex.id }); }
      },
    });
    function cur() { return queue[i]; }
    function load() {
      const q = cur(); if (!q) return;
      if (q.kind === 'vocab') player.show(ped.vocabExercise(s.code, q.id));
      if (q.kind === 'error') {
        const er = s.lang.errors.find((x) => x.id === q.id);
        player.show({ kind: 'fix', micro: 'error', ex: { t: 'fix', q: er.wrong || '…', a: [er.right], w: er.note || '', d: 1 }, errorId: q.id, why: er.note });
      }
      if (q.kind === 'grammar') { drill = new LOS.learn.GrammarDrill(s.code, q.id, 2); dEx = drill.next(); dRes = null; dGiven = null; }
    }
    function next() { i++; drill = null; if (i >= queue.length) return done(); load(); draw(); }
    function done() {
      const acc = answered ? correct / answered : 1;
      s.finish({ score: acc, headline: 'Review complete', summary: [`${queue.length} items reviewed · ${Math.round(acc * 100)}% correct`, extraMode ? 'Nothing was due, so you reinforced your weakest items.' : 'Every item moved along its own learning stage and got a new review date.'] });
    }
    function draw() {
      s.progress(i / queue.length);
      const q = cur();
      const head = `<div class="between"><span class="faint small">${extraMode ? 'Extra practice' : 'Review'} · ${i + 1} of ${queue.length}</span><span class="pill">${q.kind === 'vocab' ? 'Vocabulary' : q.kind === 'grammar' ? 'Grammar' : 'Error card'}</span></div><div class="mt-16"></div>`;
      if (q.kind === 'grammar') {
        const t = s.pack.index.grammar[q.id];
        if (!dEx) { drill.finish(); return next(); }
        s.render(head + `<div class="faint small">${esc(t.title)} · ${t.l}</div><div class="mt-8">${H.exerciseHTML(dEx, dRes, dGiven)}</div>${dRes ? H.nextBtn() : ''}`);
        return;
      }
      s.render(head + player.html());
    }
    s.on(Object.assign({}, player.handlers, {
      opt(el) { if (cur().kind !== 'grammar') return player.handlers.opt(el); if (dRes) return; dGiven = el.dataset.v; dRes = drill.answer(dEx, dGiven); answered++; if (dRes.correct) correct++; draw(); },
      submit(el) { if (cur().kind !== 'grammar') return player.handlers.submit(el); if (dRes) return; dGiven = s.body.querySelector('#ans').value; if (!dGiven.trim()) return; dRes = drill.answer(dEx, dGiven); answered++; if (dRes.correct) correct++; draw(); },
      next() { if (cur().kind !== 'grammar') return next(); dEx = drill.next(); dRes = null; dGiven = null; if (!dEx) { drill.finish(); return next(); } draw(); },
    }));
    load(); draw();
  };

  /* ====================================================================
   * Micro-tasks — the backbone of daily practice
   * ==================================================================== */
  R.micro = function (s) {
    const focus = s.item.payload.focus || 'mixed';
    const list = ped.microSet(s.code, focus, s.item.payload.count || 8, { rnd: U.rng(s.item.id + Date.now()) });
    if (!list.length) {
      s.render(ui.empty({ icon: 'vocabulary', title: 'Learn a few items first', text: 'Micro-practice reuses words and structures you have already met. Start with new vocabulary or a grammar lesson.', action: `<a class="btn primary" href="#/practice/vocab/new">New vocabulary</a>` }));
      return;
    }
    let i = 0, ok = 0, done = 0;
    const player = makePlayer(s, { redraw: draw, next, onResult(ex, r) { if (r.exposed) return; done++; if (r.correct) ok++; } });
    function next() { i++; if (i >= list.length) return finish(); player.show(list[i]); draw(); }
    function draw() { s.progress(i / list.length); s.render(`<div class="between"><span class="faint small">${esc(list[i].title || 'Practice')} · ${i + 1} of ${list.length}</span><span class="pill outline">${esc(s.item.subtitle || 'Micro-practice')}</span></div><div class="mt-16"></div>` + player.html()); }
    function finish() { const acc = done ? ok / done : 1; s.finish({ score: acc, headline: 'Practice complete', summary: [`${list.length} short tasks · ${Math.round(acc * 100)}% correct`, 'Everything you used was material you had already met — that is how it becomes yours.'] }); }
    s.on(player.handlers);
    player.show(list[0]); draw();
  };

  /* ====================================================================
   * Preparation lesson — teach the language a task needs, before the task
   * ==================================================================== */
  function readinessHTML(s, meta, rd) {
    const row = (label, have, total, extra = '') => `<div class="row" style="min-height:40px"><span class="grow">${label}</span><span class="num ${have >= total ? '' : 'faint'}">${have}/${total}</span>${extra}</div>`;
    return `<div class="card flat"><div class="eyebrow">Task requirements</div><div class="list mt-8">
      ${meta.requiredVocabulary.length ? row('Required vocabulary', rd.vocab.have, rd.vocab.total) : ''}
      ${meta.requiredChunks.length ? row('Required chunks & phrases', rd.chunks.have, rd.chunks.total) : ''}
      ${row(`Grammar topics (${esc(U.LEVELS[Math.max(0, U.levelIndex(meta.languageLevel) - 1)])}–${esc(meta.languageLevel)}) at “controlled” or above`, rd.grammar.have, rd.grammar.total)}
      </div><div class="cluster mt-12 small faint"><span>Language ${esc(meta.languageLevel)}</span><span>· task complexity ${meta.taskComplexity}/5</span><span>· cognitive load ${meta.cognitiveLoad}/5</span><span>· output ${esc(meta.outputLength.label)}</span></div></div>`;
  }
  /** Run a preparation lesson for `ids` inside session s; calls done(summary) at the end. */
  function prepLesson(s, ids, opts, doneCb) {
    ids = ids.filter((id) => LOS.learn.vocabItem(s.code, id)).slice(0, opts.max || 8);
    if (!ids.length) return doneCb({ taught: 0 });
    const steps = [];
    ids.forEach((id) => { if (ped.vstage(s.lang.vocab[id]) < 1 || (s.lang.vocab[id] || {}).reteach) steps.push({ id, stage: 0 }); });
    ids.forEach((id) => { if (ped.vstage(s.lang.vocab[id]) <= 1) steps.push({ id, stage: 1 }); });
    ids.forEach((id) => steps.push({ id, stage: 2, upTo: 2 }));
    ids.forEach((id) => steps.push({ id, stage: 3, upTo: 3, optional: true }));
    let i = 0;
    const player = makePlayer(s, { redraw: draw, next, sameDayOk: true });
    function exFor(st) { const cur = ped.vstage(s.lang.vocab[st.id]); return ped.vocabExercise(s.code, st.id, { stage: st.stage === 0 ? 0 : Math.min(Math.max(cur, st.stage === 1 ? 1 : cur), st.upTo || 7) }); }
    function skip(st) { const cur = ped.vstage(s.lang.vocab[st.id]); return st.stage > 0 && st.upTo && cur > st.upTo; }
    function next() { i++; while (i < steps.length && skip(steps[i])) i++; if (i >= steps.length) return doneCb({ taught: ids.length }); player.show(exFor(steps[i])); draw(); }
    function draw() { s.progress(0.1 + (i / steps.length) * 0.8); s.render(`<div class="between"><span class="faint small">${esc(opts.title || 'Preparation')} · ${i + 1} of ${steps.length}</span><span class="pill outline">Teach → recognize → recall → complete</span></div><div class="mt-16"></div>` + player.html()); }
    s.on(player.handlers);
    player.show(exFor(steps[0])); draw();
  }
  LOS.run.prepLesson = prepLesson;

  R.lesson = function (s) {
    const pl = s.item.payload;
    const meta = pl.meta || (pl.kind && gateMeta(s, pl.kind, pl).meta);
    const ids = pl.ids || (meta ? ped.readiness(s.code, meta).vocab.missing.concat(ped.readiness(s.code, meta).chunks.missing) : []);
    s.render(`<div class="stage-label">Preparation lesson</div><h2>${esc(pl.title || s.item.subtitle || 'The language you need')}</h2>
      <p class="lead mt-8">${esc(pl.intro || 'Before the task, we learn the words and phrases it needs: see and hear them, recognize them, recall them, complete sentences with them.')}</p>
      ${meta ? `<div class="mt-16">${readinessHTML(s, meta, ped.readiness(s.code, meta))}</div>` : ''}
      <div class="runner-foot"><span class="faint xs">${ids.length} items</span><button class="btn primary" data-act="go" data-enter autofocus>Start ${icon('arrowRight', 16)}</button></div>`);
    s.on({ go() { prepLesson(s, ids, { title: pl.title || 'Preparation' }, (r) => finishPrep(s, meta, r)); } });
  };
  function finishPrep(s, meta, r) {
    const rd = meta ? ped.readiness(s.code, meta) : null;
    if (meta) { const t = ped.taskState(s.code, meta); t.readiness = U.round((rd.vocab.have + rd.chunks.have) / Math.max(1, rd.vocab.total + rd.chunks.total), 3); }
    LOS.store.save();
    s.finish({ score: 0.8, headline: rd && rd.ready ? 'You are ready for the task' : 'Language prepared', summary: [`${r.taught} items taught and practised`, rd ? `Readiness: vocabulary ${rd.vocab.have}/${rd.vocab.total}, chunks ${rd.chunks.have}/${rd.chunks.total}, grammar ${Math.round(rd.grammar.pct * 100)}%` : '', rd && !rd.ready ? 'A little more practice on the coming days unlocks the task — the items are now in your review queue.' : ''].filter(Boolean) });
  }

  /* ====================================================================
   * Error-based teaching: explain → controlled → contextual → review later
   * ==================================================================== */
  R.remedy = function (s) {
    const cand = s.item.payload.key ? { key: s.item.payload.key, topic: s.item.payload.topic, label: s.item.payload.label, errors: s.lang.errors.filter((e) => (e.topic || e.label) === s.item.payload.key) } : ped.remedyCandidate(s.code);
    if (!cand) { s.render(ui.empty({ icon: 'checkCircle', title: 'No recurring errors', text: 'Nothing to remediate right now.', action: '<button class="btn primary" data-act="fin">Finish</button>' })); s.on({ fin() { s.finish({ minutes: 1, headline: 'All clear' }); } }); return; }
    const t = cand.topic && s.pack.index.grammar[cand.topic];
    const errs = cand.errors.filter((e) => e.wrong && e.right).slice(0, 3);
    const steps = [];
    if (t) U.shuffle(t.x.filter((x) => x.t === 'gap' || x.t === 'fix' || x.t === 'mc')).slice(0, 3).forEach((x) => steps.push({ kind: x.t === 'mc' ? 'gram' : 'fix', ex: x, topic: t.id, title: 'Controlled practice' }));
    errs.forEach((e) => steps.push({ kind: 'fix', ex: { t: 'fix', q: e.wrong, a: [e.right], w: e.note || '', d: 1 }, errorId: e.id, title: 'Your own sentence' }));
    steps.push({ kind: 'free', micro: 'respond', title: 'Use it in context', prompt: t ? (t.use || 'Write one sentence using this structure correctly.') : `Write one sentence using “${errs[0] ? errs[0].right : cand.label}” correctly in a new context.`, sentences: 1, model: t ? t.ex[0] : errs[0] ? errs[0].right : '' });
    let i = -1, ok = 0, n = 0;
    const persisted = (s.lang.remedied[cand.key] || {}).times > 0;
    const player = makePlayer(s, { redraw: draw, next, onResult(ex, r) { n++; if (r.correct) ok++; } });
    function draw() {
      if (i < 0) {
        s.render(`<div class="stage-label">Error clinic · ${esc(cand.label || '')}</div><h2>${persisted ? 'This error is still coming back' : 'A recurring error'}</h2>
          <p class="muted mt-8">You made this mistake ${cand.errors.reduce((a, e) => a + (e.count || 1), 0)} times recently. First the explanation, then controlled practice, then a sentence of your own. It will be reviewed again later to check that it does not return.</p>
          ${errs.map((e) => `<div class="err mt-8"><div><div class="w">${esc(e.wrong)}</div><div class="r">${esc(e.right)}</div>${e.note ? `<div class="faint small mt-4">${esc(e.note)}</div>` : ''}</div></div>`).join('')}
          ${t ? `<div class="card soft mt-16 lesson small"><strong>${esc(t.title)}</strong><ul>${t.explain.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${t.ex.slice(0, 2).map((x) => `<div class="example">${esc(x)}</div>`).join('')}</div>` : ''}
          <div class="runner-foot"><span></span><button class="btn primary" data-act="go" data-enter autofocus>Practise ${icon('arrowRight', 16)}</button></div>`);
        return;
      }
      s.progress((i + 1) / (steps.length + 1));
      s.render(`<div class="faint small">${esc(steps[i].title)} · ${i + 1} of ${steps.length}</div><div class="mt-16"></div>` + player.html());
    }
    function next() {
      i++;
      if (i >= steps.length) {
        ped.markRemedied(s.code, cand.key, persisted);
        errs.forEach((e) => { const c = s.lang.errorCards[e.id]; if (c) c.due = U.addDays(U.today(), 3); });
        const acc = n ? ok / n : 1;
        return s.finish({ score: acc, headline: 'Error clinic done', summary: [`${Math.round(acc * 100)}% correct`, 'Your error cards come back in 3 days; if the error stops appearing in your writing and speaking, it is marked as resolved.'] });
      }
      player.show(steps[i]); draw();
    }
    s.on(Object.assign({}, player.handlers, { go() { next(); } }));
    draw();
  };

  /* ====================================================================
   * Gates: readiness + production ladder for writing / speaking, path for scenarios
   * ==================================================================== */
  function gateMeta(s, kind, pl) {
    if (kind === 'scenario') { const m = s.pack.index.modules[pl.moduleId]; const sc = m && (m.scen || [])[pl.idx || 0]; return m && sc ? { m, task: sc, meta: ped.taskMeta(s.code, 'scenario', sc, m) } : {}; }
    const list = kind === 'writing' ? s.pack.writing : s.pack.speaking;
    const task = list.find((x) => x.id === (kind === 'writing' ? pl.promptId : pl.taskId));
    return task ? { task, meta: ped.taskMeta(s.code, kind, task) } : {};
  }
  function notReadyScreen(s, meta, rd, onLearn, alt) {
    s.render(`<div class="stage-label">Prerequisite check</div><h2>You are not quite ready for this task yet.</h2>
      <p class="lead mt-8">Let's learn the language you need first — it takes a few minutes, and then the task becomes doable instead of frustrating.</p>
      <div class="mt-16">${readinessHTML(s, meta, rd)}</div>
      ${rd.grammar.missing.length && rd.grammar.pct < 0.7 ? `<p class="small muted mt-12">Grammar to consolidate: ${rd.grammar.missing.map((id) => `<a href="#/grammar/${esc(id)}">${esc(s.pack.index.grammar[id].title)}</a>`).join(', ')}</p>` : ''}
      <div class="runner-foot">${alt || '<span></span>'}<button class="btn primary" data-act="learnFirst" data-enter autofocus>Learn the language first ${icon('arrowRight', 16)}</button></div>`);
    const ids = rd.vocab.missing.concat(rd.chunks.missing);
    if (!ids.length && rd.grammar.missing.length) {
      // only grammar is missing: teach the first missing topic (lesson first, then practice)
      const b = s.body.querySelector('[data-act="learnFirst"]');
      if (b) b.outerHTML = `<a class="btn primary" href="#/practice/grammar/${esc(rd.grammar.missing[0])}/learn">Learn the grammar first ${icon('arrowRight', 16)}</a>`;
      return;
    }
    s.on({ learnFirst() { prepLesson(s, ids, { title: 'The language you need' }, (r) => finishPrep(s, meta, r)); } });
  }
  function wrapProduction(kind, original) {
    return function (s) {
      const pl = s.item.payload;
      if ((kind === 'writing' && (!pl.promptId || pl.promptId === 'free')) || pl.ready) return original(s);
      const g = gateMeta(s, kind, pl);
      if (!g.meta) return original(s);
      const rd = ped.readiness(s.code, g.meta);
      const t = ped.taskState(s.code, g.meta);
      t.readiness = U.round((rd.vocab.have + rd.chunks.have) / Math.max(1, rd.vocab.total + rd.chunks.total), 3);
      const sc = ped.scaleTask(s.code, kind, g.task);
      if (pl.challenge) sc.scaled = false; // optional challenge = the full task
      const run = () => {
        if (sc.scaled) s.item.payload.task = kind === 'writing' ? { words: sc.task.words } : { secs: sc.task.secs };
        const fin = s.finish;
        s.finish = (r = {}) => {
          const last = kind === 'writing' ? s.lang.writings[0] : s.lang.speakings[0];
          const used = last ? ped.detectUse(s.code, last.text || last.transcript || '') : [];
          const lad = ped.recordProduction(s.code, kind, r.score == null ? 0.6 : r.score, sc.scaled);
          t.attempts = (t.attempts || 0) + 1; t.lastAt = U.today(); t.best = Math.max(t.best || 0, r.score || 0); t.step = 3;
          r.summary = (r.summary || []).concat([used.length ? `Used spontaneously: ${used.slice(0, 6).join(', ')}` : '', lad.moved > 0 ? `Production ladder: step ${lad.step} of 6 unlocked (${ped.LADDER[kind][lad.step].label})` : `Production ladder: step ${lad.step} of 6 (${ped.LADDER[kind][lad.step].label})`].filter(Boolean));
          fin(r);
        };
        original(s);
      };
      if (!rd.ready && !pl.force) {
        notReadyScreen(s, g.meta, rd, null, pl.challenge ? '<button class="btn ghost" data-act="tryAnyway">Try it anyway (challenge)</button>' : null);
        return s.on({ tryAnyway() { run(); } });
      }
      if (!sc.scaled) return run();
      s.render(`<div class="stage-label">Production ladder · step ${sc.step} of 6</div><h2>${esc(g.task.title)}</h2>
        <p class="lead mt-8">Today's version: <strong>${esc(sc.rung.label)}</strong>. The full task (${esc(g.meta.outputLength.label)}) comes at the end of the sequence, once shorter versions go well.</p>
        <div class="mt-16">${readinessHTML(s, g.meta, rd)}</div>
        <div class="runner-foot"><button class="btn ghost" data-act="fullTask">Try the full task (challenge)</button><button class="btn primary" data-act="shortTask" data-enter autofocus>Start the short version ${icon('arrowRight', 16)}</button></div>`);
      s.on({ shortTask() { run(); }, fullTask() { sc.scaled = false; delete s.item.payload.task; run(); } });
    };
  }
  R.writing = wrapProduction('writing', R.writing);
  R.speaking = wrapProduction('speaking', R.speaking);

  /* Scenario path: language → controlled → guided → free (complex scenarios are the END of the sequence). */
  const SCEN_STEPS = ['Learn the language', 'Controlled version', 'Guided version', 'Free scenario'];
  const freeScenario = R.scenario;
  R.scenario = function (s) {
    const pl = s.item.payload;
    const g = gateMeta(s, 'scenario', pl);
    if (!g.meta) return freeScenario(s);
    const { m, task: sc, meta } = g;
    const t = ped.taskState(s.code, meta);
    let rd = ped.readiness(s.code, meta);
    t.readiness = U.round((rd.vocab.have + rd.chunks.have) / Math.max(1, rd.vocab.total + rd.chunks.total), 3);
    if (t.step === 0 && rd.ready) t.step = 1;
    const want = pl.step != null ? pl.step : t.step;
    const step = rd.ready ? Math.min(want, t.step) : 0;
    const path = `<div class="steps-line">${SCEN_STEPS.map((x, k) => `<span class="${k === step ? 'on' : k < t.step ? 'done' : ''}">${k + 1}. ${esc(x)}</span>`).join('')}</div>`;
    if (step === 0) {
      const ids = rd.vocab.missing.concat(rd.chunks.missing);
      s.render(`<div class="stage-label">${esc(m.title)} · step 1 of 4</div>${path}<h2 class="mt-16">${rd.ready ? 'Review the language of this scenario' : 'First, the language this scenario needs'}</h2>
        <p class="muted mt-8">${esc(m.intro || '')}</p><div class="mt-16">${readinessHTML(s, meta, rd)}</div>
        <div class="runner-foot"><span class="faint xs">${s.lang.goals.includes('medical') ? 'Language & communication practice — not clinical guidance.' : ''}</span><button class="btn primary" data-act="learn" data-enter autofocus>Learn ${ids.length} items ${icon('arrowRight', 16)}</button></div>`);
      if (!ids.length && !rd.grammarOk && rd.grammar.missing.length) {
        const b = s.body.querySelector('[data-act="learn"]');
        if (b) b.outerHTML = `<a class="btn primary" href="#/practice/grammar/${esc(rd.grammar.missing[0])}/learn">Vocabulary ready — now the grammar: ${esc(s.pack.index.grammar[rd.grammar.missing[0]].title)} ${icon('arrowRight', 16)}</a>`;
        return;
      }
      s.on({ learn() { prepLesson(s, ids.length ? ids : meta.requiredChunks.slice(0, 6), { title: m.title + ' · language' }, (r) => { rd = ped.readiness(s.code, meta); if (rd.ready) t.step = Math.max(t.step, 1); finishPrep(s, meta, r); }); } });
      return;
    }
    if (step === 3) {
      const fin = s.finish;
      s.finish = (r = {}) => { t.attempts = (t.attempts || 0) + 1; t.best = Math.max(t.best || 0, r.score || 0); t.lastAt = U.today(); const last = s.lang.speakings[0] || s.lang.writings[0]; if (last) ped.detectUse(s.code, last.transcript || last.text || ''); fin(r); };
      return freeScenario(s);
    }
    // step 1: controlled — the model text with the key phrases removed; step 2: guided — situation + word bank
    const model = sc.model || '';
    const req = meta.requiredChunks.map((id) => LOS.learn.vocabItem(s.code, id)).filter(Boolean);
    if (step === 1) {
      const sents = U.sentences(model).slice(0, 6);
      const items = [];
      sents.forEach((sent) => { const v = req.find((x) => U.norm(sent).includes(U.norm(x.w)) && !items.some((y) => y.v === x)); if (v) { const k = sent.toLowerCase().indexOf(v.w.toLowerCase()); items.push({ kind: 'cloze', id: null, v: null, micro: 'controlled', before: sent.slice(0, k), after: sent.slice(k + v.w.length), answers: [v.w], hint: v.w.charAt(0) + ' …', bank: U.shuffle(req.map((x) => x.w)).slice(0, 4).concat(v.w).filter((x, j, a) => a.indexOf(x) === j), hintLevel: 2, expectedMs: 20000, title: 'Controlled version', why: '' }); } });
      if (items.length < 2) { t.step = 2; return R.scenario(s); }
      let i = 0, ok = 0;
      const player = makePlayer(s, { redraw: draw, next, onResult(ex, r) { if (r.correct) ok++; } });
      function draw() { s.progress(0.2 + (i / items.length) * 0.6); s.render(`<div class="stage-label">${esc(m.title)} · step 2 of 4</div>${path}<p class="faint small mt-12">Fill in the missing phrases of a model ${sc.mode === 'write' ? 'text' : 'answer'} (${i + 1}/${items.length}).</p>` + player.html()); }
      function next() { i++; if (i >= items.length) { const acc = ok / items.length; if (acc >= 0.7) t.step = Math.max(t.step, 2); return s.finish({ score: acc, headline: acc >= 0.7 ? 'Controlled version done — guided version unlocked' : 'Controlled version — repeat it next time', summary: [`${ok}/${items.length} phrases correct`, `Next: ${SCEN_STEPS[Math.min(3, t.step)]}`] }); } player.show(items[i]); draw(); }
      s.on(player.handlers);
      player.show(items[0]); draw();
      return;
    }
    // step 2: guided — the situation, the phrases to use, a short answer (production ladder)
    const kind = sc.mode === 'write' ? 'writing' : 'speaking';
    const stepN = ped.prodStep(s.code, kind);
    const rung = ped.LADDER[kind][Math.min(stepN, 4)];
    let text = '', res = null;
    function drawG() {
      s.render(`<div class="stage-label">${esc(m.title)} · step 3 of 4</div>${path}
        <div class="prompt sm mt-16">${esc(sc.p)}</div>
        <p class="faint small">Guided version: ${esc(kind === 'writing' ? rung.label : '3–5 sentences')}. Use these phrases:</p>
        <div class="cluster mt-8">${req.slice(0, 8).map((v) => `<span class="pill ${res && ped.usesItem(s.code, v, text) ? 'ok' : 'outline'}">${esc(v.w)}</span>`).join('')}</div>
        <textarea class="textarea mt-16" id="gtxt" rows="5" ${res ? 'readonly' : 'autofocus'}>${esc(text)}</textarea>
        ${res ? `<div class="card flat mt-12">${H.correctionsHTML(res.a, 4)}</div><details class="mt-12"><summary class="btn ghost sm">Model answer</summary><div class="example mt-8" style="white-space:pre-wrap">${esc(model)}</div></details>` : ''}
        <div class="runner-foot"><span class="faint xs">${kind === 'speaking' ? 'Say it aloud first, then write what you said.' : ''}</span>${res ? `<button class="btn primary" data-act="gdone" data-enter>Finish ${icon('check', 16)}</button>` : `<button class="btn primary" data-act="gcheck">Check</button>`}</div>`);
    }
    s.on({
      gcheck() {
        text = s.body.querySelector('#gtxt').value; if (U.words(text).length < 6) { ui.toast('Write a few sentences first', 'info'); return; }
        const a = LOS.writing.analyze(s.code, text, { level: m.l, reg: 'formal', keys: sc.keys });
        const used = req.filter((v) => ped.usesItem(s.code, v, text)).length;
        res = { a, used, score: U.clamp((used / Math.max(1, Math.min(req.length, 5))) * 0.6 + (a.errors.length === 0 ? 0.4 : a.errors.length <= 2 ? 0.2 : 0), 0, 1) };
        H.logAnalysisErrors(s.code, a, 'scenario'); ped.detectUse(s.code, text);
        drawG();
      },
      gdone() {
        if (res.score >= 0.7) t.step = Math.max(t.step, 3);
        t.attempts = (t.attempts || 0) + 1; t.lastAt = U.today();
        s.finish({ score: res.score, headline: res.score >= 0.7 ? 'Guided version done — free scenario unlocked' : 'Guided version — once more next time', summary: [`${res.used} required phrases used`, res.a.errors.length ? `${res.a.errors.length} errors noted in your error log` : 'No rule-based errors', `Next: ${SCEN_STEPS[Math.min(3, t.step)]}`] });
      },
    });
    drawG();
  };
})();

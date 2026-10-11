/* RUNNERS — input & speaking practice:
 *   dictation    listen → write → word-by-word diff (errors go to the error bank)
 *   shadow       model audio → record yourself → play both back to back (+ optional recognition transcript)
 *   pairs        minimal pairs: listen-and-choose, then record-and-compare
 *   audioReview  hands-free review for the commute: the app speaks, you answer aloud
 *   convo        real-conversation prep (3 minutes) and "what was missing" afterwards
 *   recal        optional monthly mini-placement
 * plus the sentence-mining card used in every text view. */
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
   * SENTENCE MINING CARD
   * ==================================================================== */
  function sentenceOf(text, w) {
    const ss = U.sentences(text || '');
    return ss.find((s) => (' ' + U.norm(s) + ' ').includes(' ' + U.norm(w) + ' ')) || ss.find((s) => U.norm(s).includes(U.norm(w))) || '';
  }
  /** Opens the card; resolves true when the learner added something to their learning. */
  function mineCard(code, word, sentence, src) {
    return new Promise((resolve) => {
      const w = String(word || '').replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '');
      if (!w) return resolve(false);
      const f = LOS.input.lookup(code, w, sentence);
      const cand = f.chunk || f.item;
      const chunkLine = f.chunk ? `<div class="card soft mt-12"><div class="eyebrow">Learn it as a chunk</div><div class="strong mt-4">${esc(f.chunk.w)}</div>${f.chunk.tr || f.chunk.def ? `<div class="small muted">${esc(f.chunk.tr || f.chunk.def)}</div>` : ''}</div>` : '';
      const itemLine = f.item && f.item !== f.chunk ? `<div class="mt-12"><strong>${esc(f.item.w)}</strong>${f.item.tr ? ` — ${esc(f.item.tr)}` : ''}${f.item.def ? `<div class="small muted">${esc(f.item.def)}</div>` : ''}</div>` : '';
      const already = cand && (LOS.store.lang(code).vocab[cand.id] || LOS.input.isMined(code, cand.id));
      let done = false;
      ui.modal({
        title: '', label: w, body: `<div class="mine-card"><div class="between"><h3>${esc(w)}</h3>${ui.speakBtn(w, code)}</div>
          ${sentence ? `<div class="ctx mt-8">“${esc(sentence)}”</div>` : ''}
          ${chunkLine}${itemLine}
          ${cand ? '' : `<div class="field mt-12"><label for="mine-m">Meaning (Italian or a short definition)</label><input class="input" id="mine-m" placeholder="${LOS.AI.active() ? 'or ask your AI tutor' : ''}"></div>`}
          ${!cand && LOS.AI.active() ? '<button class="btn sm mt-8" data-ask>Ask the AI tutor</button><div class="small mt-4" data-ai></div>' : ''}
          ${already ? '<p class="faint small mt-12">Already in your learning.</p>' : ''}</div>`,
        foot: `<button class="btn" data-close>Close</button><button class="btn primary" data-add ${already ? 'disabled' : ''}>${icon('plus', 15)} Add to my learning</button>`,
        onMount(m, close) {
          const ask = m.querySelector('[data-ask]');
          if (ask) ask.addEventListener('click', async () => {
            const out = m.querySelector('[data-ai]'); out.textContent = '…';
            const r = await LOS.AI.explain(code, { question: `the meaning of "${w}" in: ${sentence}` });
            out.textContent = r.text || 'No answer — type the meaning yourself.';
            const inp = m.querySelector('#mine-m'); if (inp && r.text && !inp.value) inp.value = String(r.text).slice(0, 120);
          });
          m.querySelector('[data-close]').addEventListener('click', () => { close(); resolve(done); });
          m.querySelector('[data-add]').addEventListener('click', () => {
            const meaning = (m.querySelector('#mine-m') || {}).value || '';
            try { LOS.input.mine(code, { w, sentence, meaning, itemId: cand ? cand.id : null, src: src || 'mining' }); done = true; LOS.store.save(); ui.toast('Added — it comes in your next new-language step'); } catch (e) { ui.toast('Could not add this word', 'errors'); }
            close(); resolve(done);
          });
        },
      });
    });
  }
  LOS.run.mineCard = mineCard;
  LOS.run.sentenceOf = sentenceOf;
  function covPill(code, text) { const c = LOS.input.coverage(code, text); return `<span class="cov ${c.band}" title="${esc(LOS.input.label(c))}">${Math.round(c.pct * 100)}% known · ${esc(LOS.input.BAND_TEXT[c.band].split(' — ')[0])}</span>`; }
  H.covPill = covPill;

  /* ====================================================================
   * DICTATION
   * ==================================================================== */
  R.dictation = function (s) {
    if (!LOS.speech.ttsSupported) return s.fail('Dictation needs speech synthesis, which this browser does not provide.');
    const pl = s.item.payload;
    const list = LOS.dictation.pick(s.code, pl.count || 5, { paragraph: !!pl.paragraph, rnd: U.rng(s.item.id) });
    if (!list.length) { s.render(ui.empty({ icon: 'listening', title: 'Learn a few words first', text: 'Dictation uses only sentences you have already met. Start with new words, then come back.', action: '<a class="btn primary" href="#/practice/vocab/new">New words</a>' })); return; }
    const items = pl.paragraph ? [{ kind: 'dictation', micro: 'dictation', text: list.map((x) => x.text).join(' ') }] : list.map((x) => ({ kind: 'dictation', micro: 'dictation', text: x.text, id: null }));
    let i = 0, sum = 0;
    const player = LOS.run.makePlayer(s, { redraw: draw, next, onResult(ex, r) { sum += r.diff ? r.diff.score : 0; } });
    function draw() { s.progress(i / items.length); s.render(`<div class="between"><span class="faint small">Dictation · ${i + 1} of ${items.length}</span><span class="pill outline">ear + spelling</span></div><div class="mt-16"></div>` + player.html()); }
    function next() { i++; if (i >= items.length) return s.finish({ score: sum / items.length, headline: 'Dictation done', summary: [`Accuracy: ${Math.round((sum / items.length) * 100)}%`, 'Missed words, endings, accents and capital letters go to your error bank and come back in reviews.'] }); player.show(items[i]); draw(); setTimeout(() => LOS.speech.speak(items[i].text, s.code, { rate: 0.9 }), 250); }
    s.on(player.handlers);
    player.show(items[0]); draw();
    setTimeout(() => LOS.speech.speak(items[0].text, s.code, { rate: 0.9 }), 400);
  };

  /* ====================================================================
   * SHADOWING WITH RECORDING COMPARISON
   * ==================================================================== */
  function shadowMaterial(code, n, rnd) {
    const lang = LOS.store.lang(code), p = LOS.lang.get(code);
    const out = [];
    Object.keys(lang.vocab).filter((id) => ped.vstage(lang.vocab[id]) >= 1 && ped.vstage(lang.vocab[id]) <= 5).forEach((id) => { const v = LOS.learn.vocabItem(code, id); if (v && v.ex && U.words(v.ex).length <= 14) out.push(v.ex); });
    p.texts.filter((t) => t.kind === 'dialogue').forEach((t) => t.text.split(/\s+—\s+/).forEach((x) => { if (U.words(x).length >= 4 && U.words(x).length <= 14) out.push(x.trim()); }));
    (p.abroad || []).concat(p.medical).forEach((m) => (m.scen || []).forEach((sc) => sc.model && U.sentences(sc.model).forEach((x) => { if (U.words(x).length >= 4 && U.words(x).length <= 14) out.push(x); })));
    const uniq = [...new Set(out)];
    const ranked = uniq.map((x) => ({ x, c: LOS.input.coverage(code, x).pct + rnd() * 0.15 })).sort((a, b) => b.c - a.c);
    return ranked.slice(0, Math.max(n * 3, 12)).sort(() => rnd() - 0.5).slice(0, n).map((r) => r.x);
  }
  R.shadow = function (s) {
    if (!LOS.speech.ttsSupported) return s.fail('Shadowing needs speech synthesis, which this browser does not provide.');
    const list = s.item.payload.texts || shadowMaterial(s.code, s.item.payload.count || 5, U.rng(s.item.id));
    if (!list.length) return s.fail('No sentences available yet — learn a few items first.');
    let i = 0, rate = 0.85, mine = null, transcript = '', rec = null, sr = null, reps = 0, total = 0, recording = false;
    function draw() {
      s.progress(i / list.length);
      const txt = list[i];
      const d = transcript ? LOS.dictation.diff(s.code, txt, transcript) : null;
      s.render(`<div class="between"><span class="faint small">Shadowing · ${i + 1} of ${list.length}</span><span class="pill outline">listen · repeat · compare</span></div>
        <div class="prompt sm mt-16">${esc(txt)}</div>
        <div class="cluster mt-12">${[[0.7, 'Slow'], [0.85, 'Medium'], [1, 'Natural']].map(([r, l]) => `<button class="chip ${rate === r ? 'active' : ''}" data-act="rate" data-v="${r}">${l}</button>`).join('')}</div>
        <div class="big-actions">
          <button class="btn" data-act="model">${icon('volume', 18)} Play model</button>
          ${LOS.speech.recSupported ? `<button class="btn ${recording ? 'danger' : 'primary'}" data-act="rec">${icon(recording ? 'stop' : 'speaking', 18)} ${recording ? 'Stop' : 'Record yourself'}</button>` : '<span class="muted small">Recording is not available in this browser — repeat aloud after the model.</span>'}
        </div>
        ${mine ? `<div class="card soft mt-16"><div class="eyebrow">Compare</div><div class="cluster mt-8"><button class="btn sm" data-act="model">${icon('volume', 14)} Model</button><button class="btn sm" data-act="playMine">${icon('play', 14)} You</button><button class="btn sm" data-act="both">${icon('swap', 14)} Model, then you</button></div>
          ${d ? `<div class="small mt-12"><span class="faint">Speech recognition heard (rough indicator, not a pronunciation score):</span><div class="diff mt-4">${H.diffHTML(d)}</div></div>` : ''}</div>` : ''}
        <div class="runner-foot"><span class="faint xs">${reps} repetition${reps === 1 ? '' : 's'} of this sentence</span><div class="cluster"><button class="btn" data-act="again">Again</button><button class="btn primary" data-act="next" data-enter>Next ${icon('arrowRight', 15)}</button></div></div>`);
    }
    function playMine(after) { if (!mine) return; const a = new Audio(mine); if (after) a.onended = after; a.play().catch(() => {}); }
    s.on({
      rate(el) { rate = +el.dataset.v; draw(); },
      model() { LOS.speech.speak(list[i], s.code, { rate }); },
      async rec() {
        if (recording) {
          recording = false;
          const r = rec ? await rec.stop() : null; rec = null;
          if (sr) { transcript = sr.text; sr.stop(); sr = null; }
          if (r && r.url) { mine = r.url; reps++; total++; }
          draw();
          return;
        }
        try { rec = await LOS.speech.record(); } catch (e) { ui.toast('Microphone not available', 'errors'); return; }
        transcript = '';
        if (LOS.speech.srSupported) sr = LOS.speech.recognize(s.code, { onResult: (f) => { transcript = f; } });
        recording = true; draw();
        s.disposers.push(() => { try { if (rec) rec.stop(); if (sr) sr.stop(); } catch (e) { /* ignore */ } });
      },
      playMine() { playMine(); },
      both() { LOS.speech.speak(list[i], s.code, { rate, onend: () => playMine() }); },
      again() { mine = null; transcript = ''; draw(); LOS.speech.speak(list[i], s.code, { rate }); },
      next() {
        if (!reps && !mine) total++;
        i++; mine = null; transcript = ''; reps = 0;
        if (i >= list.length) { LOS.skills.update(s.lang, 'speaking', LOS.learn.targetLevelIdx(s.code, 'speaking'), 0.75, 0.01); return s.finish({ score: 0.8, headline: 'Shadowing done', summary: [`${list.length} sentences · ${total} recordings`, 'Shadowing trains rhythm, stress and fluency. Compare yourself with the model, not with a score.'] }); }
        draw(); LOS.speech.speak(list[i], s.code, { rate });
      },
    });
    draw();
    setTimeout(() => LOS.speech.speak(list[0], s.code, { rate }), 400);
  };

  /* ====================================================================
   * MINIMAL PAIRS
   * ==================================================================== */
  R.pairs = function (s) {
    if (!LOS.speech.ttsSupported) return s.fail('Minimal pairs need speech synthesis, which this browser does not provide.');
    const sets = (LOS.MINIMAL_PAIRS || {})[s.code] || [];
    const lang = s.lang;
    lang.pairs = lang.pairs || {};
    const set = sets.find((x) => x.id === s.item.payload.set) || sets.slice().sort((a, b) => ((lang.pairs[a.id] || {}).acc || 0) - ((lang.pairs[b.id] || {}).acc || 0))[0];
    if (!set) return s.fail('No minimal pairs for this language.');
    const rnd = U.rng(s.item.id + Date.now());
    const trials = [];
    for (let k = 0; k < 10; k++) { const p = set.pairs[k % set.pairs.length]; const which = rnd() < 0.5 ? 0 : 1; trials.push({ p, which }); }
    let i = -1, ok = 0, res = null, rec = null, mine = null, recording = false;
    const rc = set.pairs.slice(0, 2);
    let phase = 'intro', ri = 0;
    function say() { const t = trials[i]; LOS.speech.speak(t.p[t.which], s.code, { rate: 0.85 }); }
    function draw() {
      if (phase === 'intro') {
        s.render(`<div class="stage-label">Pronunciation · ${esc(set.contrast)}</div><h2>${esc(set.pairs[0][0])} / ${esc(set.pairs[0][1])}</h2><p class="lead mt-8">${esc(set.note)}</p>
          <div class="cluster mt-12">${set.pairs.map((p) => `<span class="pill outline">${esc(p[0])} · ${esc(p[1])}</span>`).join('')}</div>
          <p class="faint small mt-12">First you hear one word and choose which one it was (10 times), then you record yourself and compare with the model. The app cannot score pronunciation sound by sound — your ear is the judge.</p>
          <div class="runner-foot"><span></span><button class="btn primary" data-act="start" data-enter autofocus>Start ${icon('arrowRight', 16)}</button></div>`);
      } else if (phase === 'listen') {
        const t = trials[i];
        s.progress(i / (trials.length + rc.length));
        s.render(`<div class="between"><span class="faint small">Listen and choose · ${i + 1} of ${trials.length}</span><button class="btn ghost sm" data-act="replay">${icon('volume', 14)} Again</button></div>
          <div class="big-actions">${t.p.map((w, k) => `<button class="btn ${res ? (k === t.which ? 'primary' : res.k === k ? 'danger' : '') : ''}" data-act="pick" data-v="${k}" ${res ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>
          ${res ? `<div class="feedback ${res.ok ? 'ok' : 'bad'} mt-16">${icon(res.ok ? 'checkCircle' : 'errors', 18)}<div class="body"><strong>${res.ok ? 'Correct' : 'Not this time'}</strong> — it was “${esc(t.p[t.which])}”.</div></div>${H.nextBtn()}` : ''}`);
      } else if (phase === 'record') {
        const p = rc[ri];
        s.progress((trials.length + ri) / (trials.length + rc.length));
        s.render(`<div class="stage-label">Record and compare · ${ri + 1} of ${rc.length}</div><h2>${esc(p[0])} · ${esc(p[1])}</h2>
          <div class="big-actions"><button class="btn" data-act="modelPair">${icon('volume', 18)} Model</button>${LOS.speech.recSupported ? `<button class="btn ${recording ? 'danger' : 'primary'}" data-act="recPair">${icon(recording ? 'stop' : 'speaking', 18)} ${recording ? 'Stop' : 'Record both words'}</button>` : '<span class="muted small">Recording is not available in this browser: say both words aloud after the model.</span>'}</div>
          ${mine ? `<div class="cluster mt-12"><button class="btn sm" data-act="mine">${icon('play', 14)} Play my recording</button></div>` : ''}
          <div class="runner-foot"><span></span><button class="btn primary" data-act="nextPair" data-enter>${ri + 1 < rc.length ? 'Next pair' : 'Finish'} ${icon('arrowRight', 15)}</button></div>`);
      }
    }
    s.on({
      start() { phase = 'listen'; i = 0; draw(); setTimeout(say, 250); },
      replay() { say(); },
      pick(el) { if (res) return; const k = +el.dataset.v; res = { k, ok: k === trials[i].which }; if (res.ok) ok++; draw(); },
      next() { res = null; i++; if (i >= trials.length) { phase = 'record'; ri = 0; draw(); return; } draw(); setTimeout(say, 200); },
      modelPair() { LOS.speech.speak(rc[ri].join(' … '), s.code, { rate: 0.8 }); },
      async recPair() {
        if (recording) { recording = false; const r = rec ? await rec.stop() : null; rec = null; if (r && r.url) mine = r.url; draw(); return; }
        try { rec = await LOS.speech.record(); } catch (e) { ui.toast('Microphone not available', 'errors'); return; }
        recording = true; draw();
      },
      mine() { if (mine) new Audio(mine).play().catch(() => {}); },
      nextPair() {
        ri++; mine = null;
        if (ri >= rc.length) {
          const acc = ok / trials.length;
          lang.pairs[set.id] = { acc: U.round(acc, 2), date: U.today() };
          if (acc < 0.7) LOS.learn.recordError(s.code, { src: 'pronunciation', cat: 'pronunciation', label: `Sound contrast ${set.contrast}`, wrong: '', right: set.pairs.map((p) => p.join('/')).join(', '), note: set.note });
          return s.finish({ score: acc, headline: 'Minimal pairs done', summary: [`${set.contrast}: ${ok}/${trials.length} heard correctly`, acc < 0.7 ? 'This contrast comes back in your practice until your ear catches it.' : 'Your ear distinguishes this contrast — keep shadowing to make it automatic in speech.'] });
        }
        draw();
      },
    });
    draw();
  };

  /* ====================================================================
   * HANDS-FREE AUDIO REVIEW
   * ==================================================================== */
  R.audioReview = function (s) {
    const cap = s.item.payload.cap || 12;
    const rs = LOS.queue.reviewSet(s.code, cap, { handsFree: true });
    // a prompt must never contain the answer: translation, definition, or the example with the item blanked out
    const gapped = (v) => { if (!v.ex) return ''; const re = new RegExp(v.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); return re.test(v.ex) ? v.ex.replace(re, '…') : ''; };
    const ids = rs.vocab.filter((id) => { const v = LOS.learn.vocabItem(s.code, id); return v && (v.tr || v.def || gapped(v)); });
    if (!ids.length) { s.render(ui.empty({ icon: 'checkCircle', title: 'Nothing to review', text: 'Your review queue is empty right now.', action: '<button class="btn primary" data-act="fin" data-enter>Finish</button>' })); s.on({ fin() { s.finish({ minutes: 1, headline: 'All caught up' }); } }); return; }
    const sr = LOS.speech.srSupported, tts = LOS.speech.ttsSupported;
    let i = -1, phase = 'intro', heard = '', result = null, recog = null, timer = null, ok = 0, n = 0, paused = false;
    function prompt(v) {
      if (v.tr) return { say: v.tr, sayCode: 'it', show: v.tr, kind: 'translation' };
      if (v.def) return { say: v.def, sayCode: s.code, show: v.def, kind: 'definition' };
      const g = gapped(v);
      return { say: g, sayCode: s.code, show: g, kind: 'complete the sentence' };
    }
    function item() { return LOS.learn.vocabItem(s.code, ids[i]); }
    function stopRec() { if (timer) { clearTimeout(timer); timer = null; } if (recog) { try { recog.stop(); } catch (e) { /* ignore */ } recog = null; } }
    s.disposers.push(stopRec);
    function grade(correct, close) {
      result = { correct, close };
      n++; if (correct) ok++;
      ped.recordVocab(s.code, ids[i], correct ? (close ? 'hesitant' : 'easy') : 'wrong', Math.max(2, ped.vstage(s.lang.vocab[ids[i]])), { kind: 'type-tr', given: heard });
      LOS.store.save();
      draw();
      const cur = i;
      const advance = () => { if (!paused && phase === 'run' && i === cur) nextItem(); };
      if (tts) { LOS.speech.speak(item().w, s.code, { onend: () => setTimeout(advance, 900) }); setTimeout(advance, 4500); }
      else setTimeout(advance, 1500);
    }
    function listen() {
      if (!sr) { draw(); return; }
      heard = '';
      recog = LOS.speech.recognize(s.code, { onResult: (f, int) => { heard = (f + ' ' + (int || '')).trim(); const el = s.body.querySelector('[data-heard]'); if (el) el.textContent = heard || '…'; if (f) { stopRec(); const m = LOS.spoken.match(s.code, item().w, f); grade(m.correct, m.close); } } });
      timer = setTimeout(() => { stopRec(); if (!result) { const m = LOS.spoken.match(s.code, item().w, heard); grade(m.correct, m.close); } }, 7000);
    }
    function ask() {
      result = null; heard = '';
      const p = prompt(item());
      draw();
      // some browsers never fire "end" for synthesized speech: start listening after a safety delay anyway
      let started = false;
      const go = () => { if (started || paused || result) return; started = true; listen(); };
      if (tts) { LOS.speech.speak(p.say, p.sayCode, { onend: go }); setTimeout(go, Math.min(6000, 1200 + p.say.length * 70)); } else go();
    }
    function nextItem() { stopRec(); i++; if (i >= ids.length) return finish(); ask(); }
    function finish() { phase = 'done'; stopRec(); s.finish({ score: n ? ok / n : 1, headline: 'Audio review done', summary: [`${n} items · ${ok} recalled aloud`, 'Answering aloud counts as recall — the strongest kind of review.'] }); }
    function draw() {
      if (phase === 'intro') {
        s.render(`<div class="stage-label">Hands-free review</div><h2>Answer aloud</h2>
          <ul class="lesson muted mt-8"><li>The app says the meaning (in Italian) or a definition.</li><li>You say the word or chunk in ${esc(s.pack.name)}.</li><li>Then you hear the right answer and it moves on by itself.</li></ul>
          ${sr ? '<p class="faint small">Speech recognition works best in Chrome / Edge and on Android. Use headphones; you can keep the phone in your pocket.</p>' : '<p class="small">Speech recognition is not available in this browser (it works in Chrome, Edge and on Android). You will hear the prompt and the answer, and tap whether you knew it.</p>'}
          <div class="big-actions"><button class="btn primary" data-act="go" data-enter autofocus>${icon('play', 18)} Start</button></div>`);
        return;
      }
      const v = item(); const p = prompt(v);
      s.progress(i / ids.length);
      s.render(`<div class="between"><span class="faint small">${i + 1} of ${ids.length}</span><span class="pill outline">${esc(p.kind)}</span></div>
        <div class="prompt sm mt-16">${esc(p.show)}</div>
        ${result ? `<div class="feedback ${result.correct ? 'ok' : 'bad'} mt-12">${icon(result.correct ? 'checkCircle' : 'errors', 18)}<div class="body"><strong>${esc(v.w)}</strong>${heard ? `<div class="faint small">Heard: “${esc(heard)}”</div>` : ''}</div></div>` : sr ? `<div class="mt-12 muted">${icon('speaking', 16)} Listening… <span data-heard class="strong">${esc(heard || '…')}</span></div>` : `<div class="mt-12"><button class="btn" data-act="reveal">Show the answer</button></div>`}
        <div class="big-actions">
          ${!result ? `<button class="btn ${sr && !paused ? '' : 'primary'}" data-act="knew">I knew it</button><button class="btn" data-act="didnt">I didn't</button>` : ''}
          <button class="btn" data-act="pause">${paused ? 'Resume' : 'Pause'}</button><button class="btn" data-act="skip">Skip</button>
        </div>`);
    }
    s.on({
      go() { phase = 'run'; nextItem(); },
      reveal() { if (tts) LOS.speech.speak(item().w, s.code); const el = s.body.querySelector('.prompt'); if (el) el.insertAdjacentHTML('afterend', `<div class="strong mt-8">${esc(item().w)}</div>`); },
      knew() { stopRec(); grade(true, false); },
      didnt() { stopRec(); grade(false, false); },
      pause() { paused = !paused; if (paused) { stopRec(); LOS.speech.stop(); draw(); } else if (result) nextItem(); else ask(); },
      skip() { stopRec(); LOS.speech.stop(); nextItem(); },
    });
    draw();
  };

  /* ====================================================================
   * CONVERSATION PREP (before) + WHAT WAS MISSING (after)
   * ==================================================================== */
  function phrasesFor(code, topic) {
    const p = LOS.lang.get(code);
    const t = U.norm(topic);
    const words = t.split(' ').filter((w) => w.length >= 4);
    const mods = p.medical.concat(p.professional, p.abroad || []);
    const scored = mods.map((m) => ({ m, s: words.filter((w) => U.norm(m.title + ' ' + (m.intro || '')).includes(w)).length })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    const out = [];
    (scored.length ? scored.slice(0, 2).map((x) => x.m) : []).forEach((m) => m.expr.forEach((e) => out.push({ p: e.p, n: e.n || '' })));
    if (out.length < 6) LOS.ped.learnedIds(code, 1, 30).forEach((id) => { const v = LOS.learn.vocabItem(code, id); if (v && v.w.includes(' ')) out.push({ p: v.w, n: v.tr || v.def || '' }); });
    return out.slice(0, 10);
  }
  R.convo = function (s) {
    const lang = s.lang;
    const pending = lang.convoPending && U.diffDays(lang.convoPending.date, U.today()) <= 2 ? lang.convoPending : null;
    let phase = s.item.payload.after || pending ? 'after' : 'topic', topic = pending ? pending.topic : '', list = [], t0 = 0;
    const p = s.pack;
    const sugg = (p.abroad || []).concat(p.professional).slice(0, 6).map((m) => m.title.split(':')[0]);
    function draw() {
      if (phase === 'topic') {
        s.render(`<div class="stage-label">Before a real conversation</div><h2>What will you talk about?</h2>
          <p class="muted small mt-4">A 3-minute warm-up with useful phrases. Afterwards, note what was missing — it goes straight into your learning.</p>
          <input class="input mt-16" id="topic" placeholder="e.g. a call with the landlord, a ward round, a job interview" value="${esc(topic)}" autofocus>
          <div class="cluster mt-8">${sugg.map((x) => `<button class="chip" data-act="sugg" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
          <div class="runner-foot"><span></span><button class="btn primary" data-act="prep" data-enter>Warm up ${icon('arrowRight', 16)}</button></div>`);
      } else if (phase === 'prep') {
        const left = Math.max(0, 180 - Math.round((Date.now() - t0) / 1000));
        s.render(`<div class="between"><div class="stage-label">Warm-up · ${esc(topic)}</div><span class="timer-big" data-t>${ui.fmtTimer(left)}</span></div>
          <p class="muted small">Read each phrase aloud twice. Change one word to make it yours.</p>
          <div class="list mt-12">${list.map((x) => `<div class="row"><div class="grow"><div>${esc(x.p)}</div>${x.n ? `<div class="faint xs">${esc(x.n)}</div>` : ''}</div>${ui.speakBtn(x.p, s.code)}</div>`).join('') || '<p class="muted">No specific phrases found for this topic — review your recent chunks instead.</p>'}</div>
          <div class="runner-foot"><span class="faint xs">Have your conversation, then come back here (or open “Conversation prep” again within 2 days).</span><button class="btn primary" data-act="toAfter">I had the conversation ${icon('arrowRight', 16)}</button></div>`);
      } else if (phase === 'after') {
        s.render(`<div class="stage-label">After the conversation${topic ? ' · ' + esc(topic) : ''}</div><h2>What was missing?</h2>
          <p class="muted small mt-4">One word or phrase per line. Add the meaning after “=” if you know it (e.g. <span class="mono">landlord = padrone di casa</span>). One minute is enough.</p>
          <textarea class="textarea mt-12" id="missing" rows="5" autofocus></textarea>
          <div class="runner-foot"><button class="btn ghost" data-act="skipAfter">Nothing to add</button><button class="btn primary" data-act="save" data-enter>Add to my learning</button></div>`);
      }
    }
    s.on({
      sugg(el) { topic = el.dataset.v; const i = s.body.querySelector('#topic'); if (i) i.value = topic; },
      prep() { topic = (s.body.querySelector('#topic') || {}).value || topic || 'everyday conversation'; list = phrasesFor(s.code, topic); t0 = Date.now(); phase = 'prep'; lang.convoPending = { topic, date: U.today() }; LOS.store.save(); draw(); s.every(1000, () => { const el = s.body.querySelector('[data-t]'); if (el) el.textContent = ui.fmtTimer(Math.max(0, 180 - Math.round((Date.now() - t0) / 1000))); }); },
      toAfter() { phase = 'after'; draw(); },
      skipAfter() { delete lang.convoPending; LOS.exposure.mark(s.code, 'talk'); LOS.store.save(); s.finish({ score: 0.8, headline: 'Conversation done', summary: ['Real conversations are where the language becomes yours.'] }); },
      save() {
        const lines = ((s.body.querySelector('#missing') || {}).value || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20);
        let n = 0;
        lines.forEach((l) => { const [w, m] = l.split('='); if (w && w.trim()) { try { LOS.input.mine(s.code, { w: w.trim(), meaning: (m || '').trim(), sentence: '', src: 'conversation' }); n++; } catch (e) { /* skip */ } } });
        delete lang.convoPending;
        LOS.exposure.mark(s.code, 'talk');
        LOS.store.save();
        s.finish({ score: 0.85, headline: 'Conversation logged', summary: [n ? `${n} missing word${n === 1 ? '' : 's'}/phrase${n === 1 ? '' : 's'} added — they come first in your next new-language step` : 'Nothing missing — great.', 'Counted as this week\'s real conversation.'] });
      },
    });
    draw();
  };

  /* ====================================================================
   * MONTHLY RECALIBRATION
   * ==================================================================== */
  R.recal = function (s) {
    const d = LOS.recal.start(s.code);
    let cur = null, res = null, given = null, phase = 'intro';
    function draw() {
      if (phase === 'intro') {
        s.render(`<div class="stage-label">Monthly check-up (optional)</div><h2>8–10 minutes to recalibrate</h2>
          <p class="lead mt-8">12 adaptive questions on grammar, vocabulary, natural use and reading. Your skill estimates are adjusted gently (never a big jump from a short test). Nothing is blocked if you skip it.</p>
          <div class="runner-foot"><span></span><button class="btn primary" data-act="go" data-enter autofocus>Start ${icon('arrowRight', 16)}</button></div>`);
        return;
      }
      if (phase === 'done') return;
      s.progress(d.i / d.order.length);
      s.render(`<div class="between"><span class="faint small">${d.i + 1} of ${d.order.length}</span><span class="pill outline">${esc(U.cap(cur.key))}</span></div>
        ${cur.text ? `<div class="card soft mt-12 small" style="max-height:220px;overflow:auto"><strong>${esc(cur.title || '')}</strong><p class="mt-4">${esc(cur.text)}</p></div>` : ''}
        <div class="prompt sm mt-12">${esc(cur.q)}</div>
        <div class="options">${cur.o.map((o, k) => `<button class="option ${res ? (k === cur.a ? 'correct' : String(k) === given ? 'wrong' : '') : ''}" data-act="opt" data-v="${k}" data-key="${k + 1}" ${res ? 'disabled' : ''}><span class="k">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>
        ${res ? H.nextBtn() : ''}`);
    }
    function load() { cur = LOS.recal.next(d); res = null; given = null; if (!cur) return finish(); draw(); }
    function finish() {
      phase = 'done';
      const r = LOS.recal.finish(d);
      LOS.store.save();
      s.finish({ score: r.acc, headline: 'Check-up done', summary: [`${Math.round(r.acc * 100)}% correct`].concat(r.changes.map((c) => `${U.SKILL_LABEL[c.skill]}: ${c.before == null ? '—' : U.thetaInfo(c.before).sub} → ${U.thetaInfo(c.after).sub}`)) });
    }
    s.on({
      go() { phase = 'run'; load(); },
      opt(el) { if (res) return; given = el.dataset.v; res = { ok: LOS.recal.answer(d, cur, given) }; draw(); },
      next() { load(); },
    });
    draw();
  };
})();

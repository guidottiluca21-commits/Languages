/* RUNNERS — adaptive layer:
 *   sim      scenario simulator: the partner reacts and follows up (why? what if? are you sure?), then a
 *            7-dimension performance report; the weakest dimensions go back into the learning queue
 *   flex     language flexibility: say it differently, make it natural, formal, informal, professional, native-like
 *   library  practise the useful language extracted from a text of the learner's own input library
 * plus the structured feedback panel shown after free production (with optional AI feedback). */
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

  /* ---------------- structured feedback panel ---------------- */
  function feedbackPanel(fb) {
    if (!fb) return '';
    const src = fb._source && fb._source !== 'local' ? '<span class="pill accent">AI feedback</span>' : '<span class="pill outline" title="Rule-based checks: they catch common patterns, not everything">Local checks</span>';
    return `<div class="fb-panel">
      <div class="between"><div class="eyebrow">Feedback</div>${src}</div>
      ${fb.communicated.length ? `<div class="fb-sec"><div class="fb-h ok">${icon('check', 14)} What worked</div><ul>${fb.communicated.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${fb.errors.length ? `<div class="fb-sec"><div class="fb-h">${icon('errors', 14)} Most important ${fb.errors.length === 1 ? 'correction' : 'corrections'}</div>${fb.errors.map((e) => `<div class="err mt-8"><div><div class="w">${esc(e.wrong)}</div><div class="r">${esc(e.right)}</div>${e.why ? `<div class="faint small mt-4">${esc(e.why)}${e.recurring ? ' · <strong>recurring</strong>' : ''}</div>` : ''}</div></div>`).join('')}</div>` : ''}
      ${fb.alternatives.length ? `<div class="fb-sec"><div class="fb-h">${icon('sparkle', 14)} More natural</div>${fb.alternatives.map((x) => `<div class="small mt-4"><span class="faint">${esc(x.from)}</span> → <strong>${esc(x.to)}</strong></div>`).join('')}<div class="faint xs mt-4">Alternatives, not the only correct way to say it.</div></div>` : ''}
      ${fb.missing.length ? `<div class="fb-sec"><div class="fb-h">${icon('plus', 14)} Language you could add</div><div class="cluster mt-4">${fb.missing.map((m) => `<span class="pill outline">${esc(m)}</span>`).join('')}</div></div>` : ''}
      ${fb.priorities.length ? `<div class="fb-sec"><div class="fb-h">${icon('flag', 14)} Focus next time</div><ol>${fb.priorities.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
      ${fb.followUp ? `<div class="fb-sec between"><div class="small"><strong>Follow-up:</strong> ${esc(fb.followUp.label)}<div class="faint xs">${esc(fb.followUp.text || '')}</div></div><a class="btn sm" href="${esc(fb.followUp.href)}">Do it</a></div>` : ''}
    </div>`;
  }
  // "Get AI feedback" buttons inside correction panels (works in every runner)
  const pending = new Map();
  function aiButton(code, text, opts = {}) {
    if (!LOS.AI.active() || !text || !text.trim()) return '';
    const k = U.uid('aifb');
    pending.set(k, Object.assign({ code, text }, opts));
    return `<div class="mt-12" data-ai-fb="${k}"><button class="btn sm" type="button">${icon('sparkle', 14)} AI feedback (${esc(LOS.AI.providerLabel())})</button></div>`;
  }
  document.addEventListener('click', async (e) => {
    const box = e.target.closest && e.target.closest('[data-ai-fb]');
    if (!box || !e.target.closest('button')) return;
    const o = pending.get(box.dataset.aiFb);
    if (!o) return;
    box.innerHTML = '<p class="muted small">Asking your AI tutor…</p>';
    const fb = await LOS.AI.assess(o.code, { text: o.text, kind: o.kind, prompt: o.prompt, keys: o.keys, level: o.level });
    box.innerHTML = feedbackPanel(fb) + (fb._source === 'local' ? '<p class="faint xs mt-4">The AI provider did not answer — showing the local analysis.</p>' : '');
  });
  H.feedbackPanel = feedbackPanel;
  H.aiButton = aiButton;
  // every correction panel (writing, speaking, grammar production, micro tasks) starts with the structured summary
  const baseCorrections = H.correctionsHTML;
  LOS.run.helpers.correctionsHTML = H.correctionsHTML = function (analysis, max) {
    const code = analysis && analysis.code;
    let head = '';
    if (code && analysis.words) {
      try { head = feedbackPanel(LOS.feedback.build(code, analysis, {})) + aiButton(code, (analysis.sentencesOut || []).map((x) => x.original).join(' '), { level: analysis.nextLevel }); } catch (e) { head = ''; }
    }
    return head + baseCorrections(analysis, max);
  };

  /* ====================================================================
   * SCENARIO SIMULATOR
   * ==================================================================== */
  R.sim = function (s) {
    const pl = s.item.payload;
    const gate = LOS.run.gate;
    const g = gate.gateMeta(s, 'scenario', pl);
    if (!g.meta) return s.fail('Scenario not found.');
    const { m, task: sc, meta } = g;
    const rd = ped.readiness(s.code, meta);
    if (!rd.ready && !pl.force) {
      gate.notReadyScreen(s, meta, rd, null, '<button class="btn ghost" data-act="tryAnyway">Try the conversation anyway</button>');
      s.on({ tryAnyway() { start(); } });
      return;
    }
    start();

    function start() {
      const ln = LOS.sim.lines(s.code, m, sc);
      const history = [];
      const turns = [];
      const nQ = 1 + ln.follow.length;
      let mic = null, busy = false, report = null;
      const ai = LOS.AI.active();
      s.render(`<div class="stage-label">Scenario simulation · ${esc(m.title)}</div><h2>${esc(ln.role || 'Conversation')}</h2>
        <p class="lead mt-8">${esc(sc.p)}</p>
        <div class="card soft mt-16 small"><ul class="lesson">
          <li>The other person speaks first and reacts to your answers with ${nQ - 1} follow-up questions.</li>
          <li>Answer by typing or with the microphone. Use the language of this module: ${esc((sc.keys || []).slice(0, 4).join(', ') || 'see the module')}.</li>
          <li>No corrections during the conversation — you get a full report at the end.</li>
          <li>${ai ? `Partner: your AI provider (${esc(LOS.AI.providerLabel())}).` : 'Partner: scripted follow-up questions (no AI configured).'}</li></ul></div>
        <div class="runner-foot"><span class="faint xs">${s.lang.goals.includes('medical') && m.id.includes('-med-') ? 'Language practice — not clinical guidance.' : ''}</span><button class="btn primary" data-act="go" data-enter autofocus>Start ${icon('arrowRight', 16)}</button></div>`);
      s.on({
        go() { partner(ln.open); },
        async send() {
          if (busy) return;
          const ta = s.body.querySelector('#ans');
          let secs = turns.pendingSecs || 0; turns.pendingSecs = 0;
          if (mic && mic.active) { const r = await mic.stop(); secs = r.secs; if (r.transcript && ta && !ta.value.trim()) ta.value = r.transcript; }
          const text = ta ? ta.value.trim() : '';
          if (!text) return;
          turns.push({ text, secs });
          history.push({ who: 'me', text });
          if (turns.length >= nQ) { history.push({ who: 'ai', text: ln.close }); draw(); return finish(); }
          busy = true; draw(true);
          const local = () => ({ reply: ln.follow[turns.length - 1] });
          const r = await LOS.AI.simTurn(s.code, { role: ln.role, situation: sc.p, level: m.l, history }, local);
          busy = false;
          partner(String(r.reply || local().reply));
        },
        async mic(el) {
          if (!mic) mic = H.micController(s, (f, i) => { const ta = s.body.querySelector('#ans'); if (ta) ta.value = (f + ' ' + i).trim(); });
          if (mic.active) { const r = await mic.stop(); const ta = s.body.querySelector('#ans'); if (ta && r.transcript) ta.value = r.transcript; turns.pendingSecs = r.secs; el.classList.remove('on'); }
          else { await mic.start(); el.classList.add('on'); }
        },
        done() { s.finish({ score: report.overall, headline: 'Simulation complete', summary: [`Overall: ${Math.round(report.overall * 100)}%`, report.weak.length ? `Focus next: ${report.weak.map((w) => w.label.toLowerCase()).join(' and ')}` : ''].filter(Boolean) }); },
      });
      function partner(text) { history.push({ who: 'ai', text }); draw(); setTimeout(() => { if (LOS.speech.ttsSupported && LOS.store.state.settings.simVoice !== false) LOS.speech.speak(text, s.code); }, 50); }
      function draw(thinking) {
        s.progress(turns.length / (nQ + 1));
        const msgs = history.map((h) => `<div class="msg ${h.who}"><div class="bubble">${esc(h.text)}</div>${h.who === 'ai' ? ui.speakBtn(h.text, s.code) : ''}</div>`).join('');
        const finished = turns.length >= nQ;
        s.render(`<div class="stage-label">${esc(ln.role)} · turn ${Math.min(turns.length + 1, nQ)} of ${nQ}</div>
          <div class="chat mt-12">${msgs}${thinking ? '<div class="msg ai"><div class="bubble faint">…</div></div>' : ''}</div>
          ${finished ? '' : `<textarea class="textarea mt-16" id="ans" rows="3" placeholder="Answer in ${esc(s.pack.name)}…" ${thinking ? 'disabled' : 'autofocus'}></textarea>
          <div class="runner-foot">${LOS.speech.srSupported ? `<button class="btn ghost" data-act="mic">${icon('speaking', 15)} Speak</button>` : '<span></span>'}<button class="btn primary" data-act="send" ${thinking ? 'disabled' : ''}>Send ${icon('arrowRight', 15)}</button></div>`}`);
        const chat = s.body.querySelector('.chat');
        if (chat) chat.scrollTop = chat.scrollHeight;
      }
      async function finish() {
        const ev = LOS.sim.evaluate(s.code, m, sc, turns, nQ);
        H.logAnalysisErrors(s.code, ev.analysis, 'sim');
        const used = ped.detectUse(s.code, turns.map((t) => t.text).join(' '));
        LOS.sim.save(s.code, m, pl.idx || 0, ev, turns);
        const t = ped.taskState(s.code, meta);
        t.attempts = (t.attempts || 0) + 1; t.best = Math.max(t.best || 0, ev.overall); t.lastAt = U.today();
        LOS.skills.update(s.lang, 'speaking', U.levelIndex(m.l) + 0.5, ev.overall, 0.03);
        if (ped.speakLevel(s.code) >= 6) ped.recordSpeak(s.code, ev.overall);
        LOS.store.save();
        s.render('<p class="muted">Preparing your report…</p>');
        const fb = await LOS.AI.assess(s.code, { text: turns.map((x) => x.text).join(' '), kind: 'conversation', prompt: sc.p, keys: sc.keys, level: m.l, analysis: ev.analysis });
        report = ev;
        s.progress(1);
        s.render(`<div class="stage-label">Performance</div><h2>${esc(m.title)}</h2>
          <p class="faint small">${LOS.AI.active() ? 'Dimension scores are estimated by the app from your answers; the feedback below comes from your AI provider when available.' : 'Estimated locally from your answers (rule-based) — useful for trends, not an exam score.'}</p>
          <div class="dims mt-16">${Object.keys(ev.dims).filter((k) => ev.dims[k] != null).map((k) => `<div class="dim"><span>${esc(ev.LABEL[k])}</span>${ui.bar(Math.round(ev.dims[k] * 100), 'thin')}<span class="num faint">${Math.round(ev.dims[k] * 100)}</span></div>`).join('')}</div>
          ${used.length ? `<p class="small mt-12">Used spontaneously: <strong>${esc(used.slice(0, 6).join(', '))}</strong></p>` : ''}
          <div class="mt-16">${feedbackPanel(fb)}</div>
          ${ev.weak.length ? `<div class="section"><div class="section-head"><h3>Highest-impact weaknesses</h3><span class="faint small">they shape your next sessions</span></div><div class="list">${ev.weak.map((w) => `<div class="row"><span class="grow">${esc(w.label)} <span class="faint small">${Math.round(w.v * 100)}%</span></span><a class="btn sm" href="${esc(w.fix.href)}">${esc(w.fix.label)}</a></div>`).join('')}</div></div>` : ''}
          <div class="runner-foot"><span></span><button class="btn primary" data-act="done" data-enter autofocus>Finish ${icon('check', 16)}</button></div>`);
      }
    }
  };

  /* ====================================================================
   * LANGUAGE FLEXIBILITY TOOLS
   * ==================================================================== */
  const FLEX = [['different', 'Say it differently'], ['natural', 'Make it natural'], ['formal', 'Make it formal'], ['informal', 'Make it informal'], ['professional', 'Professional version'], ['native', 'Native-like alternatives']];
  R.flex = function (s) {
    const errs = (s.lang.errors || []).filter((e) => e.right && e.right.length < 160).slice(0, 6).map((e) => e.right);
    const last = (s.lang.writings[0] && U.sentences(s.lang.writings[0].text || '').slice(0, 3)) || [];
    const seeds = [...new Set(errs.concat(last))].slice(0, 5);
    let target = s.item.payload.target || 'different', text = s.item.payload.text || seeds[0] || '', out = null, mine = '', fb = null;
    function draw() {
      s.render(`<div class="stage-label">Language flexibility</div><h2>${esc(FLEX.find((f) => f[0] === target)[1])}</h2>
        <p class="muted small">Flexibility, not memorisation: the same idea in several ways. ${LOS.AI.active() ? '' : 'Without an AI provider the app rewrites with its local rules (common errors, register phrases, known synonyms).'}</p>
        <div class="mt-12">${ui.chips('target', FLEX, target)}</div>
        <div class="field mt-16"><label for="flx">Your sentence (${esc(s.pack.name)})</label><textarea class="textarea" id="flx" rows="2">${esc(text)}</textarea></div>
        ${seeds.length ? `<div class="cluster mt-8">${seeds.map((x, i) => `<button class="chip" data-act="seed" data-i="${i}">${esc(x.length > 50 ? x.slice(0, 50) + '…' : x)}</button>`).join('')}</div>` : ''}
        <div class="cluster mt-12"><button class="btn primary" data-act="run">${icon('sparkle', 14)} Show versions</button></div>
        ${out ? `<div class="card flat mt-16"><div class="eyebrow">${out._source && out._source !== 'local' ? 'AI versions' : 'Local versions'}</div>${(out.versions || []).length ? out.versions.map((v) => `<div class="example between"><span>${esc(v)}</span>${ui.speakBtn(v, s.code)}</div>`).join('') : ''}<p class="faint small mt-8">${esc(out.note || '')}</p></div>
          <div class="field mt-16"><label for="mine">Now write your own version</label><textarea class="textarea" id="mine" rows="2">${esc(mine)}</textarea></div>
          <div class="cluster mt-8"><button class="btn" data-act="check">Check</button><button class="btn primary" data-act="fin">Finish</button></div>
          ${fb ? `<div class="mt-12">${feedbackPanel(fb)}</div>` : ''}` : ''}`);
    }
    s.on({
      target(el) { target = el.dataset.v; out = null; draw(); },
      seed(el) { text = seeds[+el.dataset.i]; out = null; draw(); },
      async run() { text = s.body.querySelector('#flx').value.trim(); if (!text) return; s.render('<p class="muted">Rewriting…</p>'); out = await LOS.AI.transform(s.code, { text, target }); draw(); },
      async check() { mine = s.body.querySelector('#mine').value.trim(); if (!mine) return; const a = LOS.writing.analyze(s.code, mine, { reg: ['formal', 'professional'].includes(target) ? 'formal' : target === 'informal' ? 'informal' : 'neutral' }); H.logAnalysisErrors(s.code, a, 'flex'); ped.detectUse(s.code, mine); fb = await LOS.AI.assess(s.code, { text: mine, kind: target + ' rewrite', prompt: text, analysis: a }); draw(); },
      fin() { s.finish({ score: fb ? (fb.errors.length ? 0.6 : 0.9) : 0.7, headline: 'Flexibility practice done', summary: ['Saying the same thing in different ways makes your language usable in more situations.'] }); },
    });
    draw();
  };

  /* ====================================================================
   * INPUT LIBRARY PRACTICE
   * ==================================================================== */
  R.library = function (s) {
    const it = LOS.library.list(s.code).find((x) => x.id === s.item.payload.id);
    if (!it || !it.out) return s.fail('Open the text in your library and prepare it first.');
    const o = it.out;
    const steps = [];
    const ids = [];
    (o.vocab || []).forEach((v) => {
      let id = v.id && LOS.learn.vocabItem(s.code, v.id) ? v.id : null;
      if (!id) { try { const c = LOS.learn.addCustomVocab(s.code, { w: v.w, tr: v.tr || '', def: v.def || '', ex: v.ex || '', l: U.LEVELS[LOS.learn.targetLevelIdx(s.code, 'vocabulary')], src: 'library', ctx: it.title }); id = c.id; } catch (e) { id = null; } }
      if (id) ids.push(id);
    });
    ids.forEach((id) => { if (ped.vstage(s.lang.vocab[id]) < 1) steps.push({ vocab: id, stage: 0 }); });
    ids.forEach((id) => steps.push({ vocab: id, stage: 1 }));
    (o.questions || []).forEach((q) => steps.push({ ex: { kind: 'mcq', micro: 'comprehension', title: 'From your text', prompt: q.q, options: q.o, answer: q.a } }));
    (o.prompts || []).slice(0, 1).forEach((p) => steps.push({ ex: { kind: 'free', micro: 'respond3', title: 'Speak or write about it', prompt: p, sentences: 3 } }));
    if (!steps.length) return s.fail('Nothing useful was found for your level in this text.');
    it.added = [...new Set((it.added || []).concat(ids))];
    let i = 0, ok = 0, n = 0;
    const pl = LOS.run.makePlayer(s, { redraw: draw, next, sameDayOk: true, onResult(ex, r) { if (r.exposed) return; n++; if (r.correct) ok++; } });
    function exFor(st) { return st.vocab ? ped.vocabExercise(s.code, st.vocab, { stage: st.stage }) : st.ex; }
    function draw() { s.progress(i / steps.length); s.render(`<div class="between"><span class="faint small">${esc(it.title)} · ${i + 1} of ${steps.length}</span><span class="pill outline">Your library</span></div><div class="mt-16"></div>` + pl.html()); }
    function next() { i++; if (i >= steps.length) return s.finish({ score: n ? ok / n : 0.8, headline: 'Text practised', summary: [`${ids.length} items from “${it.title}” are now in your learning queue`, n ? `${Math.round((ok / n) * 100)}% correct` : ''].filter(Boolean) }); pl.show(exFor(steps[i])); draw(); }
    s.on(pl.handlers);
    pl.show(exFor(steps[0])); draw();
  };
})();

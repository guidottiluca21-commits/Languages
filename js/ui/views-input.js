/* VIEWS — extensive reading (with sentence mining and the input log), the weekly report to share with a
 * teacher or tandem partner, the .ics export of the week, the can-do checklist and the monthly check-up card. */
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
  const LISTEN_KINDS = ['podcast', 'video', 'transcript'];

  function source(src, id) {
    if (src === 'lib') { const it = LOS.library.list(code()).find((x) => x.id === id); return it && { title: it.title, text: it.text, kind: LISTEN_KINDS.includes(it.kind) ? 'listening' : 'reading', url: it.url, libId: it.id }; }
    const t = LOS.lang.get(code()).index.texts[id];
    return t && { title: t.title, text: t.text, kind: 'reading', l: t.l };
  }
  function wordsHTML(text) {
    return U.sentences(text).map((sent) => `<span class="sent">${esc(sent).split(/(\s+)/).map((tok) => /\S/.test(tok) ? `<span class="w" data-act="mine" data-w="${tok.replace(/[.,;:!?¿¡"“”()«»]/g, '')}">${tok}</span>` : tok).join('')}</span>`).join(' ');
  }

  /* ---------------- extensive reading ---------------- */
  let t0 = 0;
  V.read = {
    title: 'Read',
    render(params) {
      const L = lang();
      if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'reading', title: 'Set up a language first' })}</div>`;
      const s = source(params[0], params[1]);
      if (!s) return `<div class="view narrow">${ui.empty({ icon: 'errors', title: 'Text not found', action: '<a class="btn" href="#/library">Input library</a>' })}</div>`;
      const cov = LOS.input.coverage(code(), s.text);
      const words = LOS.input.tokens(s.text).length;
      return `<div class="view narrow">
        <a class="small" href="${s.libId ? '#/library' : '#/reading'}">${icon('chevronLeft', 14)} ${s.libId ? 'Input library' : 'Reading'}</a>
        <div class="page-head mt-8"><div><div class="cluster"><span class="cov ${cov.band}">${esc(LOS.input.label(cov))}</span><span class="pill outline">${words} words</span></div><h1 class="mt-8">${esc(s.title)}</h1>
          <p class="sub">Read for pleasure and meaning — don't stop for every unknown word. Tap a word only when you want it: you see it in context and can add it (or its chunk) to your learning.</p></div>
          ${LOS.speech.ttsSupported ? ui.speakBtn(s.text.slice(0, 3000), code(), 'Read aloud') : ''}</div>
        ${s.url ? `<p class="small"><a href="${esc(s.url)}" target="_blank" rel="noopener">Open the original</a></p>` : ''}
        <div class="transcript card mt-16">${wordsHTML(s.text)}</div>
        <div class="card soft mt-16"><div class="eyebrow">Log this ${s.kind === 'listening' ? 'listening' : 'reading'}</div>
          <div class="cluster mt-8"><label class="small">Minutes <input class="input" style="width:90px" type="number" min="1" max="600" id="rd-min" value=""></label>
            <label class="check small"><input type="checkbox" id="rd-fin" checked> Finished</label>
            <button class="btn primary" data-act="logRead">${icon('check', 15)} Save to my input log</button></div>
          <p class="faint xs mt-8">Extensive input is separate from study sessions: it counts toward your goals and the weekly real-world exposure, never creates obligations.</p></div>
      </div>`;
    },
    mount(root, params) {
      t0 = Date.now();
      const s = source(params[0], params[1]);
      const minEl = root.querySelector('#rd-min');
      const tick = setInterval(() => { if (minEl && !minEl.dataset.touched) minEl.value = Math.max(1, Math.round((Date.now() - t0) / 60000)); }, 5000);
      if (minEl) { minEl.value = 1; minEl.addEventListener('input', () => { minEl.dataset.touched = '1'; }); }
      V.read._tick = tick;
      ui.delegate(root, {
        async mine(el) { const w = el.dataset.w; const sent = el.closest('.sent') ? el.closest('.sent').textContent : LOS.run.sentenceOf(s.text, w); if (await LOS.run.mineCard(code(), w, sent, 'reading')) el.classList.add('sel'); },
        logRead() {
          const fin = root.querySelector('#rd-fin').checked;
          const words = LOS.input.tokens(s.text).length;
          LOS.input.log(code(), { kind: s.kind, title: s.title, minutes: +minEl.value || 1, words: fin ? words : Math.round(words / 2), finished: fin, src: s.libId ? 'library' : 'text' });
          LOS.store.save();
          ui.toast('Saved to your input log', 'check');
          location.hash = s.libId ? '#/library' : '#/reading';
        },
      });
    },
    unmount() { clearInterval(V.read._tick); },
  };

  /* ---------------- weekly report (teacher / tandem partner) ---------------- */
  function reportText(c) {
    const L = LOS.store.lang(c);
    const p = LOS.lang.get(c);
    const o = LOS.skills.calculateLevel(L);
    const a = LOS.analytics.overview(c);
    const rd = LOS.goals.readiness(c);
    const errs = LOS.errorBank.patterns(c).filter((x) => x.status !== 'resolved').slice(0, 5);
    const inp = LOS.input.stats(c, 7);
    const exam = LOS.exams && LOS.exams.goal(c);
    const topics = LOS.goals.readiness(c).impact.map((x) => x.label);
    const recent = LOS.ped.learnedIds(c, 3, 12).map((id) => LOS.learn.vocabItem(c, id)).filter(Boolean).map((v) => v.w);
    const lines = [
      `${p.name} — weekly report (${U.fmtDate(U.addDays(U.today(), -6))} – ${U.fmtDate(U.today())})`,
      `Level (estimate): ${o.sub} · goal: ${rd.label}${rd.country ? ' (' + rd.country + ')' : ''}${exam ? ` · exam: ${exam.name} ${exam.level || ''}${exam.date ? ' on ' + U.fmtDate(exam.date) : ''}` : ''}`,
      `Study: ${a.minutes} min on ${a.days} day(s) · extensive input: ${inp.readingMin} min reading, ${inp.listeningMin} min listening`,
      '',
      'Recurring errors to watch:',
      ...(errs.length ? errs.map((e) => `- ${e.label} (${e.catLabel}, ${e.count}×)${e.examples[0] ? `: "${e.examples[0].wrong}" → "${e.examples[0].right}"` : ''}`) : ['- none recurring this week']),
      '',
      'What to practise together:',
      ...topics.map((t) => `- ${t}`),
      '',
      'Recent words and phrases (please use them in conversation):',
      recent.length ? recent.join(' · ') : '- (none yet)',
      '',
      'Suggested conversation topics:',
      ...LOS.lang.get(c).abroad.slice(0, 3).map((m) => `- ${m.title}`),
    ];
    return lines.join('\n');
  }
  V.report = {
    title: 'Weekly report',
    render() {
      const L = lang();
      if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'progress', title: 'Set up a language first' })}</div>`;
      const txt = reportText(code());
      return `<div class="view narrow">
        <div class="page-head no-print"><div><h1>Report for your teacher or tandem partner</h1><p class="sub">Nothing is sent automatically. Print it (or save as PDF from the print dialog) or copy the text.</p></div>
          <div class="cluster"><button class="btn" data-act="copy">${icon('clipboard', 15)} Copy</button><button class="btn primary" data-act="print">${icon('download', 15)} Print / PDF</button></div></div>
        <pre class="card report-text" style="white-space:pre-wrap;font-family:var(--font);font-size:15px;line-height:1.6">${esc(txt)}</pre>
        <div class="section no-print"><div class="section-head"><h3>Before and after a real conversation</h3></div><p class="muted small">A 3-minute warm-up with the phrases you need, then a 1-minute note of what was missing — it goes straight into your learning.</p><a class="btn mt-8" href="#/practice/convo">Conversation prep</a></div>
      </div>`;
    },
    mount(root) {
      ui.delegate(root, {
        async copy() { try { await navigator.clipboard.writeText(reportText(code())); ui.toast('Copied'); } catch (e) { ui.toast('Select the text and copy it', 'info'); } },
        print() { window.print(); },
      });
    },
  };

  /* ---------------- .ics export of the week ---------------- */
  function icsDate(d, hm) { return d.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00'; }
  function weekICS() {
    const st = LOS.store.state;
    const hour = { morning: '07:30', afternoon: '13:30', evening: '20:30' }[(st.profile || {}).studyTime] || '20:30';
    const plan = LOS.planner.generateWeeklyPlan();
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lingua OS//study plan//EN', 'CALSCALE:GREGORIAN'];
    plan.days.forEach((d) => {
      if (d.budget.mode === 'rest' || !d.langs.length) return;
      d.langs.forEach((l) => {
        const end = (() => { const [h, m] = hour.split(':').map(Number); const t = h * 60 + m + l.minutes; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; })();
        const blocks = l.blocks.map((b) => `${U.SKILL_LABEL[b.skill] || b.skill} ${b.minutes}′`).join(', ');
        lines.push('BEGIN:VEVENT', `UID:${d.date}-${l.code}@lingua-os`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${icsDate(d.date, hour)}`, `DTEND:${icsDate(d.date, end)}`, `SUMMARY:${LOS.lang.get(l.code).name} · ${l.minutes} min`, `DESCRIPTION:${blocks.replace(/,/g, '\\,')}`, 'END:VEVENT');
      });
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /* ---------------- can-do checklist & monthly check-up (on the Progress page) ---------------- */
  const candoState = { skill: 'speaking' };
  function candoHTML(c) {
    const L = LOS.store.lang(c);
    const list = LOS.cando.list(c);
    const skills = [...new Set(list.map((x) => x.skill))];
    const dis = LOS.cando.disagreements(c);
    const due = LOS.recal.due(c);
    const last = (L.recal || {}).hist && L.recal.hist[0];
    return `<div class="section"><div class="section-head"><h2>Check-up & “I can…”</h2></div>
      <div class="card soft between" style="flex-wrap:wrap;gap:12px"><div><strong>Monthly check-up</strong> <span class="faint small">optional · 8–10 min</span><div class="small muted">${last ? `Last: ${U.fmtDate(last.date)} · ${Math.round(last.acc * 100)}% correct` : 'Recalibrates your skill estimates with 12 adaptive questions.'}</div></div>
        <a class="btn ${due ? 'primary' : ''} sm" href="#/practice/recal">${due ? 'Do it now' : 'Do it again'}</a></div>
      <div class="cluster mt-16">${skills.map((k) => `<button class="chip ${candoState.skill === k ? 'active' : ''}" data-act="cdSkill" data-v="${k}">${esc(U.SKILL_LABEL[k] || U.cap(k))}</button>`).join('')}</div>
      <div class="list mt-8">${list.filter((x) => x.skill === candoState.skill).map((x) => `<label class="row" style="min-height:40px"><input type="checkbox" data-act="cando" data-k="${esc(x.key)}" ${x.ticked ? 'checked' : ''}><span class="pill">${x.l}</span><span class="grow small">${esc(x.text)}</span></label>`).join('')}</div>
      ${dis.length ? `<div class="mt-12">${dis.map((d) => `<p class="small ${d.kind === 'over' ? 'muted' : ''}">${icon('info', 14)} ${esc(d.text)}</p>`).join('')}</div>` : ''}</div>`;
  }
  const candoHandlers = {
    cdSkill(el) { candoState.skill = el.dataset.v; LOS.app.refresh(); },
    cando(el) { LOS.cando.toggle(code(), el.dataset.k); LOS.store.save(); },
  };

  LOS.inputUI = { reportText, weekICS, candoHTML, candoHandlers, wordsHTML };
})();

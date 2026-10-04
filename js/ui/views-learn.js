/* VIEWS — Learn sections. */
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
  const pack = () => LOS.lang.get(code());
  const lang = () => LOS.store.lang(code());
  const ready = () => { const L = lang(); return L && L.onboarded; };
  const notReady = () => `<div class="view narrow">${ui.empty({ icon: 'globe', title: `Set up ${esc(ui.langName(code()))} first`, text: 'A short placement test builds your personal curriculum.', action: `<a class="btn primary" href="#/welcome/${code()}">Start</a>` })}</div>`;
  const viewState = {}; // per-view UI state (filters, tabs)

  /* ---------------- Grammar ---------------- */
  V.grammar = {
    title: 'Grammar',
    render(params) {
      if (!ready()) return notReady();
      if (params[0]) return topicDetail(params[0]);
      const vs = (viewState.grammar = viewState.grammar || { mode: 'status', level: 'all' });
      const list = LOS.learn.grammarList(code()).filter((g) => vs.level === 'all' || g.topic.l === vs.level);
      const count = U.countBy(LOS.learn.grammarList(code()), (g) => g.status);
      const due = list.filter((g) => g.due);
      const row = (g) => `<a class="row clickable" href="#/grammar/${g.topic.id}">${ui.statusIcon(g.status)}<div class="grow"><div class="title">${esc(g.topic.title)}</div><div class="meta">${esc(g.topic.cat)}${g.state && g.state.last ? ` · reviewed ${U.relDate(g.state.last)}` : ''}${g.state && g.state.due ? ` · next ${U.relDate(g.state.due)}` : ''}</div></div><span class="pill">${g.topic.l}</span><div style="width:90px" class="hide-sm">${ui.bar(g.eff, 'thin')}</div></a>`;
      let body;
      if (vs.mode === 'status') {
        const groups = [['Needs review', due], ['Learning', list.filter((g) => !g.due && (g.status === 'learning' || g.status === 'familiar'))], ['Mastered', list.filter((g) => !g.due && g.status === 'mastered')], ['Not learned', list.filter((g) => g.status === 'new' && !g.due)]];
        body = groups.filter(([, l]) => l.length).map(([t, l]) => `<div class="section"><div class="section-head"><h3>${t}</h3><span class="faint small">${l.length}</span></div><div class="list">${l.map(row).join('')}</div></div>`).join('') || ui.empty({ title: 'No topics', icon: 'grammar' });
      } else {
        body = U.LEVELS.filter((l) => vs.level === 'all' || vs.level === l).map((l) => {
          const lt = list.filter((g) => g.topic.l === l);
          const doneN = lt.filter((g) => g.status === 'familiar' || g.status === 'mastered').length;
          return `<div class="section"><div class="section-head"><h3>${l}</h3><span class="faint small">${doneN}/${lt.length} familiar or mastered</span></div>${ui.bar(lt.length ? (doneN / lt.length) * 100 : 0, 'thin')}<div class="list mt-8">${lt.map((g) => { const locked = !LOS.learn.prereqsMet(code(), g.topic) && g.status === 'new'; return row(g).replace('<div class="meta">', `<div class="meta">${locked ? `${icon('layers', 12)} after ${esc(g.topic.pre.map((id) => (pack().index.grammar[id] || {}).title).join(', '))} · ` : ''}`); }).join('')}</div></div>`;
        }).join('');
      }
      const next = LOS.learn.pickTopic(code(), { rnd: () => 0.5 });
      return `<div class="view">
        <div class="page-head"><div><h1>Grammar</h1><p class="sub">A ${esc(pack().name)} curriculum from A1 to C2 as a skill tree. Topics return when your answers show they're fading — not on a fixed calendar.</p></div>
          ${next ? `<a class="btn primary" href="#/practice/grammar/${next.topic.id}${next.status === 'new' ? '/learn' : ''}">${icon('play', 14)} ${esc(next.topic.title)}</a>` : ''}</div>
        <div class="stats-row"><div class="stat"><span class="v">${count.mastered || 0}</span><span class="k">Mastered</span></div><div class="stat"><span class="v">${(count.familiar || 0) + (count.learning || 0)}</span><span class="k">Learning / familiar</span></div><div class="stat"><span class="v">${LOS.learn.grammarList(code()).filter((g) => g.due).length}</span><span class="k">Due for review</span></div><div class="stat"><span class="v">${count.new || 0}</span><span class="k">Not learned</span></div></div>
        <div class="between mt-32" style="flex-wrap:wrap">${ui.seg('gmode', [['status', 'By status'], ['level', 'Skill tree']], vs.mode)}${ui.chips('glevel', [['all', 'All']].concat(U.LEVELS.map((l) => [l, l])), vs.level)}</div>
        ${body}</div>`;
    },
    mount(root) {
      ui.delegate(root, {
        gmode(el) { viewState.grammar.mode = el.dataset.v; LOS.app.refresh(); },
        glevel(el) { viewState.grammar.level = el.dataset.v; LOS.app.refresh(); },
      });
    },
  };

  function topicDetail(id) {
    const t = pack().index.grammar[id];
    if (!t) return `<div class="view">${ui.empty({ title: 'Topic not found', icon: 'grammar' })}</div>`;
    const st = lang().grammar[id];
    const status = LOS.srs.status(st);
    const eff = st ? Math.round(LOS.srs.effective(st)) : 0;
    const errs = lang().errors.filter((e) => e.topic === id).slice(0, 5);
    const acc = st && st.attempts ? Math.round((st.correct / st.attempts) * 100) : null;
    return `<div class="view narrow">
      <a class="small" href="#/grammar">${icon('chevronLeft', 14)} Grammar</a>
      <div class="page-head mt-8"><div><div class="cluster"><span class="pill">${t.l}</span><span class="faint small">${esc(t.cat)}</span></div><h1 class="mt-8">${esc(t.title)}</h1><p class="sub">${esc(t.sum)}</p></div></div>
      <div class="card"><div class="between"><div class="eyebrow">Grammar mastery</div>${ui.statusPill(status)}</div>
        <div class="between mt-16 small"><span class="muted">Mastery</span><span class="num strong">${eff}%</span></div><div class="mt-8">${ui.bar(eff, 'thick')}</div>
        <div class="grid grid-4 mt-24"><div class="stat"><span class="k">Last reviewed</span><span>${st && st.last ? U.relDate(st.last) : '—'}</span></div><div class="stat"><span class="k">Next review</span><span>${st && st.due ? U.relDate(st.due) : '—'}</span></div><div class="stat"><span class="k">Accuracy</span><span>${acc == null ? '—' : acc + '%'}</span></div><div class="stat"><span class="k">Difficulty</span><span>${st ? ['Easier', 'Core', 'Harder'][(st.d || 1) - 1] : '—'}</span></div></div>
        ${st && st.assumed ? `<p class="faint xs mt-16">Estimated from your placement test — a review will verify it.</p>` : ''}
        <div class="cluster mt-24"><a class="btn primary" href="#/practice/grammar/${id}/learn">${icon('grammar', 15)} Learn & practise</a><a class="btn" href="#/practice/grammar/${id}">${icon('play', 14)} Practice only</a></div></div>
      <div class="section lesson"><div class="section-head"><h3>The rule</h3></div><ul>${t.explain.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>${t.ex.map((e) => `<div class="example between"><span>${esc(e)}</span>${ui.speakBtn(e, code())}</div>`).join('')}</div>
      ${t.pre && t.pre.length ? `<div class="section"><div class="section-head"><h3>Builds on</h3></div><div class="list">${t.pre.map((pid) => { const pt = pack().index.grammar[pid]; return pt ? `<a class="row clickable" href="#/grammar/${pid}">${ui.statusIcon(LOS.learn.topicStatus(code(), pid))}<span class="grow">${esc(pt.title)}</span><span class="pill">${pt.l}</span></a>` : ''; }).join('')}</div></div>` : ''}
      ${errs.length ? `<div class="section"><div class="section-head"><h3>Your recent errors here</h3><a class="small" href="#/errors">Error log</a></div><div class="list">${errs.map((e) => `<div class="err"><div><div class="w">${esc(e.wrong)}</div><div class="r">${esc(e.right)}</div></div><span class="faint xs">${U.relDate(e.date)}</span></div>`).join('')}</div></div>` : ''}
    </div>`;
  }

  /* ---------------- Vocabulary ---------------- */
  function dictCard(v, st) {
    return `<div class="dict"><div class="between"><div><div class="dict-word">${esc(v.w)}</div><div class="dict-ipa">${v.ipa ? esc(v.ipa) : ''}${ui.speakBtn(v.w, code())}</div></div><div class="cluster"><span class="pill">${esc(v.l)}</span><span class="pill outline">${esc(LOS.shared.KIND_LABEL[v.k] || v.k)}</span></div></div>
      ${v.pos ? `<div class="faint small mt-4">${esc(v.pos)}${v.reg && v.reg !== 'neutral' ? ' · ' + esc(v.reg) : ''}${v.d && v.d !== 'general' ? ' · ' + esc(LOS.shared.DOMAIN_LABEL[v.d] || v.d) : ''}</div>` : ''}
      ${v.def ? `<div class="dict-sec"><div class="eyebrow">Definition</div><div class="q">${esc(v.def)}</div></div>` : ''}
      ${v.tr ? `<div class="dict-sec"><div class="eyebrow">Italiano</div><div class="q">${esc(v.tr)}</div></div>` : ''}
      ${v.ex ? `<div class="dict-sec"><div class="eyebrow">Example</div><div class="between"><div class="q ex">“${esc(v.ex)}”</div>${ui.speakBtn(v.ex, code())}</div></div>` : ''}
      ${v.col && v.col.length ? `<div class="dict-sec"><div class="eyebrow">Collocations</div><div class="colls">${v.col.map((c) => `<span>${esc(c)}</span>`).join('')}</div></div>` : ''}
      ${(v.syn && v.syn.length) || (v.ant && v.ant.length) ? `<div class="dict-sec grid grid-2">${v.syn && v.syn.length ? `<div><div class="eyebrow">Related</div><div>${esc(v.syn.join(', '))}</div></div>` : ''}${v.ant && v.ant.length ? `<div><div class="eyebrow">Opposite</div><div>${esc(v.ant.join(', '))}</div></div>` : ''}</div>` : ''}
      ${v.ctx ? `<div class="dict-sec"><div class="eyebrow">Context</div><div class="small muted">${esc(v.ctx)}</div></div>` : ''}
      ${v.ff ? `<div class="ff">${icon('flag', 14)} ${esc(v.ff)}</div>` : ''}
      <div class="dict-sec grid grid-2"><div><div class="eyebrow">Level</div><div>${esc(v.l)} · frequency ${'●'.repeat(v.f || 3)}${'○'.repeat(5 - (v.f || 3))}</div></div><div><div class="eyebrow">Mastery</div>${st ? `<div class="mt-4">${ui.bar(LOS.srs.effective(st), 'thin')}</div><div class="faint xs mt-4">${LOS.learn.STAGE_LABEL[st.stage || 0]}${st.assumed ? ' (estimated)' : ''} · next ${U.relDate(st.due)}</div>` : '<div class="faint">Not introduced yet</div>'}</div></div>
    </div>`;
  }
  function vocabStatus(st) {
    if (!st) return 'new';
    if (st.assumed) return 'known';
    if ((st.stage || 0) >= 3) return 'stable';
    return 'learning';
  }
  function openVocab(id) {
    const v = LOS.learn.vocabItem(code(), id);
    if (!v) return;
    const st = lang().vocab[id];
    ui.modal({
      title: '', label: v.w, wide: true, body: dictCard(v, st),
      foot: `${v.custom ? `<button class="btn danger" data-del>${icon('trash', 14)} Delete</button>` : ''}${st ? `<button class="btn" data-reset>Reset progress</button>` : ''}<a class="btn primary" href="#/practice/vocab/${encodeURIComponent(id)}">${st ? 'Practise now' : 'Learn now'}</a>`,
      onMount(m, close) {
        const del = m.querySelector('[data-del]');
        if (del) del.addEventListener('click', async () => { if (!(await ui.confirm('Delete this item?', esc(v.w), 'Delete', true))) return; lang().custom = lang().custom.filter((x) => x.id !== id); delete lang().vocab[id]; LOS.store.save(); close(); LOS.app.refresh(); });
        const rs = m.querySelector('[data-reset]');
        if (rs) rs.addEventListener('click', () => { delete lang().vocab[id]; LOS.store.save(); close(); ui.toast('Progress reset'); LOS.app.refresh(); });
        m.querySelectorAll('a.btn').forEach((a) => a.addEventListener('click', close));
      },
    });
  }

  V.vocabulary = {
    title: 'Vocabulary',
    render(params) {
      if (!ready()) return notReady();
      const vs = (viewState.vocab = viewState.vocab || { tab: 'overview', q: '', status: 'all', level: 'all', kind: 'all', dom: 'all' });
      if (params[0] === 'add') vs.tab = 'add';
      const L = lang();
      const items = LOS.learn.vocabItems(code());
      const due = LOS.learn.dueVocab(code()).length;
      const states = Object.values(L.vocab);
      const learning = states.filter((s) => !s.assumed && (s.stage || 0) < 3).length;
      const stable = states.filter((s) => !s.assumed && (s.stage || 0) >= 3).length;
      const auto = states.filter((s) => !s.assumed && (s.stage || 0) >= 4).length;
      const fresh = items.filter((v) => !L.vocab[v.id]).length;
      let body = '';
      if (vs.tab === 'overview') {
        body = `<div class="grid grid-2" style="--gap:16px">
          <div class="card"><div class="eyebrow">Spaced review</div><div class="result-big mt-8">${due}</div><p class="muted small">items due today — recognition, recall, production or automatic use depending on their stage.</p><a class="btn primary mt-16" href="#/practice/review/all">${icon('review', 15)} Review now</a></div>
          <div class="card"><div class="eyebrow">New material</div><div class="result-big mt-8">${fresh}</div><p class="muted small">items not yet introduced, chosen by your level, goals and frequency. Chunks and collocations first.</p><a class="btn mt-16" href="#/practice/vocab/new">${icon('plus', 15)} Learn 6 new items</a></div></div>
          <div class="section"><div class="section-head"><h3>Acquisition pipeline</h3><span class="faint small">Recognition → Recall → Production → Automatic</span></div>
          <div class="grid grid-4">${[0, 1, 2, 3, 4].slice(1).map((sg) => { const n = states.filter((s) => !s.assumed && (s.stage || 0) === sg).length; return `<div class="stat"><span class="v">${n}</span><span class="k">${LOS.learn.STAGE_LABEL[sg]}</span></div>`; }).join('')}</div>
          <p class="faint small mt-16">A word counts as learned only from the Production stage onwards. ${stable} items are stable, ${auto} automatic, ${learning} still in progress.</p></div>
          <div class="section"><div class="section-head"><h3>Recently added</h3><a class="small" href="#" data-act="tab" data-v="browse">Browse all</a></div><div class="list">${states.length ? Object.keys(L.vocab).filter((id) => !L.vocab[id].assumed).sort((a, b) => (L.vocab[b].introduced || '').localeCompare(L.vocab[a].introduced || '')).slice(0, 8).map((id) => vocabRow(id)).join('') : '<p class="muted small">Nothing yet.</p>'}</div></div>`;
      } else if (vs.tab === 'browse') {
        const q = U.norm(vs.q);
        const list = items.filter((v) => {
          const st = L.vocab[v.id];
          if (vs.status !== 'all' && vocabStatus(st) !== vs.status) return false;
          if (vs.level !== 'all' && v.l !== vs.level) return false;
          if (vs.kind !== 'all' && v.k !== vs.kind) return false;
          if (vs.dom !== 'all' && v.d !== vs.dom) return false;
          if (q && !U.norm(v.w + ' ' + v.tr + ' ' + v.def).includes(q)) return false;
          return true;
        });
        body = `<div class="cluster"><input class="input grow" style="min-width:200px" placeholder="Search words, translations, definitions…" data-q value="${esc(vs.q)}" aria-label="Search vocabulary">
          <select class="select" style="width:auto" data-act="fstatus" aria-label="Status">${[['all', 'Any status'], ['new', 'Not introduced'], ['learning', 'Learning'], ['stable', 'Stable'], ['known', 'Known (estimated)']].map(([v, l]) => `<option value="${v}" ${vs.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="select" style="width:auto" data-act="flevel" aria-label="Level"><option value="all">Any level</option>${U.LEVELS.map((l) => `<option ${vs.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="select" style="width:auto" data-act="fkind" aria-label="Type"><option value="all">Any type</option>${Object.entries(LOS.shared.KIND_LABEL).map(([k, l]) => `<option value="${k}" ${vs.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="select" style="width:auto" data-act="fdom" aria-label="Domain"><option value="all">Any domain</option>${Object.entries(LOS.shared.DOMAIN_LABEL).map(([k, l]) => `<option value="${k}" ${vs.dom === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <p class="faint small mt-16">${list.length} items</p>
          <div class="list mt-8">${list.slice(0, 300).map((v) => vocabRow(v.id)).join('') || '<p class="muted">No matches.</p>'}</div>`;
      } else if (vs.tab === 'cards') {
        body = flashcardsHTML();
      } else if (vs.tab === 'add') {
        body = `<div class="card"><form id="addv" class="stack" style="--gap:14px" autocomplete="off">
          <div class="grid grid-2"><div class="field"><label for="v-w">Word or phrase *</label><input class="input" id="v-w" name="w" required placeholder="e.g. take something on board"></div><div class="field"><label for="v-tr">Italian translation</label><input class="input" id="v-tr" name="tr"></div></div>
          <div class="field"><label for="v-def">Definition (in ${esc(pack().name)})</label><input class="input" id="v-def" name="def"></div>
          <div class="field"><label for="v-ex">Example sentence</label><input class="input" id="v-ex" name="ex"></div>
          <div class="form-grid"><div class="field"><label for="v-k">Type</label><select class="select" id="v-k" name="k">${Object.entries(LOS.shared.KIND_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
            <div class="field"><label for="v-l">CEFR level</label><select class="select" id="v-l" name="l">${U.LEVELS.map((l) => `<option ${l === 'B2' ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label for="v-d">Domain</label><select class="select" id="v-d" name="d">${Object.entries(LOS.shared.DOMAIN_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
            <div class="field"><label for="v-reg">Register</label><select class="select" id="v-reg" name="reg"><option>neutral</option><option>formal</option><option>informal</option></select></div>
            <div class="field"><label for="v-pos">Part of speech</label><input class="input" id="v-pos" name="pos"></div>
            <div class="field"><label for="v-ipa">Pronunciation</label><input class="input" id="v-ipa" name="ipa" placeholder="/ … /"></div></div>
          <div class="grid grid-3"><div class="field"><label for="v-col">Collocations</label><input class="input" id="v-col" name="col" placeholder="comma-separated"></div><div class="field"><label for="v-syn">Synonyms</label><input class="input" id="v-syn" name="syn"></div><div class="field"><label for="v-ant">Antonyms</label><input class="input" id="v-ant" name="ant"></div></div>
          <div class="grid grid-2"><div class="field"><label for="v-ctx">Context / usage note</label><input class="input" id="v-ctx" name="ctx"></div><div class="field"><label for="v-ff">False friend note</label><input class="input" id="v-ff" name="ff"></div></div>
          <div class="cluster"><label class="check"><input type="checkbox" name="learn" checked> Add to my learning queue now</label><button class="btn primary right" type="submit">${icon('plus', 15)} Save item</button></div>
        </form></div>`;
      }
      return `<div class="view">
        <div class="page-head"><div><h1>Vocabulary</h1><p class="sub">Words, chunks, collocations, phrasal verbs and idioms — learned until you can use them, not just recognise them.</p></div>
          <div class="cluster"><a class="btn" href="#/practice/vocab/new">${icon('plus', 15)} New items</a><a class="btn primary" href="#/practice/review/all">${icon('review', 15)} Review · ${due}</a></div></div>
        <div class="tabs" role="tablist">${[['overview', 'Overview'], ['browse', 'Browse'], ['cards', 'Flashcards'], ['add', 'Add']].map(([k, l]) => `<button role="tab" aria-selected="${vs.tab === k}" class="${vs.tab === k ? 'active' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}</div>
        ${body}</div>`;
    },
    mount(root) {
      const vs = viewState.vocab;
      ui.delegate(root, {
        tab(el, e) { e.preventDefault(); vs.tab = el.dataset.v; if (location.hash !== '#/vocabulary') history.replaceState(null, '', '#/vocabulary'); LOS.app.refresh(); },
        open(el) { openVocab(el.dataset.id); },
        fstatus(el) { vs.status = el.value; LOS.app.refresh(); },
        flevel(el) { vs.level = el.value; LOS.app.refresh(); },
        fkind(el) { vs.kind = el.value; LOS.app.refresh(); },
        fdom(el) { vs.dom = el.value; LOS.app.refresh(); },
        fcgrade(el) { gradeFlash(root, +el.dataset.g); },
      });
      const q = root.querySelector('[data-q]');
      if (q) { q.addEventListener('input', U.debounce(() => { vs.q = q.value; LOS.app.refresh(); setTimeout(() => { const n = document.querySelector('[data-q]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); }, 250)); }
      const form = root.querySelector('#addv');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const learn = !!data.learn; delete data.learn;
        try {
          const item = LOS.learn.addCustomVocab(code(), data);
          if (learn) LOS.learn.introduceVocab(code(), [item.id], 'manual');
          LOS.store.save();
          ui.toast(`“${item.w}” saved`);
          form.reset();
        } catch (err) { ui.toast(err.message, 'errors'); }
      });
      if (vs.tab === 'cards') setupSwipe(root);
    },
  };
  function vocabRow(id) {
    const v = LOS.learn.vocabItem(code(), id);
    if (!v) return '';
    const st = lang().vocab[id];
    const status = vocabStatus(st);
    return `<div class="row clickable" data-act="open" data-id="${esc(id)}" role="button" tabindex="0"><div class="grow"><div class="title">${esc(v.w)} ${v.custom ? `<span class="faint xs">· yours</span>` : ''}</div><div class="meta">${esc(v.tr || v.def)}</div></div>
      <span class="pill outline hide-sm">${esc(LOS.shared.KIND_LABEL[v.k] || v.k)}</span><span class="pill">${esc(v.l)}</span>
      <span class="faint xs" style="width:86px;text-align:right">${status === 'new' ? 'new' : status === 'known' ? 'known' : LOS.learn.STAGE_LABEL[st.stage || 0]}</span></div>`;
  }

  // Flashcards with swipe (mobile) — reviews introduced items, due first.
  let fcQueue = [], fcIdx = 0;
  function flashcardsHTML() {
    const L = lang();
    const due = LOS.learn.dueVocab(code());
    const rest = Object.keys(L.vocab).filter((id) => !L.vocab[id].assumed && !due.includes(id) && LOS.learn.vocabItem(code(), id));
    fcQueue = due.concat(U.shuffle(rest)).slice(0, 30);
    fcIdx = 0;
    if (!fcQueue.length) return ui.empty({ icon: 'vocabulary', title: 'No cards yet', text: 'Introduce some new items first.', action: '<a class="btn primary" href="#/practice/vocab/new">Learn new items</a>' });
    return `<div style="max-width:520px;margin:0 auto"><div id="fc-host"></div><p class="swipe-hint">Tap to flip · swipe right = Good, left = Again · or use the buttons</p></div>`;
  }
  function renderFlip(root) {
    const host = root.querySelector('#fc-host');
    if (!host) return;
    const id = fcQueue[fcIdx];
    if (!id) { host.innerHTML = ui.empty({ icon: 'checkCircle', title: 'Deck finished', text: 'Great — grades were saved to your review schedule.' }); return; }
    const v = LOS.learn.vocabItem(code(), id);
    const flipped = host.dataset.flipped === '1';
    host.innerHTML = `<div class="dict flip fc" role="button" tabindex="0" aria-label="Flip card" style="min-height:260px;touch-action:pan-y">
      <div class="between"><span class="faint xs">${fcIdx + 1} / ${fcQueue.length}</span><span class="pill">${esc(v.l)}</span></div>
      <div class="dict-word mt-24" style="text-align:center">${esc(flipped ? v.tr || v.def : v.w)}</div>
      ${flipped ? `<div class="mt-16 muted" style="text-align:center">${esc(v.def)}</div><div class="mt-8 faint small" style="text-align:center"><em>${esc(v.ex)}</em></div>` : `<div class="mt-16 faint" style="text-align:center">${esc(v.pos || '')}</div>`}
    </div>${flipped ? `<div class="grade-row">${LOS.srs.GRADES.map((g, i) => `<button class="btn" data-act="fcgrade" data-g="${i}">${g}</button>`).join('')}</div>` : ''}`;
  }
  function gradeFlash(root, g) {
    const id = fcQueue[fcIdx];
    if (!id) return;
    LOS.learn.gradeVocab(code(), id, g);
    LOS.store.save();
    fcIdx++;
    root.querySelector('#fc-host').dataset.flipped = '0';
    renderFlip(root);
  }
  function setupSwipe(root) {
    const host = root.querySelector('#fc-host');
    if (!host) return;
    host.dataset.flipped = '0';
    renderFlip(root);
    const flip = () => { host.dataset.flipped = host.dataset.flipped === '1' ? '0' : '1'; renderFlip(root); const c = host.querySelector('.fc'); if (c) c.focus(); };
    host.addEventListener('click', (e) => { if (e.target.closest('.fc')) flip(); });
    host.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.fc')) { e.preventDefault(); flip(); } });
    let x0 = null;
    host.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    host.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 70) gradeFlash(root, dx > 0 ? 2 : 0);
    });
  }

  /* ---------------- Reading ---------------- */
  V.reading = {
    title: 'Reading',
    render() {
      if (!ready()) return notReady();
      const p = pack(), L = lang();
      const rec = LOS.learn.pickText(code(), 'reading', { rnd: () => 0.3 });
      const th = LOS.skills.theta(L, 'reading');
      return `<div class="view">
        <div class="page-head"><div><h1>Reading</h1><p class="sub">Comprehensible input slightly above your level, followed by questions, vocabulary extraction and a summary — reading is never passive here.</p></div><div class="pill accent">Your reading: ${th == null ? '—' : U.thetaInfo(th).sub}</div></div>
        ${rec ? `<a class="card card-link" href="#/practice/reading/${rec.id}"><div class="eyebrow">Recommended now</div><div class="between mt-8"><h2>${esc(rec.title)}</h2><span class="pill">${rec.l}</span></div><p class="muted mt-8">${esc(rec.text.slice(0, 160))}…</p></a>` : ''}
        ${U.LEVELS.map((l) => { const ts = p.texts.filter((t) => t.l === l); if (!ts.length) return ''; return `<div class="section"><div class="section-head"><h3>${l}</h3></div><div class="list">${ts.map((t) => `<a class="row clickable" href="#/practice/reading/${t.id}">${icon(t.kind === 'dialogue' ? 'message' : 'reading', 17)}<div class="grow"><div class="title">${esc(t.title)}</div><div class="meta">${U.words(t.text).length} words · ${t.qs.length} questions${L.seen.texts[t.id] ? ` · read ${U.relDate(L.seen.texts[t.id])}` : ''}</div></div>${t.d === 'medical' ? '<span class="pill accent">Medical</span>' : ''}</a>`).join('')}</div></div>`; }).join('')}
        <div class="section">${ui.notice('Add your own texts later via an AI backend (generateListeningTask / generateExercise) or by reading authentic articles and adding words to Vocabulary.', 'info')}</div>
      </div>`;
    },
  };

  /* ---------------- Listening ---------------- */
  V.listening = {
    title: 'Listening',
    render() {
      if (!ready()) return notReady();
      const p = pack(), L = lang();
      const th = LOS.skills.theta(L, 'listening');
      const lvl = U.LEVELS[LOS.learn.targetLevelIdx(code(), 'listening')];
      const stage = LOS.shared.LISTENING_STAGE[lvl];
      const week = LOS.progress.stats(code(), U.addDays(U.today(), -6));
      const month = LOS.progress.stats(code(), U.addDays(U.today(), -29));
      const med = LOS.learn.medicalPriority(code()) > 0.3;
      const sugg = (p.listeningSources[lvl] || []).concat(med ? p.listeningSources.medical || [] : []);
      const guided = LOS.learn.pickText(code(), 'listening', { rnd: () => 0.3 });
      return `<div class="view">
        <div class="page-head"><div><h1>Listening</h1><p class="sub">Planned listening with a clear objective: general → detailed → transcript → vocabulary → shadowing → summary.</p></div>
          <div class="cluster"><a class="btn" href="#/practice/listening/${guided ? guided.id : ''}">${icon('play', 14)} Guided exercise</a><a class="btn primary" href="#/practice/listening/external">${icon('plus', 15)} Log authentic listening</a></div></div>
        <div class="stats-row"><div class="stat"><span class="v">${th == null ? '—' : U.thetaInfo(th).sub}</span><span class="k">Listening level</span></div><div class="stat"><span class="v">${U.fmtMin(week.listening)}</span><span class="k">This week</span></div><div class="stat"><span class="v">${U.fmtMin(month.listening)}</span><span class="k">Last 30 days</span></div><div class="stat"><span class="v">${L.listening.length}</span><span class="k">Logged sessions</span></div></div>
        <div class="section"><div class="section-head"><h2>For your level · ${lvl}</h2><span class="faint small">${esc(stage.objective)}</span></div>
          <div class="cluster small muted mb">${stage.kinds.map((k) => `<span class="pill outline">${esc(k)}</span>`).join('')}</div>
          <div class="list mt-12">${sugg.map((s) => `<div class="row">${icon('listening', 17)}<div class="grow"><div class="title">${esc(s.type)}</div><div class="meta">${esc(s.desc)}</div></div><span class="faint small">${s.min} min</span></div>`).join('')}</div></div>
        <div class="section"><div class="section-head"><h2>Guided exercises</h2><span class="faint small">synthesised voice · adjustable speed</span></div>
          ${LOS.speech.ttsSupported ? '' : ui.notice('Speech synthesis is not available in this browser; guided exercises will fall back to reading.', 'info', 'warn')}
          <div class="list">${p.texts.map((t) => `<a class="row clickable" href="#/practice/listening/${t.id}">${icon('play', 15)}<div class="grow"><div class="title">${esc(t.title)}</div><div class="meta">${t.kind === 'dialogue' ? 'Dialogue' : 'Monologue'} · ${t.qs.length} questions</div></div><span class="pill">${t.l}</span></a>`).join('')}</div></div>
        <div class="section"><div class="section-head"><h2>Your listening log</h2></div>
          ${L.listening.length ? `<div class="list">${L.listening.slice(0, 30).map((e) => `<div class="row">${icon('listening', 16)}<div class="grow"><div class="title">${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)}</div><div class="meta">${U.fmtDate(e.date)} · ${e.minutes} min · difficulty ${e.difficulty}/5${e.words && e.words.length ? ` · ${e.words.length} new words` : ''}</div></div><span class="pill">${esc(e.level)}</span><span class="num small" style="width:44px;text-align:right">${e.comprehension}%</span></div>`).join('')}</div>` : ui.empty({ icon: 'listening', title: 'No listening logged yet', text: 'Paste a YouTube link or describe a podcast, log how much you understood, and extract new words.' })}</div>
        <div class="section"><div class="section-head"><h3>Progression</h3></div><div class="list">${U.LEVELS.map((l) => `<div class="row"><span class="pill ${l === lvl ? 'accent' : ''}">${l}</span><div class="grow small">${esc(LOS.shared.LISTENING_STAGE[l].kinds.join(', '))}</div></div>`).join('')}</div></div>
      </div>`;
    },
  };

  /* ---------------- Writing ---------------- */
  V.writing = {
    title: 'Writing',
    render() {
      if (!ready()) return notReady();
      const p = pack(), L = lang();
      const vs = (viewState.writing = viewState.writing || { level: 'all' });
      const rec = LOS.learn.pickWriting(code(), { rnd: () => 0.3 });
      const th = LOS.skills.theta(L, 'writing');
      const list = p.writing.filter((w) => vs.level === 'all' || w.l === vs.level);
      return `<div class="view">
        <div class="page-head"><div><h1>Writing</h1><p class="sub">From messages to nuanced argument. Every text gets corrections ("your sentence → corrected → more natural → why"), eight dimension scores and a level estimate.</p></div>
          <div class="cluster"><a class="btn" href="#/practice/writing/free">${icon('writing', 15)} Free writing</a>${rec ? `<a class="btn primary" href="#/practice/writing/${rec.id}">${icon('play', 14)} Recommended</a>` : ''}</div></div>
        <div class="stats-row"><div class="stat"><span class="v">${th == null ? '—' : U.thetaInfo(th).sub}</span><span class="k">Writing level</span></div><div class="stat"><span class="v">${L.writings.length}</span><span class="k">Texts written</span></div><div class="stat"><span class="v">${L.writings.length ? U.round(U.avg(L.writings.slice(0, 5).map((w) => w.overall || 0)), 1) : '—'}</span><span class="k">Recent average /5</span></div></div>
        ${rec ? `<a class="card card-link mt-32" href="#/practice/writing/${rec.id}"><div class="eyebrow">Recommended prompt</div><div class="between mt-8"><h2>${esc(rec.title)}</h2><span class="pill">${rec.l}</span></div><p class="muted mt-8">${esc(rec.p)}</p><div class="cluster mt-12"><span class="pill outline">${esc(rec.genre)}</span><span class="faint small">${rec.words[0]}–${rec.words[1]} words</span></div></a>` : ''}
        <div class="section"><div class="section-head"><h2>Prompts</h2>${ui.chips('wlevel', [['all', 'All']].concat(U.LEVELS.map((l) => [l, l])), vs.level)}</div>
          <div class="list">${list.map((w) => `<a class="row clickable" href="#/practice/writing/${w.id}">${icon('writing', 16)}<div class="grow"><div class="title">${esc(w.title)}</div><div class="meta">${esc(w.genre)} · ${w.reg} · ${w.words[0]}–${w.words[1]} words${L.seen.prompts[w.id] ? ` · done ${U.relDate(L.seen.prompts[w.id])}` : ''}</div></div>${w.d === 'medical' ? '<span class="pill accent">Medical</span>' : w.d === 'professional' ? '<span class="pill outline">Work</span>' : ''}<span class="pill">${w.l}</span></a>`).join('')}</div></div>
        <div class="section"><div class="section-head"><h2>Your texts</h2></div>${L.writings.length ? `<div class="list">${L.writings.slice(0, 30).map((w) => `<div class="row clickable" data-act="openW" data-id="${w.id}">${icon('reading', 16)}<div class="grow"><div class="title">${esc(w.title)}</div><div class="meta">${U.fmtDate(w.date)} · ${w.words} words${w.estTheta != null ? ` · reads like ${U.thetaInfo(w.estTheta).sub}` : ''}</div></div>${ui.score5(w.overall)}</div>`).join('')}</div>` : ui.empty({ icon: 'writing', title: 'No texts yet', text: 'Start with the recommended prompt.' })}</div>
        <div class="section">${ui.notice('Feedback runs locally with transparent rules targeted at Italian speakers (interference, false friends, prepositions, tenses, register). For full rewriting of any sentence, connect an AI backend in Settings — the interface stays the same.', 'info')}</div>
      </div>`;
    },
    mount(root) {
      ui.delegate(root, {
        wlevel(el) { viewState.writing.level = el.dataset.v; LOS.app.refresh(); },
        openW(el) {
          const w = lang().writings.find((x) => x.id === el.dataset.id);
          if (!w) return;
          ui.modal({ title: w.title, wide: true, body: `<p class="faint small">${U.fmtDate(w.date)} · ${w.level} · ${w.words} words</p><div class="mt-16" style="white-space:pre-wrap;line-height:1.7">${esc(w.text)}</div>${w.scores && Object.keys(w.scores).length ? `<div class="score-rows mt-24">${LOS.shared.WRITING_DIMENSIONS.map(([k, l]) => `<span class="lbl">${l}</span>${ui.score5(w.scores[k])}`).join('')}</div>` : ''}` });
        },
      });
    },
  };

  /* ---------------- Speaking ---------------- */
  V.speaking = {
    title: 'Speaking',
    render() {
      if (!ready()) return notReady();
      const p = pack(), L = lang();
      const rec = LOS.learn.pickSpeaking(code(), { rnd: () => 0.3 });
      const th = LOS.skills.theta(L, 'speaking');
      const caps = [['Microphone recording', LOS.speech.recSupported], ['Live speech recognition', LOS.speech.srSupported], ['Speech synthesis (models)', LOS.speech.ttsSupported]];
      const byType = U.groupBy(p.speaking, (t) => t.type);
      return `<div class="view">
        <div class="page-head"><div><h1>Speaking</h1><p class="sub">Timed speaking tasks: describe, explain, debate, role-play, present, interview, solve problems, respond spontaneously.</p></div>${rec ? `<a class="btn primary" href="#/practice/speaking/${rec.id}">${icon('speaking', 15)} ${esc(rec.title)}</a>` : ''}</div>
        <div class="stats-row"><div class="stat"><span class="v">${th == null ? '—' : U.thetaInfo(th).sub}</span><span class="k">Speaking level</span></div><div class="stat"><span class="v">${L.speakings.length}</span><span class="k">Tasks done</span></div><div class="stat"><span class="v">${L.speakings.length ? U.round(U.avg(L.speakings.slice(0, 5).map((w) => w.overall || 0)), 1) : '—'}</span><span class="k">Recent self-rating /5</span></div></div>
        <div class="section"><div class="cluster">${caps.map(([l, ok]) => `<span class="pill ${ok ? 'ok' : ''}">${icon(ok ? 'check' : 'x', 12)} ${l}</span>`).join('')}</div></div>
        ${Object.keys(byType).map((ty) => `<div class="section"><div class="section-head"><h3>${esc(U.cap(ty))}</h3></div><div class="list">${byType[ty].map((t) => `<a class="row clickable" href="#/practice/speaking/${t.id}">${icon('speaking', 16)}<div class="grow"><div class="title">${esc(t.title)}</div><div class="meta">${esc(t.p)}</div></div>${t.d === 'medical' ? '<span class="pill accent">Medical</span>' : ''}<span class="faint small">${Math.round(t.secs / 60 * 10) / 10} min</span><span class="pill">${t.l}</span></a>`).join('')}</div></div>`).join('')}
        <div class="section"><div class="section-head"><h2>History</h2></div>${L.speakings.length ? `<div class="list">${L.speakings.slice(0, 20).map((s) => `<div class="row">${icon('speaking', 16)}<div class="grow"><div class="title">${esc(s.title)}</div><div class="meta">${U.fmtDate(s.date)}${s.secs ? ` · ${s.secs}s` : ''}${s.transcript ? ` · ${U.words(s.transcript).length} words` : ''}</div></div>${ui.score5(s.overall)}</div>`).join('')}</div>` : ui.empty({ icon: 'speaking', title: 'No speaking yet', text: 'Your first task takes about two minutes.' })}</div>
        <div class="section">${ui.notice('Fluency (speed, fillers), lexical variety and rule-based accuracy are computed locally from the transcript. Reliable pronunciation scoring needs a dedicated speech-assessment API (phoneme-level scoring) — the rubric and storage are ready for it.', 'info')}</div>
      </div>`;
    },
  };

  /* ---------------- Think in the language ---------------- */
  V.think = {
    title: 'Think',
    render() {
      if (!ready()) return notReady();
      const p = pack();
      const T = LOS.shared.THINK_TYPES;
      const counts = U.countBy(p.think, (t) => t.type);
      return `<div class="view">
        <div class="page-head"><div><h1>Think in ${esc(p.name)}</h1><p class="sub">Short, timed prompts that force you to answer directly — no Italian in between. At C1–C2 the prompts add ambiguity, abstraction, nuance, irony and register.</p></div><a class="btn primary" href="#/practice/think/mix">${icon('zap', 15)} Mixed drill · 5 prompts</a></div>
        <div class="mod-grid">${Object.entries(T).map(([k, t]) => `<a class="mod" href="#/practice/think/${k}"><div class="ic">${icon(k === 'rapid' ? 'zap' : k === 'monologue' ? 'think' : k === 'situational' ? 'globe' : k === 'describe' ? 'eye' : k === 'synonym' ? 'layers' : 'message', 17)}</div><div class="ttl">${esc(t.label)}</div><div class="muted small">${esc(t.desc)}</div><div class="cnt">${counts[k] || 0} prompts · ${t.secs}s each</div></a>`).join('')}</div>
        <div class="section">${ui.notice('Rule of thumb: if you notice yourself translating, simplify the idea instead. A simple sentence in the language beats a perfect sentence via Italian.', 'think', 'accent')}</div>
      </div>`;
    },
  };
})();

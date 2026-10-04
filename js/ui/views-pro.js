/* VIEWS — Medical Language & Professional Communication. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const V = LOS.views;
  const code = () => LOS.store.active();
  const pack = () => LOS.lang.get(code());
  const lang = () => LOS.store.lang(code());
  const state = { medical: 'all', professional: 'all' };

  function list(area) { return area === 'medical' ? pack().medical : pack().professional; }
  function cats(area) { return area === 'medical' ? LOS.shared.MED_CATS : LOS.shared.PRO_CATS; }

  function overview(area) {
    const L = lang();
    if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'globe', title: `Set up ${esc(ui.langName(code()))} first`, action: `<a class="btn primary" href="#/welcome/${code()}">Start</a>` })}</div>`;
    const isMed = area === 'medical';
    const mods = list(area);
    const cat = state[area];
    const shown = mods.filter((m) => cat === 'all' || m.cat === cat);
    const usedCats = cats(area).filter(([k]) => mods.some((m) => m.cat === k));
    const rec = LOS.learn.pickScenario(code(), area, { rnd: () => 0.4 });
    const doneCount = (m) => (m.scen || []).filter((_, i) => L.seen.scenarios[m.id + ':' + i]).length;
    const goalOn = L.goals.includes(isMed ? 'medical' : 'work');
    return `<div class="view">
      <div class="page-head"><div><h1>${isMed ? 'Medical Language' : 'Professional Communication'}</h1>
        <p class="sub">${isMed ? 'Patient communication, hospital teamwork, research and anaesthesiology / critical-care language — practised as real scenarios.' : 'Pragmatics for work: not just "I disagree", but how a competent professional actually says it.'}</p></div>
        ${rec ? `<a class="btn primary" href="#/practice/scenario/${rec.module.id}/${rec.idx}">${icon('play', 14)} ${esc(rec.module.title)}</a>` : ''}</div>
      ${isMed ? ui.notice('This module teaches <strong>language and professional communication</strong>. It is not a clinical source and does not replace guidelines, protocols or medical training. Example numbers and drugs are illustrative.', 'info') : ''}
      <div class="between mt-24" style="flex-wrap:wrap">
        ${ui.chips('cat', [['all', 'All']].concat(usedCats), cat)}
        <label class="check small"><input type="checkbox" data-act="goal" ${goalOn ? 'checked' : ''}> ${isMed ? 'Integrate medical language into all my daily activities' : 'Prioritise work communication in my plan'}</label></div>
      <div class="mod-grid mt-24">${shown.map((m) => `<a class="mod" href="#/${area}/${m.id}"><div class="between"><div class="ic">${icon(m.icon || (isMed ? 'medical' : 'professional'), 17)}</div><span class="pill">${m.l}</span></div>
        <div class="ttl">${esc(m.title)}</div><div class="faint xs">${esc((cats(area).find((c) => c[0] === m.cat) || [])[1] || '')}</div>
        <div class="cnt">${m.expr.length} expressions${m.col && m.col.length ? ` · ${m.col.length} collocations` : ''} · ${(m.scen || []).length} scenario${(m.scen || []).length === 1 ? '' : 's'}${doneCount(m) ? ` · ${doneCount(m)} done` : ''}</div></a>`).join('')}</div>
    </div>`;
  }

  function detail(area, id) {
    const m = pack().index.modules[id];
    if (!m) return `<div class="view">${ui.empty({ title: 'Module not found', icon: 'errors' })}</div>`;
    const L = lang();
    const isPro = !!(m.expr[0] && m.expr[0].weak);
    return `<div class="view narrow">
      <a class="small" href="#/${area}">${icon('chevronLeft', 14)} ${area === 'medical' ? 'Medical Language' : 'Professional Communication'}</a>
      <div class="page-head mt-8"><div><div class="cluster"><span class="pill">${m.l}</span><span class="faint small">${esc((cats(area).find((c) => c[0] === m.cat) || [])[1] || '')}</span></div><h1 class="mt-8">${esc(m.title)}</h1><p class="sub">${esc(m.intro || '')}</p></div></div>
      <div class="section"><div class="section-head"><h3>Scenarios</h3></div><div class="list">${(m.scen || []).map((sc, i) => `<div class="row">${icon(sc.mode === 'write' ? 'writing' : 'speaking', 17)}<div class="grow"><div>${esc(sc.p)}</div><div class="meta">${sc.mode === 'write' ? 'Written' : 'Spoken'}${L.seen.scenarios[m.id + ':' + i] ? ` · done ${U.relDate(L.seen.scenarios[m.id + ':' + i])}` : ''}</div></div><a class="btn sm primary" href="#/practice/scenario/${m.id}/${i}">Practice</a></div>`).join('')}</div></div>
      <div class="section"><div class="section-head"><h3>${isPro ? 'From plain to professional' : 'Key expressions'}</h3><span class="faint small">${m.expr.length}</span></div>
        <div class="card flat"><div class="list">${m.expr.map((e, i) => `<div class="expr"><div>${e.weak ? `<div class="weak">${esc(e.weak)}</div>` : ''}<div class="p">${esc(e.p)}</div>${e.n ? `<div class="n">${esc(e.n)}</div>` : ''}</div><div class="cluster">${ui.speakBtn(e.p, code())}<button class="btn ghost icon sm" data-act="addExpr" data-i="${i}" title="Add to vocabulary" aria-label="Add to vocabulary">${icon('plus', 15)}</button></div></div>`).join('')}</div></div></div>
      ${m.col && m.col.length ? `<div class="section"><div class="section-head"><h3>Collocations</h3><button class="btn ghost sm" data-act="addCols">${icon('plus', 14)} Add all to vocabulary</button></div><div class="cluster">${m.col.map((c) => `<span class="pill outline" title="${esc(c.n)}">${esc(c.p)}</span>`).join('')}</div></div>` : ''}
    </div>`;
  }

  function addPhrase(m, phrase, note, area) {
    const L = lang();
    const exists = L.custom.find((v) => U.norm(v.w) === U.norm(phrase)) || LOS.learn.vocabItems(code()).find((v) => U.norm(v.w) === U.norm(phrase));
    if (exists) { if (!L.vocab[exists.id]) LOS.learn.introduceVocab(code(), [exists.id], area); return false; }
    const item = LOS.learn.addCustomVocab(code(), { w: phrase, def: note || m.title, ex: phrase, l: m.l, k: U.words(phrase).length > 3 ? 'expression' : 'collocation', d: area === 'medical' ? 'medical' : 'professional', ctx: m.title, src: area });
    LOS.learn.introduceVocab(code(), [item.id], area);
    return true;
  }

  function makeView(area) {
    return {
      title: area === 'medical' ? 'Medical Language' : 'Professional Communication',
      render(params) { return params[0] ? detail(area, params[0]) : overview(area); },
      mount(root, params) {
        ui.delegate(root, {
          cat(el) { state[area] = el.dataset.v; LOS.app.refresh(); },
          goal(el) {
            const g = area === 'medical' ? 'medical' : 'work';
            const L = lang();
            L.goals = el.checked ? Array.from(new Set(L.goals.concat([g]))) : L.goals.filter((x) => x !== g);
            LOS.store.save();
            ui.toast(el.checked ? 'Your daily plan will now weave this in' : 'Removed from priorities');
          },
          addExpr(el) {
            const m = pack().index.modules[params[0]];
            const e = m.expr[+el.dataset.i];
            const added = addPhrase(m, e.p, e.n || (e.weak ? `Instead of: ${e.weak}` : ''), area);
            LOS.store.save();
            ui.toast(added ? 'Added to vocabulary' : 'Already in your vocabulary');
          },
          addCols() {
            const m = pack().index.modules[params[0]];
            let n = 0;
            m.col.forEach((c) => { if (addPhrase(m, c.p, c.n, area)) n++; });
            LOS.store.save();
            ui.toast(n ? `${n} collocations added` : 'Already in your vocabulary');
          },
        });
      },
    };
  }
  V.medical = makeView('medical');
  V.professional = makeView('professional');
})();

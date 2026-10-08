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
  const state = { medical: 'all', professional: 'all', abroad: 'all', medView: 'path', proView: 'path', abrView: 'path' };
  const areaOf = (id) => (id.includes('-pro-') ? 'professional' : id.includes('-abr-') ? 'abroad' : 'medical');

  function list(area) { return area === 'medical' ? pack().medical : area === 'abroad' ? pack().abroad : pack().professional; }
  function cats(area) { return area === 'medical' ? LOS.shared.MED_CATS : area === 'abroad' ? LOS.shared.ABROAD_CATS : LOS.shared.PRO_CATS; }

  const STATE_PILL = { done: ['ok', 'Done'], ready: ['accent', 'Ready for the scenarios'], learning: ['', 'Learning the language'], locked: ['', 'Locked'] };
  function pathwayHTML(key) {
    const P = LOS.ped.pathway(code(), key);
    if (!P || !P.steps.length) return '';
    return `<div class="section"><p class="muted small">${esc(P.intro)}</p>
      <div class="between mt-12 small"><span class="muted">${P.done} of ${P.steps.length} steps done</span>${P.next ? `<span>Next: <strong>${esc(P.next.title)}</strong></span>` : ''}</div>
      <div class="list mt-12">${P.steps.map((st, k) => {
        const lvHead = P.levels && st.level && (k === 0 || P.steps[k - 1].level !== st.level) ? `<div class="path-level eyebrow mt-16">Level ${st.level} · ${esc(P.levels[st.level - 1] || '')}</div>` : '';
        const m = st.mods[0];
        const [cls, label] = STATE_PILL[st.state];
        const locked = st.state === 'locked';
        return lvHead + `<div class="row path-step ${st.state}"><span class="num faint" style="width:26px">${st.n}</span>
          <div class="grow"><div class="cluster"><strong>${esc(st.title)}</strong><span class="pill ${cls}">${locked ? icon('lock', 12) + ' ' : ''}${label}</span><span class="pill outline">${esc(m.l)}</span></div>
            <div class="faint xs mt-4">${esc(st.mods.map((x) => x.title).join(' · '))}</div><div class="faint xs mt-4">Required language: ${st.known}/${st.total} items learned${st.mods.length > 1 ? ` · ${st.mods.length} modules` : ''}${locked ? ' · unlocks when the previous step\'s language is 70% learned' : ''}</div>
            <div class="mt-8" style="max-width:320px">${ui.bar(Math.round(st.pct * 100))}</div></div>
          <div class="cluster">${st.mods.map((x) => `<a class="btn sm ghost" href="#/${areaOf(x.id)}/${x.id}">${st.mods.length > 1 ? esc(x.title) : 'Open'}</a>`).join('')}
            ${locked ? '' : st.pct < 0.7 ? `<a class="btn sm primary" href="#/practice/lesson/scenario/${m.id}">Learn the language</a>` : `<a class="btn sm" href="#/practice/scenario/${m.id}/0">Scenario</a><a class="btn sm primary" href="#/practice/sim/${m.id}/0">Simulate</a>`}</div></div>`;
      }).join('')}</div></div>`;
  }

  function countryHTML() {
    const L = lang();
    const list = (LOS.COUNTRIES || {})[code()] || [];
    const cur = (L.target && L.target.country) || '';
    const c = list.find((x) => x.label === cur || x.id === cur);
    return `<div class="card soft mt-16"><div class="between" style="flex-wrap:wrap;gap:12px"><div><div class="eyebrow">Target country</div><div class="small muted">Register, vocabulary and habits differ between countries.</div></div>
      <select class="select" style="width:auto" data-act="country" aria-label="Target country"><option value="">Choose…</option>${list.map((x) => `<option value="${esc(x.label)}" ${c && c.id === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
      ${c ? `<ul class="small mt-12 lesson">${c.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div>`;
  }
  function domainNote() {
    const d = LOS.goals.domainOf();
    const label = (LOS.goals.DOMAINS.find((x) => x[0] === d) || [])[1];
    if (!d || d === 'medicine' || d === 'healthcare') return '';
    return `<p class="faint small mt-12">Your field: <strong>${esc(label)}</strong>. This track covers workplace communication for every field; specialised ${esc(label.toLowerCase())} vocabulary comes from your own texts (<a href="#/library">Input library</a>)${LOS.AI.active() ? ' and from your AI tutor' : ''}.</p>`;
  }

  function overview(area) {
    const L = lang();
    if (!L || !L.onboarded) return `<div class="view narrow">${ui.empty({ icon: 'globe', title: `Set up ${esc(ui.langName(code()))} first`, action: `<a class="btn primary" href="#/welcome/${code()}">Start</a>` })}</div>`;
    const isMed = area === 'medical';
    const isAbr = area === 'abroad';
    const vkey = isMed ? 'medView' : isAbr ? 'abrView' : 'proView';
    const mods = list(area);
    const cat = state[area];
    const shown = mods.filter((m) => cat === 'all' || m.cat === cat);
    const usedCats = cats(area).filter(([k]) => mods.some((m) => m.cat === k));
    const rec = isAbr ? null : LOS.learn.pickScenario(code(), area, { rnd: () => 0.4 });
    const doneCount = (m) => (m.scen || []).filter((_, i) => L.seen.scenarios[m.id + ':' + i]).length;
    const goalOn = L.goals.includes(isMed ? 'medical' : 'work');
    return `<div class="view">
      <div class="page-head"><div><h1>${isMed ? 'Medical Language' : isAbr ? 'Life Abroad' : 'Professional Communication'}</h1>
        <p class="sub">${isMed ? 'Patient communication, hospital teamwork, research and anaesthesiology / critical-care language — practised as real scenarios.' : isAbr ? 'Not just "learn the language": function in another country — arrival, paperwork, home, health, work and friends.' : 'Pragmatics for work: not just "I disagree", but how a competent professional actually says it.'}</p></div>
        ${(() => { const pk = isMed ? 'medical' : isAbr ? 'abroad' : 'professional'; const nx = LOS.ped.pathway(code(), pk) && LOS.ped.pathway(code(), pk).next; if (nx) { const m0 = nx.mods[0]; return `<a class="btn primary" href="${nx.pct < 0.7 ? '#/practice/lesson/scenario/' + m0.id : '#/practice/scenario/' + m0.id + '/0'}">${icon('play', 14)} Next step: ${esc(nx.title.split(':')[0])}</a>`; } return rec ? `<a class="btn primary" href="#/practice/scenario/${rec.module.id}/${rec.idx}">${icon('play', 14)} ${esc(rec.module.title)}</a>` : ''; })()}</div>
      ${isMed ? ui.notice('This module teaches <strong>language and professional communication</strong>. It is not a clinical source and does not replace guidelines, protocols or medical training. Example numbers and drugs are illustrative.', 'info') : ''}
      ${isAbr ? countryHTML() : ''}
      ${!isMed && !isAbr ? domainNote() : ''}
      <div class="mt-24">${ui.chips('view', isMed ? [['path', 'Pathway'], ['anesthesia', 'Anaesthesia & ICU'], ['all', 'All modules']] : [['path', 'Pathway'], ['all', 'All modules']], state[vkey])}</div>
      ${state[vkey] !== 'all' ? pathwayHTML(isMed ? (state.medView === 'path' ? 'medical' : 'anesthesia') : isAbr ? 'abroad' : 'professional') : `<div class="between mt-24" style="flex-wrap:wrap">
        ${ui.chips('cat', [['all', 'All']].concat(usedCats), cat)}
        ${isAbr ? '<span></span>' : `<label class="check small"><input type="checkbox" data-act="goal" ${goalOn ? 'checked' : ''}> ${isMed ? 'Integrate medical language into all my daily activities' : 'Prioritise work communication in my plan'}</label>`}</div>
      <div class="mod-grid mt-24">${shown.map((m) => `<a class="mod" href="#/${area}/${m.id}"><div class="between"><div class="ic">${icon(m.icon || (isMed ? 'medical' : isAbr ? 'globe' : 'professional'), 17)}</div><span class="pill">${m.l}</span></div>
        <div class="ttl">${esc(m.title)}</div><div class="faint xs">${esc((cats(area).find((c) => c[0] === m.cat) || [])[1] || '')}</div>
        <div class="cnt">${m.expr.length} expressions${m.col && m.col.length ? ` · ${m.col.length} collocations` : ''} · ${(m.scen || []).length} scenario${(m.scen || []).length === 1 ? '' : 's'}${doneCount(m) ? ` · ${doneCount(m)} done` : ''}</div></a>`).join('')}</div>`}
    </div>`;
  }

  function detail(area, id) {
    const m = pack().index.modules[id];
    if (!m) return `<div class="view">${ui.empty({ title: 'Module not found', icon: 'errors' })}</div>`;
    const L = lang();
    const isPro = !!(m.expr[0] && m.expr[0].weak);
    return `<div class="view narrow">
      <a class="small" href="#/${area}">${icon('chevronLeft', 14)} ${area === 'medical' ? 'Medical Language' : area === 'abroad' ? 'Life Abroad' : 'Professional Communication'}</a>
      <div class="page-head mt-8"><div><div class="cluster"><span class="pill">${m.l}</span><span class="faint small">${esc((cats(area).find((c) => c[0] === m.cat) || [])[1] || '')}</span></div><h1 class="mt-8">${esc(m.title)}</h1><p class="sub">${esc(m.intro || '')}</p></div></div>
      ${(() => {
        const pr = LOS.ped.moduleProgress(code(), m);
        const items = (m._req || []).map((id) => LOS.learn.vocabItem(code(), id)).filter(Boolean);
        if (!items.length) return '';
        return `<div class="section"><div class="section-head"><h3>Required language</h3><span class="faint small">${pr.known}/${pr.total} learned</span></div>
          <p class="muted small">Taught first — see, hear, recognize, recall, complete — then the scenarios go controlled → guided → free.</p>
          <div class="cluster mt-8">${items.slice(0, 24).map((v) => { const st = LOS.ped.vstage(L.vocab[v.id]); return `<span class="pill ${st >= 3 ? 'ok' : st >= 1 ? 'accent' : 'outline'}" title="${esc(v.tr || v.def || '')} · ${esc(LOS.ped.VSTAGES[st])}">${esc(v.w)}</span>`; }).join('')}</div>
          <div class="cluster mt-12"><a class="btn sm primary" href="#/practice/lesson/scenario/${m.id}">Learn the language</a><a class="btn sm" href="#/practice/vocab/${encodeURIComponent(items.filter((v) => !L.vocab[v.id]).slice(0, 6).map((v) => v.id).join(',') || 'new')}">New items only</a></div></div>`;
      })()}
      <div class="section"><div class="section-head"><h3>Scenarios</h3></div><div class="list">${(m.scen || []).map((sc, i) => `<div class="row">${icon(sc.mode === 'write' ? 'writing' : 'speaking', 17)}<div class="grow"><div>${esc(sc.p)}</div><div class="meta">${sc.mode === 'write' ? 'Written' : 'Spoken'}${L.seen.scenarios[m.id + ':' + i] ? ` · done ${U.relDate(L.seen.scenarios[m.id + ':' + i])}` : ''}</div></div><div class="cluster"><a class="btn sm" href="#/practice/scenario/${m.id}/${i}">Step by step</a><a class="btn sm primary" href="#/practice/sim/${m.id}/${i}">Simulate the conversation</a></div></div>`).join('')}</div></div>
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
      title: area === 'medical' ? 'Medical Language' : area === 'abroad' ? 'Life Abroad' : 'Professional Communication',
      render(params) { return params[0] ? detail(area, params[0]) : overview(area); },
      mount(root, params) {
        ui.delegate(root, {
          cat(el) { state[area] = el.dataset.v; LOS.app.refresh(); },
          view(el) { state[area === 'medical' ? 'medView' : area === 'abroad' ? 'abrView' : 'proView'] = el.dataset.v; LOS.app.refresh(); },
          country(el) { const L = lang(); L.target = Object.assign({ type: 'work_abroad' }, L.target, { country: el.value }); LOS.store.save(); LOS.app.refresh(); },
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
  V.abroad = makeView('abroad');
})();

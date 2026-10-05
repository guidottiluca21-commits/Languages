/* VIEWS — Pronunciation (per language) and Compare Languages (all languages side by side). */
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

  /* ---------------- Pronunciation ---------------- */
  const pron = { open: null };
  V.pronunciation = {
    title: 'Pronunciation',
    render() {
      const p = pack();
      if (!p) return `<div class="view narrow">${ui.empty({ icon: 'globe', title: 'Choose a language first' })}</div>`;
      const mods = p.pronunciation || [];
      const words = LOS.learn.vocabItems(code()).filter((v) => v.ipa).slice(0, 24);
      const tts = LOS.speech.ttsSupported;
      return `<div class="view">
        <div class="page-head"><div><div class="eyebrow">${ui.langFlag(code())} ${esc(p.native)}</div><h1 class="mt-4">Pronunciation</h1>
          <p class="sub">The sounds that make ${esc(p.name)} different from Italian. Listen at normal and slow speed, then repeat aloud — ideally record yourself in Speaking.</p></div></div>
        ${tts ? '' : ui.notice('This browser has no speech synthesis: IPA and rules are shown, but audio playback is not available.', 'info')}
        ${p.pronunciationFocus && p.pronunciationFocus.length ? `<div class="section"><div class="eyebrow">Focus for Italian speakers</div><div class="cluster mt-8">${p.pronunciationFocus.map((f) => `<span class="pill outline">${esc(f)}</span>`).join('')}</div></div>` : ''}
        ${mods.length ? `<div class="section stack" style="--gap:14px">${mods.map((m) => {
          const open = pron.open === m.id;
          return `<div class="card ${open ? '' : 'soft'}"><button class="between pron-head" data-act="toggle" data-id="${esc(m.id)}" aria-expanded="${open}"><span><span class="pill">${esc(m.l)}</span> <strong>${esc(m.title)}</strong> <span class="faint small">· ${esc(m.focus || '')}</span></span>${icon(open ? 'chevronDown' : 'chevronRight', 16)}</button>
            ${open ? `<ul class="mt-12 small">${m.rule.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
              <div class="list mt-12">${m.items.map((it) => `<div class="row" style="min-height:44px"><span class="grow"><strong>${esc(it.w)}</strong> <span class="faint">${esc(it.ipa || '')}</span>${it.note ? ` <span class="muted small">· ${esc(it.note)}</span>` : ''}</span>${ui.speakBtn(it.w, code(), 'Listen')}${tts ? `<button class="btn ghost sm" data-act="speak" data-text="${esc(it.w)}" data-code="${esc(code())}" data-rate="0.6">Slow</button>` : ''}</div>`).join('')}</div>
              ${m.pairs && m.pairs.length ? `<div class="mt-16"><div class="eyebrow">Minimal pairs — can you hear the difference?</div><div class="cluster mt-8">${m.pairs.map(([a, b]) => `<span class="pill outline">${esc(a)} ${tts ? `<button class="btn ghost icon sm" data-act="speak" data-text="${esc(a)}" data-code="${esc(code())}" data-rate="0.7" aria-label="Listen: ${esc(a)}">${icon('volume', 13)}</button>` : ''} / ${esc(b)} ${tts ? `<button class="btn ghost icon sm" data-act="speak" data-text="${esc(b)}" data-code="${esc(code())}" data-rate="0.7" aria-label="Listen: ${esc(b)}">${icon('volume', 13)}</button>` : ''}</span>`).join('')}</div></div>` : ''}
              ${m.tip ? `<div class="mt-16">${ui.notice(esc(m.tip), 'sparkle', 'accent')}</div>` : ''}` : ''}</div>`;
        }).join('')}</div>` : `<div class="section">${ui.notice(`A dedicated pronunciation guide for ${esc(p.name)} is not written yet. Use the IPA in your vocabulary cards and the listening activities.`, 'info')}</div>`}
        ${words.length ? `<div class="section"><div class="section-head"><h2>Words from your curriculum</h2><span class="faint small">with IPA</span></div><div class="list">${words.map((v) => `<div class="row" style="min-height:44px"><span class="grow">${esc(v.w)} <span class="faint">${esc(v.ipa)}</span>${v.stress ? ` <span class="muted small">· ${esc(v.stress)}</span>` : ''}</span>${ui.speakBtn(v.w, code())}</div>`).join('')}</div></div>` : ''}
        <p class="faint xs mt-24">Audio uses your device's speech synthesis — quality depends on the installed voices (Settings → Languages → Voice). Automatic scoring of your pronunciation is not available offline; the speaking trainer records you so you can compare.</p>
      </div>`;
    },
    mount(root) {
      ui.delegate(root, { toggle(el) { pron.open = pron.open === el.dataset.id ? null : el.dataset.id; LOS.app.refresh(); } });
    },
  };

  /* ---------------- Compare languages ---------------- */
  const cmp = { id: null };
  V.compare = {
    title: 'Compare languages',
    render() {
      const list = LOS.compare || [];
      const cur = list.find((x) => x.id === cmp.id) || list[0];
      const codes = ['it'].concat(LOS.lang.codes());
      const studying = new Set(LOS.store.studying());
      const nameOf = (c) => (c === 'it' ? '🇮🇹 Italiano' : `${(LOS.lang.get(c) || {}).flag || ''} ${(LOS.lang.get(c) || {}).native || c}`);
      return `<div class="view">
        <div class="page-head"><div><h1>Compare languages</h1>
          <p class="sub">One idea, several systems. Use this to understand <em>why</em> each language builds the sentence differently — not to translate word by word. Your daily practice stays inside one language at a time.</p></div></div>
        <div class="cluster">${list.map((x) => `<button class="chip ${x === cur ? 'active' : ''}" aria-pressed="${x === cur}" data-act="pick" data-v="${esc(x.id)}">${esc(x.title)}</button>`).join('')}</div>
        ${cur ? `<div class="section"><div class="cluster"><span class="pill">${esc(cur.l)}</span><span class="pill outline">${esc(cur.focus)}</span></div><h2 class="mt-8">${esc(cur.title)}</h2>
          <div class="list mt-16">${codes.filter((c) => cur.s[c]).map((c) => `<div class="row cmp-row ${studying.has(c) ? '' : 'faint-row'}"><span class="cmp-lang">${esc(nameOf(c))}</span><span class="grow">${esc(cur.s[c])}</span>${c === 'it' ? '' : ui.speakBtn(cur.s[c].split(' / ')[0], c)}</div>`).join('')}</div>
          <div class="section-head mt-24"><h3>What is different</h3></div><ul class="small">${cur.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
      </div>`;
    },
    mount(root) { ui.delegate(root, { pick(el) { cmp.id = el.dataset.v; LOS.app.refresh(); } }); },
  };
})();

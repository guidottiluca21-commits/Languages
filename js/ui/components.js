/* UI COMPONENTS — small, composable HTML-string builders + overlays + event delegation. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const esc = U.esc;
  const icon = LOS.icon;

  const SKILL_ICON = { grammar: 'grammar', vocabulary: 'vocabulary', reading: 'reading', listening: 'listening', writing: 'writing', speaking: 'speaking', think: 'think', review: 'review', scenario: 'medical' };
  const CAT_OF = { review: 'review', listening: 'listening', grammar: 'study', vocabulary: 'study', reading: 'study', writing: 'study', speaking: 'study', think: 'study', scenario: 'study', micro: 'study', lesson: 'study', remedy: 'review' };

  const ui = (LOS.ui = {
    esc, icon, SKILL_ICON, CAT_OF,

    bar(pct, cls = '', label) {
      const v = U.clamp(Math.round(pct || 0), 0, 100);
      return `<div class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"${label ? ` aria-label="${esc(label)}"` : ''}><i data-w="${v}"></i></div>`;
    },
    /** Six dots = A1…C2; filled up to the current band, half dot for the upper half of a band. */
    dots(theta, cls = '') {
      if (theta == null) return `<span class="dots ${cls}">${'<i></i>'.repeat(6)}</span>`;
      const info = U.thetaInfo(theta);
      let out = '';
      for (let i = 0; i < 6; i++) out += `<i class="${i < info.band ? 'on' : i === info.band && info.frac >= 0.5 ? 'half' : ''}"></i>`;
      return `<span class="dots ${cls}" aria-label="${info.sub}">${out}</span>`;
    },
    /** 1–5 score as ●●●○○ */
    score5(v) {
      const n = Math.round(v || 0);
      let out = '';
      for (let i = 1; i <= 5; i++) out += `<i class="${i <= n ? 'on' : ''}"></i>`;
      return `<span class="dots sm" aria-label="${U.round(v, 1)} of 5">${out}</span>`;
    },
    level(theta, sub = true) { const i = U.thetaInfo(theta); return `<span class="level">${sub ? i.sub : i.label}</span>`; },
    statusIcon(status) {
      if (status === 'mastered') return `<span class="ok" title="Mastered">${icon('checkCircle', 17)}</span>`;
      if (status === 'familiar') return `<span title="Familiar"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--warning)" stroke-width="1.75"/><path d="M12 3a9 9 0 0 1 0 18 9 9 0 0 1-7.8-4.5" fill="none" stroke="var(--warning)" stroke-width="5" opacity=".35"/></svg></span>`;
      if (status === 'learning') return `<span title="Learning"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--text-2)" stroke-width="1.75"/><path d="M12 3a9 9 0 0 1 0 18z" fill="var(--text-2)"/></svg></span>`;
      return `<span class="faint" title="Not learned">${icon('circle', 17)}</span>`;
    },
    statusPill(status) {
      const map = { mastered: ['ok', 'Mastered'], familiar: ['warn', 'Familiar'], learning: ['accent', 'Learning'], new: ['', 'Not learned'] };
      const [c, l] = map[status] || map.new;
      return `<span class="pill ${c}">${l}</span>`;
    },
    /** Full dictionary card for a vocabulary item (all languages; shows gender/plural/case when the language has them). */
    dictCard(v, code, st, opts = {}) {
      const G = { m: 'masculine', f: 'feminine', n: 'neuter' };
      const list = (x) => (Array.isArray(x) ? x : x ? [x] : []);
      const sec = (label, html) => `<div class="dict-sec"><div class="eyebrow">${label}</div>${html}</div>`;
      const pills = `<span class="pill">${esc(v.l)}</span><span class="pill outline">${esc(LOS.shared.KIND_LABEL[v.k] || v.k)}</span>${v.d && v.d !== 'general' ? `<span class="pill accent">${esc(LOS.shared.DOMAIN_LABEL[v.d] || v.d)}</span>` : ''}`;
      const gram = [v.pos, v.g ? G[v.g] || v.g : '', v.reg && v.reg !== 'neutral' ? v.reg : ''].filter(Boolean).join(' · ');
      return `<div class="dict">
        <div class="between"><div><div class="dict-word">${esc(v.w)}${v.pl ? `<span class="dict-pl"> — ${esc(v.pl)}</span>` : ''}</div>
          <div class="dict-ipa">${v.ipa ? esc(v.ipa) : ''}${v.stress ? ` <span class="faint">· ${esc(v.stress)}</span>` : ''}${ui.speakBtn(v.w, code)}</div></div><div class="cluster">${pills}</div></div>
        ${gram ? `<div class="faint small mt-4">${esc(gram)}</div>` : ''}
        ${v.cas ? `<div class="small mt-4"><span class="pill outline">${esc(v.cas)}</span></div>` : ''}
        ${v.def ? sec('Definition', `<div class="q">${esc(v.def)}</div>`) : ''}
        ${v.tr ? sec('Italiano', `<div class="q">${esc(v.tr)}</div>`) : ''}
        ${v.ex ? sec('Example', `<div class="between"><div class="q ex">“${esc(v.ex)}”</div>${ui.speakBtn(v.ex, code)}</div>`) : ''}
        ${list(v.col).length ? sec('Collocations', `<div class="colls">${list(v.col).map((c) => `<span>${esc(c)}</span>`).join('')}</div>`) : ''}
        ${list(v.syn).length || list(v.ant).length ? `<div class="dict-sec grid grid-2">${list(v.syn).length ? `<div><div class="eyebrow">Synonyms</div><div>${esc(list(v.syn).join(', '))}</div></div>` : ''}${list(v.ant).length ? `<div><div class="eyebrow">Opposite</div><div>${esc(list(v.ant).join(', '))}</div></div>` : ''}</div>` : ''}
        ${list(v.rel).length ? sec('Related words', `<div>${esc(list(v.rel).join(', '))}</div>`) : ''}
        ${v.pnote ? sec('Pronunciation', `<div class="small muted">${esc(v.pnote)}</div>`) : ''}
        ${v.ctx ? sec('Usage', `<div class="small muted">${esc(v.ctx)}</div>`) : ''}
        ${list(v.mist).map((m) => `<div class="ff">${icon('errors', 14)} ${esc(m)}</div>`).join('')}
        ${v.ff ? `<div class="ff">${icon('flag', 14)} ${esc(v.ff)}</div>` : ''}
        ${opts.mastery === false ? '' : `<div class="dict-sec grid grid-2"><div><div class="eyebrow">Level</div><div>${esc(v.l)} · frequency ${'●'.repeat(v.f || 3)}${'○'.repeat(5 - (v.f || 3))}</div></div><div><div class="eyebrow">Mastery</div>${st ? `<div class="mt-4">${ui.bar(LOS.srs.effective(st), 'thin')}</div><div class="faint xs mt-4">${LOS.learn.STAGE_LABEL[LOS.ped ? LOS.ped.vstage(st) : st.stage || 0]}${st.assumed ? ' (estimated)' : ''} · next ${U.relDate(st.due)}</div>` : '<div class="faint">Not introduced yet</div>'}</div></div>`}
      </div>`;
    },
    langDot(code) { const p = LOS.lang.get(code); return `<span class="lang-dot" style="background:${esc((p && p.color) || 'var(--text-3)')}" aria-hidden="true"></span>`; },
    langFlag(code) { const p = LOS.lang.get(code); return `<span class="flag" aria-hidden="true">${(p && p.flag) || '🌐'}</span>`; },
    langName(code) { const p = LOS.lang.get(code); return p ? p.name : code; },
    langNative(code) { const p = LOS.lang.get(code); return p ? p.native : code; },
    empty({ icon: ic = 'sparkle', title, text, action = '' }) {
      return `<div class="empty">${icon(ic, 28)}<h3>${esc(title)}</h3>${text ? `<p class="muted small" style="max-width:46ch">${text}</p>` : ''}${action ? `<div class="mt-8">${action}</div>` : ''}</div>`;
    },
    notice(text, ic = 'info', cls = '') { return `<div class="notice ${cls}">${icon(ic, 16)}<div>${text}</div></div>`; },
    speakBtn(text, code, label = 'Listen') {
      if (!LOS.speech.ttsSupported) return '';
      return `<button class="btn ghost icon sm" data-act="speak" data-text="${esc(text)}" data-code="${esc(code)}" aria-label="${esc(label)}" title="${esc(label)}">${icon('volume', 16)}</button>`;
    },
    spark(values, w = 200, h = 36) {
      const v = values.filter((x) => x != null);
      if (v.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"></svg>`;
      const min = Math.min(...v) - 0.05, max = Math.max(...v) + 0.05;
      const pts = v.map((y, i) => [(i / (v.length - 1)) * w, h - ((y - min) / (max - min)) * (h - 4) - 2]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="area" d="${d} L ${w} ${h} L 0 ${h} Z"/><path d="${d}"/></svg>`;
    },
    seg(name, options, value) {
      return `<div class="seg" role="tablist">${options.map(([v, l]) => `<button role="tab" aria-selected="${v === value}" class="${v === value ? 'active' : ''}" data-act="${esc(name)}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    },
    chips(name, options, value) {
      return `<div class="cluster">${options.map(([v, l]) => `<button class="chip ${v === value ? 'active' : ''}" aria-pressed="${v === value}" data-act="${esc(name)}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    },
    fmtTimer(secs) { secs = Math.max(0, Math.round(secs)); return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`; },

    /** Animate .bar widths after insertion. */
    animateBars(root = document) {
      requestAnimationFrame(() => root.querySelectorAll('.bar > i[data-w]').forEach((i) => { i.style.width = i.dataset.w + '%'; }));
    },

    /** Delegated click/change/input handling: elements carry data-act="name". */
    delegate(root, handlers) {
      const fire = (e, kind) => {
        const t = e.target.closest('[data-act]');
        if (!t || !root.contains(t)) return;
        const fn = handlers[t.dataset.act];
        if (!fn) return;
        if (kind === 'click' && (t.tagName === 'SELECT' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        if (kind === 'change' && !(t.tagName === 'SELECT' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        fn(t, e);
      };
      root.addEventListener('click', (e) => fire(e, 'click'));
      root.addEventListener('change', (e) => fire(e, 'change'));
    },

    toast(msg, ic = 'check') {
      const region = document.getElementById('toasts');
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `${icon(ic, 16)}<span>${esc(msg)}</span>`;
      region.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 2800);
    },

    modal({ title, body, foot = '', wide = false, onMount, onClose, label }) {
      const root = document.getElementById('modal-root');
      const prevFocus = document.activeElement;
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label || title || 'Dialog')}">
        <div class="modal-head"><h3>${esc(title || '')}</h3><button class="btn ghost icon sm" data-close aria-label="Close">${icon('x', 18)}</button></div>
        <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
      root.appendChild(wrap);
      const close = () => {
        document.removeEventListener('keydown', onKey);
        wrap.remove();
        if (onClose) onClose();
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* ignore */ }
      };
      const onKey = (e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') { // focus trap
          const f = wrap.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
      const m = wrap.querySelector('.modal');
      ui.animateBars(m);
      if (onMount) onMount(m, close);
      setTimeout(() => { const f = m.querySelector('[autofocus], input, select, textarea, .btn.primary, .btn.accent'); (f || m.querySelector('button')).focus(); }, 30);
      return { el: m, close };
    },
    confirm(title, text, ok = 'Confirm', danger = false) {
      return new Promise((resolve) => {
        let answered = false;
        ui.modal({
          title, body: `<p class="muted">${text}</p>`,
          foot: `<button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button>`,
          onMount: (m, close) => m.querySelector('[data-ok]').addEventListener('click', () => { answered = true; resolve(true); close(); }),
          onClose: () => { if (!answered) resolve(false); },
        });
      });
    },
    download(filename, text, type = 'application/json') {
      const blob = new Blob([text], { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
  });

  // global helpers for speak buttons anywhere
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act="speak"]');
    if (!t) return;
    e.preventDefault();
    LOS.speech.speak(t.dataset.text, t.dataset.code || LOS.store.active(), { rate: t.dataset.rate ? +t.dataset.rate : 1 });
  });
})();

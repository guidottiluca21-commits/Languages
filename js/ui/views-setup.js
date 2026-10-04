/* VIEWS — Onboarding, Placement test, Settings. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const V = LOS.views;
  const S = () => LOS.store.state;

  const LEVEL_DESC = {
    A1: 'Basic phrases, very simple sentences.', A2: 'Everyday situations, simple past and future.', B1: 'Independent in familiar topics, some hesitation.',
    B2: 'Comfortable at work, native speed is still tiring.', C1: 'Fluent and flexible; nuance and idiom are the gap.', C2: 'Near-native; polishing precision and style.',
  };

  /* ======================================================================
   * Onboarding
   * ====================================================================== */
  let onb = null;
  const STEPS = ['welcome', 'language', 'level', 'test', 'goals', 'time', 'schedule', 'generate'];
  function initOnb(code) {
    const st = S();
    const first = !st.settings.onboarded;
    onb = {
      step: first ? 0 : 2, first, code: code || null, picked: code ? [code] : [], est: null,
      goals: [], field: st.profile.field || '', specialty: st.profile.specialty || '', name: st.profile.name || '', interests: (st.profile.interests || []).join(', '),
      time: Object.assign({}, st.time), target: 'C2', targetDate: '', tested: false,
    };
    if (!first && !code) onb.step = 1;
  }

  V.welcome = {
    title: 'Welcome',
    shell: false,
    render(params) {
      if (!onb || (params[0] && onb.code !== params[0]) || params[0] === 'new') initOnb(params[0] && params[0] !== 'new' ? params[0] : null);
      if (params[1] === 'goals' && onb.code) onb.step = 4;
      const key = STEPS[onb.step];
      const nSteps = onb.first ? 7 : 6;
      const idx = onb.first ? onb.step : onb.step - 1;
      const top = `<div class="onb-top"><div class="brand" style="padding:0"><span class="brand-mark">L</span>Lingua OS</div>${onb.step > 0 ? `<div class="onb-steps" aria-label="Step ${idx} of ${nSteps}">${Array.from({ length: nSteps }, (_, i) => `<i class="${i < idx ? 'on' : ''}"></i>`).join('')}</div>` : '<span></span>'}${S().settings.onboarded ? `<a class="btn ghost sm" href="#/dashboard">Close</a>` : '<span style="width:60px"></span>'}</div>`;
      const back = onb.step > (onb.first ? 1 : 2) ? `<button class="btn ghost" data-act="back">${icon('chevronLeft', 15)} Back</button>` : '<span></span>';
      let body = '';
      const pname = onb.code ? ui.langName(onb.code) : 'your language';
      if (key === 'welcome') {
        body = `<div class="eyebrow">Welcome</div><h1 class="mt-8" style="font-size:40px">Let's build your<br>language profile.</h1>
          <p class="lead mt-16">Lingua OS is a personal system for reaching C2 in English and Spanish: it measures each skill, builds a curriculum from your real gaps, plans around your shifts, and decides every day what is most worth practising.</p>
          <div class="stack mt-24 small muted" style="--gap:10px"><div class="cluster">${icon('target', 16)} Adaptive placement test per language</div><div class="cluster">${icon('calendar', 16)} Study load shaped by your work schedule</div><div class="cluster">${icon('review', 16)} Spaced repetition for grammar, vocabulary and your own errors</div><div class="cluster">${icon('medical', 16)} Medical & professional communication</div></div>
          <div class="cluster mt-32"><button class="btn primary lg" data-act="next" autofocus>Begin ${icon('arrowRight', 16)}</button><button class="btn ghost" data-act="import">${icon('upload', 15)} Restore a backup</button></div>
          <p class="faint xs mt-16">Everything is stored locally in this browser. Export a backup any time from Settings.</p>`;
      } else if (key === 'language') {
        body = `<div class="eyebrow">Step 1</div><h2 class="mt-8">Which language do you want to set up?</h2><p class="muted mt-8">Each language has its own level, curriculum and progress. You can add the other one later.</p>
          <div class="choice-grid mt-24">${LOS.lang.codes().map((c) => { const L = S().langs[c]; const done = L && L.onboarded; return `<button class="choice ${onb.picked.includes(c) ? 'on' : ''}" data-act="pick" data-v="${c}" ${done ? 'disabled style="opacity:.55"' : ''}><span class="c-t">${ui.langDot(c)} ${esc(LOS.lang.get(c).name)} <span class="faint small">${esc(LOS.lang.get(c).short)}</span></span><span class="c-d">${done ? 'Already set up' : esc(LOS.lang.get(c).native)}</span></button>`; }).join('')}</div>
          <div class="field mt-24"><label for="o-name">Your name (optional)</label><input class="input" id="o-name" value="${esc(onb.name)}" placeholder="For a friendlier dashboard"></div>
          <div class="between mt-32">${back}<button class="btn primary" data-act="next" ${onb.picked.length ? '' : 'disabled'}>Continue ${icon('arrowRight', 16)}</button></div>`;
      } else if (key === 'level') {
        body = `<div class="eyebrow">${ui.langDot(onb.code)} ${esc(pname)}</div><h2 class="mt-8">What's your current level, roughly?</h2><p class="muted mt-8">Only a starting point — the test adapts from here and measures each skill separately.</p>
          <div class="choice-grid mt-24">${U.LEVELS.map((l, i) => `<button class="choice ${onb.est === i ? 'on' : ''}" data-act="est" data-v="${i}"><span class="c-t">${l}</span><span class="c-d">${LEVEL_DESC[l]}</span></button>`).join('')}<button class="choice ${onb.est === -1 ? 'on' : ''}" data-act="est" data-v="-1"><span class="c-t">Not sure</span><span class="c-d">Start in the middle.</span></button></div>
          <div class="between mt-32">${back}<button class="btn primary" data-act="next" ${onb.est == null ? 'disabled' : ''}>Continue ${icon('arrowRight', 16)}</button></div>`;
      } else if (key === 'test') {
        const L = LOS.store.lang(onb.code);
        const last = L.assessments[L.assessments.length - 1];
        body = `<div class="eyebrow">${ui.langDot(onb.code)} ${esc(pname)}</div><h2 class="mt-8">Placement test</h2>
          <p class="muted mt-8">About 15–25 minutes. It adapts to your answers and measures skills separately, so you don't restart from zero where you're already strong.</p>
          <div class="list mt-16">${LOS.assessment.SECTIONS.map((s) => `<div class="row" style="min-height:44px;padding:10px 0">${icon(s.key === 'usage' ? 'message' : s.key, 16)}<span class="grow">${esc(s.label)}</span><span class="faint small">${s.n ? s.n + ' items' : s.key === 'writing' ? '1 text' : 'checklist'}${s.needs === 'tts' && !LOS.assessment.hasTTS() ? ' · unavailable here' : ''}</span></div>`).join('')}</div>
          ${last ? ui.notice(`Test completed: overall <strong>${esc(last.overall.sub)}</strong>.`, 'checkCircle', 'accent') : ''}
          <div class="between mt-32">${back}<div class="cluster"><button class="btn ghost" data-act="skipTest">Skip — use my estimate</button>${last ? `<button class="btn primary" data-act="next">Continue ${icon('arrowRight', 16)}</button>` : `<a class="btn primary" href="#/assessment/onb">Start the test ${icon('arrowRight', 16)}</a>`}</div></div>`;
      } else if (key === 'goals') {
        body = `<div class="eyebrow">${ui.langDot(onb.code)} ${esc(pname)}</div><h2 class="mt-8">What do you want ${esc(pname)} for?</h2><p class="muted mt-8">Goals change what the planner prioritises — e.g. "Medical" weaves clinical language into grammar, vocabulary, listening, speaking and writing.</p>
          <div class="choice-grid mt-24">${LOS.shared.GOALS.map((g) => `<button class="choice ${onb.goals.includes(g.id) ? 'on' : ''}" data-act="goal" data-v="${g.id}" aria-pressed="${onb.goals.includes(g.id)}"><span class="c-t">${esc(g.label)}</span><span class="c-d">${esc(g.desc)}</span></button>`).join('')}</div>
          <div class="grid grid-2 mt-24"><div class="field"><label for="o-field">Professional field</label><input class="input" id="o-field" value="${esc(onb.field)}" placeholder="e.g. Medicine"></div><div class="field"><label for="o-spec">Specialty</label><input class="input" id="o-spec" value="${esc(onb.specialty)}" placeholder="e.g. Anaesthesiology & critical care"></div></div>
          <div class="field mt-16"><label for="o-int">Interests (comma-separated)</label><input class="input" id="o-int" value="${esc(onb.interests)}" placeholder="e.g. cycling, history, technology"></div>
          <div class="grid grid-2 mt-16"><div class="field"><label for="o-tl">Target level</label><select class="select" id="o-tl">${U.LEVELS.map((l) => `<option ${onb.target === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label for="o-td">Target date (optional)</label><input class="input" type="date" id="o-td" value="${esc(onb.targetDate)}"></div></div>
          <div class="between mt-32">${back}<button class="btn primary" data-act="next">Continue ${icon('arrowRight', 16)}</button></div>`;
      } else if (key === 'time') {
        const t = onb.time;
        body = `<h2>How much time do you have?</h2><p class="muted mt-8">The planner never asks for more than your maximum, and on heavy days it goes towards your minimum.</p>
          <div class="stack mt-24" style="--gap:22px">${[['min', 'Minimum daily time', 'Even on hard days', 5, 45], ['target', 'Target', 'A normal day', 10, 120], ['max', 'Maximum', 'Free days', 20, 240]].map(([k, l, h, a, b]) => `<div class="field"><div class="between"><label for="t-${k}">${l} <span class="faint">· ${h}</span></label><span class="num strong" id="tv-${k}">${t[k]} min</span></div><input type="range" id="t-${k}" min="${a}" max="${b}" step="5" value="${t[k]}" data-t="${k}"></div>`).join('')}</div>
          <div class="between mt-32">${back}<button class="btn primary" data-act="next">Continue ${icon('arrowRight', 16)}</button></div>`;
      } else if (key === 'schedule') {
        const w = S().schedule.weekly;
        const order = [1, 2, 3, 4, 5, 6, 0];
        const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        body = `<h2>Your work schedule</h2><p class="muted mt-8">Set your usual week. Shifts, nights and vacations can be added in the Calendar any time.</p>
          <div class="list mt-16">${order.map((d) => { const e = w[d] || { type: 'off' }; return `<div class="row" style="min-height:44px;padding:8px 0"><span style="width:44px" class="strong">${DOW[d]}</span><span class="grow muted">${e.type === 'work' || e.type === 'night' ? `${e.type === 'night' ? 'Night ' : 'Work '}${e.start}–${e.end}` : LOS.planner.TYPE_LABEL[e.type] || 'Day off'}</span></div>`; }).join('')}</div>
          <button class="btn mt-16" data-act="pattern">${icon('briefcase', 15)} Edit weekly pattern</button>
          <p class="faint small mt-16">Default rules: heavy days (night shifts, long shifts, the day after a night) 10–20 min · normal work days 20–40 min · free days 45–90 min. Editable in Settings.</p>
          <div class="between mt-32">${back}<button class="btn primary" data-act="next">Continue ${icon('arrowRight', 16)}</button></div>`;
      } else if (key === 'generate') {
        const L = LOS.store.lang(onb.code);
        const lvl = LOS.skills.calculateLevel(L);
        const studying = LOS.store.studying();
        body = `<div class="eyebrow">${ui.langDot(onb.code)} ${esc(pname)}</div><h2 class="mt-8">Ready to generate your plan</h2>
          <div class="card mt-24"><div class="list">
            <div class="row"><span class="grow muted">Starting level</span><strong class="level">${lvl ? lvl.sub : '—'}</strong>${!L.assessed ? '<span class="pill warn">estimate</span>' : ''}</div>
            <div class="row"><span class="grow muted">Target</span><strong>${esc(onb.target)}${onb.targetDate ? ' · ' + U.fmtDate(onb.targetDate, { month: 'short', year: 'numeric' }) : ''}</strong></div>
            <div class="row"><span class="grow muted">Goals</span><span>${onb.goals.length ? onb.goals.map((g) => esc((LOS.shared.GOALS.find((x) => x.id === g) || {}).label)).join(', ') : '—'}</span></div>
            <div class="row"><span class="grow muted">Daily time</span><span>${onb.time.min}–${onb.time.max} min · target ${onb.time.target}</span></div>
          </div></div>
          ${studying.filter((c) => c !== onb.code).length ? `<div class="field mt-24"><label for="o-w">Share of daily time for ${esc(pname)} <span class="num" id="o-wv">${S().settings.langWeights[onb.code] || 50}%</span></label><input type="range" id="o-w" min="10" max="90" step="5" value="${S().settings.langWeights[onb.code] || 50}"></div>` : ''}
          <div class="between mt-32">${back}<button class="btn primary lg" data-act="generate" autofocus>Generate my learning plan ${icon('sparkle', 16)}</button></div>`;
      }
      return `<div class="onb">${top}<div class="onb-body"><div class="onb-inner">${body}</div></div></div>`;
    },
    mount(root) {
      const keep = () => {
        const q = (id) => root.querySelector(id);
        if (q('#o-name')) onb.name = q('#o-name').value.trim();
        if (q('#o-field')) { onb.field = q('#o-field').value.trim(); onb.specialty = q('#o-spec').value.trim(); onb.interests = q('#o-int').value; onb.target = q('#o-tl').value; onb.targetDate = q('#o-td').value; }
      };
      root.querySelectorAll('[data-t]').forEach((el) => el.addEventListener('input', () => {
        const k = el.dataset.t; onb.time[k] = +el.value;
        if (onb.time.min > onb.time.target) onb.time.target = onb.time.min;
        if (onb.time.target > onb.time.max) onb.time.max = onb.time.target;
        ['min', 'target', 'max'].forEach((x) => { root.querySelector('#tv-' + x).textContent = onb.time[x] + ' min'; root.querySelector('#t-' + x).value = onb.time[x]; });
      }));
      const w = root.querySelector('#o-w');
      if (w) w.addEventListener('input', () => { S().settings.langWeights[onb.code] = +w.value; root.querySelector('#o-wv').textContent = w.value + '%'; });
      ui.delegate(root, {
        next() {
          keep();
          if (STEPS[onb.step] === 'language') { onb.code = onb.picked[0]; LOS.store.ensureLang(onb.code); }
          if (STEPS[onb.step] === 'level') LOS.store.lang(onb.code).estimate = onb.est;
          if (STEPS[onb.step] === 'time') S().time = Object.assign({}, onb.time);
          if (STEPS[onb.step] === 'goals' && !onb.first && S().settings.onboarded) { onb.step = 6; }
          onb.step = Math.min(STEPS.length - 1, onb.step + 1);
          LOS.store.save(); LOS.app.refresh();
        },
        back() { keep(); onb.step = Math.max(0, onb.step - 1); if (!onb.first && onb.step === 6) onb.step = 4; LOS.app.refresh(); },
        pick(el) { onb.picked = [el.dataset.v]; LOS.app.refresh(); },
        est(el) { onb.est = +el.dataset.v; LOS.app.refresh(); },
        goal(el) { keep(); const g = el.dataset.v; onb.goals = onb.goals.includes(g) ? onb.goals.filter((x) => x !== g) : onb.goals.concat([g]); LOS.app.refresh(); },
        skipTest() { LOS.assessment.fromEstimate(onb.code, onb.est == null || onb.est < 0 ? 2 : onb.est); onb.step = 4; LOS.app.refresh(); },
        pattern() { LOS.views._patternEditor(() => LOS.app.refresh()); },
        import() { importBackup(); },
        generate() {
          keep();
          const st = S();
          const L = LOS.store.lang(onb.code);
          if (!U.SKILLS.some((s) => LOS.skills.theta(L, s) != null)) LOS.assessment.fromEstimate(onb.code, onb.est == null || onb.est < 0 ? 2 : onb.est);
          L.goals = onb.goals.slice();
          L.targetLevel = onb.target;
          L.targetDate = onb.targetDate;
          L.onboarded = true;
          L.enabled = true;
          st.profile.name = onb.name;
          st.profile.field = onb.field;
          st.profile.specialty = onb.specialty;
          st.profile.interests = onb.interests.split(',').map((x) => x.trim()).filter(Boolean);
          if (onb.first) st.time = Object.assign({}, onb.time);
          st.settings.onboarded = true;
          st.settings.activeLang = onb.code;
          if (st.settings.langWeights[onb.code] == null) st.settings.langWeights[onb.code] = 50;
          LOS.store.save(true);
          LOS.planner.ensureToday(true);
          onb = null;
          ui.toast('Your plan is ready');
          location.hash = '#/dashboard';
        },
      });
    },
  };

  function importBackup() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.onchange = () => {
      const f = inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        try {
          if (S().settings.onboarded && !(await ui.confirm('Replace current data?', 'Importing replaces all progress stored in this browser. Consider exporting first.', 'Import', true))) return;
          LOS.store.importJSON(String(r.result));
          ui.toast('Backup restored');
          location.hash = '#/dashboard';
          LOS.app.refresh(true);
        } catch (e) { ui.toast(e.message || 'Invalid file', 'errors'); }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  /* ======================================================================
   * Placement test
   * ====================================================================== */
  let draft = null, lastResult = null, audioPlays = {};
  V.assessment = {
    title: 'Assessment',
    shell: (params) => params[0] !== 'onb',
    render(params) {
      const fromOnb = params[0] === 'onb';
      const code = fromOnb && onb ? onb.code : LOS.store.active();
      const p = LOS.lang.get(code);
      const wrap = (inner) => fromOnb ? `<div class="onb"><div class="onb-top"><div class="brand" style="padding:0"><span class="brand-mark">L</span>Placement test · ${esc(p.name)}</div><span></span><button class="btn ghost sm" data-act="quit">Exit</button></div><div class="onb-body"><div class="onb-inner" style="max-width:720px">${inner}</div></div></div>` : `<div class="view narrow">${inner}</div>`;
      if (lastResult && lastResult.code === code) return wrap(resultHTML(lastResult.res, code, fromOnb));
      if (!draft || draft.code !== code) {
        const L = LOS.store.lang(code);
        return wrap(`<div class="eyebrow">${ui.langDot(code)} ${esc(p.name)}</div><h1 class="mt-8">Placement test</h1><p class="lead mt-16">Grammar, vocabulary, reading, natural use & register, listening, a short writing sample and a speaking self-assessment. Questions adapt to your answers — it's normal to find some very hard.</p>
          <div class="list mt-24">${LOS.assessment.SECTIONS.map((s) => `<div class="row" style="min-height:44px;padding:10px 0">${icon(s.key === 'usage' ? 'message' : s.key, 16)}<span class="grow">${esc(s.label)}</span><span class="faint small">${esc(s.desc)}</span></div>`).join('')}</div>
          ${L.assessments.length ? ui.notice(`Previous result: ${esc(L.assessments[L.assessments.length - 1].overall.sub)} on ${U.fmtDate(L.assessments[L.assessments.length - 1].date)}. Retaking updates your skill profile; your learning history is kept.`, 'info') : ''}
          <div class="cluster mt-32"><button class="btn primary lg" data-act="begin" autofocus>Start ${icon('arrowRight', 16)}</button>${fromOnb ? '' : '<a class="btn ghost" href="#/progress">Cancel</a>'}</div>`);
      }
      const cur = LOS.assessment.current(draft);
      if (cur.done) {
        const res = LOS.assessment.finish(draft);
        lastResult = { code, res };
        draft = null;
        if (onb && fromOnb) onb.tested = true;
        return wrap(resultHTML(res, code, fromOnb));
      }
      const sec = cur.section;
      const totalItems = LOS.assessment.SECTIONS.reduce((n, s) => n + (s.n || 1), 0);
      const doneItems = Object.values(draft.n).reduce((a, b) => a + b, 0) + (draft.writing ? 1 : 0);
      const head = `<div class="between"><span class="eyebrow">${esc(sec.label)}</span><span class="faint small">${Math.min(doneItems + 1, totalItems)} / ~${totalItems}</span></div><div class="mt-8">${ui.bar((doneItems / totalItems) * 100, 'thin accent')}</div>`;
      if (cur.special === 'writing') {
        const wp = LOS.assessment.writingPrompt(draft);
        return wrap(`${head}<h2 class="mt-24">Writing sample</h2><p class="muted mt-8">${esc(wp.prompt)}</p><textarea class="textarea mt-16" id="aw" rows="9" lang="${esc(p.locale)}" spellcheck="false" placeholder="Write in ${esc(p.name)}…" autofocus></textarea>
          <div class="between mt-16"><span class="faint small" id="awc">0 words</span><div class="cluster"><button class="btn ghost" data-act="skipSec">Skip writing</button><button class="btn primary" data-act="submitW" data-level="${wp.level}">Submit</button></div></div>`);
      }
      if (cur.special === 'speaking') {
        const lv = LOS.assessment.speakingLevels(draft);
        return wrap(`${head}<h2 class="mt-24">Speaking — what can you do confidently?</h2><p class="muted mt-8">Tick only what you could do today, without preparation.</p>
          ${lv.map((l) => `<div class="section"><div class="section-head"><h3>${l}</h3></div>${LOS.shared.CANDO.speaking[l].map((c, i) => `<label class="check"><input type="checkbox" data-sp="${l}" data-i="${i}"> <span>${esc(c)}</span></label>`).join('')}</div>`).join('')}
          <div class="between mt-24"><span></span><button class="btn primary" data-act="submitS">See my profile ${icon('arrowRight', 16)}</button></div>`);
      }
      const item = cur.item;
      let ctx = '';
      if (item.textId) {
        const t = p.index.texts[item.textId];
        if (sec.key === 'reading') ctx = `<div class="card soft mt-24"><div class="strong">${esc(t.title)}</div><div class="mt-8" style="line-height:1.75">${esc(t.text)}</div></div>`;
        else {
          const plays = audioPlays[t.id] || 0;
          ctx = `<div class="player mt-24"><div class="between"><div><div class="ttl">Listen</div><div class="meta">${plays}/3 plays used</div></div><button class="play-btn" data-act="playA" data-id="${t.id}" ${plays >= 3 ? 'disabled' : ''} aria-label="Play audio">${icon('play', 22)}</button></div></div>`;
        }
      }
      return wrap(`${head}${ctx}<div class="prompt ${ctx ? 'sm' : ''} mt-24">${esc(item.q).replace(/_{3,}/g, '<span class="blank"></span>')}</div>
        <div class="options">${item.o.map((o, k) => `<button class="option" data-act="ans" data-v="${k}" data-key="${k + 1}"><span class="k">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>
        <div class="between mt-16"><button class="btn ghost sm" data-act="dontknow">I don't know</button><span class="faint xs">Keys 1–4</span></div>`);
    },
    mount(root, params) {
      const fromOnb = params[0] === 'onb';
      const code = fromOnb && onb ? onb.code : LOS.store.active();
      const keyH = (e) => { if (/^[1-4]$/.test(e.key) && !/input|textarea/i.test(e.target.tagName)) { const b = root.querySelector(`[data-key="${e.key}"]`); if (b) b.click(); } };
      document.addEventListener('keydown', keyH);
      this._off = () => document.removeEventListener('keydown', keyH);
      const aw = root.querySelector('#aw');
      if (aw) aw.addEventListener('input', () => { root.querySelector('#awc').textContent = U.words(aw.value).length + ' words'; });
      ui.delegate(root, {
        begin() { const L = LOS.store.lang(code); lastResult = null; audioPlays = {}; draft = LOS.assessment.start(code, L.estimate != null && L.estimate >= 0 ? L.estimate : (onb && onb.est >= 0 ? onb.est : null)); LOS.app.refresh(); },
        ans(el) { LOS.assessment.answer(draft, +el.dataset.v); LOS.app.refresh(); },
        dontknow() { LOS.assessment.answer(draft, -1); LOS.app.refresh(); },
        playA(el) { const t = LOS.lang.get(code).index.texts[el.dataset.id]; audioPlays[t.id] = (audioPlays[t.id] || 0) + 1; LOS.speech.speak(t.text, code, { rate: U.levelIndex(t.l) <= 1 ? 0.85 : 1 }); const m = root.querySelector('.player .meta'); if (m) m.textContent = `${audioPlays[t.id]}/3 plays used`; if (audioPlays[t.id] >= 3) el.disabled = true; },
        skipSec() { LOS.assessment.skipSection(draft); LOS.app.refresh(); },
        submitW(el) { const txt = root.querySelector('#aw').value; if (U.words(txt).length < 15) { ui.toast('Write at least 15 words, or skip', 'info'); return; } LOS.assessment.submitWriting(draft, txt, el.dataset.level); LOS.app.refresh(); },
        submitS() { const checks = {}; root.querySelectorAll('[data-sp]').forEach((c) => { (checks[c.dataset.sp] = checks[c.dataset.sp] || [])[+c.dataset.i] = c.checked; }); LOS.assessment.submitSpeaking(draft, checks); LOS.app.refresh(); },
        cont() { lastResult = null; if (onb) { onb.step = 4; location.hash = '#/welcome/' + code; } else location.hash = '#/progress'; },
        quit() { draft = null; LOS.speech.stop(); location.hash = onb ? '#/welcome/' + code : '#/dashboard'; },
      });
    },
    unmount() { if (this._off) this._off(); LOS.speech.stop(); },
  };

  function resultHTML(r, code, fromOnb) {
    const subs = [['register', 'Register'], ['naturalness', 'Naturalness'], ['complexity', 'Complexity'], ['abstract', 'Abstract ideas (C1+ items)'], ['fluency', 'Fluency (self-reported)']].filter(([k]) => r.sub[k] != null);
    const lbl = (k) => U.SKILL_LABEL[k];
    return `<div class="eyebrow">${ui.langDot(code)} ${esc(ui.langName(code))} · language profile</div>
      <h1 class="mt-8">Overall <span class="level">${esc(r.overall.sub)}</span></h1>
      <p class="muted mt-8">Derived from the skill profile (≥ two-thirds of skills at a level, none more than one level below) — not a simple average.</p>
      <table class="profile-table mt-24"><thead><tr><th>Skill</th><th>Level</th><th>Score</th><th class="barcell"></th></tr></thead><tbody>
        ${Object.keys(r.skills).map((k) => { const s = r.skills[k]; const i = U.thetaInfo(s.theta); return `<tr><td>${lbl(k)}</td><td class="level">${i.sub}${s.conf === 'low' ? ' <span class="pill warn" title="Low confidence: estimated indirectly">est.</span>' : ''}</td><td>${i.pct}%</td><td class="barcell">${ui.bar(i.pct, 'thin')}</td></tr>`; }).join('')}
      </tbody></table>
      ${subs.length ? `<div class="section"><div class="section-head"><h3>Sub-indicators</h3></div><div class="grid grid-3">${subs.map(([k, l]) => `<div class="stat"><span class="k">${l}</span><span class="v" style="font-size:20px">${Math.round(r.sub[k] * 100)}%</span></div>`).join('')}</div></div>` : ''}
      <div class="section grid grid-2" style="--gap:28px">
        <div><div class="eyebrow">Strengths</div><div class="mt-8">${r.strengths.length ? r.strengths.map((s) => `<span class="pill ok">${lbl(s)}</span>`).join(' ') : '<span class="muted small">A balanced profile.</span>'}</div>
          <div class="eyebrow mt-16">Weaknesses</div><div class="mt-8">${r.weaknesses.map((s) => `<span class="pill warn">${lbl(s)}</span>`).join(' ')}</div></div>
        <div><div class="eyebrow">Priority areas</div><div class="stack small mt-8" style="--gap:4px">${r.priorities.map((p) => `<div>· ${esc(p)}</div>`).join('')}</div></div></div>
      <div class="section card soft"><div class="eyebrow">Recommended starting point</div><p class="mt-8">${esc(r.startingPoint)}</p>
        <p class="faint small mt-8">Topics well below your level were marked as known (they'll be verified by occasional reviews); topics you missed in the test start as "learning".${!r.measured.listening ? ' Listening was estimated from reading (no speech synthesis).' : ''}${!r.measured.writing ? ' Writing was estimated indirectly — do a writing task soon.' : ''}</p></div>
      <div class="cluster mt-32"><button class="btn primary lg" data-act="cont" autofocus>${fromOnb ? 'Continue setup' : 'Done'} ${icon('arrowRight', 16)}</button></div>`;
  }

  /* ======================================================================
   * Settings
   * ====================================================================== */
  V.settings = {
    title: 'Settings',
    render() {
      const st = S();
      const theme = st.settings.theme;
      const t = st.time, r = st.rules;
      const langsHTML = LOS.lang.codes().map((c) => {
        const L = st.langs[c];
        const p = LOS.lang.get(c);
        if (!L || !L.onboarded) return `<div class="row"><span class="grow">${ui.langDot(c)} ${esc(p.name)}</span><a class="btn sm" href="#/welcome/${c}">Set up</a></div>`;
        const voices = LOS.speech.voicesFor(c);
        const tts = st.settings.tts[c] || {};
        return `<div class="card flat mt-12"><div class="between"><strong>${ui.langDot(c)} ${esc(p.name)}</strong><label class="check small"><input type="checkbox" data-l="${c}" data-k="enabled" ${L.enabled ? 'checked' : ''}> Studying</label></div>
          <div class="form-grid mt-16">
            <div class="field"><label>Target level</label><select class="select" data-l="${c}" data-k="targetLevel">${U.LEVELS.map((l) => `<option ${L.targetLevel === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label>Target date</label><input class="input" type="date" data-l="${c}" data-k="targetDate" value="${esc(L.targetDate)}"></div>
            <div class="field"><label>Share of daily time (%)</label><input class="input" type="number" min="5" max="95" data-w="${c}" value="${st.settings.langWeights[c] == null ? 50 : st.settings.langWeights[c]}"></div></div>
          <div class="field mt-16"><label>Goals</label><div class="cluster">${LOS.shared.GOALS.map((g) => `<button class="chip ${L.goals.includes(g.id) ? 'active' : ''}" data-act="goal" data-l="${c}" data-v="${g.id}">${esc(g.label)}</button>`).join('')}</div></div>
          <div class="form-grid mt-16"><div class="field"><label>Voice</label><select class="select" data-tts="${c}" data-k="voice"><option value="">Automatic</option>${voices.map((v) => `<option ${tts.voice === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
            <div class="field"><label>Speech rate <span class="num" id="rate-${c}">${tts.rate || 1}×</span></label><input type="range" min="0.6" max="1.4" step="0.05" data-tts="${c}" data-k="rate" value="${tts.rate || 1}"></div>
            <div class="field"><label>&nbsp;</label><button class="btn" data-act="testVoice" data-l="${c}">${icon('volume', 15)} Test voice</button></div></div>
          <div class="cluster mt-16"><a class="btn sm" href="#/assessment" data-act="retake" data-l="${c}">Retake placement test</a><button class="btn sm danger" data-act="resetLang" data-l="${c}">Reset ${esc(p.name)} progress</button></div></div>`;
      }).join('');
      return `<div class="view narrow">
        <div class="page-head"><div><h1>Settings</h1><p class="sub">Everything is stored locally in this browser.</p></div></div>
        <div class="section"><div class="section-head"><h2>Profile</h2></div>
          <div class="form-grid"><div class="field"><label for="s-name">Name</label><input class="input" id="s-name" data-p="name" value="${esc(st.profile.name)}"></div>
          <div class="field"><label for="s-field">Professional field</label><input class="input" id="s-field" data-p="field" value="${esc(st.profile.field)}"></div>
          <div class="field"><label for="s-spec">Specialty</label><input class="input" id="s-spec" data-p="specialty" value="${esc(st.profile.specialty)}"></div></div>
          <div class="field mt-16"><label for="s-int">Interests</label><input class="input" id="s-int" data-p="interests" value="${esc((st.profile.interests || []).join(', '))}"></div>
          <div class="grid grid-2 mt-16"><div class="field"><label>Preferred difficulty</label>${ui.seg('diff', [['gentle', 'Gentle'], ['balanced', 'Balanced'], ['challenging', 'Challenging']], st.profile.difficulty)}</div>
          <div class="field"><label>Preferred study time</label>${ui.seg('stime', [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']], st.profile.studyTime)}</div></div></div>
        <div class="section"><div class="section-head"><h2>Languages</h2></div>${langsHTML}</div>
        <div class="section"><div class="section-head"><h2>Study time</h2><span class="faint small">minutes per day</span></div>
          <div class="form-grid">${[['min', 'Minimum'], ['target', 'Target'], ['max', 'Maximum']].map(([k, l]) => `<div class="field"><label>${l}</label><input class="input" type="number" min="5" max="300" step="5" data-time="${k}" value="${t[k]}"></div>`).join('')}</div></div>
        <div class="section"><div class="section-head"><h2>Workload rules</h2><span class="faint small">minutes of study by day type</span></div>
          <div class="list">${[['heavy', 'Heavy days', 'night shifts, long shifts, post-night, recovery'], ['normal', 'Normal work days', ''], ['free', 'Free days', 'days off, vacation']].map(([k, l, h]) => `<div class="row"><div class="grow"><div>${l}</div>${h ? `<div class="meta">${h}</div>` : ''}</div><input class="input" style="width:80px" type="number" min="0" max="300" step="5" data-rule="${k}" data-i="0" value="${r[k][0]}" aria-label="${l} minimum"><span class="faint">–</span><input class="input" style="width:80px" type="number" min="0" max="300" step="5" data-rule="${k}" data-i="1" value="${r[k][1]}" aria-label="${l} maximum"></div>`).join('')}
            <div class="row"><span class="grow">A shift counts as long from</span><input class="input" style="width:80px" type="number" min="6" max="24" data-long value="${r.longShiftHours}" aria-label="Long shift hours"><span class="faint">hours</span></div>
            <div class="row"><span class="grow">Automatic weekly rest day</span><select class="select" style="width:160px" data-restday aria-label="Rest day"><option value="">None</option>${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => `<option value="${i}" ${String(st.settings.restDay) === String(i) ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div class="row"><span class="grow">Weekly review day</span><select class="select" style="width:160px" data-reviewday aria-label="Review day">${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => `<option value="${i}" ${+st.settings.reviewDay === i ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div class="row"><span class="grow">Week starts on</span>${ui.seg('wstart', [['1', 'Monday'], ['0', 'Sunday']], String(st.settings.weekStart))}</div>
            <div class="row"><span class="grow">Weekly load factor <span class="faint small">(adjusted by weekly reviews)</span></span><span class="num">${st.meta.loadFactor || 1}×</span><button class="btn ghost sm" data-act="resetLoad">Reset</button></div></div>
          <button class="btn mt-16" data-act="pattern">${icon('briefcase', 15)} Edit weekly work pattern</button></div>
        <div class="section"><div class="section-head"><h2>Appearance</h2></div>${ui.seg('theme', [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']], theme)}</div>
        <div class="section"><div class="section-head"><h2>AI integration</h2>${LOS.AI.isRemote() ? '<span class="pill ok">Remote enabled</span>' : '<span class="pill">Local</span>'}</div>
          <p class="muted small">All intelligent functions (generateExercise, evaluateWriting, evaluateSpeaking, generateVocabulary, generateListeningTask, evaluateAnswer, generateScenario, generateWeeklyPlan) run locally. To use an LLM, point this to <strong>your own backend proxy</strong> — never put API keys in this app.</p>
          <div class="mt-16">${ui.seg('ai', [['local', 'Local only'], ['remote', 'Remote backend']], st.settings.ai.provider)}</div>
          <div class="field mt-16"><label for="s-ep">Endpoint URL</label><input class="input" id="s-ep" data-ep value="${esc(st.settings.ai.endpoint)}" placeholder="https://your-proxy.example.com/lingua"></div>
          <details class="mt-12"><summary class="small muted" style="cursor:pointer">Request format</summary><pre class="card soft small mono" style="white-space:pre-wrap;margin-top:8px">POST &lt;endpoint&gt;
{ "task": "evaluateWriting", "lang": "en", "payload": { "text": "…", "level": "B2", "reg": "formal" } }

→ respond with JSON in the same shape the local implementation returns
  (e.g. scores, sentencesOut[{original, corrected, natural, issues}], estTheta, notes).
Any error or timeout falls back to the local implementation.</pre></details>
          <button class="btn sm mt-12" data-act="testAI">Test connection</button></div>
        <div class="section"><div class="section-head"><h2>Data</h2><span class="faint small">${Math.round((localStorage.getItem(LOS.store.KEY) || '').length / 1024)} KB used</span></div>
          <div class="cluster"><button class="btn" data-act="export">${icon('download', 15)} Export JSON</button><button class="btn" data-act="import">${icon('upload', 15)} Import JSON</button><a class="btn ghost" href="#/welcome/new">Add a language</a><button class="btn danger right" data-act="resetAll">${icon('trash', 15)} Reset everything</button></div></div>
        <div class="section"><div class="section-head"><h2>Capabilities in this browser</h2></div>
          <div class="cluster">${[['Speech synthesis', LOS.speech.ttsSupported], ['Speech recognition', LOS.speech.srSupported], ['Audio recording', LOS.speech.recSupported], ['Local storage', (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return true; } catch (e) { return false; } })()]].map(([l, ok]) => `<span class="pill ${ok ? 'ok' : ''}">${icon(ok ? 'check' : 'x', 12)} ${l}</span>`).join('')}</div></div>
      </div>`;
    },
    mount(root) {
      const st = S();
      const save = () => { LOS.store.save(); };
      root.querySelectorAll('[data-p]').forEach((el) => el.addEventListener('change', () => { const k = el.dataset.p; st.profile[k] = k === 'interests' ? el.value.split(',').map((x) => x.trim()).filter(Boolean) : el.value; save(); ui.toast('Saved'); }));
      root.querySelectorAll('[data-time]').forEach((el) => el.addEventListener('change', () => {
        st.time[el.dataset.time] = U.clamp(+el.value || 5, 5, 300);
        if (st.time.min > st.time.target) st.time.target = st.time.min;
        if (st.time.target > st.time.max) st.time.max = st.time.target;
        save(); LOS.planner.ensureToday(); LOS.app.refresh();
      }));
      root.querySelectorAll('[data-rule]').forEach((el) => el.addEventListener('change', () => { const r = st.rules[el.dataset.rule]; r[+el.dataset.i] = U.clamp(+el.value || 0, 0, 300); if (r[0] > r[1]) r[1] = r[0]; save(); LOS.planner.ensureToday(); }));
      const lg = root.querySelector('[data-long]'); lg.addEventListener('change', () => { st.rules.longShiftHours = U.clamp(+lg.value || 10, 6, 24); save(); });
      root.querySelector('[data-restday]').addEventListener('change', (e) => { st.settings.restDay = e.target.value === '' ? null : +e.target.value; save(); LOS.planner.ensureToday(); });
      root.querySelector('[data-reviewday]').addEventListener('change', (e) => { st.settings.reviewDay = +e.target.value; save(); });
      root.querySelectorAll('[data-l][data-k]').forEach((el) => el.addEventListener('change', () => { const L = st.langs[el.dataset.l]; L[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; save(); if (el.dataset.k === 'enabled') { LOS.planner.ensureToday(); LOS.app.refresh(); } }));
      root.querySelectorAll('[data-w]').forEach((el) => el.addEventListener('change', () => { st.settings.langWeights[el.dataset.w] = U.clamp(+el.value || 50, 5, 95); save(); LOS.planner.ensureToday(); }));
      root.querySelectorAll('[data-tts]').forEach((el) => el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
        const c = el.dataset.tts; const o = (st.settings.tts[c] = st.settings.tts[c] || {});
        o[el.dataset.k] = el.type === 'range' ? +el.value : el.value;
        if (el.type === 'range') root.querySelector('#rate-' + c).textContent = el.value + '×';
        save();
      }));
      const ep = root.querySelector('[data-ep]'); ep.addEventListener('change', () => { st.settings.ai.endpoint = ep.value.trim(); save(); });
      ui.delegate(root, {
        diff(el) { st.profile.difficulty = el.dataset.v; save(); LOS.app.refresh(); },
        stime(el) { st.profile.studyTime = el.dataset.v; save(); LOS.app.refresh(); },
        wstart(el) { st.settings.weekStart = +el.dataset.v; save(); LOS.app.refresh(); },
        theme(el) { LOS.app.setTheme(el.dataset.v); LOS.app.refresh(); },
        ai(el) { st.settings.ai.provider = el.dataset.v; save(); LOS.app.refresh(); },
        goal(el) { const L = st.langs[el.dataset.l]; const g = el.dataset.v; L.goals = L.goals.includes(g) ? L.goals.filter((x) => x !== g) : L.goals.concat([g]); save(); LOS.app.refresh(); },
        testVoice(el) { const c = el.dataset.l; LOS.speech.speak(c === 'es' ? 'Hola, soy tu voz para practicar español.' : 'Hello, this is the voice you will hear in listening practice.', c); },
        retake(el, e) { e.preventDefault(); LOS.store.setActive(el.dataset.l); location.hash = '#/assessment'; },
        async resetLang(el) {
          const c = el.dataset.l;
          if (!(await ui.confirm(`Reset ${ui.langName(c)}?`, 'All progress, vocabulary, errors and history for this language will be deleted. Other languages are not affected.', 'Reset', true))) return;
          st.langs[c] = LOS.store.defaultLang(c); save(); ui.toast('Language reset'); location.hash = '#/welcome/' + c;
        },
        resetLoad() { st.meta.loadFactor = 1; save(); LOS.app.refresh(); },
        pattern() { LOS.views._patternEditor(); },
        export() { ui.download(`lingua-os-backup-${U.today()}.json`, LOS.store.exportJSON()); ui.toast('Backup downloaded', 'download'); },
        import() { importBackup(); },
        async resetAll() {
          if (!(await ui.confirm('Reset everything?', 'This deletes all data in this browser. Export a backup first if you might need it.', 'Delete everything', true))) return;
          LOS.store.reset(); location.hash = '#/welcome'; LOS.app.refresh(true);
        },
        async testAI() {
          if (!st.settings.ai.endpoint) { ui.toast('Enter an endpoint first', 'info'); return; }
          const prev = st.settings.ai.provider; st.settings.ai.provider = 'remote';
          const r = await LOS.AI.evaluateAnswer(LOS.store.active() || 'en', { prompt: 'test', answer: 'This is a test sentence.', level: 'B2' });
          st.settings.ai.provider = prev;
          ui.toast(r && r._source === 'remote' ? 'Backend responded ✓' : 'No valid response — local fallback in use', r && r._source === 'remote' ? 'check' : 'errors');
        },
      });
    },
  };
})();

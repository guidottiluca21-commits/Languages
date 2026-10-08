/* FEEDBACK · LIBRARY · SIMULATOR — local (deterministic) implementations used directly, and as the
 * fallback of every AI task. AI, when configured, enriches them; it never replaces the learning data.
 *   LOS.feedback  structured assessment: what worked, ≤3 important errors, alternatives, missing language,
 *                 1–2 priorities, one follow-up task; local rewrites (formal, informal, natural…)
 *   LOS.library   personal input library: store texts, extract only what is useful for this learner
 *   LOS.sim       scenario simulator: partner lines, turn analysis, 7-dimension performance */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const L = (code) => LOS.store.lang(code);
  const P = (code) => LOS.lang.get(code);

  /* ==================================================================
   * STRUCTURED FEEDBACK
   * ================================================================== */
  const IMPACT = { wordorder: 5, grammar: 4, preposition: 3.5, collocation: 3.2, interference: 3.4, professional: 3.3, register: 3, unnatural: 2.6, articles: 2.8, vocabulary: 3.1, pronunciation: 2, fluency: 2 };
  function build(code, a, ctx = {}) {
    const bank = LOS.errorBank ? LOS.errorBank.patterns(code) : [];
    const recurring = new Set(bank.filter((p) => p.count >= 2).map((p) => p.key));
    const communicated = [];
    if (a.words) communicated.push(`You got a message across in ${a.sentences} sentence${a.sentences === 1 ? '' : 's'} (${a.words} words).`);
    if ((a.keysUsed || []).length) communicated.push(`You used the target language: ${a.keysUsed.slice(0, 5).join(', ')}.`);
    if ((a.chunks || []).length) communicated.push(`Natural chunks: ${a.chunks.slice(0, 4).join(', ')}.`);
    if ((a.connectors || []).length >= 2) communicated.push(`You linked your ideas (${[...new Set(a.connectors.map((c) => c.c))].slice(0, 4).join(', ')}).`);
    const errs = (a.issues || []).filter((i) => i.severity === 'error').map((i) => {
      const sent = (a.sentencesOut || []).find((x) => x.original === i.sentence);
      const bc = LOS.errorBank ? LOS.errorBank.classify({ cat: i.cat, label: i.label, rule: i.rule, note: i.why }) : i.cat;
      const rec = recurring.has('r:' + i.rule) || (i.topic && recurring.has('t:' + i.topic));
      return { wrong: i.match || i.sentence, right: i.suggestion || (sent ? sent.corrected : ''), sentence: i.sentence, corrected: sent ? sent.corrected : '', why: i.why || '', label: i.label, cat: bc, topic: i.topic || null, recurring: rec, score: (IMPACT[bc] || 2.5) + (rec ? 3 : 0) };
    });
    // one entry per rule, highest impact first, never more than three
    const seen = new Set();
    const errors = errs.sort((x, y) => y.score - x.score).filter((e) => { const k = e.label + '|' + U.norm(e.wrong); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
    const alternatives = (a.sentencesOut || []).filter((x) => x.natural && x.natural !== x.corrected).slice(0, 2).map((x) => ({ from: x.corrected, to: x.natural }))
      .concat((a.upgrades || []).slice(0, 2).map((u) => ({ from: u.w, to: u.alts.slice(0, 3).join(' / ') })));
    const missing = (a.keysMissing || []).slice(0, 4);
    const priorities = [];
    if (errors[0]) priorities.push(`${errors[0].recurring ? 'Recurring: ' : ''}${errors[0].label}${errors[0].why ? ' — ' + errors[0].why : ''}`);
    if (errors[1] && errors[1].cat !== errors[0].cat) priorities.push(`${errors[1].label}${errors[1].why ? ' — ' + errors[1].why : ''}`);
    else if (missing.length) priorities.push(`Use the key language of the task: ${missing.slice(0, 3).join(', ')}.`);
    else if ((a.connectors || []).length < 2 && a.sentences >= 3) priorities.push(`Link your ideas: try ${(a.nextConnectors || []).slice(0, 3).join(', ')}.`);
    else if (a.words && a.words < 25) priorities.push('Say a little more: add a reason or an example.');
    let followUp;
    const top = errors[0];
    if (top && (top.topic || top.recurring)) followUp = { label: `Error clinic: ${top.label}`, href: `#/practice/remedy/${encodeURIComponent(top.topic || top.label)}`, text: 'Explanation → controlled practice → your own sentence.' };
    else if (missing.length) followUp = { label: 'Practise the missing phrases', href: '#/practice/micro/application', text: 'Short tasks that recycle the language of this task.' };
    else if (alternatives.length) followUp = { label: 'Say it differently', href: '#/practice/flex', text: 'Rewrite one sentence: more natural, more formal, more professional.' };
    else followUp = { label: 'Next: a short conversation', href: '#/practice/micro/dialogue', text: 'Use the same language in a mini dialogue.' };
    return { communicated, errors, alternatives, missing, priorities: priorities.slice(0, 2), followUp, _source: 'local' };
  }
  function merge(local, ai) {
    const arr = (x) => (Array.isArray(x) ? x : []);
    return {
      communicated: arr(ai.communicated).length ? arr(ai.communicated).slice(0, 4) : local.communicated,
      errors: arr(ai.errors).length ? arr(ai.errors).slice(0, 3).map((e) => ({ wrong: String(e.wrong || ''), right: String(e.right || ''), why: String(e.why || ''), label: String(e.label || 'Correction') })) : local.errors,
      alternatives: arr(ai.alternatives).length ? arr(ai.alternatives).slice(0, 3).map((x) => ({ from: String(x.from || ''), to: String(x.to || '') })) : local.alternatives,
      missing: arr(ai.missing).length ? arr(ai.missing).slice(0, 5).map(String) : local.missing,
      priorities: arr(ai.priorities).length ? arr(ai.priorities).slice(0, 2).map(String) : local.priorities,
      followUp: Object.assign({}, local.followUp, ai.followUp ? { text: String(ai.followUp) } : {}),
      _source: ai._source || 'ai',
    };
  }

  /* Local rewrites: deterministic, honest about their limits. */
  const EN_CONTR = [["don't", 'do not'], ["doesn't", 'does not'], ["didn't", 'did not'], ["can't", 'cannot'], ["won't", 'will not'], ["isn't", 'is not'], ["aren't", 'are not'], ["wasn't", 'was not'], ["I'm", 'I am'], ["it's", 'it is'], ["we're", 'we are'], ["they're", 'they are'], ["you're", 'you are'], ["I've", 'I have'], ["we've", 'we have'], ["I'd", 'I would'], ["I'll", 'I will'], ["we'll", 'we will'], ["there's", 'there is'], ["that's", 'that is'], ["let's", 'let us']];
  function replaceAllCI(text, from, to) { return text.replace(new RegExp('(?<![\\p{L}])' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'giu'), to); }
  function localTransform(code, text, target) {
    const p = P(code);
    const a = LOS.writing.analyze(code, text, { reg: target === 'formal' || target === 'professional' ? 'formal' : 'neutral' });
    let out = (a.sentencesOut || []).map((x) => (target === 'natural' || target === 'native' ? x.natural || x.corrected : x.corrected)).join(' ') || text;
    const notes = [];
    if (out !== text) notes.push('Corrected with the local rules.');
    if (target === 'formal' || target === 'professional') {
      (p.professional || []).forEach((m) => m.expr.forEach((e) => { if (e.weak && U.norm(out).includes(U.norm(e.weak))) { out = replaceAllCI(out, e.weak, e.p); notes.push(`“${e.weak}” → “${e.p}”`); } }));
      if (code === 'en') EN_CONTR.forEach(([c, f]) => { if (new RegExp("(?<![\\p{L}])" + c.replace("'", "['’]") + "(?![\\p{L}])", 'iu').test(out)) { out = replaceAllCI(out, c, f); notes.push(`${c} → ${f}`); } });
      if (a.regIssues && a.regIssues.length) a.regIssues.forEach((r) => notes.push(r.why));
    } else if (target === 'informal') {
      if (code === 'en') EN_CONTR.forEach(([c, f]) => { if (U.norm(out).includes(U.norm(f))) { out = replaceAllCI(out, f, c); notes.push(`${f} → ${c}`); } });
    }
    const versions = [];
    if (target === 'different' || target === 'native') {
      // swap a word for a synonym the curriculum knows
      p.vocab.filter((v) => (v.syn || []).length && U.norm(' ' + out + ' ').includes(' ' + U.norm(v.w) + ' ')).slice(0, 3).forEach((v) => {
        const syn = String(v.syn[0]).replace(/\s*\(.*?\)\s*/g, '').trim();
        if (syn) versions.push(replaceAllCI(out, v.w, syn));
      });
    }
    if (out !== text && !versions.includes(out)) versions.unshift(out);
    return {
      versions: versions.slice(0, 4),
      note: versions.length ? notes.slice(0, 4).join(' · ') : 'No local alternative found. Local rewriting covers common errors, register phrases and known synonyms only — with an AI provider configured (Settings → AI) you get full rewrites.',
    };
  }
  LOS.feedback = { build, merge, localTransform };

  /* ==================================================================
   * PERSONAL INPUT LIBRARY
   * ================================================================== */
  const MAX_TEXT = 8000, MAX_ITEMS = 30;
  function list(code) { const lang = L(code); lang.library = lang.library || []; return lang.library; }
  function add(code, { title, kind, url, text }) {
    const lib = list(code);
    const item = { id: U.uid('lib'), date: U.today(), title: String(title || 'Untitled').slice(0, 160), kind: kind || 'text', url: String(url || '').slice(0, 2000), text: String(text || '').slice(0, MAX_TEXT), out: null, added: [] };
    lib.unshift(item);
    if (lib.length > MAX_ITEMS) lib.length = MAX_ITEMS;
    return item;
  }
  function remove(code, id) { const lang = L(code); lang.library = list(code).filter((x) => x.id !== id); }
  /** Local extraction: only items at a useful level that the learner does not yet master, plus unknown words. */
  function localAdapt(code, text) {
    const p = P(code), lang = L(code);
    const sents = U.sentences(String(text || ''));
    const nt = ' ' + U.norm(text) + ' ';
    const lvl = LOS.learn.targetLevelIdx(code, 'vocabulary');
    const doms = LOS.queue.goalDomains(lang);
    const cands = p.vocab.concat(Object.values(LOS.ped.chunks(code)).filter((c) => c.tr || c.def));
    const found = [];
    cands.forEach((v) => {
      if (!v.w || v.w.length < 3) return;
      const st = lang.vocab[v.id];
      if (LOS.ped.vstage(st) >= 4 || (st && st.assumed)) return;
      const d = U.levelIndex(v.l || 'B1') - lvl;
      if (d < -2 || d > 1) return;
      const head = U.norm(v.w).replace(/^(the|a|an|to|el|la|los|las|der|die|das|le|la|les|l')\s+/, '');
      if (!head || !nt.includes(' ' + head.split(' ')[0])) return;
      if (!LOS.ped.usesItem(code, v, text)) return;
      const ex = sents.find((x) => LOS.ped.usesItem(code, v, x)) || v.ex;
      found.push({ id: v.id, w: v.w, tr: v.tr || '', def: v.def || '', ex, k: v.k, score: (v.f || 3) + (doms.includes(v.d) ? 1.5 : 0) + (v.k !== 'word' ? 0.8 : 0) - Math.abs(d) * 0.5 });
    });
    found.sort((x, y) => y.score - x.score);
    const vocab = found.filter((x) => x.k === 'word').slice(0, 6).concat(found.filter((x) => x.k !== 'word').slice(0, 4)).slice(0, 8);
    const expressions = found.filter((x) => x.k !== 'word').slice(0, 4).map((x) => x.w);
    // words not in the curriculum at all: suggestions to look up (never auto-added)
    const knownWords = new Set();
    cands.forEach((v) => U.words(v.w).forEach((w) => knownWords.add(U.norm(w))));
    p.vocab.forEach((v) => U.words(v.ex || '').forEach((w) => knownWords.add(U.norm(w))));
    p.grammar.forEach((t) => t.ex.forEach((e) => U.words(e).forEach((w) => knownWords.add(U.norm(w)))));
    const freq = {};
    U.words(text).forEach((w) => { const n = U.norm(w); if (n.length >= 6 && !knownWords.has(n) && !/\d/.test(n)) freq[n] = (freq[n] || 0) + 1; });
    const unknown = Object.keys(freq).sort((a, b) => freq[b] - freq[a] || b.length - a.length).slice(0, 8);
    // comprehension: cloze questions on sentences of the text that contain a selected item
    const questions = [];
    vocab.forEach((v) => {
      if (questions.length >= 3) return;
      const sent = sents.find((x) => U.norm(x).includes(U.norm(v.w)));
      if (!sent || sent.length > 220) return;
      const i = sent.toLowerCase().indexOf(v.w.toLowerCase());
      if (i < 0) return;
      const others = U.shuffle(vocab.filter((x) => x.id !== v.id).map((x) => x.w)).slice(0, 2);
      if (others.length < 2) return;
      const o = U.shuffle([v.w].concat(others));
      questions.push({ q: sent.slice(0, i) + '_____' + sent.slice(i + v.w.length), o, a: o.indexOf(v.w) });
    });
    const prompts = ['Summarise the text in three sentences.', 'What is your opinion on the main point? Give a reason and an example.'];
    return { vocab, expressions, questions, prompts, unknown, sentences: sents.length };
  }
  LOS.library = { list, add, remove, localAdapt, MAX_TEXT };

  /* ==================================================================
   * SCENARIO SIMULATOR (local partner: scripted follow-ups in the target language)
   * ================================================================== */
  function groupOf(m) {
    if (m.id.includes('-abr-')) return m.social ? 'social' : 'abroad';
    if (m.id.includes('-pro-')) return 'workplace';
    return m.cat === 'patient' ? 'patient' : 'clinical';
  }
  /** A scenario worth simulating now: the next step of the learner's track, ready or nearly ready. */
  function pick(code, opts = {}) {
    const rnd = opts.rnd || Math.random;
    const dom = LOS.goals.domainOf();
    const keys = (dom === 'medicine' || dom === 'healthcare' ? ['medical'] : []).concat(['professional', 'abroad']);
    const cands = [];
    keys.forEach((k) => {
      const pw = LOS.ped.pathway(code, k);
      if (!pw) return;
      pw.steps.filter((st) => st.state === 'ready' || st.state === 'done' || (st.state === 'learning' && st.pct >= 0.5)).forEach((st) => st.mods.forEach((m) => {
        const mod = P(code).index.modules[m.id];
        (mod.scen || []).forEach((sc, idx) => cands.push({ moduleId: m.id, idx, title: mod.title, l: mod.l, w: st.state === 'ready' ? 2 : 1 }));
      }));
    });
    if (!cands.length) return null;
    const tot = U.sum(cands.map((c) => c.w));
    let r = rnd() * tot;
    for (const c of cands) { r -= c.w; if (r <= 0) return c; }
    return cands[0];
  }
  function lines(code, m, sc) {
    const bank = (LOS.SIM_LINES || {})[code] || {};
    const g = bank[groupOf(m)] || bank.workplace || { open: [], follow: [], close: '' };
    const open = sc.open || g.open[0] || '';
    const follow = (sc.follow && sc.follow.length ? sc.follow : g.follow).slice(0, 3);
    return { role: sc.role || m.partner || g.role || '', open, follow, close: g.close || '' };
  }
  const WORDS_TARGET = [8, 10, 15, 25, 32, 40];
  /** Analyse the learner's turns and estimate seven dimensions (0–1). Local estimates — labelled as such. */
  function evaluate(code, m, sc, turns, qs) {
    const lvlI = U.levelIndex(m.l || 'B1');
    const text = turns.map((t) => t.text).join(' ');
    const a = LOS.writing.analyze(code, text, { level: m.l, keys: sc.keys || [], reg: groupOf(m) === 'social' ? 'informal' : 'neutral' });
    const sentences = Math.max(1, a.sentences);
    const errors = a.errors.length, hints = a.hints.length;
    const req = m._req || [];
    const usedMod = req.filter((id) => { const v = LOS.learn.vocabItem(code, id); return v && LOS.ped.usesItem(code, v, text); }).length;
    const keysShare = (sc.keys || []).length ? a.keysUsed.length / sc.keys.length : 0.5;
    const target = WORDS_TARGET[lvlI] || 20;
    const perTurn = U.avg(turns.map((t) => U.words(t.text).length));
    const secs = U.sum(turns.map((t) => t.secs || 0));
    const wpm = secs > 10 ? (U.words(text).length / secs) * 60 : null;
    const [lo] = LOS.shared.WPM[m.l] || [80, 120];
    const answered = turns.filter((t, i) => U.words(t.text).length >= Math.min(4, target / 3)).length / Math.max(1, qs);
    const dims = {
      vocabulary: U.clamp(0.35 * (a.mattr || 0.5) / 0.7 + 0.35 * keysShare + 0.3 * Math.min(1, usedMod / 4), 0, 1),
      grammar: U.clamp(1 - errors / (sentences * 0.8), 0, 1),
      fluency: wpm != null ? U.clamp(wpm / lo, 0, 1) : U.clamp(perTurn / target, 0, 1),
      accuracy: U.clamp(1 - (errors + hints * 0.5) / sentences, 0, 1),
      professional: groupOf(m) === 'social' ? null : U.clamp((a.register.ok ? 0.6 : 0.25) + Math.min(0.4, usedMod * 0.1), 0, 1),
      interaction: U.clamp(answered, 0, 1),
      naturalness: U.clamp(1 - hints / sentences + Math.min(0.3, (a.chunks || []).length * 0.1) - 0.15, 0, 1),
    };
    Object.keys(dims).forEach((k) => { if (dims[k] != null) dims[k] = U.round(dims[k], 2); });
    const vals = Object.values(dims).filter((v) => v != null);
    const overall = U.round(U.avg(vals), 2);
    const LABEL = { vocabulary: 'Vocabulary', grammar: 'Grammar', fluency: 'Fluency', accuracy: 'Accuracy', professional: 'Professional appropriateness', interaction: 'Interaction', naturalness: 'Naturalness' };
    const FIX = {
      vocabulary: { label: 'Learn the language of this scenario', href: `#/practice/lesson/scenario/${m.id}` },
      grammar: { label: 'Error clinic', href: '#/practice/remedy' },
      accuracy: { label: 'Error clinic', href: '#/practice/remedy' },
      fluency: { label: 'Rapid speaking drills', href: '#/practice/think/rapid' },
      interaction: { label: 'Mini dialogues', href: '#/practice/micro/dialogue' },
      professional: { label: 'Formal vs informal practice', href: '#/practice/flex' },
      naturalness: { label: 'Make it natural', href: '#/practice/flex' },
    };
    const weak = Object.keys(dims).filter((k) => dims[k] != null).sort((x, y) => dims[x] - dims[y]).slice(0, 2).map((k) => ({ k, label: LABEL[k], v: dims[k], fix: FIX[k] }));
    return { dims, LABEL, overall, weak, analysis: a, usedMod };
  }
  function save(code, m, idx, ev, turns) {
    const lang = L(code);
    lang.sims = lang.sims || [];
    const area = m.id.includes('-med-') ? 'medical' : m.id.includes('-abr-') ? 'abroad' : 'professional';
    lang.sims.unshift({ id: U.uid('sim'), date: U.today(), key: m.id + ':' + idx, area, title: m.title, overall: ev.overall, dims: ev.dims, turns: turns.length, weak: ev.weak.map((w) => w.k) });
    if (lang.sims.length > 40) lang.sims.length = 40;
  }
  LOS.sim = { pick, lines, evaluate, save, groupOf };
})();

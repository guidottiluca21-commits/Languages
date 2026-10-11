/* INPUT & PRACTICE ENGINE — local, deterministic.
 *   LOS.input         known-word coverage of any text, sentence mining, extensive input log
 *   LOS.dictation     sentences built from language already met + word-by-word diff
 *   LOS.spoken        tolerant matching of a spoken answer (speech recognition) against the expected one
 *   LOS.interference  confusion between the learner's target languages (EN/ES/DE/FR, plus Italian false friends)
 *   LOS.recal         optional monthly mini-placement that recalibrates the skill estimates
 *   LOS.cando         CEFR "can do" checklist compared with measured data
 * Limits (stated in the UI and README): coverage uses a light stemmer, not a real lemmatizer; it estimates
 * known words from the learner's vocabulary + the most frequent words of the curriculum for their level. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const L = (code) => LOS.store.lang(code);
  const P = (code) => LOS.lang.get(code);

  /* ==================================================================
   * TOKENS & LIGHT STEMMING
   * ================================================================== */
  const ENDINGS = {
    en: ['ingly', 'edly', 'ings', 'ing', 'ies', 'ied', 'ed', 'es', 's', 'ly', 'er', 'est'],
    es: ['amientos', 'imientos', 'amiento', 'imiento', 'aciones', 'ación', 'iendo', 'ando', 'ieron', 'aron', 'ábamos', 'íamos', 'aban', 'abas', 'aba', 'ían', 'ías', 'ía', 'ados', 'adas', 'idos', 'idas', 'ado', 'ada', 'ido', 'ida', 'amos', 'emos', 'imos', 'ar', 'er', 'ir', 'os', 'as', 'es', 'an', 'en', 'o', 'a', 'e', 's', 'ó', 'é', 'í'],
    fr: ['issements', 'issement', 'ations', 'ation', 'aient', 'erions', 'ions', 'iez', 'ais', 'ait', 'ant', 'ent', 'ées', 'és', 'ée', 'er', 'ez', 'es', 'e', 's', 'x', 'é'],
    de: ['ungen', 'heiten', 'keiten', 'ung', 'heit', 'keit', 'ern', 'em', 'en', 'er', 'es', 'est', 'et', 'ten', 'tet', 'te', 'st', 't', 'e', 'n', 's'],
  };
  function stem(code, w) {
    let s = U.stripAccents(String(w).toLowerCase()).replace(/^(l|d|qu|j|n|s|c|m|t)'/, '').replace(/'s$/, '');
    if (code === 'de' && /^ge.{4,}t$/.test(s)) s = s.slice(2);
    for (const e of ENDINGS[code] || []) { const ee = U.stripAccents(e); if (s.length - ee.length >= 3 && s.endsWith(ee)) return s.slice(0, -ee.length); }
    return s;
  }
  function tokens(text) { return U.words(String(text || '')).filter((w) => !/\d/.test(w)); }

  /* Corpus frequency of each language: every sentence of the curriculum (cached per pack). */
  const corpusCache = {};
  function corpus(code) {
    const p = P(code);
    if (corpusCache[code] && corpusCache[code].p === p) return corpusCache[code];
    // every sentence of the curriculum with its CEFR level: frequency + the level where each word first appears
    const sents = [];
    const add = (txt, l) => { if (txt) sents.push([txt, U.levelIndex(l || 'B1')]); };
    p.grammar.forEach((t) => t.ex.forEach((e) => add(e, t.l)));
    p.vocab.forEach((v) => { add(v.ex, v.l); add(v.w, v.l); });
    p.texts.forEach((t) => U.sentences(t.text).forEach((x) => add(x, t.l)));
    (p.think || []).forEach((t) => add(t.p, t.l));
    p.medical.concat(p.professional, p.abroad || []).forEach((m) => { m.expr.forEach((e) => add(e.p, m.l)); (m.scen || []).forEach((sc) => sc.model && U.sentences(sc.model).forEach((x) => add(x, m.l))); });
    const freq = {}, first = {};
    sents.forEach(([txt, li]) => new Set(tokens(txt).map((w) => stem(code, w))).forEach((st) => { freq[st] = (freq[st] || 0) + 1; if (first[st] == null || li < first[st]) first[st] = li; }));
    const ranked = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
    corpusCache[code] = { p, freq, first, ranked, rank: Object.fromEntries(ranked.map((w, i) => [w, i])) };
    return corpusCache[code];
  }
  const CORE_BY_LEVEL = [120, 260, 450, 700, 1000, 1400]; // frequent stems assumed known at A1…C2

  /* ==================================================================
   * KNOWN WORDS & COVERAGE
   * ================================================================== */
  const knownCache = {};
  function knownSet(code) {
    const lang = L(code);
    const vθ = LOS.skills.theta(lang, 'vocabulary');
    const sig = `${Object.keys(lang.vocab).length}|${(lang.custom || []).length}|${vθ}|${(lang.reviewLog || []).length}|${(lang.mined || []).length}`;
    if (knownCache[code] && knownCache[code].sig === sig) return knownCache[code].set;
    // map stem → probability the learner knows it (0–1)
    const set = new Map();
    const c = corpus(code);
    const lvl = vθ == null ? 1 : vθ;
    const li = U.clamp(Math.floor(lvl), 0, 5);
    // words introduced by the curriculum around the learner's level: partial credit by distance;
    // very frequent words (≥4 sentences) behave like B1 words even if a higher-level text used them first
    Object.keys(c.first).forEach((st) => {
      const first = c.freq[st] >= 4 ? Math.min(c.first[st], 2) : c.first[st];
      set.set(st, U.clamp(0.5 + (lvl - (first + 0.5)) * 0.9, 0, 1));
    });
    c.ranked.slice(0, CORE_BY_LEVEL[li]).forEach((st) => set.set(st, 1));
    const arts = new Set(P(code).articles || []);
    Object.keys(lang.vocab).forEach((id) => {
      const st = lang.vocab[id];
      const v = LOS.learn.vocabItem(code, id);
      if (!v) return;
      const ok = st.assumed || LOS.ped.vstage(st) >= 2;
      const weak = LOS.ped.vstage(st) <= 1 && (st.fail || 0) > (st.ok || 0);
      tokens(v.w).filter((w) => !arts.has(w)).forEach((w) => { const k = stem(code, w); if (ok) set.set(k, 1); else if (weak) set.set(k, 0); });
    });
    knownCache[code] = { sig, set };
    return set;
  }
  /** coverage(code, text) → { pct, known, total, unknown:[words], band } ; band: easy | ideal | intensive | hard */
  function coverage(code, text) {
    const set = knownSet(code);
    const toks = tokens(text);
    if (!toks.length) return { pct: 1, known: 0, total: 0, unknown: [], band: 'ideal' };
    const unknown = {};
    let known = 0;
    toks.forEach((w, i) => {
      // names in the middle of a sentence (not German nouns) count as known
      if (code !== 'de' && i > 0 && /^[A-ZÁÉÍÓÚÜÖÄÀÈÇ]/.test(w)) { known++; return; }
      const k = w.length <= 2 ? 1 : set.get(stem(code, w)) || 0;
      known += k;
      if (k < 0.5) unknown[w] = (unknown[w] || 0) + 1;
    });
    const pct = known / toks.length;
    return { pct: U.round(pct, 3), known: Math.round(known), total: toks.length, unknown: Object.keys(unknown).sort((a, b) => unknown[b] - unknown[a]), band: band(pct) };
  }
  function band(pct) { return pct >= 0.985 ? 'easy' : pct >= 0.95 ? 'ideal' : pct >= 0.85 ? 'intensive' : 'hard'; }
  const BAND_TEXT = {
    easy: 'very easy — good for fluency and speed',
    ideal: 'ideal for extensive reading',
    intensive: 'use it as intensive study',
    hard: 'too difficult for now',
  };
  function label(cov) { return `You know ~${Math.round(cov.pct * 100)}% of the words — ${BAND_TEXT[cov.band]}`; }
  /** Built-in texts ranked by closeness to the 95–98% band. */
  function recommend(code, kind) {
    const p = P(code);
    return p.texts.filter((t) => !kind || t.kind === kind || (kind === 'listening' ? t.assess === 'listening' || t.kind === 'dialogue' || t.audio : t.assess !== 'listening'))
      .map((t) => ({ t, cov: coverage(code, t.text) }))
      .sort((a, b) => Math.abs(a.cov.pct - 0.965) - Math.abs(b.cov.pct - 0.965));
  }

  /* ==================================================================
   * SENTENCE MINING
   * ================================================================== */
  /** What the learner tapped: an existing item (chunk preferred) or a new word. */
  function lookup(code, word, sentence) {
    const p = P(code);
    const nw = U.norm(word);
    const items = p.vocab.concat(Object.values(LOS.ped.chunks(code)).filter((c) => c.tr || c.def), L(code).custom || []);
    // a chunk/collocation of the sentence that contains the word comes first
    const chunk = sentence ? items.filter((v) => v.w.includes(' ') && U.norm(v.w).split(' ').some((t) => stem(code, t) === stem(code, nw)) && LOS.ped.usesItem(code, v, sentence)).sort((a, b) => b.w.length - a.w.length)[0] : null;
    const arts = new Set(p.articles || []);
    const single = items.find((v) => { const t = tokens(v.w).filter((x) => !arts.has(x)); return t.length === 1 && (t[0] === nw || stem(code, t[0]) === stem(code, nw)); });
    return { chunk: chunk || null, item: single || null };
  }
  /** Add to learning: an existing item gets top priority for introduction; a new word becomes a personal item
   * with the original sentence as its example. Both enter the queue at stage 0 (seen next in a lesson). */
  function mine(code, { w, sentence, meaning, itemId, src }) {
    const lang = L(code);
    lang.mined = lang.mined || [];
    let id = itemId;
    if (!id) {
      const item = LOS.learn.addCustomVocab(code, { w: String(w).trim(), tr: meaning || '', def: meaning || '', ex: sentence || '', l: U.LEVELS[LOS.learn.targetLevelIdx(code, 'vocabulary')], src: src || 'mining', ctx: '' });
      id = item.id;
    }
    if (!lang.mined.some((x) => x.id === id)) lang.mined.unshift({ id, ctx: String(sentence || '').slice(0, 300), date: U.today() });
    if (lang.mined.length > 300) lang.mined.length = 300;
    return id;
  }
  function isMined(code, id) { return (L(code).mined || []).some((x) => x.id === id); }

  /* ==================================================================
   * EXTENSIVE INPUT LOG (separate from study sessions, never an obligation)
   * ================================================================== */
  function log(code, e) {
    const lang = L(code);
    lang.inputLog = lang.inputLog || [];
    const entry = Object.assign({ id: U.uid('inp'), date: U.today(), kind: 'reading', title: '', minutes: 0, words: 0, finished: true, src: 'manual' }, e);
    entry.minutes = U.clamp(Math.round(+entry.minutes || 0), 0, 600);
    entry.words = U.clamp(Math.round(+entry.words || 0), 0, 200000);
    lang.inputLog.unshift(entry);
    if (lang.inputLog.length > 400) lang.inputLog.length = 400;
    // real-world exposure of the week: ≥15 minutes of listening, or one text read
    const wk = U.weekStart(U.today(), LOS.store.state.settings.weekStart);
    const week = lang.inputLog.filter((x) => x.date >= wk);
    lang.exposure = lang.exposure || {};
    const cur = (lang.exposure[wk] = lang.exposure[wk] || {});
    if (U.sum(week.filter((x) => x.kind === 'listening').map((x) => x.minutes)) >= 15) cur.listen = true;
    if (week.some((x) => x.kind === 'reading' && x.finished)) cur.read = true;
    // extensive input nudges the receptive skill estimates a little (comprehension is self-reported)
    if (entry.minutes >= 5) LOS.skills.update(lang, entry.kind === 'listening' ? 'listening' : 'reading', LOS.learn.targetLevelIdx(code, entry.kind) + 0.3, 0.8, 0.01);
    return entry;
  }
  function stats(code, days = 7) {
    const since = U.addDays(U.today(), -(days - 1));
    const lang = L(code);
    const inp = (lang.inputLog || []).filter((x) => x.date >= since);
    const ext = (lang.listening || []).filter((x) => x.date >= since);
    return {
      readingMin: U.sum(inp.filter((x) => x.kind === 'reading').map((x) => x.minutes)),
      listeningMin: U.sum(inp.filter((x) => x.kind === 'listening').map((x) => x.minutes)) + U.sum(ext.map((x) => x.minutes || 0)),
      words: U.sum(inp.map((x) => x.words)),
      texts: inp.filter((x) => x.finished).length,
    };
  }
  LOS.input = { stem, tokens, corpus, knownSet, coverage, band, label, recommend, lookup, mine, isMined, log, stats, BAND_TEXT };

  /* ==================================================================
   * DICTATION
   * ================================================================== */
  /** Sentences made only of language the learner has met: examples of items at stage ≥1 (recall-level first). */
  function pickSentences(code, n = 5, opts = {}) {
    const lang = L(code);
    const rnd = opts.rnd || Math.random;
    const cands = [];
    Object.keys(lang.vocab).forEach((id) => {
      const st = lang.vocab[id];
      const s = LOS.ped.vstage(st);
      if (s < 1 && !st.assumed) return;
      const v = LOS.learn.vocabItem(code, id);
      const ex = v && (v.ex || (v.ctxs || [])[0]);
      if (!ex) return;
      const nw = tokens(ex).length;
      if (nw < 4 || nw > (opts.paragraph ? 22 : 15)) return;
      const cov = coverage(code, ex).pct;
      cands.push({ id, text: ex, w: (s >= 2 ? 2 : 1) + cov + rnd() * 0.5 });
    });
    if (cands.length < n) P(code).grammar.filter((t) => lang.grammar[t.id] && LOS.ped.gstage(lang.grammar[t.id]) >= 2).forEach((t) => t.ex.forEach((ex) => cands.push({ id: null, topic: t.id, text: ex, w: 1 + rnd() * 0.3 })));
    cands.sort((a, b) => b.w - a.w);
    const seen = new Set();
    return cands.filter((c) => { const k = U.norm(c.text); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n);
  }
  /** Word-by-word diff with error types: ok · accent · case · spelling · wrong · missing · extra. */
  function diff(code, expected, given) {
    const tok = (s) => (String(s).match(/[\p{L}][\p{L}'’-]*|\d+/gu) || []);
    const A = tok(expected), B = tok(given);
    const key = (w) => U.stripAccents(w.toLowerCase().replace(/ß/g, 'ss'));
    // LCS on accent/case-insensitive keys, then classify aligned pairs
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = key(A[i]) === key(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = [];
    let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && key(A[i]) === key(B[j])) {
        const t = A[i] === B[j] ? 'ok' : A[i].toLowerCase() === B[j].toLowerCase() ? 'case' : 'accent';
        out.push({ t, exp: A[i], got: B[j] }); i++; j++;
      } else if (i < n && j < m && dp[i + 1][j + 1] >= Math.max(dp[i + 1][j], dp[i][j + 1])) {
        // substitution: a near miss is spelling, otherwise a wrong word (often an ending → grammar)
        // an ending that differs (gehe/gehen, admits/admitted) is a form error; a slip inside the word is spelling
        const ka = key(A[i]), kb = key(B[j]);
        const d = U.lev(ka, kb);
        let cp = 0; while (cp < ka.length && cp < kb.length && ka[cp] === kb[cp]) cp++;
        const sameRoot = cp >= 4 || (cp >= 3 && Math.min(ka.length, kb.length) <= 5);
        const ra = ka.slice(cp), rb = kb.slice(cp);
        const ending = sameRoot && cp >= Math.min(ka.length, kb.length) - 2 && (!ra || !rb || ra.slice(-1) !== rb.slice(-1));
        out.push({ t: ending ? 'form' : d <= Math.max(1, Math.floor(A[i].length / 4)) ? 'spelling' : sameRoot ? 'form' : 'wrong', exp: A[i], got: B[j] }); i++; j++;
      } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { out.push({ t: 'extra', got: B[j] }); j++; }
      else { out.push({ t: 'missing', exp: A[i] }); i++; }
    }
    const errs = out.filter((x) => x.t !== 'ok');
    const score = A.length ? out.filter((x) => x.t === 'ok').length / A.length : 1;
    return { tokens: out, errors: errs, score: U.round(Math.max(0, score - out.filter((x) => x.t === 'extra').length * 0.05), 2), perfect: !errs.length };
  }
  /** Turn dictation mistakes into error-bank entries (spelling vs grammar vs listening). */
  function recordDiff(code, expected, given, d) {
    const groups = { spelling: [], form: [], listen: [], accent: [], case: [] };
    d.errors.forEach((e) => { if (e.t === 'spelling') groups.spelling.push(e); else if (e.t === 'form') groups.form.push(e); else if (e.t === 'accent') groups.accent.push(e); else if (e.t === 'case') groups.case.push(e); else groups.listen.push(e); });
    const base = { src: 'dictation', wrong: given, right: expected };
    if (groups.form.length) LOS.learn.recordError(code, Object.assign({ cat: 'grammar', label: 'Word endings (dictation)', note: groups.form.map((e) => `${e.got} → ${e.exp}`).join(', ') }, base));
    if (groups.listen.length >= 1) LOS.learn.recordError(code, Object.assign({ cat: 'listening', label: 'Word boundaries & missed words', note: groups.listen.map((e) => e.exp ? `missed “${e.exp}”` : `extra “${e.got}”`).join(', ') }, base));
    if (groups.spelling.length) LOS.learn.recordError(code, Object.assign({ cat: 'spelling', label: 'Spelling (dictation)', note: groups.spelling.map((e) => `${e.got} → ${e.exp}`).join(', ') }, base));
    if (groups.accent.length) LOS.learn.recordError(code, Object.assign({ cat: 'spelling', label: code === 'de' ? 'Umlauts' : 'Accents', note: groups.accent.map((e) => `${e.got} → ${e.exp}`).join(', ') }, base));
    if (groups.case.length && code === 'de') LOS.learn.recordError(code, Object.assign({ cat: 'capitalisation', label: 'Capital letters for nouns', note: groups.case.map((e) => `${e.got} → ${e.exp}`).join(', ') }, base));
  }
  LOS.dictation = { pick: pickSentences, diff, recordDiff };

  /* ==================================================================
   * SPOKEN ANSWERS (hands-free review)
   * ================================================================== */
  function bare(code, s) {
    const arts = new Set((P(code).articles || []).concat(code === 'en' ? ['the', 'a', 'an', 'to'] : code === 'es' ? ['el', 'la', 'los', 'las', 'un', 'una'] : []));
    return tokens(s).filter((w) => !arts.has(w)).map((w) => U.stripAccents(w.replace(/ß/g, 'ss'))).join(' ');
  }
  /** match(code, expected, heard) → { correct, close } — tolerant: articles, accents, small recognition slips. */
  function match(code, expected, heard) {
    const e = bare(code, expected), h = bare(code, heard);
    if (!h) return { correct: false, close: false };
    if (e === h || (' ' + h + ' ').includes(' ' + e + ' ')) return { correct: true, close: false };
    const d = U.lev(e, h);
    if (d <= Math.max(1, Math.round(e.length * 0.2))) return { correct: true, close: true };
    const ew = e.split(' '), hw = new Set(h.split(' '));
    const share = ew.filter((w) => hw.has(w)).length / ew.length;
    return { correct: share >= 0.8 && ew.length >= 3, close: share >= 0.5 };
  }
  LOS.spoken = { match };

  /* ==================================================================
   * INTERFERENCE BETWEEN TARGET LANGUAGES
   * ================================================================== */
  // very frequent words that only exist in one language (a strong sign of mixing)
  const MARKERS = {
    en: ['the', 'and', 'but', 'with', 'very', 'always', 'never', 'because', 'when', 'then', 'also', 'without', 'which', 'this', 'that', 'there', 'they', 'have', 'would', 'should', 'please', 'thanks'],
    es: ['pero', 'muy', 'también', 'porque', 'entonces', 'ahora', 'siempre', 'nunca', 'cuando', 'donde', 'hay', 'tengo', 'tiene', 'gracias', 'por favor', 'pues', 'aquí', 'mucho', 'mucha', 'ayer', 'hoy', 'mañana', 'nosotros', 'ustedes', 'están', 'estoy', 'usted', 'y', 'el', 'los', 'las', 'del', 'una', 'lo'],
    fr: ['mais', 'aussi', 'avec', 'pour', 'très', 'toujours', 'jamais', 'quand', 'alors', 'beaucoup', 'aujourd\'hui', 'hier', 'demain', 'nous', 'vous', 'je', 'suis', 'est', 'sont', 'merci', 'oui', 'non', 'le', 'les', 'du', 'des', 'et', 'au', 'aux', 'ce', 'cette', 'il', 'elle', 'pas', 'ne', 'que'],
    de: ['aber', 'auch', 'sehr', 'immer', 'nie', 'wenn', 'dann', 'weil', 'oder', 'und', 'nicht', 'ich', 'bin', 'ist', 'sind', 'danke', 'bitte', 'heute', 'gestern', 'morgen', 'wir', 'sie', 'der', 'die', 'das', 'mit', 'für', 'ein', 'eine', 'auf', 'zu', 'nach', 'noch', 'schon'],
  };
  // markers that are ALSO normal words of another language are not used to detect mixing into it
  const SHARED = { es: ['y', 'lo', 'una', 'no'], fr: ['est', 'je', 'il', 'que', 'ne', 'ce'], de: ['die', 'sie', 'morgen'], en: [] };
  function lexicon(code) { const c = corpus(code); return c; }
  function wordGender(code) {
    const out = {};
    (P(code).vocab || []).forEach((v) => { if (!v.g || !v.tr) return; const head = tokens(v.w).filter((w) => !(P(code).articles || []).includes(w)).join(' '); out[head] = { g: v.g, tr: U.norm(v.tr.split(/[,;/(]/)[0]), w: v.w }; });
    return out;
  }
  const ART = { es: { el: 'm', la: 'f', un: 'm', una: 'f' }, fr: { le: 'm', la: 'f', un: 'm', une: 'f' } };
  /** detect(code, text, others?) → [{ kind: 'word'|'gender'|'falsefriend', match, from, note, fix }] */
  function detect(code, text, others) {
    others = (others || LOS.store.studying()).filter((c) => c !== code && MARKERS[c]);
    const out = [];
    const toks = tokens(text);
    const own = new Set(MARKERS[code] || []);
    const ownLex = corpus(code).freq;
    // 1. a frequent function word of another target language
    toks.forEach((w) => {
      if (own.has(w) || ownLex[stem(code, w)]) return;
      others.forEach((o) => {
        if ((MARKERS[o] || []).includes(w) && !(SHARED[code] || []).includes(w) && w.length >= 2 && !out.some((x) => x.match === w)) out.push({ kind: 'word', match: w, from: o, note: `“${w}” is ${LOS.lang.get(o).name}, not ${P(code).name}.` });
      });
    });
    // 2. gender carried over (Spanish ↔ French): article + noun whose gender differs here
    if (ART[code]) {
      const gHere = wordGender(code);
      const re = new RegExp(`(?<![\\p{L}])(${Object.keys(ART[code]).join('|')})\\s+([\\p{L}'-]+)`, 'giu');
      let m;
      while ((m = re.exec(text))) {
        const art = m[1].toLowerCase(), noun = m[2].toLowerCase();
        const it = gHere[noun];
        if (!it || it.g === ART[code][art]) continue;
        const other = others.find((o) => ART[o] && Object.values(wordGender(o)).some((x) => x.tr === it.tr && x.g === ART[code][art]));
        out.push({ kind: 'gender', match: `${m[1]} ${m[2]}`, from: other || null, fix: it.w, note: `In ${P(code).name} it is “${it.w}”${other ? ` — the ${LOS.lang.get(other).name} word has the other gender` : ''}.` });
      }
    }
    // 1b. Italian words (native-language interference)
    if ((LOS.store.state.profile || {}).native === 'it' || !(LOS.store.state.profile || {}).native) {
      toks.forEach((w) => { if ((LOS.ITALIAN_MARKERS || []).includes(w) && !own.has(w) && !ownLex[stem(code, w)] && !out.some((x) => x.match === w)) out.push({ kind: 'word', match: w, from: 'it', note: `“${w}” is Italian, not ${P(code).name}.` }); });
    }
    // 3. cross-language false friends
    (LOS.FALSE_FRIENDS || []).forEach((f) => {
      const here = f[code];
      if (!here || !here.trap) return;
      if (new RegExp(`(?<![\\p{L}])${here.trap}(?![\\p{L}])`, 'iu').test(text)) out.push({ kind: 'falsefriend', match: here.trap, from: f.from || null, note: here.note, fix: here.fix });
    });
    return out;
  }
  function record(code, text, hits) {
    hits.forEach((h) => LOS.learn.recordError(code, { src: 'interference', cat: 'crosslang', label: h.kind === 'gender' ? 'Gender carried over from another language' : h.kind === 'falsefriend' ? 'False friend across languages' : 'Word from another language', wrong: text.length < 220 ? text : h.match, right: h.fix || '', note: h.note, pat: h.match, from: h.from || undefined }));
  }
  /** Contrastive items: the Italian idea + the right version in this language among other target languages. */
  function contrastItems(code, n = 3, rnd = Math.random) {
    const others = LOS.store.studying().filter((c) => c !== code);
    if (!others.length) return [];
    return U.shuffle((LOS.compare || []).filter((c) => c.s[code] && others.some((o) => c.s[o])), rnd).slice(0, n).map((c) => {
      const first = (s) => String(s).split(' / ')[0];
      const opts = [first(c.s[code])].concat(others.filter((o) => c.s[o]).map((o) => first(c.s[o]))).slice(0, 4);
      const o = U.shuffle([...new Set(opts)], rnd);
      return { micro: 'contrast', title: `Which one is ${P(code).name}?`, kind: 'mcq', prompt: `${c.title} — ${first(c.s.it)}`, options: o, answer: o.indexOf(first(c.s[code])), why: c.notes[0] };
    });
  }
  LOS.interference = { detect, record, contrastItems, MARKERS };

  /* ==================================================================
   * MONTHLY RECALIBRATION (optional, ~8–10 minutes)
   * ================================================================== */
  const RECAL_KEYS = ['grammar', 'vocabulary', 'usage', 'reading'];
  function due(code) { const r = L(code).recal || {}; return !r.last || U.diffDays(r.last, U.today()) >= 30; }
  function bank(code, key) {
    const p = P(code);
    if (key === 'reading') {
      const out = [];
      p.texts.filter((t) => t.assess === 'reading').forEach((t) => t.qs.forEach((q, qi) => out.push({ id: `${t.id}#${qi}`, l: t.l, text: t.text, title: t.title, q: q.q, o: q.o, a: q.a })));
      return out;
    }
    return (p.assessment[key] || []).map((x, i) => Object.assign({ id: `${key}:${i}` }, x));
  }
  /** Adaptive mini test: 3 items per skill, each next item closest to the current estimate. */
  function startRecal(code) {
    const lang = L(code);
    const theta = {};
    RECAL_KEYS.forEach((k) => { const t = LOS.skills.theta(lang, k === 'usage' ? 'speaking' : k); theta[k] = t == null ? 2 : t; });
    return { code, theta, n: {}, used: new Set((lang.recal && lang.recal.used) || []), log: [], i: 0, order: [].concat(...[0, 1, 2].map(() => RECAL_KEYS)) };
  }
  function nextRecal(d) {
    if (d.i >= d.order.length) return null;
    const key = d.order[d.i];
    const items = bank(d.code, key).filter((x) => !d.used.has(x.id) && !d.log.some((l) => l.id === x.id));
    const pool = items.length ? items : bank(d.code, key);
    const it = pool.slice().sort((a, b) => Math.abs(U.levelIndex(a.l) + 0.5 - d.theta[key]) - Math.abs(U.levelIndex(b.l) + 0.5 - d.theta[key]))[0];
    return it ? Object.assign({ key }, it) : null;
  }
  function answerRecal(d, item, value) {
    const ok = +value === item.a;
    const k = item.key;
    d.n[k] = (d.n[k] || 0) + 1;
    const diff = U.levelIndex(item.l) + 0.5;
    const p = 1 / (1 + Math.exp(-(d.theta[k] - diff) * 1.7));
    d.theta[k] = U.clamp(d.theta[k] + (0.9 / d.n[k]) * ((ok ? 1 : 0) - p) * 1.6, 0, 6);
    d.log.push({ id: item.id, key: k, ok });
    d.i++;
    return ok;
  }
  /** Blend the measured estimate into the stored one (never a jump from a 10-minute test). */
  function finishRecal(d) {
    const lang = L(d.code);
    const changes = [];
    RECAL_KEYS.forEach((k) => {
      const skill = k === 'usage' ? null : k;
      if (!skill || !d.n[k]) return;
      const before = LOS.skills.theta(lang, skill);
      const after = before == null ? d.theta[k] : before * 0.65 + d.theta[k] * 0.35;
      lang.skills[skill] = Object.assign({ n: 0, hist: [] }, lang.skills[skill], { theta: U.round(after, 2) });
      (lang.skills[skill].hist = lang.skills[skill].hist || []).push([U.today(), U.round(after, 2)]);
      changes.push({ skill, before, after: U.round(after, 2) });
    });
    const acc = d.log.length ? d.log.filter((x) => x.ok).length / d.log.length : 0;
    lang.recal = { last: U.today(), used: [...new Set([...(lang.recal && lang.recal.used) || [], ...d.log.map((x) => x.id)])].slice(-200), hist: [{ date: U.today(), acc: U.round(acc, 2), changes }].concat((lang.recal && lang.recal.hist) || []).slice(0, 12) };
    return { acc, changes };
  }
  LOS.recal = { due, start: startRecal, next: nextRecal, answer: answerRecal, finish: finishRecal, KEYS: RECAL_KEYS };

  /* ==================================================================
   * CAN-DO CHECKLIST
   * ================================================================== */
  function candoList(code) {
    const C = LOS.shared.CANDO || {};
    const lang = L(code);
    const out = [];
    Object.keys(C).forEach((skill) => U.LEVELS.forEach((lv) => (C[skill][lv] || []).forEach((txt, i) => out.push({ key: `${skill}:${lv}:${i}`, skill, l: lv, text: txt, ticked: !!(lang.cando || {})[`${skill}:${lv}:${i}`] }))));
    return out;
  }
  function toggleCando(code, key) { const lang = L(code); lang.cando = lang.cando || {}; if (lang.cando[key]) delete lang.cando[key]; else lang.cando[key] = U.today(); }
  /** Gentle disagreements: ticked statements well above the measured level, or unticked ones well below. */
  function disagreements(code) {
    const lang = L(code);
    const out = [];
    candoList(code).forEach((c) => {
      const sk = c.skill === 'grammar' || c.skill === 'vocabulary' || LOS.shared.CANDO[c.skill] ? c.skill : null;
      const th = LOS.skills.theta(lang, sk);
      if (th == null) return;
      const li = U.levelIndex(c.l);
      if (c.ticked && th < li - 0.6) out.push({ c, kind: 'over', text: `You say: “${c.text}” (${c.l}). Your recent results in ${U.SKILL_LABEL[sk] || sk} suggest ${U.thetaInfo(th).sub} — keep practising it, the evidence will follow.` });
      if (!c.ticked && th >= li + 1.2 && li <= 4) out.push({ c, kind: 'under', text: `Your results in ${U.SKILL_LABEL[sk] || sk} (${U.thetaInfo(th).sub}) suggest you can already: “${c.text}”.` });
    });
    return out.slice(0, 6);
  }
  LOS.cando = { list: candoList, toggle: toggleCando, disagreements };
})();

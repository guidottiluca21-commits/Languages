/* WRITING ANALYZER (local heuristics).
 * Produces: per-sentence corrections ("your sentence → corrected → more natural → why"),
 * eight dimension scores (1–5), and a rough CEFR estimate for the text.
 * It is deliberately transparent: rules come from the language pack (Italian-speaker interference,
 * false friends, agreement, prepositions…). Full rewriting/feedback on arbitrary errors needs an LLM
 * — see LOS.AI.evaluateWriting, which can delegate to a backend when configured. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;

  function matchCase(src, rep) {
    if (!rep) return rep;
    if (src && src[0] === src[0].toUpperCase() && src[0] !== src[0].toLowerCase()) return rep.charAt(0).toUpperCase() + rep.slice(1);
    return rep;
  }
  function substitute(tpl, args) { return tpl.replace(/\$(\d)/g, (_, n) => args[+n] || ''); }

  function runRules(pack, text, severity, issues) {
    let out = text;
    pack.checks.filter((r) => (r.severity || 'error') === severity).forEach((rule) => {
      const flags = rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g';
      const re = new RegExp(rule.re.source, flags);
      out = out.replace(re, function () {
        const args = Array.prototype.slice.call(arguments);
        const m = args[0];
        if (rule.except && rule.except.test(m)) return m;
        let rep = null;
        if (typeof rule.fix === 'function') { try { rep = rule.fix.apply(null, args); } catch (e) { rep = null; } }
        else if (typeof rule.fix === 'string') rep = substitute(rule.fix, args);
        if (rep != null) rep = matchCase(m, rep);
        issues.push({ rule: rule.id, match: m.trim(), suggestion: rep != null ? rep.trim() : null, cat: rule.cat, label: rule.label, why: rule.why, topic: rule.topic || null, severity });
        return rep != null ? rep : m;
      });
    });
    return out;
  }

  /** Check one sentence. Returns corrected (errors fixed) and natural (hints applied too). */
  function checkSentence(pack, sentence) {
    const issues = [];
    const corrected = runRules(pack, sentence, 'error', issues);
    const natural = runRules(pack, corrected, 'hint', issues);
    return { original: sentence, corrected, natural, issues };
  }

  function findPhrases(textNorm, list) {
    return (list || []).filter((p) => {
      const n = U.norm(p);
      if (!n) return false;
      const re = new RegExp('(^|[^\\p{L}])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u');
      return re.test(textNorm);
    });
  }

  function analyze(code, text, ctx = {}) {
    const pack = LOS.lang.get(code);
    const raw = String(text || '').trim();
    const words = U.words(raw);
    const nWords = words.length;
    const paragraphs = raw.split(/\n\s*\n/).filter((p) => p.trim()).length || (raw ? 1 : 0);
    const sents = U.sentences(raw);
    const textNorm = ' ' + U.norm(raw.replace(/\n/g, ' ')) + ' ';
    const taskIdx = ctx.level != null ? U.levelIndex(ctx.level) : 2;

    // 1. rules
    const sentencesOut = sents.map((s) => checkSentence(pack, s));
    const issues = [].concat(...sentencesOut.map((s) => s.issues.map((i) => Object.assign({ sentence: s.original }, i))));
    const errors = issues.filter((i) => i.severity === 'error');
    const hints = issues.filter((i) => i.severity !== 'error');

    // 2. register
    const reg = ctx.reg || 'neutral';
    const regIssues = [];
    const informalFound = findPhrases(textNorm, pack.informal);
    if (reg === 'formal') {
      const contr = pack.contractions ? (raw.match(pack.contractions) || []) : [];
      if (contr.length) regIssues.push({ cat: 'register', label: 'Register', why: ((pack.registerNotes || {}).contractions || 'Contractions in a formal text ({x}).').replace('{x}', contr.slice(0, 3).join(', ')), count: contr.length });
      if (informalFound.length) regIssues.push({ cat: 'register', label: 'Register', why: `Informal words in a formal text: ${informalFound.join(', ')}.`, count: informalFound.length });
      if (pack.tuFormal) { const tu = raw.match(pack.tuFormal) || []; if (tu.length >= 2) regIssues.push({ cat: 'register', label: 'Register', why: (pack.registerNotes || {}).formalYou || 'Informal "you" in a formal text.', count: tu.length }); }
    } else if (reg === 'neutral' && informalFound.length > 1) {
      regIssues.push({ cat: 'register', label: 'Register', why: `Quite informal: ${informalFound.join(', ')}.`, count: informalFound.length });
    }

    // 3. lexical profile
    const lex = pack.lexicon || {};
    const wset = new Set(words);
    const adv = [];
    ['B2', 'C1', 'C2'].forEach((lvl, i) => (lex[lvl] || []).forEach((w) => { if (wset.has(w.toLowerCase()) || (w.includes(' ') && textNorm.includes(' ' + w + ' '))) adv.push({ w, lvl, weight: 1 + i * 0.6 }); }));
    const items = LOS.learn.vocabItems(code);
    const chunks = items.filter((v) => v.k !== 'word' && v.w.includes(' ') && findPhrases(textNorm, [v.w]).length).map((v) => v.w);
    const singleAdv = items.filter((v) => v.k === 'word' && U.levelIndex(v.l) >= 3 && wset.has(v.w.toLowerCase())).map((v) => ({ w: v.w, lvl: v.l, weight: 1 + (U.levelIndex(v.l) - 3) * 0.6 }));
    singleAdv.forEach((a) => { if (!adv.find((x) => x.w === a.w)) adv.push(a); });

    // 4. connectors
    const conns = [];
    Object.keys(pack.connectors || {}).forEach((lvl) => findPhrases(textNorm, pack.connectors[lvl]).forEach((c) => conns.push({ c, lvl })));
    const uniqueConn = new Set(conns.map((c) => c.c)).size;
    const maxConnLvl = conns.length ? Math.max(...conns.map((c) => U.levelIndex(c.lvl))) : 0;

    // 5. syntax
    const avgLen = sents.length ? nWords / sents.length : 0;
    const subs = findPhrases(textNorm, pack.subordinators).length;
    const subRate = sents.length ? (raw.match(new RegExp('\\b(' + (pack.subordinators || []).join('|') + ')\\b', 'gi')) || []).length / sents.length : 0;
    const starts = sents.map((s) => (U.words(s)[0] || ''));
    const startVar = starts.length ? new Set(starts).size / starts.length : 0;

    // 6. variety
    const mattr = U.mattr(words);
    const content = words.filter((w) => w.length > 3 && !(pack.stop || []).includes(w));
    const freq = U.countBy(content, (w) => w);
    const repeated = Object.keys(freq).filter((w) => freq[w] >= (nWords < 200 ? 4 : 6));

    // 7. coherence (overlap of content words between adjacent sentences)
    let overlap = 0;
    for (let i = 1; i < sents.length; i++) {
      const a = new Set(U.words(sents[i - 1]).filter((w) => w.length > 4));
      const b = U.words(sents[i]).filter((w) => w.length > 4);
      if (b.some((w) => a.has(w))) overlap++;
    }
    const overlapRate = sents.length > 1 ? overlap / (sents.length - 1) : 0;

    // 8. scores (1–5)
    const per100 = Math.max(1, nWords / 100);
    const errRate = errors.length / per100;
    const sc = {};
    sc.grammar = U.clamp(5 - errRate * 0.9 - (errors.filter((e) => e.cat === 'grammar').length > 3 ? 0.3 : 0), 1, 5);
    const advScore = U.sum(adv.map((a) => a.weight)) + chunks.length * 1.2;
    sc.vocabulary = U.clamp(1.6 + (advScore / per100) * 0.45 + (nWords > 80 ? 0.3 : 0), 1, 5);
    let syn = 2.2;
    if (avgLen >= 10 && avgLen <= 28) syn += 0.9; else if (avgLen < 7) syn -= 0.5; else if (avgLen > 34) syn -= 0.7;
    if (subRate >= 0.5) syn += 0.7; if (subRate >= 1) syn += 0.4;
    if (startVar > 0.6) syn += 0.4;
    sc.syntax = U.clamp(syn, 1, 5);
    const expectedConn = Math.max(1, sents.length / 2.5);
    sc.cohesion = U.clamp(1.4 + Math.min(uniqueConn / expectedConn, 1.3) * 1.8 + maxConnLvl * 0.22, 1, 5);
    let coh = 3;
    if (nWords > 120) coh += paragraphs >= 2 ? 0.5 : -0.7;
    if (overlapRate > 0.25) coh += 0.5;
    if (ctx.words) { if (nWords < ctx.words[0] * 0.6) coh -= 1; else if (nWords >= ctx.words[0]) coh += 0.4; }
    if (sents.length <= 1 && nWords > 25) coh -= 0.5;
    sc.coherence = U.clamp(coh, 1, 5);
    sc.register = U.clamp(5 - U.sum(regIssues.map((r) => Math.min(2, r.count * 0.4))), 1, 5);
    const natIssues = issues.filter((i) => ['interference', 'falsefriend', 'collocation', 'naturalness'].includes(i.cat));
    sc.naturalness = U.clamp(4 - (natIssues.filter((i) => i.severity === 'error').length + natIssues.filter((i) => i.severity !== 'error').length * 0.4) / per100 * 0.8 + Math.min(1, chunks.length * 0.3), 1, 5);
    const mv = mattr < 0.5 ? 1.5 : mattr < 0.55 ? 2.3 : mattr < 0.62 ? 3.1 : mattr < 0.7 ? 3.9 : mattr < 0.76 ? 4.5 : 5;
    sc.variety = U.clamp(mv - (repeated.length ? 0.5 : 0), 1, 5);
    Object.keys(sc).forEach((k) => (sc[k] = U.round(sc[k], 1)));

    // 9. CEFR estimate for this text
    const f = sc.grammar * 0.22 + sc.vocabulary * 0.2 + sc.syntax * 0.16 + sc.cohesion * 0.14 + sc.variety * 0.14 + sc.coherence * 0.07 + sc.naturalness * 0.07;
    let est = taskIdx + 0.5 + (f - 3.2) * 0.75;
    if (nWords < 30) est = Math.min(est, 2.4);
    else if (nWords < 70) est = Math.min(est, 3.6);
    est = U.clamp(est, 0, 6);

    // 10. targets
    const keysUsed = findPhrases(textNorm, ctx.keys || []);
    const keysMissing = (ctx.keys || []).filter((k) => !keysUsed.includes(k));

    // 10b. ways to go further: richer vocabulary, the next level of connectors, structures to review
    const up = pack.upgrades || {};
    const upgrades = Object.keys(up).filter((k) => wset.has(k.toLowerCase())).map((k) => ({ w: k, alts: up[k] })).slice(0, 6);
    const usedConn = new Set(conns.map((c) => c.c));
    const nextLvl = U.LEVELS[Math.min(5, Math.max(maxConnLvl + 1, taskIdx))];
    const nextConnectors = ((pack.connectors || {})[nextLvl] || []).filter((c) => !usedConn.has(c)).slice(0, 5);
    const review = [...new Set(issues.map((i) => i.topic).filter(Boolean))].map((id) => pack.index.grammar[id]).filter(Boolean).map((t) => ({ id: t.id, title: t.title, l: t.l }));
    const register = { target: reg, informal: informalFound, ok: !regIssues.length };

    // 11. human-readable notes
    const notes = [];
    if (errors.length === 0 && nWords > 20) notes.push('No rule-based errors found. (Local checks cover common patterns only.)');
    if (chunks.length) notes.push(`Good use of chunks/collocations: ${chunks.slice(0, 5).join(', ')}.`);
    if (uniqueConn < expectedConn * 0.6 && sents.length > 2) notes.push(`Link your ideas more: add connectors (${((pack.connectors || {}).B2 || []).slice(0, 3).join(', ')}…).`);
    if (avgLen > 30) notes.push('Some sentences are very long — split them for clarity.');
    if (avgLen && avgLen < 8 && nWords > 30) notes.push('Sentences are short and simple — try combining ideas with relative or subordinate clauses.');
    if (repeated.length) notes.push(`Repeated words: ${repeated.slice(0, 4).join(', ')} — vary your vocabulary.`);
    if (nWords > 120 && paragraphs < 2) notes.push('Organise the text into paragraphs.');
    regIssues.forEach((r) => notes.push(r.why));

    return {
      words: nWords, sentences: sents.length, paragraphs, avgLen: U.round(avgLen, 1), mattr: U.round(mattr, 2),
      connectors: conns, advanced: adv, chunks, repeated, keysUsed, keysMissing,
      sentencesOut, issues, errors, hints, regIssues, scores: sc, overall: U.round(U.avg(Object.values(sc)), 1),
      code, estTheta: U.round(est, 2), notes, upgrades, nextConnectors, nextLevel: nextLvl, review, register,
    };
  }

  /** Speaking-transcript analysis: fluency proxies on top of the text analysis. */
  function analyzeSpeech(code, transcript, secs, ctx = {}) {
    const pack = LOS.lang.get(code);
    const a = analyze(code, transcript, Object.assign({ reg: 'neutral' }, ctx));
    const wpm = secs > 5 ? Math.round((a.words / secs) * 60) : 0;
    const tn = ' ' + U.norm(transcript) + ' ';
    const fillers = (pack.fillers || []).reduce((n, f) => n + (tn.split(' ' + f + ' ').length - 1), 0);
    const lvl = U.LEVELS[ctx.level != null ? U.levelIndex(ctx.level) : 2];
    const [lo, hi] = LOS.shared.WPM[lvl] || [80, 120];
    let flu = wpm ? (wpm < lo * 0.6 ? 1.5 : wpm < lo ? 2.7 : wpm <= hi * 1.15 ? 4 : 3.5) : 0;
    if (wpm && fillers / Math.max(1, a.words) > 0.08) flu -= 0.7;
    a.speech = { wpm, fillers, fluency: wpm ? U.round(U.clamp(flu, 1, 5), 1) : null, band: [lo, hi] };
    return a;
  }

  LOS.writing = { analyze, analyzeSpeech, checkSentence };
})();

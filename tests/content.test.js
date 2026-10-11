/* Node test: every language pack is complete and internally consistent.
 * - grammar/vocabulary/texts/placement/drills/medical/professional present for every CEFR band
 * - exercise answers and references are valid
 * - writing checks compile and do NOT flag the curriculum's own correct sentences (false positives)
 * Run: node tests/content.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console, Math, Date, JSON, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
ctx.window = ctx;
vm.createContext(ctx);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="(js\/(?:core|content\/[^"]+))\.js"><\/script>/g)].map((m) => m[1] + '.js');
files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const LOS = ctx.LOS, U = LOS.util;
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('FAIL', msg); } };
const LEVELS = U.LEVELS;

const codes = LOS.lang.codes();
ok(JSON.stringify(codes) === JSON.stringify(['en', 'es', 'de', 'fr']), `four languages registered in order (got ${codes})`);
ok(Object.keys(LOS.LANGUAGES).every((c) => codes.includes(c)), 'every LANGUAGES entry has content packs');

for (const code of codes) {
  const p = LOS.lang.get(code);
  const tag = `[${code}]`;
  ['name', 'native', 'flag', 'locale', 'speech', 'color'].forEach((k) => ok(p[k], `${tag} meta "${k}" from the registry`));
  const cats = new Set(LOS.lang.errorCats(code).map(([k]) => k));

  /* grammar */
  const ids = p.grammar.map((t) => t.id);
  ok(new Set(ids).size === ids.length, `${tag} grammar ids unique`);
  ok(ids.every((id) => id.startsWith(code + '-')), `${tag} grammar ids use the language code as prefix`);
  LEVELS.forEach((l) => ok(p.grammar.filter((t) => t.l === l).length >= 4, `${tag} at least 4 grammar topics at ${l}`));
  p.grammar.forEach((t) => {
    ok(t.title && t.sum && t.explain.length >= 2 && t.ex.length >= 1 && t.use, `${tag} ${t.id} has lesson content`);
    ok(t.x.length >= 3, `${tag} ${t.id} has ≥3 exercises`);
    (t.pre || []).forEach((pr) => ok(p.index.grammar[pr], `${tag} ${t.id} prerequisite ${pr} exists`));
    if (t.ecat) ok(cats.has(t.ecat), `${tag} ${t.id} error category "${t.ecat}" is declared`);
    t.x.forEach((x, i) => {
      const w = `${tag} ${t.id}#${i}`;
      ok(['gap', 'mc', 'fix', 'tr'].includes(x.t), `${w} known type`);
      if (x.t === 'mc') ok(Array.isArray(x.o) && x.a >= 0 && x.a < x.o.length, `${w} mc answer index valid`);
      else ok(Array.isArray(x.a) && x.a.length && x.a.every((s) => String(s).trim()), `${w} has answers`);
      if (x.t === 'gap') ok((x.q.match(/___/g) || []).length === 1, `${w} gap has exactly one blank`);
      ok(x.w, `${w} has an explanation`);
      ok([1, 2, 3].includes(x.d), `${w} difficulty 1–3`);
    });
  });

  /* vocabulary */
  const vids = p.vocab.map((v) => v.id);
  ok(new Set(vids).size === vids.length, `${tag} vocabulary ids unique`);
  ok(p.vocab.length >= 60, `${tag} at least 60 vocabulary items (got ${p.vocab.length})`);
  p.vocab.forEach((v) => {
    ok(v.w && v.tr && v.def && v.ex && LEVELS.includes(v.l), `${tag} vocab "${v.w}" complete`);
    if (v.g) ok(['m', 'f', 'n'].includes(v.g) && v.pl, `${tag} noun "${v.w}" has gender and plural`);
  });
  if (code === 'de' || code === 'fr') {
    const nouns = p.vocab.filter((v) => /^(der|die|das|le|la|l'|les) /.test(v.w) || /^l'/.test(v.w));
    ok(nouns.length >= 20 && nouns.every((v) => v.g && v.pl), `${tag} nouns are stored with article, gender and plural`);
  }

  /* texts & placement */
  ['reading', 'listening'].forEach((k) => LEVELS.forEach((l) => ok(p.texts.some((t) => t.assess === k && t.l === l), `${tag} ${k} text at ${l}`)));
  p.texts.forEach((t) => t.qs.forEach((q, i) => ok(q.a >= 0 && q.a < q.o.length, `${tag} ${t.id} q${i} answer valid`)));
  const A = p.assessment;
  ['grammar', 'vocabulary', 'usage'].forEach((k) => LEVELS.forEach((l) => ok(A[k].some((x) => x.l === l), `${tag} placement ${k} item at ${l}`)));
  ['grammar', 'vocabulary', 'usage'].forEach((k) => A[k].forEach((x, i) => ok(x.a >= 0 && x.a < x.o.length, `${tag} placement ${k}#${i} answer valid`)));
  A.grammar.forEach((x) => ok(!x.topic || p.index.grammar[x.topic], `${tag} placement topic ${x.topic} exists`));
  LEVELS.forEach((l) => ok(A.writing[l], `${tag} placement writing prompt ${l}`));

  /* drills, writing, speaking, listening */
  const T = LOS.shared.THINK_TYPES;
  p.think.forEach((t) => ok(T[t.type], `${tag} think type ${t.type} known`));
  LOS.shared.THINK_LADDER.forEach((st) => ok(p.think.some((t) => st.types.includes(t.type)), `${tag} think ladder step ${st.n} has prompts`));
  ['writing', 'speaking'].forEach((k) => { const w = p[k].map((x) => x.id); ok(new Set(w).size === w.length && w.length >= 10, `${tag} ${k} tasks unique and ≥10`); });
  LEVELS.concat(['medical']).forEach((l) => ok((p.listeningSources[l] || []).length >= 1, `${tag} listening sources for ${l}`));

  /* medical & professional */
  const med = new Set(LOS.shared.MED_CATS.map(([k]) => k)), pro = new Set(LOS.shared.PRO_CATS.map(([k]) => k));
  ok(p.medical.length >= 15 && p.medical.every((m) => med.has(m.cat) && m.expr.length && (m.scen || []).length), `${tag} medical modules (≥15) valid`);
  ok(p.professional.length >= 8 && p.professional.every((m) => pro.has(m.cat) && m.expr.length && (m.scen || []).length), `${tag} professional modules (≥8) valid`);
  /* Engine 2.0: core medical modules carry taught words; every pathway module exists */
  ['basics', 'medications', 'investigations', 'treatment'].forEach((k) => { const st = LOS.PATHWAYS.medical.steps.find((x) => x.key === k); const m = p.index.modules[code + '-med-' + st[code][0]]; ok(m && (m.words || []).length >= 6 && m.words.every((w) => w.w && w.tr && w.def && w.ex), `${tag} pathway step ${k} has a module with ≥6 complete words`); });
  Object.entries(LOS.PATHWAYS).forEach(([pk, def]) => def.steps.forEach((st) => (st[code] || []).forEach((x) => ok(p.index.modules[code + '-' + (def.prefix || 'med') + '-' + x], `${tag} pathway ${pk}/${st.key}: module ${code}-${def.prefix || 'med'}-${x} exists`))));
  ok(LOS.PATHWAYS.medical.steps.length === 16 && LOS.PATHWAYS.medical.steps.every((st) => (st[code] || []).length >= 1), `${tag} medical pathway has 16 steps, each with a module`);
  /* Life abroad track + simulator lines */
  const abr = new Set(LOS.shared.ABROAD_CATS.map(([k]) => k));
  ok(p.abroad.length >= 8 && p.abroad.every((m) => abr.has(m.cat) && m.expr.length >= 4 && (m.scen || []).length && m.scen.every((sc) => sc.model) && (m.words || []).length >= 6 && m.words.every((w) => w.w && w.tr && w.def && w.ex)), `${tag} life-abroad modules (≥8) complete`);
  ok(['clinical', 'patient', 'workplace', 'abroad', 'social'].every((g) => { const x = LOS.SIM_LINES[code][g]; return x && x.role && x.open.length && x.follow.length >= 3 && x.close; }), `${tag} simulator partner lines for every situation type`);
  ok((LOS.COUNTRIES[code] || []).length >= 3 && LOS.COUNTRIES[code].every((c) => c.id && c.label && c.tips.length), `${tag} target countries with register/culture tips`);
  const mids = p.medical.concat(p.professional, p.abroad).map((m) => m.id);
  ok(new Set(mids).size === mids.length, `${tag} module ids unique`);

  /* pronunciation (German and French have full guides) */
  if (code === 'de' || code === 'fr') ok(p.pronunciation.length >= 6 && p.pronunciation.every((m) => m.rule.length && m.items.length), `${tag} pronunciation guide (≥6 modules)`);

  /* writing checks: compile + no false positives on correct curriculum sentences */
  const correct = [];
  p.grammar.forEach((t) => { correct.push(...t.ex); t.x.forEach((x) => { if (x.t === 'fix' || x.t === 'tr') correct.push(x.a[0]); }); });
  p.vocab.forEach((v) => correct.push(v.ex));
  p.medical.concat(p.abroad).forEach((m) => (m.words || []).forEach((w) => correct.push(w.ex)));
  Object.values(LOS.SIM_LINES[code]).forEach((g) => correct.push(...g.open, ...g.follow, g.close));
  p.medical.concat(p.professional, p.abroad).forEach((m) => (m.scen || []).forEach((s) => s.model && correct.push(...U.sentences(s.model))));
  p.abroad.forEach((m) => m.expr.forEach((e) => correct.push(e.p)));
  let fp = 0;
  correct.forEach((sent) => {
    if (!sent) return;
    const res = LOS.writing ? null : null; // writing engine not loaded here: apply rules directly
    p.checks.forEach((r) => {
      if ((r.severity || 'error') !== 'error') return;
      const re = new RegExp(r.re.source, r.re.flags.includes('g') ? r.re.flags : r.re.flags + 'g');
      let m;
      while ((m = re.exec(sent))) { if (!(r.except && r.except.test(m[0]))) { fp++; if (fp <= 12) console.log(`  ${tag} rule ${r.id} flags a correct sentence: "${sent}" → "${m[0]}"`); } if (!re.global) break; if (m[0] === '') re.lastIndex++; }
    });
  });
  ok(fp === 0, `${tag} writing checks raise no errors on ${correct.length} correct curriculum sentences (${fp} false positives)`);
}

/* compare languages */
ok(LOS.compare.length >= 12, 'compare: at least 12 structures');
LOS.compare.forEach((c) => ok(['it', 'en', 'es', 'de', 'fr'].every((k) => c.s[k]) && c.notes.length >= 1, `compare ${c.id} covers it/en/es/de/fr with notes`));

/* certifications: every exam paper covered by original tasks; types teach before testing; answers valid */
const packs = LOS.EXAM_PACKS || [];
ok(packs.length === 4, `exam packs for 4 languages (got ${packs.length})`);
const EX = {}, TY = {}, TASKS = [];
packs.forEach((pk) => { pk.exams.forEach((e) => { ok(!EX[e.id], `exam id ${e.id} unique`); EX[e.id] = e; }); Object.keys(pk.types).forEach((k) => { ok(!TY[k], `exam type ${k} unique`); TY[k] = pk.types[k]; }); TASKS.push(...pk.tasks); });
const tids = TASKS.map((t) => t.id);
ok(new Set(tids).size === tids.length, 'exam task ids unique');
const REQUIRED = { en: ['ielts-ac', 'ielts-gt', 'cambridge', 'toefl', 'oet'], es: ['dele', 'siele'], de: ['goethe', 'telc-med', 'telc-pflege', 'testdaf', 'fsp'], fr: ['delf-b2', 'dalf-c1', 'tcf', 'tef'] };
Object.keys(REQUIRED).forEach((c) => REQUIRED[c].forEach((id) => ok(EX[id] && EX[id].lang === c, `[${c}] exam profile ${id} present`)));
const SCALE_KEYS = ['ielts', 'cambridge', 'pass60', 'pass50', 'oet', 'toefl6', 'siele', 'tdn', 'tcf', 'cefr'];
const CRIT_KEYS = ['task', 'coherence', 'lexis', 'grammar', 'register', 'fluency', 'pron', 'clinical', 'interaction'];
const examsOfT = (t) => (Array.isArray(t.exam) ? t.exam : [t.exam]);
const paperOfT = (eid, t) => (t.papers && t.papers[eid]) || t.paper || (TY[t.type] || {}).paper;
Object.values(EX).forEach((e) => {
  const tag = `[exam ${e.id}]`;
  ['name', 'body', 'url', 'lastReviewed', 'who', 'scoring', 'pass'].forEach((k) => ok(e[k], `${tag} has ${k}`));
  ok(/^https:\/\//.test(e.url), `${tag} official url is https`);
  ok(/^\d{4}-\d{2}$/.test(e.lastReviewed), `${tag} lastReviewed YYYY-MM`);
  ok(e.levels.includes(e.focus), `${tag} focus level is one of its levels`);
  ok(SCALE_KEYS.includes(e.scale), `${tag} known scale`);
  ok(e.traps.length >= 2, `${tag} ≥2 traps for Italian speakers`);
  ['writing', 'speaking'].forEach((k) => ok((e.criteria[k] || []).length >= 3 && e.criteria[k].every((c) => c.label && CRIT_KEYS.includes(c.key)), `${tag} ${k} criteria valid`));
  ok(e.papers.length >= 3, `${tag} has papers`);
  e.papers.forEach((pp) => {
    ok(pp.minutes > 0 && pp.format && pp.tests && pp.types.length, `${tag} paper ${pp.id} complete`);
    pp.types.forEach((ty) => {
      ok(TY[ty], `${tag} paper ${pp.id} type ${ty} defined`);
      ok(TASKS.some((t) => t.type === ty && examsOfT(t).includes(e.id) && paperOfT(e.id, t) === pp.id), `${tag} paper ${pp.id} type ${ty} has at least one original task`);
    });
    ok(TASKS.some((t) => examsOfT(t).includes(e.id) && paperOfT(e.id, t) === pp.id), `${tag} paper ${pp.id} covered by tasks`);
  });
});
Object.keys(TY).forEach((k) => {
  const ty = TY[k];
  ok(ty.name && ty.tests && ['reading', 'listening', 'use', 'writing', 'speaking'].includes(ty.kind), `[type ${k}] complete`);
  ok(ty.strategy.length >= 2 && ty.language.length >= 4 && ty.language.every((x) => x.p), `[type ${k}] strategy ≥2 and language ≥4 (teach before test)`);
  ok(Object.values(EX).some((e) => e.papers.some((pp) => pp.types.includes(k))), `[type ${k}] used by an exam paper`);
});
TASKS.forEach((t) => {
  const tag = `[task ${t.id}]`;
  const ty = TY[t.type];
  ok(ty, `${tag} type exists`);
  examsOfT(t).forEach((eid) => ok(EX[eid] && EX[eid].papers.some((pp) => pp.id === paperOfT(eid, t)), `${tag} exam ${eid} has paper ${paperOfT(eid, t)}`));
  ok(t.title && LEVELS.includes(t.level), `${tag} title and CEFR level`);
  if (['reading', 'listening', 'use'].includes(t.kind)) {
    const items = t.qs || t.items || [];
    ok(items.length >= 3, `${tag} ≥3 items`);
    ok(t.kind !== 'reading' || t.text, `${tag} reading text`);
    ok(t.kind !== 'listening' || t.script, `${tag} listening script`);
    items.forEach((it, i) => {
      if (it.o) ok(Number.isInteger(it.a) && it.a >= 0 && it.a < it.o.length && new Set(it.o).size === it.o.length, `${tag}#${i} MCQ answer index valid, options distinct`);
      else ok(Array.isArray(it.a) && it.a.length && it.a.every((x) => String(x).trim()), `${tag}#${i} short answer(s)`);
      if (it.t === 'wf') ok(it.base, `${tag}#${i} word formation base`);
      if (it.t === 'kwt') ok(it.key && it.start && it.start.includes('___'), `${tag}#${i} transformation key + start`);
    });
  } else {
    ok(t.prompt && t.model && t.model.length > 120, `${tag} prompt and model answer`);
    ok((t.points || []).length >= 3, `${tag} ≥3 content points`);
    if (t.kind === 'writing') {
      ok(Array.isArray(t.words) && t.words[0] < t.words[1], `${tag} word range`);
      const n = U.words(t.model).length;
      ok(n >= t.words[0] * 0.9, `${tag} model answer meets the word count (${n} / ${t.words[0]})`);
    } else ok(t.secs > 0, `${tag} speaking time`);
    const nm = ' ' + U.stripAccents(U.norm(t.model)) + ' ';
    const miss = t.points.filter((pt) => !String(pt).split('|').some((alt) => nm.includes(U.stripAccents(U.norm(alt)))));
    ok(!miss.length, `${tag} model covers its own content points (missing: ${miss.join(', ')})`);
    // writing checks must not flag the model answers (false positives)
    const lp = LOS.lang.get(EX[examsOfT(t)[0]].lang);
    let fpm = 0;
    U.sentences(t.model).forEach((sent) => lp.checks.forEach((r) => {
      if ((r.severity || 'error') !== 'error') return;
      const re = new RegExp(r.re.source, r.re.flags.includes('g') ? r.re.flags : r.re.flags + 'g');
      let m;
      while ((m = re.exec(sent))) { if (!(r.except && r.except.test(m[0]))) { fpm++; console.log(`  ${tag} rule ${r.id} flags the model: "${sent}" → "${m[0]}"`); } if (!re.global) break; if (m[0] === '') re.lastIndex++; }
    }));
    ok(fpm === 0, `${tag} writing checks raise no errors on the model answer`);
  }
});
/* production types: some key language appears in a model, so controlled practice can use it */
Object.keys(TY).filter((k) => ['writing', 'speaking'].includes(TY[k].kind)).forEach((k) => {
  const models = TASKS.filter((t) => t.type === k).map((t) => t.model.toLowerCase()).join(' ');
  const hits = TY[k].language.filter((x) => models.includes(x.p.toLowerCase())).length;
  ok(hits >= 2, `[type ${k}] ≥2 key phrases appear in its model answers (got ${hits})`);
});

/* minimal pairs, false friends */
['en', 'es', 'de', 'fr'].forEach((c) => {
  const sets = (LOS.MINIMAL_PAIRS || {})[c] || [];
  ok(sets.length >= 4, `[${c}] ≥4 minimal-pair sets`);
  sets.forEach((st) => ok(st.id && st.contrast && st.note && st.pairs.length >= 4 && st.pairs.every((pr) => pr.length === 2 && pr[0] && pr[1] && pr[0].toLowerCase() !== pr[1].toLowerCase()), `[${c}] minimal pairs "${st.id}" valid`));
  const ff = (LOS.FALSE_FRIENDS || []).filter((f) => f[c]);
  ok(ff.length >= 4 && ff.every((f) => f[c].trap && f[c].fix && f[c].note), `[${c}] false-friend / interference traps valid (${ff.length})`);
});

console.log(`${checks} checks · ${failures ? failures + ' FAILED' : 'ALL PASSED'}`);
process.exitCode = failures ? 1 : 0;

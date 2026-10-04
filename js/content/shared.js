/* Shared, language-independent content + the language-pack registry.
 * Adding French/German/… = writing a new pack and calling LOS.lang.register(pack). */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;

  /* ---------------- language registry ---------------- */
  const packs = {};
  LOS.lang = {
    register(pack) {
      const code = pack.code;
      const p = packs[code] || {};
      // A language can be split across several files (e.g. en.js + en-pro.js): arrays are merged.
      Object.keys(pack).forEach((k) => {
        if (Array.isArray(p[k]) && Array.isArray(pack[k])) p[k] = p[k].concat(pack[k]);
        else p[k] = pack[k];
      });
      p.vocab = (p.vocab || []).map((v) => normVocab(code, v));
      p.grammar = (p.grammar || []).map((g) => Object.assign({ pre: [], explain: [], ex: [], x: [] }, g));
      p.texts = p.texts || [];
      p.think = p.think || [];
      p.writing = p.writing || [];
      p.speaking = p.speaking || [];
      p.medical = p.medical || [];
      p.professional = p.professional || [];
      p.checks = p.checks || [];
      p.index = {
        grammar: Object.fromEntries(p.grammar.map((g) => [g.id, g])),
        vocab: Object.fromEntries(p.vocab.map((v) => [v.id, v])),
        texts: Object.fromEntries(p.texts.map((t) => [t.id, t])),
        modules: Object.fromEntries([...p.medical, ...p.professional].map((m) => [m.id, m])),
      };
      packs[code] = p;
      return p;
    },
    get(code) { return packs[code]; },
    list() { return Object.values(packs).filter((p) => p.name); },
    codes() { return Object.keys(packs).filter((c) => packs[c].name); },
  };

  function normVocab(code, v) {
    if (v.id) return v;
    return Object.assign(
      { id: code + ':' + U.slug(v.w), pos: '', l: 'B1', k: 'word', d: 'general', tr: '', def: '', ex: '', col: [], syn: [], ant: [], reg: 'neutral', ipa: '', f: 3, ctx: '', ff: '' },
      v,
      { id: code + ':' + U.slug(v.w) }
    );
  }

  /* ---------------- shared constants ---------------- */
  LOS.shared = {
    GOALS: [
      { id: 'fluency', label: 'Fluency', desc: 'Speak and understand naturally, without translating.' },
      { id: 'work', label: 'Work', desc: 'Meetings, emails, teamwork, presentations.' },
      { id: 'medical', label: 'Medical', desc: 'Clinical communication, handovers, research.' },
      { id: 'academic', label: 'Academic', desc: 'Papers, lectures, conferences.' },
      { id: 'travel', label: 'Travel', desc: 'Everyday situations abroad.' },
      { id: 'certification', label: 'Certification', desc: 'IELTS / Cambridge / DELE / SIELE.' },
      { id: 'c2', label: 'C2 mastery', desc: 'Near-native precision and nuance.' },
    ],
    KIND_LABEL: { word: 'Word', collocation: 'Collocation', phrasal: 'Phrasal verb', idiom: 'Idiom', chunk: 'Chunk', expression: 'Fixed expression' },
    DOMAIN_LABEL: { general: 'General', medical: 'Medical', professional: 'Professional', academic: 'Academic' },
    ERROR_CATS: [
      ['grammar', 'Grammar'], ['vocabulary', 'Vocabulary'], ['spelling', 'Spelling'], ['wordchoice', 'Word choice'],
      ['collocation', 'Collocation'], ['syntax', 'Syntax'], ['register', 'Register'], ['pronunciation', 'Pronunciation'],
      ['falsefriend', 'False friend'], ['interference', 'Italian interference'],
    ],
    THINK_TYPES: {
      rapid: { label: 'Rapid response', secs: 20, desc: 'Answer immediately. No translating — first thought, target language.' },
      describe: { label: 'Describe', secs: 60, desc: 'Describe a scene or situation in detail.' },
      explain: { label: 'Explain', secs: 75, desc: 'Explain a concept clearly, as if to a colleague.' },
      paraphrase: { label: 'Paraphrase', secs: 45, desc: 'Say the same thing in a different way.' },
      reformulate: { label: 'Reformulate', secs: 45, desc: 'Make a plain sentence more natural or sophisticated.' },
      synonym: { label: 'Synonym challenge', secs: 30, desc: 'Find as many precise alternatives as you can.' },
      situational: { label: 'Situational thinking', secs: 45, desc: 'React to a real-life situation.' },
      monologue: { label: 'Internal monologue', secs: 60, desc: 'Do this silently in your head, in the target language.' },
      conceptual: { label: 'Conceptual thinking', secs: 90, desc: 'Reason about an abstract idea directly in the language.' },
    },
    /* Calibrated words-per-minute bands for spontaneous speech (rough, learner-oriented). */
    WPM: { A1: [40, 70], A2: [55, 85], B1: [75, 105], B2: [95, 130], C1: [115, 150], C2: [125, 170] },
    /* CEFR-based "can do" descriptors (paraphrased). Used for speaking self-assessment and competence gains. */
    CANDO: {
      grammar: {
        A1: ['You can build simple present-tense sentences about yourself.'],
        A2: ['You can talk about past events and future plans with basic tenses.'],
        B1: ['You can control the main tenses, conditionals and the passive in everyday contexts.'],
        B2: ['You can use complex tenses, modality and reported speech with good control.'],
        C1: ['You can use advanced structures (inversion, clefts, hedging) to shape emphasis and tone.'],
        C2: ['You can manipulate grammar for nuance, style and implicit meaning, like an educated native speaker.'],
      },
      vocabulary: {
        A1: ['You know the words for basic personal and concrete needs.'],
        A2: ['You can handle routine, everyday vocabulary.'],
        B1: ['You have enough vocabulary to discuss most familiar topics, with some circumlocution.'],
        B2: ['You have a broad vocabulary, including collocations, for your field and general topics.'],
        C1: ['You can choose precise words, idioms and collocations with little searching.'],
        C2: ['You command a very broad lexical repertoire, including idiomatic and connotative nuance.'],
      },
      reading: {
        A1: ['You can understand short, simple notices and messages.'],
        A2: ['You can read short everyday texts and find specific information.'],
        B1: ['You can understand straightforward factual texts on familiar subjects.'],
        B2: ['You can read articles and reports on contemporary issues independently.'],
        C1: ['You can understand long, complex texts, including specialised articles outside your field.'],
        C2: ['You can read virtually all forms of written language, including abstract and literary texts.'],
      },
      listening: {
        A1: ['You can follow very slow, carefully articulated speech.'],
        A2: ['You can understand clear, slow speech about familiar topics.'],
        B1: ['You can follow the main points of clear standard speech on familiar matters.'],
        B2: ['You can understand native interviews and podcasts at normal speed on most topics.'],
        C1: ['You can follow lectures, debates and fast speech, even when not clearly structured.'],
        C2: ['You can understand any spoken language, live or broadcast, at fast native speed.'],
      },
      writing: {
        A1: ['You can write short, simple notes and messages.'],
        A2: ['You can write short descriptions and simple personal emails.'],
        B1: ['You can write connected text, emails and simple opinions on familiar topics.'],
        B2: ['You can write a clear, structured argument or professional email.'],
        C1: ['You can write a structured professional report with precise register control.'],
        C2: ['You can write complex, nuanced texts with an appropriate and effective style.'],
      },
      speaking: {
        A1: ['You can introduce yourself and ask and answer simple questions.', 'You can use basic phrases for immediate needs (ordering, directions).', 'You can say what you do and where you live.'],
        A2: ['You can describe your daily routine, past experiences and plans simply.', 'You can handle short social exchanges.', 'You can explain what you need in a shop, at the doctor, at a station.'],
        B1: ['You can deal with most travel situations without preparation.', 'You can narrate a story or describe an experience in connected sentences.', 'You can give brief reasons and explanations for opinions and plans.'],
        B2: ['You can interact with native speakers with a degree of fluency and spontaneity.', 'You can explain a viewpoint on a topical issue, giving pros and cons.', 'You can take an active part in work discussions, defending your views.'],
        C1: ['You can express yourself fluently and spontaneously without obvious searching for expressions.', 'You can use the language flexibly for social and professional purposes, including disagreement and diplomacy.', 'You can present complex subjects clearly, integrating sub-themes and rounding off with a conclusion.'],
        C2: ['You can take part effortlessly in any conversation, with idiomatic and colloquial expressions.', 'You can convey finer shades of meaning precisely (irony, hedging, emphasis).', 'You can backtrack and restructure around a difficulty so smoothly that others hardly notice.'],
      },
    },
    /* What "listening" should look like at each level (used by the planner for authentic-content suggestions). */
    LISTENING_STAGE: {
      A1: { kinds: ['slow speech', 'graded audio', 'simple dialogues'], objective: 'Recognise familiar words and very basic phrases.' },
      A2: { kinds: ['slow speech', 'educational content', 'simple dialogues'], objective: 'Catch the main point of short, clear messages.' },
      B1: { kinds: ['YouTube explainers', 'learner podcasts', 'simple interviews'], objective: 'Follow the main points of clear standard speech.' },
      B2: { kinds: ['podcasts', 'interviews', 'documentaries', 'YouTube'], objective: 'Understand native speech at normal speed on familiar topics.' },
      C1: { kinds: ['lectures', 'debates', 'news', 'native podcasts', 'professional content'], objective: 'Follow extended speech and implicit relationships.' },
      C2: { kinds: ['spontaneous conversations', 'fast interviews', 'academic discussions', 'complex debates', 'idiomatic speech'], objective: 'Understand fast, idiomatic, unscripted speech without effort.' },
    },
    ACTIVE_LISTENING_STEPS: [
      ['general', 'General understanding', 'Listen once without stopping. What is it about? Who? Why?'],
      ['detailed', 'Detailed listening', 'Listen again in chunks. Note facts, numbers, arguments.'],
      ['transcript', 'Transcript', 'Read the transcript/subtitles in the target language. Notice what you missed.'],
      ['vocabulary', 'Vocabulary extraction', 'Pick 3–8 useful words or chunks and add them to your vocabulary.'],
      ['shadowing', 'Shadowing', 'Replay 1–2 minutes and repeat along with the speaker, copying rhythm and intonation.'],
      ['summary', 'Summary / retelling', 'Summarise it aloud or in writing in the target language.'],
    ],
    SPEAKING_RUBRIC: [
      ['fluency', 'Fluency', 'Smooth flow, few long pauses.'],
      ['accuracy', 'Accuracy', 'Grammar under control.'],
      ['vocabulary', 'Vocabulary', 'Range and precision of words and chunks.'],
      ['pronunciation', 'Pronunciation', 'Intelligible sounds, stress and intonation.'],
      ['complexity', 'Complexity', 'Varied structures, subordinate clauses.'],
      ['coherence', 'Coherence', 'Clear structure, linked ideas.'],
      ['naturalness', 'Naturalness', 'Sounds like a competent user, not a translation.'],
    ],
    WRITING_DIMENSIONS: [
      ['grammar', 'Grammar'], ['vocabulary', 'Vocabulary'], ['syntax', 'Syntax'], ['coherence', 'Coherence'],
      ['cohesion', 'Cohesion'], ['register', 'Register'], ['naturalness', 'Naturalness'], ['variety', 'Lexical variety'],
    ],
    MED_CATS: [
      ['patient', 'Patient'], ['clinical', 'Clinical'], ['anesthesia', 'Anesthesia'], ['icu', 'ICU'],
      ['surgery', 'Surgery'], ['emergency', 'Emergency'], ['research', 'Research'], ['teamwork', 'Teamwork'],
    ],
    PRO_CATS: [
      ['meetings', 'Meetings'], ['diplomacy', 'Diplomacy'], ['feedback', 'Feedback'], ['negotiation', 'Negotiation'],
      ['presenting', 'Presenting'], ['writing', 'Emails'], ['career', 'Career'], ['leadership', 'Leadership'],
    ],
  };
})();

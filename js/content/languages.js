/* LANGUAGES — the single place where a language is declared.
 *
 * Every learning component (curriculum, SRS, planner, error log, writing/speaking analysis, sync, database)
 * works on a language CODE (ISO 639-1: en, es, de, fr…) and reads everything language-specific from here
 * or from the language's content packs (js/content/<code>*.js, registered with LOS.lang.register).
 *
 * Adding a fifth language (e.g. Italian 'it', Portuguese 'pt', Japanese 'ja'):
 *   1. add an entry below (code, names, flag, locale, linguistic features, error categories, pronunciation focus);
 *   2. write its content packs (grammar curriculum, vocabulary, placement items, texts, drills, medical/professional);
 *   3. add <script> tags for the packs in index.html and a colour token --lang-<code> in css/style.css (optional);
 *   4. add one row to the `languages` table (supabase-schema.sql already allows any code present there).
 * No engine, view or sync code has to change. */
(function () {
  'use strict';
  const LOS = (window.LOS = window.LOS || {});

  LOS.LANGUAGES = {
    en: {
      code: 'en', name: 'English', native: 'English', flag: '🇬🇧', short: 'EN', locale: 'en-GB', speech: 'en-GB', color: 'var(--lang-en)',
      features: { gender: false, cases: false, articles: true, formalYou: false, verbSecond: false, subjunctive: 'residual' },
      grammarFocus: 'Tenses and aspect, articles, prepositions, phrasal verbs, collocations.',
      errorCats: [['tense', 'Tenses & aspect'], ['articles', 'Articles'], ['prepositions', 'Prepositions'], ['phrasal', 'Phrasal verbs'], ['wordorder', 'Word order']],
      pronunciationFocus: ['th sounds', 'vowel length', 'schwa & weak forms', 'word stress', 'final consonants'],
      registerNotes: { contractions: 'Contractions in a formal text ({x}). Use full forms: do not, it is, we will.', formalYou: '' },
      voiceSample: 'Hello, this is the voice you will hear in listening practice.',
      exams: 'IELTS / Cambridge (C1 Advanced, C2 Proficiency)',
      accentNote: 'Check the spelling.',
    },
    es: {
      code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', short: 'ES', locale: 'es-ES', speech: 'es-ES', color: 'var(--lang-es)',
      features: { gender: true, cases: false, articles: true, formalYou: 'usted', verbSecond: false, subjunctive: 'productive' },
      grammarFocus: 'Ser/estar, past tenses, subjunctive, por/para, object pronouns.',
      errorCats: [['serestar', 'Ser / estar'], ['subjunctive', 'Subjunctive'], ['tense', 'Past tenses'], ['gender', 'Gender & agreement'], ['prepositions', 'Prepositions (por/para…)'], ['pronouns', 'Pronouns']],
      pronunciationFocus: ['pure vowels', 'r / rr', 'b/v and d between vowels', 'j and g', 'stress and written accents'],
      registerNotes: { contractions: '', formalYou: 'Forms of "tú" in a formal text — consider "usted" (le, su, puede, tiene).' },
      voiceSample: 'Hola, soy tu voz para practicar español.',
      exams: 'DELE / SIELE',
      accentNote: 'Check the accents.',
    },
    de: {
      code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', short: 'DE', locale: 'de-DE', speech: 'de-DE', color: 'var(--lang-de)',
      features: { gender: true, genders: ['m', 'f', 'n'], cases: ['Nominativ', 'Akkusativ', 'Dativ', 'Genitiv'], articles: true, formalYou: 'Sie', verbSecond: true, verbFinal: true, separableVerbs: true, nounCapitalisation: true, subjunctive: 'Konjunktiv I/II' },
      grammarFocus: 'Word order (V2, verb-final), cases, gender, adjective endings, verb + preposition.',
      errorCats: [['case', 'Cases'], ['wordorder', 'Word order'], ['gender', 'Gender & articles'], ['adjending', 'Adjective endings'], ['verbprep', 'Verb + preposition'], ['separable', 'Separable verbs'], ['prepositions', 'Prepositions'], ['conjugation', 'Conjugation'], ['capitalisation', 'Capitalisation']],
      pronunciationFocus: ['umlauts ä ö ü', 'ich-Laut / ach-Laut (ch)', 'r (uvular / vocalised)', 'final devoicing', 'vowel length', 'word stress'],
      registerNotes: { contractions: '', formalYou: '"du"-Formen in einem formellen Text — verwenden Sie "Sie" (Ihnen, Ihr, können Sie).' },
      voiceSample: 'Hallo, ich bin die Stimme, die du beim Hörtraining hörst.',
      exams: 'Goethe-Zertifikat / TestDaF / telc Deutsch C1 Medizin',
      accentNote: 'Check the umlauts (ä, ö, ü) and ß.',
    },
    fr: {
      code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', short: 'FR', locale: 'fr-FR', speech: 'fr-FR', color: 'var(--lang-fr)',
      features: { gender: true, genders: ['m', 'f'], cases: false, articles: true, formalYou: 'vous', verbSecond: false, elision: true, liaison: true, subjunctive: 'productive' },
      grammarFocus: 'Gender & agreement, articles (incl. partitive), pronouns (y, en, double), conjugation, subjonctif.',
      errorCats: [['gender', 'Gender & articles'], ['agreement', 'Agreement'], ['conjugation', 'Conjugation'], ['pronouns', 'Pronouns'], ['prepositions', 'Prepositions'], ['subjunctive', 'Subjonctif'], ['tense', 'Past tenses']],
      pronunciationFocus: ['nasal vowels', 'liaison & enchaînement', 'silent letters', 'French R', 'vowel combinations (ou/u, eu, ai…)', 'rhythm & intonation'],
      registerNotes: { contractions: '', formalYou: 'Formes de "tu" dans un texte formel — utilisez "vous" (votre, vous pouvez).' },
      voiceSample: 'Bonjour, je suis la voix que vous entendrez pendant les exercices d\'écoute.',
      exams: 'DELF / DALF',
      accentNote: 'Check the accents (é, è, ê, ç…).',
    },
  };

  /** Native-language options for the profile (any LANGUAGES entry + a few common ones). */
  LOS.NATIVE_LANGUAGES = [['it', 'Italiano'], ['en', 'English'], ['es', 'Español'], ['de', 'Deutsch'], ['fr', 'Français'], ['pt', 'Português'], ['other', 'Other']];
})();

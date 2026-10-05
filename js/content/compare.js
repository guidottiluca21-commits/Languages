/* COMPARE LANGUAGES — the same idea expressed in each language, with the structural differences explained.
 * Purpose: understand how the systems differ (aspect, cases, gender, pronouns, mood), NOT word-for-word translation.
 * Each entry maps language codes to sentences; a language without an entry is simply not shown, so adding a fifth
 * language means adding one key per entry (optional). Italian (`it`) is the learner's reference. */
(function () {
  'use strict';
  const LOS = window.LOS;

  LOS.compare = [
    { id: 'duration', l: 'A2', title: 'Duration up to now', focus: 'Tense & aspect',
      s: { it: 'Lavoro qui da tre anni.', en: 'I have been working here for three years.', es: 'Llevo tres años trabajando aquí. / Trabajo aquí desde hace tres años.', de: 'Ich arbeite seit drei Jahren hier.', fr: 'Je travaille ici depuis trois ans.' },
      notes: ['Italian, Spanish, German and French use the PRESENT tense for an action that is still going on; English needs the present perfect continuous.', 'The preposition differs: da (it) · desde hace / llevar + gerund (es) · seit + dative (de, "Jahren" with -n) · depuis (fr).', 'Classic transfer error: *I work here since three years* (it/fr/de pattern applied to English).'] },
    { id: 'age', l: 'A1', title: 'Age', focus: 'Verb choice',
      s: { it: 'Ho trentacinque anni.', en: 'I am thirty-five (years old).', es: 'Tengo treinta y cinco años.', de: 'Ich bin fünfunddreißig (Jahre alt).', fr: 'J\'ai trente-cinq ans.' },
      notes: ['Romance languages "have" years (avere/tener/avoir); English and German "are" years old.', 'German numbers put units before tens: fünf-und-dreißig.'] },
    { id: 'like', l: 'A1', title: 'Liking something', focus: 'Argument structure',
      s: { it: 'Mi piace il mio lavoro.', en: 'I like my job.', es: 'Me gusta mi trabajo.', de: 'Mir gefällt meine Arbeit. / Ich mag meine Arbeit.', fr: 'J\'aime mon travail.' },
      notes: ['Italian, Spanish and German "gefallen" make the thing liked the subject and the person an indirect (dative) object.', 'English and French make the person the subject (I like / j\'aime).', 'German has both: gefallen + dative, or mögen with a normal subject.'] },
    { id: 'pain', l: 'A2', title: 'Saying where it hurts', focus: 'Body & case',
      s: { it: 'Mi fa male la testa.', en: 'My head hurts. / I have a headache.', es: 'Me duele la cabeza.', de: 'Mir tut der Kopf weh. / Ich habe Kopfschmerzen.', fr: 'J\'ai mal à la tête.' },
      notes: ['Romance languages and German use the definite article with body parts (la testa, la cabeza, der Kopf, la tête); English uses a possessive (my head).', 'German: wehtun + dative (mir); French: avoir mal à + article (au ventre, à la tête).'] },
    { id: 'past-event', l: 'A2', title: 'A finished past event', focus: 'Past tenses',
      s: { it: 'Ieri ho visto il paziente.', en: 'I saw the patient yesterday.', es: 'Ayer vi al paciente.', de: 'Gestern habe ich den Patienten gesehen.', fr: 'Hier, j\'ai vu le patient.' },
      notes: ['With a finished time (yesterday), English and peninsular Spanish use a simple past (saw / vi); Italian, French and spoken German use a compound past (ho visto / j\'ai vu / habe gesehen).', 'German: verb in 2nd position (habe) and participle at the END (gesehen); the noun is accusative (den Patienten, n-declension).', 'Spanish needs the "personal a" before a person object: vi AL paciente.'] },
    { id: 'gender', l: 'A1', title: 'Grammatical gender of everyday nouns', focus: 'Gender',
      s: { it: 'il dolore · il problema · la luna · il sole', en: 'the pain · the problem · the moon · the sun', es: 'el dolor · el problema · la luna · el sol', de: 'der Schmerz · das Problem · der Mond · die Sonne', fr: 'la douleur · le problème · la lune · le soleil' },
      notes: ['English has no grammatical gender for nouns.', 'German has three genders and they often do not match Italian: der Mond (m) / die Sonne (f) is the reverse of il sole / la luna.', 'French "la douleur" is feminine while Italian "il dolore" is masculine: always learn nouns with their article.'] },
    { id: 'obligation', l: 'A2', title: 'Obligation and prohibition', focus: 'Modality',
      s: { it: 'Non deve mangiare niente. / Non è necessario che sia a digiuno.', en: 'You must not eat anything. / You don\'t have to fast.', es: 'No debe comer nada. / No hace falta que esté en ayunas.', de: 'Sie dürfen nichts essen. / Sie müssen nicht nüchtern sein.', fr: 'Vous ne devez rien manger. / Vous n\'êtes pas obligé d\'être à jeun.' },
      notes: ['"must not" (prohibition) ≠ "don\'t have to" (no necessity) in English — and in German: nicht dürfen = forbidden, nicht müssen = not necessary.', 'Italian "non deve" is ambiguous in context; German and English force you to choose.', 'French: ne pas devoir = prohibition; ne pas être obligé de = no necessity.'] },
    { id: 'word-order-subordinate', l: 'B1', title: 'Because… (subordinate clause)', focus: 'Word order',
      s: { it: 'Non vengo perché ho il turno.', en: 'I\'m not coming because I\'m on call.', es: 'No vengo porque tengo guardia.', de: 'Ich komme nicht, weil ich Dienst habe.', fr: 'Je ne viens pas parce que je suis de garde.' },
      notes: ['Only German moves the conjugated verb to the END of the subordinate clause (weil ich Dienst habe).', 'German main clause: verb in position 2, and "nicht" comes after the verb.', 'French negation wraps the verb: ne … pas.'] },
    { id: 'wish-subjunctive', l: 'B1', title: 'Wanting someone else to do something', focus: 'Mood',
      s: { it: 'Voglio che tu venga.', en: 'I want you to come.', es: 'Quiero que vengas.', de: 'Ich möchte, dass du kommst.', fr: 'Je veux que tu viennes.' },
      notes: ['Italian, Spanish and French use the SUBJUNCTIVE after verbs of wanting with a different subject.', 'English uses an infinitive construction (want you to come); German uses dass + indicative (verb at the end).', 'Transfer error from English: *Quiero tú venir / *Je veux toi venir.'] },
    { id: 'pronouns', l: 'B1', title: 'Two object pronouns', focus: 'Pronouns',
      s: { it: 'Glielo do domani.', en: 'I\'ll give it to him tomorrow.', es: 'Se lo doy mañana.', de: 'Ich gebe es ihm morgen.', fr: 'Je le lui donne demain.' },
      notes: ['Romance languages put clitic pronouns BEFORE the conjugated verb; English and German put them after it.', 'Order differs: Italian/Spanish indirect + direct (glie-lo, se lo); French direct + indirect in the 3rd person (le lui); German accusative pronoun before dative pronoun (es ihm).', 'Spanish le/les becomes se before lo/la (*le lo → se lo).'] },
    { id: 'conditional', l: 'B2', title: 'Unreal condition (present)', focus: 'Conditionals',
      s: { it: 'Se avessi più tempo, studierei di più.', en: 'If I had more time, I would study more.', es: 'Si tuviera más tiempo, estudiaría más.', de: 'Wenn ich mehr Zeit hätte, würde ich mehr lernen.', fr: 'Si j\'avais plus de temps, j\'étudierais davantage.' },
      notes: ['Italian and Spanish use the imperfect SUBJUNCTIVE after if (avessi / tuviera); French and English use the imperfect / past simple (avais / had) — never the conditional after si/if.', 'German uses Konjunktiv II in both clauses (hätte … würde); the wenn-clause sends the verb to the end and the main clause starts with the verb.'] },
    { id: 'passive', l: 'B2', title: 'Passive in a clinical report', focus: 'Voice',
      s: { it: 'Il paziente è stato operato alle nove.', en: 'The patient was operated on at nine.', es: 'El paciente fue operado a las nueve. / Se operó al paciente a las nueve.', de: 'Der Patient wurde um neun Uhr operiert.', fr: 'Le patient a été opéré à neuf heures.' },
      notes: ['German builds the passive with werden (wurde operiert), not with sein; "ist operiert" describes the resulting state.', 'Spanish often prefers the "se" construction in protocols (se administra, se recomienda).', 'French and Italian passives agree in gender and number (opérée, operata).'] },
    { id: 'politeness', l: 'B1', title: 'A polite request', focus: 'Register',
      s: { it: 'Potrebbe ripetere, per favore?', en: 'Could you repeat that, please?', es: '¿Podría repetirlo, por favor?', de: 'Könnten Sie das bitte wiederholen?', fr: 'Pourriez-vous répéter, s\'il vous plaît ?' },
      notes: ['All five soften requests with a conditional / Konjunktiv II form.', 'Formal "you": Lei (3rd person, it) · usted (3rd person, es) · Sie (3rd plural, capitalised, de) · vous (2nd plural, fr). English has no grammatical formal you — politeness lives in modals and phrasing.', 'French writes a space before ? ; Spanish opens questions with ¿.'] },
    { id: 'partitive', l: 'A2', title: 'Having a fever', focus: 'Articles',
      s: { it: 'Ho la febbre. / Ha febbre?', en: 'I have a temperature / a fever.', es: 'Tengo fiebre.', de: 'Ich habe Fieber.', fr: 'J\'ai de la fièvre.' },
      notes: ['French requires a partitive article (de la fièvre) where Spanish and German use no article and Italian varies.', 'English uses an indefinite article (a fever / a temperature).'] },
    { id: 'reported', l: 'C1', title: 'Reporting what someone said', focus: 'Reported speech',
      s: { it: 'Il paziente riferisce di avere dolore da tre giorni.', en: 'The patient reports having had pain for three days.', es: 'El paciente refiere dolor desde hace tres días.', de: 'Der Patient gibt an, er habe seit drei Tagen Schmerzen.', fr: 'Le patient rapporte avoir mal depuis trois jours.' },
      notes: ['German written reports use Konjunktiv I (er habe) to mark reported, unverified information — a distinction the other languages express with verbs like riferire / referir / rapporter.', 'French and Spanish journalists and clinicians also use the conditional for unverified facts: il aurait chuté / habría caído.'] },
  ];
})();

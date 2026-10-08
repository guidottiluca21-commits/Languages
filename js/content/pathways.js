/* Learning pathways (Engine 2.0): ordered sequences of modules, unlocked by MASTERY of the language they need,
 * not by CEFR label. Module ids are written without the "<code>-med-" prefix.
 * Medical language is taught before medical tasks: basics → … → conferences.
 * The anaesthesia / critical-care pathway is optional and is language training only (no clinical advice). */
(function () {
  'use strict';
  const LOS = window.LOS;
  LOS.PATHWAYS = {
    medical: {
      title: 'Medical language pathway',
      levels: ['Hospital vocabulary, symptoms, medications, procedures', 'History, examination, instructions, consent', 'Presenting, handover, teamwork, clinical reasoning', 'Research, presentations, conferences, interviews'],
      intro: 'Sixteen steps from the basic vocabulary of the ward to presenting at a conference. Each step teaches its language first, then the scenarios go from controlled to guided to free.',
      steps: [
        { key: 'basics', level: 1, title: 'Basic medical vocabulary', en: ['basics'], es: ['basicos'], de: ['grundlagen'], fr: ['bases'] },
        { key: 'symptoms', level: 1, title: 'Symptoms', en: ['symptoms'], es: ['sintomas'], de: ['beschwerden'], fr: ['symptomes'] },
        { key: 'history', level: 2, title: 'History taking', en: ['history'], es: ['anamnesis'], de: ['anamnese'], fr: ['interrogatoire'] },
        { key: 'exam', level: 2, title: 'Physical examination', en: ['exam'], es: ['exploracion'], de: ['untersuchung'], fr: ['examen'] },
        { key: 'procedures', level: 1, title: 'Procedures', en: ['procedures'], es: ['procedimientos'], de: ['eingriff'], fr: ['geste'] },
        { key: 'medications', level: 1, title: 'Medications', en: ['medications'], es: ['medicacion'], de: ['medikamente'], fr: ['medicaments'] },
        { key: 'consent', level: 2, title: 'Consent and risks', en: ['consent'], es: ['consentimiento'], de: ['aufklaerung'], fr: ['consentement'] },
        { key: 'hospital', level: 2, title: 'Hospital communication', en: ['instructions', 'reassurance'], es: ['alta', 'noticias'], de: ['entlassung', 'unsicherheit', 'schlechte-nachricht', 'arztbrief'], fr: ['sortie', 'incertitude', 'annonce', 'compte-rendu'] },
        { key: 'teamwork', level: 3, title: 'Teamwork', en: ['closedloop', 'speakup'], es: ['bucle'], de: ['team'], fr: ['equipe'] },
        { key: 'handover', level: 3, title: 'Handover', en: ['handover'], es: ['pase'], de: ['uebergabe'], fr: ['transmissions'] },
        { key: 'presenting', level: 3, title: 'Presenting a patient', en: ['presenting', 'consult', 'mdt'], es: ['sesion', 'interconsulta'], de: ['visite', 'konsil', 'tumorboard'], fr: ['visite', 'avis', 'rcp'] },
        { key: 'investigations', level: 3, title: 'Investigations and results', en: ['investigations'], es: ['pruebas'], de: ['diagnostik'], fr: ['examens'] },
        { key: 'treatment', level: 3, title: 'Explaining treatment', en: ['treatment'], es: ['tratamiento'], de: ['therapie'], fr: ['traitement'] },
        { key: 'emergency', level: 3, title: 'Emergency communication', en: ['emergency', 'deterioration'], es: ['urgencias', 'deterioro'], de: ['notfall'], fr: ['urgence'] },
        { key: 'academic', level: 4, title: 'Academic and scientific language', en: ['journal'], es: ['bibliografica'], de: ['wissenschaft'], fr: ['redaction'] },
        { key: 'conferences', level: 4, title: 'Conferences', en: ['conference'], es: ['congreso'], de: ['vortrag'], fr: ['congres'] },
      ],
    },
    professional: {
      title: 'Professional communication track',
      levels: ['Workplace basics', 'Meetings and interaction', 'Presenting, feedback, negotiation', 'Interviews and leadership'],
      intro: 'Workplace language for any field, from first emails to leading a negotiation. Vocabulary and phrases are taught before every task.',
      prefix: 'pro',
      steps: [
        { key: 'emails', title: 'Professional emails', level: 1, en: ['emails'], es: ['correos'], de: ['mails'], fr: ['courriels'] },
        { key: 'intro', title: 'Introducing yourself at work', level: 1, en: ['networking'], es: ['networking'], de: ['vorstellen'], fr: ['presentation'] },
        { key: 'team', title: 'Teamwork', level: 1, en: ['teamwork'], es: [], de: ['team'], fr: ['equipe'] },
        { key: 'meetings', title: 'Meetings', level: 2, en: ['meetings'], es: ['reuniones'], de: ['besprechung'], fr: ['reunions'] },
        { key: 'disagree', title: 'Disagreeing diplomatically', level: 2, en: ['disagree'], es: ['discrepar'], de: ['widersprechen'], fr: ['desaccord'] },
        { key: 'receive', title: 'Receiving feedback', level: 2, en: ['receive'], es: [], de: [], fr: [] },
        { key: 'presenting', title: 'Presenting and explaining', level: 3, en: ['presenting', 'explaining'], es: ['explicar'], de: ['praesentieren'], fr: ['presenter'] },
        { key: 'feedback', title: 'Giving feedback', level: 3, en: ['feedback'], es: ['feedback'], de: ['feedback'], fr: ['feedback'] },
        { key: 'negotiation', title: 'Negotiation', level: 3, en: ['negotiation'], es: ['negociar'], de: ['verhandeln'], fr: ['negociation'] },
        { key: 'interview', title: 'Job interviews', level: 4, en: ['interview'], es: ['entrevista'], de: ['bewerbung'], fr: ['entretien'] },
        { key: 'leadership', title: 'Leadership', level: 4, en: ['leadership'], es: ['liderazgo'], de: ['fuehrung'], fr: ['leadership'] },
      ],
    },
    abroad: {
      title: 'Life abroad',
      intro: 'From arrival to social life: the situations of your first weeks and months in another country. Language is taught before each conversation.',
      prefix: 'abr',
      levels: ['Arrival', 'First week', 'Daily life', 'Workplace', 'Social life'],
      steps: [
        { key: 'arrival', level: 1, title: 'Arrival: airport, immigration, taxi, hotel', en: ['arrival'], es: ['llegada'], de: ['ankunft'], fr: ['arrivee'] },
        { key: 'firstweek', level: 2, title: 'First week: introductions, instructions, clarification', en: ['firstweek'], es: ['primera'], de: ['erstewoche'], fr: ['semaine'] },
        { key: 'daily', level: 3, title: 'Shopping and public transport', en: ['daily'], es: ['diario'], de: ['alltag'], fr: ['quotidien'] },
        { key: 'housing', level: 3, title: 'Renting and the landlord', en: ['housing'], es: ['piso'], de: ['wohnung'], fr: ['logement'] },
        { key: 'bank', level: 3, title: 'Bank and paperwork', en: ['bank'], es: ['banco'], de: ['bank'], fr: ['banque'] },
        { key: 'health', level: 3, title: 'Healthcare as a patient', en: ['health'], es: ['salud'], de: ['gesundheit'], fr: ['sante'] },
        { key: 'work', level: 4, title: 'At work: small talk, meetings, help', en: ['work'], es: ['trabajo'], de: ['arbeit'], fr: ['travail'] },
        { key: 'social', level: 5, title: 'Social life: friends, invitations, plans', en: ['social'], es: ['social'], de: ['sozial'], fr: ['social'] },
      ],
    },
    anesthesia: {
      title: 'Anaesthesia & critical care (optional)',
      intro: 'Language for anaesthesia and intensive care: core vocabulary → chunks → recognition → recall → controlled sentences → mini-dialogue → guided scenario → spontaneous communication. Language training only — not clinical guidance.',
      optional: true,
      steps: [
        { key: 'core', title: 'Core vocabulary', en: ['anesthesia-core'], es: ['anestesia-base'], de: ['anaesthesie-basis'], fr: ['anesthesie-base'] },
        { key: 'preop', title: 'Pre-operative assessment', en: ['preop'], es: ['preanestesia'], de: ['praemedikation'], fr: ['cpa'] },
        { key: 'airway', title: 'Airway', en: ['airway'], es: ['via-aerea'], de: ['atemweg'], fr: ['voies-aeriennes'] },
        { key: 'regional', title: 'Regional anaesthesia and pain', en: ['regional', 'pain'], es: ['raquidea'], de: [], fr: [] },
        { key: 'ventilation', title: 'Ventilation', en: ['ventilation'], es: ['ventilacion'], de: ['beatmung'], fr: ['ventilation'] },
        { key: 'hemodynamics', title: 'Haemodynamics', en: ['hemodynamics'], es: ['hemodinamica'], de: ['haemodynamik'], fr: ['hemodynamique'] },
        { key: 'family', title: 'Talking to families in the ICU', en: ['family'], es: ['familia'], de: ['angehoerige'], fr: ['famille-rea'] },
      ],
    },
  };
})();

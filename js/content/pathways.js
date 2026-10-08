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
      intro: 'Sixteen steps from the basic vocabulary of the ward to presenting at a conference. Each step teaches its language first, then the scenarios go from controlled to guided to free.',
      steps: [
        { key: 'basics', title: 'Basic medical vocabulary', en: ['basics'], es: ['basicos'], de: ['grundlagen'], fr: ['bases'] },
        { key: 'symptoms', title: 'Symptoms', en: ['symptoms'], es: ['sintomas'], de: ['beschwerden'], fr: ['symptomes'] },
        { key: 'history', title: 'History taking', en: ['history'], es: ['anamnesis'], de: ['anamnese'], fr: ['interrogatoire'] },
        { key: 'exam', title: 'Physical examination', en: ['exam'], es: ['exploracion'], de: ['untersuchung'], fr: ['examen'] },
        { key: 'procedures', title: 'Procedures', en: ['procedures'], es: ['procedimientos'], de: ['eingriff'], fr: ['geste'] },
        { key: 'medications', title: 'Medications', en: ['medications'], es: ['medicacion'], de: ['medikamente'], fr: ['medicaments'] },
        { key: 'consent', title: 'Consent and risks', en: ['consent'], es: ['consentimiento'], de: ['aufklaerung'], fr: ['consentement'] },
        { key: 'hospital', title: 'Hospital communication', en: ['instructions', 'reassurance'], es: ['alta', 'noticias'], de: ['entlassung', 'unsicherheit', 'schlechte-nachricht', 'arztbrief'], fr: ['sortie', 'incertitude', 'annonce', 'compte-rendu'] },
        { key: 'teamwork', title: 'Teamwork', en: ['closedloop', 'speakup'], es: ['bucle'], de: ['team'], fr: ['equipe'] },
        { key: 'handover', title: 'Handover', en: ['handover'], es: ['pase'], de: ['uebergabe'], fr: ['transmissions'] },
        { key: 'presenting', title: 'Presenting a patient', en: ['presenting', 'consult', 'mdt'], es: ['sesion', 'interconsulta'], de: ['visite', 'konsil', 'tumorboard'], fr: ['visite', 'avis', 'rcp'] },
        { key: 'investigations', title: 'Investigations and results', en: ['investigations'], es: ['pruebas'], de: ['diagnostik'], fr: ['examens'] },
        { key: 'treatment', title: 'Explaining treatment', en: ['treatment'], es: ['tratamiento'], de: ['therapie'], fr: ['traitement'] },
        { key: 'emergency', title: 'Emergency communication', en: ['emergency', 'deterioration'], es: ['urgencias', 'deterioro'], de: ['notfall'], fr: ['urgence'] },
        { key: 'academic', title: 'Academic and scientific language', en: ['journal'], es: ['bibliografica'], de: ['wissenschaft'], fr: ['redaction'] },
        { key: 'conferences', title: 'Conferences', en: ['conference'], es: ['congreso'], de: ['vortrag'], fr: ['congres'] },
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

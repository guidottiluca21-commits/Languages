/* Target countries per language: where register, vocabulary and habits differ from the "default" variety. */
(function () {
  'use strict';
  const LOS = window.LOS;
  LOS.COUNTRIES = {
    en: [
      { id: 'uk', label: 'United Kingdom', tips: ['British English: flat, GP, surgery (doctor\'s practice), queue, mobile, holiday.', 'Politeness through indirectness: "Would you mind…?", "I was wondering if…". Directness can sound rude.', 'Small talk (weather, weekend) is expected before getting to the point.'] },
      { id: 'ie', label: 'Ireland', tips: ['Mostly British vocabulary; "grand" = fine, "your man / your woman" = that person.', 'Very friendly small talk; humour and self-irony are common.'] },
      { id: 'us', label: 'United States', tips: ['American English: apartment, family doctor / primary care, line, cell phone, vacation, résumé.', 'More direct than British English, but always positive in tone ("That\'s a great question").', 'Spelling: color, center, organize.'] },
      { id: 'ca', label: 'Canada', tips: ['Mix of American vocabulary and some British spelling (colour, centre).', 'Very polite register; "sorry" is used constantly.'] },
      { id: 'au', label: 'Australia', tips: ['Informal and friendly; first names straight away. "Arvo" = afternoon, "no worries" = you\'re welcome.', 'British spelling; GP is used as in the UK.'] },
    ],
    es: [
      { id: 'es', label: 'España', tips: ['Vosotros para "voi" informale; tú es muy frecuente, también en el trabajo.', 'Ordenador, móvil, coger el autobús, piso, zumo.', 'Horarios tardíos: se come hacia las 14:00 y se cena hacia las 21:30.'] },
      { id: 'mx', label: 'México', tips: ['Ustedes también para "voi" informale (no se usa vosotros).', 'Computadora, celular, tomar el camión (autobús), departamento, jugo. Evite "coger": es vulgar.', 'Más formal y cortés: "¿Me podría…?", "con permiso", "mande".'] },
      { id: 'ar', label: 'Argentina', tips: ['Voseo: vos sos, vos tenés, vení. Ustedes en plural.', 'Colectivo (autobús), celular, departamento, laburo (trabajo, coloquial).', 'Pronunciación de ll/y como "sh".'] },
      { id: 'co', label: 'Colombia', tips: ['Usted es muy común incluso entre amigos y en familia.', 'Celular, bus, apartamento; "¡qué pena!" = scusi, che imbarazzo.'] },
    ],
    de: [
      { id: 'de', label: 'Deutschland', tips: ['Sie im Beruf, bis jemand das Du anbietet. In vielen Start-ups und Krankenhausteams duzt man sich schnell.', 'Pünktlichkeit und Direktheit gelten als höflich; Kritik ist oft sachlich und direkt.', 'Termine für fast alles: Bürgeramt, Arzt, Bank.'] },
      { id: 'at', label: 'Österreich', tips: ['Grüß Gott / Servus; Titel sind wichtig (Frau Doktor, Herr Magister).', 'Jänner (Januar), Paradeiser (Tomaten), Erdäpfel (Kartoffeln), heuer (dieses Jahr).'] },
      { id: 'ch', label: 'Schweiz', tips: ['Gesprochen wird Schweizerdeutsch, geschrieben Standarddeutsch — ohne ß (Strasse).', 'Grüezi; Velo (Fahrrad), Natel (Handy), parkieren.', 'Höflich und eher indirekt; Pünktlichkeit ist sehr wichtig.'] },
    ],
    fr: [
      { id: 'fr', label: 'France', tips: ['Vous au travail, tu entre collègues proches; toujours « Bonjour » avant toute demande.', 'Le vouvoiement avec les patients et l\'administration.', 'Les démarches demandent beaucoup de papiers : gardez des copies.'] },
      { id: 'be', label: 'Belgique', tips: ['Septante (70), nonante (90); « s\'il vous plaît » aussi pour « voilà » en tendant quelque chose.', 'Déjeuner = petit-déjeuner, dîner = repas de midi, souper = repas du soir.'] },
      { id: 'ch', label: 'Suisse', tips: ['Septante, huitante (VD) / nonante; natel = téléphone portable.', 'Grande ponctualité; registre poli et assez formel.'] },
      { id: 'ca', label: 'Québec', tips: ['Le tutoiement est plus fréquent; courriel, clavarder (chatter), magasiner (faire du shopping), char (voiture, familier).', 'Déjeuner = petit-déjeuner, dîner = midi, souper = soir.'] },
    ],
  };
})();

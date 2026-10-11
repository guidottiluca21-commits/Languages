/* Pronunciation minimal pairs (listen-and-choose, then record-and-compare) and cross-language traps
 * for an Italian speaker learning several of EN / ES / DE / FR. */
(function () {
  'use strict';
  const LOS = window.LOS;

  LOS.MINIMAL_PAIRS = {
    en: [
      { id: 'ih-ee', contrast: '/ɪ/ vs /iː/', note: 'Italian has one "i". English has a short, relaxed /ɪ/ (ship) and a long, tense /iː/ (sheep).', pairs: [['ship', 'sheep'], ['bit', 'beat'], ['fill', 'feel'], ['live', 'leave'], ['sit', 'seat']] },
      { id: 'th', contrast: '/θ/ /ð/ vs /t/ /d/', note: 'Put the tongue between the teeth for "th". Italians often say "tink" for "think".', pairs: [['think', 'tink'], ['three', 'tree'], ['thin', 'tin'], ['they', 'day'], ['breathe', 'breed']] },
      { id: 'ae-e', contrast: '/æ/ vs /e/', note: '"cat" is more open than "bet": drop the jaw.', pairs: [['bad', 'bed'], ['man', 'men'], ['sat', 'set'], ['pan', 'pen'], ['had', 'head']] },
      { id: 'h', contrast: '/h/ vs silence', note: 'Pronounce the h: "hear" ≠ "ear". Italian h is silent.', pairs: [['hear', 'ear'], ['hold', 'old'], ['heart', 'art'], ['hate', 'eight'], ['hill', 'ill']] },
      { id: 'final', contrast: 'final consonants', note: 'Do not add a vowel at the end: "work" not "worka".', pairs: [['bag', 'back'], ['cap', 'cab'], ['rice', 'rise'], ['leaf', 'leave'], ['ward', 'war']] },
    ],
    es: [
      { id: 'r-rr', contrast: 'r vs rr', note: 'One tap (pero) vs a trill (perro). Like Italian, but the trill must be strong.', pairs: [['pero', 'perro'], ['caro', 'carro'], ['coro', 'corro'], ['para', 'parra'], ['cero', 'cerro']] },
      { id: 'b-v', contrast: 'b = v', note: 'In Spanish b and v sound the same; between vowels they are soft [β]. Do not pronounce v as in Italian.', pairs: [['vaca', 'baca'], ['vello', 'bello'], ['tuvo', 'tubo'], ['votar', 'botar'], ['vienes', 'bienes']] },
      { id: 'z-s', contrast: 'z/c vs s (Spain)', note: 'In most of Spain z and c (+e,i) are /θ/ (like English "think"); in Latin America they sound like s.', pairs: [['caza', 'casa'], ['cocer', 'coser'], ['zumo', 'sumo'], ['cien', 'sien'], ['abrazar', 'abrasar']] },
      { id: 'j', contrast: 'j / g (+e,i) /x/', note: 'A strong sound from the back of the throat, not an Italian "g".', pairs: [['jota', 'gota'], ['caja', 'casa'], ['juego', 'fuego'], ['jarra', 'barra'], ['hijo', 'hilo']] },
      { id: 'stress', contrast: 'written accent = stress', note: 'The accent changes the word: papa (potato/pope) vs papá (dad).', pairs: [['papa', 'papá'], ['esta', 'está'], ['termino', 'terminó'], ['hablo', 'habló'], ['ingles', 'inglés']] },
    ],
    de: [
      { id: 'u-ue', contrast: 'u vs ü', note: 'Say "i" with rounded lips to get ü.', pairs: [['Mutter', 'Mütter'], ['fuhr', 'für'], ['Bruder', 'Brüder'], ['zurück', 'Zucker'], ['Tuch', 'Tücher']] },
      { id: 'o-oe', contrast: 'o vs ö', note: 'Say "e" with rounded lips to get ö.', pairs: [['schon', 'schön'], ['Ofen', 'öfter'], ['Tochter', 'Töchter'], ['konnte', 'könnte'], ['Sohn', 'Söhne']] },
      { id: 'ich-ach', contrast: 'ich-Laut vs ach-Laut', note: 'After e, i, ä, ö, ü: soft [ç] (ich). After a, o, u: harsh [x] (ach).', pairs: [['ich', 'ach'], ['Licht', 'lacht'], ['Bücher', 'Buch'], ['Küche', 'Kuchen'], ['nicht', 'Nacht']] },
      { id: 'long-short', contrast: 'long vs short vowels', note: 'Vowel length changes meaning: Staat (long) vs Stadt (short).', pairs: [['Staat', 'Stadt'], ['Miete', 'Mitte'], ['Ofen', 'offen'], ['Hüte', 'Hütte'], ['bieten', 'bitten']] },
      { id: 'z-s', contrast: 'z [ts] vs s [z]', note: 'German z is always [ts] (Zeit); s before a vowel is voiced [z] (seit).', pairs: [['Zeit', 'seit'], ['Zahl', 'Saal'], ['zehn', 'sehen'], ['Zoll', 'Soll'], ['heizen', 'heißen']] },
    ],
    fr: [
      { id: 'u-ou', contrast: 'u vs ou', note: '"u" = say "i" with rounded lips; "ou" = Italian u.', pairs: [['vu', 'vous'], ['tu', 'tout'], ['dessus', 'dessous'], ['rue', 'roue'], ['pur', 'pour']] },
      { id: 'nasal', contrast: 'nasal vowels', note: 'an/en, on, in/un: the vowel goes through the nose, no "n" at the end.', pairs: [['vent', 'vin'], ['blanc', 'blond'], ['long', 'lin'], ['temps', 'thon'], ['pain', 'pont']] },
      { id: 'e-e', contrast: 'é vs è / e muet', note: 'é is closed (été), è is open (mère); e muet is often silent.', pairs: [['les', 'lait'], ['fée', 'fait'], ['été', 'était'], ['ses', 'sait'], ['le', 'les']] },
      { id: 'liaison', contrast: 'liaison', note: 'A silent final consonant is pronounced before a vowel: les‿amis [lezami].', pairs: [['les amis', 'les parents'], ['vous avez', 'vous parlez'], ['un ami', 'un pain'], ['ils ont', 'ils sont'], ['deux heures', 'deux jours']] },
      { id: 'r', contrast: 'French r', note: 'The r is made at the back of the throat, not rolled like in Italian.', pairs: [['rouge', 'route'], ['rire', 'lire'], ['roue', 'loue'], ['riz', 'lit'], ['rang', 'lent']] },
    ],
  };

  /* Cross-language traps: forms that belong to another of the learner's languages (or to Italian).
   * `trap` is matched as a whole word in the learner's text of language X. */
  LOS.FALSE_FRIENDS = [
    { fr: { trap: 'hospital', fix: 'l\'hôpital', note: 'In French: l\'hôpital (hospital is Spanish/English).' }, es: { trap: 'hôpital', fix: 'el hospital', note: 'In Spanish: el hospital.' }, from: 'cognates' },
    { fr: { trap: 'problema', fix: 'le problème', note: 'In French: le problème.' }, en: { trap: 'problema', fix: 'problem', note: 'In English: problem.' }, de: { trap: 'Problema', fix: 'das Problem', note: 'In German: das Problem.' } },
    { en: { trap: 'informations', fix: 'information', note: '"Information" is uncountable in English: some information.' }, de: { trap: 'Informationes', fix: 'Informationen', note: 'German plural: Informationen.' } },
    { en: { trap: 'advices', fix: 'advice / pieces of advice', note: '"Advice" is uncountable in English.' } },
    { de: { trap: 'Pazient', fix: 'der Patient', note: 'German spelling: Patient.' }, en: { trap: 'pazient', fix: 'patient', note: 'English spelling: patient.' } },
    { es: { trap: 'ospedale', fix: 'el hospital', note: 'Italian word — in Spanish: el hospital.' }, fr: { trap: 'ospedale', fix: 'l\'hôpital', note: 'Italian word — in French: l\'hôpital.' } },
    { es: { trap: 'médecin', fix: 'el médico', note: 'French word — in Spanish: el médico.' }, fr: { trap: 'médico', fix: 'le médecin', note: 'Spanish word — in French: le médecin.' } },
    { es: { trap: 'aussi', fix: 'también', note: 'French word — in Spanish: también.' } },
    { fr: { trap: 'tambien', fix: 'aussi', note: 'Spanish word — in French: aussi.' } },
    { es: { trap: 'salire', fix: 'subir / salir', note: 'Italian "salire" = subir (go up); "salir" = to go out.' } },
    { fr: { trap: 'salire', fix: 'monter', note: 'Italian "salire" = monter; French "salir" means to make dirty.' } },
    { de: { trap: 'also auch', fix: 'auch', note: '"also" in German means "so / therefore", not "also" (= auch).' } },
    { en: { trap: 'actually it is', fix: 'currently it is / at the moment', note: 'English "actually" = in realtà, not "attualmente" (currently).' } },
  ];
  // Italian words that never belong to the other four languages (interference from the native language)
  LOS.ITALIAN_MARKERS = ['anche', 'molto', 'perché', 'però', 'allora', 'ancora', 'già', 'questo', 'quello', 'della', 'delle', 'degli', 'gli', 'sempre', 'adesso', 'oggi', 'domani', 'grazie', 'buongiorno', 'ospedale', 'quindi', 'invece', 'dopo'];
})();

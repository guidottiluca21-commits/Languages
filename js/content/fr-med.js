/* Français — parcours de langue médicale (Engine 2.0) : modules de base AVANT les tâches cliniques.
 * Entraînement linguistique et communicationnel — jamais de recommandations cliniques. */
(function () {
  'use strict';
  const LOS = window.LOS;

  const medical = [
    {
      id: 'fr-med-bases', cat: 'clinical', title: 'Les bases : personnes, lieux, le corps', l: 'A2', icon: 'heart',
      intro: 'Les mots nécessaires avant toute conversation clinique : qui travaille où, les parties du corps et comment parler de la douleur.',
      words: [
        { w: 'le service', tr: 'reparto', def: 'Partie de l\'hôpital où sont hospitalisés les patients.', ex: 'La patiente est dans le service de chirurgie.', g: 'm', pl: 'les services' },
        { w: "l'infirmière", tr: 'infermiera', def: 'Professionnelle qui soigne les patients.', ex: "L'infirmière va prendre votre tension.", g: 'f', pl: 'les infirmières' },
        { w: 'le chef de clinique', tr: 'medico strutturato (ospedale universitario)', def: 'Médecin senior dans un service universitaire.', ex: 'Le chef de clinique passe à dix heures.', g: 'm', pl: 'les chefs de clinique' },
        { w: 'le médecin traitant', tr: 'medico di base', def: 'Médecin qui suit le patient en ville.', ex: 'Votre médecin traitant recevra un courrier.', g: 'm', pl: 'les médecins traitants' },
        { w: 'la poitrine', tr: 'petto, torace', def: 'Partie avant du thorax.', ex: "J'ai une douleur dans la poitrine.", g: 'f', pl: 'les poitrines' },
        { w: 'le ventre', tr: 'pancia', def: 'Partie du corps entre le thorax et le bassin.', ex: "J'ai mal au ventre depuis hier.", g: 'm', pl: 'les ventres' },
        { w: 'la douleur', tr: 'dolore', def: 'Sensation désagréable de mal.', ex: 'Où est la douleur exactement ?', g: 'f', pl: 'les douleurs' },
        { w: 'avoir mal', tr: 'avere male', def: 'Ressentir une douleur (avoir mal à + partie du corps).', ex: 'Vous avez mal où ?' },
        { w: 'avoir des nausées', tr: 'avere la nausea', def: 'Avoir envie de vomir.', ex: "J'ai des nausées après les repas." },
        { w: 'la prise de sang', tr: 'prelievo di sangue', def: 'Prélèvement de sang pour le laboratoire.', ex: "On va d'abord faire une prise de sang.", g: 'f', pl: 'les prises de sang' },
        { w: 'le rendez-vous', tr: 'appuntamento', def: 'Heure fixée pour voir un médecin.', ex: 'Je voudrais prendre rendez-vous.', g: 'm', pl: 'les rendez-vous' },
        { w: "l'ordonnance", tr: 'ricetta', def: 'Prescription écrite du médecin.', ex: 'Apportez cette ordonnance à la pharmacie.', g: 'f', pl: 'les ordonnances' },
      ],
      expr: [
        { p: 'Comment vous sentez-vous aujourd\'hui ?', n: 'Inversion : registre soutenu et poli.' },
        { p: 'Où avez-vous mal ?', n: '' },
        { p: 'Vous pouvez me montrer où vous avez mal ?', n: '' },
        { p: "Je suis l'un des médecins de l'équipe.", n: '' },
        { p: 'Asseyez-vous, je vous en prie.', n: '' },
        { p: 'Prévenez-nous si quelque chose change.', n: '' },
      ],
      col: [
        { p: 'hospitaliser un patient', n: 'ricoverare' },
        { p: 'faire sortir un patient', n: 'dimettere' },
        { p: 'prendre rendez-vous', n: 'Et non « fixer un appuntamento ».' },
        { p: 'prendre la tension', n: 'misurare la pressione' },
      ],
      scen: [
        { p: 'Saluez un patient dans le service, présentez-vous et posez deux questions simples sur son état.', mode: 'speak', keys: ['Comment vous sentez-vous', 'Où avez-vous mal ?', "l'un des médecins"], model: "Bonjour, je suis l'un des médecins de l'équipe. Comment vous sentez-vous aujourd'hui ? Où avez-vous mal ? Vous pouvez me montrer où vous avez mal ? Merci. L'infirmière va prendre votre tension, et on fera une prise de sang plus tard. Prévenez-nous si quelque chose change." },
      ],
    },
    {
      id: 'fr-med-medicaments', cat: 'clinical', title: 'Les médicaments', l: 'B1', icon: 'clipboard',
      intro: 'Demander le traitement habituel, les allergies et les effets indésirables, et expliquer simplement comment prendre un médicament.',
      words: [
        { w: 'le traitement habituel', tr: 'terapia domiciliare', def: 'Médicaments que le patient prend régulièrement.', ex: 'Vous avez un traitement habituel ?', g: 'm', pl: 'les traitements habituels' },
        { w: 'le comprimé', tr: 'compressa', def: 'Forme solide d\'un médicament.', ex: 'Prenez un comprimé matin et soir.', g: 'm', pl: 'les comprimés' },
        { w: 'la dose', tr: 'dose', def: 'Quantité de médicament prise en une fois.', ex: 'On commence par une petite dose.', g: 'f', pl: 'les doses' },
        { w: "l'effet indésirable", tr: 'effetto collaterale', def: 'Effet non voulu d\'un médicament.', ex: "L'effet indésirable le plus fréquent, c'est le mal de tête.", g: 'm', pl: 'les effets indésirables' },
        { w: "l'allergie", tr: 'allergia', def: 'Réaction du corps à une substance.', ex: 'Vous avez des allergies aux médicaments ?', g: 'f', pl: 'les allergies' },
        { w: "l'antidouleur", tr: 'antidolorifico', def: 'Médicament contre la douleur.', ex: 'Vous pouvez avoir un antidouleur si besoin.', g: 'm', pl: 'les antidouleurs' },
        { w: "l'anticoagulant", tr: 'anticoagulante', def: 'Médicament qui fluidifie le sang.', ex: 'Vous prenez un anticoagulant ?', g: 'm', pl: 'les anticoagulants' },
        { w: 'sans ordonnance', tr: 'da banco', def: 'Vendu sans prescription.', ex: 'Vous prenez quelque chose sans ordonnance ?' },
      ],
      expr: [
        { p: 'Vous prenez des médicaments tous les jours ?', n: '' },
        { p: 'Vous avez déjà mal supporté un médicament ?', n: '« supporter » = tollerare.' },
        { p: 'Prenez-le pendant le repas.', n: '' },
        { p: "N'arrêtez pas le traitement sans nous en parler.", n: '' },
        { p: 'Au début, certaines personnes ont un peu mal à la tête.', n: '' },
        { p: 'Prévenez-nous si vous remarquez quelque chose d\'inhabituel.', n: '' },
      ],
      col: [
        { p: 'prendre un comprimé', n: '' },
        { p: 'arrêter un traitement', n: 'sospendere' },
        { p: 'bien supporter un médicament', n: 'tollerare bene' },
      ],
      scen: [
        { p: 'Faites l\'anamnèse médicamenteuse : traitement habituel, produits sans ordonnance et allergies.', mode: 'speak', keys: ['traitement habituel', 'sans ordonnance', 'allergies'], model: "Vous avez un traitement habituel ? Vous prenez quelque chose sans ordonnance, par exemple des antidouleurs ou des vitamines ? Vous avez des allergies aux médicaments ? Vous avez déjà mal supporté un médicament ? Merci. Vous prenez un anticoagulant ? N'arrêtez rien sans nous en parler." },
        { p: 'Expliquez par écrit comment prendre le nouveau comprimé et quels effets indésirables peuvent apparaître.', mode: 'write', keys: ['pendant le repas', 'effet indésirable', 'Prévenez-nous'], model: "Voici votre nouveau comprimé. Prenez un comprimé matin et soir, pendant le repas. L'effet indésirable le plus fréquent, c'est un léger mal de tête, qui disparaît en général après quelques jours. N'arrêtez pas le traitement sans nous en parler. Prévenez-nous si vous remarquez quelque chose d'inhabituel." },
      ],
    },
    {
      id: 'fr-med-examens', cat: 'clinical', title: 'Examens et résultats', l: 'B1', icon: 'microscope',
      intro: 'Expliquer un examen avant de le faire et les résultats après : quoi, pourquoi et quand, avec des mots simples.',
      words: [
        { w: 'la radio', tr: 'radiografia', def: 'Radiographie (familier).', ex: 'La radio montre une petite fracture.', g: 'f', pl: 'les radios' },
        { w: "l'échographie", tr: 'ecografia', def: 'Image obtenue par ultrasons.', ex: "L'échographie ne fait pas mal du tout.", g: 'f', pl: 'les échographies' },
        { w: 'le scanner', tr: 'TAC', def: 'Tomodensitométrie.', ex: 'On voudrait faire un scanner de la tête.', g: 'm', pl: 'les scanners' },
        { w: "l'électrocardiogramme", tr: 'elettrocardiogramma', def: 'Enregistrement de l\'activité électrique du cœur (ECG).', ex: 'On va faire un électrocardiogramme.', g: 'm', pl: 'les électrocardiogrammes' },
        { w: "l'analyse d'urine", tr: 'esame delle urine', def: 'Examen d\'un échantillon d\'urine.', ex: "Il nous faut une analyse d'urine.", g: 'f', pl: "les analyses d'urine" },
        { w: 'le résultat', tr: 'risultato', def: 'Ce que montre un examen.', ex: 'Les résultats seront là cet après-midi.', g: 'm', pl: 'les résultats' },
        { w: 'normal', tr: 'nella norma', def: 'Sans anomalie.', ex: "L'électrocardiogramme est normal." },
        { w: 'le contrôle', tr: 'controllo', def: 'Examen ultérieur de suivi.', ex: 'Le prochain contrôle est dans six semaines.', g: 'm', pl: 'les contrôles' },
      ],
      expr: [
        { p: 'On voudrait faire quelques examens.', n: '' },
        { p: 'Les résultats seront là cet après-midi.', n: '' },
        { p: "Le scanner n'a rien montré d'inquiétant.", n: '' },
        { p: 'Une des valeurs est un peu élevée.', n: '' },
        { p: 'Cet examen va nous aider à trouver la cause.', n: '' },
        { p: "Je reviens dès que j'en sais plus.", n: '' },
      ],
      col: [
        { p: 'prescrire un examen', n: 'richiedere un esame' },
        { p: 'éliminer une infection', n: 'escludere' },
        { p: 'programmer un contrôle', n: '' },
      ],
      scen: [
        { p: 'Expliquez à un patient pourquoi vous prescrivez un scanner et quand le résultat sera prêt.', mode: 'speak', keys: ['On voudrait', 'scanner', 'Les résultats seront là'], model: "On voudrait faire un scanner du ventre. Cet examen va nous aider à trouver la cause de la douleur et à éliminer une infection. Ça ne fait pas mal et ça dure une vingtaine de minutes. Les résultats seront là cet après-midi. Je reviens dès que j'en sais plus." },
      ],
    },
    {
      id: 'fr-med-traitement', cat: 'clinical', title: 'Expliquer le traitement', l: 'B1', icon: 'activity',
      intro: 'Proposer un plan, présenter les options et vérifier que le patient a bien compris.',
      words: [
        { w: 'le traitement', tr: 'terapia, trattamento', def: 'Ensemble des soins pour guérir une maladie.', ex: 'Le traitement dure en général deux semaines.', g: 'm', pl: 'les traitements' },
        { w: "l'option", tr: 'opzione', def: 'Possibilité de choix.', ex: 'Il y a deux options.', g: 'f', pl: 'les options' },
        { w: 'la perfusion', tr: 'flebo, infusione', def: 'Liquide ou médicament donné par la veine.', ex: 'Vous allez avoir une perfusion.', g: 'f', pl: 'les perfusions' },
        { w: 'la kinésithérapie', tr: 'fisioterapia', def: 'Rééducation par le mouvement.', ex: 'Vous commencez la kinésithérapie demain.', g: 'f', pl: '—' },
        { w: 'se rétablir', tr: 'riprendersi', def: 'Retrouver la santé.', ex: 'La plupart des gens se rétablissent complètement.' },
        { w: "l'objectif", tr: 'obiettivo', def: 'Ce que l\'on veut obtenir.', ex: "L'objectif, c'est de contrôler la douleur.", g: 'm', pl: 'les objectifs' },
        { w: "s'améliorer", tr: 'migliorare', def: 'Aller mieux.', ex: 'La respiration devrait s\'améliorer en quelques jours.' },
      ],
      expr: [
        { p: 'Ce que nous vous proposons, c\'est un traitement antibiotique court.', n: '' },
        { p: "L'objectif du traitement est de réduire le gonflement.", n: '' },
        { p: 'Il y a deux options, et on peut décider ensemble.', n: '' },
        { p: "Est-ce que c'est clair pour vous ?", n: 'Vérifier la compréhension.' },
        { p: 'Vous voulez que je vous réexplique quelque chose ?', n: 'vouloir que + subjonctif.' },
        { p: 'La plupart des gens vont mieux en une semaine.', n: '' },
      ],
      col: [
        { p: 'commencer un traitement', n: '' },
        { p: 'bien répondre au traitement', n: '' },
        { p: 'se rétablir complètement', n: '' },
      ],
      scen: [
        { p: 'Expliquez un plan de traitement simple, donnez l\'objectif et vérifiez la compréhension.', mode: 'speak', keys: ['Ce que nous vous proposons', "L'objectif", "Est-ce que c'est clair"], model: "Ce que nous vous proposons, c'est un traitement antibiotique par perfusion pendant deux jours, puis des comprimés à la maison. L'objectif du traitement est de guérir l'infection. La plupart des gens vont mieux en une semaine. Est-ce que c'est clair pour vous ? Vous voulez que je vous réexplique quelque chose ?" },
      ],
    },
    {
      id: 'fr-med-anesthesie-base', cat: 'anesthesia', title: 'Anesthésie : vocabulaire de base', l: 'B1', icon: 'wind',
      intro: 'Le vocabulaire de base de l\'anesthésie et de la réanimation, avant la consultation d\'anesthésie ou les voies aériennes. Langue uniquement, pas de recommandations cliniques.',
      words: [
        { w: "l'anesthésie générale", tr: 'anestesia generale', def: 'Le patient dort complètement pendant l\'opération.', ex: 'Vous aurez une anesthésie générale.', g: 'f', pl: 'les anesthésies générales' },
        { w: 'être à jeun', tr: 'essere a digiuno', def: 'Ne rien avoir mangé ni bu.', ex: 'Vous devez être à jeun à partir de minuit.' },
        { w: 'le cathéter', tr: 'agocannula, catetere venoso', def: 'Petit tuyau placé dans une veine.', ex: 'Je vais vous poser un cathéter sur la main.', g: 'm', pl: 'les cathéters' },
        { w: "le masque à oxygène", tr: "maschera dell'ossigeno", def: 'Masque qui donne de l\'oxygène.', ex: 'Respirez calmement dans le masque à oxygène.', g: 'm', pl: 'les masques à oxygène' },
        { w: 'le tuyau pour respirer', tr: 'tubo endotracheale (per il paziente)', def: 'Mots simples pour la sonde d\'intubation.', ex: 'Pendant que vous dormez, un tuyau vous aide à respirer.', g: 'm', pl: 'les tuyaux' },
        { w: 'la salle de réveil', tr: 'sala risveglio', def: 'Salle où l\'on se réveille après l\'opération.', ex: 'Vous vous réveillerez en salle de réveil.', g: 'f', pl: 'les salles de réveil' },
        { w: 'le mal de gorge', tr: 'mal di gola', def: 'Douleur dans la gorge.', ex: 'Certaines personnes ont un peu mal à la gorge après.', g: 'm', pl: '—' },
        { w: 'la tension artérielle', tr: 'pressione arteriosa', def: 'Pression du sang dans les artères.', ex: 'On surveille votre tension artérielle en permanence.', g: 'f', pl: '—' },
        { w: 'la saturation', tr: 'saturazione', def: 'Taux d\'oxygène dans le sang.', ex: 'Votre saturation est bonne.', g: 'f', pl: '—' },
        { w: 'la sédation', tr: 'sedazione', def: 'Médicament pour être calme et somnolent.', ex: 'On peut vous donner une légère sédation.', g: 'f', pl: 'les sédations' },
      ],
      expr: [
        { p: "Vous dormirez pendant toute l'opération.", n: '' },
        { p: 'Vous avez déjà eu une anesthésie ?', n: '' },
        { p: 'Est-ce que ça s\'est bien passé ?', n: '' },
        { p: 'Vous allez sentir une petite piqûre.', n: 'Phrase habituelle avant une aiguille.' },
        { p: 'Respirez normalement.', n: '' },
        { p: "Vous êtes en salle de réveil, l'opération est terminée.", n: '' },
      ],
      col: [
        { p: 'poser un cathéter', n: '' },
        { p: 'surveiller la tension', n: '' },
        { p: "se réveiller de l'anesthésie", n: '' },
      ],
      scen: [
        { p: 'Expliquez à un patient anxieux, avec des mots simples, ce qui se passe du bloc à la salle de réveil.', mode: 'speak', keys: ['Vous dormirez', 'cathéter', 'salle de réveil'], model: "D'abord, je vais vous poser un cathéter sur la main. Vous allez sentir une petite piqûre. Ensuite, vous respirerez de l'oxygène avec un masque. Respirez normalement. Vous dormirez pendant toute l'opération, et on surveille votre tension artérielle et votre saturation en permanence. Vous vous réveillerez en salle de réveil. Certaines personnes ont un peu mal à la gorge après." },
      ],
    },
    {
      id: 'fr-med-ventilation', cat: 'icu', title: 'Ventilation (langue)', l: 'C1', icon: 'wind',
      intro: 'Décrire une situation de ventilation en équipe et avec les proches. Entraînement linguistique, pas de recommandations de ventilation.',
      words: [
        { w: 'intubé-ventilé', tr: 'intubato e ventilato', def: 'Avec une sonde et une machine qui aide à respirer.', ex: 'Le patient est intubé-ventilé depuis hier.' },
        { w: 'le respirateur', tr: 'ventilatore', def: 'Machine qui aide à respirer.', ex: 'Le respirateur fait une partie du travail respiratoire.', g: 'm', pl: 'les respirateurs' },
        { w: 'le sevrage', tr: 'svezzamento', def: 'Arrêt progressif de la ventilation.', ex: 'On commence le sevrage aujourd\'hui.', g: 'm', pl: 'les sevrages' },
        { w: 'extuber', tr: 'estubare', def: 'Retirer la sonde d\'intubation.', ex: 'On prévoit de l\'extuber demain.' },
        { w: 'les gaz du sang', tr: 'emogasanalisi', def: 'Mesure de l\'oxygène et du CO2 dans le sang.', ex: 'Les derniers gaz du sang sont meilleurs.', g: 'm', pl: '(pluriel)' },
        { w: "les besoins en oxygène", tr: 'fabbisogno di ossigeno', def: 'Quantité d\'oxygène nécessaire.', ex: 'Les besoins en oxygène diminuent.', g: 'm', pl: '(pluriel)' },
      ],
      expr: [
        { p: 'Il est intubé-ventilé depuis hier soir.', n: '' },
        { p: 'Les besoins en oxygène diminuent.', n: '' },
        { p: "On a commencé le sevrage aujourd'hui.", n: '' },
        { p: "La machine l'aide à respirer.", n: 'Pour les proches.' },
        { p: "S'il reste stable, on prévoit de l'extuber demain.", n: '' },
      ],
      col: [
        { p: 'diminuer la ventilation', n: '' },
        { p: 'commencer le sevrage', n: '' },
        { p: 'faire des gaz du sang', n: '' },
      ],
      scen: [
        { p: 'Expliquez aux proches, avec des mots simples, pourquoi le patient est ventilé et ce qui est prévu.', mode: 'speak', keys: ['intubé-ventilé', "La machine l'aide", 'sevrage'], model: "Votre père est intubé-ventilé depuis hier soir. La machine l'aide à respirer, pour que les poumons puissent récupérer. Les besoins en oxygène diminuent, c'est un bon signe. On a commencé le sevrage aujourd'hui. S'il reste stable, on prévoit de l'extuber demain." },
      ],
    },
    {
      id: 'fr-med-hemodynamique', cat: 'icu', title: 'Hémodynamique (langue)', l: 'C1', icon: 'activity',
      intro: 'Présenter clairement une situation hémodynamique aux transmissions et à la visite. Entraînement linguistique, pas de recommandations cliniques.',
      words: [
        { w: 'instable sur le plan hémodynamique', tr: 'emodinamicamente instabile', def: 'Avec une tension ou un pouls instables.', ex: 'La patiente a été instable sur le plan hémodynamique cette nuit.' },
        { w: 'les amines', tr: 'amine (vasopressori)', def: 'Médicaments de soutien de la circulation.', ex: 'Elle est toujours sous amines.', g: 'f', pl: '(pluriel)' },
        { w: 'le cathéter artériel', tr: 'catetere arterioso', def: 'Cathéter dans une artère pour mesurer la pression.', ex: 'On a posé un cathéter artériel.', g: 'm', pl: 'les cathéters artériels' },
        { w: 'le remplissage', tr: 'riempimento volemico', def: 'Apport de liquide par la veine.', ex: 'Après le remplissage, la tension est remontée.', g: 'm', pl: 'les remplissages' },
        { w: 'la fréquence cardiaque', tr: 'frequenza cardiaca', def: 'Nombre de battements du cœur par minute.', ex: 'La fréquence cardiaque est à 110.', g: 'f', pl: 'les fréquences cardiaques' },
        { w: 'se stabiliser', tr: 'stabilizzarsi', def: 'Redevenir stable.', ex: "L'état hémodynamique s'est stabilisé." },
      ],
      expr: [
        { p: 'Cette nuit, elle a été brièvement instable sur le plan hémodynamique.', n: '' },
        { p: "Après le remplissage, l'état hémodynamique s'est stabilisé.", n: '' },
        { p: 'On a pu diminuer les amines.', n: '' },
        { p: 'La fréquence cardiaque est actuellement à 95.', n: '« être à » pour une valeur.' },
        { p: "J'aimerais avoir votre avis.", n: 'Demande polie au senior.' },
      ],
      col: [
        { p: 'poser un cathéter artériel', n: '' },
        { p: 'diminuer les amines', n: '' },
        { p: 'faire un remplissage', n: '' },
      ],
      scen: [
        { p: 'Faites des transmissions courtes pour une patiente instable cette nuit : évolution, mesures, état actuel, points en suspens.', mode: 'speak', keys: ['instable sur le plan hémodynamique', 'remplissage', 'est actuellement à'], model: "Cette nuit, Mme Martin a été brièvement instable sur le plan hémodynamique. On a posé un cathéter artériel. Après le remplissage, l'état hémodynamique s'est stabilisé. La fréquence cardiaque est actuellement à 95. On a pu diminuer les amines. Il reste à voir le bilan de ce matin. J'aimerais avoir votre avis." },
      ],
    },
  ];

  LOS.lang.register({ code: 'fr', medical });
})();

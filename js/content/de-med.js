/* Deutsch — medizinischer Sprachpfad (Engine 2.0): Grundmodule VOR den klinischen Aufgaben.
 * Sprach- und Kommunikationstraining — keine klinischen Empfehlungen. */
(function () {
  'use strict';
  const LOS = window.LOS;

  const medical = [
    {
      id: 'de-med-grundlagen', cat: 'clinical', title: 'Grundwortschatz: Personen, Orte, Körper', l: 'A2', icon: 'heart',
      intro: 'Die Wörter, die Sie vor jedem klinischen Gespräch brauchen: wer wo arbeitet, die wichtigsten Körperteile und wie man über Schmerzen spricht.',
      words: [
        { w: 'die Station', tr: 'reparto', def: 'Bereich im Krankenhaus, in dem Patienten liegen.', ex: 'Die Patientin liegt auf Station 3.', g: 'f', pl: 'die Stationen' },
        { w: 'die Pflegekraft', tr: 'infermiere / infermiera', def: 'Person, die Patienten pflegt.', ex: 'Die Pflegekraft misst gleich Ihren Blutdruck.', g: 'f', pl: 'die Pflegekräfte' },
        { w: 'der Oberarzt', tr: 'medico strutturato senior', def: 'Erfahrener Facharzt mit Leitungsfunktion.', ex: 'Der Oberarzt kommt zur Visite.', g: 'm', pl: 'die Oberärzte' },
        { w: 'der Hausarzt', tr: 'medico di base', def: 'Arzt für die allgemeine Versorgung.', ex: 'Ihr Hausarzt bekommt einen Arztbrief.', g: 'm', pl: 'die Hausärzte' },
        { w: 'die Brust', tr: 'petto, torace', def: 'Vorderer Teil des Oberkörpers.', ex: 'Ich habe ein Druckgefühl in der Brust.', g: 'f', pl: 'die Brüste' },
        { w: 'der Bauch', tr: 'pancia, addome', def: 'Teil des Körpers zwischen Brust und Becken.', ex: 'Seit gestern tut mir der Bauch weh.', g: 'm', pl: 'die Bäuche' },
        { w: 'der Schmerz', tr: 'dolore', def: 'Unangenehmes Gefühl, wenn etwas wehtut.', ex: 'Wo genau ist der Schmerz?', g: 'm', pl: 'die Schmerzen' },
        { w: 'wehtun', tr: 'fare male', def: 'Schmerzen verursachen (mir tut … weh).', ex: 'Tut es hier weh?' },
        { w: 'übel sein', tr: 'avere la nausea', def: 'Das Gefühl haben, sich übergeben zu müssen (mir ist übel).', ex: 'Mir ist nach dem Essen übel.' },
        { w: 'die Blutuntersuchung', tr: 'esame del sangue', def: 'Untersuchung einer Blutprobe.', ex: 'Zuerst machen wir eine Blutuntersuchung.', g: 'f', pl: 'die Blutuntersuchungen' },
        { w: 'der Termin', tr: 'appuntamento', def: 'Vereinbarte Zeit für einen Arztbesuch.', ex: 'Ich möchte gern einen Termin vereinbaren.', g: 'm', pl: 'die Termine' },
        { w: 'das Rezept', tr: 'ricetta', def: 'Ärztliche Verordnung für ein Medikament.', ex: 'Mit diesem Rezept gehen Sie bitte in die Apotheke.', g: 'n', pl: 'die Rezepte' },
      ],
      expr: [
        { p: 'Wie geht es Ihnen heute?', n: 'Natürlicher Einstieg (Sie-Form).' },
        { p: 'Wo tut es weh?', n: '' },
        { p: 'Können Sie mir zeigen, wo der Schmerz ist?', n: 'Nebensatz: Verb am Ende.' },
        { p: 'Ich bin eine der Ärztinnen im Team.', n: '' },
        { p: 'Nehmen Sie bitte Platz.', n: '' },
        { p: 'Sagen Sie bitte Bescheid, wenn sich etwas verändert.', n: '' },
      ],
      col: [
        { p: 'einen Patienten aufnehmen', n: 'ricoverare' },
        { p: 'einen Patienten entlassen', n: 'dimettere' },
        { p: 'auf Station', n: 'Präposition: auf (nicht "in")' },
        { p: 'einen Termin vereinbaren', n: 'Nicht "einen Termin nehmen".' },
      ],
      scen: [
        { p: 'Begrüßen Sie einen Patienten auf Station, stellen Sie sich vor und stellen Sie zwei einfache Fragen zu seinem Befinden.', mode: 'speak', keys: ['Wie geht es Ihnen heute?', 'Wo tut es weh?', 'auf Station'], model: 'Guten Morgen, ich bin eine der Ärztinnen im Team. Wie geht es Ihnen heute? Wo tut es weh? Können Sie mir zeigen, wo der Schmerz ist? Danke. Die Pflegekraft misst gleich Ihren Blutdruck, und später machen wir eine Blutuntersuchung. Sagen Sie bitte Bescheid, wenn sich etwas verändert.' },
      ],
    },
    {
      id: 'de-med-medikamente', cat: 'clinical', title: 'Medikamente', l: 'B1', icon: 'clipboard',
      intro: 'Nach der Dauermedikation, Allergien und Nebenwirkungen fragen und die Einnahme in einfachen Worten erklären.',
      words: [
        { w: 'die Dauermedikation', tr: 'terapia domiciliare cronica', def: 'Medikamente, die regelmäßig eingenommen werden.', ex: 'Haben Sie eine Dauermedikation?', g: 'f', pl: '—' },
        { w: 'die Tablette', tr: 'compressa', def: 'Feste Form eines Medikaments.', ex: 'Nehmen Sie zweimal täglich eine Tablette.', g: 'f', pl: 'die Tabletten' },
        { w: 'die Dosis', tr: 'dose', def: 'Menge eines Medikaments, die man auf einmal nimmt.', ex: 'Wir beginnen mit einer niedrigen Dosis.', g: 'f', pl: 'die Dosen' },
        { w: 'die Nebenwirkung', tr: 'effetto collaterale', def: 'Unerwünschte Wirkung eines Medikaments.', ex: 'Die häufigste Nebenwirkung sind Kopfschmerzen.', g: 'f', pl: 'die Nebenwirkungen' },
        { w: 'die Allergie', tr: 'allergia', def: 'Überempfindlichkeit gegen einen Stoff.', ex: 'Haben Sie Allergien gegen Medikamente?', g: 'f', pl: 'die Allergien' },
        { w: 'das Schmerzmittel', tr: 'antidolorifico', def: 'Medikament gegen Schmerzen.', ex: 'Sie können jederzeit ein Schmerzmittel bekommen.', g: 'n', pl: 'die Schmerzmittel' },
        { w: 'der Blutverdünner', tr: 'anticoagulante (colloquiale)', def: 'Umgangssprachlich für ein Antikoagulans.', ex: 'Nehmen Sie Blutverdünner?', g: 'm', pl: 'die Blutverdünner' },
        { w: 'rezeptfrei', tr: 'da banco', def: 'Ohne Rezept erhältlich.', ex: 'Nehmen Sie auch rezeptfreie Mittel?' },
      ],
      expr: [
        { p: 'Welche Medikamente nehmen Sie regelmäßig?', n: '' },
        { p: 'Haben Sie schon einmal ein Medikament nicht vertragen?', n: '"vertragen" = tollerare.' },
        { p: 'Nehmen Sie die Tablette bitte zum Essen.', n: '' },
        { p: 'Bitte setzen Sie das Medikament nicht selbst ab.', n: '"absetzen" = sospendere.' },
        { p: 'Am Anfang bekommen manche Menschen leichte Kopfschmerzen.', n: '' },
        { p: 'Melden Sie sich bitte, wenn Ihnen etwas auffällt.', n: '' },
      ],
      col: [
        { p: 'eine Tablette einnehmen', n: 'Nicht "trinken".' },
        { p: 'ein Medikament absetzen', n: 'sospendere' },
        { p: 'ein Medikament gut vertragen', n: 'tollerare bene' },
      ],
      scen: [
        { p: 'Erheben Sie eine Medikamentenanamnese: Dauermedikation, rezeptfreie Mittel und Allergien.', mode: 'speak', keys: ['regelmäßig', 'rezeptfreie', 'Allergien'], model: 'Welche Medikamente nehmen Sie regelmäßig? Nehmen Sie auch rezeptfreie Mittel, zum Beispiel Schmerzmittel oder Vitamine? Haben Sie Allergien gegen Medikamente? Haben Sie schon einmal ein Medikament nicht vertragen? Danke. Nehmen Sie Blutverdünner? Bitte setzen Sie kein Medikament selbst ab.' },
        { p: 'Erklären Sie schriftlich, wie die neue Tablette eingenommen wird und welche Nebenwirkungen auftreten können.', mode: 'write', keys: ['zum Essen', 'Nebenwirkung', 'Melden Sie sich bitte'], model: 'Das ist Ihre neue Tablette. Nehmen Sie bitte zweimal täglich eine Tablette zum Essen. Die häufigste Nebenwirkung sind leichte Kopfschmerzen, die meistens nach ein paar Tagen verschwinden. Bitte setzen Sie das Medikament nicht selbst ab. Melden Sie sich bitte, wenn Ihnen etwas auffällt.' },
      ],
    },
    {
      id: 'de-med-diagnostik', cat: 'clinical', title: 'Untersuchungen und Befunde', l: 'B1', icon: 'microscope',
      intro: 'Untersuchungen vorher erklären und Befunde danach mitteilen: was, warum und wann — in einfachen Worten.',
      words: [
        { w: 'das Röntgenbild', tr: 'radiografia', def: 'Bild des Körperinneren mit Röntgenstrahlen.', ex: 'Auf dem Röntgenbild sieht man einen kleinen Bruch.', g: 'n', pl: 'die Röntgenbilder' },
        { w: 'der Ultraschall', tr: 'ecografia', def: 'Untersuchung mit Schallwellen.', ex: 'Der Ultraschall tut überhaupt nicht weh.', g: 'm', pl: '—' },
        { w: 'das CT', tr: 'TAC', def: 'Computertomographie.', ex: 'Wir möchten ein CT vom Kopf machen.', g: 'n', pl: 'die CTs' },
        { w: 'das EKG', tr: 'elettrocardiogramma', def: 'Aufzeichnung der Herzströme.', ex: 'Wir schreiben ein EKG.', g: 'n', pl: 'die EKGs' },
        { w: 'die Urinprobe', tr: 'campione di urina', def: 'Kleine Menge Urin für das Labor.', ex: 'Können Sie uns bitte eine Urinprobe geben?', g: 'f', pl: 'die Urinproben' },
        { w: 'der Befund', tr: 'referto, reperto', def: 'Ergebnis einer Untersuchung.', ex: 'Der Befund kommt heute Nachmittag.', g: 'm', pl: 'die Befunde' },
        { w: 'unauffällig', tr: 'nella norma', def: 'Ohne krankhaften Befund.', ex: 'Das EKG ist unauffällig.' },
        { w: 'die Kontrolle', tr: 'controllo', def: 'Spätere Untersuchung zur Überprüfung.', ex: 'Die nächste Kontrolle ist in sechs Wochen.', g: 'f', pl: 'die Kontrollen' },
      ],
      expr: [
        { p: 'Wir möchten noch ein paar Untersuchungen machen.', n: '' },
        { p: 'Der Befund kommt heute Nachmittag.', n: '' },
        { p: 'Im CT war nichts Beunruhigendes zu sehen.', n: '' },
        { p: 'Ein Wert ist leicht erhöht.', n: '' },
        { p: 'Diese Untersuchung hilft uns, die Ursache zu finden.', n: 'zu + Infinitiv.' },
        { p: 'Ich komme wieder, sobald ich mehr weiß.', n: '' },
      ],
      col: [
        { p: 'eine Untersuchung anordnen', n: 'richiedere un esame' },
        { p: 'eine Infektion ausschließen', n: 'escludere' },
        { p: 'einen Kontrolltermin vereinbaren', n: '' },
      ],
      scen: [
        { p: 'Erklären Sie einem Patienten, warum Sie ein CT anordnen und wann der Befund da ist.', mode: 'speak', keys: ['Wir möchten', 'CT', 'Der Befund kommt'], model: 'Wir möchten ein CT vom Bauch machen. Diese Untersuchung hilft uns, die Ursache der Schmerzen zu finden und eine Infektion auszuschließen. Es tut nicht weh und dauert ungefähr zwanzig Minuten. Der Befund kommt heute Nachmittag. Ich komme wieder, sobald ich mehr weiß.' },
      ],
    },
    {
      id: 'de-med-therapie', cat: 'clinical', title: 'Die Behandlung erklären', l: 'B1', icon: 'activity',
      intro: 'Einen Plan vorschlagen, Möglichkeiten nennen und prüfen, ob der Patient alles verstanden hat.',
      words: [
        { w: 'die Behandlung', tr: 'trattamento, terapia', def: 'Maßnahmen, um eine Krankheit zu heilen.', ex: 'Die Behandlung dauert meistens zwei Wochen.', g: 'f', pl: 'die Behandlungen' },
        { w: 'die Möglichkeit', tr: 'possibilità, opzione', def: 'Etwas, das man wählen kann.', ex: 'Es gibt zwei Möglichkeiten.', g: 'f', pl: 'die Möglichkeiten' },
        { w: 'die Infusion', tr: 'flebo, infusione', def: 'Flüssigkeit oder Medikament über die Vene.', ex: 'Sie bekommen eine Infusion.', g: 'f', pl: 'die Infusionen' },
        { w: 'die Physiotherapie', tr: 'fisioterapia', def: 'Behandlung mit Bewegung und Übungen.', ex: 'Morgen beginnt die Physiotherapie.', g: 'f', pl: '—' },
        { w: 'sich erholen', tr: 'riprendersi', def: 'Wieder gesund werden.', ex: 'Die meisten Menschen erholen sich vollständig.' },
        { w: 'das Ziel', tr: 'obiettivo', def: 'Was man erreichen möchte.', ex: 'Das Ziel ist, die Schmerzen zu kontrollieren.', g: 'n', pl: 'die Ziele' },
        { w: 'sich bessern', tr: 'migliorare', def: 'Besser werden.', ex: 'Die Atmung sollte sich in ein paar Tagen bessern.' },
      ],
      expr: [
        { p: 'Wir schlagen eine kurze Antibiotikatherapie vor.', n: 'Trennbares Verb: vorschlagen.' },
        { p: 'Das Ziel der Behandlung ist, die Schwellung zu verringern.', n: '' },
        { p: 'Es gibt zwei Möglichkeiten, und wir entscheiden gemeinsam.', n: '' },
        { p: 'Ist das so verständlich?', n: 'Verständnis prüfen.' },
        { p: 'Soll ich etwas noch einmal erklären?', n: '' },
        { p: 'Den meisten Menschen geht es nach einer Woche besser.', n: '' },
      ],
      col: [
        { p: 'eine Behandlung beginnen', n: '' },
        { p: 'auf die Behandlung ansprechen', n: 'rispondere alla terapia' },
        { p: 'sich vollständig erholen', n: '' },
      ],
      scen: [
        { p: 'Erklären Sie einen einfachen Behandlungsplan, nennen Sie das Ziel und prüfen Sie das Verständnis.', mode: 'speak', keys: ['Wir schlagen', 'Das Ziel', 'Ist das so verständlich?'], model: 'Wir schlagen eine kurze Antibiotikatherapie vor: zwei Tage als Infusion und danach Tabletten zu Hause. Das Ziel der Behandlung ist, die Infektion zu heilen. Den meisten Menschen geht es nach einer Woche besser. Ist das so verständlich? Soll ich etwas noch einmal erklären?' },
      ],
    },
    {
      id: 'de-med-anaesthesie-basis', cat: 'anesthesia', title: 'Anästhesie: Grundwortschatz', l: 'B1', icon: 'wind',
      intro: 'Der Kernwortschatz für Anästhesie und Intensivmedizin, bevor Prämedikation oder Atemweg geübt werden. Nur Sprache, keine klinischen Empfehlungen.',
      words: [
        { w: 'die Vollnarkose', tr: 'anestesia generale', def: 'Der Patient schläft während der Operation vollständig.', ex: 'Sie bekommen eine Vollnarkose.', g: 'f', pl: 'die Vollnarkosen' },
        { w: 'nüchtern bleiben', tr: 'restare a digiuno', def: 'Vor einem Eingriff nichts essen oder trinken.', ex: 'Bitte bleiben Sie ab Mitternacht nüchtern.' },
        { w: 'die Braunüle', tr: 'agocannula', def: 'Venenverweilkanüle (umgangssprachlich).', ex: 'Ich lege Ihnen jetzt eine Braunüle in die Hand.', g: 'f', pl: 'die Braunülen' },
        { w: 'die Sauerstoffmaske', tr: 'maschera dell\'ossigeno', def: 'Maske, über die Sauerstoff gegeben wird.', ex: 'Atmen Sie ruhig durch die Sauerstoffmaske.', g: 'f', pl: 'die Sauerstoffmasken' },
        { w: 'der Beatmungsschlauch', tr: 'tubo endotracheale (per il paziente)', def: 'Patientennahes Wort für den Tubus.', ex: 'Während Sie schlafen, hilft ein Beatmungsschlauch beim Atmen.', g: 'm', pl: 'die Beatmungsschläuche' },
        { w: 'der Aufwachraum', tr: 'sala risveglio', def: 'Raum, in dem Patienten nach der Operation aufwachen.', ex: 'Sie wachen im Aufwachraum auf.', g: 'm', pl: 'die Aufwachräume' },
        { w: 'die Halsschmerzen', tr: 'mal di gola', def: 'Schmerzen im Hals.', ex: 'Manche haben danach leichte Halsschmerzen.', g: 'f', pl: '(Plural)' },
        { w: 'der Blutdruck', tr: 'pressione arteriosa', def: 'Druck des Blutes in den Arterien.', ex: 'Wir überwachen ständig Ihren Blutdruck.', g: 'm', pl: '—' },
        { w: 'die Sauerstoffsättigung', tr: 'saturazione', def: 'Anteil des Sauerstoffs im Blut.', ex: 'Ihre Sauerstoffsättigung ist gut.', g: 'f', pl: '—' },
        { w: 'die Sedierung', tr: 'sedazione', def: 'Medikamente zur Beruhigung.', ex: 'Wir können Ihnen eine leichte Sedierung geben.', g: 'f', pl: 'die Sedierungen' },
      ],
      expr: [
        { p: 'Sie schlafen während der ganzen Operation.', n: '' },
        { p: 'Hatten Sie schon einmal eine Narkose?', n: '' },
        { p: 'Gab es dabei Probleme?', n: '' },
        { p: 'Jetzt piekst es kurz.', n: 'Üblicher Satz vor einer Nadel.' },
        { p: 'Atmen Sie ganz normal weiter.', n: '' },
        { p: 'Sie sind im Aufwachraum, die Operation ist vorbei.', n: '' },
      ],
      col: [
        { p: 'eine Braunüle legen', n: '' },
        { p: 'den Blutdruck überwachen', n: '' },
        { p: 'aus der Narkose aufwachen', n: '' },
      ],
      scen: [
        { p: 'Erklären Sie einem ängstlichen Patienten in einfachen Worten, was vom Einleitungsraum bis zum Aufwachraum passiert.', mode: 'speak', keys: ['Sie schlafen', 'Braunüle', 'Aufwachraum'], model: 'Zuerst lege ich Ihnen eine Braunüle in die Hand. Jetzt piekst es kurz. Dann atmen Sie Sauerstoff über eine Maske. Atmen Sie ganz normal weiter. Sie schlafen während der ganzen Operation, und wir überwachen ständig Ihren Blutdruck und die Sauerstoffsättigung. Sie wachen im Aufwachraum auf. Manche haben danach leichte Halsschmerzen.' },
      ],
    },
    {
      id: 'de-med-beatmung', cat: 'icu', title: 'Beatmung (Sprache)', l: 'C1', icon: 'wind',
      intro: 'Beatmungssituationen im Team und mit Angehörigen sprachlich präzise beschreiben. Sprachtraining, keine Beatmungsempfehlungen.',
      words: [
        { w: 'beatmet', tr: 'ventilato', def: 'Mit maschineller Unterstützung atmend.', ex: 'Der Patient ist seit gestern beatmet.' },
        { w: 'das Beatmungsgerät', tr: 'ventilatore', def: 'Maschine, die die Atmung unterstützt.', ex: 'Das Beatmungsgerät übernimmt einen Teil der Atemarbeit.', g: 'n', pl: 'die Beatmungsgeräte' },
        { w: 'die Entwöhnung', tr: 'svezzamento', def: 'Schrittweises Beenden der Beatmung (Weaning).', ex: 'Heute beginnen wir mit der Entwöhnung.', g: 'f', pl: '—' },
        { w: 'extubieren', tr: 'estubare', def: 'Den Tubus entfernen.', ex: 'Wir planen, morgen zu extubieren.' },
        { w: 'die Blutgasanalyse', tr: 'emogasanalisi', def: 'Messung von Sauerstoff und Kohlendioxid im Blut.', ex: 'Die letzte Blutgasanalyse ist besser.', g: 'f', pl: 'die Blutgasanalysen' },
        { w: 'der Sauerstoffbedarf', tr: 'fabbisogno di ossigeno', def: 'Menge Sauerstoff, die der Patient braucht.', ex: 'Der Sauerstoffbedarf ist rückläufig.', g: 'm', pl: '—' },
      ],
      expr: [
        { p: 'Er ist seit gestern Abend beatmet.', n: '' },
        { p: 'Der Sauerstoffbedarf ist rückläufig.', n: 'Fachsprachlich, präzise.' },
        { p: 'Wir haben heute mit der Entwöhnung begonnen.', n: '' },
        { p: 'Die Maschine unterstützt ihn beim Atmen.', n: 'Für Angehörige.' },
        { p: 'Wenn er stabil bleibt, planen wir die Extubation für morgen.', n: '' },
      ],
      col: [
        { p: 'die Beatmung reduzieren', n: '' },
        { p: 'mit der Entwöhnung beginnen', n: '' },
        { p: 'eine Blutgasanalyse abnehmen', n: '' },
      ],
      scen: [
        { p: 'Erklären Sie Angehörigen in einfachen Worten, warum der Patient beatmet ist und wie es weitergeht.', mode: 'speak', keys: ['beatmet', 'Die Maschine unterstützt', 'Entwöhnung'], model: 'Ihr Vater ist seit gestern Abend beatmet. Die Maschine unterstützt ihn beim Atmen, damit sich die Lunge erholen kann. Der Sauerstoffbedarf ist rückläufig, das ist ein gutes Zeichen. Wir haben heute mit der Entwöhnung begonnen. Wenn er stabil bleibt, planen wir die Extubation für morgen.' },
      ],
    },
    {
      id: 'de-med-haemodynamik', cat: 'icu', title: 'Kreislauf (Sprache)', l: 'C1', icon: 'activity',
      intro: 'Kreislaufsituationen bei Übergabe und Visite sprachlich klar darstellen. Sprachtraining, keine klinischen Empfehlungen.',
      words: [
        { w: 'kreislaufinstabil', tr: 'emodinamicamente instabile', def: 'Mit instabilem Blutdruck oder Puls.', ex: 'Die Patientin war in der Nacht kreislaufinstabil.' },
        { w: 'das Katecholamin', tr: 'catecolamina, amina', def: 'Medikament zur Kreislaufunterstützung.', ex: 'Sie braucht weiterhin Katecholamine.', g: 'n', pl: 'die Katecholamine' },
        { w: 'der arterielle Zugang', tr: 'catetere arterioso', def: 'Kanüle in einer Arterie zur Druckmessung.', ex: 'Wir haben einen arteriellen Zugang gelegt.', g: 'm', pl: 'die arteriellen Zugänge' },
        { w: 'die Volumengabe', tr: 'somministrazione di fluidi', def: 'Gabe von Flüssigkeit über die Vene.', ex: 'Nach der Volumengabe stieg der Blutdruck.', g: 'f', pl: 'die Volumengaben' },
        { w: 'die Herzfrequenz', tr: 'frequenza cardiaca', def: 'Zahl der Herzschläge pro Minute.', ex: 'Die Herzfrequenz liegt bei 110.', g: 'f', pl: 'die Herzfrequenzen' },
        { w: 'stabilisieren', tr: 'stabilizzare', def: 'Wieder stabil machen.', ex: 'Der Kreislauf hat sich stabilisiert.' },
      ],
      expr: [
        { p: 'In der Nacht war sie kurzzeitig kreislaufinstabil.', n: '' },
        { p: 'Nach der Volumengabe hat sich der Kreislauf stabilisiert.', n: '' },
        { p: 'Der Katecholaminbedarf ist rückläufig.', n: '' },
        { p: 'Die Herzfrequenz liegt aktuell bei 110.', n: '"liegen bei" für Messwerte.' },
        { p: 'Ich würde gern Ihre Einschätzung hören.', n: 'Höfliche Bitte an den Oberarzt.' },
      ],
      col: [
        { p: 'einen arteriellen Zugang legen', n: '' },
        { p: 'den Blutdruck stabilisieren', n: '' },
        { p: 'Katecholamine reduzieren', n: '' },
      ],
      scen: [
        { p: 'Übergeben Sie kurz eine Patientin mit instabilem Kreislauf in der Nacht: Verlauf, Maßnahmen, aktueller Stand, offene Punkte.', mode: 'speak', keys: ['kreislaufinstabil', 'Volumengabe', 'liegt aktuell bei'], model: 'Frau Becker war in der Nacht kurzzeitig kreislaufinstabil. Wir haben einen arteriellen Zugang gelegt. Nach der Volumengabe hat sich der Kreislauf stabilisiert. Die Herzfrequenz liegt aktuell bei 95. Der Katecholaminbedarf ist rückläufig. Offen ist noch das Labor von heute Morgen. Ich würde gern Ihre Einschätzung hören.' },
      ],
    },
  ];

  LOS.lang.register({ code: 'de', medical });
})();

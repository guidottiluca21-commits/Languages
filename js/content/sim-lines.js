/* Scenario simulator — the conversation partner's lines when no AI provider is configured.
 * Generic follow-ups by situation type, in the target language: why → what if → clarification → challenge.
 * A scenario can override them with its own `open` / `follow` lines. */
(function () {
  'use strict';
  const LOS = window.LOS;
  LOS.SIM_LINES = {
    en: {
      clinical: { role: 'A senior doctor on the ward', open: ['Can you give me a quick presentation of the patient you admitted overnight?'], follow: ['Why did you choose that treatment?', 'What would you do if the patient\'s condition deteriorated?', 'Sorry to interrupt — are you sure about that? What else could it be?'], close: 'Thanks, that was clear. Let\'s go and see the patient together.' },
      patient: { role: 'A worried patient', open: ['Hello, doctor. Nobody has really explained what is going on. Can you tell me?'], follow: ['What does that mean for me, in simple words?', 'Are there any risks? I\'m a bit scared.', 'And what happens if I say no?'], close: 'Thank you. That makes me feel a bit better.' },
      workplace: { role: 'A colleague in a meeting', open: ['Thanks for joining. What\'s your view on this?'], follow: ['Why do you think that?', 'What if the budget is cut by twenty percent?', 'Hmm, I\'m not sure I agree. Can you convince me?'], close: 'Fair enough. Let\'s summarise the next steps by email.' },
      abroad: { role: 'Someone at the counter', open: ['Hi there, how can I help you?'], follow: ['Could you spell your surname for me, please?', 'Do you have any documents with you?', 'Sorry, I didn\'t quite catch that. Could you say it again?'], close: 'Perfect, you\'re all set. Have a nice day!' },
      social: { role: 'A new colleague after work', open: ['Hey! So, how are you finding it here so far?'], follow: ['Oh really? Tell me more!', 'What do you usually do at the weekend?', 'We\'re going for a drink on Friday — fancy joining us?'], close: 'Great, see you on Friday then!' },
    },
    es: {
      clinical: { role: 'Un médico adjunto en la planta', open: ['¿Me presentas rápidamente al paciente que ingresaste esta noche?'], follow: ['¿Por qué elegiste ese tratamiento?', '¿Qué harías si el paciente empeorara?', 'Perdona que te interrumpa, ¿estás seguro? ¿Qué otra cosa podría ser?'], close: 'Gracias, muy claro. Vamos a ver al paciente juntos.' },
      patient: { role: 'Una paciente preocupada', open: ['Hola, doctor. Nadie me ha explicado bien lo que pasa. ¿Me lo puede contar?'], follow: ['¿Y eso qué significa para mí, en palabras sencillas?', '¿Hay algún riesgo? Estoy un poco asustada.', '¿Y qué pasa si digo que no?'], close: 'Gracias. Ahora estoy un poco más tranquila.' },
      workplace: { role: 'Un compañero en una reunión', open: ['Gracias por venir. ¿Tú qué opinas de esto?'], follow: ['¿Por qué lo ves así?', '¿Y si recortan el presupuesto un veinte por ciento?', 'No sé si estoy de acuerdo. ¿Me convences?'], close: 'Vale. Resumimos los próximos pasos por correo.' },
      abroad: { role: 'Alguien en la ventanilla', open: ['Hola, buenos días. ¿En qué le puedo ayudar?'], follow: ['¿Me deletrea su apellido, por favor?', '¿Tiene algún documento?', 'Perdone, no le he entendido bien. ¿Me lo puede repetir?'], close: 'Perfecto, ya está todo. ¡Que tenga un buen día!' },
      social: { role: 'Una compañera nueva después del trabajo', open: ['¡Hola! ¿Qué tal te va por aquí?'], follow: ['¿En serio? ¡Cuéntame más!', '¿Qué sueles hacer los fines de semana?', 'El viernes vamos a tomar algo, ¿te apuntas?'], close: '¡Genial, nos vemos el viernes!' },
    },
    de: {
      clinical: { role: 'Ein Oberarzt auf Station', open: ['Können Sie mir kurz den Patienten vorstellen, den Sie heute Nacht aufgenommen haben?'], follow: ['Warum haben Sie sich für diese Therapie entschieden?', 'Was würden Sie machen, wenn sich der Zustand verschlechtert?', 'Entschuldigung, dass ich unterbreche: Sind Sie sich sicher? Was käme noch in Frage?'], close: 'Danke, das war klar. Gehen wir zusammen zum Patienten.' },
      patient: { role: 'Eine besorgte Patientin', open: ['Guten Tag, Frau Doktor. Mir hat noch niemand richtig erklärt, was los ist. Können Sie das bitte machen?'], follow: ['Was bedeutet das für mich, in einfachen Worten?', 'Gibt es Risiken? Ich habe ein bisschen Angst.', 'Und was passiert, wenn ich nein sage?'], close: 'Danke. Jetzt bin ich etwas beruhigter.' },
      workplace: { role: 'Ein Kollege in einer Besprechung', open: ['Danke, dass Sie dabei sind. Wie sehen Sie das?'], follow: ['Warum sehen Sie das so?', 'Und wenn das Budget um zwanzig Prozent gekürzt wird?', 'Ich bin mir nicht sicher, ob ich zustimme. Überzeugen Sie mich.'], close: 'In Ordnung. Fassen wir die nächsten Schritte per Mail zusammen.' },
      abroad: { role: 'Jemand am Schalter', open: ['Guten Tag, wie kann ich Ihnen helfen?'], follow: ['Können Sie mir bitte Ihren Nachnamen buchstabieren?', 'Haben Sie Unterlagen dabei?', 'Entschuldigung, das habe ich nicht ganz verstanden. Können Sie das wiederholen?'], close: 'Wunderbar, dann ist alles erledigt. Einen schönen Tag noch!' },
      social: { role: 'Eine neue Kollegin nach der Arbeit', open: ['Hey! Und, wie gefällt es dir bisher hier?'], follow: ['Echt? Erzähl mal!', 'Was machst du normalerweise am Wochenende?', 'Wir gehen am Freitag etwas trinken. Hast du Lust mitzukommen?'], close: 'Super, dann bis Freitag!' },
    },
    fr: {
      clinical: { role: 'Un chef de clinique dans le service', open: ['Tu peux me présenter rapidement le patient que tu as admis cette nuit ?'], follow: ['Pourquoi as-tu choisi ce traitement ?', 'Que ferais-tu si l\'état du patient se dégradait ?', 'Pardon de t\'interrompre : tu es sûr ? À quoi d\'autre pourrait-on penser ?'], close: 'Merci, c\'était clair. On va voir le patient ensemble.' },
      patient: { role: 'Une patiente inquiète', open: ['Bonjour docteur. Personne ne m\'a vraiment expliqué ce qui se passe. Vous pouvez me dire ?'], follow: ['Et ça veut dire quoi pour moi, en termes simples ?', 'Il y a des risques ? J\'ai un peu peur.', 'Et qu\'est-ce qui se passe si je refuse ?'], close: 'Merci. Je suis un peu plus rassurée.' },
      workplace: { role: 'Un collègue en réunion', open: ['Merci d\'être là. Quel est ton avis là-dessus ?'], follow: ['Pourquoi tu penses ça ?', 'Et si le budget baisse de vingt pour cent ?', 'Je ne suis pas sûr d\'être d\'accord. Convaincs-moi.'], close: 'D\'accord. On résume les prochaines étapes par mail.' },
      abroad: { role: 'Quelqu\'un au guichet', open: ['Bonjour, je peux vous aider ?'], follow: ['Vous pouvez m\'épeler votre nom, s\'il vous plaît ?', 'Vous avez des documents avec vous ?', 'Pardon, je n\'ai pas bien compris. Vous pouvez répéter ?'], close: 'Parfait, tout est en ordre. Bonne journée !' },
      social: { role: 'Une nouvelle collègue après le travail', open: ['Salut ! Alors, ça se passe bien ici pour l\'instant ?'], follow: ['Ah bon ? Raconte !', 'Qu\'est-ce que tu fais d\'habitude le week-end ?', 'On va boire un verre vendredi, ça te dit de venir ?'], close: 'Super, à vendredi alors !' },
    },
  };
})();

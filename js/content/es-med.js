/* Español — itinerario de lenguaje médico (Engine 2.0): módulos básicos que van ANTES de las tareas clínicas.
 * Práctica de lengua y comunicación — nunca indicaciones clínicas. */
(function () {
  'use strict';
  const LOS = window.LOS;

  const medical = [
    {
      id: 'es-med-basicos', cat: 'clinical', title: 'Lo básico: personas, lugares, el cuerpo', l: 'A2', icon: 'heart',
      intro: 'Las palabras necesarias antes de cualquier conversación clínica: quién trabaja dónde, las partes del cuerpo y cómo hablar del dolor.',
      words: [
        { w: 'la planta', tr: 'reparto (piano dell\'ospedale)', def: 'Zona del hospital donde están ingresados los pacientes.', ex: 'La paciente está en la tercera planta.', g: 'f', pl: 'las plantas' },
        { w: 'el enfermero', tr: 'infermiere', def: 'Profesional que cuida a los pacientes.', ex: 'El enfermero le va a tomar la tensión.', g: 'm', pl: 'los enfermeros' },
        { w: 'el médico adjunto', tr: 'medico strutturato', def: 'Médico especialista de plantilla en un hospital.', ex: 'El médico adjunto pasará visita a las diez.', g: 'm', pl: 'los médicos adjuntos' },
        { w: 'el médico de cabecera', tr: 'medico di base', def: 'Médico de atención primaria.', ex: 'Su médico de cabecera recibirá un informe.', g: 'm', pl: 'los médicos de cabecera' },
        { w: 'el pecho', tr: 'petto, torace', def: 'Parte delantera del cuerpo entre el cuello y el abdomen.', ex: 'Me duele el pecho cuando respiro.', g: 'm', pl: 'los pechos' },
        { w: 'la barriga', tr: 'pancia', def: 'Forma coloquial de decir abdomen.', ex: 'Me duele la barriga desde ayer.', g: 'f', pl: 'las barrigas' },
        { w: 'el dolor', tr: 'dolore', def: 'Sensación desagradable de daño.', ex: '¿Dónde tiene el dolor exactamente?', g: 'm', pl: 'los dolores' },
        { w: 'estar mareado', tr: 'avere le vertigini', def: 'Sentir que todo da vueltas.', ex: '¿Se nota mareado al levantarse?' },
        { w: 'tener náuseas', tr: 'avere la nausea', def: 'Tener ganas de vomitar.', ex: 'Tengo náuseas después de comer.' },
        { w: 'el análisis de sangre', tr: 'esame del sangue', def: 'Prueba hecha con una muestra de sangre.', ex: 'Primero le vamos a hacer un análisis de sangre.', g: 'm', pl: 'los análisis de sangre' },
        { w: 'la cita', tr: 'appuntamento', def: 'Hora acordada para ver al médico.', ex: 'Quería pedir cita con la doctora.', g: 'f', pl: 'las citas' },
        { w: 'la receta', tr: 'ricetta', def: 'Documento con el que se obtiene un medicamento.', ex: 'Lleve esta receta a la farmacia.', g: 'f', pl: 'las recetas' },
      ],
      expr: [
        { p: '¿Cómo se encuentra hoy?', n: 'Inicio natural y formal (usted).' },
        { p: '¿Dónde le duele?', n: 'Doler funciona como gustar: me/le duele.' },
        { p: '¿Me puede señalar dónde le duele?', n: '' },
        { p: 'Soy uno de los médicos del equipo.', n: '' },
        { p: 'Siéntese, por favor.', n: '' },
        { p: 'Avísenos si nota algún cambio.', n: '' },
      ],
      col: [
        { p: 'ingresar a un paciente', n: 'ricoverare' },
        { p: 'dar de alta', n: 'dimettere' },
        { p: 'pedir cita', n: 'No "tomar una cita".' },
        { p: 'tomar la tensión', n: 'misurare la pressione' },
      ],
      scen: [
        { p: 'Salude a un paciente en la planta, preséntese y hágale dos preguntas sencillas sobre cómo se encuentra.', mode: 'speak', keys: ['¿Cómo se encuentra hoy?', '¿Dónde le duele?', 'Soy uno de los médicos'], model: 'Buenos días, soy uno de los médicos del equipo. ¿Cómo se encuentra hoy? ¿Dónde le duele? ¿Me puede señalar dónde le duele? Gracias. El enfermero le va a tomar la tensión y más tarde le haremos un análisis de sangre. Avísenos si nota algún cambio.' },
      ],
    },
    {
      id: 'es-med-exploracion', cat: 'patient', title: 'La exploración física', l: 'B1', icon: 'user',
      intro: 'Instrucciones amables durante la exploración. Anuncie lo que va a hacer ("Le voy a…") y use el imperativo de usted.',
      words: [
        { w: 'explorar', tr: 'visitare (esame obiettivo)', def: 'Examinar el cuerpo del paciente.', ex: 'Ahora le voy a explorar la barriga.' },
        { w: 'tumbarse', tr: 'sdraiarsi', def: 'Ponerse en posición horizontal.', ex: 'Túmbese en la camilla, por favor.' },
        { w: 'respirar hondo', tr: 'respirare profondamente', def: 'Tomar mucho aire.', ex: 'Respire hondo y suelte el aire.' },
        { w: 'la hinchazón', tr: 'gonfiore', def: 'Aumento de volumen de una parte del cuerpo.', ex: 'Tiene un poco de hinchazón en el tobillo.', g: 'f', pl: 'las hinchazones' },
        { w: 'la erupción', tr: 'eruzione cutanea', def: 'Manchas o granos en la piel.', ex: '¿Cuándo le salió la erupción?', g: 'f', pl: 'las erupciones' },
        { w: 'el pulso', tr: 'polso', def: 'Latido del corazón que se nota en una arteria.', ex: 'Tiene el pulso un poco rápido.', g: 'm', pl: 'los pulsos' },
        { w: 'el fonendoscopio', tr: 'stetoscopio', def: 'Instrumento para auscultar.', ex: 'Puede que el fonendoscopio esté un poco frío.', g: 'm', pl: 'los fonendoscopios' },
        { w: 'auscultar', tr: 'auscultare', def: 'Escuchar el corazón o los pulmones.', ex: 'Le voy a auscultar el pecho.' },
      ],
      expr: [
        { p: 'Le voy a auscultar el pecho.', n: 'Anunciar antes de tocar.' },
        { p: '¿Se puede subir la manga?', n: '' },
        { p: 'Dígame si le duele.', n: '' },
        { p: 'Relaje el brazo.', n: '' },
        { p: 'Ya se puede vestir.', n: '' },
        { p: 'Todo parece normal.', n: '' },
      ],
      col: [
        { p: 'tomar el pulso', n: '' },
        { p: 'apretar la barriga', n: '' },
        { p: 'doler al tocar', n: 'dolente alla palpazione' },
      ],
      scen: [
        { p: 'Guíe a un paciente durante la exploración del tórax y del abdomen con instrucciones claras y amables.', mode: 'speak', keys: ['Le voy a', 'Respire hondo', 'Dígame si le duele'], model: 'Ahora le voy a explorar, si le parece bien. Primero le voy a auscultar el pecho. Puede que el fonendoscopio esté un poco frío. Respire hondo y suelte el aire. Gracias. Túmbese en la camilla, por favor. Le voy a apretar un poco la barriga. Dígame si le duele. Todo parece normal. Ya se puede vestir.' },
      ],
    },
    {
      id: 'es-med-medicacion', cat: 'clinical', title: 'La medicación', l: 'B1', icon: 'clipboard',
      intro: 'Preguntar por la medicación habitual, las alergias y los efectos secundarios, y explicar cómo tomar un medicamento.',
      words: [
        { w: 'la medicación habitual', tr: 'terapia domiciliare', def: 'Medicamentos que el paciente toma de forma regular.', ex: '¿Toma alguna medicación habitual?', g: 'f', pl: '—' },
        { w: 'la pastilla', tr: 'compressa, pastiglia', def: 'Forma sólida de un medicamento.', ex: 'Tómese una pastilla cada doce horas.', g: 'f', pl: 'las pastillas' },
        { w: 'la dosis', tr: 'dose', def: 'Cantidad de medicamento que se toma de una vez.', ex: 'Empezaremos con una dosis baja.', g: 'f', pl: 'las dosis' },
        { w: 'el efecto secundario', tr: 'effetto collaterale', def: 'Efecto no deseado de un medicamento.', ex: 'El efecto secundario más frecuente es el dolor de cabeza.', g: 'm', pl: 'los efectos secundarios' },
        { w: 'la alergia', tr: 'allergia', def: 'Reacción del cuerpo a una sustancia.', ex: '¿Tiene alergia a algún medicamento?', g: 'f', pl: 'las alergias' },
        { w: 'el calmante', tr: 'antidolorifico', def: 'Medicamento que quita el dolor.', ex: 'Si le duele, le podemos dar un calmante.', g: 'm', pl: 'los calmantes' },
        { w: 'el anticoagulante', tr: 'anticoagulante', def: 'Medicamento que hace la sangre más líquida.', ex: '¿Toma algún anticoagulante?', g: 'm', pl: 'los anticoagulantes' },
        { w: 'sin receta', tr: 'da banco', def: 'Que se compra sin receta médica.', ex: '¿Toma algo sin receta?' },
      ],
      expr: [
        { p: '¿Toma alguna medicación habitual?', n: '' },
        { p: '¿Ha tenido alguna vez una reacción a un medicamento?', n: '' },
        { p: 'Tómeselo con las comidas.', n: '' },
        { p: 'No lo deje sin consultarnos.', n: '' },
        { p: 'Al principio algunas personas tienen un poco de dolor de cabeza.', n: '' },
        { p: 'Avísenos si nota algo raro.', n: '' },
      ],
      col: [
        { p: 'tomar una pastilla', n: '' },
        { p: 'empezar un tratamiento', n: '' },
        { p: 'suspender un medicamento', n: 'sospendere' },
      ],
      scen: [
        { p: 'Pregunte por la medicación: medicación habitual, productos sin receta y alergias.', mode: 'speak', keys: ['medicación habitual', 'sin receta', 'alergia'], model: '¿Toma alguna medicación habitual? ¿Toma algo sin receta, por ejemplo calmantes o vitaminas? ¿Tiene alergia a algún medicamento? ¿Ha tenido alguna vez una reacción a un medicamento? Gracias. ¿Toma algún anticoagulante? No deje nada sin consultarnos.' },
        { p: 'Explique por escrito a un paciente cómo tomar una pastilla nueva y qué efectos secundarios puede notar.', mode: 'write', keys: ['Tómeselo con las comidas', 'efecto secundario', 'Avísenos'], model: 'Esta es su pastilla nueva. Tómese una pastilla cada doce horas. Tómeselo con las comidas. El efecto secundario más frecuente es un poco de dolor de cabeza, que suele desaparecer en unos días. No lo deje sin consultarnos. Avísenos si nota algo raro.' },
      ],
    },
    {
      id: 'es-med-pruebas', cat: 'clinical', title: 'Pruebas y resultados', l: 'B1', icon: 'microscope',
      intro: 'Explicar las pruebas antes de hacerlas y los resultados después: qué, por qué y cuándo, con palabras sencillas.',
      words: [
        { w: 'la prueba', tr: 'esame', def: 'Estudio que se hace para un diagnóstico.', ex: 'Le vamos a hacer unas pruebas.', g: 'f', pl: 'las pruebas' },
        { w: 'la radiografía', tr: 'radiografia', def: 'Imagen del interior del cuerpo con rayos X.', ex: 'La radiografía muestra una pequeña fractura.', g: 'f', pl: 'las radiografías' },
        { w: 'la ecografía', tr: 'ecografia', def: 'Imagen hecha con ultrasonidos.', ex: 'La ecografía no duele nada.', g: 'f', pl: 'las ecografías' },
        { w: 'el TAC', tr: 'TAC', def: 'Tomografía computarizada.', ex: 'Hay que hacerle un TAC de cabeza.', g: 'm', pl: 'los TAC' },
        { w: 'el electrocardiograma', tr: 'elettrocardiogramma', def: 'Registro de la actividad eléctrica del corazón.', ex: 'Le haremos un electrocardiograma.', g: 'm', pl: 'los electrocardiogramas' },
        { w: 'la muestra de orina', tr: 'campione di urina', def: 'Pequeña cantidad de orina para analizar.', ex: '¿Nos puede dar una muestra de orina?', g: 'f', pl: 'las muestras de orina' },
        { w: 'el resultado', tr: 'risultato', def: 'Lo que muestra una prueba.', ex: 'Los resultados estarán esta tarde.', g: 'm', pl: 'los resultados' },
        { w: 'la revisión', tr: 'controllo', def: 'Consulta posterior para ver la evolución.', ex: 'Le daremos una cita de revisión.', g: 'f', pl: 'las revisiones' },
      ],
      expr: [
        { p: 'Le vamos a hacer unas pruebas.', n: '' },
        { p: 'Los resultados estarán esta tarde.', n: '' },
        { p: 'La prueba no ha mostrado nada preocupante.', n: '' },
        { p: 'Uno de los resultados está un poco alterado.', n: '' },
        { p: 'Esta prueba nos ayudará a encontrar la causa.', n: '' },
        { p: 'Vuelvo en cuanto sepa algo más.', n: 'en cuanto + subjuntivo.' },
      ],
      col: [
        { p: 'pedir una prueba', n: 'richiedere un esame' },
        { p: 'descartar una infección', n: 'escludere' },
        { p: 'dar una cita de revisión', n: '' },
      ],
      scen: [
        { p: 'Explique a un paciente por qué pide un TAC y cuándo estará el resultado.', mode: 'speak', keys: ['Le vamos a hacer', 'TAC', 'Los resultados estarán'], model: 'Le vamos a hacer un TAC de la barriga. Esta prueba nos ayudará a encontrar la causa del dolor y a descartar una infección. No duele y dura unos veinte minutos. Los resultados estarán esta tarde. Vuelvo en cuanto sepa algo más.' },
      ],
    },
    {
      id: 'es-med-tratamiento', cat: 'clinical', title: 'Explicar el tratamiento', l: 'B1', icon: 'activity',
      intro: 'Proponer un plan, presentar opciones y comprobar que el paciente lo ha entendido.',
      words: [
        { w: 'el tratamiento', tr: 'terapia, trattamento', def: 'Conjunto de medidas para curar una enfermedad.', ex: 'El tratamiento suele durar dos semanas.', g: 'm', pl: 'los tratamientos' },
        { w: 'la opción', tr: 'opzione', def: 'Posibilidad que se puede elegir.', ex: 'Hay dos opciones.', g: 'f', pl: 'las opciones' },
        { w: 'el suero', tr: 'flebo (fisiologica)', def: 'Líquido que se administra por la vena.', ex: 'Le vamos a poner suero.', g: 'm', pl: 'los sueros' },
        { w: 'la fisioterapia', tr: 'fisioterapia', def: 'Tratamiento con ejercicio y movimiento.', ex: 'Mañana empezará con la fisioterapia.', g: 'f', pl: '—' },
        { w: 'recuperarse', tr: 'riprendersi', def: 'Volver a estar bien después de una enfermedad.', ex: 'La mayoría de las personas se recupera por completo.' },
        { w: 'el objetivo', tr: 'obiettivo', def: 'Lo que se quiere conseguir.', ex: 'El objetivo es controlar el dolor.', g: 'm', pl: 'los objetivos' },
        { w: 'mejorar', tr: 'migliorare', def: 'Ponerse mejor.', ex: 'La respiración debería mejorar en unos días.' },
      ],
      expr: [
        { p: 'Lo que le proponemos es un tratamiento con antibióticos.', n: '' },
        { p: 'El objetivo del tratamiento es reducir la inflamación.', n: '' },
        { p: 'Hay dos opciones y podemos decidirlo juntos.', n: '' },
        { p: '¿Le ha quedado claro?', n: 'Comprobar la comprensión.' },
        { p: '¿Quiere que le explique algo otra vez?', n: '' },
        { p: 'La mayoría de las personas se encuentra mejor en una semana.', n: '' },
      ],
      col: [
        { p: 'empezar el tratamiento', n: '' },
        { p: 'responder al tratamiento', n: '' },
        { p: 'recuperarse por completo', n: '' },
      ],
      scen: [
        { p: 'Explique un plan de tratamiento sencillo, diga el objetivo y compruebe que el paciente lo ha entendido.', mode: 'speak', keys: ['Lo que le proponemos', 'El objetivo', '¿Le ha quedado claro?'], model: 'Lo que le proponemos es un tratamiento con antibióticos por la vena durante dos días y después pastillas en casa. El objetivo del tratamiento es curar la infección. La mayoría de las personas se encuentra mejor en una semana. ¿Le ha quedado claro? ¿Quiere que le explique algo otra vez?' },
      ],
    },
    {
      id: 'es-med-anestesia-base', cat: 'anesthesia', title: 'Anestesia: vocabulario básico', l: 'B1', icon: 'wind',
      intro: 'Las palabras básicas de anestesia y críticos, antes de cualquier escenario de preanestesia o vía aérea. Solo lengua, no indicaciones clínicas.',
      words: [
        { w: 'la anestesia general', tr: 'anestesia generale', def: 'El paciente está completamente dormido durante la operación.', ex: 'Le pondremos anestesia general.', g: 'f', pl: '—' },
        { w: 'estar en ayunas', tr: 'essere a digiuno', def: 'No haber comido ni bebido nada.', ex: 'Tiene que estar en ayunas desde medianoche.' },
        { w: 'la vía', tr: 'accesso venoso', def: 'Catéter colocado en una vena.', ex: 'Le voy a coger una vía en la mano.', g: 'f', pl: 'las vías' },
        { w: 'la mascarilla de oxígeno', tr: 'maschera dell\'ossigeno', def: 'Mascarilla que administra oxígeno.', ex: 'Esta mascarilla de oxígeno le ayudará a respirar.', g: 'f', pl: 'las mascarillas de oxígeno' },
        { w: 'el tubo', tr: 'tubo endotracheale (per il paziente)', def: 'Palabra sencilla para el tubo endotraqueal.', ex: 'Mientras duerme, un tubo le ayudará a respirar.', g: 'm', pl: 'los tubos' },
        { w: 'la sala de despertar', tr: 'sala risveglio', def: 'Donde el paciente se despierta después de la operación.', ex: 'Se despertará en la sala de despertar.', g: 'f', pl: 'las salas de despertar' },
        { w: 'el dolor de garganta', tr: 'mal di gola', def: 'Molestia en la garganta.', ex: 'Algunas personas tienen dolor de garganta después.', g: 'm', pl: '—' },
        { w: 'la tensión arterial', tr: 'pressione arteriosa', def: 'Presión de la sangre en las arterias.', ex: 'Vigilaremos la tensión arterial todo el tiempo.', g: 'f', pl: '—' },
        { w: 'la saturación', tr: 'saturazione', def: 'Nivel de oxígeno en la sangre.', ex: 'La saturación está bien.', g: 'f', pl: '—' },
        { w: 'la sedación', tr: 'sedazione', def: 'Medicación para estar tranquilo y adormilado.', ex: 'Le podemos poner un poco de sedación.', g: 'f', pl: '—' },
      ],
      expr: [
        { p: 'Va a estar dormido durante toda la operación.', n: '' },
        { p: '¿Le han puesto anestesia alguna vez?', n: '' },
        { p: '¿Tuvo algún problema?', n: '' },
        { p: 'Va a notar un pinchazo.', n: 'Frase habitual antes de una aguja.' },
        { p: 'Respire tranquilo por la mascarilla.', n: '' },
        { p: 'Está en la sala de despertar; la operación ha terminado.', n: '' },
      ],
      col: [
        { p: 'coger una vía', n: 'incannulare una vena (coloquial)' },
        { p: 'vigilar la tensión', n: '' },
        { p: 'despertarse de la anestesia', n: '' },
      ],
      scen: [
        { p: 'Explique a un paciente nervioso, con palabras sencillas, qué pasa desde el quirófano hasta la sala de despertar.', mode: 'speak', keys: ['Va a estar dormido', 'vía', 'sala de despertar'], model: 'Primero le voy a coger una vía en la mano. Va a notar un pinchazo. Después respirará oxígeno por una mascarilla. Respire tranquilo por la mascarilla. Va a estar dormido durante toda la operación y vigilaremos la tensión arterial y la saturación todo el tiempo. Se despertará en la sala de despertar. Algunas personas tienen dolor de garganta después.' },
      ],
    },
    {
      id: 'es-med-congreso', cat: 'research', title: 'Presentar en un congreso', l: 'C1', icon: 'flag',
      intro: 'Estructurar una comunicación oral, presentar resultados con prudencia y responder a las preguntas del público.',
      words: [
        { w: 'la comunicación oral', tr: 'comunicazione orale (congresso)', def: 'Presentación breve de un trabajo en un congreso.', ex: 'Nuestra comunicación oral es el jueves.', g: 'f', pl: 'las comunicaciones orales' },
        { w: 'el póster', tr: 'poster', def: 'Presentación de un trabajo en formato cartel.', ex: 'El póster está en la sala B.', g: 'm', pl: 'los pósteres' },
        { w: 'la diapositiva', tr: 'diapositiva', def: 'Cada una de las pantallas de una presentación.', ex: 'En la siguiente diapositiva verán los resultados.', g: 'f', pl: 'las diapositivas' },
        { w: 'la muestra', tr: 'campione (statistico)', def: 'Grupo de pacientes estudiado.', ex: 'La muestra incluye a ciento veinte pacientes.', g: 'f', pl: 'las muestras' },
        { w: 'la limitación', tr: 'limite (dello studio)', def: 'Punto débil de un estudio.', ex: 'La principal limitación es el tamaño de la muestra.', g: 'f', pl: 'las limitaciones' },
        { w: 'el moderador', tr: 'moderatore', def: 'Persona que dirige una sesión.', ex: 'Gracias al moderador por la presentación.', g: 'm', pl: 'los moderadores' },
      ],
      expr: [
        { p: 'Muchas gracias por la invitación.', n: '' },
        { p: 'Voy a presentar los resultados de un estudio retrospectivo.', n: '' },
        { p: 'Como pueden ver en esta diapositiva, la estancia media se redujo.', n: '' },
        { p: 'Estos datos sugieren una posible asociación.', n: 'Prudencia: sugerir, no demostrar.' },
        { p: 'Es una muy buena pregunta.', n: '' },
        { p: 'No disponemos de esos datos, pero es una línea interesante.', n: '' },
      ],
      col: [
        { p: 'presentar una comunicación', n: '' },
        { p: 'un estudio retrospectivo', n: '' },
        { p: 'el tamaño de la muestra', n: '' },
      ],
      scen: [
        { p: 'Presente en dos minutos los resultados principales de un estudio y mencione una limitación.', mode: 'speak', keys: ['Voy a presentar', 'Como pueden ver', 'La principal limitación'], model: 'Muchas gracias por la invitación. Voy a presentar los resultados de un estudio retrospectivo sobre la recuperación tras la cirugía. La muestra incluye a ciento veinte pacientes. Como pueden ver en esta diapositiva, la estancia media se redujo en un día. Estos datos sugieren una posible asociación. La principal limitación es el tamaño de la muestra.' },
      ],
    },
  ];

  LOS.lang.register({ code: 'es', medical });
})();

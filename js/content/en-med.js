/* English — medical language pathway (Engine 2.0): core modules that come BEFORE the clinical tasks.
 * Each module: words (taught first, as chunks) → expressions → collocations → scenarios (controlled → guided → free).
 * Language and communication practice only — never clinical guidance. */
(function () {
  'use strict';
  const LOS = window.LOS;

  const medical = [
    {
      id: 'en-med-basics', cat: 'clinical', title: 'Medical basics: people, places, the body', l: 'A2', icon: 'heart',
      intro: 'The words you need before any clinical conversation: who works where, the main parts of the body, and how to talk about pain and feeling unwell.',
      words: [
        { w: 'ward', tr: 'reparto', def: 'A room or area of a hospital where patients stay.', ex: 'She was moved to the surgical ward this morning.' },
        { w: 'nurse', tr: 'infermiere / infermiera', def: 'A person trained to care for patients.', ex: 'The nurse will check your blood pressure.' },
        { w: 'consultant', tr: 'primario / dirigente medico (UK)', def: 'A senior hospital doctor (UK).', ex: 'The consultant will see you on the ward round.' },
        { w: 'GP', tr: 'medico di base', def: 'General practitioner: a family doctor (UK).', ex: 'Your GP will receive a letter from us.' },
        { w: 'chest', tr: 'torace, petto', def: 'The front of the body between the neck and the stomach.', ex: 'I have a tight feeling in my chest.' },
        { w: 'stomach', tr: 'stomaco, pancia', def: 'The organ where food is digested; also used for the belly.', ex: 'My stomach has been hurting since yesterday.' },
        { w: 'pain', tr: 'dolore', def: 'A feeling that something hurts.', ex: 'Where is the pain exactly?' },
        { w: 'feel sick', tr: 'avere la nausea', def: 'To feel that you might vomit (UK).', ex: 'I feel sick after every meal.' },
        { w: 'feel dizzy', tr: 'avere le vertigini', def: 'To feel that everything is spinning.', ex: 'Do you feel dizzy when you stand up?' },
        { w: 'blood test', tr: 'esame del sangue', def: 'A test done on a sample of blood.', ex: 'We need to do a blood test first.' },
        { w: 'appointment', tr: 'appuntamento (visita)', def: 'An arranged time to see a doctor.', ex: 'I would like to make an appointment.' },
        { w: 'prescription', tr: 'ricetta', def: 'A written order for a medicine.', ex: 'Take this prescription to the pharmacy.' },
      ],
      expr: [
        { p: 'How are you feeling today?', n: 'Natural opener on the ward.' },
        { p: 'Where does it hurt?', n: '' },
        { p: 'Can you show me where the pain is?', n: '' },
        { p: 'I am one of the doctors on the team.', n: 'Simple, clear introduction.' },
        { p: 'Please take a seat.', n: '' },
        { p: 'Let me know if anything changes.', n: '' },
      ],
      col: [
        { p: 'admit a patient', n: 'ricoverare' },
        { p: 'discharge a patient', n: 'dimettere' },
        { p: 'on the ward', n: 'Preposition: on (not "in") the ward.' },
        { p: 'make an appointment', n: 'Not "take an appointment".' },
      ],
      scen: [
        { p: 'Greet a patient on the ward, introduce yourself and ask two simple questions about how they feel.', mode: 'speak', keys: ['How are you feeling today?', 'Where does it hurt?', 'on the ward'], model: 'Good morning, I am one of the doctors on the team. How are you feeling today? Where does it hurt? Can you show me where the pain is? Thank you. The nurse will check your blood pressure, and we will do a blood test later. Let me know if anything changes.' },
      ],
    },
    {
      id: 'en-med-exam', cat: 'patient', title: 'Physical examination', l: 'B1', icon: 'user',
      intro: 'Polite instructions during an examination. Use "I am going to…" before you touch, and soft imperatives with "just" and "for me".',
      words: [
        { w: 'examine', tr: 'visitare, esaminare', def: 'To look at and check a patient\'s body.', ex: 'I am going to examine your tummy now.' },
        { w: 'lie down', tr: 'sdraiarsi', def: 'To put your body flat on a bed.', ex: 'Could you lie down on the couch for me?' },
        { w: 'take a deep breath', tr: 'fare un respiro profondo', def: 'To breathe in a lot of air.', ex: 'Take a deep breath in, and out.' },
        { w: 'tender', tr: 'dolente alla palpazione', def: 'Painful when touched.', ex: 'Is it tender when I press here?' },
        { w: 'swelling', tr: 'gonfiore', def: 'A part of the body that has become bigger.', ex: 'There is some swelling around the ankle.' },
        { w: 'rash', tr: 'eruzione cutanea', def: 'An area of red spots on the skin.', ex: 'When did you first notice the rash?' },
        { w: 'pulse', tr: 'polso (frequenza)', def: 'The beat of the heart felt in an artery.', ex: 'Your pulse is a little fast.' },
        { w: 'stethoscope', tr: 'stetoscopio', def: 'Instrument used to listen to the heart and lungs.', ex: 'This might feel a bit cold — it is the stethoscope.' },
      ],
      expr: [
        { p: 'I am going to listen to your chest.', n: 'Announce before you act.' },
        { p: 'Could you roll up your sleeve for me?', n: '' },
        { p: 'Tell me if this hurts.', n: '' },
        { p: 'Just relax your arm.', n: '"just" softens the instruction.' },
        { p: 'You can get dressed now.', n: '' },
        { p: 'Everything sounds normal.', n: '' },
      ],
      col: [
        { p: 'take your blood pressure', n: 'misurare la pressione' },
        { p: 'feel your pulse', n: '' },
        { p: 'press on your tummy', n: '"tummy" is friendlier than "abdomen" with patients.' },
      ],
      scen: [
        { p: 'Guide a patient through a chest and abdominal examination with polite, clear instructions.', mode: 'speak', keys: ['I am going to', 'take a deep breath', 'Tell me if this hurts'], model: 'I am going to examine you now, if that is all right. First I am going to listen to your chest. This might feel a bit cold. Take a deep breath in, and out. Thank you. Could you lie down on the couch for me? I am going to press on your tummy. Tell me if this hurts. Is it tender here? Everything sounds normal. You can get dressed now.' },
      ],
    },
    {
      id: 'en-med-medications', cat: 'clinical', title: 'Medications', l: 'B1', icon: 'clipboard',
      intro: 'Asking about current medicines, allergies and side effects, and explaining how to take a medicine in plain English.',
      words: [
        { w: 'medication', tr: 'farmaco, terapia', def: 'Medicine taken regularly.', ex: 'Do you take any regular medication?' },
        { w: 'tablet', tr: 'compressa', def: 'A small solid piece of medicine.', ex: 'Take one tablet twice a day.' },
        { w: 'dose', tr: 'dose', def: 'The amount of a medicine taken at one time.', ex: 'We will start with a low dose.' },
        { w: 'side effect', tr: 'effetto collaterale', def: 'An unwanted effect of a medicine.', ex: 'The most common side effect is a headache.' },
        { w: 'allergy', tr: 'allergia', def: 'A bad reaction of the body to a substance.', ex: 'Do you have any allergies to medicines?' },
        { w: 'painkiller', tr: 'antidolorifico', def: 'A medicine that reduces pain.', ex: 'You can have a painkiller if you need one.' },
        { w: 'blood thinner', tr: 'anticoagulante (colloquiale)', def: 'Everyday word for an anticoagulant.', ex: 'Are you on any blood thinners?' },
        { w: 'over the counter', tr: 'da banco', def: 'Sold without a prescription.', ex: 'Do you take anything over the counter?' },
      ],
      expr: [
        { p: 'Are you on any regular medication?', n: '"be on" a medicine = take it regularly.' },
        { p: 'Have you ever had a reaction to a medicine?', n: '' },
        { p: 'You should take it with food.', n: '' },
        { p: 'Please do not stop it without talking to us.', n: '' },
        { p: 'Some people get a mild headache at first.', n: 'Plain language for side effects.' },
        { p: 'Let us know if you notice anything unusual.', n: '' },
      ],
      col: [
        { p: 'take a tablet', n: 'Not "drink a tablet".' },
        { p: 'start a medication', n: '' },
        { p: 'stop a medication', n: '' },
        { p: 'a course of antibiotics', n: 'un ciclo di antibiotici' },
      ],
      scen: [
        { p: 'Take a medication history: regular medicines, over-the-counter products and allergies.', mode: 'speak', keys: ['regular medication', 'over the counter', 'allergies'], model: 'Are you on any regular medication at the moment? Do you take anything over the counter, like painkillers or vitamins? Do you have any allergies to medicines? Have you ever had a reaction to a medicine? Thank you. Are you on any blood thinners? Please do not stop anything without talking to us.' },
        { p: 'Explain to a patient how to take a new tablet and what side effects to look out for.', mode: 'write', keys: ['take it with food', 'side effect', 'Let us know'], model: 'This is your new tablet. Please take one tablet twice a day, and take it with food. The most common side effect is a mild headache, which usually goes away after a few days. Please do not stop it without talking to us. Let us know if you notice anything unusual.' },
      ],
    },
    {
      id: 'en-med-investigations', cat: 'clinical', title: 'Investigations and results', l: 'B1', icon: 'microscope',
      intro: 'Explaining tests before they happen and results afterwards. Patients need what, why and when — in plain words.',
      words: [
        { w: 'scan', tr: 'esame di imaging (TAC, RM…)', def: 'An image of the inside of the body.', ex: 'We would like to do a scan of your head.' },
        { w: 'X-ray', tr: 'radiografia', def: 'A picture of bones and organs made with radiation.', ex: 'The X-ray shows a small fracture.' },
        { w: 'ultrasound', tr: 'ecografia', def: 'An image made with sound waves.', ex: 'The ultrasound does not hurt at all.' },
        { w: 'ECG', tr: 'elettrocardiogramma', def: 'A recording of the electrical activity of the heart.', ex: 'We will do an ECG to check your heart.' },
        { w: 'urine sample', tr: 'campione di urina', def: 'A small amount of urine for testing.', ex: 'Could you give us a urine sample?' },
        { w: 'result', tr: 'risultato, referto', def: 'What a test shows.', ex: 'The results should be back this afternoon.' },
        { w: 'normal range', tr: 'valori di riferimento', def: 'The values found in most healthy people.', ex: 'Your sodium is just outside the normal range.' },
        { w: 'follow-up', tr: 'controllo successivo', def: 'A later check after treatment or a test.', ex: 'We will arrange a follow-up in six weeks.' },
      ],
      expr: [
        { p: 'We would like to do some tests.', n: '' },
        { p: 'The results should be back this afternoon.', n: '' },
        { p: 'The scan did not show anything worrying.', n: 'Reassuring, honest wording.' },
        { p: 'One of the results is slightly abnormal.', n: '' },
        { p: 'This test will help us find the cause.', n: '' },
        { p: 'I will come back as soon as I know more.', n: '' },
      ],
      col: [
        { p: 'order a test', n: 'richiedere un esame' },
        { p: 'the results are back', n: '' },
        { p: 'rule out an infection', n: 'escludere' },
        { p: 'arrange a follow-up', n: '' },
      ],
      scen: [
        { p: 'Explain to a patient why you are ordering a scan and when the result will be ready.', mode: 'speak', keys: ['We would like to', 'scan', 'The results should be back'], model: 'We would like to do a scan of your tummy. This test will help us find the cause of the pain and rule out an infection. It does not hurt and takes about twenty minutes. The results should be back this afternoon. I will come back as soon as I know more.' },
      ],
    },
    {
      id: 'en-med-treatment', cat: 'clinical', title: 'Explaining treatment', l: 'B1', icon: 'activity',
      intro: 'Proposing a plan, giving options and checking understanding. Prefer "we suggest" and "the aim is" to bare imperatives.',
      words: [
        { w: 'treatment', tr: 'terapia, trattamento', def: 'Care given to cure or improve an illness.', ex: 'The treatment usually takes two weeks.' },
        { w: 'option', tr: 'opzione', def: 'A possible choice.', ex: 'There are two options.' },
        { w: 'drip', tr: 'flebo', def: 'Fluid or medicine given into a vein (UK, informal).', ex: 'We will give you fluids through a drip.' },
        { w: 'physiotherapy', tr: 'fisioterapia', def: 'Treatment with exercise and movement.', ex: 'You will start physiotherapy tomorrow.' },
        { w: 'recover', tr: 'guarire, riprendersi', def: 'To get better after an illness.', ex: 'Most people recover completely.' },
        { w: 'aim', tr: 'obiettivo', def: 'What you want to achieve.', ex: 'The aim is to control the pain.' },
        { w: 'improve', tr: 'migliorare', def: 'To get better.', ex: 'Your breathing should improve in a few days.' },
      ],
      expr: [
        { p: 'What we suggest is a short course of antibiotics.', n: '' },
        { p: 'The aim of the treatment is to reduce the swelling.', n: '' },
        { p: 'There are two options, and we can decide together.', n: 'Shared decision making.' },
        { p: 'Does that make sense?', n: 'Check understanding.' },
        { p: 'Is there anything you would like me to explain again?', n: '' },
        { p: 'Most people feel better within a week.', n: '' },
      ],
      col: [
        { p: 'start treatment', n: '' },
        { p: 'respond to treatment', n: 'rispondere alla terapia' },
        { p: 'make a full recovery', n: '' },
      ],
      scen: [
        { p: 'Explain a simple treatment plan to a patient, give the aim and check understanding.', mode: 'speak', keys: ['What we suggest', 'The aim', 'Does that make sense?'], model: 'What we suggest is a short course of antibiotics through a drip for two days, and then tablets at home. The aim of the treatment is to clear the infection. Most people feel better within a week. Does that make sense? Is there anything you would like me to explain again?' },
      ],
    },
    {
      id: 'en-med-presenting', cat: 'clinical', title: 'Presenting a patient', l: 'B2', icon: 'message',
      intro: 'A short, structured case presentation for the ward round or a senior: who, why, key findings, your impression and your plan.',
      words: [
        { w: 'presenting complaint', tr: 'motivo del ricovero / sintomo principale', def: 'The main problem the patient came with.', ex: 'His presenting complaint is shortness of breath.' },
        { w: 'background', tr: 'anamnesi patologica remota', def: 'Relevant past medical history.', ex: 'Her background includes type 2 diabetes.' },
        { w: 'on examination', tr: 'all\'esame obiettivo', def: 'Phrase that introduces findings.', ex: 'On examination, he was alert and afebrile.' },
        { w: 'impression', tr: 'impressione diagnostica', def: 'Your working diagnosis.', ex: 'My impression is a community-acquired pneumonia.' },
        { w: 'differential', tr: 'diagnosi differenziale', def: 'Other possible diagnoses.', ex: 'The main differential is a pulmonary embolism.' },
        { w: 'plan', tr: 'piano', def: 'What you intend to do next.', ex: 'The plan is to repeat the bloods tomorrow.' },
      ],
      expr: [
        { p: 'This is a 67-year-old man who presented with chest pain.', n: 'Standard opening.' },
        { p: 'On examination, he was alert and comfortable.', n: '' },
        { p: 'Bloods showed a raised white cell count.', n: '' },
        { p: 'My impression is a chest infection.', n: '' },
        { p: 'The plan is to start antibiotics and review tomorrow.', n: '' },
        { p: 'I would value your opinion on the imaging.', n: 'Polite request to a senior.' },
      ],
      col: [
        { p: 'present a patient', n: '' },
        { p: 'a raised white cell count', n: '' },
        { p: 'review the patient', n: 'rivalutare' },
      ],
      scen: [
        { p: 'Present a new admission to your consultant in under one minute: complaint, background, findings, impression, plan.', mode: 'speak', keys: ['presented with', 'On examination', 'My impression is', 'The plan is'], model: 'This is a 67-year-old man who presented with two days of cough and fever. His background includes type 2 diabetes. On examination, he was alert, with crackles at the right base. Bloods showed a raised white cell count. My impression is a community-acquired pneumonia. The plan is to start antibiotics and review tomorrow. I would value your opinion on the imaging.' },
      ],
    },
    {
      id: 'en-med-anesthesia-core', cat: 'anesthesia', title: 'Anaesthesia: core vocabulary', l: 'B1', icon: 'wind',
      intro: 'The core words of anaesthesia and critical care, taught before any pre-op or airway scenario. Language only — not clinical advice.',
      words: [
        { w: 'general anaesthetic', tr: 'anestesia generale', def: 'Medicines that make the patient fully asleep for surgery.', ex: 'You will have a general anaesthetic.' },
        { w: 'nil by mouth', tr: 'digiuno', def: 'Nothing to eat or drink before a procedure.', ex: 'You need to be nil by mouth from midnight.' },
        { w: 'cannula', tr: 'agocannula', def: 'A thin tube placed in a vein.', ex: 'I am going to put a cannula in the back of your hand.' },
        { w: 'oxygen mask', tr: 'maschera dell\'ossigeno', def: 'A mask that gives oxygen.', ex: 'This oxygen mask will help you breathe.' },
        { w: 'breathing tube', tr: 'tubo endotracheale (per il paziente)', def: 'Patient-friendly words for the endotracheal tube.', ex: 'While you are asleep, a breathing tube will help you breathe.' },
        { w: 'recovery room', tr: 'sala risveglio', def: 'Where patients wake up after surgery.', ex: 'You will wake up in the recovery room.' },
        { w: 'sore throat', tr: 'mal di gola', def: 'Pain in the throat.', ex: 'Some people have a sore throat afterwards.' },
        { w: 'blood pressure', tr: 'pressione arteriosa', def: 'The pressure of blood in the arteries.', ex: 'We will monitor your blood pressure all the time.' },
        { w: 'oxygen levels', tr: 'saturazione (per il paziente)', def: 'Patient-friendly words for oxygen saturation.', ex: 'Your oxygen levels are good.' },
        { w: 'sedation', tr: 'sedazione', def: 'Medicine that makes you calm and sleepy.', ex: 'We can give you some sedation to help you relax.' },
      ],
      expr: [
        { p: 'You will be asleep for the whole operation.', n: 'Reassuring, simple.' },
        { p: 'Have you had an anaesthetic before?', n: '' },
        { p: 'Did you have any problems with it?', n: '' },
        { p: 'You might feel a sharp scratch.', n: 'Standard phrase for a needle.' },
        { p: 'Breathe normally through the mask.', n: '' },
        { p: 'You are in the recovery room — the operation is over.', n: '' },
      ],
      col: [
        { p: 'put a cannula in', n: '' },
        { p: 'monitor your blood pressure', n: '' },
        { p: 'wake up from the anaesthetic', n: '' },
      ],
      scen: [
        { p: 'Explain to an anxious patient, in simple words, what happens from the anaesthetic room to the recovery room.', mode: 'speak', keys: ['You will be asleep', 'cannula', 'recovery room'], model: 'First, I am going to put a cannula in the back of your hand. You might feel a sharp scratch. Then you will breathe some oxygen through a mask. Breathe normally through the mask. You will be asleep for the whole operation, and we will monitor your blood pressure and oxygen levels all the time. You will wake up in the recovery room. Some people have a sore throat afterwards.' },
      ],
    },
  ];

  LOS.lang.register({ code: 'en', medical });
})();

# Lingua OS — Personal Language Learning OS

Web app locale (HTML/CSS/JS vanilla, nessuna dipendenza) per portare inglese e spagnolo fino al C2.

## Avvio
Apri `index.html` nel browser (doppio clic). Non serve un server: funziona da `file://`.
Per microfono/riconoscimento vocale alcuni browser richiedono `http://localhost`:
`npx http-server .` e apri l'indirizzo indicato. Chrome/Edge offrono il supporto vocale più completo.

## Struttura
```
index.html            shell + ordine di caricamento
css/style.css         design system (token, light/dark, responsive)
js/core.js            utility, date, scala CEFR, icone
js/content/           pacchetti lingua (en, en-pro, es, es-pro) + registro condiviso
js/store.js           DATA LAYER: stato versionato in localStorage, export/import
js/engine/            LEARNING ENGINE
  srs.js              spaced repetition (Again/Hard/Good/Easy, ease, intervallo, mastery)
  skills.js           stima per abilità (θ 0–6), calculateLevel()
  learning.js         grammatica, vocabolario a stadi, error log, sessioni, selezione contenuti
  writing.js          analisi locale di scrittura/trascrizioni
  assessment.js       placement test adattivo
  planner.js          carico di lavoro → budget → piano giornaliero/settimanale
  progress.js         statistiche, roadmap, ritmo, weekly review
  speech.js           sintesi vocale, riconoscimento, registrazione
js/ai.js              astrazione AI (locale ora, backend remoto opzionale)
js/ui/                componenti, runner delle attività, viste
```

## Aggiungere una lingua
Crea `js/content/fr.js` con `LOS.lang.register({ code: 'fr', name: 'French', ... })` sullo stesso
schema di `es.js` e aggiungilo a `index.html`. Nessuna logica è legata a EN/ES.

## AI
Impostazioni → AI integration → "Remote backend": ogni funzione (`evaluateWriting`, `generateExercise`, …)
viene inviata come `POST { task, lang, payload }` al tuo proxy; in caso di errore si usa l'implementazione locale.
Le API key vanno solo sul backend.

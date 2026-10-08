# Lingua OS — Personal Language Learning OS

Web app per portare **🇬🇧 inglese, 🇪🇸 spagnolo, 🇩🇪 tedesco e 🇫🇷 francese fino al C2** — ognuna con il proprio
profilo CEFR, curriculum e dati — con account personale, database nel cloud e sincronizzazione tra
computer, iPhone e iPad. Progettata per costare **0 €**.

- **Frontend**: HTML + CSS + JavaScript (nessun framework), pubblicato su **Vercel**
- **Login e registrazione**: **Supabase Auth** (l'app non vede né salva mai le password)
- **Database**: **Supabase PostgreSQL**, con Row Level Security: ogni utente vede solo i propri dati
- **Codice**: **GitHub**

---

## Indice
1. [Come funziona (architettura)](#1-come-funziona-architettura)
2. [Costi: cosa è gratuito e quali sono i limiti](#2-costi-cosa-è-gratuito-e-quali-sono-i-limiti)
3. [Guida passo-passo alla messa online](#3-guida-passo-passo-alla-messa-online)
4. [Variabili d'ambiente](#4-variabili-dambiente)
5. [Sicurezza e privacy](#5-sicurezza-e-privacy)
6. [Sincronizzazione e uso offline](#6-sincronizzazione-e-uso-offline)
7. [Installare l'app sul telefono (PWA)](#7-installare-lapp-sul-telefono-pwa)
8. [Sviluppo in locale e test](#8-sviluppo-in-locale-e-test)
9. [Risoluzione dei problemi](#9-risoluzione-dei-problemi)
10. [Integrazione futura con un'AI](#10-integrazione-futura-con-unai)
11. [Checklist](#11-checklist)
12. [Le quattro lingue e come aggiungerne una quinta](#12-le-quattro-lingue-e-come-aggiungerne-una-quinta)
13. [Motore pedagogico 2.0](#13-motore-pedagogico-20)

---

## 1. Come funziona (architettura)

```
 Utente (computer / iPhone / iPad)
   │
   ▼
 Vercel ── serve i file dell'app (HTML, CSS, JS)  ← costruiti da GitHub a ogni modifica
   │
   ▼
 Frontend (nel browser)
   ├─ UI ........................ schermate e interazioni            js/ui/
   ├─ Learning engine ........... CEFR, ripasso, esercizi, piano      js/engine/
   ├─ State ..................... stato in memoria dell'utente        js/state/
   ├─ Sync ...................... cache locale + coda offline         js/sync/
   ├─ Database .................. letture/scritture (CRUD)            js/data/
   └─ Auth ...................... login, registrazione, password      js/auth/
   │
   ▼ HTTPS (chiave pubblica "anon" + token della sessione)
 Supabase Auth ── verifica chi sei e rilascia una sessione
   │
   ▼
 Supabase PostgreSQL ── i tuoi dati; le policy RLS lasciano passare solo le righe
                        il cui user_id corrisponde all'utente della sessione
```

**Flusso dei dati.** Quando fai qualcosa (aggiungi una parola, completi un esercizio, cambi il calendario…)
l'app aggiorna lo stato, lo salva subito in una **cache locale** e, dopo circa un secondo, invia al
database **solo le righe cambiate**. Quando apri l'app su un altro dispositivo, prima invia eventuali
modifiche rimaste in sospeso, poi scarica tutti i tuoi dati dal database. Il database è quindi la
**fonte principale**; il browser tiene solo una copia di comodo.

**Struttura dei file**

| Percorso | Contenuto |
|---|---|
| `index.html`, `css/style.css` | Interfaccia (design system chiaro/scuro, responsive) |
| `js/auth/` | `auth.js` (Supabase Auth), `errors.js` (messaggi d'errore comprensibili) |
| `js/data/` | `db.js` (CRUD), `mapper.js` (stato dell'app ⇄ tabelle del database) |
| `js/sync/sync.js` | Sincronizzazione, cache locale, coda offline, stato "Online/Offline" |
| `js/state/store.js` | Stato in memoria dell'utente collegato |
| `js/engine/` | Motore didattico: valutazione CEFR, ripasso a intervalli, pianificatore… |
| `js/content/languages.js` | **Registro centrale delle lingue** (`LANGUAGES = { en, es, de, fr }`): nome, bandiera, locale, caratteristiche, categorie di errore, pronuncia |
| `js/content/<codice>*.js` | Pacchetti di contenuti per lingua: `de.js` (grammatica), `de-lex.js` (lessico, testi, test, esercizi, pronuncia, controlli di scrittura), `de-pro.js` (medico/professionale); idem `fr`, `en`, `es` |
| `js/content/compare.js` | Strutture a confronto tra italiano, inglese, spagnolo, tedesco e francese |
| `js/ai.js` | Punto unico per collegare in futuro un'AI tramite un backend |
| `supabase-schema.sql` | Tabelle, indici, RLS, policy, trigger, funzioni |
| `scripts/build.js` | Prepara la cartella `dist/` per Vercel e scrive la configurazione pubblica |
| `vercel.json` | Comando di build e intestazioni di sicurezza |
| `sw.js`, `manifest.webmanifest`, `assets/` | App installabile e utilizzabile offline (PWA) |
| `tests/` | Test automatici (vedi sezione 8) |

**Tabelle del database** (tutte con `user_id` e protette da RLS): `profiles`, `user_settings`,
`language_profiles`, `vocabulary`, `vocabulary_reviews`, `grammar_progress`, `study_sessions`, `errors`,
`listening_content`, `work_schedule`, più `productions` (testi scritti e parlato), `daily_plans`,
`assessments` (test di livello) e `weekly_reviews`. Ogni tabella didattica ha la colonna
**`language_code`** (`en`, `es`, `de`, `fr`) che rimanda alla tabella `languages`: non esistono tabelle
separate per lingua (niente `german_vocabulary`), quindi una quinta lingua non richiede nuove tabelle.
Quasi tutte le tabelle hanno una colonna `data` (JSON) per aggiungere campi senza riscrivere l'app.

---

## 2. Costi: cosa è gratuito e quali sono i limiti

| Servizio | Piano | Cosa ti serve sapere |
|---|---|---|
| GitHub | Free | Repository gratuito, anche privato. |
| Vercel | Hobby (gratis, uso personale non commerciale) | Più che sufficiente per un sito statico personale. |
| Supabase | Free | 500 MB di database (questa app ne usa pochi MB per utente), 50.000 utenti attivi al mese. |

Limiti da conoscere sul piano gratuito di Supabase:
- **Il progetto va in pausa dopo circa 7 giorni senza alcuna attività.** I dati **non** si perdono: basta
  aprire la dashboard di Supabase e premere *Restore/Resume project*. Se usi l'app ogni settimana, non succede.
- **Le email di sistema** (conferma, recupero password) usano un servizio di prova con **un limite di
  poche email all'ora**: per uso personale va bene. Per molti utenti si può collegare gratuitamente un
  servizio SMTP esterno (es. Resend o Brevo hanno piani gratuiti) in *Authentication → Emails → SMTP Settings*.

Nessuna AI a pagamento è necessaria: tutte le funzioni funzionano in locale (vedi sezione 10).

---

## 3. Guida passo-passo alla messa online

Tempo stimato: 30–45 minuti. Non serve saper programmare. I nomi dei menu possono cambiare leggermente
nel tempo: se non trovi una voce, cerca la parola chiave indicata in grassetto.

### Passo 1 — Il codice su GitHub
Il codice è già nel repository `guidottiluca21-commits/Languages`, nel ramo (branch) **`claude/lingua-os`**.
Hai due possibilità:
- **Consigliata:** su GitHub apri il repository → *Pull requests* → *New pull request* → scegli
  `claude/lingua-os` → *Create pull request* → *Merge*. Così il codice va nel ramo principale.
- Oppure, al passo 4, indica a Vercel di usare direttamente il ramo `claude/lingua-os`.

### Passo 2 — Creare il progetto Supabase
> **Cos'è Supabase?** È un servizio che offre un database e un sistema di login già pronti e sicuri.

1. Vai su <https://supabase.com> → *Start your project* → accedi (puoi usare l'account GitHub).
2. *New project*:
   - **Name**: `lingua-os`
   - **Database Password**: premi *Generate a password* e **salvala in un posto sicuro** (un gestore di
     password). L'app non ne ha bisogno; serve solo a te per la manutenzione. **Non metterla mai nel codice.**
   - **Region**: scegli una regione europea (es. *Frankfurt* o *Ireland*): i dati restano in UE.
   - Piano: **Free**. Premi *Create new project* e attendi 1–2 minuti.

### Passo 3 — Creare le tabelle (SQL Editor)
> **Cos'è SQL?** È il linguaggio con cui si dice al database quali tabelle creare. Hai già un file pronto.

1. Nel menu a sinistra di Supabase apri **SQL Editor** → *New query*.
2. Apri il file `supabase-schema.sql` di questo progetto (su GitHub: clicca il file → pulsante *Copy raw file*).
3. Incolla tutto nell'editor e premi **Run** (o Ctrl/Cmd + Invio).
4. Deve comparire *Success. No rows returned*. (Se lo esegui una seconda volta va bene lo stesso:
   lo script è ripetibile.)
   **Hai già eseguito una versione precedente dello script?** Esegui di nuovo quello aggiornato: rinomina
   da solo la colonna `language` in `language_code`, aggiunge tedesco e francese e i nuovi campi
   dell'ascolto, **senza cancellare i dati** (verificato su PostgreSQL).
5. Verifica: menu **Table Editor** → devono esserci le tabelle elencate nella sezione 1, e ognuna deve
   avere l'etichetta **RLS enabled** (non "RLS disabled").

> **Cos'è la RLS (Row Level Security)?** È una regola applicata direttamente dal database: ogni richiesta
> porta con sé l'identità dell'utente e il database restituisce o modifica **solo le righe di quell'utente**.
> Anche se qualcuno modificasse le richieste dell'app a mano, non potrebbe leggere i dati altrui.

### Passo 4 — Prendere URL e chiave pubblica
Nella dashboard attuale di Supabase **URL e chiave stanno in due pagine diverse**.

**A. Project URL → `SUPABASE_URL`**
- Il modo più semplice: premi il pulsante **Connect** in alto, al centro della pagina del progetto.
  Nel riquadro (scheda *App Frameworks*) trovi `SUPABASE_URL=https://xxxx.supabase.co`.
- In alternativa: **Project Settings** (ingranaggio in basso a sinistra) → **Data API** → *Project URL*.
- Oppure ricavalo dalla barra degli indirizzi: se vedi
  `supabase.com/dashboard/project/abcdefghijklm`, l'URL è `https://abcdefghijklm.supabase.co`.

**B. Chiave pubblica → `SUPABASE_ANON_KEY`**
- **Project Settings** → **API Keys**.
- Copia la **Publishable key** (inizia con `sb_publishable_`), **oppure**, nella scheda
  *Legacy API keys*, la chiave **`anon` `public`** (una lunga stringa che inizia con `eyJ`).
  Funzionano entrambe.

**Non copiare mai** la chiave `service_role` né le chiavi `secret` (`sb_secret_…`): danno accesso
totale al database. Se per errore le inserisci, la build si ferma con un avviso.

### Passo 5 — Configurare il login (Authentication)
1. **Authentication → Sign In / Providers → Email**: deve essere **attivo**.
   - **Confirm email** (verifica email): attivalo se vuoi che ogni nuovo account confermi l'indirizzo
     (consigliato). L'app gestisce entrambi i casi.
   - **Minimum password length**: imposta **10**; **Password requirements**: *letters and digits*.
     (L'app controlla già queste regole, ma così le applica anche il server.)
2. Le impostazioni **URL** si completano al passo 8, dopo aver ottenuto l'indirizzo dell'app.

### Passo 6 — Pubblicare su Vercel
> **Cos'è Vercel?** È il servizio che mette online i file dell'app e li aggiorna automaticamente
> ogni volta che il codice su GitHub cambia.

1. Vai su <https://vercel.com> → *Sign Up* → **Continue with GitHub**.
2. *Add New… → Project* → trova `Languages` → **Import** (se non compare: *Adjust GitHub App Permissions*
   e dai accesso al repository).
3. Nella schermata di configurazione:
   - **Framework Preset**: *Other*
   - **Build and Output Settings**: lascia i valori automatici (sono in `vercel.json`:
     build `npm run build`, output `dist`).
   - **Environment Variables** — aggiungi le due variabili del passo 4:

     | Name | Value |
     |---|---|
     | `SUPABASE_URL` | il Project URL |
     | `SUPABASE_ANON_KEY` | la chiave anon / publishable |

4. **Deploy**. Dopo circa un minuto avrai un indirizzo tipo `https://languages-xxxx.vercel.app`.
5. Se al passo 1 non hai fatto il merge: *Settings → Git → Production Branch* → `claude/lingua-os`,
   poi *Deployments → Redeploy*.

### Passo 7 — Dominio di produzione
- Vercel ti dà già un dominio gratuito `…vercel.app`: puoi usarlo così. Puoi renderlo più leggibile in
  *Settings → Domains* (es. `lingua-luca.vercel.app`).
- Un dominio personale (es. `lingua.tuosito.it`) è facoltativo e di solito a pagamento presso un registrar;
  si aggiunge sempre in *Settings → Domains* seguendo le istruzioni DNS mostrate da Vercel.
- **Ogni volta che cambi dominio, ripeti il passo 8.**

### Passo 8 — URL di reindirizzamento per l'autenticazione (importante)
Servono perché i link nelle email (conferma, recupero password) riportino alla tua app e non altrove.

In Supabase → **Authentication → URL Configuration**:
1. **Site URL**: l'indirizzo definitivo dell'app, es. `https://languages-xxxx.vercel.app`
2. **Redirect URLs** → *Add URL*, aggiungi:
   - `https://languages-xxxx.vercel.app/**`
   - (se usi anche le anteprime di Vercel) `https://*-tuonomeutente.vercel.app/**`
   - (per prove sul tuo computer) `http://localhost:5173/**`
3. *Save*.

### Passo 9 — Prova finale (5 minuti)
1. Apri l'app → **Crea un account** → conferma l'email se richiesto → accedi.
2. Completa l'onboarding, aggiungi una parola in *Vocabulary → Add*, completa un'attività.
3. In basso a sinistra deve comparire **● Online · Sincronizzato**.
4. Apri l'app dal telefono, accedi con lo stesso account: devi ritrovare la parola e l'attività.
5. Supabase → **Table Editor → vocabulary**: vedrai la riga con il tuo `user_id`.

---

## 4. Variabili d'ambiente

> **Cosa sono?** Valori di configurazione inseriti **fuori dal codice** (su Vercel), così il codice
> pubblico su GitHub non contiene indirizzi né chiavi del tuo progetto.

| Variabile | Dove | Obbligatoria | Pubblica? |
|---|---|---|---|
| `SUPABASE_URL` | Vercel → Project → Settings → Environment Variables | Sì | Sì |
| `SUPABASE_ANON_KEY` | stesso posto (vale anche `SUPABASE_PUBLISHABLE_KEY`) | Sì | Sì, per progettazione |

- La chiave **anon/publishable** finisce nel browser ed è normale: da sola non permette di leggere dati,
  perché ogni tabella è protetta dalla RLS e richiede un utente autenticato.
- **Mai** usare `service_role` / `sb_secret_…` nel frontend: `scripts/build.js` blocca la build se la rileva.
- La password del database **non** serve all'app e non va inserita da nessuna parte.
- Dopo aver cambiato una variabile su Vercel serve un nuovo deploy (*Deployments → … → Redeploy*).
- In locale si usa il file `.env` (copia di `.env.example`), che è escluso da Git.

---

## 5. Sicurezza e privacy

- **Password**: gestite solo da Supabase Auth (cifrate con bcrypt sui suoi server). L'app non le salva
  da nessuna parte, né nel database né nel browser.
- **Sessione**: gestita dalla libreria ufficiale `supabase-js` come raccomandato (token di accesso a breve
  durata, rinnovato automaticamente). Alla disconnessione la sessione viene rimossa dal dispositivo.
- **Isolamento**: RLS attiva su tutte le tabelle, con policy separate per lettura, inserimento,
  modifica e cancellazione basate su `auth.uid() = user_id`. Il ruolo anonimo non ha accesso.
  *Verificato su un database PostgreSQL reale*: un secondo utente non riesce a leggere, modificare,
  cancellare o "rubare" righe altrui, nemmeno cambiando `user_id` nelle richieste.
- **Intestazioni di sicurezza** (in `vercel.json`): Content-Security-Policy restrittiva (nessuno script
  esterno o inline), blocco dell'inserimento in iframe, microfono consentito solo al sito stesso.
- **Minimizzazione dei dati**: email (in Supabase Auth), nome visualizzato, lingua madre, impostazioni e
  dati di studio. Niente posizione, niente contatti, niente analytics, niente cookie di terze parti.
  Le registrazioni audio degli esercizi di parlato **non** vengono salvate (restano solo nella pagina).
- **Cache locale**: il browser conserva una copia dei *dati di studio* per l'uso offline. Uscendo
  (*Settings → Account → Esci*) la copia viene cancellata da quel dispositivo.
- **Eliminazione account**: *Settings → Account → Elimina account* (scrivendo `ELIMINA` per conferma).
  Chiama la funzione `delete_my_account()` nel database, che elimina l'utente e — grazie a
  `on delete cascade` — **tutte** le sue righe. Può eliminare solo l'account di chi la chiama.
- **Esportazione**: *Settings → Data → Export JSON* scarica tutti i tuoi dati.

---

## 6. Sincronizzazione e uso offline

- **Quando si salva**: a ogni modifica, dopo ~1 secondo, solo le righe cambiate. Nel menu laterale lo stato:
  **● Online · Sincronizzato**, *Modifiche in attesa…*, **● Offline · N modifiche in attesa**,
  *Errore di sincronizzazione*. Cliccandolo forzi una sincronizzazione.
- **Offline**: puoi continuare a studiare; le modifiche restano nella cache (anche chiudendo il browser)
  e vengono inviate appena torna la connessione.
- **Altro dispositivo**: all'apertura, al ritorno sull'app e ogni 5 minuti l'app scarica gli aggiornamenti.
  Le modifiche in sospeso vengono sempre **inviate prima** di scaricare, quindi non vengono sovrascritte.
- **Primo accesso su un nuovo dispositivo**: serve la connessione (per scaricare i dati). Un dispositivo
  nuovo non invia nulla finché non ha scaricato i dati dal cloud.
- **Sessione scaduta**: l'app chiede di accedere di nuovo; le modifiche non sincronizzate restano sul
  dispositivo e vengono inviate dopo il login.
- **Conflitti**: se modifichi *lo stesso elemento* su due dispositivi contemporaneamente offline, vince
  l'ultima modifica inviata (per singolo elemento, non per tutto l'account).
- **Limite attuale**: la sincronizzazione non è "in tempo reale" istantaneo tra due schermi aperti
  insieme; l'altro dispositivo si aggiorna quando torni sull'app o entro 5 minuti.
- Un singolo valore non valido non blocca mai la coda: viene saltato e segnalato.

---

## 7. Installare l'app sul telefono (PWA)

- **iPhone/iPad (Safari)**: apri l'indirizzo dell'app → pulsante *Condividi* → **Aggiungi alla schermata Home**.
- **Android (Chrome)**: menu ⋮ → **Installa app**.
- **Computer (Chrome/Edge)**: icona di installazione nella barra degli indirizzi.

L'app installata si apre a schermo intero e funziona anche senza rete dopo il primo accesso.

---

## 8. Sviluppo in locale e test

Richiede [Node.js](https://nodejs.org) 18+.

```bash
npm install            # scarica la libreria ufficiale supabase-js
cp .env.example .env   # poi inserisci SUPABASE_URL e SUPABASE_ANON_KEY
npm start              # build + server su http://localhost:5173
```
Ricorda di aggiungere `http://localhost:5173/**` ai Redirect URLs di Supabase (passo 8).

**Test automatici** (già eseguiti durante lo sviluppo):
- `npm test` — (1) `tests/content.test.js`: oltre 5.500 controlli su tutti i pacchetti di lingua
  (riferimenti, risposte, copertura A1→C2, e che i controlli di scrittura non segnalino errori sulle frasi
  corrette del curriculum); (2) conversione stato ⇄ database senza perdita di dati, con le 4 lingue separate.
- `tests/e2e-languages.js` — nel browser: onboarding con 4 lingue e livelli diversi, selettore, cambio
  lingua senza logout, errori e test di livello solo nella lingua giusta, planner multilingue, pronuncia,
  confronto, moduli medici DE/FR, mobile, ripristino su un secondo dispositivo.
- `LANG_CODE=de node tests/e2e-learning.js` (anche `en`, `es`, `fr`) — tutte le attività in quella lingua.
- `node tests/mapper-roundtrip.test.js --sql out.sql` — genera le righe come SQL da inserire in un
  PostgreSQL con lo schema, per verificare vincoli e RLS su un database reale.
- `tests/e2e-cloud.js` e `tests/e2e-learning.js` — test nel browser (Playwright) con un backend simulato
  (`tests/mock-supabase.js`): registrazione, login, onboarding, salvataggio, offline, logout, secondo
  dispositivo, isolamento tra utenti, eliminazione account, sessione scaduta, tutte le attività didattiche.
  Esecuzione: `SUPABASE_URL=https://x.supabase.co SUPABASE_ANON_KEY=test npm run build`,
  poi `npx http-server dist -p 5180` e in un altro terminale `node tests/e2e-cloud.js`.

---

## 9. Risoluzione dei problemi

| Sintomo | Causa probabile | Soluzione |
|---|---|---|
| Schermata **"Configurazione mancante"** | Variabili non impostate o deploy precedente | Passo 6.3, poi *Redeploy* |
| **"Configurazione non sicura"** o build fermata con *SECRET / service_role* | Hai inserito la chiave segreta | Usa la chiave anon/publishable; in Supabase rigenera la chiave segreta |
| Build Vercel fallita: *SUPABASE_URL and SUPABASE_ANON_KEY are not set* | Variabili mancanti | Aggiungile e rifai il deploy |
| **"Il database non è configurato"** | Script SQL non eseguito | Passo 3 |
| **"Email o password non corrette."** | Credenziali sbagliate | Riprova o usa *Password dimenticata?* |
| **"Devi prima confermare l'email"** | Verifica email attiva | Apri il link ricevuto (controlla lo spam) |
| Email di conferma/recupero **non arriva** | Limite di poche email/ora del piano gratuito, o spam | Attendi un'ora; controlla lo spam; per uso intensivo configura un SMTP (sez. 2) |
| Il link dell'email apre **localhost** o una pagina d'errore | Site URL / Redirect URLs errati | Passo 8 |
| **"Il link è scaduto o è già stato usato"** | Link vecchio o già aperto | Richiedi un nuovo link |
| **"Troppi tentativi"** | Limiti anti-abuso di Supabase | Attendi qualche minuto |
| Login ok ma **dati vuoti** su un dispositivo | Variabili di un altro progetto Supabase | Controlla che `SUPABASE_URL` sia lo stesso ovunque |
| Stato **"Errore di sincronizzazione"** che persiste | Progetto Supabase **in pausa** o non raggiungibile | Dashboard Supabase → *Resume project* |
| **"Operazione non autorizzata"** | Policy RLS mancanti o modificate | Riesegui `supabase-schema.sql` |
| "Elimina account" dà errore | Funzione `delete_my_account` non creata | Riesegui lo script SQL; in alternativa elimina l'utente da *Authentication → Users* |
| Dopo un aggiornamento vedi ancora la versione vecchia | Cache dell'app installata | Chiudi e riapri l'app (o ricarica due volte) |
| Microfono/riconoscimento vocale non funzionano | Browser senza supporto o permesso negato | Usa Chrome/Edge; consenti il microfono per il sito |

---

## 10. Integrazione futura con un'AI

Tutte le funzioni "intelligenti" passano da `js/ai.js`: `generateExercise()`, `evaluateWriting()`,
`evaluateSpeaking()`, `generateVocabulary()`, `generateListeningTask()`, `evaluateAnswer()`,
`generateScenario()`, `generateWeeklyPlan()`. Oggi usano implementazioni **locali** (gratuite, offline).

Per collegare un modello AI **senza mai mettere chiavi nel browser**:
1. crea un piccolo backend (ad esempio una *Supabase Edge Function*, che ha un piano gratuito) che riceve
   `POST { task, lang, payload }`, chiama il modello con la chiave salvata come *secret* sul server e
   risponde con lo stesso formato dell'implementazione locale;
2. in *Settings → AI integration* scegli *Remote backend* e inserisci l'indirizzo.

Se il backend non risponde, l'app torna automaticamente alle funzioni locali. I costi dipendono dal
fornitore del modello: **non è necessario** per usare l'app.

---

## 11. Checklist

Legenda: ✅ implementato e verificato con test automatici · ⚙️ richiede la tua configurazione (sez. 3)

- ✅ Registrazione funzionante (validazione email, robustezza password, conferma password)
- ✅ Login funzionante (messaggi d'errore comprensibili)
- ✅ Logout funzionante (con avviso se ci sono modifiche non sincronizzate)
- ✅ Recupero password (richiesta link + scelta nuova password) — ⚙️ Redirect URLs (passo 8)
- ✅ Cambio password (Settings → Account)
- ✅ Verifica email gestita — ⚙️ attivabile in Supabase (passo 5)
- ✅ Sessione persistente (riapri il browser e sei ancora collegato)
- ✅ Database funzionante — ⚙️ esegui `supabase-schema.sql` (passo 3)
- ✅ RLS configurato su tutte le tabelle (verificato su PostgreSQL reale)
- ✅ Ogni utente vede solo i propri dati (verificato: lettura, modifica, cancellazione, falsificazione di `user_id`)
- ✅ English separato da Spanish (livelli, vocabolario, grammatica, errori, statistiche, cronologia)
- ✅ Quattro lingue indipendenti (EN, ES, DE, FR) — vedi la checklist della sezione 12
- ✅ Sincronizzazione tra dispositivi (verificato: dispositivo A → logout → dispositivo B)
- ✅ Local cache (solo come copia; rimossa al logout)
- ✅ Gestione offline (coda delle modifiche, anche dopo chiusura del browser)
- ✅ Environment variables (`.env.example`, build che rifiuta chiavi segrete) — ⚙️ da inserire su Vercel
- ✅ Deploy Vercel pronto (`vercel.json`) — ⚙️ da collegare (passo 6)
- ✅ Mobile responsive
- ✅ PWA funzionante (installabile; si apre offline — verificato)
- ✅ Eliminazione account e dati (Settings → Account)

**Flusso completo verificato** (test automatici con backend simulato + PostgreSQL reale per schema e RLS):
registrazione → login → creazione profilo → inserimento dati → salvataggio nel database → logout →
login da un altro dispositivo → recupero di tutti i dati, senza perdite.


---

## 12. Le quattro lingue e come aggiungerne una quinta

**Un'unica architettura, contenuti indipendenti.** Il motore (valutazione CEFR, ripasso, planner,
registro errori, analisi di scrittura e parlato, sincronizzazione) lavora solo con un **codice lingua**.
Tutto ciò che è specifico di una lingua sta in due posti:

1. `js/content/languages.js` — il registro `LOS.LANGUAGES = { en: {…}, es: {…}, de: {…}, fr: {…} }`:
   nome, bandiera, locale e voce, caratteristiche grammaticali (casi, generi, forma di cortesia…),
   **categorie di errore proprie** (tedesco: casi, ordine delle parole, genere, desinenze aggettivali,
   verbo + preposizione, verbi separabili; francese: genere, accordi, coniugazione, pronomi, preposizioni,
   subjonctif), focus di pronuncia, note di registro;
2. i pacchetti `js/content/<codice>*.js` — curriculum grammaticale **scritto per quella lingua** (non
   tradotto), vocabolario con articolo e plurale (`der Tisch — die Tische`, `la voiture — les voitures`),
   test di livello, testi di lettura e ascolto, esercizi "pensa nella lingua", scrittura, speaking,
   fonti di ascolto classificate, guida di pronuncia, controlli di scrittura per italofoni, moduli
   medici e professionali con formule autentiche (Anamnese, Aufklärungsgespräch, Übergabe, Konsil,
   Arztbrief/Fachsprachprüfung; interrogatoire, consultation d'anesthésie, transmissions SAED, RCP,
   dispositif d'annonce, personne de confiance).

**Aggiungere una quinta lingua** (es. `it`, `pt`, `ja`):
1. una voce in `js/content/languages.js` (codice, nome, bandiera, locale, caratteristiche, categorie di errore);
2. i pacchetti di contenuti `js/content/<codice>.js` (+ `-lex`, `-pro`) con `LOS.lang.register({ code, … })`;
3. tre righe `<script>` in `index.html` e, se vuoi, un colore `--lang-<codice>` in `css/style.css`;
4. una riga nella tabella `languages` (`insert into public.languages (code, name, native_name) values (…)`).

Nessun componente del motore, delle schermate o della sincronizzazione va modificato; `npm test`
verifica automaticamente che il nuovo pacchetto sia completo (A1→C2) e coerente.

**Cosa è dichiaratamente limitato (senza servizi a pagamento o AI):**
- la correzione della scrittura è a regole: individua gli errori tipici degli italofoni e propone la
  versione corretta e più naturale, vocabolario migliorabile, connettivi del livello successivo e
  strutture da ripassare; una riscrittura completa di testi liberi richiede un backend AI (sezione 10);
- la pronuncia usa la sintesi vocale del dispositivo (qualità dipendente dalle voci installate) e non
  c'è una valutazione automatica della tua pronuncia: lo speaking ti registra per il confronto e misura
  fluenza, esitazioni e varietà dalla trascrizione (dove il browser offre il riconoscimento vocale);
- le fonti di ascolto sono suggerimenti di contenuti gratuiti esterni (DW, Easy German, Tagesschau, RFI,
  TV5Monde, France Culture…): l'app non li ospita.

### Checklist dell'estensione DE/FR

- ✅ English funzionante · ✅ Spanish funzionante · ✅ German funzionante · ✅ French funzionante
  (tutte le 11 attività completate in ciascuna lingua dai test nel browser)
- ✅ Quattro profili CEFR indipendenti (sottolivelli A1.1 … C2.2)
- ✅ Quattro test di livello indipendenti (grammatica, lessico, lettura, ascolto, scrittura, speaking,
  comprensione, naturalezza/registro), salvati solo nella lingua corrispondente
- ✅ Quattro database linguistici logici (`language_code` in ogni tabella didattica)
- ✅ Grammatica specifica per lingua (DE 52 argomenti, FR 47, EN 51, ES 49 — da A1 a C2)
- ✅ Vocabolario specifico (articolo, plurale, genere, IPA, accento, registro, collocazioni, sinonimi,
  contrari, errori comuni, parole correlate)
- ✅ Registro errori per lingua con categorie proprie, che influenzano la scelta degli esercizi
- ✅ Ripasso a intervalli indipendente per lingua
- ✅ Ascolto per lingua, con classificazione (CEFR, durata, argomento, difficoltà, accento, velocità, trascrizione)
- ✅ Scrittura per lingua (correzione, spiegazione, versione naturale, versione più avanzata, registro,
  vocabolario migliorabile, strutture da ripassare)
- ✅ Speaking per lingua (fluenza, accuratezza, lessico, pronuncia, grammatica, complessità, coerenza,
  naturalezza, esitazioni, registro)
- ✅ Linguaggio professionale e ✅ linguaggio medico in tutte e 4 le lingue
- ✅ Pronuncia (guide complete per tedesco e francese) · ✅ Confronta lingue (IT/EN/ES/DE/FR)
- ✅ "Pensa nella lingua" con scala a 6 livelli legata al livello di ciascuna lingua
- ✅ Dashboard comparativa (clic su una lingua → sua dashboard) · ✅ selettore lingua compatto
- ✅ Planner multilingue realistico (rotazione nei giorni brevi, sessione minima)
- ✅ Sincronizzazione Supabase · ✅ dati separati per `language_code` (verificato su PostgreSQL reale)
- ✅ Architettura pronta per una quinta lingua
- ⚙️ Se avevi già creato il database: **riesegui `supabase-schema.sql`** (migrazione automatica)

## 13. Motore pedagogico 2.0

Principio: **il prossimo passo più piccolo e utile**. Il CEFR resta il quadro di riferimento, ma la
difficoltà di ogni attività è regolata separatamente: livello linguistico, complessità del compito,
carico cognitivo e lunghezza dell'output.

**Insegnare prima di verificare.** Ogni elemento nuovo segue la sequenza
vedere → ascoltare → capire → riconoscere → richiamare → completare → produrre → usare in contesto →
uso spontaneo → ripasso. Nessun esercizio di produzione su materiale mai presentato.

**Maturità delle conoscenze** (salvata nel database in `learning_stage`):
- vocabolario e chunk 0–7: mai visto, esposto, riconosciuto, richiamato, produzione controllata,
  produzione guidata, uso spontaneo, automatico;
- grammatica 0–6: non introdotta, riconosciuta, capita, uso controllato, produzione guidata,
  produzione autonoma, automatica.

Un risultato viene classificato come *facile*, *esitante*, *con suggerimento*, *sbagliato* o
*errore ripetuto*. Di conseguenza lo stadio sale, resta fermo, scende o l'elemento viene rispiegato.
Gli stadi alti richiedono anche intervalli lunghi (o un uso spontaneo rilevato nei tuoi testi).

**Prerequisiti dei compiti.** Ogni compito di scrittura o speaking e ogni scenario calcola il
vocabolario, i chunk e la grammatica che richiede, ad esempio "Required chunks 11/18" (tabella
`learning_tasks`). Se non sei pronto compare *"You are not quite ready for this task yet"* e parte
una lezione di preparazione automatica.

**Scala di produzione.** Scrittura e speaking partono corti (1 frase → 2–3 → 3–5 → paragrafo →
testo breve → compito completo) e salgono dopo due buoni risultati. Gli scenari seguono questo percorso:
lingua → versione controllata → versione guidata → scenario libero.

**Lezione del giorno.** La lezione è un unico percorso: ripasso → parole nuove → pratica controllata →
grammatica, oppure la clinica degli errori se un errore si ripete → applicazione.
- Nei giorni più lunghi si aggiungono ascolto o lettura e produzione.
- La **sfida** è sempre facoltativa e non conta nei minuti del giorno.
- Sessioni minime: 5 minuti (5 ripassi, 2 domande di grammatica, 1 frase) e 10 minuti (ripasso,
  grammatica, mini-dialogo).

**Errori.** Un errore ricorrente viene affrontato in questo ordine:
1. spiegazione;
2. esercizi controllati;
3. correzione delle tue frasi sbagliate;
4. una frase nuova in contesto;
5. nuovo controllo dopo 3 giorni.

Ai livelli A1/A2 la correzione è selettiva: al massimo 3 errori e niente note di stile. Le correzioni
distinguono tra *corretto* e *più naturale/idiomatico*.

**Linguaggio medico.**
- Un percorso di 16 passi, in tutte e 4 le lingue: lessico di base, sintomi, anamnesi, esame obiettivo,
  procedure, farmaci, consenso, comunicazione in ospedale, lavoro di squadra, consegne, presentare un
  paziente, esami, terapia, emergenza, linguaggio scientifico, congressi.
- Un percorso facoltativo di anestesia e terapia intensiva.
- I passi si sbloccano quando hai imparato il 70% della lingua del passo precedente: conta la
  padronanza, non l'etichetta CEFR.
- È solo formazione linguistica, non contiene indicazioni cliniche.

**Tutor AI (facoltativo).** Se configuri un endpoint, ogni richiesta include anche `tutor`: cosa sai
già, cosa stai imparando, i tuoi errori ricorrenti, la politica di correzione e le 10 regole del tutor.
Senza endpoint tutto funziona in locale.

**Database.** Se avevi già creato il database, **riesegui `supabase-schema.sql`**. Lo script:
- aggiunge le nuove colonne e la tabella `learning_tasks`, con le regole RLS;
- converte i vecchi stadi 0–4 nella nuova scala;
- non cancella dati.

È stato verificato su PostgreSQL 16 in tre modi: installazione da zero, upgrade dallo schema
precedente e isolamento RLS tra due utenti.

### Checklist Engine 2.0
- ✅ Stadi 0–7 (lessico) e 0–6 (grammatica), con classificazione adattiva dei risultati
- ✅ Hub vocabolario con distribuzione degli stadi, chunk dei moduli, filtri per tipo e dominio
- ✅ Micro-attività: scegli, completa, traduci, abbina, ascolta, ripeti, correggi, costruisci la frase,
  espressione naturale, formale/informale, completa il dialogo, rispondi con 1 e poi 3 frasi
- ✅ Controllo dei prerequisiti e lezione di preparazione · ✅ scala di produzione · ✅ percorso degli scenari
- ✅ Lezione giornaliera coerente, sessioni minime, sfida facoltativa
- ✅ Clinica degli errori · ✅ correzione selettiva ai livelli A1/A2
- ✅ Percorso medico a 16 passi e percorso di anestesia e terapia intensiva (EN/ES/DE/FR)
- ✅ Test: contenuti (5.675 controlli), round-trip del mapper, E2E nel browser in 4 lingue, cloud, PostgreSQL
- ⚠️ Limiti:
  - La correzione locale si basa su regole: individua gli errori frequenti, non tutti.
  - Il riconoscimento dell'uso spontaneo cerca le espressioni che hai già imparato, non le loro varianti.
  - I prerequisiti si ricavano automaticamente dai contenuti. Per alcuni compiti di scrittura e speaking
    sono pochi, perché le frasi chiave non compaiono altrove nei contenuti.


/* VIEWS — Authentication (login, sign-up, password reset) and startup states.
 * System screens are in Italian (the user's native language); learning content stays in the target language. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const ui = LOS.ui;
  const esc = U.esc;
  const icon = LOS.icon;
  const V = LOS.views;
  const A = () => LOS.auth;
  let flash = null; // { type: 'ok'|'error', text }
  let checkEmail = '';

  function frame(inner) {
    return `<div class="onb auth"><div class="onb-top"><div class="brand" style="padding:0"><span class="brand-mark">L</span>Lingua OS</div></div>
      <div class="onb-body"><div class="onb-inner auth-card">${inner}</div></div>
      <p class="faint xs auth-foot">I dati sono protetti: ogni utente può accedere solo ai propri. Le password sono gestite da Supabase Auth e non vengono mai salvate dall'app.</p></div>`;
  }
  function notice() {
    const n = flash || A().takeUrlNotice();
    flash = null;
    if (!n) return '<div class="auth-msg" role="alert" aria-live="assertive"></div>';
    return `<div class="auth-msg" role="alert" aria-live="assertive">${ui.notice(esc(n.text), n.type === 'ok' ? 'checkCircle' : 'errors', n.type === 'ok' ? 'accent' : 'warn')}</div>`;
  }
  function showError(root, text) { root.querySelector('.auth-msg').innerHTML = ui.notice(esc(text), 'errors', 'warn'); }
  function busy(btn, on, label) { btn.disabled = on; if (label) btn.textContent = label; }
  function pwField(id, label, auto) {
    return `<div class="field"><label for="${id}">${label}</label><div class="pw-wrap"><input class="input lg" type="password" id="${id}" autocomplete="${auto}" required minlength="10" maxlength="72"><button type="button" class="btn ghost sm pw-toggle" data-toggle="${id}" aria-label="Mostra password">Mostra</button></div></div>`;
  }
  function wireToggles(root) {
    root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
      const i = root.querySelector('#' + b.dataset.toggle);
      const show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      b.textContent = show ? 'Nascondi' : 'Mostra';
      b.setAttribute('aria-label', show ? 'Nascondi password' : 'Mostra password');
    }));
  }
  function strengthHTML(pw, email) {
    const issues = A().passwordIssues(pw, email);
    const score = pw ? A().passwordScore(pw) : 0;
    const labels = ['Molto debole', 'Debole', 'Discreta', 'Buona', 'Ottima'];
    return `<div class="pw-meter" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i class="${i < score ? 'on s' + score : ''}"></i>`).join('')}</div>
      <div class="xs ${issues.length ? 'faint' : 'ok'}">${pw ? (issues.length ? 'Serve: ' + issues.join(', ') : labels[score] + ' ✓') : 'Almeno 10 caratteri, con lettere e numeri.'}</div>`;
  }

  /* ---------------- login ---------------- */
  V.login = {
    title: 'Accedi', shell: false,
    render() {
      return frame(`<h1 style="font-size:32px">Bentornato.</h1><p class="muted mt-8">Accedi per ritrovare i tuoi progressi su qualsiasi dispositivo.</p>
        ${notice()}
        <form id="f" class="stack mt-24" style="--gap:14px" novalidate>
          <div class="field"><label for="email">Email</label><input class="input lg" type="email" id="email" autocomplete="email" inputmode="email" required autofocus></div>
          ${pwField('pw', 'Password', 'current-password')}
          <button class="btn primary lg block" type="submit">Accedi</button>
        </form>
        <div class="between mt-24 small"><a href="#/forgot">Password dimenticata?</a><a href="#/signup">Crea un account</a></div>`);
    },
    mount(root) {
      wireToggles(root);
      const f = root.querySelector('#f');
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = f.querySelector('#email').value, pw = f.querySelector('#pw').value;
        if (!A().validEmail(email)) return showError(root, 'Inserisci un indirizzo email valido.');
        if (!pw) return showError(root, 'Inserisci la password.');
        const btn = f.querySelector('button[type=submit]');
        busy(btn, true, 'Accesso…');
        try { await A().signIn(email, pw); /* the auth listener opens the dashboard */ }
        catch (err) {
          busy(btn, false, 'Accedi');
          showError(root, LOS.errors.friendly(err));
          if (err && err.code === 'email_not_confirmed') { checkEmail = email.trim(); }
        }
      });
    },
  };

  /* ---------------- sign-up ---------------- */
  V.signup = {
    title: 'Crea un account', shell: false,
    render() {
      return frame(`<h1 style="font-size:32px">Crea il tuo account.</h1><p class="muted mt-8">Un account, i tuoi dati, su tutti i tuoi dispositivi.</p>
        ${notice()}
        <form id="f" class="stack mt-24" style="--gap:14px" novalidate>
          <div class="field"><label for="email">Email</label><input class="input lg" type="email" id="email" autocomplete="email" inputmode="email" required autofocus></div>
          ${pwField('pw', 'Password', 'new-password')}
          <div id="meter">${strengthHTML('', '')}</div>
          ${pwField('pw2', 'Conferma password', 'new-password')}
          <div class="xs faint" id="match"></div>
          <button class="btn primary lg block" type="submit">Crea account</button>
        </form>
        <p class="faint xs mt-16">Salviamo solo ciò che serve: la tua email (gestita da Supabase Auth) e i tuoi dati di studio. Puoi eliminare l'account in qualsiasi momento da Impostazioni → Account.</p>
        <div class="mt-16 small">Hai già un account? <a href="#/login">Accedi</a></div>`);
    },
    mount(root) {
      wireToggles(root);
      const f = root.querySelector('#f');
      const email = f.querySelector('#email'), pw = f.querySelector('#pw'), pw2 = f.querySelector('#pw2');
      const upd = () => {
        root.querySelector('#meter').innerHTML = strengthHTML(pw.value, email.value);
        root.querySelector('#match').textContent = pw2.value ? (pw.value === pw2.value ? 'Le password coincidono ✓' : 'Le password non coincidono') : '';
      };
      [email, pw, pw2].forEach((i) => i.addEventListener('input', upd));
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!A().validEmail(email.value)) return showError(root, 'Inserisci un indirizzo email valido.');
        const issues = A().passwordIssues(pw.value, email.value);
        if (issues.length) return showError(root, 'Password troppo debole. Serve: ' + issues.join(', ') + '.');
        if (pw.value !== pw2.value) return showError(root, 'Le due password non coincidono.');
        const btn = f.querySelector('button[type=submit]');
        busy(btn, true, 'Creazione account…');
        try {
          const r = await A().signUp(email.value, pw.value);
          if (r.needsConfirmation) { checkEmail = email.value.trim(); location.hash = '#/check-email'; }
          // otherwise the auth listener starts the onboarding
        } catch (err) { busy(btn, false, 'Crea account'); showError(root, LOS.errors.friendly(err)); }
      });
    },
  };

  /* ---------------- confirm your email ---------------- */
  V['check-email'] = {
    title: 'Conferma email', shell: false,
    render() {
      return frame(`<div class="complete-mark" style="background:var(--accent)">${icon('message', 26)}</div>
        <h1 class="mt-16" style="font-size:30px">Controlla la tua email.</h1>
        <p class="muted mt-8">Abbiamo inviato un link di conferma${checkEmail ? ` a <strong>${esc(checkEmail)}</strong>` : ''}. Aprilo per attivare l'account, poi accedi. Controlla anche la cartella spam.</p>
        ${notice()}
        <div class="cluster mt-24"><a class="btn primary" href="#/login">Vai al login</a>${checkEmail ? '<button class="btn" id="resend">Reinvia email</button>' : ''}</div>`);
    },
    mount(root) {
      const b = root.querySelector('#resend');
      if (b) b.addEventListener('click', async () => {
        busy(b, true, 'Invio…');
        try { await A().resendConfirmation(checkEmail); root.querySelector('.auth-msg').innerHTML = ui.notice('Email inviata di nuovo.', 'checkCircle', 'accent'); }
        catch (err) { showError(root, LOS.errors.friendly(err)); }
        busy(b, false, 'Reinvia email');
      });
    },
  };

  /* ---------------- forgot password ---------------- */
  V.forgot = {
    title: 'Recupera password', shell: false,
    render() {
      return frame(`<h1 style="font-size:30px">Recupera la password.</h1><p class="muted mt-8">Inserisci la tua email: ti invieremo un link per sceglierne una nuova.</p>
        ${notice()}
        <form id="f" class="stack mt-24" style="--gap:14px" novalidate>
          <div class="field"><label for="email">Email</label><input class="input lg" type="email" id="email" autocomplete="email" inputmode="email" required autofocus></div>
          <button class="btn primary lg block" type="submit">Invia link</button></form>
        <div class="mt-24 small"><a href="#/login">${icon('chevronLeft', 13)} Torna al login</a></div>`);
    },
    mount(root) {
      const f = root.querySelector('#f');
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = f.querySelector('#email').value;
        if (!A().validEmail(email)) return showError(root, 'Inserisci un indirizzo email valido.');
        const btn = f.querySelector('button[type=submit]');
        busy(btn, true, 'Invio…');
        try {
          await A().resetPassword(email);
          root.querySelector('.auth-msg').innerHTML = ui.notice('Se esiste un account con questa email, riceverai a breve un link per reimpostare la password. Aprilo da questo dispositivo o da un altro.', 'checkCircle', 'accent');
          busy(btn, false, 'Invia di nuovo');
        } catch (err) { busy(btn, false, 'Invia link'); showError(root, LOS.errors.friendly(err)); }
      });
    },
  };

  /* ---------------- choose a new password (after the email link) ---------------- */
  V['reset-password'] = {
    title: 'Nuova password', shell: false,
    render() {
      if (!A().user) return frame(`<h1 style="font-size:30px">Link non valido.</h1><p class="muted mt-8">Il link per reimpostare la password è scaduto o è già stato usato.</p>${notice()}<a class="btn primary mt-24" href="#/forgot">Richiedi un nuovo link</a>`);
      return frame(`<h1 style="font-size:30px">Scegli una nuova password.</h1><p class="muted mt-8">Per ${esc(A().user.email || 'il tuo account')}.</p>
        ${notice()}
        <form id="f" class="stack mt-24" style="--gap:14px" novalidate>${pwField('pw', 'Nuova password', 'new-password')}<div id="meter">${strengthHTML('', '')}</div>${pwField('pw2', 'Conferma password', 'new-password')}
        <button class="btn primary lg block" type="submit">Salva password</button></form>`);
    },
    mount(root) {
      wireToggles(root);
      const f = root.querySelector('#f');
      if (!f) return;
      const pw = f.querySelector('#pw'), pw2 = f.querySelector('#pw2');
      pw.addEventListener('input', () => { root.querySelector('#meter').innerHTML = strengthHTML(pw.value, A().user && A().user.email); });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const issues = A().passwordIssues(pw.value, A().user && A().user.email);
        if (issues.length) return showError(root, 'Password troppo debole. Serve: ' + issues.join(', ') + '.');
        if (pw.value !== pw2.value) return showError(root, 'Le due password non coincidono.');
        const btn = f.querySelector('button[type=submit]');
        busy(btn, true, 'Salvataggio…');
        try { await A().updatePassword(pw.value); ui.toast('Password aggiornata'); LOS.app.afterRecovery(); }
        catch (err) { busy(btn, false, 'Salva password'); showError(root, LOS.errors.friendly(err)); }
      });
    },
  };

  /* ---------------- startup states ---------------- */
  LOS.authUI = {
    setFlash(f) { flash = f; },
    loading(text) {
      return frame(`<div class="stack" style="align-items:center;text-align:center;--gap:16px;padding:40px 0"><div class="spinner" aria-hidden="true"></div><p class="muted" role="status">${esc(text || 'Caricamento…')}</p></div>`);
    },
    offlineNoData(retry) {
      return frame(`<h1 style="font-size:28px">Sei offline.</h1><p class="muted mt-8">Su questo dispositivo non ci sono ancora i tuoi dati. Connettiti a internet una volta per scaricarli: poi l'app funzionerà anche offline.</p>
        <div class="cluster mt-24"><button class="btn primary" id="retry">Riprova</button><button class="btn ghost" id="out">Esci</button></div>`);
    },
    configError(problems) {
      const secret = problems.includes('secret');
      return frame(`<h1 style="font-size:28px">${secret ? 'Configurazione non sicura.' : 'Configurazione mancante.'}</h1>
        <p class="muted mt-8">${secret ? 'È stata inserita una chiave segreta (service role / secret key). Non deve mai essere usata nel browser: sostituiscila con la chiave pubblica "anon" / "publishable" e rigenera la chiave segreta in Supabase.' : "L'app non sa ancora a quale progetto Supabase collegarsi."}</p>
        <div class="card soft mt-24 small"><strong>Cosa fare</strong><ol class="lesson" style="padding-left:18px;margin:8px 0 0">
          <li>Su Vercel → Project → Settings → Environment Variables imposta <span class="mono">SUPABASE_URL</span> e <span class="mono">SUPABASE_ANON_KEY</span>.</li>
          <li>Rifai il deploy (Deployments → Redeploy).</li>
          <li>In locale: copia <span class="mono">.env.example</span> in <span class="mono">.env</span>, compila i valori ed esegui <span class="mono">npm run build</span>.</li></ol></div>
        <p class="faint xs mt-16">Dettagli: ${esc(problems.join(', '))}. Istruzioni complete nel README, sezione "Configurazione".</p>`);
    },
  };
})();

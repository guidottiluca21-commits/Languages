/* FRIENDLY ERRORS — turn technical errors (Supabase Auth, PostgREST, network) into clear Italian messages.
 * Technical details go to the console only. */
(function () {
  'use strict';
  const LOS = window.LOS;

  const BY_CODE = {
    invalid_credentials: 'Email o password non corrette.',
    email_not_confirmed: "Devi prima confermare l'email: apri il link che ti abbiamo inviato (controlla anche lo spam).",
    user_already_exists: 'Esiste già un account con questa email. Prova ad accedere o a recuperare la password.',
    email_exists: 'Esiste già un account con questa email. Prova ad accedere o a recuperare la password.',
    weak_password: 'Password troppo debole: usa almeno 10 caratteri con lettere e numeri.',
    same_password: 'La nuova password deve essere diversa da quella attuale.',
    over_email_send_rate_limit: 'Troppe email inviate. Attendi qualche minuto e riprova.',
    over_request_rate_limit: 'Troppi tentativi. Attendi qualche minuto e riprova.',
    email_address_invalid: 'Indirizzo email non valido.',
    signup_disabled: 'Le nuove registrazioni sono disattivate in questo progetto.',
    email_provider_disabled: "L'accesso con email è disattivato nel progetto Supabase.",
    reauthentication_needed: 'Per sicurezza, esci e accedi di nuovo prima di cambiare password.',
    session_not_found: 'La sessione è scaduta. Accedi di nuovo.',
    session_expired: 'La sessione è scaduta. Accedi di nuovo.',
    refresh_token_not_found: 'La sessione è scaduta. Accedi di nuovo.',
    refresh_token_already_used: 'La sessione è scaduta. Accedi di nuovo.',
    otp_expired: 'Il link è scaduto o è già stato usato. Richiedine uno nuovo.',
    flow_state_not_found: 'Il link non è più valido. Richiedine uno nuovo dallo stesso browser.',
    user_not_found: 'Account non trovato.',
    PGRST116: 'Dato non trovato.',
    PGRST301: 'La sessione è scaduta. Accedi di nuovo.',
    '42501': 'Operazione non autorizzata.',
    '23514': 'Alcuni dati non sono validi e non sono stati salvati.',
    '42P01': 'Il database non è configurato: esegui lo script supabase-schema.sql (vedi README).',
    PGRST205: 'Il database non è configurato: esegui lo script supabase-schema.sql (vedi README).',
  };

  function kind(err) {
    if (!err) return 'unknown';
    const msg = String(err.message || err.error_description || err).toLowerCase();
    if (err.name === 'TypeError' || /failed to fetch|networkerror|network request failed|load failed|fetch failed/.test(msg) || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 'network';
    if (err.status === 401 || /jwt expired|invalid jwt|refresh token/.test(msg) || ['session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'PGRST301'].includes(err.code)) return 'auth';
    if (err.code === '42501' || err.status === 403) return 'forbidden';
    if (['42P01', 'PGRST205'].includes(err.code)) return 'schema';
    return 'other';
  }

  function friendly(err, fallback) {
    if (!err) return fallback || 'Si è verificato un problema. Riprova tra poco.';
    if (typeof console !== 'undefined') console.warn('[detail]', err);
    if (err.code && BY_CODE[err.code]) return BY_CODE[err.code];
    const msg = String(err.message || err.error_description || err);
    if (/invalid login credentials/i.test(msg)) return BY_CODE.invalid_credentials;
    if (/email not confirmed/i.test(msg)) return BY_CODE.email_not_confirmed;
    if (/already registered|already exists/i.test(msg)) return BY_CODE.user_already_exists;
    if (/password should be|weak password|password is too/i.test(msg)) return BY_CODE.weak_password;
    if (/rate limit|too many/i.test(msg)) return BY_CODE.over_request_rate_limit;
    if (/invalid.*email|email.*invalid|unable to validate email/i.test(msg)) return BY_CODE.email_address_invalid;
    if (/expired|invalid.*link/i.test(msg) && /link|otp|token/i.test(msg)) return BY_CODE.otp_expired;
    const k = kind(err);
    if (k === 'network') return 'Connessione assente o server non raggiungibile. Riprova tra poco.';
    if (k === 'auth') return BY_CODE.session_expired;
    if (k === 'forbidden') return BY_CODE['42501'];
    if (k === 'schema') return BY_CODE['42P01'];
    return fallback || 'Si è verificato un problema. Riprova tra poco.';
  }

  LOS.errors = { friendly, kind };
})();

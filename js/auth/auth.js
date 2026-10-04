/* AUTH — thin wrapper around Supabase Auth. No credentials are ever stored by this app:
 * the Supabase client keeps its own session (access + refresh token) as the library recommends,
 * refreshes it automatically and we only read the current user id. */
(function () {
  'use strict';
  const LOS = window.LOS;
  let client = null;
  let session = null;
  let urlNotice = null; // message coming from an email link (confirmation / recovery / error)
  let recovery = false;

  /** Password policy shown live in the sign-up form. */
  function passwordIssues(pw, email) {
    const out = [];
    if (pw.length < 10) out.push('almeno 10 caratteri');
    if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) out.push('lettere e numeri');
    if (/^(.)\1+$/.test(pw) || /password|qwerty|123456|abcdef/i.test(pw)) out.push('non una password comune');
    if (email && pw && pw.toLowerCase().includes(String(email).split('@')[0].toLowerCase()) && String(email).split('@')[0].length >= 3) out.push('non contenere la tua email');
    return out;
  }
  function passwordScore(pw) {
    let s = 0;
    if (pw.length >= 10) s++; if (pw.length >= 14) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++; if (/[^a-zA-Z0-9]/.test(pw)) s++;
    return Math.min(4, s);
  }
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).trim());

  function redirectBase() { return location.origin + location.pathname.replace(/index\.html$/, ''); }

  /** Read tokens / errors that Supabase appends to the URL after an email link, then clean the URL. */
  function readUrl() {
    const h = location.hash || '';
    const q = location.search || '';
    const params = new URLSearchParams((h.startsWith('#') && !h.startsWith('#/') ? h.slice(1) : '') + '&' + q.replace(/^\?/, ''));
    if (params.get('error_code') || params.get('error')) {
      urlNotice = { type: 'error', text: LOS.errors.friendly({ code: params.get('error_code'), message: params.get('error_description') || params.get('error') }) };
    }
    const type = params.get('type');
    if (type === 'recovery') recovery = true;
    if (type === 'signup' || type === 'email_change') urlNotice = { type: 'ok', text: 'Email confermata. Benvenuto!' };
  }
  function cleanUrl() {
    const h = location.hash || '';
    if ((h && !h.startsWith('#/')) || /[?&](code|error|type)=/.test(location.search)) history.replaceState(null, '', location.pathname + (recovery ? '#/reset-password' : '#/'));
  }

  const auth = (LOS.auth = {
    passwordIssues, passwordScore, validEmail,
    get client() { return client; },
    get session() { return session; },
    get user() { return session && session.user; },
    get userId() { return session && session.user ? session.user.id : null; },
    get recovery() { return recovery; },
    takeUrlNotice() { const n = urlNotice; urlNotice = null; return n; },

    async init(cfg) {
      readUrl();
      client = window.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'lingua-auth' },
      });
      const { data, error } = await client.auth.getSession();
      if (error) urlNotice = urlNotice || { type: 'error', text: LOS.errors.friendly(error) };
      session = data ? data.session : null;
      cleanUrl();
      client.auth.onAuthStateChange((event, s) => {
        session = s;
        if (event === 'PASSWORD_RECOVERY') recovery = true;
        LOS.bus.emit('auth', { event, session: s });
      });
      return session;
    },

    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectBase() } });
      if (error) throw error;
      // With email confirmation on, an already-registered address returns a user without identities.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw { code: 'user_already_exists' };
      return { needsConfirmation: !data.session, session: data.session };
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      return data.session;
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      session = null;
      if (error && LOS.errors.kind(error) !== 'network') throw error;
    },
    /** Forget the session on this device only (used when it expired and cannot be refreshed). */
    async signOutLocal() {
      session = null;
      try { await client.auth.signOut({ scope: 'local' }); } catch (e) { /* already gone */ }
    },
    async resetPassword(email) {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectBase() });
      if (error) throw error;
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      recovery = false;
    },
    async resendConfirmation(email) {
      const { error } = await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectBase() } });
      if (error) throw error;
    },
    /** Asks the server for a fresh token; returns false when the session can no longer be renewed. */
    async refresh() {
      const { data, error } = await client.auth.refreshSession();
      if (error || !data.session) return false;
      session = data.session;
      return true;
    },
    async deleteAccount() {
      const { error } = await client.rpc('delete_my_account');
      if (error) throw error;
      await client.auth.signOut().catch(() => {});
      session = null;
    },
  });
})();

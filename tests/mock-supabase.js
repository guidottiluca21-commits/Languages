/* Test double for the subset of @supabase/supabase-js used by Lingua OS.
 * Data lives in localStorage['__mockdb'] so tests can copy it to a "second device".
 * Switches: window.__mockOffline (network down), window.__mockExpire (session can't be refreshed),
 *           window.__mockConfirm (sign-up requires email confirmation). */
(function () {
  const load = () => JSON.parse(localStorage.getItem('__mockdb') || '{"users":[],"tables":{}}');
  const save = (db) => localStorage.setItem('__mockdb', JSON.stringify(db));
  const net = () => (window.__mockOffline || sessionStorage.getItem('__mockOffline') ? { message: 'TypeError: Failed to fetch' } : null);
  const uuid = () => crypto.randomUUID();
  const delay = (v) => new Promise((r) => setTimeout(() => r(v), 5));
  window.supabase = {
    createClient(url, key, opts) {
      const SK = (opts && opts.auth && opts.auth.storageKey) || 'sb-session';
      let session = JSON.parse(localStorage.getItem(SK) || 'null');
      const subs = [];
      const emit = (ev) => subs.forEach((cb) => setTimeout(() => cb(ev, session), 0));
      const setSession = (s) => { session = s; if (s) localStorage.setItem(SK, JSON.stringify(s)); else localStorage.removeItem(SK); };
      const mkSession = (u) => ({ access_token: 'tok-' + u.id, refresh_token: 'r', user: { id: u.id, email: u.email } });
      const authErr = () => (window.__mockExpire ? { code: 'PGRST301', message: 'JWT expired', status: 401 } : null);
      const me = () => (session ? session.user.id : null);
      function builder(table) {
        const q = { table, op: 'select', filters: [], range: null };
        const exec = async () => {
          const e = net() || authErr(); if (e) return delay({ data: null, error: e });
          if (!me()) return delay({ data: null, error: { code: '42501', message: 'permission denied' } });
          const db = load(); const rows = (db.tables[table] = db.tables[table] || []);
          const match = (r) => r.user_id === me() && q.filters.every(([op, c, v]) => (op === 'eq' ? String(r[c]) === String(v) : v.map(String).includes(String(r[c]))));
          if (q.op === 'select') { let d = rows.filter(match); if (q.range) d = d.slice(q.range[0], q.range[1] + 1); return delay({ data: JSON.parse(JSON.stringify(d)), error: null }); }
          if (q.op === 'delete') { db.tables[table] = rows.filter((r) => !match(r)); save(db); return delay({ data: null, error: null }); }
          if (q.op === 'upsert') {
            for (const row of q.rows) {
              if (row.user_id !== me()) return delay({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } });
              const cols = q.opts.onConflict.split(',');
              const i = rows.findIndex((r) => cols.every((c) => String(r[c]) === String(row[c])));
              const fixTime = (o) => { ['start_time', 'end_time'].forEach((c) => { if (o[c]) o[c] = o[c].length === 5 ? o[c] + ':00' : o[c]; }); return o; };
              if (i >= 0) { if (!q.opts.ignoreDuplicates) rows[i] = fixTime(Object.assign({}, rows[i], row, { updated_at: new Date().toISOString() })); }
              else rows.push(fixTime(Object.assign({ id: uuid(), created_at: new Date().toISOString() }, row)));
            }
            save(db); return delay({ data: null, error: null });
          }
        };
        const api = {
          select() { q.op = 'select'; return api; },
          eq(c, v) { q.filters.push(['eq', c, v]); return api; },
          in(c, v) { q.filters.push(['in', c, v]); return api; },
          range(a, b) { q.range = [a, b]; return api; },
          upsert(rows, o) { q.op = 'upsert'; q.rows = rows; q.opts = o; return api; },
          delete() { q.op = 'delete'; return api; },
          then(res, rej) { return exec().then(res, rej); },
        };
        return api;
      }
      return {
        from: builder,
        async rpc(name) {
          const e = net(); if (e) return { error: e };
          if (name !== 'delete_my_account' || !me()) return { error: { code: '42501' } };
          const db = load(); const id = me();
          db.users = db.users.filter((u) => u.id !== id);
          Object.keys(db.tables).forEach((t) => (db.tables[t] = db.tables[t].filter((r) => r.user_id !== id)));
          save(db); return { data: null, error: null };
        },
        auth: {
          async getSession() { return { data: { session }, error: null }; },
          onAuthStateChange(cb) { subs.push(cb); setTimeout(() => cb('INITIAL_SESSION', session), 0); return { data: { subscription: { unsubscribe() {} } } }; },
          async signUp({ email, password }) {
            const e = net(); if (e) return { data: {}, error: e };
            const db = load();
            if (db.users.find((u) => u.email === email)) return { data: { user: { identities: [] }, session: null }, error: null };
            const u = { id: uuid(), email, password, confirmed: !window.__mockConfirm };
            db.users.push(u);
            // trigger: profile + settings rows
            db.tables.profiles = (db.tables.profiles || []).concat([{ id: uuid(), user_id: u.id, display_name: null, native_language: 'it', data: {} }]);
            db.tables.user_settings = (db.tables.user_settings || []).concat([{ id: uuid(), user_id: u.id, daily_minimum: 15, daily_target: 40, daily_maximum: 90, preferred_language: null, dark_mode: 'system', notifications_enabled: false, data: {} }]);
            save(db);
            if (!u.confirmed) return { data: { user: { id: u.id, identities: [{}] }, session: null }, error: null };
            setSession(mkSession(u)); emit('SIGNED_IN');
            return { data: { user: session.user, session }, error: null };
          },
          async signInWithPassword({ email, password }) {
            const e = net(); if (e) return { data: {}, error: e };
            const u = load().users.find((x) => x.email === email && x.password === password);
            if (!u) return { data: {}, error: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 } };
            if (!u.confirmed) return { data: {}, error: { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 } };
            setSession(mkSession(u)); emit('SIGNED_IN');
            return { data: { session }, error: null };
          },
          async signOut() { setSession(null); emit('SIGNED_OUT'); return { error: null }; },
          async resetPasswordForEmail() { return { error: net() }; },
          async resend() { return { error: net() }; },
          async updateUser({ password }) { const db = load(); const u = db.users.find((x) => x.id === me()); if (u.password === password) return { error: { code: 'same_password' } }; u.password = password; save(db); return { data: {}, error: null }; },
          async refreshSession() { if (window.__mockExpire || !session) return { data: { session: null }, error: { code: 'refresh_token_not_found', message: 'Invalid Refresh Token' } }; return { data: { session }, error: null }; },
        },
      };
    },
  };
})();

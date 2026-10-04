/* SYNC — Supabase is the source of truth; localStorage is only a per-user cache.
 *
 *  shadow  = hash of every row as last acknowledged by the server.
 *  pending = rows whose current hash differs from the shadow (+ rows that disappeared).
 *
 *  Local change → cache written immediately → debounced flush (upserts, then deletes).
 *  Offline      → changes stay pending in the cache; flushed when the connection returns.
 *  App start / another device → pending changes are pushed FIRST, then the full state is pulled,
 *  so a pull can never overwrite unsent work. Conflicts between devices: last write per row wins. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const U = LOS.util;
  const CACHE = (uid) => 'los:cache:v1:' + uid;
  const DATA_ERRORS = /^(22|23)/; // invalid data / constraint violations → quarantine row, don't block the queue

  let uid = null, shadow = {}, needsPull = false, timer = null, running = null, again = false, retryTimer = null, backoff = 0, cacheTimer = null;
  const info = { status: 'idle', pending: 0, lastSync: null, message: '', rejected: 0 };

  const hashRow = (row) => { const s = JSON.stringify(row); return U.hash(s).toString(36) + '.' + s.length.toString(36); };

  function setStatus(status, message) {
    info.status = status;
    info.message = message || '';
    LOS.bus.emit('sync-status', Object.assign({}, info));
  }

  function diff(st) {
    const rows = LOS.mapper.toRows(st, uid);
    const ups = {}, dels = {};
    let count = 0;
    LOS.mapper.TABLES.forEach((t) => {
      const cur = {};
      const sh = shadow[t.name] || {};
      ups[t.name] = [];
      dels[t.name] = [];
      rows[t.name].forEach((row) => {
        const k = LOS.mapper.keyOf(t.name, row);
        const h = hashRow(row);
        cur[k] = h;
        if (sh[k] !== h) { ups[t.name].push({ k, h, row }); count++; }
      });
      if (!t.appendOnly) Object.keys(sh).forEach((k) => { if (!(k in cur)) { dels[t.name].push(k); count++; } });
    });
    return { ups, dels, count };
  }
  function computeShadow(st) {
    const rows = LOS.mapper.toRows(st, uid);
    const out = {};
    LOS.mapper.TABLES.forEach((t) => {
      out[t.name] = {};
      if (t.writeOnly) return;
      rows[t.name].forEach((row) => { out[t.name][LOS.mapper.keyOf(t.name, row)] = hashRow(row); });
    });
    return out;
  }

  /* ---------------- cache ---------------- */
  function writeCache() {
    if (!uid) return;
    if (needsPull) return; // nothing worth caching before the first download
    try { localStorage.setItem(CACHE(uid), JSON.stringify({ v: 1, savedAt: Date.now(), state: LOS.store.state, shadow })); }
    catch (e) {
      console.warn('Cache write failed', e);
      LOS.bus.emit('cache-full');
    }
  }
  function readCache(id) {
    try { const raw = localStorage.getItem(CACHE(id)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  /* ---------------- push ---------------- */
  async function pushBatch(table, items) {
    try {
      await LOS.db.upsert(table, items.map((x) => x.row));
      items.forEach((x) => ((shadow[table] = shadow[table] || {})[x.k] = x.h));
    } catch (e) {
      if (e && e.code && DATA_ERRORS.test(String(e.code))) {
        if (items.length > 1) { for (const x of items) await pushBatch(table, [x]); return; }
        console.warn('[sync] row rejected by the database and skipped:', table, items[0].k, e);
        info.rejected++;
        (shadow[table] = shadow[table] || {})[items[0].k] = items[0].h; // don't retry until it changes
        return;
      }
      throw e;
    }
  }

  async function doFlush() {
    if (!uid || !LOS.auth.userId) return;
    // A device that has never downloaded this account must not push its empty default state.
    if (needsPull) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { info.pending = diff(LOS.store.state).count; setStatus('offline'); return; }
    const d = diff(LOS.store.state);
    info.pending = d.count;
    if (!d.count) { if (info.status !== 'synced') setStatus('synced'); return; }
    setStatus('syncing');
    try {
      for (const t of LOS.mapper.TABLES) {
        const items = d.ups[t.name];
        for (let i = 0; i < items.length; i += 200) await pushBatch(t.name, items.slice(i, i + 200));
      }
      for (const t of LOS.mapper.TABLES.slice().reverse()) {
        const keys = d.dels[t.name];
        if (!keys.length) continue;
        await LOS.db.remove(t.name, keys, uid);
        keys.forEach((k) => delete shadow[t.name][k]);
      }
      // write-only review log: once stored on the server it no longer needs to live in the cache
      const acked = shadow.vocabulary_reviews || {};
      Object.values(LOS.store.state.langs).forEach((L) => { if (L.reviewLog && L.reviewLog.length) L.reviewLog = L.reviewLog.filter((r) => !acked[r.id]); });
      shadow.vocabulary_reviews = {};
      backoff = 0;
      info.lastSync = Date.now();
      info.pending = diff(LOS.store.state).count;
      writeCache();
      setStatus(info.pending ? 'pending' : 'synced', info.rejected ? `${info.rejected} elementi non validi non sincronizzati` : '');
    } catch (e) {
      writeCache();
      info.pending = diff(LOS.store.state).count;
      const k = LOS.errors.kind(e);
      if (k === 'auth') {
        const ok = await LOS.auth.refresh().catch(() => false);
        if (ok) { scheduleRetry(500); return; }
        setStatus('auth', 'Sessione scaduta: accedi di nuovo per sincronizzare.');
        LOS.bus.emit('session-expired');
        return;
      }
      setStatus(k === 'network' ? 'offline' : 'error', LOS.errors.friendly(e));
      scheduleRetry();
    }
  }
  function scheduleRetry(ms) {
    clearTimeout(retryTimer);
    backoff = Math.min(6, backoff + 1);
    retryTimer = setTimeout(() => sync.flush(), ms || Math.min(5 * 60000, 2000 * Math.pow(2, backoff)));
  }

  const sync = (LOS.sync = {
    get info() { return Object.assign({}, info); },
    hasCache(id) { return !!readCache(id); },

    /** Load the cached copy for this user (instant start, also offline). Returns true if a cache existed. */
    startFromCache(id) {
      uid = id;
      info.rejected = 0;
      const c = readCache(id);
      if (c && c.state) { LOS.store.replace(c.state); shadow = c.shadow || {}; needsPull = !!c.needsPull; info.pending = needsPull ? 0 : diff(LOS.store.state).count; return true; }
      LOS.store.replace(LOS.store.defaultState());
      shadow = {};
      needsPull = true; // first contact on this device: download before any upload
      return false;
    },
    /** Push pending changes, then download the authoritative state. */
    async pull() {
      if (!uid) return false;
      if (!needsPull) {
        await sync.flush();
        if (diff(LOS.store.state).count) return false; // couldn't push everything: keep local copy
      }
      setStatus('syncing');
      try {
        const rows = await LOS.db.fetchAll(uid);
        const st = LOS.mapper.fromRows(rows);
        LOS.store.replace(st);
        shadow = computeShadow(st);
        needsPull = false;
        info.lastSync = Date.now();
        info.pending = 0;
        writeCache();
        setStatus('synced');
        LOS.bus.emit('pulled', { rows });
        return true;
      } catch (e) {
        const k = LOS.errors.kind(e);
        setStatus(k === 'network' ? 'offline' : k === 'auth' ? 'auth' : 'error', LOS.errors.friendly(e));
        if (k === 'auth') LOS.bus.emit('session-expired');
        throw e;
      }
    },
    /** Called by the store on every local change. */
    changed(immediate) {
      if (!uid) return;
      clearTimeout(cacheTimer);
      cacheTimer = setTimeout(writeCache, immediate ? 0 : 150);
      clearTimeout(timer);
      timer = setTimeout(() => sync.flush(), immediate ? 50 : 1200);
      if (info.status === 'synced') setStatus('pending');
    },
    async flush() {
      if (running) { again = true; return running; }
      running = doFlush().finally(() => { running = null; if (again) { again = false; sync.flush(); } });
      return running;
    },
    pendingCount() { return uid && !needsPull ? diff(LOS.store.state).count : 0; },
    /** Forget this user locally (logout / account deletion). The cloud copy is untouched. */
    stop(clearCache) {
      clearTimeout(timer); clearTimeout(retryTimer); clearTimeout(cacheTimer);
      if (clearCache && uid) { try { localStorage.removeItem(CACHE(uid)); } catch (e) { /* ignore */ } }
      uid = null; shadow = {}; needsPull = false; info.pending = 0; info.rejected = 0;
      setStatus('idle');
    },
    label(i = info) {
      if (i.status === 'offline') return i.pending ? `Offline · ${i.pending} modific${i.pending === 1 ? 'a' : 'he'} in attesa` : 'Offline';
      if (i.status === 'syncing') return 'Sincronizzazione…';
      if (i.status === 'pending') return 'Modifiche in attesa…';
      if (i.status === 'error') return 'Errore di sincronizzazione';
      if (i.status === 'auth') return 'Sessione scaduta';
      if (i.status === 'synced') return 'Online · Sincronizzato';
      return '';
    },
  });

  window.addEventListener('online', () => sync.flush());
  window.addEventListener('offline', () => { if (uid) { info.pending = diff(LOS.store.state).count; setStatus('offline'); } });
})();

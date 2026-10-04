/* CONFIG — reads the public runtime configuration written by the build (js/env.js).
 * Only PUBLIC values belong here: the Supabase project URL and the anon / publishable key.
 * The anon key is designed to be public; data is protected by Row Level Security.
 * A service-role / secret key must never reach the browser: the build refuses it, and so do we. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const env = window.LOS_ENV || {};

  function jwtRole(key) {
    try { return JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch (e) { return null; }
  }
  function check() {
    const url = String(env.SUPABASE_URL || '').trim();
    const key = String(env.SUPABASE_ANON_KEY || '').trim();
    const problems = [];
    if (!url || !key) problems.push('missing');
    if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(url)) problems.push('url');
    if (key && (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role')) problems.push('secret');
    return { url: url.replace(/\/$/, ''), key, ok: problems.length === 0, problems };
  }
  LOS.config = { check, version: env.VERSION || 'dev' };
})();

/* DATABASE — CRUD on Supabase PostgreSQL through supabase-js (PostgREST).
 * Every query also filters on user_id; Row Level Security enforces the same rule server-side,
 * so even a modified request can never touch another user's rows. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const PAGE = 1000; // PostgREST default max rows per request
  const sb = () => LOS.auth.client;

  async function fetchTable(table, uid) {
    const out = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb().from(table).select('*').eq('user_id', uid).range(from, from + PAGE - 1);
      if (error) throw error;
      out.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    return out;
  }

  const db = (LOS.db = {
    /** All rows of the signed-in user, per table (write-only logs are not downloaded). */
    async fetchAll(uid) {
      const tables = LOS.mapper.TABLES.filter((t) => !t.writeOnly).map((t) => t.name);
      const results = await Promise.all(tables.map((t) => fetchTable(t, uid)));
      return Object.fromEntries(tables.map((t, i) => [t, results[i]]));
    },
    async upsert(table, rows) {
      if (!rows.length) return;
      const t = LOS.mapper.BY_NAME[table];
      const { error } = await sb().from(table).upsert(rows, { onConflict: t.conflict, ignoreDuplicates: !!t.writeOnly, defaultToNull: false });
      if (error) throw error;
    },
    /** Delete rows by their natural key (keys are "a|b" strings as produced by mapper.keyOf). */
    async remove(table, keys, uid) {
      if (!keys.length) return;
      const t = LOS.mapper.BY_NAME[table];
      const groups = {};
      keys.forEach((k) => {
        const parts = k.split('|');
        const fixed = parts.slice(0, -1).join('|');
        (groups[fixed] = groups[fixed] || []).push(parts[parts.length - 1]);
      });
      for (const fixed of Object.keys(groups)) {
        const vals = groups[fixed];
        for (let i = 0; i < vals.length; i += 200) {
          let q = sb().from(table).delete().eq('user_id', uid);
          const fixedVals = fixed ? fixed.split('|') : [];
          t.key.slice(0, -1).forEach((col, j) => { q = q.eq(col, fixedVals[j]); });
          const last = t.key[t.key.length - 1];
          q = last === 'user_id' ? q : q.in(last, vals.slice(i, i + 200));
          const { error } = await q;
          if (error) throw error;
        }
      }
    },
  });
})();

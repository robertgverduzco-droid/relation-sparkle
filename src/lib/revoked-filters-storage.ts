/**
 * Shared helpers for the revocation-history filter persistence layer.
 *
 * Filter state is stored in localStorage under per-user namespaced keys
 * (`<base>:<userId>`). Older builds wrote un-namespaced keys (`<base>`),
 * so on every hydration we migrate any surviving legacy values into the
 * current user's namespace and prune orphaned per-user entries whose
 * owning user id no longer has a cached Supabase session in this browser.
 *
 * Consumed by:
 *   - src/routes/_authenticated/interview.tsx (hydrate own filters)
 *   - src/routes/__root.tsx (run on auth state changes)
 */

export const REVOKED_FILTER_BASES = [
  "ri_revoked_search",
  "ri_revoked_filters",
  "ri_revoked_start",
  "ri_revoked_end",
] as const;

export type RevokedFilterBase = (typeof REVOKED_FILTER_BASES)[number];

export function revokedFilterKey(base: RevokedFilterBase, uid: string): string {
  return `${base}:${uid}`;
}

/** Collect user ids Supabase currently has cached sessions for in this browser. */
export function collectKnownSupabaseUserIds(): Set<string> {
  const uids = new Set<string>();
  if (typeof window === "undefined") return uids;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
    try {
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const otherUid = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
      if (typeof otherUid === "string") uids.add(otherUid);
    } catch {
      /* ignore malformed session blobs */
    }
  }
  return uids;
}

/** Move any legacy un-namespaced keys into `<base>:<uid>`, without overwriting. */
export function migrateLegacyRevokedFilters(uid: string): void {
  if (typeof window === "undefined" || !uid) return;
  for (const base of REVOKED_FILTER_BASES) {
    const legacy = window.localStorage.getItem(base);
    if (legacy === null) continue;
    const perUserKey = revokedFilterKey(base, uid);
    if (window.localStorage.getItem(perUserKey) === null) {
      window.localStorage.setItem(perUserKey, legacy);
    }
    window.localStorage.removeItem(base);
  }
}

/**
 * Delete per-user filter entries whose owning user id no longer has a
 * cached Supabase session in this browser. `extraKnownUids` lets callers
 * force-retain the currently active user even before their session is
 * written to localStorage.
 */
export function pruneOrphanedRevokedFilters(extraKnownUids: Iterable<string> = []): void {
  if (typeof window === "undefined") return;
  const known = collectKnownSupabaseUserIds();
  for (const uid of extraKnownUids) if (uid) known.add(uid);
  const toDelete: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    for (const base of REVOKED_FILTER_BASES) {
      const prefix = `${base}:`;
      if (k.startsWith(prefix)) {
        const owner = k.slice(prefix.length);
        if (!known.has(owner)) toDelete.push(k);
        break;
      }
    }
  }
  for (const k of toDelete) window.localStorage.removeItem(k);
}

/**
 * One-shot maintenance run: migrate legacy keys into the given user's
 * namespace (when provided) and prune orphaned per-user entries.
 */
export function reconcileRevokedFilterStorage(uid: string | null): void {
  if (typeof window === "undefined") return;
  if (uid) migrateLegacyRevokedFilters(uid);
  pruneOrphanedRevokedFilters(uid ? [uid] : []);
}

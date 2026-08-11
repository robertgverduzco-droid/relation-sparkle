# Security Documentation

**Privacy & Security Architecture v1.0 is the governing standard.** Start here:

- [ARCHITECTURE-V1.md](./ARCHITECTURE-V1.md) — principles, trust boundaries, encryption, browser hardening, accepted risks
- [DATA-INVENTORY.md](./DATA-INVENTORY.md) — every table, its sensitivity class, who may read it
- [ACCESS-CONTROL.md](./ACCESS-CONTROL.md) — roles, RLS model, administrative access, audit log, consent
- [AI-PRIVACY-BOUNDARY.md](./AI-PRIVACY-BOUNDARY.md) — what reaches a model provider; prompt-injection defence
- [RETENTION-AND-DELETION.md](./RETENTION-AND-DELETION.md) — lifetimes, export, deletion proof
- [INCIDENT-RESPONSE.md](./INCIDENT-RESPONSE.md) — kill switches, severity, notification duty
- [SECURITY-TESTING.md](./SECURITY-TESTING.md) — adversarial probes and results

The sections below remain accurate as the quick reference.

## Access control model


## Access control model
- Auth: Supabase email/password + Google OAuth. Email verification required
  (enforced in `src/routes/_authenticated/route.tsx`).
- Session: Supabase JS client (browser) + `attachSupabaseAuth` client-side
  middleware in `src/start.ts` forwards bearer tokens to protected server fns.
- Server functions using `.middleware([requireSupabaseAuth])` throw 401 without
  a session. Never call them from public route loaders (prerender has no session).

## Roles
- Enum `app_role`: `admin`, `moderator`, `user`.
- Stored in `public.user_roles` (never on profiles). Checked with
  `public.has_role(uuid, app_role)` SECURITY DEFINER function to avoid RLS
  recursion. Moderator UI at `/moderation` gates on this.

## RLS
- Every user-facing public table has RLS ON with explicit `GRANT`s.
- Cross-user reads (matchmaking candidate scans) go through the service-role
  client (`client.server.ts`) — only after verifying an authenticated caller.
- Storage bucket `profile-photos` is private; policies restrict read/write to
  the owning user.

## Data handling
- Post-meeting reflections and partner perception are strictly private to the
  author (RLS enforces `author_id = auth.uid()`).
- Reports and safety flags visible only to moderators.
- **Cross-member private intelligence**: `pair_reasoning` /
  `pair_reasoning_history` hold Athena's internal reasoning derived partly from
  the other member's Living Profile. `authenticated` holds column-level SELECT
  only on member-facing columns (id, user_low, user_high, status, confidence,
  presentation_a/b, presented_to_*_at, timestamps). `reasoning`, `alignments`,
  `complementary`, `frictions`, `hard_conflicts` are unreadable by members at
  the database layer; history is service-role only. Server-side matchmaking
  uses the service-role client and is unaffected.
- **Account deletion** (`src/lib/account.server.ts`) purges the member
  everywhere: profile photos in storage, pseudonymous `athena_outcome_signals`
  rows (recomputed `pair_token` per counterpart), a residual sweep across all
  member-linked tables, then the auth user. Counterpart members keep their own
  rows; `reports.resolved_by` is `ON DELETE SET NULL`.


## Secrets
- Only publishable/anon keys ship to the browser (VITE_* only).
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `LOVABLE_API_KEY` are
  server-side only and read inside server-fn handlers (never at module scope).

## Never
- Store roles on `profiles`.
- Log secrets or session tokens.
- Trust client-side role checks.
- Introduce anonymous auth or auto-confirmed email without an explicit decision.

# Security Documentation

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
- Account deletion cascades user rows via FKs.

## Secrets
- Only publishable/anon keys ship to the browser (VITE_* only).
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `LOVABLE_API_KEY` are
  server-side only and read inside server-fn handlers (never at module scope).

## Never
- Store roles on `profiles`.
- Log secrets or session tokens.
- Trust client-side role checks.
- Introduce anonymous auth or auto-confirmed email without an explicit decision.

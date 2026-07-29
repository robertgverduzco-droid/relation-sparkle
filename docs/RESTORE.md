# Restoring Athena from the Master Archive

Target audience: an experienced full-stack developer with no access to the
original Lovable project.

## 1. Prerequisites

- Node.js 20+ and Bun 1.1+ (project uses `bun.lock`; npm/pnpm also work).
- A Supabase project (self-hosted or hosted). You need URL, anon/publishable
  key, service-role key, and DB connection string.
- A Lovable AI Gateway key **or** an equivalent OpenAI-compatible endpoint
  (Athena calls go through `src/lib/ai-gateway.server.ts` — swap the base URL
  if you're not using Lovable).
- A Cloudflare Workers-compatible host (or any Node host — see step 6).

## 2. Unpack and install

```sh
tar -xzf athena-master-archive.tar.gz
cd athena
cp .env.example .env      # fill values (see comments in file)
bun install               # or: npm install
```

## 3. Provision the database

Apply migrations in filename order — they are timestamped and dependency-ordered:

```sh
# Option A: Supabase CLI
supabase link --project-ref <ref>
supabase db push

# Option B: raw psql
for f in supabase/migrations/*.sql; do psql "$SUPABASE_DB_URL" -f "$f"; done
```

Then regenerate types (only needed if you change schema):

```sh
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## 4. Create the storage bucket

`profile-photos` (private). Via SQL or dashboard:

```sql
insert into storage.buckets (id, name, public) values ('profile-photos','profile-photos', false)
on conflict do nothing;
```

RLS policies for the bucket are included in the migrations.

## 5. Configure auth

- Enable Email provider (email confirmations ON).
- Enable Google OAuth if desired; set redirect to `${SITE_URL}/auth/callback`.
- Do NOT allow anonymous sign-ups.

## 6. Run

```sh
bun run dev      # local dev at http://localhost:8080
bun run build    # production build (Cloudflare Workers target)
```

For non-Cloudflare hosts, adjust the TanStack Start target in `vite.config.ts`.

## 7. Assign your first moderator

```sql
insert into public.user_roles (user_id, role)
values ('<your-auth-user-uuid>', 'moderator');
```

## 8. Verify

- `/auth` sign-up → email verify → `/onboarding` → Athena first meeting.
- After ~20 min conversation, `matches` and `introductions` populate.
- `/moderation` visible to moderator accounts.

## 9. Where to look when something breaks

- Server function errors: check the Worker/host logs; every server fn logs
  through `src/lib/error-capture.ts`.
- AI failures: see `athena_usage_log` and `ai-gateway.server.ts` error path.
- RLS denials: check that the caller's role matches policies in the relevant
  migration file (search `CREATE POLICY` for the table name).

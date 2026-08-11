# Privacy & Security Architecture — Version 1.0

Relationship Intelligence holds material that most systems never hold: a
member's inner life as Athena has come to understand it. The standard for this
architecture is therefore not "typical for a consumer app". It is: a member
should be able to tell Athena something they have not told anyone, and be right
to do so.

Companion documents:
- `DATA-INVENTORY.md` — classification of every table.
- `ACCESS-CONTROL.md` — RLS model, roles, administrative access, audit.
- `AI-PRIVACY-BOUNDARY.md` — what reaches a model provider, and prompt-injection defence.
- `RETENTION-AND-DELETION.md` — lifetimes, export, deletion proof.
- `INCIDENT-RESPONSE.md` — kill switches, severity, notification duties.
- `SECURITY-TESTING.md` — adversarial checks and their results.
- `FOUNDER-DIALOGUE.md` — founder governance channel and its privacy boundary.

## 1. Principles

1. **Compartmentalisation.** No member ever reads another member's Class 4 or 5
   material. Cross-member reasoning exists only server-side under service role.
2. **Least privilege.** Signed-out visitors hold no database privileges at all
   (all `anon` grants revoked). Signed-in members hold only what RLS scopes to
   `auth.uid()`.
3. **Purpose limitation.** Privileged access requires a stated purpose and is
   recorded in `admin_audit_log`.
4. **Minimisation.** We keep understanding, not raw material, wherever
   understanding suffices.
5. **No engagement exploitation.** Sensitive data is never used to increase
   usage. There is no analytics or advertising pipeline in this app.

## 2. Trust boundaries

```text
browser (PWA)
  |  publishable key + member session  -> RLS as that member
  v
TanStack server functions / API routes  (Cloudflare Worker)
  |  requireSupabaseAuth  -> RLS as that member
  |  service role         -> RLS bypassed, cross-member reasoning only
  v
Postgres (RLS, column grants)      AI gateway (no training, no retention)
```

- The browser never holds a service-role key and never sees Class 5 rows.
- `src/routes/api/tts` and `src/routes/api/stt` verify a Supabase bearer token
  before any audio or text leaves the app, and are rate-limited per member.

## 3. Encryption

- **In transit:** TLS everywhere; HSTS with a two-year max-age and preload;
  `upgrade-insecure-requests` in CSP.
- **At rest:** database, storage objects, and backups are encrypted at rest by
  the managed platform. The `profile-photos` bucket is private; objects are
  reachable only through short-lived signed URLs issued server-side.
- **Application-layer:** no member-held encryption keys in v1. Class 5
  protection is enforced by column-level grants and service-role isolation
  rather than field encryption, because Athena must reason over the plaintext.
  Revisit if Athena's reasoning ever moves fully server-local.

## 4. Browser hardening

Applied to every response in `src/server.ts`:
Content-Security-Policy (self + Supabase + AI gateway, `frame-ancestors 'none'`,
`object-src 'none'`), HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, COOP, CORP,
`Permissions-Policy` (microphone and geolocation self-only, camera/payment
denied), and `Cache-Control: private, no-store` by default.

CSRF protection for server functions is enforced by
`createCsrfMiddleware` in `src/start.ts`.

## 5. Logging

`src/lib/security.server.ts` provides `redact()` and `safeLog()`. Secrets are
replaced outright; Class 3-5 content collapses to a length marker. Nothing that
could reconstruct a member's words may be written to console, error capture, or
any observability surface.

## 6. Operational safety

Six kill switches (`security_kill_switches`) allow immediate suspension of
matchmaking, messaging, Athena conversation, sign-up, data export, or
notifications without a deploy. They are read by the corresponding server paths
and are checked before any sensitive processing.

## 7. Accepted risks (v1)

- `public.has_role()` is `SECURITY DEFINER` and executable by signed-in
  members. This is required: RLS policies invoke it as the querying role. It is
  hardened to answer only about the caller, or about anyone when the caller is
  an admin.
- Rate limits are per-worker-instance and therefore approximate; they are a
  speed bump against abuse, not a quota. Durable metering lives in
  `athena_usage_log`.
- Model inference runs at a third-party provider under a no-training,
  no-retention configuration; see AI-PRIVACY-BOUNDARY.md.

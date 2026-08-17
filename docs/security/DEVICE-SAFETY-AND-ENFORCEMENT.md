# Device Safety & Enforcement — v1.0

## F-12 Device safety

A signed-in device alone is never sufficient to destroy, export, or unlock a
member's account.

**Step-up reauthentication** (`src/lib/step-up.server.ts`). The member
re-enters their password; it is verified server-side against Auth with a
throwaway client (their real session is untouched). Success mints a
single-use `step_up_grants` row valid for five minutes, consumed by the
destructive handler. Five attempts per ten minutes. Grants are service-role
only — the browser cannot forge or read one.

Gated actions: account deletion, data export, security changes, sign-out
everywhere.

**Remote sign-out.** `signOutEverywhere` consumes a grant, then calls the Auth
admin global sign-out, invalidating every refresh token on every device.

**Local app lock** (`src/components/app-lock.tsx`). Optional device-local PIN,
hashed with SHA-256 and a random per-device salt in `localStorage`; the PIN
never leaves the device. It re-locks on backgrounding after a two-minute
grace. It is a privacy screen for a shared or borrowed phone — not an
authentication factor, and deliberately independent of the session.

**Biometric unlock (native, deferred).** Face ID / Touch ID is a binding V1
native-readiness requirement recorded in
[NATIVE-READINESS-BIOMETRICS.md](./NATIVE-READINESS-BIOMETRICS.md). It is a
local convenience layer only: no biometric data is ever received or stored, it
never bypasses server auth, RLS, or founder/moderator boundaries, and the PIN
app lock above remains its fallback. Not implemented in the web/PWA build.

Surface: **Profile → Devices & safety** (`src/components/device-safety-panel.tsx`).

## Photo metadata

Uploads are re-encoded through a canvas before leaving the device
(`stripMetadata` in `src/components/photo-uploader.tsx`), discarding EXIF/XMP —
GPS coordinates, capture time, device serial — and capping the long edge at
2000 px. MIME type is restricted to JPEG, PNG, WebP, and HEIC/HEIF.

## Enforcement ladder

`src/lib/enforcement.server.ts` — proportionate response, recorded in
`enforcement_actions`:

| Level | Action | Trigger |
| --- | --- | --- |
| 1 | Warning | first low-severity substantiated report |
| 2 | Restriction | repeat conduct; introductions and new conversations paused |
| 3 | Suspension | high-severity or persistent conduct; access held pending review |
| 4 | Removal | critical conduct; account purged, identifiers hashed and banned |

Severe conduct — threats, coercion, sexual content involving minors,
impersonation for harm — skips the ladder and goes straight to removal.
Removal writes salted hashes of email and phone to `banned_identifiers`
(F-17); no plaintext identifier is retained after the purge. Appeals are
recorded in `enforcement_appeals`.

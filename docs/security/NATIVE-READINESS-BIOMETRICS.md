# Native Readiness — Biometric / Face ID Access (V1 Binding Requirement)

**Status:** Binding requirement · Recorded for the later Capacitor/Xcode
packaging phase · **Not implemented in this pass** · No native packaging
performed.

This document governs biometric unlock for Athena when the application is
packaged as a native iOS (and, by symmetry, Android) client. It is subordinate
to Privacy & Security Architecture v1.0 and to the Athena Constitution.

## 1. What biometric unlock is

Face ID / Touch ID is a **convenience and local-security layer over an already
authenticated Athena account**. It is not an identity system, not an account,
and not an authentication factor recognised by the server.

- Initial account authentication must occur through an approved canonical
  mechanism: Google, Apple / passkey, email, or another approved method.
- Only after a successful authenticated setup may a member optionally enable
  "Unlock Athena with Face ID" (or the appropriate device biometric).
- Members must be able to disable biometric unlock at any time, from the same
  surface where it was enabled (Profile → Devices & safety).

## 2. What Athena must never do

- Never collect, receive, store, reconstruct, derive, or transmit facial
  imagery, biometric templates, biometric vectors, or Face ID data.
- Never implement custom face-recognition or liveness technology.
- Never treat a biometric result as a server-side authentication or
  authorization signal.
- Never persist biometric-derived material in Lovable Cloud, logs, analytics,
  or backups. The only permitted persisted artefact is a device-local boolean
  preference (biometric unlock on/off) plus, where the platform requires it,
  an OS-managed Keychain reference the app cannot read as biometric data.

Verification must use the operating system's secure native mechanism
(`LocalAuthentication` / `LAContext` on iOS, `BiometricPrompt` on Android,
surfaced through the packaging layer's biometric plugin). The app receives only
a success/failure result from the OS.

## 3. Fallback

Where biometrics are unavailable, unenrolled, locked out, or fail:

1. Device passcode authentication (OS-provided), then
2. The existing device-local PIN app lock, then
3. Full Athena account reauthentication.

The member must always retain a path back into their account that does not
depend on biometrics.

## 4. Boundaries preserved

Biometric unlock **must not** bypass or substitute for:

- server-side authentication (Supabase session/bearer token),
- server-side authorization and RLS,
- founder boundaries — Founder Dialogue remains role-authorized server-side via
  `user_roles`/`has_role`; Face ID may unlock a local session but **never**
  grants founder status,
- moderator boundaries,
- step-up reauthentication grants (`src/lib/step-up.server.ts`).

An expired or revoked server session stays expired regardless of a successful
biometric unlock.

## 5. Biometric as step-up (native only)

For high-risk actions already governed by the security architecture — account
deletion, data export, credential/email change, sign-out everywhere, security
settings changes — the native client **may** present a biometric prompt as an
additional local confirmation. It is additive only: the server-side step-up
grant flow remains mandatory and unchanged, and a biometric success alone can
never mint a `step_up_grants` row.

## 6. Web / PWA today

The existing device-local PIN app lock (`src/components/app-lock.tsx`) remains
the current web/PWA local-privacy fallback and is preserved unchanged. It stays
in place after native packaging as the biometric fallback described in §3.

Note: the browser WebAuthn platform authenticator is *not* in scope for this
requirement; if it is ever adopted for local unlock it must satisfy every rule
in §2 and §4 and be recorded separately.

## 7. Doctrine conflict review

No conflict found with existing security or privacy doctrine:

- **ARCHITECTURE-V1** — no new data class is introduced; biometric material is
  never received, so no classification, encryption, or retention duty arises.
- **DEVICE-SAFETY-AND-ENFORCEMENT (F-12)** — consistent: a signed-in device is
  still never sufficient for destructive actions; §5 keeps server step-up
  mandatory.
- **RETENTION-AND-DELETION** — nothing biometric is stored, so nothing
  biometric can survive deletion; the device-local preference is destroyed with
  app data.
- **FOUNDER-DIALOGUE** — §4 explicitly preserves server-side role
  authorization.
- **DECISION-REGISTER L-04** (BIPA and analogues) — this requirement *reduces*
  exposure: Athena stays outside the biometric-processing perimeter because the
  OS performs verification and Athena receives only a boolean.
- **AI-PRIVACY-BOUNDARY** — no biometric or device-sensor data ever enters a
  model prompt.

## 8. Deferred implementation checklist (packaging phase)

- [ ] Add biometric plugin to the Capacitor layer; iOS `NSFaceIDUsageDescription`.
- [ ] Opt-in toggle in `device-safety-panel.tsx`, native-only, default off.
- [ ] Local-only preference storage; disable path clears it.
- [ ] Fallback ladder per §3, including lockout handling.
- [ ] Re-lock on background matching the existing app-lock grace behaviour.
- [ ] Optional biometric confirmation before step-up prompts (§5), additive.
- [ ] Adversarial test: biometric success with a revoked/expired session must
      not restore access; biometric success must not surface founder or
      moderator surfaces.

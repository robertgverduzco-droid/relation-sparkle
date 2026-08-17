# Athena — Membership Experience & Entitlement Architecture (V1)

Status: **Built, not activated.** No billing is live. No payment details are collected.

## 1. Where membership sits in the journey

```
Landing → Create account → Verify email → Basic information →
Meet Athena (foundational conversation) → [Membership] → Today
```

Membership is offered **only after the foundational conversation is complete**.
Athena never introduces cost before she has understood the person. If the member
is already entitled, the membership surface is skipped entirely and completion
returns them to Today.

- Trigger: `finalizeAndLeave()` in `src/routes/_authenticated/athena.tsx`
  reads the server-side entitlement and routes to `/membership` or `/home`.
- Re-entry: a discreet **Membership** entry in the profile menu.
- Nothing expires while a member decides. `/membership` has a plain "Continue"
  that returns to Today without choosing.

## 2. The surface itself

`/membership` (`src/routes/_authenticated/membership.tsx`) is a polished
selection surface, **not a conversation with Athena**. Commerce stays outside
her voice: she does not sell, negotiate, or persuade, and no pricing dialogue is
routed through her.

Doctrine held on this surface:
- No urgency, countdowns, scarcity, discounts, or loss framing.
- No comparison of members, no scores, no engagement mechanics.
- Cancellation stated plainly, and stated to be non-destructive.
- The not-live notice is shown while `BILLING_ACTIVE` is false.

## 3. Configuration-driven placeholders

`src/lib/membership.ts` holds tiers, cadence, price labels, inclusions and
provider product identifiers. All are placeholders (`—`, `null`). Changing the
commercial model must never require touching the entitlement architecture, the
database, or the surface layout.

Two switches, deliberately separate:
- `BILLING_ACTIVE` — may money move at all.
- `MEMBERSHIP_REQUIRED` — is membership an access gate. Kept separate so live
  purchase can be exercised before it is ever enforced.

## 4. Entitlement architecture

Provider-neutral, server-authoritative.

- `public.membership_entitlements` — one row per member: plan, status,
  provider (`none | apple_app_store | web_billing | internal_test`),
  environment, product id, original transaction id, period end, grace window,
  cancel-at-period-end, last verification.
- `public.entitlement_events` — append-only history of every state change with
  the actor that caused it.

Guarantees:
- Members may **read** their own entitlement and history. There is **no**
  INSERT/UPDATE/DELETE grant to `authenticated` on either table — paid state can
  never be granted from a device.
- Status is re-evaluated against time on every read
  (`evaluateEntitlementRow`): an expired period never reports as entitled even
  if the stored row still says `active`.
- Grace and cancel-at-period-end both retain access; revoked never does.
- A database trigger refuses any `internal_test` entitlement marked
  `production`, and refuses one without a recorded reason.
- Roles are not entitlements. Founder and moderator roles grant **no** paid
  access; `requireActiveMembership` consults the entitlement only.

Ready for, without change to the schema: StoreKit purchase + restore, App Store
server notifications, web billing, refunds/revocation, billing retry (grace),
and plan changes.

## 5. Non-billing internal test entitlement

`startInternalTestMembership` grants a time-boxed `internal_test` entitlement,
refused outright when `ATHENA_BILLING_ENV=production`, requiring a recorded
reason, and written to the event log. This is the only way to exercise the
entitled experience before billing exists — there is no password, flag, or
client bypass.

## 6. Founder decisions still required before activation

1. Tier structure, cadence, and price points.
2. Whether membership becomes an access gate (`MEMBERSHIP_REQUIRED`) and what
   an unentitled member still retains.
3. Trial or introductory period, if any.
4. Refund posture beyond store policy.
5. App Store product identifiers and the web billing provider.

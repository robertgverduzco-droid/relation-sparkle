# Subscriptions & Billing Lifecycle

**Status:** Scaffold — content to be finalized when monetization begins.

**Purpose:** Define the states, transitions, and rules for a user’s subscription from sign-up through cancellation or churn.

---

## Guiding Principles

- Users must always be able to cancel or downgrade without friction.
- Graceful degradation: if a subscription lapses, the user retains access to their own data and can re-subscribe.
- Dunning and retry logic must be gentle and transparent.
- Refunds and credits should be handled fairly and documented clearly.

---

## Lifecycle States (Draft)

1. **Trial** — access granted before first charge
2. **Active** — paid and in good standing
3. **Past Due** — payment failed, retry window open
4. **Paused** — user-initiated temporary suspension
5. **Cancelled** — user ended subscription, retains access until period end
6. **Lapsed** — subscription ended, free-tier features only
7. **Churned** — no longer engaged, may be reactivated later

---

## Open Questions

- What is the retry and dunning cadence?
- Should a paused subscription retain entitlements or drop to free?
- How are prorated refunds handled on early cancellation?

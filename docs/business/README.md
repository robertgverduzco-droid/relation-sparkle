# Business Architecture

**Purpose:** Define how Athena’s value is packaged, priced, monetized, and governed commercially. Business Architecture sits between Product and Technical: it translates user-facing value into commercial structures, and those structures into implementation rules.

**Implementation status: ENTITLEMENT ARCHITECTURE IMPLEMENTED, BILLING NOT ACTIVATED.**
Provider-neutral server-side entitlements (`membership_entitlements`), the `/membership`
surface and the entitlement evaluation exist in the runtime. No payment provider is connected
and no money moves: `BILLING_ACTIVE = false`, `MEMBERSHIP_REQUIRED = false`. `athena_usage_log`
records Athena voice/text usage for future billing.

**Design principle:** Revenue must never compromise the Constitution. Every business rule must be checked against L2 Ethics and L7 Operations before it is enacted.

---

## Major Components

| Document | Purpose |
| --- | --- |
| [**V1 Membership Architecture**](v1-membership-architecture.md) | **GOVERNING** (v1.1) — commercial journey, three approved membership levels (M-01…M-05 recorded), tierability, non-tierable rights |
| [Membership Tiers & Entitlements](membership-tiers.md) | Superseded scaffold, retained for history |
| [Pricing & Packaging](pricing-and-packaging.md) | Prices, billing intervals, trial rules, bundles, and promotions |
| [Subscriptions & Billing Lifecycle](subscription-lifecycle.md) | Sign-up, upgrade, downgrade, cancellation, pause, dunning, and refunds |
| [Revenue Rules](revenue-rules.md) | Discounts, referral credits, promotions, and revenue recognition |
| [Account Lifecycle](account-lifecycle.md) | Commercial states, reactivation, churn, and tier-based data retention |
| [Payment Provider Integration](payment-integration.md) | Provider mappings, environment handling, and failover |

---

## Routing Rules

- **Route here when:** Changing plans, pricing, subscriptions, billing, trials, refunds, promotions, or account commercial state.
- **Do not route here when:** Defining a user-facing feature or screen (Product), changing infrastructure (Technical), or changing ethical boundaries (Constitution L2).
- **Cross-domain links:**
  - Product: features gated by tiers must reference the relevant membership tier.
  - Technical: payment provider integration must reference implementation patterns.
  - Constitution L2: any rule that touches user consent, privacy, or dignity must be reviewed against Ethics.
  - Data Architecture: account state and subscription state must be modeled consistently.

---

## Status

The governing commercial rules live in [V1 Membership Architecture](v1-membership-architecture.md).
The remaining documents in this directory are scaffolds pending billing activation.

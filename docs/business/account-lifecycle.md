# Account Lifecycle

**Status:** Scaffold — content to be finalized when monetization begins.

**Purpose:** Define the commercial states of a user account and the rules for activation, retention, reactivation, and data handling.

---

## Guiding Principles

- Users own their data. Account state changes must never destroy data without explicit consent and notice.
- Reactivation should be simple and restore the user’s prior state where possible.
- Commercial account state is separate from auth identity and from relationship status.
- Data retention for lapsed or churned accounts must respect privacy policy and legal requirements.

---

## Account States (Draft)

| State | Description |
| --- | --- |
| Created | Account exists but onboarding is incomplete |
| Active Free | Onboarding complete, free tier |
| Active Premium | Onboarding complete, paying subscriber |
| Past Due | Premium payment failed |
| Paused | Premium subscription temporarily paused |
| Cancelled | Premium subscription ended, still in grace period |
| Lapsed | No active premium subscription, free-tier access only |
| Deactivated | User-requested deactivation, data retained per policy |
| Deleted | User requested deletion, data purged per policy |

---

## Open Questions

- How long is data retained for a lapsed account?
- What happens to active introductions when a user cancels or lapses?
- What is the reactivation flow and grace period for restored entitlements?

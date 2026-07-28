# Payment Provider Integration

**Status:** Scaffold — content to be finalized when monetization begins.

**Purpose:** Define how Athena integrates with payment providers and how environments (test/live) are managed.

---

## Guiding Principles

- Prefer built-in Lovable payment integrations where available.
- All payment logic must be tested in a sandbox environment before going live.
- Provider choice follows the product type and seller-country rules documented in the payments-pre-enable knowledge.
- Webhooks and event handling must be idempotent and verified.

---

## Provider Options (Background)

| Provider | Best For | Notes |
| --- | --- | --- |
| Paddle | Digital products, global tax compliance | Merchant of record by default |
| Stripe | Flexible digital/SaaS billing | Tax handling options vary by seller country |
| Shopify | Physical products or e-commerce | Not expected for Athena unless physical goods are added |

**Note:** Do not present all three as equal options. The actual provider will be chosen by running the eligibility check at enablement time.

---

## Open Questions

- Which provider will Athena use for launch?
- What is the go-live checklist for payment verification?
- How are webhook secrets and signing verified?
- What is the failover or migration plan if the provider changes later?

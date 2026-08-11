// Versioned agreements a member can be asked to accept.
//
// Client-safe: this module is imported by both the consent UI and the server
// enforcement path, so it holds no secrets and no runtime logic.
//
// Doctrine: docs/security/DECISION-REGISTER.md (consent provenance) and
// docs/security/ARCHITECTURE-V1.md §Consent. Each record written to
// `member_consents` must name *which* agreement, at *which* version, at *what*
// time — never one ambiguous universal "I agree".
//
// Rules:
//  - Bump `version` whenever the underlying document changes materially. A
//    member who accepted an older version is then surfaced the new one.
//  - `required: true` blocks entry to the member surfaces until accepted.
//  - Categories whose underlying feature does not exist yet stay `pending`
//    here and are never recorded — we do not simulate consent.

export type ConsentKey =
  | "terms_of_service"
  | "privacy_policy"
  | "ai_understanding"
  | "sensitive_attributes"
  | "outcome_learning"
  | "marketing_email"
  | "payment_terms";

export type ConsentDefinition = {
  key: ConsentKey;
  /** Version of the underlying document or permission semantics. */
  version: string;
  title: string;
  /** Plain-language description shown to the member. */
  description: string;
  /** Must be accepted before the member can use the product. */
  required: boolean;
  /** Member may withdraw it later without leaving the product. */
  withdrawable: boolean;
  /** Route holding the full text, when one exists. */
  documentPath?: string;
  /**
   * `active` — collected today.
   * `pending_feature` — defined, deliberately NOT collected, because the
   * feature it governs does not exist yet. Never write these.
   */
  state: "active" | "pending_feature";
};

/** Bump when the *set* of active agreements changes, for audit correlation. */
export const CONSENT_CATALOGUE_VERSION = "2026-08-11";

export const CONSENT_DEFINITIONS: ConsentDefinition[] = [
  {
    key: "terms_of_service",
    version: "2026-08-11-draft",
    title: "Terms of Membership",
    description:
      "The agreement that governs your membership, including conduct expectations and how membership can end.",
    required: true,
    withdrawable: false,
    documentPath: "/terms",
    state: "active",
  },
  {
    key: "privacy_policy",
    version: "2026-08-11-draft",
    title: "Privacy Notice",
    description:
      "What we hold, why we hold it, who processes it on our behalf, and how you remove it.",
    required: true,
    withdrawable: false,
    documentPath: "/privacy",
    state: "active",
  },
  {
    key: "ai_understanding",
    version: "1.0",
    title: "Athena's understanding of you",
    description:
      "Athena forms and keeps a private understanding of you from your conversations, and uses it to reason about who you might genuinely suit. You can review, change, correct, or remove any part of it.",
    required: true,
    withdrawable: false,
    documentPath: "/privacy",
    state: "active",
  },
  {
    key: "sensitive_attributes",
    version: "1.0",
    title: "Sensitive things you choose to share",
    description:
      "You may tell Athena about health, faith, politics, or sexuality. Sharing is always yours to choose; this permission records that you understand Athena keeps and reasons over what you volunteer. Withdrawing it stops Athena using those areas in her reasoning.",
    required: false,
    withdrawable: true,
    state: "active",
  },
  {
    key: "outcome_learning",
    version: "1.0",
    title: "Helping Athena learn",
    description:
      "Whether the outcomes of your introductions may inform Athena's judgement for other members, in de-identified form. Declining costs you nothing.",
    required: false,
    withdrawable: true,
    state: "active",
  },
  {
    key: "marketing_email",
    version: "0",
    title: "Product email",
    description: "Not collected: the product sends no marketing email today.",
    required: false,
    withdrawable: true,
    state: "pending_feature",
  },
  {
    key: "payment_terms",
    version: "0",
    title: "Billing terms",
    description: "Not collected: no payment system exists yet.",
    required: false,
    withdrawable: true,
    state: "pending_feature",
  },
];

export const ACTIVE_CONSENTS = CONSENT_DEFINITIONS.filter((c) => c.state === "active");
export const REQUIRED_CONSENTS = ACTIVE_CONSENTS.filter((c) => c.required);

export function consentDefinition(key: string): ConsentDefinition | undefined {
  return CONSENT_DEFINITIONS.find((c) => c.key === key);
}

/** Keys that may legitimately be written today. */
export function isRecordableConsent(key: string, version: string): boolean {
  const def = consentDefinition(key);
  return Boolean(def && def.state === "active" && def.version === version);
}

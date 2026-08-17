/**
 * Membership configuration — V1 placeholders.
 *
 * Nothing here is a commitment. Tier names, prices and cadences are
 * configuration, not code: they are expected to change before billing is
 * activated, and changing them must never require touching the entitlement
 * architecture, the membership surface, or the database.
 *
 * BILLING_ACTIVE is the single switch that decides whether the membership
 * surface can actually charge. It stays false for V1: the journey is built,
 * the plumbing is real, no money moves.
 */

export const BILLING_ACTIVE = false as const;

/**
 * When billing is eventually activated, this decides whether membership is
 * *required* to continue. Kept separate from BILLING_ACTIVE so the flow can be
 * exercised live (real purchase) before it is ever enforced (access gate).
 */
export const MEMBERSHIP_REQUIRED = false as const;

export type PlanKey = "monthly" | "annual";

export type MembershipPlan = {
  key: PlanKey;
  name: string;
  cadence: string;
  /** Placeholder. Real display price comes from the store at activation. */
  priceLabel: string;
  priceNote: string | null;
  description: string;
  inclusions: string[];
  /** Provider product identifiers, filled in at activation. */
  productIds: { apple_app_store: string | null; web_billing: string | null };
};

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    key: "monthly",
    name: "Membership",
    cadence: "Monthly",
    priceLabel: "—",
    priceNote: "Pricing is not yet set.",
    description: "Continue with Athena month to month.",
    inclusions: [
      "Continuing conversation with Athena",
      "Introductions when she is genuinely confident",
      "Her attention through the relationship, not only the introduction",
    ],
    productIds: { apple_app_store: null, web_billing: null },
  },
  {
    key: "annual",
    name: "Membership",
    cadence: "Annual",
    priceLabel: "—",
    priceNote: "Pricing is not yet set.",
    description: "The same membership, taken a year at a time.",
    inclusions: [
      "Continuing conversation with Athena",
      "Introductions when she is genuinely confident",
      "Her attention through the relationship, not only the introduction",
    ],
    productIds: { apple_app_store: null, web_billing: null },
  },
];

export function planByKey(key: string | null | undefined): MembershipPlan | null {
  return MEMBERSHIP_PLANS.find((p) => p.key === key) ?? null;
}

/** Member-facing copy. Plain, unhurried, no urgency, no persuasion. */
export const MEMBERSHIP_COPY = {
  title: "Membership",
  lede:
    "Athena now has a foundation for understanding you. Membership is what allows her to keep going — to keep learning, and to introduce you only when she is genuinely confident.",
  reassurance:
    "There is no rush, and nothing expires while you decide. You can leave this page and return to your conversation at any time.",
  notLiveNotice:
    "Membership is not yet open. Nothing will be charged, and no payment details are collected.",
  cancelNote:
    "Membership can be ended at any time from your profile. Ending it does not delete anything you have shared.",
} as const;

export type MembershipStatus =
  | "none"
  | "active"
  | "grace"
  | "canceled_active"
  | "expired"
  | "revoked";

/** Statuses that grant access. Grace and cancel-at-period-end still do. */
export const ENTITLED_STATUSES: MembershipStatus[] = ["active", "grace", "canceled_active"];

export function statusLabel(status: MembershipStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "grace":
      return "Renewing";
    case "canceled_active":
      return "Active until the end of the period";
    case "expired":
      return "Ended";
    case "revoked":
      return "Ended";
    default:
      return "Not a member yet";
  }
}

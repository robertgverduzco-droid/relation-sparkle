import { describe, expect, it } from "vitest";
import { evaluateEntitlementRow, type EntitlementRow } from "./membership.server";
import { BILLING_ACTIVE, MEMBERSHIP_PLANS, MEMBERSHIP_REQUIRED, planByKey } from "./membership";

const base: EntitlementRow = {
  user_id: "u1",
  plan_key: "monthly",
  status: "active",
  provider: "apple_app_store",
  environment: "production",
  product_id: "p",
  billing_period: "month",
  current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
  grace_until: null,
  cancel_at_period_end: false,
  last_verified_at: null,
  grant_reason: null,
  updated_at: new Date().toISOString(),
};

describe("entitlement evaluation", () => {
  it("treats a missing row as not entitled", () => {
    expect(evaluateEntitlementRow(null).entitled).toBe(false);
  });

  it("grants access while the period is current", () => {
    expect(evaluateEntitlementRow(base).entitled).toBe(true);
  });

  it("grants access in billing grace", () => {
    const row = { ...base, status: "grace" as const, current_period_end: null, grace_until: new Date(Date.now() + 3600_000).toISOString() };
    expect(evaluateEntitlementRow(row).entitled).toBe(true);
  });

  it("keeps access after cancellation until the period ends", () => {
    const row = { ...base, status: "canceled_active" as const, cancel_at_period_end: true };
    expect(evaluateEntitlementRow(row).entitled).toBe(true);
  });

  it("expires a period that has run out", () => {
    const row = { ...base, current_period_end: new Date(Date.now() - 1000).toISOString() };
    const e = evaluateEntitlementRow(row);
    expect(e.status).toBe("expired");
    expect(e.entitled).toBe(false);
  });

  it("never grants access on a revoked entitlement", () => {
    expect(evaluateEntitlementRow({ ...base, status: "revoked" }).entitled).toBe(false);
  });

  it("flags internal test grants", () => {
    const e = evaluateEntitlementRow({ ...base, provider: "internal_test", environment: "development" });
    expect(e.isInternalTest).toBe(true);
  });
});

describe("V1 commercial posture", () => {
  it("keeps billing inactive and unenforced", () => {
    expect(BILLING_ACTIVE).toBe(false);
    expect(MEMBERSHIP_REQUIRED).toBe(false);
  });

  it("ships placeholder pricing only", () => {
    for (const plan of MEMBERSHIP_PLANS) {
      expect(plan.priceLabel).toBe("—");
      expect(plan.productIds.apple_app_store).toBeNull();
      expect(plan.productIds.web_billing).toBeNull();
    }
  });

  it("resolves plans by key", () => {
    expect(planByKey("annual")?.cadence).toBe("Annual");
    expect(planByKey("nope")).toBeNull();
  });
});

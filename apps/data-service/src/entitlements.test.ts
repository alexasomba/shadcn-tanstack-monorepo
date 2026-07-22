import {
  entitlementsForPlan,
  hasFeature,
  isActiveSubscriptionStatus,
  normalizePlanFamily,
} from "data-ops";
import { describe, expect, it } from "vite-plus/test";

describe("entitlements", () => {
  it("maps free plan without paid features", () => {
    const e = entitlementsForPlan("free");
    expect(e.isPaid).toBe(false);
    expect(hasFeature(e, "todos")).toBe(true);
    expect(hasFeature(e, "r2")).toBe(false);
    expect(hasFeature(e, "domains")).toBe(false);
    expect(e.seats).toBe(5);
  });

  it("maps pro and pro_yearly to paid features", () => {
    const pro = entitlementsForPlan("pro");
    const yearly = entitlementsForPlan("pro_yearly");
    expect(pro.isPaid).toBe(true);
    expect(hasFeature(pro, "r2")).toBe(true);
    expect(hasFeature(pro, "domains")).toBe(true);
    expect(normalizePlanFamily("pro_yearly")).toBe("pro");
    expect(yearly.seats).toBe(pro.seats);
  });

  it("recognizes active subscription statuses", () => {
    expect(isActiveSubscriptionStatus("active")).toBe(true);
    expect(isActiveSubscriptionStatus("trialing")).toBe(true);
    expect(isActiveSubscriptionStatus("cancelled")).toBe(false);
  });
});

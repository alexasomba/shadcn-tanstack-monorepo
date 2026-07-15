import { describe, expect, it } from "vite-plus/test";

import { setupTestDb, MockR2Bucket, UserOnboardingWorkflow, SentrySpy } from "./helpers";

describe("E2E Test Infrastructure Helpers", () => {
  it("setupTestDb initializes in-memory D1 and applies migrations", async () => {
    const db = await setupTestDb();
    expect(db).toBeDefined();

    // Verify migrations were applied by checking if table 'user' exists
    const res = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user'")
      .first();
    expect(res).toBeDefined();
  });

  it("MockR2Bucket can PUT, GET, and DELETE values", async () => {
    const bucket = new MockR2Bucket();
    const key = "test-file.txt";
    const data = "hello world";

    const putRes = await bucket.put(key, data, {
      customMetadata: { test: "true" },
    });
    expect(putRes.key).toBe(key);
    expect(putRes.size).toBe(data.length);

    const getRes = await bucket.get(key);
    expect(getRes).toBeDefined();
    expect(getRes.customMetadata.test).toBe("true");

    const text = await getRes.text();
    expect(text).toBe(data);

    await bucket.delete(key);
    const getResDeleted = await bucket.get(key);
    expect(getResDeleted).toBeNull();
  });

  it("MockWorkflow executes onboarding steps and traces them", async () => {
    const workflow = new UserOnboardingWorkflow();
    const instance = await workflow.create({ params: { userId: "user-999" } });

    expect(instance.id).toBeDefined();
    const status = await instance.status();
    expect(status.status).toBe("complete");
    expect(instance.stepsRun.length).toBeGreaterThan(0);

    const hasOnboardingStep = instance.stepsRun.some(
      (step) => step.name === "create_user_profile" && step.output?.userId === "user-999",
    );
    expect(hasOnboardingStep).toBe(true);
  });

  it("SentrySpy captures exceptions and messages", () => {
    SentrySpy.clear();
    expect(SentrySpy.exceptions.length).toBe(0);

    const testError = new Error("SaaS expansion test exception");
    SentrySpy.captureException(testError);

    expect(SentrySpy.exceptions.length).toBe(1);
    expect(SentrySpy.exceptions[0].exception).toBe(testError);
  });
});

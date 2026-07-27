import { describe, expect, it, vi } from "vite-plus/test";

import { JOB_TYPES, parseJobMessage, safeParseJobMessage } from "./jobs/catalog";
import { dispatchJob, formatAnalyticsLine } from "./jobs/handlers";
import type { Bindings } from "./types";

describe("M17 job catalog", () => {
  it("lists known job types", () => {
    expect(JOB_TYPES).toContain("ping");
    expect(JOB_TYPES).toContain("email.welcome");
    expect(JOB_TYPES).toContain("billing.reconcile");
    expect(JOB_TYPES).toContain("webhook.deliver");
    expect(JOB_TYPES).toContain("analytics.track");
  });

  it("parses valid ping and rejects unknown types", () => {
    expect(parseJobMessage({ type: "ping", at: "now" }).type).toBe("ping");
    expect(safeParseJobMessage({ type: "not-a-job" }).success).toBe(false);
    expect(safeParseJobMessage({ type: "email.welcome" }).success).toBe(false);
  });

  it("parses product jobs", () => {
    const welcome = parseJobMessage({
      type: "email.welcome",
      userId: "u1",
      email: "a@example.com",
      name: "Alex",
    });
    expect(welcome.type).toBe("email.welcome");

    const webhook = parseJobMessage({
      type: "webhook.deliver",
      url: "https://example.com/hook",
      body: { hello: "world" },
    });
    expect(webhook.type).toBe("webhook.deliver");
  });
});

describe("M17 job handlers", () => {
  it("handles ping", async () => {
    const result = await dispatchJob({ type: "ping", at: "t" }, {} as Bindings);
    expect(result.ok).toBe(true);
    expect(result.detail).toBe("pong");
  });

  it("formats analytics line", () => {
    const line = formatAnalyticsLine({
      type: "analytics.track",
      event: "signup",
      userId: "u1",
      properties: { plan: "free" },
      at: "2026-01-01T00:00:00.000Z",
    });
    const parsed = JSON.parse(line) as { channel: string; event: string };
    expect(parsed.channel).toBe("analytics");
    expect(parsed.event).toBe("signup");
  });

  it("handles analytics.track", async () => {
    const result = await dispatchJob(
      {
        type: "analytics.track",
        event: "checkout.completed",
        organizationId: "org-1",
      },
      {} as Bindings,
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toBe("checkout.completed");
  });

  it("delivers webhook on 2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "ok",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchJob(
      {
        type: "webhook.deliver",
        url: "https://hooks.example.com/x",
        body: { a: 1 },
      },
      {} as Bindings,
    );
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it("retries webhook on non-2xx by throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "fail",
      }),
    );

    await expect(
      dispatchJob(
        {
          type: "webhook.deliver",
          url: "https://hooks.example.com/x",
          body: {},
        },
        {} as Bindings,
      ),
    ).rejects.toThrow(/failed: 500/);

    vi.unstubAllGlobals();
  });
});

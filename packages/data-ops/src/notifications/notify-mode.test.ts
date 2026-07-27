import { describe, expect, it } from "vite-plus/test";

import { hasOnesignalCredentials, resolveNotifyMode } from "./index";

describe("resolveNotifyMode", () => {
  it("uses onesignal when both credentials are present", () => {
    expect(
      resolveNotifyMode({
        ONESIGNAL_APP_ID: "app-uuid",
        ONESIGNAL_API_KEY: "rest-key",
      }),
    ).toBe("onesignal");
    expect(
      hasOnesignalCredentials({
        ONESIGNAL_APP_ID: "app-uuid",
        ONESIGNAL_API_KEY: "rest-key",
      }),
    ).toBe(true);
  });

  it("dry-runs when credentials are missing (no wasted provider HTTP)", () => {
    expect(resolveNotifyMode({})).toBe("dry-run");
    expect(resolveNotifyMode({ ONESIGNAL_APP_ID: "only-app" })).toBe("dry-run");
    expect(hasOnesignalCredentials({})).toBe(false);
  });

  it("honors NOTIFY_DRY_RUN even with credentials", () => {
    expect(
      resolveNotifyMode({
        ONESIGNAL_APP_ID: "app-uuid",
        ONESIGNAL_API_KEY: "rest-key",
        NOTIFY_DRY_RUN: "1",
      }),
    ).toBe("dry-run");
  });

  it("treats blank strings as missing", () => {
    expect(
      resolveNotifyMode({
        ONESIGNAL_APP_ID: "  ",
        ONESIGNAL_API_KEY: "  ",
      }),
    ).toBe("dry-run");
  });
});

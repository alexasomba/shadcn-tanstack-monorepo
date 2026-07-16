import { describe, expect, it } from "vite-plus/test";

import { isAllowedMediaKey, mediaPublicPath, validateMediaUpload } from "./media";

describe("media helpers (M16)", () => {
  it("allows only avatars/ and orgs/ prefixes", () => {
    expect(isAllowedMediaKey("avatars/u1/a.png")).toBe(true);
    expect(isAllowedMediaKey("orgs/o1/logo.png")).toBe(true);
    expect(isAllowedMediaKey("../etc/passwd")).toBe(false);
    expect(isAllowedMediaKey("/avatars/x")).toBe(false);
    expect(isAllowedMediaKey("secrets/key")).toBe(false);
  });

  it("builds public media path with encoded segments", () => {
    expect(mediaPublicPath("avatars/u1/a.png")).toBe("/api/media/avatars/u1/a.png");
  });

  it("validates avatar content type and size", () => {
    expect(validateMediaUpload("avatar", "image/png", 100).ok).toBe(true);
    expect(validateMediaUpload("avatar", "application/pdf", 100).ok).toBe(false);
    expect(validateMediaUpload("avatar", "image/png", 0).ok).toBe(false);
    expect(validateMediaUpload("avatar", "image/png", 2_000_000).ok).toBe(false);
  });

  it("allows svg for org logos only", () => {
    expect(validateMediaUpload("org-logo", "image/svg+xml", 500).ok).toBe(true);
    expect(validateMediaUpload("avatar", "image/svg+xml", 500).ok).toBe(false);
  });
});

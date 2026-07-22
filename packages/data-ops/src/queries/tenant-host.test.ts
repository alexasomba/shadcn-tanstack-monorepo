import { describe, expect, it } from "vite-plus/test";

import { extractPlatformSubdomainSlug, normalizeHostname } from "./tenant-host";

describe("normalizeHostname", () => {
  it("lowercases and strips port / trailing dot", () => {
    expect(normalizeHostname("App.Customer.COM:443")).toBe("app.customer.com");
    expect(normalizeHostname("app.customer.com.")).toBe("app.customer.com");
  });
});

describe("extractPlatformSubdomainSlug", () => {
  const base = "app.example.com";

  it("maps {slug}.base to slug", () => {
    expect(extractPlatformSubdomainSlug("acme.app.example.com", base)).toBe("acme");
    expect(extractPlatformSubdomainSlug("my-org.app.example.com", base)).toBe("my-org");
  });

  it("rejects bare base, nested labels, and invalid slugs", () => {
    expect(extractPlatformSubdomainSlug("app.example.com", base)).toBeNull();
    expect(extractPlatformSubdomainSlug("a.b.app.example.com", base)).toBeNull();
    expect(extractPlatformSubdomainSlug("Acme.app.example.com", base)).toBe("acme");
    expect(extractPlatformSubdomainSlug("not-related.com", base)).toBeNull();
  });
});

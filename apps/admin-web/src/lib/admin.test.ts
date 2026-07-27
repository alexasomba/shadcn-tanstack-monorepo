import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("data-ops", () => ({
  isAdminUser: (
    user: { id: string; role?: string | string[] | null },
    opts: { adminRoles: Array<string>; adminUserIds: Array<string> },
  ) => {
    let roles: Array<string> = [];
    if (Array.isArray(user.role)) {
      roles = user.role;
    } else if (typeof user.role === "string") {
      roles = user.role.split(",");
    }
    if (roles.some((r) => opts.adminRoles.includes(r))) return true;
    return opts.adminUserIds.includes(user.id);
  },
  readAdminUserIds: () => [] as Array<string>,
}));

describe("canAccessAdminConsole (M19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin role", async () => {
    const { canAccessAdminConsole } = await import("./admin");
    expect(canAccessAdminConsole({ id: "u1", role: "admin" })).toBe(true);
  });

  it("denies plain user without impersonation", async () => {
    const { canAccessAdminConsole } = await import("./admin");
    expect(canAccessAdminConsole({ id: "u1", role: "user" })).toBe(false);
  });

  it("allows console while impersonating so admin can stop", async () => {
    const { canAccessAdminConsole } = await import("./admin");
    expect(
      canAccessAdminConsole({ id: "victim", role: "user" }, { impersonatedBy: "admin-id" }),
    ).toBe(true);
  });
});

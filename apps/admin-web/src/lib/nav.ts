import { linkOptions } from "@tanstack/react-router";

/** Type-safe admin console nav. */
export const adminNav = linkOptions([
  { to: "/dashboard", label: "Overview", activeOptions: { exact: true } },
  { to: "/users", label: "Users" },
  { to: "/referrals", label: "Referrals" },
  { to: "/account", label: "Account" },
]);

export const adminDemoNav = linkOptions([
  { to: "/demo/drizzle", label: "Drizzle" },
  { to: "/demo/better-auth", label: "Auth demo" },
  { to: "/demo/ai-chat", label: "AI chat" },
  { to: "/talks", label: "Talks" },
  { to: "/speakers", label: "Speakers" },
]);

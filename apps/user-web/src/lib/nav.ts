import { linkOptions } from "@tanstack/react-router";

/** Type-safe primary marketing nav (router-core linkOptions). */
export const marketingNav = linkOptions([
  { to: "/", label: "Home", activeOptions: { exact: true } },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
]);

export const productNav = linkOptions([
  { to: "/dashboard", label: "Dashboard" },
  { to: "/account", label: "Account" },
  { to: "/talks", label: "Talks" },
  { to: "/speakers", label: "Speakers" },
  { to: "/schedule", label: "Schedule" },
]);

export const demoNav = linkOptions([
  { to: "/demo/ai-chat", label: "AI chat" },
  { to: "/demo/ai-image", label: "AI image" },
  { to: "/demo/ai-structured", label: "Structured AI" },
  { to: "/demo/drizzle", label: "Drizzle" },
  { to: "/demo/table", label: "Table" },
  { to: "/demo/better-auth", label: "Better Auth" },
  { to: "/demo/store", label: "Store" },
  { to: "/demo/tanstack-query", label: "Query" },
  { to: "/demo/form/simple", label: "Form" },
  { to: "/demo/db-chat", label: "DB chat" },
  { to: "/demo/sentry/testing", label: "Sentry" },
  { to: "/demo/i18n", label: "i18n" },
  { to: "/demo/preview", label: "Shadcn Preview" },
  { to: "/demo/typeset", label: "Typeset" },
]);

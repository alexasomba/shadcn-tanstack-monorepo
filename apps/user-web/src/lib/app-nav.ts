import type { Icon } from "@phosphor-icons/react";
import {
  BuildingsIcon,
  CreditCardIcon,
  GearSixIcon,
  HouseIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";

/** App-shell nav targets (protected product routes only). */
export type AppNavItem = {
  to:
    | "/dashboard"
    | "/account"
    | "/settings/organization"
    | "/settings/members"
    | "/settings/billing"
    | "/settings/api-keys"
    | "/settings/security";
  label: string;
  icon: Icon;
  group: "main" | "settings";
};

export const appNavMain: AppNavItem[] = [
  { to: "/dashboard", label: "Overview", icon: HouseIcon, group: "main" },
];

export const appNavSettings: AppNavItem[] = [
  {
    to: "/settings/organization",
    label: "Organization",
    icon: BuildingsIcon,
    group: "settings",
  },
  {
    to: "/settings/members",
    label: "Members",
    icon: UsersThreeIcon,
    group: "settings",
  },
  {
    to: "/settings/billing",
    label: "Billing",
    icon: CreditCardIcon,
    group: "settings",
  },
  {
    to: "/settings/api-keys",
    label: "API Keys",
    icon: KeyIcon,
    group: "settings",
  },
  {
    to: "/settings/security",
    label: "Security",
    icon: ShieldCheckIcon,
    group: "settings",
  },
  {
    to: "/account",
    label: "Account",
    icon: GearSixIcon,
    group: "settings",
  },
];

export const appNavAll: AppNavItem[] = [...appNavMain, ...appNavSettings];

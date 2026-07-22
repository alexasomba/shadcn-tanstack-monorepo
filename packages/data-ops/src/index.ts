export * from "./drizzle/schema/core";
export * from "./drizzle/schema/auth";
export * from "./drizzle/schema/ecommerce";
export * from "./drizzle/schema/crm";
export * from "drizzle-orm";
export {
  createDatabase,
  getDB,
  getDb,
  runInTransaction,
  type Database,
  type DrizzleDb,
  type SQLiteDb,
} from "./database/setup";
export { seedDatabase } from "./database/seed";
export {
  createAuth,
  type Auth,
  type AuthSession,
  type AuthUser,
  type CreateAuthEnv,
  type Session,
} from "./auth/create-auth";
export { createBaseAuthPlugins, readAdminUserIds } from "./auth/plugins";
export {
  createBaseAuthClientPlugins,
  createUserAuthClientPlugins,
  createAdminAuthClientPlugins,
} from "./auth/client-plugins";
export {
  KIT_PAYSTACK_PLANS,
  getPaystackSubscriptionPlans,
  formatMoney,
  type KitPaystackPlan,
} from "./auth/paystack-plans";
export {
  entitlementsForPlan,
  resolveEntitlements,
  hasFeature,
  isActiveSubscriptionStatus,
  normalizePlanFamily,
  listActiveSubscriptions,
  type PlanFeature,
  type PlanEntitlements,
  type ResolvedEntitlements,
} from "./entitlements";
export {
  ensureFreeSubscription,
  applyUserProfileDefaults,
  ensureOrgFreePlanMetadata,
  getUserEmailForOnboarding,
  getOrgForOnboarding,
  countActiveFreeSubscriptions,
  type EnsureFreeSubscriptionResult,
  type UserProfileDefaults,
} from "./queries/billing-onboarding";
export { parseUserRoles, userHasAdminRole, isAdminUser } from "./auth/roles";
export {
  listTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  todoToApi,
  type TodoRow,
} from "./queries/todos";
export {
  listReferralLeaderboard,
  listRecentReferrals,
  countReferrals,
  type ReferralLeaderboardRow,
  type RecentReferralRow,
} from "./queries/referrals";
export {
  enqueueOutboxEvent,
  listPendingOutboxEvents,
  markOutboxEventProcessed,
  type OutboxEventRow,
} from "./queries/outbox";
export {
  TodoSchema,
  TodoCreateSchema,
  TodoUpdateSchema,
  type Todo,
  type TodoCreate,
  type TodoUpdate,
} from "./zod/schema/todos";
export {
  createConsoleMailer,
  createResendMailer,
  createMailerFromEnv,
  type Mailer,
  type SendEmailInput,
} from "./email/mailer";
export { buildRobotsTxt, buildSitemapXml, buildLlmsTxt, type DiscoveryUrl } from "./seo/discovery";
export {
  getNotifyClient,
  hasOnesignalCredentials,
  resolveNotifyMode,
  notificationCatalog,
  type NotificationCatalog,
  type NotifyEnv,
  type NotifyDeliveryMode,
} from "./notifications";
export {
  createInboxNotification,
  type CreateInboxNotificationInput,
  type CreateInboxNotificationResult,
} from "./queries/inbox";
export {
  listDomains,
  getDomainByHostname,
  createDomain,
  updateDomainStatus,
  deleteDomain,
  type DomainRow,
} from "./queries/domains";
export {
  normalizeHostname,
  extractPlatformSubdomainSlug,
  resolveOrganizationByHost,
  listDomainsWithOrganization,
  getOrganizationSlugById,
  countActiveDomainsForOrganization,
  isUserMemberOfOrganization,
  type TenantHostMatch,
  type ResolvedTenant,
  type ResolveTenantOptions,
  type DomainWithOrganization,
} from "./queries/tenant-host";
export {
  DomainSchema,
  DomainCreateSchema,
  type Domain,
  type DomainCreate,
} from "./zod/schema/domains";

// --- CRM Platform Schemas & Queries ---
export * from "./zod/schema/crm-platform";
export * from "./queries/crm-workspace";
export * from "./queries/admin-audit";
export * from "./r2";
export * from "./workflows/onboarding";

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
export { getNotifyClient, notificationCatalog, type NotificationCatalog } from "./notifications";
export {
  listDomains,
  getDomainByHostname,
  createDomain,
  updateDomainStatus,
  deleteDomain,
  type DomainRow,
} from "./queries/domains";
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

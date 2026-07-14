export * from "./schema";
export * from "./auth-schema";
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
export { createBaseAuthPlugins } from "./auth/plugins";
export { createBaseAuthClientPlugins } from "./auth/client-plugins";
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
} from "./zod-schema/todos";
export {
  createConsoleMailer,
  createResendMailer,
  createMailerFromEnv,
  type Mailer,
  type SendEmailInput,
} from "./email/mailer";
export { buildRobotsTxt, buildSitemapXml, buildLlmsTxt, type DiscoveryUrl } from "./seo/discovery";

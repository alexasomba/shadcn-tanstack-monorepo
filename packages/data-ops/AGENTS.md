## Drizzle ORM & Hono OpenAPI Type Safety

- **OpenAPI Schema**: Compose with `.shape` — `z.object(DbSchemaFromOps.shape).openapi("Name")`. Do not directly cast Drizzle-Zod schemas.
- **DRY Types**: Always use `z.infer<typeof Schema>`. Never duplicate schema structures into TS interfaces.
- **Response Signatures**: Avoid status code unions. Use explicit conditional blocks with `success: false as const` for `ErrorSchema`.
- **Centralized DB Types**: Define `DbTodo`, `DbDomain`, etc. in `schema.ts` using `InferSelectModel`/`InferInsertModel`. Import and reuse — do not repeat `typeof table.$inferSelect` casts.

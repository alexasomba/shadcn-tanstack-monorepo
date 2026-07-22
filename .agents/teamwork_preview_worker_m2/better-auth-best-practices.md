# Better Auth Best Practices Skill Copy

(Copied from /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agent/skills/better-auth-best-practices/SKILL.md)

See the source file for full contents. Core guidelines include:

1. Environment variables: BETTER_AUTH_SECRET, BETTER_AUTH_URL.
2. ORM adapters: model names in Better Auth are the model names, not the underlying table names.
3. Plugins: Import from dedicated paths for tree-shaking, e.g., `import { apiKey } from "@better-auth/api-key"` (or `better-auth/plugins/api-key` depending on package layout). Wait, the prompt specified:
   - Install `@better-auth/api-key` version 1.7.0-rc.1 to packages/data-ops.
   - Import `apiKey` from `@better-auth/api-key`.
   - Register `apiKey()` in createBaseAuthPlugins.
4. Schema generation: after changes to plugins, run CLI schema generation commands to update DB structure.
5. verifyApiKey calls should use a sterile headers container (omitting cookies to avoid cookie-fallback session hijacking).

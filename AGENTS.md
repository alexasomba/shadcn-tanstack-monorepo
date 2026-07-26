<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

<!--VITE PLUS END-->

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

## Critical Rules

- **No push = not done.** Never leave a feature in a worktree without pushing.
- **Push hooks must pass.** Manual gates only on skip/disabled.
- **Never stop before pushing.** Push fail → fix + retry. No user ask.
- **Prefer API over SDKs.** Prefer direct HTTP/REST/RPC APIs over client SDK packages.

## Commands

| Task                      | Command                          |
| ------------------------- | -------------------------------- |
| Install deps              | `vp install`                     |
| Dev server                | `vp dev`                         |
| Build                     | `vp build`                       |
| Format + lint + typecheck | `vp check`                       |
| Run tests                 | `vp test`                        |
| Run a script              | `vp run <script>`                |
| Diagnose env              | `vp env doctor`                  |
| Auth codegen              | `vp run auth:generate`           |
| DB schema gen             | `vp run db:generate`             |
| DB migrate (local)        | `vp run db:migrate:local`        |
| Build data-ops            | `vp run --filter data-ops build` |

Run `vp check` and `vp test` before every commit. After wrangler binding changes run `wrangler types`.

## Agent Permissions

| Action                      | Autonomous | Requires confirmation |
| --------------------------- | ---------- | --------------------- |
| Install packages (`vp add`) |            | ✅                    |
| Delete files                |            | ✅                    |
| Schema migrations (prod)    |            | ✅                    |
| Secrets / env changes       |            | ✅                    |

## Package Source Inspection

No local vendoring. Use `opensrc path <package>` + `rg`/`sed`.

- Search: `rg "query" $(opensrc path <package>)`
- Read: `cat $(opensrc path <package>)/path/to/file`

## Cloudflare D1 + data-service

See [docs/architecture.md](./docs/architecture.md) for D1 bindings, service bindings, queries, notifications, and custom domains.

- **Auth plugins** (after changes): `vp run auth:generate` → `vp run db:generate` → `vp run db:migrate:local`.

## TanStack Start Core & Auth Boundaries

- **Isomorphic Loaders**: Route loaders run on BOTH server and client. Server-only logic MUST be in `createServerFn` or `@tanstack/react-start/server`. No Next.js/Remix patterns.
- **Server Utilities Scope**: `getRequest`, `getCookie`, `setCookie` depend on AsyncLocalStorage — only call inside `createServerFn` or server routes.
- **RPC Security**: Private `createServerFn` MUST use `requireAuthMiddleware`. Route `beforeLoad` is UX-only. See `src/lib/auth.middleware.ts` + `*.functions.ts`.

## UI & Component Architecture

See [packages/ui/AGENTS.md](./packages/ui/AGENTS.md) for component layers, Base UI conventions, icon guidelines, and styling standards.

- **Data Fetching & State**: Do NOT use `useEffect` for async data fetching or state synchronization. Use TanStack Query (`useQuery` for reads, `useMutation` for writes) to manage async operations, caching, and state transitions.
  - **Reads vs. Writes**: Use `useQuery` for reads and `useMutation` for writes/mutations.
  - **Query Key Conventions**: Use structured array keys with relevant scoping dependencies (e.g., `["teams", orgId]`, `["passkeys", userId]`).
  - **Cache Invalidation**: Never use state-busting version counters (`useState(0)`); call `queryClient.invalidateQueries({ queryKey: [...] })` inside `useMutation` `onSuccess` handlers.

## Result Pattern

- **`@workspace/result`**: thin wrapper on `better-result`. Domain queries return `Result`; Start server fns `unwrapResult`; data-service handlers use `Result.isError` + `appErrorBody`/`appErrorStatus`. Prefer `@workspace/result` over direct `better-result` imports.

## Testing & TDD

- **Flow**: Red-Green-Refactor before implementation.
- **Coverage**: Acceptance + failure paths on public interfaces; Cloudflare integration via Miniflare or `wrangler dev`.
- **Skills**: `tdd`.

## Drizzle ORM & Hono OpenAPI Type Safety

See [packages/data-ops/AGENTS.md](./packages/data-ops/AGENTS.md) for schema composition, DRY types, and response signature rules.

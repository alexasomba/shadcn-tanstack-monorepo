# Agent Guidelines

## Essentials

- **Typesafety is paramount.** Never cast types; fix at source instead. See [typescript.md](.agents/typescript.md).

## Topic Guides

- [TypeScript Conventions](.agents/typescript.md): Type inference, casting rules, generic naming
- [TanStack Patterns](.agents/tanstack-patterns.md): Loaders, server functions, environment shaking

<!--VITE PLUS START-->

## Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown,
Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend
tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through
`vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for
information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation,
      run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include
      its output when asking for help.

<!--VITE PLUS END-->

## Package Source Inspection

No local vendoring. Use `opensrc path <package>` + `rg`/`sed`.

- Search: `rg "query" $(opensrc path <package>)`
- Read: `cat $(opensrc path <package>)/path/to/file`
- Other registries: `find $(opensrc path pypi:requests) -name "*.py"`

## Ownership

- `apps/user-application`: Prod worker. SaaS UI, APIs, Webhooks, DOs, jobs.
- `apps/admin-application`: Staff/admin platform dashboard, CRM.
- `apps/data-service`: DOs (agents), workflows, queues, crons, APIs.
- `packages/data-ops`: Auth, database schemas, migrations, and DB/DAL access.
- `packages/core`: Shared utilities, generic schemas (e.g. pagination), types, and common
  components.
- `packages/ui`: [@coss/ui library](https://github.com/alexasomba/coss-ui).
  - Primitives (`/coss`) + particle designs (`/coss-particles`). No custom styles.
  - Icons: `@phosphor-icons/react` only (no `lucide-react`).
  - Colors: Tailwind v4 OKLCH theme variables (e.g. `bg-background`). No raw HEX/HSL.
  - Invariants: Keep exact trigger/popup/a11y hierarchies. TanStack Start patterns preferred.
  - Skills: `coss`, `coss-particles`.

## Architecture & Patterns

### TanStack (Preferred)

- Priority: TanStack first. Route -> Router/Start. State -> Query/DB. UI -> Form/Table/Virtual.
- Skills: `start-core`, `router-core`, `db-core`, `react-db`.

### Cloudflare Workers (Preferred)

- CF-native: D1, KV, R2, DOs, Workflows, Queues, Workers AI, Agents SDK, Sandbox.
- Rules: Local test via Miniflare/`wrangler dev` (Node != Workers). Bindings -> `env`/`this.env`.
  Config -> `wrangler.jsonc`. Types -> `cf-typegen`.
- Skills: `cloudflare`, `workers-best-practices`, `wrangler`, `agents-sdk`.

## Development Workflow

### Workspace & Releases

- **Workspaces**: Clean `preview` branch + ephemeral `.worktrees/<type>-<topic>_<purpose>` (detached
  HEAD). No feature branches.
- **CI/Release**: GitHub Actions -> CF Workers. Release Please for CHANGELOG/SemVer/tags.

### Testing & TDD

- **Flow**: Enforce Red-Green-Refactor testing flow before writing implementation.
- **Skills**: `tdd`.

### Landing the Plane (Session Completion)

Done = `git push origin preview` success.

**FLOW (Enforced via .git/config aliases)**

**CRITICAL RULES:**

- No push = not done. Never leave feature in worktree.
- Push hooks must pass. Manual gates only on skip/disabled.
- Never stop before pushing. Push fail -> fix + retry. No user ask.

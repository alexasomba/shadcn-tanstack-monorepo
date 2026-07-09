<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

<!--VITE PLUS END-->

## Package Source Inspection

No local vendoring. Use `opensrc path <package>` + `rg`/`sed`.

- Search: `rg "query" $(opensrc path <package>)`
- Read: `cat $(opensrc path <package>)/path/to/file`
- Other registries: `find $(opensrc path pypi:requests) -name "*.py"`

## Git & Verification Rules

- Never bypass git hooks (e.g., do not use `--no-verify`). Instead, always debug and resolve the underlying issues causing validation or hook failures.

# Workflow Guidelines:
- Issue Tracking: Use GitHub Issues. Meaningful work -> new issue.
- Commits must contain 'Fixes #123' (enforced by commit-msg hook).
- Worktree default convention: git ltp-setup <type>-<topic>_<purpose>
- Inspect status and compare with remote preview: `ltp-inspect`
- Save uncommitted changes to a temp worktree: `ltp-checkpoint`
- Setup a fresh ephemeral worktree from origin/preview using name convention: <type>-<topic>_<purpose>: `ltp-setup`
- Squash-merge worktree commits and commit (with optional issue number): `ltp-merge`
- Sync local preview with remote preview (FF only): `ltp-sync`
- Push preview: `ltp-push`
- Clean up a worktree safely: `ltp-cleanup`

## Testing & TDD

- **Flow**: Enforce Red-Green-Refactor testing flow before writing implementation.
- **Coverage**: Map changed acceptance scenarios and failure paths to deterministic public-interface
  tests. Test Cloudflare-dependent integration behavior with Miniflare or `wrangler dev`.
- **Skills**: `tdd`.
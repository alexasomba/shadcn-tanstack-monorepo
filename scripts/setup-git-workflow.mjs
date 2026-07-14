#!/usr/bin/env node

/**
 * Clone-local Git config for multi-agent worktrees (see AGENTS.md).
 *
 * SoT for: core.hooksPath, ltp-* aliases, commit.template, POLICY_HOOKS.
 * AGENTS.md keeps agent-facing rules only — do not re-list config keys there.
 *
 * Policy hooks (scripts in .vite-hooks/): pre-commit | post-checkout | pre-push | pre-rebase
 */

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function git(args, options = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: "pipe", ...options });
  if (result.status !== 0 && !options.allowFail) {
    process.stderr.write(result.stderr || result.stdout || `git ${args.join(" ")} failed\n`);
    process.exit(result.status ?? 1);
  }
  return (result.stdout || "").trim();
}

const root = git(["rev-parse", "--show-toplevel"]);

/** Policy hooks only — must match scripts present under .vite-hooks/. */
const POLICY_HOOKS = ["pre-commit", "post-checkout", "pre-push", "pre-rebase"];

/** Worktree CLI aliases (multi-agent workflow). */
const ALIASES = {
  "ltp-setup": "!pnpm run worktree:create",
  "ltp-merge": "!pnpm run worktree:merge",
  "ltp-cleanup": "!pnpm run worktree:cleanup",
  "ltp-list": "!pnpm run worktree:list",
};

/** Legacy aliases removed so they don't fight the worktree model. */
const REMOVE_ALIASES = ["ltp-checkpoint", "ltp-inspect", "ltp-push", "ltp-sync"];

const hooksDir = join(root, ".vite-hooks");
const wrapperDirectory = join(hooksDir, "_");
const wrapper = '#!/usr/bin/env sh\n. "$(dirname "$0")/h"\n';

// Ensure policy hook scripts exist and are executable.
for (const hook of POLICY_HOOKS) {
  const script = join(hooksDir, hook);
  if (!existsSync(script)) {
    console.error(`ERROR: missing policy hook script: .vite-hooks/${hook}`);
    process.exit(1);
  }
  chmodSync(script, 0o755);
}

// Remove obsolete/no-op hook scripts so policy stays clear.
for (const name of readdirSync(hooksDir)) {
  if (name === "_" || name.startsWith(".")) continue;
  if (POLICY_HOOKS.includes(name)) continue;
  const path = join(hooksDir, name);
  try {
    unlinkSync(path);
    console.log(`Removed non-policy hook: .vite-hooks/${name}`);
  } catch {
    // ignore
  }
}

// Generate wrappers only for policy hooks.
mkdirSync(wrapperDirectory, { recursive: true });
for (const name of readdirSync(wrapperDirectory)) {
  if (name === "h" || name === ".gitignore") continue;
  if (!POLICY_HOOKS.includes(name)) {
    try {
      unlinkSync(join(wrapperDirectory, name));
    } catch {
      // ignore
    }
  }
}
for (const hook of POLICY_HOOKS) {
  const path = join(wrapperDirectory, hook);
  writeFileSync(path, wrapper);
  chmodSync(path, 0o755);
}

// --- git config (local only) ---
git(["config", "--local", "core.hooksPath", ".vite-hooks/_"]);

if (existsSync(join(root, ".gitmessage"))) {
  git(["config", "--local", "commit.template", ".gitmessage"]);
}

for (const name of REMOVE_ALIASES) {
  spawnSync("git", ["config", "--local", "--unset-all", `alias.${name}`], { stdio: "ignore" });
}
for (const [name, command] of Object.entries(ALIASES)) {
  git(["config", "--local", `alias.${name}`, command]);
}

// Helpful identity of the model (not enforced).
git(["config", "--local", "ltp.workflow", "multi-agent-worktrees"]);

console.log(`Aligned multi-agent Git:
  core.hooksPath = .vite-hooks/_
  policy hooks   = ${POLICY_HOOKS.join(", ")}
  aliases        = ${Object.keys(ALIASES).join(", ")}
  (agent policy: AGENTS.md → Multi-agent Git)`);

#!/usr/bin/env node

/**
 * Multi-agent–safe worktree workflow (no feature branches).
 *
 * Why worktrees (not branches) for multi-agent:
 * - Parallel agents each get an isolated directory + index (no shared dirty tree / stash wars).
 * - Detached HEADs avoid racing feature-branch pushes and history rewrites.
 * - Integration is serialized: squash onto preview only when that checkout is clean.
 *
 * Primary checkout stays on `preview` (dirty OK when creating — no stash).
 * Feature work lives in .worktrees/<type>-<topic>_<purpose> (unique name per agent/task).
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const command = process.argv.at(2);
const args = process.argv.slice(3);
const worktreeName =
  /^(feat|fix|chore|docs|refactor|test|style|ci|perf)-[a-z0-9]+(?:-[a-z0-9]+)*_[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function git(args, options = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: "pipe", ...options });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || `git ${args.join(" ")} failed\n`);
    process.exit(result.status ?? 1);
  }
  return options.stdio === "inherit" ? "" : result.stdout.trim();
}

function gitSucceeds(args, options = {}) {
  return spawnSync("git", args, { encoding: "utf8", stdio: "pipe", ...options }).status === 0;
}

function repositoryRoot() {
  return git(["rev-parse", "--show-toplevel"]);
}

function pathFor(root, name) {
  if (!worktreeName.test(name)) {
    fail(
      "Worktree name must match <type>-<topic>_<purpose> (lowercase letters, numbers, hyphens).\n" +
        "  e.g. feat-billing_checkout",
    );
  }
  return resolve(root, ".worktrees", name);
}

function ensurePreviewRoot(root) {
  const branch = git(["-C", root, "branch", "--show-current"]);
  if (branch !== "preview") {
    fail(
      `Run this from the primary preview checkout (got '${branch || "detached HEAD"}').\n` +
        "  git switch preview",
    );
  }
}

function ensureClean(path, label) {
  if (git(["-C", path, "status", "--porcelain"])) {
    fail(`${label} has uncommitted changes. Commit or discard them first (no stash workflow).`);
  }
}

function ensureNoMerge(root) {
  const mergeHead = git(["-C", root, "rev-parse", "--git-path", "MERGE_HEAD"]);
  if (existsSync(resolve(root, mergeHead))) fail("A merge is already in progress.");
}

function synchronizePreview(root, environment) {
  git(["-C", root, "fetch", "origin", "preview"], { stdio: "inherit" });
  const localPreview = git(["-C", root, "rev-parse", "HEAD"]);
  const remotePreview = git(["-C", root, "rev-parse", "origin/preview"]);
  if (localPreview === remotePreview) return remotePreview;
  if (!gitSucceeds(["-C", root, "merge-base", "--is-ancestor", localPreview, remotePreview])) {
    fail("Local preview has commits that are not on origin/preview. Resolve that before merging.");
  }
  git(["-C", root, "merge", "--ff-only", "origin/preview"], {
    env: environment,
    stdio: "inherit",
  });
  return remotePreview;
}

function pushPreviewWithLease(root, expectedRemotePreview, rollbackHead) {
  const result = spawnSync(
    "git",
    [
      "-C",
      root,
      "push",
      "origin",
      "HEAD:refs/heads/preview",
      `--force-with-lease=refs/heads/preview:${expectedRemotePreview}`,
    ],
    { encoding: "utf8", stdio: "pipe" },
  );
  if (result.status === 0) return;
  git(["-C", root, "reset", "--hard", rollbackHead], { stdio: "inherit" });
  process.stderr.write(result.stderr || result.stdout);
  fail(
    "origin/preview advanced during the merge. Local squash was rolled back; update the worktree and retry.",
  );
}

function usage() {
  console.log(`Multi-agent–safe worktrees (no feature branches)

  pnpm worktree:create <type>-<topic>_<purpose>
  pnpm worktree:merge  <name> --message "<type>: <summary> Fixes #N"
  pnpm worktree:cleanup <name> [--force]
  pnpm worktree:list

  # aliases after git:setup:
  git ltp-setup | ltp-merge | ltp-cleanup | ltp-list

Each agent/task → its own .worktrees/<name> (detached HEAD).
Primary checkout stays on preview (dirty OK on create — no stash).
Parallel agents: use unique purpose suffixes (e.g. feat-x_y-agent2).`);
}

function option(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

if (!command) {
  usage();
  process.exit(0);
}

switch (command) {
  case "create": {
    const [name] = args;
    if (!name) fail("A worktree name is required.");
    const root = repositoryRoot();
    const worktreePath = pathFor(root, name);
    ensurePreviewRoot(root);
    // Intentionally NOT requiring a clean preview — dirty files stay on preview;
    // the new worktree is a clean detached checkout of current HEAD. No stash.
    ensureNoMerge(root);
    if (existsSync(worktreePath)) fail(`Worktree path already exists: ${worktreePath}`);
    git(["worktree", "add", "--detach", worktreePath, "HEAD"], { stdio: "inherit" });
    console.log(`Created detached worktree: ${worktreePath}`);
    console.log(`cd ${worktreePath}`);
    break;
  }
  case "merge": {
    const [name] = args;
    const message = option("--message");
    if (!name || !message) fail('merge requires <name> and --message "...".');
    const root = repositoryRoot();
    ensurePreviewRoot(root);
    // Preview must be clean to squash-merge; do work only in the worktree.
    ensureClean(root, "Primary preview checkout");
    ensureNoMerge(root);
    const worktreePath = pathFor(root, name);
    if (!existsSync(worktreePath)) fail(`Worktree does not exist: ${worktreePath}`);
    ensureClean(worktreePath, `Worktree '${name}'`);
    const automatedMergeEnvironment = { ...process.env, LTP_AUTOMATED_MERGE: "1" };
    const remotePreview = synchronizePreview(root, automatedMergeEnvironment);
    const head = git(["-C", worktreePath, "rev-parse", "HEAD"]);
    if (!gitSucceeds(["-C", root, "merge-base", "--is-ancestor", "HEAD", head])) {
      fail(`Worktree '${name}' does not contain current preview. Recreate it before merging.`);
    }
    git(["merge", "--squash", head], {
      env: automatedMergeEnvironment,
      stdio: "inherit",
    });
    git(["commit", "-m", message], {
      env: automatedMergeEnvironment,
      stdio: "inherit",
    });
    pushPreviewWithLease(root, remotePreview, remotePreview);
    console.log(`Merged '${name}' into preview and pushed.`);
    break;
  }
  case "cleanup": {
    const [name] = args;
    if (!name) fail("A worktree name is required.");
    const root = repositoryRoot();
    const worktreePath = pathFor(root, name);
    git(["worktree", "remove", ...(args.includes("--force") ? ["--force"] : []), worktreePath], {
      stdio: "inherit",
    });
    git(["worktree", "prune"], { stdio: "inherit" });
    break;
  }
  case "list": {
    git(["worktree", "list"], { stdio: "inherit" });
    break;
  }
  case "help":
  case "--help":
  case "-h":
    usage();
    break;
  default:
    fail(`Unknown command: ${command}\n`);
}

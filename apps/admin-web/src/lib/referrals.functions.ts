import { createServerFn } from "@tanstack/react-start";
import { unwrapResult } from "@workspace/result";
import {
  countReferrals,
  createDatabase,
  listRecentReferrals,
  listReferralLeaderboard,
} from "data-ops";

import { requireAdminMiddleware } from "./auth.middleware";
import { getDatabase } from "./cloudflare-env";

/** Read-only referral stats for internal admin console (user growth attribution). */
export const getReferralOverview = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const db = createDatabase(getDatabase());
    const [total, leaderboard, recent] = await Promise.all([
      countReferrals(db),
      listReferralLeaderboard(db, 25),
      listRecentReferrals(db, 40),
    ]);

    return {
      total: unwrapResult(total),
      leaderboard: unwrapResult(leaderboard),
      recent: unwrapResult(recent).map((row) => ({
        ...row,
        createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      })),
    };
  });

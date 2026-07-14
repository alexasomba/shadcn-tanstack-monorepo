import type { DatabaseError} from "@workspace/result";
import { Result, databaseError } from "@workspace/result";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import { referralCode, referrals, user } from "../auth-schema";
import type { Database } from "../database/setup";

export type ReferralLeaderboardRow = {
  referrerUserId: string;
  referrerName: string | null;
  referrerEmail: string;
  totalReferrals: number;
  code: string | null;
};

export type RecentReferralRow = {
  id: string;
  createdAt: Date | null;
  referrerUserId: string;
  referrerEmail: string;
  referredUserId: string;
  referredEmail: string;
  code: string | null;
};

/** Admin overview: top referrers by count. */
export async function listReferralLeaderboard(
  db: Database,
  limit = 25,
): Promise<Result<Array<ReferralLeaderboardRow>, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const rows = await db
        .select({
          referrerUserId: referrals.referrerUserId,
          referrerName: user.name,
          referrerEmail: user.email,
          totalReferrals: sql<number>`count(*)`.mapWith(Number),
          code: referralCode.code,
        })
        .from(referrals)
        .innerJoin(user, eq(user.id, referrals.referrerUserId))
        .leftJoin(referralCode, eq(referralCode.userId, referrals.referrerUserId))
        .groupBy(referrals.referrerUserId, user.name, user.email, referralCode.code)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);

      return rows;
    },
    catch: (cause) => databaseError("listReferralLeaderboard", cause),
  });
}

/** Admin overview: most recent referral edges. */
export async function listRecentReferrals(
  db: Database,
  limit = 50,
): Promise<Result<Array<RecentReferralRow>, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const referrer = alias(user, "referrer_user");
      const referred = alias(user, "referred_user");

      const rows = await db
        .select({
          id: referrals.id,
          createdAt: referrals.createdAt,
          referrerUserId: referrals.referrerUserId,
          referrerEmail: referrer.email,
          referredUserId: referrals.referredUserId,
          referredEmail: referred.email,
          code: referralCode.code,
        })
        .from(referrals)
        .innerJoin(referrer, eq(referrer.id, referrals.referrerUserId))
        .innerJoin(referred, eq(referred.id, referrals.referredUserId))
        .leftJoin(referralCode, eq(referralCode.id, referrals.referralCodeId))
        .orderBy(desc(referrals.createdAt))
        .limit(limit);

      return rows;
    },
    catch: (cause) => databaseError("listRecentReferrals", cause),
  });
}

export async function countReferrals(db: Database): Promise<Result<number, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const [row] = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(referrals);
      return row?.count ?? 0;
    },
    catch: (cause) => databaseError("countReferrals", cause),
  });
}

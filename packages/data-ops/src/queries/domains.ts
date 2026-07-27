import type { DatabaseError, NotFoundError, ValidationError } from "@workspace/result";
import { Result, databaseError, notFound, validation } from "@workspace/result";
import { eq } from "drizzle-orm";

import type { Database } from "../database/setup";
import { domains } from "../drizzle/schema/core";
import type { DbDomain } from "../drizzle/schema/core";

export type DomainRow = DbDomain;

export async function listDomains(
  db: Database,
  organizationId: string,
): Promise<Result<Array<DomainRow>, DatabaseError>> {
  return Result.tryPromise({
    try: () =>
      db.query.domains.findMany({
        where: { organizationId },
      }),
    catch: (cause) => databaseError("listDomains", cause),
  });
}

export async function getDomainByHostname(
  db: Database,
  hostname: string,
): Promise<Result<DomainRow, DatabaseError | NotFoundError>> {
  const found = await Result.tryPromise({
    try: () =>
      db.query.domains.findFirst({
        where: { hostname },
      }),
    catch: (cause) => databaseError("getDomainByHostname", cause),
  });

  return found.andThen((row) => (row ? Result.ok(row) : Result.err(notFound("Domain", hostname))));
}

export async function createDomain(
  db: Database,
  organizationId: string,
  hostname: string,
): Promise<Result<DomainRow, DatabaseError | ValidationError>> {
  const trimmed = hostname.trim().toLowerCase();
  if (!trimmed) {
    return Result.err(validation("Hostname is required", "hostname"));
  }

  const id = crypto.randomUUID();

  return Result.tryPromise({
    try: async () => {
      const rows = await db
        .insert(domains)
        .values({
          id,
          organizationId,
          hostname: trimmed,
          status: "pending",
        })
        .returning();
      return rows[0];
    },
    catch: (cause) => databaseError("createDomain", cause),
  });
}

export async function updateDomainStatus(
  db: Database,
  hostname: string,
  status: string,
): Promise<Result<DomainRow, DatabaseError | NotFoundError>> {
  const updated = await Result.tryPromise({
    try: async () => {
      const [row] = await db
        .update(domains)
        .set({ status })
        .where(eq(domains.hostname, hostname))
        .returning();
      return row;
    },
    catch: (cause) => databaseError("updateDomainStatus", cause),
  });

  return updated.andThen((row) => {
    const domainRow = row as DomainRow | undefined;
    if (!domainRow) {
      return Result.err(notFound("Domain", hostname));
    }
    return Result.ok(domainRow);
  });
}

export async function deleteDomain(
  db: Database,
  hostname: string,
): Promise<Result<true, DatabaseError | NotFoundError>> {
  const deleted = await Result.tryPromise({
    try: async () => {
      const result = await db
        .delete(domains)
        .where(eq(domains.hostname, hostname))
        .returning({ id: domains.id });
      return result.length > 0;
    },
    catch: (cause) => databaseError("deleteDomain", cause),
  });

  return deleted.andThen((ok) =>
    ok ? Result.ok(true as const) : Result.err(notFound("Domain", hostname)),
  );
}

const entityKind = Symbol.for("drizzle:entityKind");

export class PgDatabase {
  static [entityKind] = "PgDatabase";
}

export class PgTable {
  static [entityKind] = "PgTable";
}

export function getTableConfig() {}

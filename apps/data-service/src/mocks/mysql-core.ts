const entityKind = Symbol.for("drizzle:entityKind");

export class MySqlDatabase {
  static [entityKind] = "MySqlDatabase";
}

export class MySqlTable {
  static [entityKind] = "MySqlTable";
}

export function getTableConfig() {}

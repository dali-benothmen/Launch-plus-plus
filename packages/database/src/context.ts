import type BetterSqlite3 from "better-sqlite3";
import type { ReadContext, WriteContext } from "@launchpp/core";

class SqliteReadContext implements ReadContext {
  constructor(
    readonly transactionId: string,
    readonly connection: BetterSqlite3.Database,
  ) {}
}

export class SqliteWriteContext extends SqliteReadContext implements WriteContext {
  readonly writable = true as const;
}

export function createReadContext(transactionId: string, connection: BetterSqlite3.Database) {
  return new SqliteReadContext(transactionId, connection);
}

export function requireSqliteConnection(context: ReadContext): BetterSqlite3.Database {
  if (!(context instanceof SqliteReadContext)) {
    throw new TypeError("The transaction context does not belong to the SQLite adapter");
  }
  return context.connection;
}

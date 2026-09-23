import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { TransactionManager } from "@launchpp/core";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createReadContext, SqliteWriteContext } from "./context.js";
import { defaultMigrationsFolder, runMigrations } from "./migrations.js";
import { databaseSchema } from "./schema.js";

export interface OpenSqliteDatabaseOptions {
  readonly busyTimeoutMs?: number;
  readonly filePath: string;
  readonly migrationsFolder?: string;
}

interface ForeignKeyViolation {
  readonly fkid: number;
  readonly parent: string;
  readonly rowid: number | null;
  readonly table: string;
}

function configureConnection(connection: Database.Database, busyTimeoutMs: number): void {
  connection.pragma("foreign_keys = ON");
  connection.pragma(`busy_timeout = ${busyTimeoutMs}`);
}

function migrateConnection(connection: Database.Database, migrationsFolder: string): void {
  const orm = drizzle(connection, { schema: databaseSchema });

  // SQLite cannot change foreign-key enforcement from inside the transaction
  // used by Drizzle's migrator. Schema migrations that rebuild referenced
  // tables therefore need enforcement suspended before that transaction starts.
  connection.pragma("foreign_keys = OFF");
  try {
    runMigrations(orm, migrationsFolder);

    const violations = connection.pragma("foreign_key_check") as ForeignKeyViolation[];
    if (violations.length > 0) {
      throw new Error(
        `Database migration produced ${violations.length} foreign-key violation${violations.length === 1 ? "" : "s"}`,
      );
    }
  } finally {
    connection.pragma("foreign_keys = ON");
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

export class SqliteDatabase implements TransactionManager {
  readonly journalMode: string;
  private acceptingWork = true;
  private closePromise: Promise<void> | undefined;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly writer: Database.Database,
    private readonly reader: Database.Database,
  ) {
    this.journalMode = String(writer.pragma("journal_mode", { simple: true }));
  }

  read<TResult>(work: (context: ReturnType<typeof createReadContext>) => TResult): TResult {
    if (!this.acceptingWork) throw new Error("SQLite database is closing or closed");
    return work(createReadContext(randomUUID(), this.reader));
  }

  write<TResult>(work: (context: SqliteWriteContext) => TResult): Promise<TResult> {
    if (!this.acceptingWork)
      return Promise.reject(new Error("SQLite database is closing or closed"));

    const operation = this.writeQueue.then(() => {
      const transaction = this.writer.transaction(() => {
        const result = work(new SqliteWriteContext(randomUUID(), this.writer));
        if (isPromiseLike(result)) {
          throw new TypeError("SQLite transaction callbacks must be synchronous");
        }
        return result;
      });
      return transaction.immediate();
    });

    this.writeQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.acceptingWork = false;
    this.closePromise = this.writeQueue.then(() => {
      try {
        this.reader.close();
      } finally {
        this.writer.close();
      }
    });
    return this.closePromise;
  }
}

export function openSqliteDatabase(options: OpenSqliteDatabaseOptions): SqliteDatabase {
  if (options.filePath === ":memory:") {
    throw new TypeError("The persistence adapter requires a file-backed SQLite database");
  }

  const busyTimeoutMs = options.busyTimeoutMs ?? 5_000;
  if (!Number.isSafeInteger(busyTimeoutMs) || busyTimeoutMs < 0 || busyTimeoutMs > 120_000) {
    throw new TypeError("busyTimeoutMs must be an integer from 0 through 120000");
  }

  mkdirSync(path.dirname(path.resolve(options.filePath)), { recursive: true });
  const writer = new Database(options.filePath);
  let reader: Database.Database | undefined;

  try {
    configureConnection(writer, busyTimeoutMs);
    const journalMode = String(writer.pragma("journal_mode = WAL", { simple: true }));
    if (journalMode.toLowerCase() !== "wal") {
      throw new Error(`SQLite WAL mode is unavailable (received ${journalMode})`);
    }
    writer.pragma("synchronous = NORMAL");

    migrateConnection(writer, options.migrationsFolder ?? defaultMigrationsFolder);

    reader = new Database(options.filePath, { fileMustExist: true, readonly: true });
    configureConnection(reader, busyTimeoutMs);
    reader.pragma("query_only = ON");
    return new SqliteDatabase(writer, reader);
  } catch (error) {
    reader?.close();
    writer.close();
    throw error;
  }
}

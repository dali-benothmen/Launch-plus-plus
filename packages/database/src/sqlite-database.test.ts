import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { requireSqliteConnection } from "./context.js";
import { SqliteInstallationRepository } from "./installation-repository.js";
import { defaultMigrationsFolder } from "./migrations.js";
import { SqliteOutboxRepository } from "./outbox-repository.js";
import { openSqliteDatabase, type SqliteDatabase } from "./sqlite-database.js";

const temporaryRoots: string[] = [];
const openDatabases: SqliteDatabase[] = [];

async function createDatabase() {
  const root = await mkdtemp(path.join(tmpdir(), "launchpp-database-"));
  temporaryRoots.push(root);
  const database = openSqliteDatabase({ filePath: path.join(root, "launchpp.sqlite") });
  openDatabases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((database) => database.close()));
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })));
});

describe("SQLite persistence foundation", () => {
  it("enables WAL, foreign keys, query-only reads, and the configured busy timeout", async () => {
    const database = await createDatabase();

    expect(database.journalMode).toBe("wal");
    const pragmas = database.read((context) => {
      const connection = requireSqliteConnection(context);
      return {
        busyTimeout: connection.pragma("busy_timeout", { simple: true }),
        foreignKeys: connection.pragma("foreign_keys", { simple: true }),
        queryOnly: connection.pragma("query_only", { simple: true }),
      };
    });
    expect(pragmas).toEqual({ busyTimeout: 5000, foreignKeys: 1, queryOnly: 1 });
  });

  it("commits an installation and its outbox fact atomically", async () => {
    const database = await createDatabase();
    const installations = new SqliteInstallationRepository();
    const outbox = new SqliteOutboxRepository();

    await database.write((context) => {
      installations.create(context, { createdAt: 1_000, id: "installation-1" });
      outbox.append(context, {
        availableAt: 1_000,
        correlationId: "request-1",
        id: "event-1",
        installationId: "installation-1",
        occurredAt: 1_000,
        payload: { installationId: "installation-1" },
        topic: "installation.created",
      });
    });

    database.read((context) => {
      expect(installations.findById(context, "installation-1")).toEqual({
        createdAt: 1_000,
        id: "installation-1",
      });
      expect(outbox.countPending(context)).toBe(1);
    });
  });

  it("rolls back domain and outbox writes together", async () => {
    const database = await createDatabase();
    const installations = new SqliteInstallationRepository();
    const outbox = new SqliteOutboxRepository();

    await expect(
      database.write((context) => {
        installations.create(context, { createdAt: 2_000, id: "rolled-back" });
        outbox.append(context, {
          availableAt: 2_000,
          correlationId: "request-2",
          id: "event-2",
          installationId: "rolled-back",
          occurredAt: 2_000,
          payload: {},
          topic: "installation.created",
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrowError("force rollback");

    database.read((context) => {
      expect(installations.findById(context, "rolled-back")).toBeUndefined();
      expect(outbox.countPending(context)).toBe(0);
    });
  });

  it("allows a reader to observe the last committed snapshot during a write", async () => {
    const database = await createDatabase();
    const installations = new SqliteInstallationRepository();

    await database.write((writeContext) => {
      installations.create(writeContext, { createdAt: 3_000, id: "pending" });
      const concurrentView = database.read((readContext) =>
        installations.findById(readContext, "pending"),
      );
      expect(concurrentView).toBeUndefined();
    });

    expect(database.read((context) => installations.findById(context, "pending"))).toBeDefined();
  });

  it("serializes queued writes and rejects async transaction callbacks", async () => {
    const database = await createDatabase();
    const order: string[] = [];

    const first = database.write(() => {
      order.push("first");
    });
    const second = database.write(() => {
      order.push("second");
    });
    await Promise.all([first, second]);
    expect(order).toEqual(["first", "second"]);

    await expect(database.write(async () => undefined)).rejects.toThrowError(
      "SQLite transaction callbacks must be synchronous",
    );
  });

  it("enforces foreign keys inside write transactions", async () => {
    const database = await createDatabase();
    const outbox = new SqliteOutboxRepository();

    await expect(
      database.write((context) =>
        outbox.append(context, {
          availableAt: 4_000,
          correlationId: "request-4",
          id: "orphan-event",
          installationId: "missing-installation",
          occurredAt: 4_000,
          payload: {},
          topic: "invalid.event",
        }),
      ),
    ).rejects.toThrowError(/FOREIGN KEY constraint failed/);
  });

  it("rolls back a failed migration set and can recover with valid migrations", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "launchpp-migration-"));
    temporaryRoots.push(root);
    const migrationRoot = path.join(root, "broken-migrations");
    await mkdir(path.join(migrationRoot, "meta"), { recursive: true });
    const foundationSql = await readFile(
      path.join(defaultMigrationsFolder, "0000_foundation.sql"),
      "utf8",
    );
    await writeFile(path.join(migrationRoot, "0000_foundation.sql"), foundationSql);
    await writeFile(path.join(migrationRoot, "0001_broken.sql"), "THIS IS NOT VALID SQL;");
    await writeFile(
      path.join(migrationRoot, "meta", "_journal.json"),
      JSON.stringify({
        dialect: "sqlite",
        entries: [
          { breakpoints: true, idx: 0, tag: "0000_foundation", version: "6", when: 1 },
          { breakpoints: true, idx: 1, tag: "0001_broken", version: "6", when: 2 },
        ],
        version: "7",
      }),
    );

    const filePath = path.join(root, "recovery.sqlite");
    expect(() => openSqliteDatabase({ filePath, migrationsFolder: migrationRoot })).toThrow();

    const inspection = new Database(filePath);
    const installationTable = inspection
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'installations'",
      )
      .get();
    inspection.close();
    expect(installationTable).toBeUndefined();

    const recovered = openSqliteDatabase({ filePath });
    openDatabases.push(recovered);
    expect(recovered.journalMode).toBe("wal");
  });
});

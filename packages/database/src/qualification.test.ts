import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
  createInstallationBackup,
  restoreInstallationBackup,
  verifyInstallationBackup,
} from "./local-operations.js";
import { defaultMigrationsFolder } from "./migrations.js";
import { openSqliteDatabase } from "./sqlite-database.js";

interface MigrationFixture {
  readonly name: string;
  readonly throughMigration: string;
}

const fixtureRoot = path.resolve(import.meta.dirname, "../../../tests/fixtures/migrations");
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

async function materializeFixture(fixtureName: string) {
  const source = path.join(fixtureRoot, fixtureName);
  const fixture = JSON.parse(
    await readFile(path.join(source, "fixture.json"), "utf8"),
  ) as MigrationFixture;
  const root = await mkdtemp(path.join(tmpdir(), "launchpp-qualification-"));
  temporaryRoots.push(root);
  const migrations = path.join(root, "migrations");
  await mkdir(path.join(migrations, "meta"), { recursive: true });

  const journal = JSON.parse(
    await readFile(path.join(defaultMigrationsFolder, "meta", "_journal.json"), "utf8"),
  ) as { dialect: string; entries: Array<{ tag: string }>; version: string };
  const finalIndex = journal.entries.findIndex((entry) => entry.tag === fixture.throughMigration);
  if (finalIndex < 0) throw new Error(`Unknown fixture migration: ${fixture.throughMigration}`);
  const entries = journal.entries.slice(0, finalIndex + 1);
  for (const entry of entries) {
    await cp(
      path.join(defaultMigrationsFolder, `${entry.tag}.sql`),
      path.join(migrations, `${entry.tag}.sql`),
    );
  }
  await writeFile(
    path.join(migrations, "meta", "_journal.json"),
    `${JSON.stringify({ ...journal, entries }, null, 2)}\n`,
  );

  const databasePath = path.join(root, "fixture.sqlite");
  const oldDatabase = openSqliteDatabase({ filePath: databasePath, migrationsFolder: migrations });
  await oldDatabase.close();
  const connection = new Database(databasePath);
  try {
    connection.pragma("foreign_keys = ON");
    connection.exec(await readFile(path.join(source, "seed.sql"), "utf8"));
  } finally {
    connection.close();
  }
  return { databasePath, fixture, root };
}

function scalar(databasePath: string, sql: string) {
  const connection = new Database(databasePath, { readonly: true });
  try {
    return connection.prepare<[], { value: number }>(sql).get()?.value ?? 0;
  } finally {
    connection.close();
  }
}

describe("core alpha installation qualification", () => {
  for (const fixtureName of ["foundation", "pre-task-domain"]) {
    it(`upgrades and restores the ${fixtureName} fixture`, async () => {
      const { databasePath, fixture, root } = await materializeFixture(fixtureName);
      const upgraded = openSqliteDatabase({ filePath: databasePath });
      await upgraded.close();

      expect(scalar(databasePath, "SELECT count(*) AS value FROM installations")).toBe(1);
      expect(
        scalar(
          databasePath,
          "SELECT count(*) AS value FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
        ),
      ).toBe(1);
      if (fixture.throughMigration === "0004_solid_supernaut") {
        expect(scalar(databasePath, "SELECT count(*) AS value FROM projects")).toBe(1);
        expect(scalar(databasePath, "SELECT count(*) AS value FROM project_statuses")).toBe(3);
      }

      const backupPath = path.join(root, "qualified-backup.sqlite");
      const backup = await createInstallationBackup({ backupPath, databasePath });
      const verified = await verifyInstallationBackup(backupPath);
      expect(verified.sha256).toBe(backup.sha256);

      const restoredPath = path.join(root, "restored.sqlite");
      await restoreInstallationBackup({ backupPath, databasePath: restoredPath });
      expect(scalar(restoredPath, "SELECT count(*) AS value FROM installations")).toBe(1);
      expect(scalar(restoredPath, "SELECT count(*) AS value FROM projects")).toBe(
        scalar(databasePath, "SELECT count(*) AS value FROM projects"),
      );
      expect(scalar(restoredPath, "SELECT count(*) AS value FROM project_statuses")).toBe(
        scalar(databasePath, "SELECT count(*) AS value FROM project_statuses"),
      );
    });
  }
});

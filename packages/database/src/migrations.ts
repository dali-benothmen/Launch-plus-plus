import { fileURLToPath } from "node:url";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { databaseSchema } from "./schema.js";

export const defaultMigrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

export function runMigrations(
  database: BetterSQLite3Database<typeof databaseSchema>,
  migrationsFolder = defaultMigrationsFolder,
): void {
  migrate(database, { migrationsFolder, migrationsTable: "launchpp_migrations" });
}

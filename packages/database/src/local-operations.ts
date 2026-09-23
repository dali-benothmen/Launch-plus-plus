import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  constants,
  copyFile,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { acquireInstallationLock } from "./installation-lock.js";
import { openSqliteDatabase } from "./sqlite-database.js";

const backupFormat = "launchpp-installation-backup";
const backupFormatVersion = 1;

export interface DatabaseVerification {
  readonly bytes: number;
  readonly migrationCount: number;
  readonly sha256: string;
}

export interface InstallationBackupResult extends DatabaseVerification {
  readonly backupPath: string;
  readonly manifestPath: string;
}

export interface InstallationRestoreResult extends DatabaseVerification {
  readonly databasePath: string;
  readonly recoveryBackupPath?: string;
}

interface BackupManifest {
  readonly createdAt: string;
  readonly databaseBytes: number;
  readonly databaseFile: string;
  readonly databaseSha256: string;
  readonly format: typeof backupFormat;
  readonly formatVersion: typeof backupFormatVersion;
  readonly migrationCount: number;
}

function timestampSlug(): string {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

export function defaultBackupPath(databasePath: string, label = "backup"): string {
  return path.join(
    path.dirname(path.resolve(databasePath)),
    "backups",
    `launchpp-${label}-${timestampSlug()}.sqlite`,
  );
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function assertIntegrity(connection: Database.Database, filePath: string): number {
  const integrityRows = connection.pragma("integrity_check") as Array<Record<string, unknown>>;
  const integrityMessages = integrityRows.flatMap((row) => Object.values(row).map(String));
  if (integrityMessages.length !== 1 || integrityMessages[0]?.toLowerCase() !== "ok") {
    throw new Error(`SQLite integrity verification failed for ${filePath}.`);
  }

  const foreignKeyRows = connection.pragma("foreign_key_check") as Array<Record<string, unknown>>;
  if (foreignKeyRows.length > 0) {
    throw new Error(`SQLite foreign-key verification failed for ${filePath}.`);
  }

  const hasMigrationTable = connection
    .prepare<[], { count: number }>(
      "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'launchpp_migrations'",
    )
    .get();
  if (!hasMigrationTable?.count) {
    throw new Error(`${filePath} is not a migrated Launch++ database.`);
  }
  return (
    connection
      .prepare<[], { count: number }>("SELECT count(*) AS count FROM launchpp_migrations")
      .get()?.count ?? 0
  );
}

export async function verifySqliteDatabase(filePath: string): Promise<DatabaseVerification> {
  const resolvedPath = path.resolve(filePath);
  const file = await stat(resolvedPath).catch(() => undefined);
  if (!file?.isFile() || file.size === 0) {
    throw new Error(`No SQLite database was found at ${resolvedPath}.`);
  }

  const connection = new Database(resolvedPath, { fileMustExist: true, readonly: true });
  let migrationCount: number;
  try {
    connection.pragma("query_only = ON");
    migrationCount = assertIntegrity(connection, resolvedPath);
  } finally {
    connection.close();
  }

  return Object.freeze({
    bytes: file.size,
    migrationCount,
    sha256: await sha256File(resolvedPath),
  });
}

function isBackupManifest(value: unknown): value is BackupManifest {
  if (typeof value !== "object" || value === null) return false;
  const manifest = value as Partial<BackupManifest>;
  return (
    manifest.format === backupFormat &&
    manifest.formatVersion === backupFormatVersion &&
    typeof manifest.createdAt === "string" &&
    typeof manifest.databaseFile === "string" &&
    typeof manifest.databaseSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(manifest.databaseSha256) &&
    Number.isSafeInteger(manifest.databaseBytes) &&
    (manifest.databaseBytes ?? 0) > 0 &&
    Number.isSafeInteger(manifest.migrationCount) &&
    (manifest.migrationCount ?? -1) >= 0
  );
}

export async function createInstallationBackup(
  input: Readonly<{
    backupPath?: string;
    databasePath: string;
  }>,
): Promise<InstallationBackupResult> {
  const databasePath = path.resolve(input.databasePath);
  const backupPath = path.resolve(input.backupPath ?? defaultBackupPath(databasePath));
  const manifestPath = `${backupPath}.json`;
  if (databasePath === backupPath)
    throw new Error("The backup path must differ from the database.");
  await stat(databasePath).catch(() => {
    throw new Error(`No Launch++ database was found at ${databasePath}.`);
  });
  if (
    (await stat(backupPath).catch(() => undefined)) ||
    (await stat(manifestPath).catch(() => undefined))
  ) {
    throw new Error(`A backup already exists at ${backupPath}. Choose another output path.`);
  }

  await mkdir(path.dirname(backupPath), { recursive: true });
  const temporaryPath = `${backupPath}.partial-${randomUUID()}`;
  const temporaryManifestPath = `${manifestPath}.partial-${randomUUID()}`;
  const connection = new Database(databasePath, { fileMustExist: true, readonly: true });

  try {
    connection.pragma("busy_timeout = 5000");
    await connection.backup(temporaryPath);
    await chmod(temporaryPath, 0o600);
  } finally {
    connection.close();
  }

  try {
    const verification = await verifySqliteDatabase(temporaryPath);
    const manifest: BackupManifest = {
      createdAt: new Date().toISOString(),
      databaseBytes: verification.bytes,
      databaseFile: path.basename(backupPath),
      databaseSha256: verification.sha256,
      format: backupFormat,
      formatVersion: backupFormatVersion,
      migrationCount: verification.migrationCount,
    };
    const manifestHandle = await open(temporaryManifestPath, "wx", 0o600);
    try {
      await manifestHandle.writeFile(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    } finally {
      await manifestHandle.close();
    }
    await rename(temporaryPath, backupPath);
    await rename(temporaryManifestPath, manifestPath);
    return Object.freeze({ backupPath, manifestPath, ...verification });
  } catch (error) {
    await Promise.all([
      rm(temporaryPath, { force: true }),
      rm(temporaryManifestPath, { force: true }),
      rm(backupPath, { force: true }),
      rm(manifestPath, { force: true }),
    ]);
    throw error;
  }
}

export async function verifyInstallationBackup(
  backupPathInput: string,
): Promise<InstallationBackupResult> {
  const backupPath = path.resolve(backupPathInput);
  const manifestPath = `${backupPath}.json`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    throw new Error(`The backup manifest is missing or invalid: ${manifestPath}.`);
  }
  if (!isBackupManifest(parsed) || parsed.databaseFile !== path.basename(backupPath)) {
    throw new Error(`The backup manifest is not a supported Launch++ manifest: ${manifestPath}.`);
  }

  const verification = await verifySqliteDatabase(backupPath);
  if (
    verification.bytes !== parsed.databaseBytes ||
    verification.sha256 !== parsed.databaseSha256 ||
    verification.migrationCount !== parsed.migrationCount
  ) {
    throw new Error(`The backup does not match its checksum manifest: ${backupPath}.`);
  }
  return Object.freeze({ backupPath, manifestPath, ...verification });
}

export async function migrateInstallationDatabase(
  databasePathInput: string,
): Promise<DatabaseVerification> {
  const databasePath = path.resolve(databasePathInput);
  const lock = await acquireInstallationLock(databasePath);
  try {
    const database = openSqliteDatabase({ filePath: databasePath });
    await database.close();
    return await verifySqliteDatabase(databasePath);
  } finally {
    await lock.release();
  }
}

export async function restoreInstallationBackup(
  input: Readonly<{
    backupPath: string;
    databasePath: string;
  }>,
): Promise<InstallationRestoreResult> {
  const backup = await verifyInstallationBackup(input.backupPath);
  const databasePath = path.resolve(input.databasePath);
  if (databasePath === backup.backupPath) {
    throw new Error("The backup path must differ from the destination database.");
  }

  const lock = await acquireInstallationLock(databasePath);
  const temporaryPath = `${databasePath}.restore-${randomUUID()}`;
  const previousPath = `${databasePath}.previous-${randomUUID()}`;
  let recoveryBackupPath: string | undefined;
  let movedCurrentDatabase = false;

  try {
    await mkdir(path.dirname(databasePath), { recursive: true });
    const current = await stat(databasePath).catch(() => undefined);
    if (current) {
      if (!current.isFile()) throw new Error(`${databasePath} is not a regular database file.`);
      recoveryBackupPath = defaultBackupPath(databasePath, "before-restore");
      await createInstallationBackup({ backupPath: recoveryBackupPath, databasePath });
    }

    await copyFile(backup.backupPath, temporaryPath, constants.COPYFILE_EXCL);
    const restored = openSqliteDatabase({ filePath: temporaryPath });
    await restored.close();
    const verification = await verifySqliteDatabase(temporaryPath);

    if (current) {
      await rename(databasePath, previousPath);
      movedCurrentDatabase = true;
    }
    try {
      await rename(temporaryPath, databasePath);
    } catch (error) {
      if (movedCurrentDatabase) await rename(previousPath, databasePath);
      throw error;
    }
    await Promise.all([
      rm(previousPath, { force: true }),
      rm(`${databasePath}-shm`, { force: true }),
      rm(`${databasePath}-wal`, { force: true }),
    ]);
    return Object.freeze({
      databasePath,
      ...(recoveryBackupPath ? { recoveryBackupPath } : {}),
      ...verification,
    });
  } finally {
    await rm(temporaryPath, { force: true });
    await lock.release();
  }
}

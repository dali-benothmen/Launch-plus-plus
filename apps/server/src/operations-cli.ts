#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createInstallationBackup,
  migrateInstallationDatabase,
  restoreInstallationBackup,
  verifyInstallationBackup,
} from "@launchpp/database";

const usage = `Launch++ local operations

Usage:
  pnpm ops migrate [--database <path>]
  pnpm ops backup [--database <path>] [--output <path>]
  pnpm ops verify --from <backup.sqlite>
  pnpm ops restore --from <backup.sqlite> [--database <path>] --confirm

Defaults:
  --database  LAUNCHPP_DATABASE_PATH or data/launchpp.sqlite
  --output    A timestamped file under <database directory>/backups

Stop Launch++ before migrate or restore. Backup and verify may run while it is online.
Restore verifies the backup first and creates a pre-restore recovery backup automatically.`;

interface ParsedArguments {
  readonly command?: string;
  readonly confirm: boolean;
  readonly databasePath: string;
  readonly from?: string;
  readonly output?: string;
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  const command = argv[0];
  let confirm = false;
  const environment = process.env as NodeJS.ProcessEnv & { LAUNCHPP_DATABASE_PATH?: string };
  let databasePath = environment.LAUNCHPP_DATABASE_PATH?.trim() || "data/launchpp.sqlite";
  let from: string | undefined;
  let output: string | undefined;

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--confirm") {
      confirm = true;
      continue;
    }
    if (argument === "--database" || argument === "--from" || argument === "--output") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a path.`);
      if (argument === "--database") databasePath = value;
      if (argument === "--from") from = value;
      if (argument === "--output") output = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    ...(command ? { command } : {}),
    confirm,
    databasePath: path.resolve(databasePath),
    ...(from ? { from: path.resolve(from) } : {}),
    ...(output ? { output: path.resolve(output) } : {}),
  };
}

function describeVerification(
  result: Readonly<{ bytes: number; migrationCount: number; sha256: string }>,
) {
  return [
    `Size: ${result.bytes} bytes`,
    `Migrations: ${result.migrationCount}`,
    `SHA-256: ${result.sha256}`,
  ].join("\n");
}

export async function runOperationsCli(argv = process.argv.slice(2)): Promise<void> {
  const input = parseArguments(argv);
  switch (input.command) {
    case "migrate": {
      const result = await migrateInstallationDatabase(input.databasePath);
      process.stdout.write(
        `Launch++ database migration completed.\nDatabase: ${input.databasePath}\n${describeVerification(result)}\n`,
      );
      return;
    }
    case "backup": {
      const result = await createInstallationBackup({
        databasePath: input.databasePath,
        ...(input.output ? { backupPath: input.output } : {}),
      });
      process.stdout.write(
        `Launch++ backup created and verified.\nBackup: ${result.backupPath}\nManifest: ${result.manifestPath}\n${describeVerification(result)}\n`,
      );
      return;
    }
    case "verify": {
      if (!input.from) throw new Error("verify requires --from <backup.sqlite>.");
      const result = await verifyInstallationBackup(input.from);
      process.stdout.write(
        `Launch++ backup is valid.\nBackup: ${result.backupPath}\n${describeVerification(result)}\n`,
      );
      return;
    }
    case "restore": {
      if (!input.from) throw new Error("restore requires --from <backup.sqlite>.");
      if (!input.confirm) {
        throw new Error("restore requires --confirm because it replaces the current database.");
      }
      const result = await restoreInstallationBackup({
        backupPath: input.from,
        databasePath: input.databasePath,
      });
      process.stdout.write(
        `Launch++ restore completed and verified.\nDatabase: ${result.databasePath}\n${
          result.recoveryBackupPath
            ? `Previous database backup: ${result.recoveryBackupPath}\n`
            : ""
        }${describeVerification(result)}\n`,
      );
      return;
    }
    case "help":
    case "--help":
    case "-h":
    case undefined:
      process.stdout.write(`${usage}\n`);
      return;
    default:
      throw new Error(`Unknown operation: ${input.command}.\n\n${usage}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOperationsCli().catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Launch++ operation failed: ${detail}\n`);
    process.exitCode = 1;
  });
}

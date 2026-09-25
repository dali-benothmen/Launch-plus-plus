import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { cpus, platform, release, tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { gzipSync } from "node:zlib";

import {
  createInstallationBackup,
  migrateInstallationDatabase,
  restoreInstallationBackup,
  verifyInstallationBackup,
} from "../packages/database/dist/index.js";

const requireFromDatabase = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const Database = requireFromDatabase("better-sqlite3");

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const budgetFile = path.join(repositoryRoot, "tests/performance/core-alpha-budgets.json");

function summarize(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (fraction) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
  return {
    count: sorted.length,
    maxMs: Number(sorted.at(-1).toFixed(3)),
    meanMs: Number((sorted.reduce((sum, value) => sum + value, 0) / sorted.length).toFixed(3)),
    p50Ms: Number(percentile(0.5).toFixed(3)),
    p95Ms: Number(percentile(0.95).toFixed(3)),
  };
}

async function time(operation) {
  const startedAt = performance.now();
  await operation();
  return performance.now() - startedAt;
}

function seedSoloWorkload(databasePath) {
  const database = new Database(databasePath);
  try {
    database.pragma("foreign_keys = ON");
    database.exec(`
      INSERT INTO installations (id, created_at) VALUES ('installation', 1700000000000);
      INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
        VALUES ('owner', 'Owner', 'owner@launchpp.test', 1, '2023-11-14T22:13:20.000Z', '2023-11-14T22:13:20.000Z');
      INSERT INTO organizations (id, installation_id, slug, name, created_by_user_id, created_at, updated_at, revision)
        VALUES ('organization', 'installation', 'organization', 'Organization', 'owner', 1700000000000, 1700000000000, 1);
      INSERT INTO organization_members (organization_id, user_id, role, state, joined_at, updated_at)
        VALUES ('organization', 'owner', 'owner', 'active', 1700000000000, 1700000000000);
      INSERT INTO projects (id, organization_id, key, slug, name, description, access, position, next_task_number, created_by_user_id, created_at, updated_at, revision)
        VALUES ('project', 'organization', 'PERF', 'project', 'Project', '', 'organization', 0, 251, 'owner', 1700000000000, 1700000000000, 1);
      INSERT INTO project_statuses (id, organization_id, project_id, name, color, position, category, created_at, updated_at, revision)
        VALUES ('todo', 'organization', 'project', 'To do', '#8c8c8c', 0, 'backlog', 1700000000000, 1700000000000, 1);
    `);
    const insert = database.prepare(`
      INSERT INTO tasks (
        id, organization_id, project_id, number, status_id, title, description_markdown, position,
        created_by_user_id, updated_by_user_id, created_at, updated_at, revision
      ) VALUES (?, 'organization', 'project', ?, 'todo', ?, '', ?, 'owner', 'owner', ?, ?, 1)
    `);
    const transaction = database.transaction(() => {
      for (let index = 1; index <= 250; index += 1) {
        insert.run(
          `task-${index}`,
          index,
          `Task ${index}`,
          index - 1,
          1700000000000 + index,
          1700000000000 + index,
        );
      }
    });
    transaction();
  } finally {
    database.close();
  }
}

async function directorySizes(directory) {
  let gzipBytes = 0;
  let rawBytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await directorySizes(entryPath);
      gzipBytes += nested.gzipBytes;
      rawBytes += nested.rawBytes;
    } else {
      const contents = await readFile(entryPath);
      rawBytes += (await stat(entryPath)).size;
      gzipBytes += gzipSync(contents).byteLength;
    }
  }
  return { gzipBytes, rawBytes };
}

function metricAt(document, metricPath) {
  return metricPath.split(".").reduce((value, key) => value?.[key], document);
}

async function evaluateGates(metrics) {
  const budget = JSON.parse(await readFile(budgetFile, "utf8"));
  const results = Object.entries(budget.maximums).map(([metric, maximum]) => {
    const observed = metricAt(metrics, metric);
    if (typeof observed !== "number" || typeof maximum !== "number") {
      throw new TypeError(`Invalid core alpha budget mapping for '${metric}'.`);
    }
    return { maximum, metric, observed, passed: observed <= maximum };
  });
  return { passed: results.every((result) => result.passed), results };
}

const temporaryRoot = await mkdtemp(path.join(tmpdir(), "launchpp-core-alpha-measurement-"));
try {
  const migrationSamples = [];
  for (let index = 0; index < 5; index += 1) {
    const databasePath = path.join(temporaryRoot, `migration-${index}.sqlite`);
    migrationSamples.push(await time(() => migrateInstallationDatabase(databasePath)));
  }

  const databasePath = path.join(temporaryRoot, "solo-workload.sqlite");
  await migrateInstallationDatabase(databasePath);
  seedSoloWorkload(databasePath);

  const readDatabase = new Database(databasePath, { readonly: true });
  const listTasks = readDatabase.prepare(
    "SELECT id, title, revision FROM tasks WHERE project_id = ? AND archived_at IS NULL AND deleted_at IS NULL ORDER BY position LIMIT 50",
  );
  const readSamples = [];
  for (let index = 0; index < 250; index += 1) {
    readSamples.push(await time(() => Promise.resolve(listTasks.all("project"))));
  }
  readDatabase.close();

  const backupSamples = [];
  const backups = [];
  for (let index = 0; index < 5; index += 1) {
    const backupPath = path.join(temporaryRoot, `backup-${index}.sqlite`);
    backupSamples.push(
      await time(async () => {
        backups.push(await createInstallationBackup({ backupPath, databasePath }));
      }),
    );
  }
  const verifySamples = [];
  for (let index = 0; index < 20; index += 1) {
    verifySamples.push(
      await time(() => verifyInstallationBackup(backups[index % backups.length].backupPath)),
    );
  }
  const restoreSamples = [];
  for (let index = 0; index < 5; index += 1) {
    restoreSamples.push(
      await time(() =>
        restoreInstallationBackup({
          backupPath: backups[index].backupPath,
          databasePath: path.join(temporaryRoot, `restore-${index}.sqlite`),
        }),
      ),
    );
  }

  const metrics = {
    database: {
      backup: summarize(backupSamples),
      freshMigration: summarize(migrationSamples),
      restore: summarize(restoreSamples),
      taskPageRead: summarize(readSamples),
      verify: summarize(verifySamples),
    },
    webDistribution: await directorySizes(path.join(repositoryRoot, "apps/web/dist")),
  };
  const gates = await evaluateGates(metrics);
  const report = {
    formatVersion: 1,
    gates,
    measuredAt: new Date().toISOString(),
    metrics,
    runtime: {
      architecture: process.arch,
      cpu: cpus()[0]?.model ?? "unknown",
      logicalCpuCount: cpus().length,
      node: process.version,
      os: `${platform()} ${release()}`,
    },
    workload: { backupRuns: 5, restoreRuns: 5, taskPageReads: 250, tasks: 250, verifyRuns: 20 },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (process.argv.includes("--check") && !gates.passed) process.exitCode = 1;
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}

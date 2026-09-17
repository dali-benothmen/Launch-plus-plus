import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { cpus, freemem, platform, release, tmpdir, totalmem } from "node:os";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { gzipSync } from "node:zlib";

import { buildServer } from "../apps/server/dist/server.js";
import { createReadiness } from "../apps/server/dist/readiness.js";
import {
  openSqliteDatabase,
  SqliteInstallationRepository,
  SqliteOutboxRepository,
} from "../packages/database/dist/index.js";
import {
  inspectPluginArchive,
  IsolatedPluginHandlerRuntime,
} from "../packages/plugin-runtime/dist/index.js";
import { packPluginDirectory } from "../packages/plugin-testkit/dist/index.js";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const normalizedPlugin = path.join(repositoryRoot, "packages/plugin-testkit/fixtures/normalized");
const budgetFile = path.join(repositoryRoot, "tests/performance/foundation-budgets.json");

function elapsed(startedAt) {
  return performance.now() - startedAt;
}

function summarize(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (fraction) => {
    const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
    return sorted[index];
  };
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    count: sorted.length,
    maxMs: Number(sorted.at(-1).toFixed(3)),
    meanMs: Number((total / sorted.length).toFixed(3)),
    p50Ms: Number(percentile(0.5).toFixed(3)),
    p95Ms: Number(percentile(0.95).toFixed(3)),
  };
}

function serverConfig() {
  return Object.freeze({
    baseUrl: "http://127.0.0.1:3000",
    bindAddress: "127.0.0.1",
    environment: "test",
    logLevel: "silent",
    port: 3000,
    rateLimit: Object.freeze({ max: 100_000, windowMs: 60_000 }),
    shutdownGraceMs: 10_000,
    trustedProxies: Object.freeze([]),
  });
}

async function measureServer() {
  const startupSamples = [];
  let app;
  for (let index = 0; index < 5; index += 1) {
    const readiness = createReadiness();
    readiness.markReady();
    const startedAt = performance.now();
    const candidate = await buildServer({ config: serverConfig(), logger: false, readiness });
    await candidate.ready();
    startupSamples.push(elapsed(startedAt));
    if (app === undefined) app = candidate;
    else await candidate.close();
  }

  const requestSamples = [];
  for (let index = 0; index < 250; index += 1) {
    const startedAt = performance.now();
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    requestSamples.push(elapsed(startedAt));
    if (response.statusCode !== 200) throw new Error("Readiness measurement returned a failure.");
  }
  await app.close();
  return {
    composeAndReady: summarize(startupSamples),
    readinessInject: summarize(requestSamples),
  };
}

async function measureDatabase(temporaryRoot) {
  const startupSamples = [];
  for (let index = 0; index < 5; index += 1) {
    const startedAt = performance.now();
    const database = openSqliteDatabase({
      filePath: path.join(temporaryRoot, `startup-${index}.sqlite`),
    });
    startupSamples.push(elapsed(startedAt));
    await database.close();
  }

  const database = openSqliteDatabase({ filePath: path.join(temporaryRoot, "workload.sqlite") });
  const installations = new SqliteInstallationRepository();
  const outbox = new SqliteOutboxRepository();
  const writeSamples = [];
  for (let index = 0; index < 200; index += 1) {
    const id = `installation-${index}`;
    const startedAt = performance.now();
    await database.write((context) => {
      installations.create(context, { createdAt: index, id });
      outbox.append(context, {
        availableAt: index,
        correlationId: `request-${index}`,
        id: `event-${index}`,
        installationId: id,
        occurredAt: index,
        payload: { installationId: id },
        topic: "installation.created",
      });
    });
    writeSamples.push(elapsed(startedAt));
  }

  const readSamples = [];
  for (let index = 0; index < 500; index += 1) {
    const id = `installation-${index % 200}`;
    const startedAt = performance.now();
    const installation = database.read((context) => installations.findById(context, id));
    readSamples.push(elapsed(startedAt));
    if (installation?.id !== id) throw new Error("SQLite measurement read the wrong row.");
  }
  await database.close();
  return {
    openAndMigrate: summarize(startupSamples),
    transactionalInstallationAndOutboxWrite: summarize(writeSamples),
    indexedInstallationRead: summarize(readSamples),
  };
}

async function measurePluginPackage() {
  const packSamples = [];
  let packed;
  for (let index = 0; index < 10; index += 1) {
    const startedAt = performance.now();
    packed = await packPluginDirectory(normalizedPlugin);
    packSamples.push(elapsed(startedAt));
  }

  const inspectSamples = [];
  for (let index = 0; index < 100; index += 1) {
    const startedAt = performance.now();
    const inspected = inspectPluginArchive(packed.archive);
    inspectSamples.push(elapsed(startedAt));
    if (inspected.packageHash !== packed.packageHash) {
      throw new Error("Package measurement produced an integrity mismatch.");
    }
  }
  return {
    archiveBytes: packed.archive.byteLength,
    inspect: summarize(inspectSamples),
    pack: summarize(packSamples),
    sha256: packed.packageHash,
  };
}

async function measurePluginHandler() {
  const runtime = new IsolatedPluginHandlerRuntime();
  const samples = [];
  for (let index = 0; index < 15; index += 1) {
    const startedAt = performance.now();
    const output = await runtime.execute({
      input: { left: index, right: 2 },
      source: "(input) => ({ total: input.left + input.right })",
    });
    samples.push(elapsed(startedAt));
    if (output?.total !== index + 2) throw new Error("Plugin runtime measurement was incorrect.");
  }
  return { freshWorkerInvocation: summarize(samples) };
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

function readMetric(document, metricPath) {
  return metricPath.split(".").reduce((value, key) => value?.[key], document);
}

async function evaluateGates(metrics) {
  const budgetDocument = JSON.parse(await readFile(budgetFile, "utf8"));
  const results = Object.entries(budgetDocument.maximums).map(([metric, maximum]) => {
    const observed = readMetric(metrics, metric);
    if (typeof observed !== "number" || typeof maximum !== "number") {
      throw new TypeError(`Invalid foundation budget mapping for '${metric}'.`);
    }
    return { maximum, metric, observed, passed: observed <= maximum };
  });
  return { passed: results.every((result) => result.passed), results };
}

const temporaryRoot = await mkdtemp(path.join(tmpdir(), "launchpp-foundation-measurement-"));
const startedAt = new Date().toISOString();
const initialRssBytes = process.memoryUsage().rss;

try {
  const server = await measureServer();
  const database = await measureDatabase(temporaryRoot);
  const pluginPackage = await measurePluginPackage();
  const pluginHandler = await measurePluginHandler();
  const finalRssBytes = process.memoryUsage().rss;
  const metrics = {
    database,
    memory: {
      finalRssBytes,
      initialRssBytes,
      maxRssBytes: process.resourceUsage().maxRSS * 1024,
      systemFreeMemoryBytesAtEnd: freemem(),
    },
    pluginHandler,
    pluginPackage,
    server,
    webDistribution: await directorySizes(path.join(repositoryRoot, "apps/web/dist")),
  };
  const gates = await evaluateGates(metrics);
  const report = {
    formatVersion: 1,
    gates,
    measuredAt: startedAt,
    runtime: {
      architecture: process.arch,
      cpu: cpus()[0]?.model ?? "unknown",
      logicalCpuCount: cpus().length,
      node: process.version,
      os: `${platform()} ${release()}`,
      totalMemoryBytes: totalmem(),
    },
    workload: {
      databaseReads: 500,
      databaseWrites: 200,
      packageInspections: 100,
      packagePacks: 10,
      pluginInvocations: 15,
      readinessRequests: 250,
      serverStarts: 5,
    },
    metrics,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (process.argv.includes("--check") && !gates.passed) process.exitCode = 1;
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

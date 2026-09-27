#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";

import { connectDeveloperMode } from "./connected-dev.js";
import { startDisposableDevHost } from "./dev-command.js";

function help(): void {
  process.stdout.write(`Launch++ plugin CLI

Usage:
  launchpp dev [options]

Development options:
  --connect <url>         Pair with an operator-enabled Launch++ installation
  --fresh                 Reset the selected disposable profile before startup
  --profile <name>        Profile stored under .launchpp/dev (default: default)
  --port <number>         Inspector port (default: 4173)
  --surface-port <number> Isolated plugin Vite port (default: inspector port + 1)
  --yes                   Confirm a requested --fresh reset
  --help                  Show this help
`);
}

function numericOption(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new TypeError(`${name} must be an integer.`);
  return parsed;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function dev(args: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: {
      connect: { type: "string" },
      fresh: { type: "boolean" },
      help: { short: "h", type: "boolean" },
      port: { type: "string" },
      profile: { type: "string" },
      "surface-port": { type: "string" },
      yes: { short: "y", type: "boolean" },
    },
    strict: true,
  });
  if (values.help) {
    help();
    return;
  }

  const projectDirectory = process.cwd();
  const profile = values.profile ?? "default";
  const statePath = path.join(projectDirectory, ".launchpp", "dev", profile, "state.json");
  if (values.fresh && (await exists(statePath)) && !values.yes) {
    const approved = await confirm({
      initialValue: false,
      message: `Reset disposable profile '${profile}'?`,
    });
    if (isCancel(approved) || !approved) {
      cancel("Development host startup cancelled.");
      return;
    }
  }

  intro("Launch++ disposable development host");
  const port = numericOption(values.port, "port");
  const surfacePort = numericOption(values["surface-port"], "surface-port");
  const host = await startDisposableDevHost({
    fresh: values.fresh ?? false,
    ...(port === undefined ? {} : { port }),
    profile,
    projectDirectory,
    ...(surfacePort === undefined ? {} : { surfacePort }),
  });
  process.stdout.write(`\n[launchpp:dev] Manifest valid\n`);
  process.stdout.write(`[launchpp:dev] Fixture organization ready\n`);
  process.stdout.write(`[launchpp:dev] Profile: ${host.profileDirectory}\n`);
  process.stdout.write(`[launchpp:dev] Plugin origin: ${host.pluginUrl}\n`);
  process.stdout.write(`[launchpp:dev] Open: ${host.url}\n`);
  process.stdout.write(`[launchpp:dev] Watching for changes…\n\n`);

  let connected: Awaited<ReturnType<typeof connectDeveloperMode>> | undefined;
  if (values.connect) {
    try {
      connected = await connectDeveloperMode({
        manifestPath: path.join(projectDirectory, "launchpp.plugin.json"),
        url: values.connect,
      });
    } catch (error) {
      await host.close();
      throw error;
    }
  }

  await new Promise<void>((resolve) => {
    let stopping = false;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      void Promise.all([host.close(), connected?.close()])
        .catch((error: unknown) => {
          process.stderr.write(
            `[launchpp:dev] Shutdown failed: ${error instanceof Error ? error.message : String(error)}\n`,
          );
        })
        .finally(resolve);
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  outro("Disposable development host stopped.");
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === undefined || command === "--help" || command === "-h") {
    help();
    return;
  }
  if (command === "dev") {
    await dev(args);
    return;
  }
  throw new TypeError(`Unknown command '${command}'. The preview currently supports 'dev'.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[launchpp] ${message}\n`);
  process.exitCode = 1;
});

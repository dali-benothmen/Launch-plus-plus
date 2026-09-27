#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { cancel, confirm, intro, isCancel, note, outro, select, text } from "@clack/prompts";

import {
  ADD_CAPABILITIES,
  type AddCapability,
  applyContributionPlan,
  planContribution,
} from "./add-command.js";
import { checkPlugin, type PluginDiagnostic } from "./check-command.js";
import { connectDeveloperMode } from "./connected-dev.js";
import { startDisposableDevHost } from "./dev-command.js";
import { generatePluginArtifacts } from "./generation.js";
import { runPluginTests } from "./test-command.js";

function help(): void {
  process.stdout.write(`Launch++ plugin CLI

Usage:
  launchpp dev [options]
  launchpp add <capability> [options]
  launchpp generate
  launchpp check [--warnings-as-errors]
  launchpp test [-- <vitest options>]

Commands:
  dev                    Start the disposable or connected development host
  add <capability>       Add page, task-panel, action, settings, or task-field
  generate               Generate manifest-derived types and test fixtures
  check                  Validate the manifest, source policy, permissions, and generated files
  test                   Run Launch++ checks followed by the project's Vitest suite

Development options:
  --connect <url>         Pair with an operator-enabled Launch++ installation
  --fresh                 Reset the selected disposable profile before startup
  --profile <name>        Profile stored under .launchpp/dev (default: default)
  --port <number>         Inspector port (default: 4173)
  --surface-port <number> Isolated plugin Vite port (default: inspector port + 1)
  --yes                   Confirm a requested --fresh reset

Add options:
  --id <id>               Contribution ID
  --title <title>         Display title
  --path <path>           Page route path (page only)
  --scope <scope>         project, organization, or user where supported
  --slot <slot>           Supported action or panel slot
  --yes                   Apply the displayed plan without prompting

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

function unwrap<Value>(value: Value | symbol): Exclude<Value, symbol> {
  if (isCancel(value)) {
    cancel("Command cancelled.");
    process.exit(0);
  }
  return value as Exclude<Value, symbol>;
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

function normalizeCapability(value: string | undefined): AddCapability {
  const aliases: Readonly<Record<string, AddCapability>> = {
    "project-page": "page",
    "task-action": "action",
    page: "page",
    "task-panel": "task-panel",
    action: "action",
    settings: "settings",
    "task-field": "task-field",
  };
  const normalized = value ? aliases[value] : undefined;
  if (normalized) return normalized;
  if (value && ["collection", "event-handler", "external-api"].includes(value)) {
    throw new TypeError(
      `'${value}' is reserved for a later plugin API and cannot be generated by v1-preview.`,
    );
  }
  throw new TypeError(`Choose a capability: ${ADD_CAPABILITIES.join(", ")}.`);
}

function defaultId(capability: AddCapability): string {
  return capability === "task-panel" || capability === "task-field"
    ? capability
    : `plugin-${capability}`;
}

function defaultTitle(capability: AddCapability): string {
  return capability
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

async function add(args: readonly string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: [...args],
    options: {
      help: { short: "h", type: "boolean" },
      id: { type: "string" },
      path: { type: "string" },
      scope: { type: "string" },
      slot: { type: "string" },
      title: { type: "string" },
      yes: { short: "y", type: "boolean" },
    },
    strict: true,
  });
  if (values.help) {
    help();
    return;
  }
  if (positionals.length > 1) throw new TypeError("The add command accepts one capability.");
  const capability = normalizeCapability(positionals[0]);
  const acceptDefaults = values.yes ?? false;
  intro(`Add Launch++ ${capability}`);
  const id =
    values.id ??
    (acceptDefaults
      ? defaultId(capability)
      : unwrap(
          await text({
            initialValue: defaultId(capability),
            message: "Contribution ID",
            validate: (value) => (value?.trim() ? undefined : "An ID is required."),
          }),
        ));
  const title =
    values.title ??
    (acceptDefaults
      ? defaultTitle(capability)
      : unwrap(
          await text({
            initialValue: defaultTitle(capability),
            message: "Display title",
            validate: (value) => (value?.trim() ? undefined : "A title is required."),
          }),
        ));
  let scope = values.scope;
  if (!scope && !acceptDefaults && (capability === "page" || capability === "settings")) {
    scope = unwrap(
      await select({
        initialValue: capability === "page" ? "project" : "organization",
        message: "Scope",
        options: [
          { label: "Project", value: "project" },
          { label: "Organization", value: "organization" },
          ...(capability === "settings" ? [{ label: "User", value: "user" }] : []),
        ],
      }),
    );
  }
  if (scope && !["organization", "project", "user"].includes(scope)) {
    throw new TypeError("Scope must be project, organization, or user.");
  }
  if (capability === "page" && scope === "user") {
    throw new TypeError("Page scope must be project or organization.");
  }

  const plan = await planContribution({
    capability,
    id,
    ...(values.path === undefined ? {} : { path: values.path }),
    ...(scope === undefined ? {} : { scope: scope as "organization" | "project" | "user" }),
    ...(values.slot === undefined ? {} : { slot: values.slot }),
    title,
  });
  note(plan.summary.join("\n"), "Planned changes");
  if (!acceptDefaults) {
    const approved = await confirm({ initialValue: true, message: "Apply these changes?" });
    if (isCancel(approved) || !approved) {
      cancel("No files changed.");
      return;
    }
  }
  await applyContributionPlan(plan);
  outro(`${title} added.`);
}

function printDiagnostics(diagnostics: readonly PluginDiagnostic[]): void {
  const sections = ["Manifest", "Permissions", "Browser", "Server", "Generated"] as const;
  for (const section of sections) {
    process.stdout.write(`\n${section}\n`);
    const items = diagnostics.filter((item) => item.section === section);
    if (items.length === 0) {
      process.stdout.write("  ✓ Valid\n");
      continue;
    }
    for (const item of items) {
      const marker = item.level === "error" ? "✗" : "!";
      process.stdout.write(`  ${marker} ${item.message}${item.file ? ` (${item.file})` : ""}\n`);
    }
  }
}

async function check(args: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: {
      help: { short: "h", type: "boolean" },
      "warnings-as-errors": { type: "boolean" },
    },
    strict: true,
  });
  if (values.help) {
    help();
    return;
  }
  const result = await checkPlugin({
    ...(values["warnings-as-errors"] === undefined
      ? {}
      : { warningsAsErrors: values["warnings-as-errors"] }),
  });
  printDiagnostics(result.diagnostics);
  process.stdout.write(result.ok ? "\nPlugin checks passed.\n" : "\nPlugin checks failed.\n");
  if (!result.ok) process.exitCode = 1;
}

async function generate(args: readonly string[]): Promise<void> {
  if (args.length > 0 && !args.every((value) => value === "--help" || value === "-h")) {
    throw new TypeError("The generate command does not accept options.");
  }
  if (args.length > 0) {
    help();
    return;
  }
  const result = await generatePluginArtifacts();
  process.stdout.write(
    result.changed
      ? `Generated ${path.relative(process.cwd(), result.file)}.\n`
      : `Generated artifacts are already current.\n`,
  );
}

async function testPlugin(args: readonly string[]): Promise<void> {
  const forwarded = args[0] === "--" ? args.slice(1) : args;
  const code = await runPluginTests({ args: forwarded });
  if (code !== 0) process.exitCode = code;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === undefined || command === "--help" || command === "-h") {
    help();
    return;
  }
  if (command === "dev") return await dev(args);
  if (command === "add") return await add(args);
  if (command === "generate") return await generate(args);
  if (command === "check") return await check(args);
  if (command === "test") return await testPlugin(args);
  throw new TypeError(
    `Unknown command '${command}'. Run 'launchpp --help' for supported commands.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[launchpp] ${message}\n`);
  process.exitCode = 1;
});

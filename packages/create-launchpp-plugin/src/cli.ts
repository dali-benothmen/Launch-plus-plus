#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  note,
  outro,
  select,
  text,
} from "@clack/prompts";

import {
  CAPABILITIES,
  FRAMEWORKS,
  type PluginCapability,
  type PluginFramework,
  scaffoldPlugin,
} from "./scaffold.js";

const capabilityLabels: Readonly<Record<PluginCapability, string>> = {
  "project-page": "Project page",
  "task-action": "Task action",
  "task-field": "Task field",
  "task-panel": "Task panel",
  settings: "Settings",
};

const frameworkLabels: Readonly<Record<PluginFramework, string>> = {
  "react-typescript": "React + TypeScript (recommended)",
  "vanilla-javascript": "Vanilla HTML + JavaScript",
  "vanilla-typescript": "Vanilla HTML + TypeScript",
};

function printHelp(): void {
  process.stdout.write(`Create a Launch++ plugin

Usage:
  pnpm create launchpp-plugin [directory] [options]

Options:
  --name <name>                 Display name
  --id <plugin-id>              Globally unique plugin ID
  --framework <framework>       react-typescript, vanilla-typescript, or vanilla-javascript
  --capabilities <list>         Comma-separated starting capabilities
  --no-tests                    Do not create the example manifest test
  --yes                         Accept defaults for omitted options
  --help                        Show this help

Capabilities:
  ${CAPABILITIES.join(", ")}
`);
}

function titleFromDirectory(directory: string): string {
  const basename = path.basename(path.resolve(directory));
  return basename
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function slugFromDirectory(directory: string): string {
  const basename = path.basename(path.resolve(directory));
  return (
    basename
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "") || "plugin"
  );
}

function parseCapabilities(value: string | undefined): readonly PluginCapability[] | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === "" || value === "none") return [];
  const values = [...new Set(value.split(",").map((item) => item.trim()))];
  const supported = new Set<string>(CAPABILITIES);
  for (const capability of values) {
    if (!supported.has(capability)) {
      throw new TypeError(
        `Unknown capability '${capability}'. Expected one of: ${CAPABILITIES.join(", ")}.`,
      );
    }
  }
  return values as readonly PluginCapability[];
}

function parseFramework(value: string | undefined): PluginFramework | undefined {
  if (value === undefined) return undefined;
  if (!FRAMEWORKS.includes(value as PluginFramework)) {
    throw new TypeError(`Unknown framework '${value}'. Expected one of: ${FRAMEWORKS.join(", ")}.`);
  }
  return value as PluginFramework;
}

function unwrap<Value>(value: Value | symbol): Exclude<Value, symbol> {
  if (isCancel(value)) {
    cancel("Plugin creation cancelled.");
    process.exit(0);
  }
  return value as Exclude<Value, symbol>;
}

async function promptText(message: string, initialValue?: string): Promise<string> {
  return unwrap(
    await text({
      ...(initialValue === undefined ? {} : { initialValue }),
      message,
      validate: (value) => (value?.trim() ? undefined : "A value is required."),
    }),
  );
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowNegative: true,
    allowPositionals: true,
    options: {
      capabilities: { type: "string" },
      framework: { type: "string" },
      help: { short: "h", type: "boolean" },
      id: { type: "string" },
      name: { type: "string" },
      tests: { type: "boolean" },
      yes: { short: "y", type: "boolean" },
    },
    strict: true,
  });

  if (values.help) {
    printHelp();
    return;
  }

  intro("Create a Launch++ plugin");
  const acceptDefaults = values.yes ?? false;
  const targetDirectory =
    positionals[0] ??
    (acceptDefaults ? undefined : await promptText("Project directory", "my-launchpp-plugin"));
  if (targetDirectory === undefined) {
    throw new TypeError("A project directory is required when using --yes.");
  }

  const defaultName = titleFromDirectory(targetDirectory);
  const displayName =
    values.name ?? (acceptDefaults ? defaultName : await promptText("Plugin name", defaultName));
  const defaultId = `com.example.${slugFromDirectory(targetDirectory)}`;
  const pluginId =
    values.id ?? (acceptDefaults ? defaultId : await promptText("Plugin ID", defaultId));
  const parsedCapabilities = parseCapabilities(values.capabilities);
  const capabilities =
    parsedCapabilities ??
    (acceptDefaults
      ? (["project-page"] as const)
      : unwrap(
          await multiselect({
            initialValues: ["project-page"],
            message: "Choose starting capabilities",
            options: CAPABILITIES.map((value) => ({ label: capabilityLabels[value], value })),
            required: false,
          }),
        ));
  const parsedFramework = parseFramework(values.framework);
  const framework =
    parsedFramework ??
    (acceptDefaults
      ? "react-typescript"
      : unwrap(
          await select({
            initialValue: "react-typescript",
            message: "Choose a framework",
            options: FRAMEWORKS.map((value) => ({ label: frameworkLabels[value], value })),
          }),
        ));
  const includeTests =
    values.tests ??
    (acceptDefaults
      ? true
      : unwrap(await confirm({ initialValue: true, message: "Create an example test?" })));

  const result = await scaffoldPlugin({
    capabilities,
    displayName,
    framework,
    includeTests,
    pluginId,
    targetDirectory,
  });
  const relativeDirectory = path.relative(process.cwd(), result.directory) || ".";
  note(`cd ${relativeDirectory}\npnpm install\npnpm dev`, `${result.files.length} files created`);
  outro("Plugin project ready.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  cancel(message);
  process.exitCode = 1;
});

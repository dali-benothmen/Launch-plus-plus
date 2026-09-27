import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PluginSourceManifest, PreviewPermission } from "@launchpp/plugin-protocol";

import { GENERATED_ARTIFACT_PATH, renderGeneratedArtifact } from "./generation.js";
import { readPluginManifest, resolveProjectPath } from "./project.js";

export type DiagnosticLevel = "error" | "warning";

export interface PluginDiagnostic {
  readonly file?: string;
  readonly level: DiagnosticLevel;
  readonly message: string;
  readonly section: "Browser" | "Generated" | "Manifest" | "Permissions" | "Server";
}

export interface CheckPluginResult {
  readonly diagnostics: readonly PluginDiagnostic[];
  readonly manifest: PluginSourceManifest;
  readonly ok: boolean;
}

const sourceExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const ignoredDirectories = new Set([".git", ".launchpp", "dist", "node_modules"]);
const nodeModules = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "crypto",
  "dgram",
  "dns",
  "events",
  "fs",
  "http",
  "https",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "readline",
  "stream",
  "tls",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
]);

const capabilityPermissions: readonly [RegExp, PreviewPermission][] = [
  [/\buseProjects\s*\(/g, "projects:read"],
  [/\buseTasks?\s*\(/g, "tasks:read"],
  [/["']projects\.list["']/g, "projects:read"],
  [/["']projects\.(?:create|update)["']/g, "projects:write"],
  [/["']tasks\.(?:get|list)["']/g, "tasks:read"],
  [/["']tasks\.(?:create|update)["']/g, "tasks:write"],
  [/["']comments\.list["']/g, "comments:read"],
  [/["']comments\.create["']/g, "comments:write"],
  [/\.projects\.list\s*\(/g, "projects:read"],
  [/\.projects\.(?:create|update)\s*\(/g, "projects:write"],
  [/\.tasks\.(?:get|list)\s*\(/g, "tasks:read"],
  [/\.tasks\.(?:create|update)\s*\(/g, "tasks:write"],
  [/\.comments\.list\s*\(/g, "comments:read"],
  [/\.comments\.create\s*\(/g, "comments:write"],
];

function diagnostic(
  level: DiagnosticLevel,
  section: PluginDiagnostic["section"],
  message: string,
  file?: string,
): PluginDiagnostic {
  return { ...(file === undefined ? {} : { file }), level, message, section };
}

async function sourceFiles(directory: string): Promise<readonly string[]> {
  const files: string[] = [];
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) await visit(path.join(current, entry.name));
        continue;
      }
      if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
        files.push(path.join(current, entry.name));
      }
    }
  }
  const src = path.join(directory, "src");
  try {
    await visit(src);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return files.sort();
}

function imports(contents: string): readonly string[] {
  const values: string[] = [];
  const pattern =
    /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of contents.matchAll(pattern)) {
    const value = match[1] ?? match[2];
    if (value) values.push(value);
  }
  return values;
}

function nodeImport(value: string): boolean {
  const normalized = value.startsWith("node:") ? value.slice(5) : value;
  return nodeModules.has(normalized.split("/")[0] ?? normalized);
}

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function relative(projectDirectory: string, file: string): string {
  return path.relative(projectDirectory, file).split(path.sep).join("/");
}

async function entryDiagnostics(
  projectDirectory: string,
  manifest: PluginSourceManifest,
): Promise<PluginDiagnostic[]> {
  const diagnostics: PluginDiagnostic[] = [];
  const entries: readonly (readonly ["Browser" | "Manifest" | "Server", string])[] = [
    ...Object.values(manifest.browser?.surfaces ?? {}).map(
      ({ entry }) => ["Browser", entry] as const,
    ),
    ...Object.values(manifest.server?.handlers ?? {}).map(
      ({ entry }) => ["Server", entry] as const,
    ),
    ...(manifest.contributes?.actions ?? []).flatMap((action) =>
      action.inputSchema ? ([["Manifest", action.inputSchema]] as const) : [],
    ),
  ];
  for (const [section, declared] of entries) {
    try {
      await access(resolveProjectPath(projectDirectory, declared));
    } catch {
      diagnostics.push(
        diagnostic("error", section, `Declared entry '${declared}' does not exist.`, declared),
      );
    }
  }
  for (const [handlerId, handler] of Object.entries(manifest.server?.handlers ?? {})) {
    const file = resolveProjectPath(projectDirectory, handler.entry);
    try {
      const contents = await readFile(file, "utf8");
      const exportPattern = new RegExp(
        `\\bexport\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${regexEscape(handler.export)}\\b`,
      );
      if (!exportPattern.test(contents)) {
        diagnostics.push(
          diagnostic(
            "error",
            "Server",
            `Handler '${handlerId}' does not directly export '${handler.export}'.`,
            handler.entry,
          ),
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return diagnostics;
}

async function generatedDiagnostics(
  projectDirectory: string,
  manifest: PluginSourceManifest,
): Promise<PluginDiagnostic[]> {
  const expected = renderGeneratedArtifact(manifest);
  const file = path.join(projectDirectory, GENERATED_ARTIFACT_PATH);
  try {
    const actual = await readFile(file, "utf8");
    return actual === expected
      ? []
      : [
          diagnostic(
            "error",
            "Generated",
            `Generated artifacts are stale. Run 'launchpp generate'.`,
            GENERATED_ARTIFACT_PATH,
          ),
        ];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [
      diagnostic(
        "error",
        "Generated",
        `Generated artifacts are missing. Run 'launchpp generate'.`,
        GENERATED_ARTIFACT_PATH,
      ),
    ];
  }
}

async function sourceDiagnostics(
  projectDirectory: string,
  manifest: PluginSourceManifest,
): Promise<PluginDiagnostic[]> {
  const diagnostics: PluginDiagnostic[] = [];
  const discovered = new Set<PreviewPermission>();
  const browserEntries = new Set(
    Object.values(manifest.browser?.surfaces ?? {}).map(({ entry }) =>
      relative(projectDirectory, resolveProjectPath(projectDirectory, entry)),
    ),
  );
  const serverEntries = new Set(
    Object.values(manifest.server?.handlers ?? {}).map(({ entry }) =>
      relative(projectDirectory, resolveProjectPath(projectDirectory, entry)),
    ),
  );

  for (const file of await sourceFiles(projectDirectory)) {
    const displayFile = relative(projectDirectory, file);
    if (displayFile === GENERATED_ARTIFACT_PATH) continue;
    const contents = await readFile(file, "utf8");
    const fileImports = imports(contents);
    for (const value of fileImports) {
      if (value === "antd" || value.startsWith("antd/") || value.startsWith("@ant-design/")) {
        diagnostics.push(
          diagnostic(
            "error",
            "Browser",
            `Import '${value}' bypasses the supported @launchpp/ui contract.`,
            displayFile,
          ),
        );
      }
      if (
        value.startsWith("@launchpp-internal/") ||
        value.startsWith("@launchpp/ui/") ||
        value.includes("/apps/web/") ||
        value.includes("/packages/ui/src/")
      ) {
        diagnostics.push(
          diagnostic(
            "error",
            "Browser",
            `Import '${value}' reaches application-private code.`,
            displayFile,
          ),
        );
      }
      if (nodeImport(value) && !serverEntries.has(displayFile)) {
        diagnostics.push(
          diagnostic(
            "error",
            "Browser",
            `Node module '${value}' is not available to browser plugin code.`,
            displayFile,
          ),
        );
      }
      if (
        serverEntries.has(displayFile) &&
        (value === "react" || value.startsWith("react/") || value === "@launchpp/ui")
      ) {
        diagnostics.push(
          diagnostic(
            "error",
            "Server",
            `Server handler imports browser-only module '${value}'.`,
            displayFile,
          ),
        );
      }
    }

    if (/\.ant-[a-z0-9_-]+/i.test(contents)) {
      diagnostics.push(
        diagnostic(
          "error",
          "Browser",
          "Direct .ant-* selector dependencies are unsupported; use public Launch++ components and tokens.",
          displayFile,
        ),
      );
    }
    if (
      browserEntries.has(displayFile) &&
      /\b(?:process|Buffer|__dirname|__filename)\b/.test(contents)
    ) {
      diagnostics.push(
        diagnostic("error", "Browser", "Browser surface uses a Node-only global.", displayFile),
      );
    }
    for (const [pattern, permission] of capabilityPermissions) {
      pattern.lastIndex = 0;
      if (pattern.test(contents)) discovered.add(permission);
    }
  }

  const declared = new Set(manifest.permissions);
  for (const permission of discovered) {
    if (!declared.has(permission)) {
      diagnostics.push(
        diagnostic(
          "error",
          "Permissions",
          `SDK usage requires undeclared permission '${permission}'.`,
        ),
      );
    }
  }
  for (const permission of declared) {
    if (!discovered.has(permission)) {
      diagnostics.push(
        diagnostic(
          "warning",
          "Permissions",
          `Permission '${permission}' is declared but no matching SDK call was statically discovered.`,
        ),
      );
    }
  }
  return diagnostics;
}

export interface CheckPluginOptions {
  readonly projectDirectory?: string;
  readonly warningsAsErrors?: boolean;
}

export async function checkPlugin(options: CheckPluginOptions = {}): Promise<CheckPluginResult> {
  const projectDirectory = path.resolve(options.projectDirectory ?? process.cwd());
  const manifest = await readPluginManifest(projectDirectory);
  const diagnostics = [
    ...(await entryDiagnostics(projectDirectory, manifest)),
    ...(await sourceDiagnostics(projectDirectory, manifest)),
    ...(await generatedDiagnostics(projectDirectory, manifest)),
  ];
  const failed = diagnostics.some(
    ({ level }) => level === "error" || (options.warningsAsErrors === true && level === "warning"),
  );
  return { diagnostics, manifest, ok: !failed };
}

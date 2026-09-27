import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderGeneratedArtifact } from "@launchpp/cli";
import { type PluginSourceManifest, validatePluginSourceManifest } from "@launchpp/plugin-protocol";

export const FRAMEWORKS = ["react-typescript", "vanilla-typescript", "vanilla-javascript"] as const;

export const CAPABILITIES = [
  "project-page",
  "task-panel",
  "task-action",
  "settings",
  "task-field",
] as const;

export type PluginFramework = (typeof FRAMEWORKS)[number];
export type PluginCapability = (typeof CAPABILITIES)[number];

export interface ScaffoldOptions {
  readonly capabilities: readonly PluginCapability[];
  readonly displayName: string;
  readonly framework: PluginFramework;
  readonly includeTests?: boolean;
  readonly pluginId: string;
  readonly targetDirectory: string;
}

export interface ScaffoldResult {
  readonly directory: string;
  readonly files: readonly string[];
  readonly manifest: PluginSourceManifest;
}

const pluginIdPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const packageNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function uniqueCapabilities(
  capabilities: readonly PluginCapability[],
): readonly PluginCapability[] {
  const supported = new Set<string>(CAPABILITIES);
  const unique = [...new Set(capabilities)];
  for (const capability of unique) {
    if (!supported.has(capability)) {
      throw new TypeError(`Unsupported starting capability '${capability}'.`);
    }
  }
  return unique;
}

function validateOptions(options: ScaffoldOptions): readonly PluginCapability[] {
  if (!options.displayName.trim()) throw new TypeError("Plugin name is required.");
  if (!pluginIdPattern.test(options.pluginId)) {
    throw new TypeError(
      "Plugin ID must contain at least two lowercase dot- or dash-separated segments.",
    );
  }
  if (!FRAMEWORKS.includes(options.framework)) {
    throw new TypeError(`Unsupported framework '${options.framework}'.`);
  }
  if (!options.targetDirectory.trim()) throw new TypeError("Target directory is required.");
  return uniqueCapabilities(options.capabilities);
}

function packageName(directory: string): string {
  const candidate = path
    .basename(directory)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-");
  const normalized = candidate.replaceAll(/^-+|-+$/g, "");
  return packageNamePattern.test(normalized) ? normalized : "launchpp-plugin";
}

function adapter(framework: PluginFramework) {
  if (framework === "react-typescript") return "react-vite" as const;
  if (framework === "vanilla-typescript") return "vanilla-typescript-vite" as const;
  return "vanilla-javascript-vite" as const;
}

function surfaceEntry(framework: PluginFramework): string {
  return framework === "react-typescript" ? "./src/PluginSurface.tsx" : "./src/index.html";
}

function buildManifest(
  options: ScaffoldOptions,
  capabilities: readonly PluginCapability[],
): PluginSourceManifest {
  const selected = new Set(capabilities);
  const permissions = [
    ...(selected.has("project-page") ? (["projects:read"] as const) : []),
    ...(selected.has("task-panel") ? (["tasks:read"] as const) : []),
    ...(selected.has("task-action") ? (["tasks:write"] as const) : []),
  ];
  const surfaces = {
    ...(selected.has("project-page")
      ? { "project-page": { entry: surfaceEntry(options.framework) } }
      : {}),
    ...(selected.has("task-panel")
      ? { "task-panel": { entry: surfaceEntry(options.framework) } }
      : {}),
  };
  const manifest = {
    $schema: "./node_modules/@launchpp/plugin-protocol/schemas/plugin-source-v1-preview.json",
    apiVersion: { maximumExclusive: "2", minimum: "1" },
    authoring: { adapter: adapter(options.framework) },
    ...(Object.keys(surfaces).length > 0 ? { browser: { surfaces } } : {}),
    contributes: {
      ...(selected.has("task-action")
        ? {
            actions: [
              {
                handler: "task-action",
                id: "task-action",
                slot: "task.actions",
                title: `${options.displayName} action`,
              },
            ],
          }
        : {}),
      ...(selected.has("project-page")
        ? {
            pages: [
              {
                id: "project-page",
                navigation: {
                  icon: "appstore",
                  label: options.displayName,
                  slot: "project.navigation",
                },
                path: "plugin",
                scope: "project",
                surface: "project-page",
                title: options.displayName,
              },
            ],
          }
        : {}),
      ...(selected.has("task-panel")
        ? {
            panels: [
              {
                id: "task-panel",
                slot: "task.details.panels",
                surface: "task-panel",
                title: options.displayName,
              },
            ],
          }
        : {}),
      ...(selected.has("settings")
        ? {
            settings: [
              {
                fields: [
                  {
                    default: true,
                    id: "enabled",
                    label: "Enabled",
                    type: "boolean",
                  },
                ],
                id: "settings",
                scope: "organization",
                title: `${options.displayName} settings`,
              },
            ],
          }
        : {}),
      ...(selected.has("task-field")
        ? {
            taskFields: [
              {
                id: "value",
                label: `${options.displayName} value`,
                placements: ["task.details.fields", "task.card.badges", "task.list.columns"],
                type: "number",
              },
            ],
          }
        : {}),
    },
    description: `${options.displayName} for Launch++.`,
    id: options.pluginId,
    manifestVersion: "1-preview",
    name: options.displayName,
    permissions: [...new Set(permissions)],
    ...(selected.has("task-action")
      ? {
          server: {
            handlers: {
              "task-action": {
                entry:
                  options.framework === "vanilla-javascript"
                    ? "./src/actions/task-action.js"
                    : "./src/actions/task-action.ts",
                export: "runTaskAction",
              },
            },
          },
        }
      : {}),
    version: "0.1.0",
  };

  const validation = validatePluginSourceManifest(manifest);
  if (!validation.ok) {
    const details = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
    throw new Error(`Generated plugin manifest is invalid:\n${details}`);
  }
  return validation.value;
}

function generatedPackageJson(options: ScaffoldOptions, capabilities: readonly PluginCapability[]) {
  const hasSurface = capabilities.includes("project-page") || capabilities.includes("task-panel");
  const isReact = options.framework === "react-typescript";
  const isTypeScript = options.framework !== "vanilla-javascript";
  const dependencies = {
    "@launchpp/sdk": "0.0.0",
    ...(isReact && hasSurface
      ? {
          "@launchpp/ui": "0.0.0",
          react: "19.3.0",
          "react-dom": "19.3.0",
        }
      : {}),
    ...(!isReact && hasSurface ? { "@launchpp/ui-tokens": "0.0.0" } : {}),
  };
  const devDependencies = {
    "@launchpp/cli": "0.0.0",
    "@launchpp/plugin-protocol": "0.0.0",
    ...(isReact
      ? {
          "@types/react": "19.3.0",
          "@types/react-dom": "19.3.0",
          "@vitejs/plugin-react": "6.1.1",
        }
      : {}),
    ...(isTypeScript ? { typescript: "7.0.2" } : {}),
    ...(options.includeTests === false ? {} : { vitest: "5.0.1" }),
    vite: "8.3.0",
  };

  return {
    name: packageName(options.targetDirectory),
    private: true,
    version: "0.1.0",
    type: "module",
    scripts: {
      check: "launchpp check",
      dev: "launchpp dev",
      pack: "launchpp pack",
      test: "launchpp test",
    },
    dependencies,
    devDependencies,
  };
}

function reactSurface(options: ScaffoldOptions, capabilities: readonly PluginCapability[]): string {
  const hasProjects = capabilities.includes("project-page");
  const hasTasks = capabilities.includes("task-panel");
  const hooks = [
    "useLaunchpp",
    ...(hasProjects ? ["useProjects"] : []),
    ...(hasTasks ? ["useTasks"] : []),
  ];
  const queries = [
    ...(hasProjects ? ["  const projects = useProjects();"] : []),
    ...(hasTasks ? ["  const tasks = useTasks();"] : []),
  ].join("\n");
  const loading = [hasProjects ? "projects.loading" : "", hasTasks ? "tasks.loading" : ""]
    .filter(Boolean)
    .join(" || ");
  const error = [hasProjects ? "projects.error" : "", hasTasks ? "tasks.error" : ""]
    .filter(Boolean)
    .join(" ?? ");
  const facts = [
    ...(hasProjects
      ? [
          "        <Typography.Text>Visible projects: {projects.data?.length ?? 0}</Typography.Text>",
        ]
      : []),
    ...(hasTasks
      ? ["        <Typography.Text>Visible tasks: {tasks.data?.length ?? 0}</Typography.Text>"]
      : []),
  ].join("\n");

  return `import { PluginAsyncState, PluginPageLayout, Space, Typography } from "@launchpp/ui";
import { ${hooks.join(", ")} } from "@launchpp/sdk/react";

const pluginName = ${JSON.stringify(options.displayName)};

export default function PluginSurface() {
  const launch = useLaunchpp();
${queries}

  return (
    <PluginPageLayout
      description="Generated with the supported Launch++ React contract."
      title={pluginName}
    >
      <PluginAsyncState loading={${loading || "false"}} error={${error || "undefined"}}>
        <Space vertical>
          <Typography.Text>Surface: {launch.context.surfaceId}</Typography.Text>
${facts}
        </Space>
      </PluginAsyncState>
    </PluginPageLayout>
  );
}
`;
}

function vanillaMain(options: ScaffoldOptions, capabilities: readonly PluginCapability[]): string {
  const isTypeScript = options.framework === "vanilla-typescript";
  const reads = [
    ...(capabilities.includes("project-page")
      ? [
          "const projects = await launch.projects.list();",
          'addFact("Visible projects: " + projects.length);',
        ]
      : []),
    ...(capabilities.includes("task-panel")
      ? ["const tasks = await launch.tasks.list();", 'addFact("Visible tasks: " + tasks.length);']
      : []),
  ].join("\n");
  const rootGuard = isTypeScript ? "root instanceof HTMLElement" : "root";
  const addFactSignature = isTypeScript
    ? "function addFact(value: string)"
    : "function addFact(value)";

  return `import { createClient } from "@launchpp/sdk";
import "@launchpp/ui-tokens/styles.css";
import "./styles.css";

const root = document.querySelector("#root");
if (!(${rootGuard})) throw new Error("Plugin root was not found.");

const launch = await createClient();
root.replaceChildren();

const heading = document.createElement("h1");
heading.textContent = ${JSON.stringify(options.displayName)};
root.append(heading);

${addFactSignature} {
  const item = document.createElement("p");
  item.textContent = value;
  root.append(item);
}

addFact("Surface: " + launch.context.surfaceId);
${reads}
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function vanillaHtml(options: ScaffoldOptions, framework: PluginFramework): string {
  const extension = framework === "vanilla-typescript" ? "ts" : "js";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(options.displayName)}</title>
  </head>
  <body>
    <main id="root" aria-live="polite">Loading…</main>
    <script type="module" src="./main.${extension}"></script>
  </body>
</html>
`;
}

function vanillaStyles(): string {
  return `body {
  margin: 0;
  color: var(--launch-color-text-primary);
  background: var(--launch-color-bg-canvas);
  font-family: var(--launch-font-family);
}

#root {
  min-height: 100vh;
  padding: 24px;
}

h1,
p {
  margin: 0 0 12px;
}
`;
}

function actionSource(options: ScaffoldOptions, framework: PluginFramework): string {
  const input = framework === "vanilla-javascript" ? "input" : "input: unknown";
  return `export async function runTaskAction(${input}) {
  return {
    input,
    message: ${JSON.stringify(`${options.displayName} action completed.`)},
  };
}
`;
}

function viteConfig(framework: PluginFramework): string {
  if (framework === "react-typescript") {
    return `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react()] });
`;
  }
  return `import { defineConfig } from "vite";

export default defineConfig({});
`;
}

function tsconfig(framework: PluginFramework, includeTests: boolean): string {
  const react = framework === "react-typescript";
  return `${JSON.stringify(
    {
      compilerOptions: {
        exactOptionalPropertyTypes: true,
        isolatedModules: true,
        jsx: react ? "react-jsx" : undefined,
        lib: ["ES2024", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "Bundler",
        noEmit: true,
        noUncheckedIndexedAccess: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        strict: true,
        target: "ES2024",
        types: includeTests ? ["vitest/globals"] : [],
      },
      include: includeTests ? ["src", "tests", "vite.config.ts"] : ["src", "vite.config.ts"],
    },
    (_key, value) => (value === undefined ? undefined : value),
    2,
  )}\n`;
}

function generatedTest(options: ScaffoldOptions, permissions: readonly string[]): string {
  return `import { describe, expect, it } from "vitest";
import manifest from "../launchpp.plugin.json";
import { launchppFixtures } from "../src/generated/launchpp.js";

describe(${JSON.stringify(`${options.displayName} manifest`)}, () => {
  it("declares its identity and exact permissions", () => {
    expect(manifest.id).toBe(${JSON.stringify(options.pluginId)});
    expect(manifest.permissions).toEqual(${JSON.stringify(permissions)});
    expect(launchppFixtures.context.pluginId).toBe(manifest.id);
  });
});
`;
}

function generatedReadme(
  options: ScaffoldOptions,
  capabilities: readonly PluginCapability[],
): string {
  const list =
    capabilities.length > 0 ? capabilities.map((item) => `- ${item}`).join("\n") : "- none";
  return `# ${options.displayName}

Launch++ plugin ID: \`${options.pluginId}\`

## Starting capabilities

${list}

## Commands

\`pnpm dev\` starts the Launch++ development host. \`pnpm check\` validates the
manifest and source contract. \`pnpm test\` runs plugin tests. \`pnpm pack\`
creates the uploadable \`.launch-plugin\` archive.

The manifest is authoritative. Add permissions only when source code begins to
use the corresponding SDK capability.
`;
}

function projectFiles(
  options: ScaffoldOptions,
  capabilities: readonly PluginCapability[],
  manifest: PluginSourceManifest,
): ReadonlyMap<string, string> {
  const files = new Map<string, string>();
  const hasSurface = capabilities.includes("project-page") || capabilities.includes("task-panel");
  files.set(".gitignore", "node_modules\ndist\n*.launch-plugin\n.launchpp/\n");
  files.set("launchpp.plugin.json", `${JSON.stringify(manifest, null, 2)}\n`);
  files.set("src/generated/launchpp.ts", renderGeneratedArtifact(manifest));
  files.set(
    "package.json",
    `${JSON.stringify(generatedPackageJson(options, capabilities), null, 2)}\n`,
  );
  files.set("README.md", generatedReadme(options, capabilities));
  files.set(
    options.framework === "vanilla-javascript" ? "vite.config.js" : "vite.config.ts",
    viteConfig(options.framework),
  );

  if (options.framework !== "vanilla-javascript") {
    files.set("tsconfig.json", tsconfig(options.framework, options.includeTests !== false));
  }
  if (hasSurface && options.framework === "react-typescript") {
    files.set("src/PluginSurface.tsx", reactSurface(options, capabilities));
  }
  if (hasSurface && options.framework !== "react-typescript") {
    files.set("src/index.html", vanillaHtml(options, options.framework));
    files.set(
      options.framework === "vanilla-typescript" ? "src/main.ts" : "src/main.js",
      vanillaMain(options, capabilities),
    );
    files.set("src/styles.css", vanillaStyles());
  }
  if (capabilities.includes("task-action")) {
    files.set(
      options.framework === "vanilla-javascript"
        ? "src/actions/task-action.js"
        : "src/actions/task-action.ts",
      actionSource(options, options.framework),
    );
  }
  if (options.includeTests !== false) {
    files.set(
      options.framework === "vanilla-javascript"
        ? "tests/manifest.test.js"
        : "tests/manifest.test.ts",
      generatedTest(options, manifest.permissions),
    );
  }
  return files;
}

async function directoryIsEmpty(directory: string): Promise<boolean> {
  try {
    await access(directory);
  } catch {
    return true;
  }
  return (await readdir(directory)).length === 0;
}

export async function scaffoldPlugin(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const capabilities = validateOptions(options);
  const directory = path.resolve(options.targetDirectory);
  if (!(await directoryIsEmpty(directory))) {
    throw new Error(`Refusing to overwrite non-empty directory '${directory}'.`);
  }

  const manifest = buildManifest(options, capabilities);
  const files = projectFiles(options, capabilities, manifest);
  await mkdir(directory, { recursive: true });
  for (const [relativePath, contents] of files) {
    const destination = path.join(directory, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents, { encoding: "utf8", flag: "wx" });
  }

  return Object.freeze({
    directory,
    files: Object.freeze([...files.keys()]),
    manifest,
  });
}

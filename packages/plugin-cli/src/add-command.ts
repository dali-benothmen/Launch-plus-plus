import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type PluginSourceManifest,
  type PreviewPermission,
  validatePluginSourceManifest,
} from "@launchpp/plugin-protocol";

import { generatePluginArtifacts } from "./generation.js";
import {
  PLUGIN_MANIFEST_FILENAME,
  readPluginManifest,
  resolveProjectPath,
  writeJsonAtomically,
} from "./project.js";

export const ADD_CAPABILITIES = ["page", "task-panel", "action", "settings", "task-field"] as const;
export type AddCapability = (typeof ADD_CAPABILITIES)[number];

export interface AddContributionOptions {
  readonly capability: AddCapability;
  readonly id: string;
  readonly path?: string;
  readonly projectDirectory?: string;
  readonly scope?: "organization" | "project" | "user";
  readonly slot?: string;
  readonly title: string;
}

export interface AddContributionPlan {
  readonly files: ReadonlyMap<string, string>;
  readonly manifest: PluginSourceManifest;
  readonly summary: readonly string[];
}

function sourceExtension(manifest: PluginSourceManifest): "js" | "ts" | "tsx" {
  if (manifest.authoring.adapter === "react-vite") return "tsx";
  if (manifest.authoring.adapter === "vanilla-javascript-vite") return "js";
  return "ts";
}

function surfaceSource(manifest: PluginSourceManifest, title: string): string {
  if (manifest.authoring.adapter === "react-vite") {
    return `import { PluginPageLayout, Typography } from "@launchpp/ui";

export default function PluginSurface() {
  return (
    <PluginPageLayout title=${JSON.stringify(title)}>
      <Typography.Text>Build your contribution here.</Typography.Text>
    </PluginPageLayout>
  );
}
`;
  }
  return `import { createClient } from "@launchpp/sdk";

const launch = await createClient();
const root = document.querySelector("#root");
if (!root) throw new Error("Plugin root was not found.");
root.textContent = ${JSON.stringify(title)} + " · " + launch.context.surfaceId;
`;
}

function surfaceFiles(
  manifest: PluginSourceManifest,
  id: string,
  title: string,
): ReadonlyMap<string, string> {
  const extension = sourceExtension(manifest);
  const source = `src/surfaces/${id}.${extension}`;
  if (manifest.authoring.adapter === "react-vite") {
    return new Map([[source, surfaceSource(manifest, title)]]);
  }
  const html = `src/surfaces/${id}.html`;
  return new Map([
    [
      html,
      `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body><main id="root">Loading…</main><script type="module" src="./${id}.${extension}"></script></body>
</html>
`,
    ],
    [source, surfaceSource(manifest, title)],
  ]);
}

function nextPermissions(
  manifest: PluginSourceManifest,
  permission?: PreviewPermission,
): readonly PreviewPermission[] {
  return permission === undefined
    ? manifest.permissions
    : [...new Set([...manifest.permissions, permission])];
}

function validateResult(value: unknown): PluginSourceManifest {
  const result = validatePluginSourceManifest(value);
  if (!result.ok) {
    throw new Error(
      `The requested contribution would create an invalid manifest:\n${result.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
  return result.value;
}

export async function planContribution(
  options: AddContributionOptions,
): Promise<AddContributionPlan> {
  const projectDirectory = path.resolve(options.projectDirectory ?? process.cwd());
  const manifest = await readPluginManifest(projectDirectory);
  const contributes = manifest.contributes ?? {};
  const files = new Map<string, string>();
  let candidate: unknown;

  if (options.capability === "page") {
    const scope = options.scope === "organization" ? "organization" : "project";
    const entryFiles = surfaceFiles(manifest, options.id, options.title);
    for (const [file, contents] of entryFiles) files.set(file, contents);
    const entry = `./${[...entryFiles.keys()].find((file) => file.endsWith(".html")) ?? [...entryFiles.keys()][0]}`;
    candidate = {
      ...manifest,
      browser: {
        surfaces: { ...manifest.browser?.surfaces, [options.id]: { entry } },
      },
      contributes: {
        ...contributes,
        pages: [
          ...(contributes.pages ?? []),
          {
            id: options.id,
            navigation: {
              label: options.title,
              slot: scope === "project" ? "project.navigation" : "organization.navigation",
            },
            path: options.path ?? options.id,
            scope,
            surface: options.id,
            title: options.title,
          },
        ],
      },
      permissions: nextPermissions(manifest, "projects:read"),
    };
  } else if (options.capability === "task-panel") {
    const entryFiles = surfaceFiles(manifest, options.id, options.title);
    for (const [file, contents] of entryFiles) files.set(file, contents);
    const entry = `./${[...entryFiles.keys()].find((file) => file.endsWith(".html")) ?? [...entryFiles.keys()][0]}`;
    candidate = {
      ...manifest,
      browser: {
        surfaces: { ...manifest.browser?.surfaces, [options.id]: { entry } },
      },
      contributes: {
        ...contributes,
        panels: [
          ...(contributes.panels ?? []),
          {
            id: options.id,
            slot: options.slot === "board.sidebar" ? "board.sidebar" : "task.details.panels",
            surface: options.id,
            title: options.title,
          },
        ],
      },
      permissions: nextPermissions(manifest, "tasks:read"),
    };
  } else if (options.capability === "action") {
    const extension = manifest.authoring.adapter === "vanilla-javascript-vite" ? "js" : "ts";
    const file = `src/actions/${options.id}.${extension}`;
    files.set(
      file,
      `export async function run(input${extension === "js" ? "" : ": unknown"}) {
  return { input, message: ${JSON.stringify(`${options.title} completed.`)} };
}
`,
    );
    candidate = {
      ...manifest,
      contributes: {
        ...contributes,
        actions: [
          ...(contributes.actions ?? []),
          {
            handler: options.id,
            id: options.id,
            slot: options.slot ?? "task.actions",
            title: options.title,
          },
        ],
      },
      permissions: nextPermissions(manifest, "tasks:write"),
      server: {
        handlers: {
          ...manifest.server?.handlers,
          [options.id]: { entry: `./${file}`, export: "run" },
        },
      },
    };
  } else if (options.capability === "settings") {
    candidate = {
      ...manifest,
      contributes: {
        ...contributes,
        settings: [
          ...(contributes.settings ?? []),
          {
            fields: [{ default: true, id: "enabled", label: "Enabled", type: "boolean" }],
            id: options.id,
            scope: options.scope ?? "organization",
            title: options.title,
          },
        ],
      },
    };
  } else {
    candidate = {
      ...manifest,
      contributes: {
        ...contributes,
        taskFields: [
          ...(contributes.taskFields ?? []),
          {
            id: options.id,
            label: options.title,
            placements: ["task.details.fields", "task.card.badges", "task.list.columns"],
            type: "text",
          },
        ],
      },
    };
  }

  const nextManifest = validateResult(candidate);
  for (const file of files.keys()) {
    try {
      await access(path.join(projectDirectory, file));
      throw new Error(`Refusing to overwrite existing file '${file}'.`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return {
    files,
    manifest: nextManifest,
    summary: [
      ...[...files.keys()].map((file) => `create ${file}`),
      `update ${PLUGIN_MANIFEST_FILENAME}`,
      `generate src/generated/launchpp.ts`,
    ],
  };
}

export async function applyContributionPlan(
  plan: AddContributionPlan,
  projectDirectory = process.cwd(),
): Promise<void> {
  const directory = path.resolve(projectDirectory);
  for (const [relativeFile, contents] of plan.files) {
    const file = resolveProjectPath(directory, `./${relativeFile}`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contents, { encoding: "utf8", flag: "wx" });
  }
  await writeJsonAtomically(path.join(directory, PLUGIN_MANIFEST_FILENAME), plan.manifest);
  await generatePluginArtifacts({ projectDirectory: directory });
}

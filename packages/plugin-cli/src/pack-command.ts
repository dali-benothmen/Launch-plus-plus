import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  type InspectedPreviewPluginArchive,
  inspectPreviewPluginArchive,
  packPluginDirectory,
} from "@launchpp/plugin-package";
import {
  PLUGIN_PROTOCOL_VERSION,
  type PluginPackageManifest,
  type PluginSourceManifest,
  validatePluginPackageManifest,
} from "@launchpp/plugin-protocol";
import react from "@vitejs/plugin-react";
import { build } from "vite";

import { checkPlugin } from "./check-command.js";
import { generatePluginArtifacts, PLUGIN_CLI_VERSION } from "./generation.js";
import { readPluginManifest, resolveProjectPath } from "./project.js";

const buildMetadataPath = "assets/build-metadata.json";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function findFiles(directory: string, extension: string): Promise<readonly string[]> {
  const found: string[] = [];
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && path.extname(entry.name) === extension) found.push(file);
    }
  }
  await visit(directory);
  return found.sort();
}

async function ensureIndexHtml(outputDirectory: string): Promise<void> {
  const expected = path.join(outputDirectory, "index.html");
  if (await exists(expected)) return;
  const htmlFiles = await findFiles(outputDirectory, ".html");
  if (htmlFiles.length !== 1 || htmlFiles[0] === undefined) {
    throw new Error("The browser build did not emit exactly one HTML document.");
  }
  await rename(htmlFiles[0], expected);
}

function builtModuleIds(result: unknown): readonly string[] {
  if (Array.isArray(result)) return result.flatMap(builtModuleIds);
  if (typeof result !== "object" || result === null || !("output" in result)) return [];
  const output = result.output;
  if (!Array.isArray(output)) return [];
  return output.flatMap((item) => {
    if (typeof item !== "object" || item === null || !("modules" in item)) return [];
    const modules = item.modules;
    return typeof modules === "object" && modules !== null ? Object.keys(modules) : [];
  });
}

async function buildBrowserSurface(
  input: Readonly<{
    adapter: PluginSourceManifest["authoring"]["adapter"];
    authoringDirectory: string;
    entry: string;
    outputDirectory: string;
    projectDirectory: string;
    surfaceId: string;
  }>,
): Promise<readonly string[]> {
  await mkdir(input.outputDirectory, { recursive: true });
  let htmlEntry = resolveProjectPath(input.projectDirectory, input.entry);
  if (input.adapter === "react-vite") {
    const surfaceDirectory = path.join(input.authoringDirectory, input.surfaceId);
    await mkdir(surfaceDirectory, { recursive: true });
    const moduleEntry = path.join(surfaceDirectory, "entry.tsx");
    htmlEntry = path.join(surfaceDirectory, "index.html");
    const sourceEntry = resolveProjectPath(input.projectDirectory, input.entry)
      .split(path.sep)
      .join("/");
    await writeFile(
      moduleEntry,
      `import Surface from ${JSON.stringify(sourceEntry)};
import { mountPluginSurface } from "@launchpp/ui";

void mountPluginSurface({ component: Surface });
`,
      "utf8",
    );
    await writeFile(
      htmlEntry,
      `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body><div id="root"></div><script type="module" src="./entry.tsx"></script></body>
</html>
`,
      "utf8",
    );
  }

  const result = await build({
    base: "./",
    build: {
      assetsDir: "assets",
      emptyOutDir: true,
      minify: "esbuild",
      outDir: input.outputDirectory,
      rollupOptions: { input: { index: htmlEntry } },
      sourcemap: false,
      target: "es2022",
      write: true,
    },
    configFile: false,
    logLevel: "error",
    plugins: input.adapter === "react-vite" ? [react()] : [],
    publicDir: false,
    root: input.projectDirectory,
  });
  await ensureIndexHtml(input.outputDirectory);
  return builtModuleIds(result);
}

async function buildServerHandler(
  input: Readonly<{
    entry: string;
    exportName: string;
    handlerId: string;
    outputDirectory: string;
    projectDirectory: string;
  }>,
): Promise<readonly string[]> {
  const temporaryOutput = path.join(input.outputDirectory, ".build", input.handlerId);
  const result = await build({
    build: {
      emptyOutDir: true,
      lib: {
        entry: resolveProjectPath(input.projectDirectory, input.entry),
        fileName: () => `${input.handlerId}.js`,
        formats: ["es"],
      },
      minify: "esbuild",
      outDir: temporaryOutput,
      sourcemap: false,
      target: "es2022",
      write: true,
    },
    configFile: false,
    logLevel: "error",
    publicDir: false,
    root: input.projectDirectory,
  });
  const javascript = await findFiles(temporaryOutput, ".js");
  if (javascript.length !== 1 || javascript[0] === undefined) {
    throw new Error(`Handler '${input.handlerId}' did not produce one server module.`);
  }
  const contents = await readFile(javascript[0], "utf8");
  if (/\bimport(?:\s|\(|\.)|\brequire\s*\(/.test(contents)) {
    throw new Error(
      `Handler '${input.handlerId}' retains an external import after bundling. Remove Node/native-only dependencies.`,
    );
  }
  if (!new RegExp(`\\bexport\\s*\\{[^}]*\\b${input.exportName}\\b`, "s").test(contents)) {
    throw new Error(`Handler '${input.handlerId}' build does not export '${input.exportName}'.`);
  }
  await mkdir(input.outputDirectory, { recursive: true });
  await writeFile(path.join(input.outputDirectory, `${input.handlerId}.js`), contents, "utf8");
  await rm(path.join(input.outputDirectory, ".build"), { force: true, recursive: true });
  return builtModuleIds(result);
}

interface ProjectPackageJson {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

async function readProjectPackage(projectDirectory: string): Promise<ProjectPackageJson> {
  try {
    return JSON.parse(
      await readFile(path.join(projectDirectory, "package.json"), "utf8"),
    ) as ProjectPackageJson;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function dependencyRoots(
  projectDirectory: string,
  projectPackage: ProjectPackageJson,
): Promise<ReadonlyMap<string, string>> {
  const dependencies = { ...projectPackage.peerDependencies, ...projectPackage.dependencies };
  const roots = new Map<string, string>();
  for (const name of Object.keys(dependencies).sort()) {
    try {
      roots.set(name, await realpath(path.join(projectDirectory, "node_modules", name)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return roots;
}

function compatibleRange(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return /^(?:\*|(?:\^|~|>=|<=|>|<)?\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?(?:\s+(?:>=|<=|>|<)\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?)*)$/.test(
    value,
  )
    ? value
    : undefined;
}

async function copyActionSchemas(
  projectDirectory: string,
  packageDirectory: string,
  manifest: PluginSourceManifest,
): Promise<PluginSourceManifest["contributes"]> {
  if (!manifest.contributes?.actions) return manifest.contributes;
  const actions = [];
  for (const action of manifest.contributes.actions) {
    if (action.inputSchema === undefined) {
      actions.push(action);
      continue;
    }
    const source = resolveProjectPath(projectDirectory, action.inputSchema);
    let document: unknown;
    try {
      document = JSON.parse(await readFile(source, "utf8")) as unknown;
    } catch (error) {
      throw new Error(`Action '${action.id}' input schema must contain valid JSON.`, {
        cause: error,
      });
    }
    const target = `schemas/actions/${action.id}-input.json`;
    await mkdir(path.join(packageDirectory, "schemas", "actions"), { recursive: true });
    await writeFile(path.join(packageDirectory, target), prettyJson(document), "utf8");
    actions.push({ ...action, inputSchema: `./${target}` });
  }
  return { ...manifest.contributes, actions };
}

function validatePackageManifest(value: unknown): PluginPackageManifest {
  const validation = validatePluginPackageManifest(value);
  if (!validation.ok) {
    throw new Error(
      `Generated package manifest is invalid:\n${validation.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
  return validation.value;
}

async function normalizeManifest(
  projectDirectory: string,
  packageDirectory: string,
  manifest: PluginSourceManifest,
  projectPackage: ProjectPackageJson,
): Promise<PluginPackageManifest> {
  const { $schema: _schema, authoring: _authoring, browser, server, ...identity } = manifest;
  const dependencies = { ...projectPackage.peerDependencies, ...projectPackage.dependencies };
  const sdk = compatibleRange(dependencies["@launchpp/sdk"]);
  const ui = compatibleRange(dependencies["@launchpp/ui"]);
  const compatibility =
    identity.compatibility || sdk || ui
      ? {
          ...identity.compatibility,
          ...(sdk === undefined ? {} : { sdk }),
          ...(ui === undefined ? {} : { ui }),
        }
      : undefined;
  const contributes = await copyActionSchemas(projectDirectory, packageDirectory, manifest);
  return validatePackageManifest({
    ...identity,
    ...(compatibility === undefined ? {} : { compatibility }),
    ...(contributes === undefined ? {} : { contributes }),
    ...(browser === undefined
      ? {}
      : {
          browser: {
            surfaces: Object.fromEntries(
              Object.keys(browser.surfaces)
                .sort()
                .map((surfaceId) => [
                  surfaceId,
                  { document: `./browser/surfaces/${surfaceId}/index.html` },
                ]),
            ),
          },
        }),
    ...(server === undefined
      ? {}
      : {
          server: {
            handlers: Object.fromEntries(
              Object.entries(server.handlers)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([handlerId, handler]) => [
                  handlerId,
                  { export: handler.export, module: `./server/${handlerId}.js` },
                ]),
            ),
          },
        }),
  });
}

export interface PackPluginProjectOptions {
  readonly outputFile?: string;
  readonly projectDirectory?: string;
}

export interface PackedPluginProject {
  readonly archiveBytes: number;
  readonly inspected: InspectedPreviewPluginArchive;
  readonly outputFile: string;
}

export async function packPluginProject(
  options: PackPluginProjectOptions = {},
): Promise<PackedPluginProject> {
  const projectDirectory = path.resolve(options.projectDirectory ?? process.cwd());
  await generatePluginArtifacts({ projectDirectory });
  const checked = await checkPlugin({ projectDirectory });
  if (!checked.ok) throw new Error("Plugin checks failed. Run 'launchpp check' for details.");
  const manifest = await readPluginManifest(projectDirectory);
  const projectPackage = await readProjectPackage(projectDirectory);
  const dependencyRootMap = await dependencyRoots(projectDirectory, projectPackage);
  const bundledDependencyNames = new Set<string>();
  const collectBundledDependencies = (moduleIds: readonly string[]): void => {
    for (const moduleId of moduleIds) {
      const normalized = moduleId.split("?")[0] ?? moduleId;
      for (const [name, root] of dependencyRootMap) {
        if (normalized === root || normalized.startsWith(`${root}${path.sep}`)) {
          bundledDependencyNames.add(name);
        }
      }
    }
  };
  const workingRoot = path.join(projectDirectory, ".launchpp");
  await mkdir(workingRoot, { recursive: true });
  const temporaryDirectory = await mkdtemp(path.join(workingRoot, "pack-"));
  const authoringDirectory = path.join(temporaryDirectory, "authoring");
  const packageDirectory = path.join(temporaryDirectory, "package");

  try {
    for (const [surfaceId, surface] of Object.entries(manifest.browser?.surfaces ?? {}).sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      collectBundledDependencies(
        await buildBrowserSurface({
          adapter: manifest.authoring.adapter,
          authoringDirectory,
          entry: surface.entry,
          outputDirectory: path.join(packageDirectory, "browser", "surfaces", surfaceId),
          projectDirectory,
          surfaceId,
        }),
      );
    }
    for (const [handlerId, handler] of Object.entries(manifest.server?.handlers ?? {}).sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      collectBundledDependencies(
        await buildServerHandler({
          entry: handler.entry,
          exportName: handler.export,
          handlerId,
          outputDirectory: path.join(packageDirectory, "server"),
          projectDirectory,
        }),
      );
    }

    const packageManifest = await normalizeManifest(
      projectDirectory,
      packageDirectory,
      manifest,
      projectPackage,
    );
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      path.join(packageDirectory, "manifest.json"),
      prettyJson(packageManifest),
      "utf8",
    );
    const license = path.join(projectDirectory, "license.txt");
    if (await exists(license)) await copyFile(license, path.join(packageDirectory, "license.txt"));
    const allDependencies = {
      ...projectPackage.peerDependencies,
      ...projectPackage.dependencies,
    };
    const bundledDependencies = [...bundledDependencyNames]
      .sort()
      .map((name) => ({ name, version: allDependencies[name] ?? "unknown" }));
    await mkdir(path.join(packageDirectory, "assets"), { recursive: true });
    await writeFile(
      path.join(packageDirectory, buildMetadataPath),
      prettyJson({
        adapter: manifest.authoring.adapter,
        cliVersion: PLUGIN_CLI_VERSION,
        bundledDependencies,
        formatVersion: "1-preview",
        protocolVersion: PLUGIN_PROTOCOL_VERSION,
        sourceManifestSha256: sha256(canonicalJson(manifest)),
      }),
      "utf8",
    );

    const packed = await packPluginDirectory(packageDirectory);
    const inspected = inspectPreviewPluginArchive(packed.archive);
    const outputFile = path.resolve(
      projectDirectory,
      options.outputFile ?? `dist/${manifest.id}-${manifest.version}.launch-plugin`,
    );
    if (!outputFile.endsWith(".launch-plugin")) {
      throw new TypeError("The package output filename must end with .launch-plugin.");
    }
    await mkdir(path.dirname(outputFile), { recursive: true });
    const temporaryOutput = `${outputFile}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporaryOutput, packed.archive);
    await rename(temporaryOutput, outputFile);
    return { archiveBytes: packed.archive.byteLength, inspected, outputFile };
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

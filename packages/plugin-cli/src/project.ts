import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { type PluginSourceManifest, validatePluginSourceManifest } from "@launchpp/plugin-protocol";

export const PLUGIN_MANIFEST_FILENAME = "launchpp.plugin.json";

export async function readPluginManifest(projectDirectory: string): Promise<PluginSourceManifest> {
  const manifestPath = path.join(projectDirectory, PLUGIN_MANIFEST_FILENAME);
  let input: unknown;
  try {
    input = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Could not find ${PLUGIN_MANIFEST_FILENAME} in ${projectDirectory}.`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`${PLUGIN_MANIFEST_FILENAME} is not valid JSON: ${error.message}`);
    }
    throw error;
  }

  const validation = validatePluginSourceManifest(input);
  if (!validation.ok) {
    const details = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
    throw new Error(`${PLUGIN_MANIFEST_FILENAME} is invalid:\n${details}`);
  }
  return validation.value;
}

export function resolveProjectPath(projectDirectory: string, declaredPath: string): string {
  const root = path.resolve(projectDirectory);
  const resolved = path.resolve(root, declaredPath.replace(/^\.\//, ""));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Declared path '${declaredPath}' escapes the plugin project.`);
  }
  return resolved;
}

export async function writeJsonAtomically(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

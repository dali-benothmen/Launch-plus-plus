import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  type InstalledPluginManifest,
  type PluginIntegrity,
  validateInstalledPluginManifest,
} from "@launchpp/plugin-protocol";
import { isAllowedPluginPackagePath } from "@launchpp/plugin-runtime";
import { type Zippable, zipSync } from "fflate";

const fixedZipTimestamp = new Date(1980, 0, 1, 0, 0, 0, 0);

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function collectFiles(directory: string, prefix = ""): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

  for (const entry of entries) {
    const archivePath = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
    const diskPath = path.join(directory, entry.name);
    const metadata = await lstat(diskPath);
    if (metadata.isSymbolicLink()) {
      throw new Error(`Plugin package input cannot contain a symbolic link: ${archivePath}`);
    }
    if (metadata.isDirectory()) {
      const nested = await collectFiles(diskPath, archivePath);
      for (const [nestedPath, contents] of nested) files.set(nestedPath, contents);
      continue;
    }
    if (!metadata.isFile()) {
      throw new Error(`Plugin package input must contain only regular files: ${archivePath}`);
    }
    if (archivePath === "integrity.json") {
      throw new Error("Plugin package input must not contain generated integrity.json.");
    }
    if (!isAllowedPluginPackagePath(archivePath)) {
      throw new Error(`Plugin package input path is not allowed: ${archivePath}`);
    }
    files.set(archivePath, new Uint8Array(await readFile(diskPath)));
  }

  return files;
}

function parseManifest(bytes: Uint8Array | undefined): InstalledPluginManifest {
  if (bytes === undefined) throw new Error("Plugin package input is missing manifest.json.");
  let document: unknown;
  try {
    document = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new Error("Plugin manifest must contain valid UTF-8 JSON.", { cause: error });
  }
  const result = validateInstalledPluginManifest(document);
  if (!result.ok) {
    const first = result.issues[0];
    throw new Error(
      first === undefined
        ? "Plugin manifest is invalid."
        : `Plugin manifest is invalid at ${first.path}: ${first.message}`,
    );
  }
  return result.value;
}

function integrityDocument(files: ReadonlyMap<string, Uint8Array>): PluginIntegrity {
  const hashes: Record<string, string> = {};
  for (const filePath of [...files.keys()].sort()) {
    const contents = files.get(filePath);
    if (contents !== undefined) hashes[filePath] = sha256(contents);
  }
  return { algorithm: "sha256", files: hashes, formatVersion: "0" };
}

function canonicalJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}

export interface PackedPlugin {
  readonly archive: Uint8Array;
  readonly integrity: PluginIntegrity;
  readonly manifest: InstalledPluginManifest;
  readonly packageHash: string;
}

export async function packPluginDirectory(inputDirectory: string): Promise<PackedPlugin> {
  const files = await collectFiles(path.resolve(inputDirectory));
  const manifest = parseManifest(files.get("manifest.json"));
  const integrity = integrityDocument(files);
  files.set("integrity.json", canonicalJson(integrity));

  const zippable: Zippable = {};
  for (const filePath of [...files.keys()].sort()) {
    const contents = files.get(filePath);
    if (contents === undefined) continue;
    zippable[filePath] = [
      contents,
      {
        attrs: 0o100644 << 16,
        level: 9,
        mtime: fixedZipTimestamp,
        os: 3,
      },
    ];
  }
  const archive = zipSync(zippable, {
    level: 9,
    mtime: fixedZipTimestamp,
    os: 3,
  });

  return {
    archive,
    integrity,
    manifest,
    packageHash: sha256(archive),
  };
}

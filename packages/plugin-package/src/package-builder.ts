import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  type InstalledPluginManifest,
  type PluginIntegrity,
  type PluginPackageIntegrity,
  type PluginPackageManifest,
  validateInstalledPluginManifest,
  validatePluginPackageManifest,
} from "@launchpp/plugin-protocol";
import { type Zippable, zipSync } from "fflate";
import { isAllowedPluginPackagePath } from "./package-intake.js";

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

type PackableManifest = InstalledPluginManifest | PluginPackageManifest;
type PackableIntegrity = PluginIntegrity | PluginPackageIntegrity;

function parseManifest(bytes: Uint8Array | undefined): PackableManifest {
  if (bytes === undefined) throw new Error("Plugin package input is missing manifest.json.");
  let document: unknown;
  try {
    document = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new Error("Plugin manifest must contain valid UTF-8 JSON.", { cause: error });
  }
  const preview =
    typeof document === "object" &&
    document !== null &&
    "manifestVersion" in document &&
    document.manifestVersion === "1-preview";
  const result = preview
    ? validatePluginPackageManifest(document)
    : validateInstalledPluginManifest(document);
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

function integrityDocument(
  files: ReadonlyMap<string, Uint8Array>,
  preview: boolean,
): PackableIntegrity {
  if (preview) {
    const records: Record<string, { readonly sha256: string; readonly sizeBytes: number }> = {};
    for (const filePath of [...files.keys()].sort()) {
      const contents = files.get(filePath);
      if (contents !== undefined) {
        records[filePath] = { sha256: sha256(contents), sizeBytes: contents.byteLength };
      }
    }
    return { algorithm: "sha256", files: records, formatVersion: "1-preview" };
  }

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
  readonly integrity: PackableIntegrity;
  readonly manifest: PackableManifest;
  readonly packageHash: string;
}

export async function packPluginDirectory(inputDirectory: string): Promise<PackedPlugin> {
  const files = await collectFiles(path.resolve(inputDirectory));
  const manifest = parseManifest(files.get("manifest.json"));
  const integrity = integrityDocument(
    files,
    "manifestVersion" in manifest && manifest.manifestVersion === "1-preview",
  );
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

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type InstalledPluginManifest,
  type PluginIntegrity,
  validateInstalledPluginManifest,
  validatePluginIntegrity,
} from "@launchpp/plugin-protocol";
import { unzipSync, type UnzipFileInfo } from "fflate";

export const PLUGIN_ARCHIVE_ERROR_CODES = {
  archiveTooLarge: "ARCHIVE_TOO_LARGE",
  duplicatePath: "DUPLICATE_PATH",
  entryTooLarge: "ENTRY_TOO_LARGE",
  forbiddenPath: "FORBIDDEN_PATH",
  integrityMismatch: "INTEGRITY_MISMATCH",
  invalidArchive: "INVALID_ARCHIVE",
  invalidIntegrity: "INVALID_INTEGRITY",
  invalidManifest: "INVALID_MANIFEST",
  tooManyEntries: "TOO_MANY_ENTRIES",
  zipBomb: "ZIP_BOMB",
} as const;

export type PluginArchiveErrorCode =
  (typeof PLUGIN_ARCHIVE_ERROR_CODES)[keyof typeof PLUGIN_ARCHIVE_ERROR_CODES];

export class PluginArchiveError extends Error {
  readonly code: PluginArchiveErrorCode;

  constructor(code: PluginArchiveErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PluginArchiveError";
    this.code = code;
  }
}

export interface PluginArchiveLimits {
  readonly maxArchiveBytes: number;
  readonly maxCompressionRatio: number;
  readonly maxEntries: number;
  readonly maxEntryBytes: number;
  readonly maxPathLength: number;
  readonly maxTotalExpandedBytes: number;
}

export const DEFAULT_PLUGIN_ARCHIVE_LIMITS: PluginArchiveLimits = {
  maxArchiveBytes: 10 * 1024 * 1024,
  maxCompressionRatio: 100,
  maxEntries: 500,
  maxEntryBytes: 5 * 1024 * 1024,
  maxPathLength: 240,
  maxTotalExpandedBytes: 20 * 1024 * 1024,
};

const allowedRoots = new Set(["assets", "browser", "data", "schemas", "server"]);
const allowedRootFiles = new Set(["integrity.json", "license.txt", "manifest.json"]);
const safePathPattern = /^[A-Za-z0-9._/-]+$/;

export function isAllowedPluginPackagePath(filePath: string): boolean {
  if (
    filePath.length === 0 ||
    filePath.startsWith("/") ||
    filePath.endsWith("/") ||
    filePath.includes("\\") ||
    !safePathPattern.test(filePath)
  ) {
    return false;
  }
  const segments = filePath.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return false;
  }
  if (segments.length === 1) return allowedRootFiles.has(filePath);
  return allowedRoots.has(segments[0] ?? "");
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function decodeJson(bytes: Uint8Array, label: string): unknown {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new PluginArchiveError(
      PLUGIN_ARCHIVE_ERROR_CODES.invalidArchive,
      `${label} must contain valid UTF-8 JSON.`,
      { cause: error },
    );
  }
}

function validationMessage(
  label: string,
  issues: readonly { readonly message: string; readonly path: string }[],
): string {
  const first = issues[0];
  return first === undefined
    ? `${label} is invalid.`
    : `${label} is invalid at ${first.path}: ${first.message}`;
}

function inspectEntries(
  archive: Uint8Array,
  limits: PluginArchiveLimits,
): Record<string, Uint8Array> {
  const paths = new Set<string>();
  const portablePaths = new Set<string>();
  let entries = 0;
  let expandedBytes = 0;

  const filter = (entry: UnzipFileInfo): boolean => {
    entries += 1;
    if (entries > limits.maxEntries) {
      throw new PluginArchiveError(
        PLUGIN_ARCHIVE_ERROR_CODES.tooManyEntries,
        `Plugin archive contains more than ${limits.maxEntries} entries.`,
      );
    }
    if (entry.name.length > limits.maxPathLength || !isAllowedPluginPackagePath(entry.name)) {
      throw new PluginArchiveError(
        PLUGIN_ARCHIVE_ERROR_CODES.forbiddenPath,
        `Plugin archive path '${entry.name}' is not allowed.`,
      );
    }
    if (paths.has(entry.name) || portablePaths.has(entry.name.toLowerCase())) {
      throw new PluginArchiveError(
        PLUGIN_ARCHIVE_ERROR_CODES.duplicatePath,
        `Plugin archive path '${entry.name}' is duplicated or differs only by case.`,
      );
    }
    paths.add(entry.name);
    portablePaths.add(entry.name.toLowerCase());

    if (entry.originalSize > limits.maxEntryBytes) {
      throw new PluginArchiveError(
        PLUGIN_ARCHIVE_ERROR_CODES.entryTooLarge,
        `Plugin archive entry '${entry.name}' exceeds the expanded size limit.`,
      );
    }
    expandedBytes += entry.originalSize;
    if (expandedBytes > limits.maxTotalExpandedBytes) {
      throw new PluginArchiveError(
        PLUGIN_ARCHIVE_ERROR_CODES.zipBomb,
        "Plugin archive exceeds the total expanded size limit.",
      );
    }
    const ratio = entry.originalSize / Math.max(1, entry.size);
    if (ratio > limits.maxCompressionRatio) {
      throw new PluginArchiveError(
        PLUGIN_ARCHIVE_ERROR_CODES.zipBomb,
        `Plugin archive entry '${entry.name}' exceeds the compression-ratio limit.`,
      );
    }
    return true;
  };

  try {
    return unzipSync(archive, { filter });
  } catch (error) {
    if (error instanceof PluginArchiveError) throw error;
    throw new PluginArchiveError(
      PLUGIN_ARCHIVE_ERROR_CODES.invalidArchive,
      "Plugin archive is not a supported ZIP file.",
      { cause: error },
    );
  }
}

export interface InspectedPluginArchive {
  readonly files: Readonly<Record<string, Uint8Array>>;
  readonly integrity: PluginIntegrity;
  readonly manifest: InstalledPluginManifest;
  readonly packageHash: string;
}

export function inspectPluginArchive(
  archive: Uint8Array,
  overrides: Partial<PluginArchiveLimits> = {},
): InspectedPluginArchive {
  const limits = { ...DEFAULT_PLUGIN_ARCHIVE_LIMITS, ...overrides };
  if (archive.byteLength > limits.maxArchiveBytes) {
    throw new PluginArchiveError(
      PLUGIN_ARCHIVE_ERROR_CODES.archiveTooLarge,
      "Plugin archive exceeds the compressed size limit.",
    );
  }

  const files = inspectEntries(archive, limits);
  const manifestDocument = files["manifest.json"];
  const integrityDocument = files["integrity.json"];
  if (manifestDocument === undefined) {
    throw new PluginArchiveError(
      PLUGIN_ARCHIVE_ERROR_CODES.invalidManifest,
      "Plugin archive is missing manifest.json.",
    );
  }
  if (integrityDocument === undefined) {
    throw new PluginArchiveError(
      PLUGIN_ARCHIVE_ERROR_CODES.invalidIntegrity,
      "Plugin archive is missing integrity.json.",
    );
  }

  const manifestResult = validateInstalledPluginManifest(
    decodeJson(manifestDocument, "manifest.json"),
  );
  if (!manifestResult.ok) {
    throw new PluginArchiveError(
      PLUGIN_ARCHIVE_ERROR_CODES.invalidManifest,
      validationMessage("manifest.json", manifestResult.issues),
    );
  }
  for (const surface of Object.values(manifestResult.value.browser?.surfaces ?? {})) {
    const documentPath = surface.document.slice(2);
    if (files[documentPath] === undefined) {
      throw new PluginArchiveError(
        PLUGIN_ARCHIVE_ERROR_CODES.invalidManifest,
        `Manifest browser document '${surface.document}' is missing from the archive.`,
      );
    }
  }
  const integrityResult = validatePluginIntegrity(decodeJson(integrityDocument, "integrity.json"));
  if (!integrityResult.ok) {
    throw new PluginArchiveError(
      PLUGIN_ARCHIVE_ERROR_CODES.invalidIntegrity,
      validationMessage("integrity.json", integrityResult.issues),
    );
  }

  const expectedPaths = Object.keys(files)
    .filter((filePath) => filePath !== "integrity.json")
    .sort();
  const declaredPaths = Object.keys(integrityResult.value.files).sort();
  if (JSON.stringify(expectedPaths) !== JSON.stringify(declaredPaths)) {
    throw new PluginArchiveError(
      PLUGIN_ARCHIVE_ERROR_CODES.integrityMismatch,
      "integrity.json must cover every package file exactly once.",
    );
  }
  for (const filePath of expectedPaths) {
    const contents = files[filePath];
    if (contents === undefined || sha256(contents) !== integrityResult.value.files[filePath]) {
      throw new PluginArchiveError(
        PLUGIN_ARCHIVE_ERROR_CODES.integrityMismatch,
        `Integrity check failed for '${filePath}'.`,
      );
    }
  }

  return {
    files,
    integrity: integrityResult.value,
    manifest: manifestResult.value,
    packageHash: sha256(archive),
  };
}

export interface InstalledPluginPackage {
  readonly alreadyInstalled: boolean;
  readonly directory: string;
  readonly manifest: InstalledPluginManifest;
  readonly packageHash: string;
}

export async function installPluginArchive(
  archive: Uint8Array,
  installationRoot: string,
  limits: Partial<PluginArchiveLimits> = {},
): Promise<InstalledPluginPackage> {
  const inspected = inspectPluginArchive(archive, limits);
  await mkdir(installationRoot, { mode: 0o700, recursive: true });
  const stagingDirectory = await mkdtemp(path.join(installationRoot, ".staging-"));
  const targetDirectory = path.join(
    installationRoot,
    inspected.manifest.id,
    inspected.manifest.version,
    inspected.packageHash,
  );

  try {
    for (const filePath of Object.keys(inspected.files).sort()) {
      const contents = inspected.files[filePath];
      if (contents === undefined) continue;
      const destination = path.join(stagingDirectory, ...filePath.split("/"));
      await mkdir(path.dirname(destination), { mode: 0o700, recursive: true });
      await writeFile(destination, contents, { flag: "wx", mode: 0o600 });
    }
    await mkdir(path.dirname(targetDirectory), { mode: 0o700, recursive: true });
    try {
      await rename(stagingDirectory, targetDirectory);
      return {
        alreadyInstalled: false,
        directory: targetDirectory,
        manifest: inspected.manifest,
        packageHash: inspected.packageHash,
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST" && code !== "ENOTEMPTY") throw error;
      return {
        alreadyInstalled: true,
        directory: targetDirectory,
        manifest: inspected.manifest,
        packageHash: inspected.packageHash,
      };
    }
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
}

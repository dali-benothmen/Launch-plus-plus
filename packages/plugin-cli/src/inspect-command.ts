import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  type InspectedPreviewPluginArchive,
  inspectPreviewPluginArchive,
} from "@launchpp/plugin-package";
import type { PluginPackageManifest } from "@launchpp/plugin-protocol";

export interface PluginPackageContributionSummary {
  readonly id: string;
  readonly kind: "action" | "page" | "panel" | "settings" | "task-field";
  readonly placement: string;
}

export interface PluginPackageEntrySummary {
  readonly id: string;
  readonly path: string;
  readonly sizeBytes: number;
}

export interface PluginBuildMetadata {
  readonly adapter?: string;
  readonly cliVersion?: string;
  readonly bundledDependencies?: readonly Readonly<{ name: string; version: string }>[];
  readonly formatVersion?: string;
  readonly protocolVersion?: string;
  readonly sourceManifestSha256?: string;
}

export interface PluginPackageInspectionReport {
  readonly apiRange: string;
  readonly archiveBytes: number;
  readonly browser: readonly PluginPackageEntrySummary[];
  readonly build: PluginBuildMetadata | undefined;
  readonly compatibility: PluginPackageManifest["compatibility"];
  readonly contributions: readonly PluginPackageContributionSummary[];
  readonly fileCount: number;
  readonly id: string;
  readonly integrity: "valid";
  readonly name: string;
  readonly packageHash: string;
  readonly permissions: readonly string[];
  readonly provenance: "unsigned-local";
  readonly server: readonly PluginPackageEntrySummary[];
  readonly version: string;
}

export interface PluginPackageComparison {
  readonly contributionsAdded: readonly string[];
  readonly contributionsRemoved: readonly string[];
  readonly filesAdded: readonly string[];
  readonly filesChanged: readonly string[];
  readonly filesRemoved: readonly string[];
  readonly fromVersion: string;
  readonly permissionsAdded: readonly string[];
  readonly permissionsRemoved: readonly string[];
  readonly toVersion: string;
}

function packagePath(reference: string): string {
  return reference.startsWith("./") ? reference.slice(2) : reference;
}

function fileSize(inspected: InspectedPreviewPluginArchive, file: string): number {
  return inspected.integrity.files[file]?.sizeBytes ?? 0;
}

function contributionSummary(
  manifest: PluginPackageManifest,
): readonly PluginPackageContributionSummary[] {
  return [
    ...(manifest.contributes?.actions ?? []).map((item) => ({
      id: item.id,
      kind: "action" as const,
      placement: item.slot,
    })),
    ...(manifest.contributes?.pages ?? []).map((item) => ({
      id: item.id,
      kind: "page" as const,
      placement: `${item.scope}:${item.path}`,
    })),
    ...(manifest.contributes?.panels ?? []).map((item) => ({
      id: item.id,
      kind: "panel" as const,
      placement: item.slot,
    })),
    ...(manifest.contributes?.settings ?? []).map((item) => ({
      id: item.id,
      kind: "settings" as const,
      placement: item.scope,
    })),
    ...(manifest.contributes?.taskFields ?? []).map((item) => ({
      id: item.id,
      kind: "task-field" as const,
      placement: item.placements?.join(", ") ?? "host managed",
    })),
  ].sort((left, right) => `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`));
}

interface UntrustedBuildMetadata {
  readonly adapter?: unknown;
  readonly bundledDependencies?: unknown;
  readonly cliVersion?: unknown;
  readonly formatVersion?: unknown;
  readonly protocolVersion?: unknown;
  readonly sourceManifestSha256?: unknown;
}

interface UntrustedDependency {
  readonly name?: unknown;
  readonly version?: unknown;
}

function decodeBuildMetadata(
  inspected: InspectedPreviewPluginArchive,
): PluginBuildMetadata | undefined {
  const bytes = inspected.files["assets/build-metadata.json"];
  if (bytes === undefined) return undefined;
  try {
    const value = JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(bytes)) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    const record = value as UntrustedBuildMetadata;
    const bundledDependencies = Array.isArray(record.bundledDependencies)
      ? record.bundledDependencies.flatMap((item) => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
          const dependency = item as UntrustedDependency;
          return typeof dependency.name === "string" && typeof dependency.version === "string"
            ? [{ name: dependency.name, version: dependency.version }]
            : [];
        })
      : undefined;
    const text = (value: unknown): string | undefined =>
      typeof value === "string" ? value : undefined;
    const adapter = text(record.adapter);
    const cliVersion = text(record.cliVersion);
    const formatVersion = text(record.formatVersion);
    const protocolVersion = text(record.protocolVersion);
    const sourceManifestSha256 = text(record.sourceManifestSha256);
    return {
      ...(adapter === undefined ? {} : { adapter }),
      ...(bundledDependencies === undefined ? {} : { bundledDependencies }),
      ...(cliVersion === undefined ? {} : { cliVersion }),
      ...(formatVersion === undefined ? {} : { formatVersion }),
      ...(protocolVersion === undefined ? {} : { protocolVersion }),
      ...(sourceManifestSha256 === undefined ? {} : { sourceManifestSha256 }),
    };
  } catch {
    return undefined;
  }
}

export async function inspectPluginPackage(archiveFile: string): Promise<
  Readonly<{
    archive: InspectedPreviewPluginArchive;
    report: PluginPackageInspectionReport;
  }>
> {
  const absolute = path.resolve(archiveFile);
  const bytes = new Uint8Array(await readFile(absolute));
  const inspected = inspectPreviewPluginArchive(bytes);
  const manifest = inspected.manifest;
  const browser = Object.entries(manifest.browser?.surfaces ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, surface]) => ({
      id,
      path: surface.document,
      sizeBytes: fileSize(inspected, packagePath(surface.document)),
    }));
  const server = Object.entries(manifest.server?.handlers ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, handler]) => ({
      id,
      path: handler.module,
      sizeBytes: fileSize(inspected, packagePath(handler.module)),
    }));
  return {
    archive: inspected,
    report: {
      apiRange: `[${manifest.apiVersion.minimum}, ${manifest.apiVersion.maximumExclusive})`,
      archiveBytes: bytes.byteLength,
      browser,
      build: decodeBuildMetadata(inspected),
      compatibility: manifest.compatibility,
      contributions: contributionSummary(manifest),
      fileCount: Object.keys(inspected.files).length,
      id: manifest.id,
      integrity: "valid",
      name: manifest.name,
      packageHash: inspected.packageHash,
      permissions: [...manifest.permissions].sort(),
      provenance: "unsigned-local",
      server,
      version: manifest.version,
    },
  };
}

function difference(left: readonly string[], right: readonly string[]): readonly string[] {
  const rightValues = new Set(right);
  return [...new Set(left)].filter((value) => !rightValues.has(value)).sort();
}

export function comparePluginPackages(
  previous: InspectedPreviewPluginArchive,
  next: InspectedPreviewPluginArchive,
): PluginPackageComparison {
  if (previous.manifest.id !== next.manifest.id) {
    throw new Error(`Cannot compare plugin '${previous.manifest.id}' with '${next.manifest.id}'.`);
  }
  const previousContributions = contributionSummary(previous.manifest).map(
    (item) => `${item.kind}:${item.id}@${item.placement}`,
  );
  const nextContributions = contributionSummary(next.manifest).map(
    (item) => `${item.kind}:${item.id}@${item.placement}`,
  );
  const previousFiles = Object.keys(previous.integrity.files).sort();
  const nextFiles = Object.keys(next.integrity.files).sort();
  return {
    contributionsAdded: difference(nextContributions, previousContributions),
    contributionsRemoved: difference(previousContributions, nextContributions),
    filesAdded: difference(nextFiles, previousFiles),
    filesChanged: previousFiles.filter(
      (file) =>
        next.integrity.files[file] !== undefined &&
        previous.integrity.files[file]?.sha256 !== next.integrity.files[file]?.sha256,
    ),
    filesRemoved: difference(previousFiles, nextFiles),
    fromVersion: previous.manifest.version,
    permissionsAdded: difference(next.manifest.permissions, previous.manifest.permissions),
    permissionsRemoved: difference(previous.manifest.permissions, next.manifest.permissions),
    toVersion: next.manifest.version,
  };
}

import type { ReadContext, WriteContext } from "@launchpp/core";

import { requireSqliteConnection } from "./context.js";

export interface PluginPackageRecord {
  readonly archiveSizeBytes: number;
  readonly id: string;
  readonly installationId: string;
  readonly integrityJson: string;
  readonly manifestJson: string;
  readonly packageHash: string;
  readonly pluginId: string;
  readonly provenanceKind: "unsigned-local";
  readonly sourceFileName: string;
  readonly uploadedAt: number;
  readonly uploadedByUserId: string;
  readonly version: string;
}

export interface InstallationPluginRecord {
  readonly acceptedPermissionsJson: string;
  readonly enabledAt: number;
  readonly enabledByUserId: string;
  readonly installationId: string;
  readonly pluginId: string;
  readonly pluginPackageId: string;
  readonly updatedAt: number;
}

export interface InstallationPluginPackageRecord extends PluginPackageRecord {
  readonly enabledAt?: number;
}

export interface EnabledInstallationPluginPackageRecord extends PluginPackageRecord {
  readonly acceptedPermissionsJson: string;
  readonly enabledAt: number;
}

interface PluginPackageRow {
  readonly archive_size_bytes: number;
  readonly enabled_at?: number | null;
  readonly id: string;
  readonly installation_id: string;
  readonly integrity_json: string;
  readonly manifest_json: string;
  readonly package_hash: string;
  readonly plugin_id: string;
  readonly provenance_kind: "unsigned-local";
  readonly source_file_name: string;
  readonly uploaded_at: number;
  readonly uploaded_by_user_id: string;
  readonly version: string;
}

function mapPackage(row: PluginPackageRow): InstallationPluginPackageRecord {
  return Object.freeze({
    archiveSizeBytes: row.archive_size_bytes,
    id: row.id,
    installationId: row.installation_id,
    integrityJson: row.integrity_json,
    manifestJson: row.manifest_json,
    packageHash: row.package_hash,
    pluginId: row.plugin_id,
    provenanceKind: row.provenance_kind,
    sourceFileName: row.source_file_name,
    uploadedAt: row.uploaded_at,
    uploadedByUserId: row.uploaded_by_user_id,
    version: row.version,
    ...(row.enabled_at === null || row.enabled_at === undefined
      ? {}
      : { enabledAt: row.enabled_at }),
  });
}

export class SqlitePluginPackageRepository {
  create(context: WriteContext, record: PluginPackageRecord): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO plugin_packages (
          id, installation_id, plugin_id, version, package_hash,
          manifest_json, integrity_json, provenance_kind, source_file_name,
          archive_size_bytes, uploaded_by_user_id, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.installationId,
        record.pluginId,
        record.version,
        record.packageHash,
        record.manifestJson,
        record.integrityJson,
        record.provenanceKind,
        record.sourceFileName,
        record.archiveSizeBytes,
        record.uploadedByUserId,
        record.uploadedAt,
      );
  }

  findByIdentity(
    context: ReadContext,
    installationId: string,
    pluginId: string,
    version: string,
  ): PluginPackageRecord | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string, string], PluginPackageRow>(
        `SELECT id, installation_id, plugin_id, version, package_hash,
                manifest_json, integrity_json, provenance_kind, source_file_name,
                archive_size_bytes, uploaded_by_user_id, uploaded_at
         FROM plugin_packages
         WHERE installation_id = ? AND plugin_id = ? AND version = ?`,
      )
      .get(installationId, pluginId, version);
    return row ? mapPackage(row) : undefined;
  }

  findById(
    context: ReadContext,
    installationId: string,
    packageId: string,
  ): PluginPackageRecord | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], PluginPackageRow>(
        `SELECT id, installation_id, plugin_id, version, package_hash,
                manifest_json, integrity_json, provenance_kind, source_file_name,
                archive_size_bytes, uploaded_by_user_id, uploaded_at
         FROM plugin_packages WHERE installation_id = ? AND id = ?`,
      )
      .get(installationId, packageId);
    return row ? mapPackage(row) : undefined;
  }

  listForInstallation(
    context: ReadContext,
    installationId: string,
  ): readonly InstallationPluginPackageRecord[] {
    return requireSqliteConnection(context)
      .prepare<[string], PluginPackageRow>(
        `SELECT package.id, package.installation_id, package.plugin_id, package.version,
                package.package_hash, package.manifest_json, package.integrity_json,
                package.provenance_kind, package.source_file_name, package.archive_size_bytes,
                package.uploaded_by_user_id, package.uploaded_at,
                enabled.enabled_at
         FROM plugin_packages package
         LEFT JOIN installation_plugins enabled ON enabled.plugin_package_id = package.id
         WHERE package.installation_id = ?
         ORDER BY package.uploaded_at DESC, package.id ASC`,
      )
      .all(installationId)
      .map(mapPackage);
  }

  findEnabledByPackageId(
    context: ReadContext,
    installationId: string,
    packageId: string,
  ): InstallationPluginRecord | undefined {
    const row = requireSqliteConnection(context)
      .prepare<
        [string, string],
        {
          readonly accepted_permissions_json: string;
          readonly enabled_at: number;
          readonly enabled_by_user_id: string;
          readonly installation_id: string;
          readonly plugin_id: string;
          readonly plugin_package_id: string;
          readonly updated_at: number;
        }
      >(
        `SELECT installation_id, plugin_id, plugin_package_id, accepted_permissions_json,
                enabled_by_user_id, enabled_at, updated_at
         FROM installation_plugins
         WHERE installation_id = ? AND plugin_package_id = ?`,
      )
      .get(installationId, packageId);
    return row
      ? Object.freeze({
          acceptedPermissionsJson: row.accepted_permissions_json,
          enabledAt: row.enabled_at,
          enabledByUserId: row.enabled_by_user_id,
          installationId: row.installation_id,
          pluginId: row.plugin_id,
          pluginPackageId: row.plugin_package_id,
          updatedAt: row.updated_at,
        })
      : undefined;
  }

  listEnabled(
    context: ReadContext,
    installationId: string,
  ): readonly EnabledInstallationPluginPackageRecord[] {
    return requireSqliteConnection(context)
      .prepare<
        [string],
        PluginPackageRow & {
          readonly accepted_permissions_json: string;
          readonly enabled_at: number;
        }
      >(
        `SELECT package.id, package.installation_id, package.plugin_id, package.version,
                package.package_hash, package.manifest_json, package.integrity_json,
                package.provenance_kind, package.source_file_name, package.archive_size_bytes,
                package.uploaded_by_user_id, package.uploaded_at,
                enabled.accepted_permissions_json, enabled.enabled_at
         FROM installation_plugins enabled
         INNER JOIN plugin_packages package ON package.id = enabled.plugin_package_id
         WHERE enabled.installation_id = ?
         ORDER BY package.plugin_id ASC`,
      )
      .all(installationId)
      .map((row) =>
        Object.freeze({
          ...mapPackage(row),
          acceptedPermissionsJson: row.accepted_permissions_json,
          enabledAt: row.enabled_at,
        }),
      );
  }

  enable(context: WriteContext, record: InstallationPluginRecord): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO installation_plugins (
          installation_id, plugin_id, plugin_package_id, accepted_permissions_json,
          enabled_by_user_id, enabled_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (installation_id, plugin_id) DO UPDATE SET
          plugin_package_id = excluded.plugin_package_id,
          accepted_permissions_json = excluded.accepted_permissions_json,
          enabled_by_user_id = excluded.enabled_by_user_id,
          enabled_at = excluded.enabled_at,
          updated_at = excluded.updated_at`,
      )
      .run(
        record.installationId,
        record.pluginId,
        record.pluginPackageId,
        record.acceptedPermissionsJson,
        record.enabledByUserId,
        record.enabledAt,
        record.updatedAt,
      );
  }

  disable(context: WriteContext, installationId: string, pluginId: string): boolean {
    return (
      requireSqliteConnection(context)
        .prepare(`DELETE FROM installation_plugins WHERE installation_id = ? AND plugin_id = ?`)
        .run(installationId, pluginId).changes > 0
    );
  }
}

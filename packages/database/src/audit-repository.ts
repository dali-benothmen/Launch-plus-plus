import type { AuditEntry, AuditWriter, WriteContext } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

export class SqliteAuditWriter implements AuditWriter {
  append(context: WriteContext, entry: AuditEntry): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO audit_entries (
          id, installation_id, organization_id, actor_type, actor_id,
          operation, target_type, target_id, outcome, metadata_json,
          occurred_at, correlation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.installationId,
        entry.organizationId ?? null,
        entry.actorType,
        entry.actorId ?? null,
        entry.operation,
        entry.targetType,
        entry.targetId,
        entry.outcome,
        JSON.stringify(entry.metadata),
        entry.occurredAt,
        entry.correlationId,
      );
  }
}

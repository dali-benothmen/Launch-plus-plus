import type { ReadContext, WriteContext } from "@launchpp/core";

import { requireSqliteConnection } from "./context.js";

export type PluginFieldValue = number | string;

export interface PluginFieldValueRecord {
  readonly fieldId: string;
  readonly organizationId: string;
  readonly pluginId: string;
  readonly projectId: string;
  readonly revision: number;
  readonly taskId: string;
  readonly updatedAt: number;
  readonly updatedByUserId: string;
  readonly value: PluginFieldValue;
  readonly valueType: "number" | "text";
}

interface PluginFieldValueRow {
  readonly field_id: string;
  readonly number_value: number | null;
  readonly organization_id: string;
  readonly plugin_id: string;
  readonly project_id: string;
  readonly revision: number;
  readonly task_id: string;
  readonly text_value: string | null;
  readonly updated_at: number;
  readonly updated_by_user_id: string;
  readonly value_type: "number" | "text";
}

function mapValue(row: PluginFieldValueRow): PluginFieldValueRecord {
  return Object.freeze({
    fieldId: row.field_id,
    organizationId: row.organization_id,
    pluginId: row.plugin_id,
    projectId: row.project_id,
    revision: row.revision,
    taskId: row.task_id,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
    value: row.value_type === "number" ? (row.number_value as number) : (row.text_value as string),
    valueType: row.value_type,
  });
}

const selection = `SELECT organization_id, project_id, task_id, plugin_id, field_id, value_type,
                           number_value, text_value, updated_by_user_id, updated_at, revision
                    FROM plugin_field_values`;

export class SqlitePluginFieldValueRepository {
  listForProject(
    context: ReadContext,
    organizationId: string,
    projectId: string,
  ): readonly PluginFieldValueRecord[] {
    return requireSqliteConnection(context)
      .prepare<[string, string], PluginFieldValueRow>(
        `${selection}
         WHERE organization_id = ? AND project_id = ?
         ORDER BY task_id ASC, plugin_id ASC, field_id ASC`,
      )
      .all(organizationId, projectId)
      .map(mapValue);
  }

  listForTask(
    context: ReadContext,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): readonly PluginFieldValueRecord[] {
    return requireSqliteConnection(context)
      .prepare<[string, string, string], PluginFieldValueRow>(
        `${selection}
         WHERE organization_id = ? AND project_id = ? AND task_id = ?
         ORDER BY plugin_id ASC, field_id ASC`,
      )
      .all(organizationId, projectId, taskId)
      .map(mapValue);
  }

  remove(
    context: WriteContext,
    input: Readonly<{ fieldId: string; pluginId: string; taskId: string }>,
  ): void {
    requireSqliteConnection(context)
      .prepare(
        `DELETE FROM plugin_field_values
         WHERE task_id = ? AND plugin_id = ? AND field_id = ?`,
      )
      .run(input.taskId, input.pluginId, input.fieldId);
  }

  set(context: WriteContext, record: Omit<PluginFieldValueRecord, "revision">): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO plugin_field_values (
           organization_id, project_id, task_id, plugin_id, field_id, value_type,
           number_value, text_value, updated_by_user_id, updated_at, revision
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(task_id, plugin_id, field_id) DO UPDATE SET
           value_type = excluded.value_type,
           number_value = excluded.number_value,
           text_value = excluded.text_value,
           updated_by_user_id = excluded.updated_by_user_id,
           updated_at = excluded.updated_at,
           revision = plugin_field_values.revision + 1`,
      )
      .run(
        record.organizationId,
        record.projectId,
        record.taskId,
        record.pluginId,
        record.fieldId,
        record.valueType,
        record.valueType === "number" ? record.value : null,
        record.valueType === "text" ? record.value : null,
        record.updatedByUserId,
        record.updatedAt,
      );
  }
}

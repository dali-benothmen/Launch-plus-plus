import type { OutboxMessage, ReadContext, WriteContext } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

export interface InvalidationEvent {
  readonly occurredAt: number;
  readonly projectId?: string;
  readonly resourceId: string;
  readonly resourceType: string;
  readonly sequence: number;
  readonly topic: string;
  readonly workspaceId: string;
}

interface InvalidationRow {
  readonly occurred_at: number;
  readonly project_id: null | string;
  readonly resource_id: string;
  readonly resource_type: string;
  readonly sequence: number;
  readonly topic: string;
  readonly workspace_id: string;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mapInvalidation(row: InvalidationRow): InvalidationEvent {
  return Object.freeze({
    occurredAt: row.occurred_at,
    ...(row.project_id === null ? {} : { projectId: row.project_id }),
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    sequence: row.sequence,
    topic: row.topic,
    workspaceId: row.workspace_id,
  });
}

function resourceType(topic: string) {
  if (topic.startsWith("task.") || topic.startsWith("comment.")) return "task";
  if (topic.startsWith("label.")) return "label";
  if (topic.startsWith("project_folder.")) return "project_folder";
  if (topic.startsWith("project.")) return "project";
  return "workspace";
}

export class SqliteProjectionRepository {
  rebuildSearch(context: WriteContext): void {
    const connection = requireSqliteConnection(context);
    connection.prepare("DELETE FROM search_documents").run();
    connection
      .prepare(
        `INSERT INTO search_documents (
           resource_id, resource_type, workspace_id, project_id, title, subtitle, body
         )
         SELECT project.id, 'project', project.workspace_id, project.id, project.name,
                project.key || ' · ' || workspace.name, project.description
         FROM projects project
         INNER JOIN workspaces workspace ON workspace.id = project.workspace_id
         WHERE project.archived_at IS NULL AND project.deleted_at IS NULL
           AND workspace.archived_at IS NULL AND workspace.deleted_at IS NULL`,
      )
      .run();
    connection
      .prepare(
        `INSERT INTO search_documents (
           resource_id, resource_type, workspace_id, project_id, title, subtitle, body
         )
         SELECT task.id, 'task', task.workspace_id, task.project_id, task.title,
                project.key || '-' || task.number || ' · ' || project.name,
                task.description_markdown
         FROM tasks task
         INNER JOIN projects project ON project.id = task.project_id
         WHERE task.archived_at IS NULL AND task.deleted_at IS NULL
           AND project.archived_at IS NULL AND project.deleted_at IS NULL`,
      )
      .run();
  }

  project(context: WriteContext, message: OutboxMessage): InvalidationEvent | undefined {
    const {
      actorId: actorValue,
      projectId: projectValue,
      targetId: targetValue,
      workspaceId: workspaceValue,
    } = message.payload;
    const workspaceId = optionalString(workspaceValue);
    if (!workspaceId) return undefined;
    const targetId = optionalString(targetValue) ?? workspaceId;
    const type = resourceType(message.topic);
    const projectId = optionalString(projectValue) ?? (type === "project" ? targetId : undefined);
    const connection = requireSqliteConnection(context);

    if (type === "project") this.indexProject(context, targetId);
    if (type === "task") this.indexTask(context, targetId);
    if (type === "workspace") this.indexWorkspaceProjects(context, workspaceId);

    connection
      .prepare(
        `INSERT OR IGNORE INTO activity_entries (
           id, workspace_id, project_id, task_id, actor_user_id,
           operation, metadata_json, occurred_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        message.id,
        workspaceId,
        projectId ?? null,
        type === "task" ? targetId : null,
        optionalString(actorValue) ?? null,
        message.topic,
        JSON.stringify(message.payload),
        message.occurredAt,
      );
    connection
      .prepare(
        `INSERT OR IGNORE INTO invalidation_events (
           outbox_id, workspace_id, project_id, resource_id, resource_type, topic, occurred_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        message.id,
        workspaceId,
        projectId ?? null,
        targetId,
        type,
        message.topic,
        message.occurredAt,
      );
    const row = connection
      .prepare<[string], InvalidationRow>(
        `SELECT sequence, workspace_id, project_id, resource_id, resource_type,
                topic, occurred_at
         FROM invalidation_events WHERE outbox_id = ?`,
      )
      .get(message.id);
    return row ? mapInvalidation(row) : undefined;
  }

  listInvalidations(
    context: ReadContext,
    input: Readonly<{ after: number; limit: number; userId: string }>,
  ): readonly InvalidationEvent[] {
    return requireSqliteConnection(context)
      .prepare<[string, number, number], InvalidationRow>(
        `SELECT event.sequence, event.workspace_id, event.project_id, event.resource_id,
                event.resource_type, event.topic, event.occurred_at
         FROM invalidation_events event
         INNER JOIN workspace_members member ON member.workspace_id = event.workspace_id
         WHERE member.user_id = ? AND member.state = 'active' AND event.sequence > ?
         ORDER BY event.sequence ASC
         LIMIT ?`,
      )
      .all(input.userId, input.after, input.limit)
      .map(mapInvalidation);
  }

  latestInvalidationSequence(context: ReadContext, userId: string): number {
    const row = requireSqliteConnection(context)
      .prepare<[string], { readonly sequence: null | number }>(
        `SELECT max(event.sequence) AS sequence
         FROM invalidation_events event
         INNER JOIN workspace_members member ON member.workspace_id = event.workspace_id
         WHERE member.user_id = ? AND member.state = 'active'`,
      )
      .get(userId);
    return row?.sequence ?? 0;
  }

  private indexProject(context: WriteContext, projectId: string) {
    const connection = requireSqliteConnection(context);
    connection
      .prepare("DELETE FROM search_documents WHERE resource_type = 'project' AND resource_id = ?")
      .run(projectId);
    connection
      .prepare(
        `INSERT INTO search_documents (
           resource_id, resource_type, workspace_id, project_id, title, subtitle, body
         )
         SELECT project.id, 'project', project.workspace_id, project.id, project.name,
                project.key || ' · ' || workspace.name, project.description
         FROM projects project
         INNER JOIN workspaces workspace ON workspace.id = project.workspace_id
         WHERE project.id = ? AND project.archived_at IS NULL AND project.deleted_at IS NULL
           AND workspace.archived_at IS NULL AND workspace.deleted_at IS NULL`,
      )
      .run(projectId);
    connection
      .prepare("DELETE FROM search_documents WHERE resource_type = 'task' AND project_id = ?")
      .run(projectId);
    connection
      .prepare(
        `INSERT INTO search_documents (
           resource_id, resource_type, workspace_id, project_id, title, subtitle, body
         )
         SELECT task.id, 'task', task.workspace_id, task.project_id, task.title,
                project.key || '-' || task.number || ' · ' || project.name,
                task.description_markdown
         FROM tasks task
         INNER JOIN projects project ON project.id = task.project_id
         WHERE project.id = ? AND task.archived_at IS NULL AND task.deleted_at IS NULL
           AND project.archived_at IS NULL AND project.deleted_at IS NULL`,
      )
      .run(projectId);
  }

  private indexWorkspaceProjects(context: WriteContext, workspaceId: string) {
    const connection = requireSqliteConnection(context);
    const projectIds = connection
      .prepare<[string], { readonly id: string }>("SELECT id FROM projects WHERE workspace_id = ?")
      .all(workspaceId);
    for (const project of projectIds) this.indexProject(context, project.id);
  }

  private indexTask(context: WriteContext, taskId: string) {
    const connection = requireSqliteConnection(context);
    connection
      .prepare("DELETE FROM search_documents WHERE resource_type = 'task' AND resource_id = ?")
      .run(taskId);
    connection
      .prepare(
        `INSERT INTO search_documents (
           resource_id, resource_type, workspace_id, project_id, title, subtitle, body
         )
         SELECT task.id, 'task', task.workspace_id, task.project_id, task.title,
                project.key || '-' || task.number || ' · ' || project.name,
                task.description_markdown
         FROM tasks task
         INNER JOIN projects project ON project.id = task.project_id
         WHERE task.id = ? AND task.archived_at IS NULL AND task.deleted_at IS NULL
           AND project.archived_at IS NULL AND project.deleted_at IS NULL`,
      )
      .run(taskId);
  }
}

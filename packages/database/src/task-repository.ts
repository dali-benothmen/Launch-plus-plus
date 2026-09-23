import type {
  Label,
  ReadContext,
  Task,
  TaskActivity,
  TaskComment,
  TaskRepository,
  WriteContext,
} from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface TaskRow {
  readonly archived_at: null | number;
  readonly created_at: number;
  readonly created_by_user_id: string;
  readonly deleted_at: null | number;
  readonly description_markdown: string;
  readonly due_date: null | string;
  readonly id: string;
  readonly number: number;
  readonly parent_task_id: null | string;
  readonly position: number;
  readonly project_id: string;
  readonly revision: number;
  readonly status_id: string;
  readonly title: string;
  readonly updated_at: number;
  readonly updated_by_user_id: string;
  readonly workspace_id: string;
}

interface LabelRow {
  readonly archived_at: null | number;
  readonly color: string;
  readonly comparison_key: string;
  readonly created_at: number;
  readonly id: string;
  readonly name: string;
  readonly project_id: null | string;
  readonly revision: number;
  readonly updated_at: number;
  readonly workspace_id: string;
}

interface CommentRow {
  readonly author_user_id: string;
  readonly body_markdown: string;
  readonly created_at: number;
  readonly id: string;
  readonly project_id: string;
  readonly revision: number;
  readonly task_id: string;
  readonly updated_at: number;
  readonly workspace_id: string;
}

interface ActivityRow {
  readonly actor_id: null | string;
  readonly id: string;
  readonly metadata_json: string;
  readonly occurred_at: number;
  readonly operation: string;
}

const taskSelection = `SELECT id, workspace_id, project_id, number, parent_task_id, status_id,
  title, description_markdown, due_date, position, created_by_user_id, updated_by_user_id,
  created_at, updated_at, archived_at, deleted_at, revision FROM tasks`;

const labelSelection = `SELECT id, workspace_id, project_id, name, comparison_key, color,
  created_at, updated_at, archived_at, revision FROM labels`;

function mapTask(row: TaskRow): Task {
  return Object.freeze({
    ...(row.archived_at === null ? {} : { archivedAt: row.archived_at }),
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    ...(row.deleted_at === null ? {} : { deletedAt: row.deleted_at }),
    description: row.description_markdown,
    ...(row.due_date === null ? {} : { dueDate: row.due_date }),
    id: row.id,
    number: row.number,
    ...(row.parent_task_id === null ? {} : { parentTaskId: row.parent_task_id }),
    position: row.position,
    projectId: row.project_id,
    revision: row.revision,
    statusId: row.status_id,
    title: row.title,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
    workspaceId: row.workspace_id,
  });
}

function mapLabel(row: LabelRow): Label {
  return Object.freeze({
    ...(row.archived_at === null ? {} : { archivedAt: row.archived_at }),
    color: row.color,
    comparisonKey: row.comparison_key,
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    ...(row.project_id === null ? {} : { projectId: row.project_id }),
    revision: row.revision,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  });
}

function mapComment(row: CommentRow): TaskComment {
  return Object.freeze({
    authorUserId: row.author_user_id,
    body: row.body_markdown,
    createdAt: row.created_at,
    id: row.id,
    projectId: row.project_id,
    revision: row.revision,
    taskId: row.task_id,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  });
}

function mapActivity(row: ActivityRow): TaskActivity {
  const metadata = JSON.parse(row.metadata_json) as Readonly<Record<string, unknown>>;
  return Object.freeze({
    ...(row.actor_id === null ? {} : { actorUserId: row.actor_id }),
    id: row.id,
    metadata,
    occurredAt: row.occurred_at,
    operation: row.operation,
  });
}

function parentClause(parentTaskId: string | undefined) {
  return parentTaskId === undefined ? "parent_task_id IS NULL" : "parent_task_id = ?";
}

export class SqliteTaskRepository implements TaskRepository {
  createComment(context: WriteContext, comment: TaskComment): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO task_comments (
          id, workspace_id, project_id, task_id, author_user_id,
          body_markdown, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        comment.id,
        comment.workspaceId,
        comment.projectId,
        comment.taskId,
        comment.authorUserId,
        comment.body,
        comment.createdAt,
        comment.updatedAt,
        comment.revision,
      );
  }

  createLabel(context: WriteContext, label: Label): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO labels (
          id, workspace_id, project_id, name, comparison_key, color,
          created_at, updated_at, archived_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        label.id,
        label.workspaceId,
        label.projectId ?? null,
        label.name,
        label.comparisonKey,
        label.color,
        label.createdAt,
        label.updatedAt,
        label.archivedAt ?? null,
        label.revision,
      );
  }

  createTask(context: WriteContext, task: Task): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO tasks (
          id, workspace_id, project_id, number, parent_task_id, status_id, title,
          description_markdown, due_date, position, created_by_user_id, updated_by_user_id,
          created_at, updated_at, archived_at, deleted_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        task.id,
        task.workspaceId,
        task.projectId,
        task.number,
        task.parentTaskId ?? null,
        task.statusId,
        task.title,
        task.description,
        task.dueDate ?? null,
        task.position,
        task.createdByUserId,
        task.updatedByUserId,
        task.createdAt,
        task.updatedAt,
        task.archivedAt ?? null,
        task.deletedAt ?? null,
        task.revision,
      );
  }

  findLabelById(context: ReadContext, labelId: string): Label | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], LabelRow>(`${labelSelection} WHERE id = ?`)
      .get(labelId);
    return row ? mapLabel(row) : undefined;
  }

  findLabelByName(
    context: ReadContext,
    workspaceId: string,
    projectId: string | undefined,
    comparisonKey: string,
  ): Label | undefined {
    const clause = projectId === undefined ? "project_id IS NULL" : "project_id = ?";
    const parameters =
      projectId === undefined
        ? [workspaceId, comparisonKey]
        : [workspaceId, projectId, comparisonKey];
    const row = requireSqliteConnection(context)
      .prepare<unknown[], LabelRow>(
        `${labelSelection} WHERE workspace_id = ? AND ${clause} AND comparison_key = ?`,
      )
      .get(...parameters);
    return row ? mapLabel(row) : undefined;
  }

  findTaskById(context: ReadContext, taskId: string): Task | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], TaskRow>(`${taskSelection} WHERE id = ?`)
      .get(taskId);
    return row ? mapTask(row) : undefined;
  }

  listAssigneeUserIds(context: ReadContext, taskId: string): readonly string[] {
    return requireSqliteConnection(context)
      .prepare<[string], { readonly user_id: string }>(
        "SELECT user_id FROM task_assignees WHERE task_id = ? ORDER BY assigned_at ASC, user_id ASC",
      )
      .all(taskId)
      .map((row) => row.user_id);
  }

  listComments(context: ReadContext, taskId: string): readonly TaskComment[] {
    return requireSqliteConnection(context)
      .prepare<[string], CommentRow>(
        `SELECT id, workspace_id, project_id, task_id, author_user_id,
                body_markdown, created_at, updated_at, revision
         FROM task_comments WHERE task_id = ? ORDER BY created_at ASC, id ASC`,
      )
      .all(taskId)
      .map(mapComment);
  }

  listLabels(context: ReadContext, workspaceId: string, projectId: string): readonly Label[] {
    return requireSqliteConnection(context)
      .prepare<[string, string], LabelRow>(
        `${labelSelection}
         WHERE workspace_id = ? AND (project_id IS NULL OR project_id = ?) AND archived_at IS NULL
         ORDER BY project_id IS NOT NULL ASC, name COLLATE NOCASE ASC, id ASC`,
      )
      .all(workspaceId, projectId)
      .map(mapLabel);
  }

  listLabelsForTask(context: ReadContext, taskId: string): readonly Label[] {
    return requireSqliteConnection(context)
      .prepare<[string], LabelRow>(
        `SELECT label.id, label.workspace_id, label.project_id, label.name,
                label.comparison_key, label.color, label.created_at, label.updated_at,
                label.archived_at, label.revision
         FROM task_labels relation
         INNER JOIN labels label ON label.id = relation.label_id
         WHERE relation.task_id = ? AND label.archived_at IS NULL
         ORDER BY label.name COLLATE NOCASE ASC, label.id ASC`,
      )
      .all(taskId)
      .map(mapLabel);
  }

  listTaskActivity(
    context: ReadContext,
    workspaceId: string,
    taskId: string,
  ): readonly TaskActivity[] {
    return requireSqliteConnection(context)
      .prepare<[string, string], ActivityRow>(
        `SELECT id, actor_user_id AS actor_id, operation, metadata_json, occurred_at
         FROM activity_entries
         WHERE workspace_id = ? AND task_id = ?
         ORDER BY occurred_at DESC, id DESC
         LIMIT 100`,
      )
      .all(workspaceId, taskId)
      .map(mapActivity);
  }

  listTasks(
    context: ReadContext,
    workspaceId: string,
    projectId: string,
    includeArchived = false,
  ): readonly Task[] {
    const stateClause = includeArchived
      ? "task.deleted_at IS NULL"
      : `task.archived_at IS NULL AND task.deleted_at IS NULL
         AND (parent.id IS NULL OR (parent.archived_at IS NULL AND parent.deleted_at IS NULL))`;
    return requireSqliteConnection(context)
      .prepare<[string, string], TaskRow>(
        `SELECT task.id, task.workspace_id, task.project_id, task.number,
                task.parent_task_id, task.status_id, task.title, task.description_markdown,
                task.due_date, task.position, task.created_by_user_id,
                task.updated_by_user_id, task.created_at, task.updated_at,
                task.archived_at, task.deleted_at, task.revision
         FROM tasks task
         LEFT JOIN tasks parent ON parent.id = task.parent_task_id
         WHERE task.workspace_id = ? AND task.project_id = ? AND ${stateClause}
         ORDER BY task.status_id ASC, task.parent_task_id IS NOT NULL ASC,
                  task.parent_task_id ASC, task.position ASC, task.id ASC`,
      )
      .all(workspaceId, projectId)
      .map(mapTask);
  }

  nextPosition(
    context: ReadContext,
    projectId: string,
    statusId: string,
    parentTaskId?: string,
  ): number {
    const parameters =
      parentTaskId === undefined ? [projectId, statusId] : [projectId, statusId, parentTaskId];
    const row = requireSqliteConnection(context)
      .prepare<unknown[], { readonly position: number }>(
        `SELECT coalesce(max(position), -1) + 1 AS position FROM tasks
         WHERE project_id = ? AND status_id = ? AND ${parentClause(parentTaskId)}
           AND archived_at IS NULL AND deleted_at IS NULL`,
      )
      .get(...parameters);
    return row?.position ?? 0;
  }

  reorderTasks(context: WriteContext, tasks: readonly Task[]): void {
    const first = tasks[0];
    if (!first) return;
    const connection = requireSqliteConnection(context);
    const parameters =
      first.parentTaskId === undefined
        ? [first.projectId, first.statusId]
        : [first.projectId, first.statusId, first.parentTaskId];
    const offset =
      this.nextPosition(context, first.projectId, first.statusId, first.parentTaskId) +
      tasks.length +
      1;
    connection
      .prepare(
        `UPDATE tasks SET position = position + ?
         WHERE project_id = ? AND status_id = ? AND ${parentClause(first.parentTaskId)}
           AND archived_at IS NULL AND deleted_at IS NULL`,
      )
      .run(offset, ...parameters);
    for (const task of tasks) this.saveTask(context, task);
  }

  replaceAssignees(
    context: WriteContext,
    input: Readonly<{
      assignedAt: number;
      assignedByUserId: string;
      taskId: string;
      userIds: readonly string[];
      workspaceId: string;
    }>,
  ): void {
    const connection = requireSqliteConnection(context);
    connection.prepare("DELETE FROM task_assignees WHERE task_id = ?").run(input.taskId);
    const insert = connection.prepare(
      `INSERT INTO task_assignees (
        workspace_id, task_id, user_id, assigned_by_user_id, assigned_at
      ) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const userId of input.userIds) {
      insert.run(input.workspaceId, input.taskId, userId, input.assignedByUserId, input.assignedAt);
    }
  }

  replaceLabels(
    context: WriteContext,
    input: Readonly<{
      appliedAt: number;
      appliedByUserId: string;
      labelIds: readonly string[];
      taskId: string;
      workspaceId: string;
    }>,
  ): void {
    const connection = requireSqliteConnection(context);
    connection.prepare("DELETE FROM task_labels WHERE task_id = ?").run(input.taskId);
    const insert = connection.prepare(
      `INSERT INTO task_labels (
        workspace_id, task_id, label_id, applied_by_user_id, applied_at
      ) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const labelId of input.labelIds) {
      insert.run(input.workspaceId, input.taskId, labelId, input.appliedByUserId, input.appliedAt);
    }
  }

  saveTask(context: WriteContext, task: Task): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE tasks SET parent_task_id = ?, status_id = ?, title = ?,
             description_markdown = ?, due_date = ?, position = ?, updated_by_user_id = ?,
             updated_at = ?, archived_at = ?, deleted_at = ?, revision = ?
         WHERE id = ? AND workspace_id = ? AND project_id = ?`,
      )
      .run(
        task.parentTaskId ?? null,
        task.statusId,
        task.title,
        task.description,
        task.dueDate ?? null,
        task.position,
        task.updatedByUserId,
        task.updatedAt,
        task.archivedAt ?? null,
        task.deletedAt ?? null,
        task.revision,
        task.id,
        task.workspaceId,
        task.projectId,
      );
  }
}

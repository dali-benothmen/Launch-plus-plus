import type {
  Label,
  ReadContext,
  Task,
  TaskActivity,
  TaskAttachment,
  TaskAttachmentSummary,
  TaskComment,
  TaskCommentReaction,
  TaskPriority,
  TaskRepository,
  WriteContext,
} from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface TaskRow {
  readonly archived_at: null | number;
  readonly attachment_count: number;
  readonly created_at: number;
  readonly created_by_user_id: string;
  readonly deleted_at: null | number;
  readonly description_markdown: string;
  readonly due_date: null | string;
  readonly id: string;
  readonly number: number;
  readonly parent_task_id: null | string;
  readonly position: number;
  readonly priority: TaskPriority;
  readonly project_id: string;
  readonly revision: number;
  readonly status_id: string;
  readonly team_id: null | string;
  readonly title: string;
  readonly updated_at: number;
  readonly updated_by_user_id: string;
  readonly organization_id: string;
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
  readonly organization_id: string;
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
  readonly organization_id: string;
}

interface CommentReactionRow {
  readonly comment_id: string;
  readonly created_at: number;
  readonly emoji: string;
  readonly organization_id: string;
  readonly user_id: string;
}

interface AttachmentRow {
  readonly content: Buffer;
  readonly comment_id: null | string;
  readonly content_type: string;
  readonly created_at: number;
  readonly id: string;
  readonly name: string;
  readonly project_id: string;
  readonly size: number;
  readonly task_id: string;
  readonly uploaded_by_user_id: string;
  readonly organization_id: string;
}

interface ActivityRow {
  readonly actor_id: null | string;
  readonly id: string;
  readonly metadata_json: string;
  readonly occurred_at: number;
  readonly operation: string;
}

const taskSelection = `SELECT id, organization_id, project_id, number, parent_task_id, status_id,
  team_id, title, description_markdown, attachment_count, due_date, priority, position, created_by_user_id,
  updated_by_user_id, created_at, updated_at, archived_at, deleted_at, revision FROM tasks`;

const labelSelection = `SELECT id, organization_id, project_id, name, comparison_key, color,
  created_at, updated_at, archived_at, revision FROM labels`;

function mapTask(row: TaskRow): Task {
  return Object.freeze({
    ...(row.archived_at === null ? {} : { archivedAt: row.archived_at }),
    attachmentCount: row.attachment_count,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    ...(row.deleted_at === null ? {} : { deletedAt: row.deleted_at }),
    description: row.description_markdown,
    ...(row.due_date === null ? {} : { dueDate: row.due_date }),
    id: row.id,
    number: row.number,
    ...(row.parent_task_id === null ? {} : { parentTaskId: row.parent_task_id }),
    position: row.position,
    priority: row.priority,
    projectId: row.project_id,
    revision: row.revision,
    statusId: row.status_id,
    ...(row.team_id === null ? {} : { teamId: row.team_id }),
    title: row.title,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
    organizationId: row.organization_id,
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
    organizationId: row.organization_id,
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
    reactions: [],
    taskId: row.task_id,
    updatedAt: row.updated_at,
    organizationId: row.organization_id,
  });
}

function mapAttachment(row: AttachmentRow): TaskAttachment {
  return Object.freeze({
    content: new Uint8Array(row.content),
    ...(row.comment_id === null ? {} : { commentId: row.comment_id }),
    contentType: row.content_type,
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    projectId: row.project_id,
    size: row.size,
    taskId: row.task_id,
    uploadedByUserId: row.uploaded_by_user_id,
    organizationId: row.organization_id,
  });
}

function attachmentSummary(attachment: TaskAttachment): TaskAttachmentSummary {
  const { content: _content, ...summary } = attachment;
  return Object.freeze(summary);
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
  createAttachment(context: WriteContext, attachment: TaskAttachment): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO task_attachments (
          id, organization_id, project_id, task_id, comment_id, name, content_type, size, content,
          uploaded_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        attachment.id,
        attachment.organizationId,
        attachment.projectId,
        attachment.taskId,
        attachment.commentId ?? null,
        attachment.name,
        attachment.contentType,
        attachment.size,
        Buffer.from(attachment.content),
        attachment.uploadedByUserId,
        attachment.createdAt,
      );
  }

  createComment(context: WriteContext, comment: TaskComment): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO task_comments (
          id, organization_id, project_id, task_id, author_user_id,
          body_markdown, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        comment.id,
        comment.organizationId,
        comment.projectId,
        comment.taskId,
        comment.authorUserId,
        comment.body,
        comment.createdAt,
        comment.updatedAt,
        comment.revision,
      );
  }

  createCommentReaction(context: WriteContext, reaction: TaskCommentReaction): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO task_comment_reactions (
          comment_id, organization_id, user_id, emoji, created_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(comment_id, user_id, emoji) DO NOTHING`,
      )
      .run(
        reaction.commentId,
        reaction.organizationId,
        reaction.userId,
        reaction.emoji,
        reaction.createdAt,
      );
  }

  createLabel(context: WriteContext, label: Label): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO labels (
          id, organization_id, project_id, name, comparison_key, color,
          created_at, updated_at, archived_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        label.id,
        label.organizationId,
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
          id, organization_id, project_id, number, parent_task_id, status_id, team_id, title,
          description_markdown, attachment_count, due_date, priority, position, created_by_user_id,
          updated_by_user_id, created_at, updated_at, archived_at, deleted_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        task.id,
        task.organizationId,
        task.projectId,
        task.number,
        task.parentTaskId ?? null,
        task.statusId,
        task.teamId ?? null,
        task.title,
        task.description,
        task.attachmentCount,
        task.dueDate ?? null,
        task.priority,
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

  deleteAttachment(context: WriteContext, attachmentId: string): void {
    requireSqliteConnection(context)
      .prepare("DELETE FROM task_attachments WHERE id = ?")
      .run(attachmentId);
  }

  deleteComment(context: WriteContext, commentId: string): void {
    const connection = requireSqliteConnection(context);
    connection.prepare("DELETE FROM task_attachments WHERE comment_id = ?").run(commentId);
    connection.prepare("DELETE FROM task_comments WHERE id = ?").run(commentId);
  }

  deleteCommentReaction(
    context: WriteContext,
    commentId: string,
    userId: string,
    emoji: string,
  ): void {
    requireSqliteConnection(context)
      .prepare(
        "DELETE FROM task_comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?",
      )
      .run(commentId, userId, emoji);
  }

  findAttachmentById(context: ReadContext, attachmentId: string): TaskAttachment | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], AttachmentRow>(
        `SELECT id, organization_id, project_id, task_id, comment_id, name, content_type, size, content,
                uploaded_by_user_id, created_at
         FROM task_attachments WHERE id = ?`,
      )
      .get(attachmentId);
    return row ? mapAttachment(row) : undefined;
  }

  findCommentById(context: ReadContext, commentId: string): TaskComment | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], CommentRow>(
        `SELECT id, organization_id, project_id, task_id, author_user_id,
                body_markdown, created_at, updated_at, revision
         FROM task_comments WHERE id = ?`,
      )
      .get(commentId);
    return row ? mapComment(row) : undefined;
  }

  findLabelById(context: ReadContext, labelId: string): Label | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], LabelRow>(`${labelSelection} WHERE id = ?`)
      .get(labelId);
    return row ? mapLabel(row) : undefined;
  }

  findLabelByName(
    context: ReadContext,
    organizationId: string,
    projectId: string | undefined,
    comparisonKey: string,
  ): Label | undefined {
    const clause = projectId === undefined ? "project_id IS NULL" : "project_id = ?";
    const parameters =
      projectId === undefined
        ? [organizationId, comparisonKey]
        : [organizationId, projectId, comparisonKey];
    const row = requireSqliteConnection(context)
      .prepare<unknown[], LabelRow>(
        `${labelSelection} WHERE organization_id = ? AND ${clause} AND comparison_key = ?`,
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

  listAttachments(context: ReadContext, taskId: string): readonly TaskAttachmentSummary[] {
    return requireSqliteConnection(context)
      .prepare<[string], AttachmentRow>(
        `SELECT id, organization_id, project_id, task_id, comment_id, name, content_type, size, content,
                uploaded_by_user_id, created_at
         FROM task_attachments WHERE task_id = ? ORDER BY created_at ASC, id ASC`,
      )
      .all(taskId)
      .map(mapAttachment)
      .map(attachmentSummary);
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
        `SELECT id, organization_id, project_id, task_id, author_user_id,
                body_markdown, created_at, updated_at, revision
         FROM task_comments WHERE task_id = ? ORDER BY created_at DESC, id DESC`,
      )
      .all(taskId)
      .map(mapComment);
  }

  listCommentReactions(context: ReadContext, taskId: string): readonly TaskCommentReaction[] {
    return requireSqliteConnection(context)
      .prepare<[string], CommentReactionRow>(
        `SELECT reaction.comment_id, reaction.organization_id, reaction.user_id, reaction.emoji,
                reaction.created_at
         FROM task_comment_reactions reaction
         INNER JOIN task_comments comment ON comment.id = reaction.comment_id
         WHERE comment.task_id = ?
         ORDER BY reaction.created_at ASC, reaction.comment_id ASC, reaction.user_id ASC`,
      )
      .all(taskId)
      .map((row) =>
        Object.freeze({
          commentId: row.comment_id,
          createdAt: row.created_at,
          emoji: row.emoji,
          organizationId: row.organization_id,
          userId: row.user_id,
        }),
      );
  }

  listLabels(context: ReadContext, organizationId: string, projectId: string): readonly Label[] {
    return requireSqliteConnection(context)
      .prepare<[string, string], LabelRow>(
        `${labelSelection}
         WHERE organization_id = ? AND (project_id IS NULL OR project_id = ?) AND archived_at IS NULL
         ORDER BY project_id IS NOT NULL ASC, name COLLATE NOCASE ASC, id ASC`,
      )
      .all(organizationId, projectId)
      .map(mapLabel);
  }

  listLabelsForTask(context: ReadContext, taskId: string): readonly Label[] {
    return requireSqliteConnection(context)
      .prepare<[string], LabelRow>(
        `SELECT label.id, label.organization_id, label.project_id, label.name,
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
    organizationId: string,
    taskId: string,
  ): readonly TaskActivity[] {
    return requireSqliteConnection(context)
      .prepare<[string, string], ActivityRow>(
        `SELECT id, actor_user_id AS actor_id, operation, metadata_json, occurred_at
         FROM activity_entries
         WHERE organization_id = ? AND task_id = ?
         ORDER BY occurred_at DESC, id DESC
         LIMIT 100`,
      )
      .all(organizationId, taskId)
      .map(mapActivity);
  }

  listTasks(
    context: ReadContext,
    organizationId: string,
    projectId: string,
    includeArchived = false,
  ): readonly Task[] {
    const stateClause = includeArchived
      ? "task.deleted_at IS NULL"
      : `task.archived_at IS NULL AND task.deleted_at IS NULL
         AND (parent.id IS NULL OR (parent.archived_at IS NULL AND parent.deleted_at IS NULL))`;
    return requireSqliteConnection(context)
      .prepare<[string, string], TaskRow>(
        `SELECT task.id, task.organization_id, task.project_id, task.number,
                task.parent_task_id, task.status_id, task.team_id, task.title,
                task.description_markdown, task.attachment_count, task.due_date, task.priority,
                task.position,
                task.created_by_user_id, task.updated_by_user_id, task.created_at,
                task.updated_at, task.archived_at, task.deleted_at, task.revision
         FROM tasks task
         LEFT JOIN tasks parent ON parent.id = task.parent_task_id
         WHERE task.organization_id = ? AND task.project_id = ? AND ${stateClause}
         ORDER BY task.status_id ASC, task.parent_task_id IS NOT NULL ASC,
                  task.parent_task_id ASC, task.position ASC, task.id ASC`,
      )
      .all(organizationId, projectId)
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
      organizationId: string;
    }>,
  ): void {
    const connection = requireSqliteConnection(context);
    connection.prepare("DELETE FROM task_assignees WHERE task_id = ?").run(input.taskId);
    const insert = connection.prepare(
      `INSERT INTO task_assignees (
        organization_id, task_id, user_id, assigned_by_user_id, assigned_at
      ) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const userId of input.userIds) {
      insert.run(
        input.organizationId,
        input.taskId,
        userId,
        input.assignedByUserId,
        input.assignedAt,
      );
    }
  }

  replaceLabels(
    context: WriteContext,
    input: Readonly<{
      appliedAt: number;
      appliedByUserId: string;
      labelIds: readonly string[];
      taskId: string;
      organizationId: string;
    }>,
  ): void {
    const connection = requireSqliteConnection(context);
    connection.prepare("DELETE FROM task_labels WHERE task_id = ?").run(input.taskId);
    const insert = connection.prepare(
      `INSERT INTO task_labels (
        organization_id, task_id, label_id, applied_by_user_id, applied_at
      ) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const labelId of input.labelIds) {
      insert.run(
        input.organizationId,
        input.taskId,
        labelId,
        input.appliedByUserId,
        input.appliedAt,
      );
    }
  }

  saveComment(context: WriteContext, comment: TaskComment): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE task_comments SET body_markdown = ?, updated_at = ?, revision = ?
         WHERE id = ? AND organization_id = ? AND project_id = ? AND task_id = ?`,
      )
      .run(
        comment.body,
        comment.updatedAt,
        comment.revision,
        comment.id,
        comment.organizationId,
        comment.projectId,
        comment.taskId,
      );
  }

  saveTask(context: WriteContext, task: Task): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE tasks SET parent_task_id = ?, status_id = ?, team_id = ?, title = ?,
             description_markdown = ?, attachment_count = ?, due_date = ?, priority = ?, position = ?,
             updated_by_user_id = ?, updated_at = ?, archived_at = ?, deleted_at = ?, revision = ?
         WHERE id = ? AND organization_id = ? AND project_id = ?`,
      )
      .run(
        task.parentTaskId ?? null,
        task.statusId,
        task.teamId ?? null,
        task.title,
        task.description,
        task.attachmentCount,
        task.dueDate ?? null,
        task.priority,
        task.position,
        task.updatedByUserId,
        task.updatedAt,
        task.archivedAt ?? null,
        task.deletedAt ?? null,
        task.revision,
        task.id,
        task.organizationId,
        task.projectId,
      );
  }
}

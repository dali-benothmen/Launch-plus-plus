import type { ReadContext, WriteContext } from "../shared/transactions.js";

export type TaskPriority = "high" | "low" | "medium";

export interface Task {
  readonly archivedAt?: number;
  readonly attachmentCount: number;
  readonly createdAt: number;
  readonly createdByUserId: string;
  readonly deletedAt?: number;
  readonly description: string;
  readonly divisionId?: string;
  readonly dueDate?: string;
  readonly id: string;
  readonly number: number;
  readonly parentTaskId?: string;
  readonly position: number;
  readonly priority: TaskPriority;
  readonly projectId: string;
  readonly revision: number;
  readonly statusId: string;
  readonly teamId?: string;
  readonly title: string;
  readonly updatedAt: number;
  readonly updatedByUserId: string;
  readonly organizationId: string;
}

export interface TaskDivision {
  readonly comparisonKey: string;
  readonly createdAt: number;
  readonly id: string;
  readonly name: string;
  readonly position: number;
  readonly projectId: string;
  readonly taskId: string;
  readonly organizationId: string;
}

export interface Label {
  readonly archivedAt?: number;
  readonly color: string;
  readonly comparisonKey: string;
  readonly createdAt: number;
  readonly id: string;
  readonly name: string;
  readonly projectId?: string;
  readonly revision: number;
  readonly updatedAt: number;
  readonly organizationId: string;
}

export interface TaskView extends Task {
  readonly assigneeUserIds: readonly string[];
  readonly commentCount: number;
  readonly labels: readonly Label[];
  readonly reference: string;
}

export interface TaskComment {
  readonly authorUserId: string;
  readonly body: string;
  readonly createdAt: number;
  readonly id: string;
  readonly projectId: string;
  readonly revision: number;
  readonly reactions: readonly TaskCommentReactionSummary[];
  readonly taskId: string;
  readonly updatedAt: number;
  readonly organizationId: string;
}

export interface TaskCommentReaction {
  readonly commentId: string;
  readonly createdAt: number;
  readonly emoji: string;
  readonly organizationId: string;
  readonly userId: string;
}

export interface TaskCommentReactionSummary {
  readonly count: number;
  readonly emoji: string;
  readonly reactedByCurrentUser: boolean;
}

export interface TaskAttachmentSummary {
  readonly contentType: string;
  readonly commentId?: string;
  readonly createdAt: number;
  readonly id: string;
  readonly name: string;
  readonly projectId: string;
  readonly size: number;
  readonly taskId: string;
  readonly uploadedByUserId: string;
  readonly organizationId: string;
}

export interface TaskAttachment extends TaskAttachmentSummary {
  readonly content: Uint8Array;
}

export interface TaskActivity {
  readonly actorUserId?: string;
  readonly id: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly occurredAt: number;
  readonly operation: string;
}

export interface TaskDetail {
  readonly activity: readonly TaskActivity[];
  readonly attachments: readonly TaskAttachmentSummary[];
  readonly availableLabels: readonly Label[];
  readonly comments: readonly TaskComment[];
  readonly divisions: readonly TaskDivision[];
  readonly subtasks: readonly TaskView[];
  readonly task: TaskView;
}

export interface TaskCatalog {
  readonly labels: readonly Label[];
  readonly tasks: readonly TaskView[];
}

export interface TaskRepository {
  createAttachment(context: WriteContext, attachment: TaskAttachment): void;
  createComment(context: WriteContext, comment: TaskComment): void;
  createCommentReaction(context: WriteContext, reaction: TaskCommentReaction): void;
  createDivision(context: WriteContext, division: TaskDivision): void;
  deleteComment(context: WriteContext, commentId: string): void;
  deleteCommentReaction(
    context: WriteContext,
    commentId: string,
    userId: string,
    emoji: string,
  ): void;
  createLabel(context: WriteContext, label: Label): void;
  createTask(context: WriteContext, task: Task): void;
  deleteAttachment(context: WriteContext, attachmentId: string): void;
  findAttachmentById(context: ReadContext, attachmentId: string): TaskAttachment | undefined;
  findCommentById(context: ReadContext, commentId: string): TaskComment | undefined;
  findDivisionById(context: ReadContext, divisionId: string): TaskDivision | undefined;
  findDivisionByName(
    context: ReadContext,
    taskId: string,
    comparisonKey: string,
  ): TaskDivision | undefined;
  findLabelById(context: ReadContext, labelId: string): Label | undefined;
  findLabelByName(
    context: ReadContext,
    organizationId: string,
    projectId: string | undefined,
    comparisonKey: string,
  ): Label | undefined;
  findTaskById(context: ReadContext, taskId: string): Task | undefined;
  listAssigneeUserIds(context: ReadContext, taskId: string): readonly string[];
  listAttachments(context: ReadContext, taskId: string): readonly TaskAttachmentSummary[];
  listComments(context: ReadContext, taskId: string): readonly TaskComment[];
  listCommentReactions(context: ReadContext, taskId: string): readonly TaskCommentReaction[];
  listDivisions(context: ReadContext, taskId: string): readonly TaskDivision[];
  listLabels(context: ReadContext, organizationId: string, projectId: string): readonly Label[];
  listLabelsForTask(context: ReadContext, taskId: string): readonly Label[];
  listTaskActivity(
    context: ReadContext,
    organizationId: string,
    taskId: string,
  ): readonly TaskActivity[];
  listTasks(
    context: ReadContext,
    organizationId: string,
    projectId: string,
    includeArchived?: boolean,
  ): readonly Task[];
  nextPosition(
    context: ReadContext,
    projectId: string,
    statusId: string,
    parentTaskId?: string,
  ): number;
  reorderTasks(context: WriteContext, tasks: readonly Task[]): void;
  replaceAssignees(
    context: WriteContext,
    input: Readonly<{
      assignedAt: number;
      assignedByUserId: string;
      taskId: string;
      userIds: readonly string[];
      organizationId: string;
    }>,
  ): void;
  replaceLabels(
    context: WriteContext,
    input: Readonly<{
      appliedAt: number;
      appliedByUserId: string;
      labelIds: readonly string[];
      taskId: string;
      organizationId: string;
    }>,
  ): void;
  saveComment(context: WriteContext, comment: TaskComment): void;
  saveTask(context: WriteContext, task: Task): void;
}

export class TaskNotFoundError extends Error {
  override readonly name = "TaskNotFoundError";
}

export class TaskProjectUnavailableError extends Error {
  override readonly name = "TaskProjectUnavailableError";
}

export class TaskStatusInvalidError extends Error {
  override readonly name = "TaskStatusInvalidError";
}

export class TaskTeamInvalidError extends Error {
  override readonly name = "TaskTeamInvalidError";
}

export class TaskParentInvalidError extends Error {
  override readonly name = "TaskParentInvalidError";
}

export class TaskAssigneeInvalidError extends Error {
  override readonly name = "TaskAssigneeInvalidError";
}

export class TaskLabelInvalidError extends Error {
  override readonly name = "TaskLabelInvalidError";
}

export class TaskLabelNameConflictError extends Error {
  override readonly name = "TaskLabelNameConflictError";
}

export class TaskOrderInvalidError extends Error {
  override readonly name = "TaskOrderInvalidError";
}

export class TaskAccessDeniedError extends Error {
  override readonly name = "TaskAccessDeniedError";
}

export class TaskRevisionConflictError extends Error {
  override readonly name = "TaskRevisionConflictError";

  constructor(
    readonly resourceId: string,
    readonly expectedRevision: number,
    readonly currentRevision: number,
  ) {
    super("The task changed before this operation was saved.");
  }
}

import type {
  AuditWriter,
  OrganizationMembershipRepository,
} from "../organizations/organization.js";
import type { Project, ProjectRepository, ProjectStatus } from "../projects/project.js";
import type { OutboxWriter } from "../shared/outbox.js";
import type { ReadContext, TransactionManager, WriteContext } from "../shared/transactions.js";
import type { TeamRepository } from "../teams/team.js";
import type {
  Label,
  Task,
  TaskAttachment,
  TaskCatalog,
  TaskComment,
  TaskDetail,
  TaskPriority,
  TaskRepository,
  TaskView,
} from "./task.js";
import {
  TaskAccessDeniedError,
  TaskAssigneeInvalidError,
  TaskLabelInvalidError,
  TaskLabelNameConflictError,
  TaskNotFoundError,
  TaskOrderInvalidError,
  TaskParentInvalidError,
  TaskProjectUnavailableError,
  TaskRevisionConflictError,
  TaskStatusInvalidError,
  TaskTeamInvalidError,
} from "./task.js";

interface CommandContext {
  readonly correlationId: string;
  readonly installationId: string;
  readonly projectId: string;
  readonly userId: string;
  readonly organizationId: string;
}

export interface TaskServiceDependencies {
  readonly audit: AuditWriter;
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly memberships: OrganizationMembershipRepository;
  readonly outbox: OutboxWriter;
  readonly projects: ProjectRepository;
  readonly tasks: TaskRepository;
  readonly teams: TeamRepository;
  readonly transactions: TransactionManager;
}

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const colorPattern = /^#[\da-f]{6}$/i;

function validateContext(input: CommandContext) {
  if (
    input.correlationId.length === 0 ||
    input.installationId.length === 0 ||
    input.projectId.length === 0 ||
    input.userId.length === 0 ||
    input.organizationId.length === 0
  ) {
    throw new TypeError(
      "Organization, project, user, installation, and correlation identifiers are required.",
    );
  }
}

function validateExpectedRevision(revision: number) {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new TypeError("Expected revision must be a positive integer.");
  }
}

function normalizeTitle(value: string) {
  const title = value.trim().replace(/\s+/g, " ");
  if (title.length === 0) throw new TypeError("Task title is required.");
  if (title.length > 500) throw new TypeError("Task title cannot exceed 500 characters.");
  return title;
}

function normalizeDescription(value: string | undefined) {
  const description = value?.trim() ?? "";
  if (description.length > 100_000) {
    throw new TypeError("Task description cannot exceed 100,000 characters.");
  }
  return description;
}

function normalizeAttachmentName(value: string) {
  const name = value.trim();
  if (name.length === 0) throw new TypeError("Attachment name is required.");
  if (name.length > 255) throw new TypeError("Attachment name cannot exceed 255 characters.");
  return name;
}

function normalizeAttachmentContentType(value: string) {
  const contentType = value.trim() || "application/octet-stream";
  if (contentType.length > 127) {
    throw new TypeError("Attachment content type cannot exceed 127 characters.");
  }
  return contentType;
}

function normalizeAttachmentContent(value: Uint8Array) {
  if (value.byteLength === 0 || value.byteLength > 5_242_880) {
    throw new TypeError("Attachments must be between 1 byte and 5 MB.");
  }
  return new Uint8Array(value);
}

function normalizeComment(value: string) {
  const body = value.trim();
  if (body.length === 0) throw new TypeError("Comment text is required.");
  if (body.length > 20_000) throw new TypeError("Comments cannot exceed 20,000 characters.");
  return body;
}

function normalizeReaction(value: string) {
  const emoji = value.trim();
  if (emoji.length === 0) throw new TypeError("A reaction emoji is required.");
  if (emoji.length > 32) throw new TypeError("Reaction emoji cannot exceed 32 characters.");
  return emoji;
}

function normalizeDueDate(value: null | string | undefined): string | undefined {
  if (value === null || value === undefined || value.length === 0) return undefined;
  const match = datePattern.exec(value);
  if (!match) throw new TypeError("Due date must use YYYY-MM-DD format.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError("Due date must be a valid calendar date.");
  }
  return value;
}

function normalizeLabelName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0) throw new TypeError("Label name is required.");
  if (name.length > 80) throw new TypeError("Label name cannot exceed 80 characters.");
  return name;
}

function comparisonKey(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function uniqueIds(values: readonly string[], field: string) {
  if (values.some((value) => value.length === 0) || new Set(values).size !== values.length) {
    throw new TypeError(`${field} must contain unique non-empty identifiers.`);
  }
  return [...values];
}

function normalizePriority(value: TaskPriority | undefined): TaskPriority {
  return value ?? "medium";
}

function withoutOptional<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const { [key]: _removed, ...remaining } = value;
  return remaining;
}

export class TaskService {
  constructor(private readonly dependencies: TaskServiceDependencies) {}

  list(
    input: Readonly<{ projectId: string; userId: string; organizationId: string }>,
  ): TaskCatalog {
    if (
      input.projectId.length === 0 ||
      input.userId.length === 0 ||
      input.organizationId.length === 0
    ) {
      throw new TypeError("Organization, project, and user identifiers are required.");
    }
    return this.dependencies.transactions.read((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId);
      const tasks = this.dependencies.tasks
        .listTasks(context, input.organizationId, input.projectId)
        .map((task) => this.toView(context, task, project));
      return Object.freeze({
        labels: this.dependencies.tasks.listLabels(context, input.organizationId, input.projectId),
        tasks,
      });
    });
  }

  getDetail(
    input: Readonly<{ projectId: string; taskId: string; userId: string; organizationId: string }>,
  ): TaskDetail {
    if (
      input.projectId.length === 0 ||
      input.taskId.length === 0 ||
      input.userId.length === 0 ||
      input.organizationId.length === 0
    ) {
      throw new TypeError("Organization, project, task, and user identifiers are required.");
    }
    return this.dependencies.transactions.read((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId);
      const task = this.requireTask(context, input, input.taskId);
      return this.toDetail(context, task, project, input.userId);
    });
  }

  createAttachment(
    input: CommandContext &
      Readonly<{
        commentId?: string;
        content: Uint8Array;
        contentType: string;
        name: string;
        taskId: string;
      }>,
  ): Promise<TaskDetail> {
    validateContext(input);
    const name = normalizeAttachmentName(input.name);
    const contentType = normalizeAttachmentContentType(input.contentType);
    const content = normalizeAttachmentContent(input.content);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      if (input.commentId !== undefined) {
        const comment = this.dependencies.tasks.findCommentById(context, input.commentId);
        if (
          !comment ||
          comment.organizationId !== input.organizationId ||
          comment.projectId !== input.projectId ||
          comment.taskId !== task.id
        ) {
          throw new TaskNotFoundError("The task comment does not exist.");
        }
      }
      const attachments = this.dependencies.tasks.listAttachments(context, task.id);
      if (attachments.length >= 100) {
        throw new TypeError("A task cannot have more than 100 attachments.");
      }
      const now = this.dependencies.clock();
      const attachment: TaskAttachment = Object.freeze({
        ...(input.commentId === undefined ? {} : { commentId: input.commentId }),
        content,
        contentType,
        createdAt: now,
        id: this.dependencies.generateId(),
        name,
        projectId: input.projectId,
        size: content.byteLength,
        taskId: task.id,
        uploadedByUserId: input.userId,
        organizationId: input.organizationId,
      });
      this.dependencies.tasks.createAttachment(context, attachment);
      const updated: Task = Object.freeze({
        ...task,
        attachmentCount: attachments.length + 1,
        revision: task.revision + 1,
        updatedAt: now,
        updatedByUserId: input.userId,
      });
      this.dependencies.tasks.saveTask(context, updated);
      this.record(context, input, "task.attachment_added", task.id, {
        attachmentId: attachment.id,
        name: attachment.name,
        revision: updated.revision,
        size: attachment.size,
      });
      return this.toDetail(context, updated, project, input.userId);
    });
  }

  deleteAttachment(
    input: CommandContext & Readonly<{ attachmentId: string; taskId: string }>,
  ): Promise<TaskDetail> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      const attachment = this.dependencies.tasks.findAttachmentById(context, input.attachmentId);
      if (
        !attachment ||
        attachment.organizationId !== input.organizationId ||
        attachment.projectId !== input.projectId ||
        attachment.taskId !== task.id
      ) {
        throw new TaskNotFoundError("The task attachment does not exist.");
      }
      this.dependencies.tasks.deleteAttachment(context, attachment.id);
      const now = this.dependencies.clock();
      const updated: Task = Object.freeze({
        ...task,
        attachmentCount: this.dependencies.tasks.listAttachments(context, task.id).length,
        revision: task.revision + 1,
        updatedAt: now,
        updatedByUserId: input.userId,
      });
      this.dependencies.tasks.saveTask(context, updated);
      this.record(context, input, "task.attachment_deleted", task.id, {
        attachmentId: attachment.id,
        name: attachment.name,
        revision: updated.revision,
      });
      return this.toDetail(context, updated, project, input.userId);
    });
  }

  getAttachment(
    input: Readonly<{
      attachmentId: string;
      projectId: string;
      taskId: string;
      userId: string;
      organizationId: string;
    }>,
  ): TaskAttachment {
    if (
      input.attachmentId.length === 0 ||
      input.projectId.length === 0 ||
      input.taskId.length === 0 ||
      input.userId.length === 0 ||
      input.organizationId.length === 0
    ) {
      throw new TypeError(
        "Organization, project, task, attachment, and user identifiers are required.",
      );
    }
    return this.dependencies.transactions.read((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      this.requireProject(context, input.organizationId, input.projectId);
      const task = this.requireTask(context, input, input.taskId);
      const attachment = this.dependencies.tasks.findAttachmentById(context, input.attachmentId);
      if (
        !attachment ||
        attachment.organizationId !== input.organizationId ||
        attachment.projectId !== input.projectId ||
        attachment.taskId !== task.id
      ) {
        throw new TaskNotFoundError("The task attachment does not exist.");
      }
      return attachment;
    });
  }

  createComment(
    input: CommandContext & Readonly<{ body: string; taskId: string }>,
  ): Promise<TaskComment> {
    validateContext(input);
    const body = normalizeComment(input.body);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      const now = this.dependencies.clock();
      const comment: TaskComment = Object.freeze({
        authorUserId: input.userId,
        body,
        createdAt: now,
        id: this.dependencies.generateId(),
        projectId: input.projectId,
        revision: 1,
        reactions: [],
        taskId: task.id,
        updatedAt: now,
        organizationId: input.organizationId,
      });
      this.dependencies.tasks.createComment(context, comment);
      this.record(context, input, "comment.created", task.id, { commentId: comment.id });
      return comment;
    });
  }

  setCommentReaction(
    input: CommandContext &
      Readonly<{ active: boolean; commentId: string; emoji: string; taskId: string }>,
  ): Promise<TaskDetail> {
    validateContext(input);
    const emoji = normalizeReaction(input.emoji);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      const comment = this.dependencies.tasks.findCommentById(context, input.commentId);
      if (
        !comment ||
        comment.organizationId !== input.organizationId ||
        comment.projectId !== input.projectId ||
        comment.taskId !== task.id
      ) {
        throw new TaskNotFoundError("The task comment does not exist.");
      }
      if (input.active) {
        this.dependencies.tasks.createCommentReaction(context, {
          commentId: comment.id,
          createdAt: this.dependencies.clock(),
          emoji,
          organizationId: input.organizationId,
          userId: input.userId,
        });
      } else {
        this.dependencies.tasks.deleteCommentReaction(context, comment.id, input.userId, emoji);
      }
      this.record(
        context,
        input,
        input.active ? "comment.reaction_added" : "comment.reaction_removed",
        task.id,
        { commentId: comment.id, emoji },
      );
      return this.toDetail(context, task, project, input.userId);
    });
  }

  updateComment(
    input: CommandContext &
      Readonly<{ body: string; commentId: string; expectedRevision: number; taskId: string }>,
  ): Promise<TaskDetail> {
    validateContext(input);
    validateExpectedRevision(input.expectedRevision);
    const body = normalizeComment(input.body);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      const comment = this.dependencies.tasks.findCommentById(context, input.commentId);
      if (
        !comment ||
        comment.organizationId !== input.organizationId ||
        comment.projectId !== input.projectId ||
        comment.taskId !== task.id
      ) {
        throw new TaskNotFoundError("The task comment does not exist.");
      }
      if (comment.authorUserId !== input.userId) {
        throw new TaskAccessDeniedError("Only the comment author can edit this comment.");
      }
      if (comment.revision !== input.expectedRevision) {
        throw new TaskRevisionConflictError(comment.id, input.expectedRevision, comment.revision);
      }
      const updated: TaskComment = Object.freeze({
        ...comment,
        body,
        revision: comment.revision + 1,
        updatedAt: this.dependencies.clock(),
      });
      this.dependencies.tasks.saveComment(context, updated);
      this.record(context, input, "comment.updated", task.id, { commentId: comment.id });
      return this.toDetail(context, task, project, input.userId);
    });
  }

  deleteComment(
    input: CommandContext &
      Readonly<{ commentId: string; expectedRevision: number; taskId: string }>,
  ): Promise<TaskDetail> {
    validateContext(input);
    validateExpectedRevision(input.expectedRevision);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      const comment = this.dependencies.tasks.findCommentById(context, input.commentId);
      if (
        !comment ||
        comment.organizationId !== input.organizationId ||
        comment.projectId !== input.projectId ||
        comment.taskId !== task.id
      ) {
        throw new TaskNotFoundError("The task comment does not exist.");
      }
      if (comment.authorUserId !== input.userId) {
        throw new TaskAccessDeniedError("Only the comment author can delete this comment.");
      }
      if (comment.revision !== input.expectedRevision) {
        throw new TaskRevisionConflictError(comment.id, input.expectedRevision, comment.revision);
      }
      this.dependencies.tasks.deleteComment(context, comment.id);
      const now = this.dependencies.clock();
      const updated = Object.freeze({
        ...task,
        attachmentCount: this.dependencies.tasks.listAttachments(context, task.id).length,
        revision: task.revision + 1,
        updatedAt: now,
        updatedByUserId: input.userId,
      });
      this.dependencies.tasks.saveTask(context, updated);
      this.record(context, input, "comment.deleted", task.id, { commentId: comment.id });
      return this.toDetail(context, updated, project, input.userId);
    });
  }

  createTask(
    input: CommandContext &
      Readonly<{
        assigneeUserIds?: readonly string[];
        description?: string;
        dueDate?: string;
        labelIds?: readonly string[];
        parentTaskId?: string;
        priority?: TaskPriority;
        statusId?: string;
        teamId?: string;
        title: string;
      }>,
  ): Promise<TaskView> {
    validateContext(input);
    const title = normalizeTitle(input.title);
    const description = normalizeDescription(input.description);
    const dueDate = normalizeDueDate(input.dueDate);
    const assigneeUserIds = uniqueIds(input.assigneeUserIds ?? [], "Assignees");
    const labelIds = uniqueIds(input.labelIds ?? [], "Labels");
    const priority = normalizePriority(input.priority);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const statuses = this.activeStatuses(context, input.organizationId, input.projectId);
      const status = input.statusId ? this.requireStatus(statuses, input.statusId) : statuses[0];
      if (!status) throw new TaskStatusInvalidError("The project has no active status.");
      if (input.teamId) {
        const team = this.dependencies.teams.findById(context, input.teamId);
        if (!team || team.organizationId !== input.organizationId) {
          throw new TaskTeamInvalidError("The selected team is unavailable.");
        }
      }
      for (const userId of assigneeUserIds) {
        const membership = this.dependencies.memberships.find(
          context,
          input.organizationId,
          userId,
        );
        if (membership?.state !== "active") {
          throw new TaskAssigneeInvalidError(
            "Every assignee must be an active organization member.",
          );
        }
      }
      for (const labelId of labelIds) {
        const label = this.dependencies.tasks.findLabelById(context, labelId);
        if (
          !label ||
          label.organizationId !== input.organizationId ||
          label.archivedAt !== undefined ||
          (label.projectId !== undefined && label.projectId !== input.projectId)
        ) {
          throw new TaskLabelInvalidError("Every label must be available to the project.");
        }
      }
      const parent = input.parentTaskId
        ? this.requireParent(context, input, input.parentTaskId)
        : undefined;
      const now = this.dependencies.clock();
      const task: Task = Object.freeze({
        attachmentCount: 0,
        createdAt: now,
        createdByUserId: input.userId,
        description,
        ...(dueDate ? { dueDate } : {}),
        id: this.dependencies.generateId(),
        number: project.nextTaskNumber,
        ...(parent ? { parentTaskId: parent.id } : {}),
        position: this.dependencies.tasks.nextPosition(
          context,
          input.projectId,
          status.id,
          parent?.id,
        ),
        priority,
        projectId: input.projectId,
        revision: 1,
        statusId: status.id,
        ...(input.teamId ? { teamId: input.teamId } : {}),
        title,
        updatedAt: now,
        updatedByUserId: input.userId,
        organizationId: input.organizationId,
      });
      this.dependencies.tasks.createTask(context, task);
      if (input.assigneeUserIds !== undefined) {
        this.dependencies.tasks.replaceAssignees(context, {
          assignedAt: now,
          assignedByUserId: input.userId,
          taskId: task.id,
          userIds: assigneeUserIds,
          organizationId: input.organizationId,
        });
      }
      if (input.labelIds !== undefined) {
        this.dependencies.tasks.replaceLabels(context, {
          appliedAt: now,
          appliedByUserId: input.userId,
          labelIds,
          taskId: task.id,
          organizationId: input.organizationId,
        });
      }
      this.dependencies.projects.saveProject(context, {
        ...project,
        nextTaskNumber: project.nextTaskNumber + 1,
        revision: project.revision + 1,
        updatedAt: now,
      });
      this.record(context, input, "task.created", task.id, {
        attachmentCount: task.attachmentCount,
        number: task.number,
        parentTaskId: task.parentTaskId ?? null,
        priority: task.priority,
        statusId: task.statusId,
        teamId: task.teamId ?? null,
      });
      return this.toView(context, task, project);
    });
  }

  updateTask(
    input: CommandContext &
      Readonly<{
        description?: string;
        dueDate?: null | string;
        expectedRevision: number;
        priority?: TaskPriority;
        taskId: string;
        teamId?: null | string;
        title?: string;
      }>,
  ): Promise<TaskView> {
    validateContext(input);
    validateExpectedRevision(input.expectedRevision);
    const title = input.title === undefined ? undefined : normalizeTitle(input.title);
    const description =
      input.description === undefined ? undefined : normalizeDescription(input.description);
    const dueDate = input.dueDate === undefined ? undefined : normalizeDueDate(input.dueDate);
    const priority = input.priority === undefined ? undefined : normalizePriority(input.priority);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      this.requireRevision(task, input.expectedRevision);
      const withoutDueDate = input.dueDate === null ? withoutOptional(task, "dueDate") : task;
      const base =
        input.teamId === null ? withoutOptional(withoutDueDate, "teamId") : withoutDueDate;
      if (typeof input.teamId === "string") {
        const team = this.dependencies.teams.findById(context, input.teamId);
        if (!team || team.organizationId !== input.organizationId) {
          throw new TaskTeamInvalidError("The selected team is unavailable.");
        }
      }
      const updated: Task = Object.freeze({
        ...base,
        ...(title === undefined ? {} : { title }),
        ...(description === undefined ? {} : { description }),
        ...(dueDate === undefined ? {} : { dueDate }),
        revision: task.revision + 1,
        updatedAt: this.dependencies.clock(),
        ...(priority === undefined ? {} : { priority }),
        ...(typeof input.teamId === "string" ? { teamId: input.teamId } : {}),
        updatedByUserId: input.userId,
      });
      this.dependencies.tasks.saveTask(context, updated);
      this.record(context, input, "task.updated", task.id, { revision: updated.revision });
      return this.toView(context, updated, project);
    });
  }

  moveTask(
    input: CommandContext &
      Readonly<{
        beforeTaskId?: string;
        expectedRevision: number;
        statusId: string;
        taskId: string;
      }>,
  ): Promise<TaskView> {
    validateContext(input);
    validateExpectedRevision(input.expectedRevision);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      this.requireRevision(task, input.expectedRevision);
      const status = this.requireStatus(
        this.activeStatuses(context, input.organizationId, input.projectId),
        input.statusId,
      );
      const targetTasks = this.dependencies.tasks
        .listTasks(context, input.organizationId, input.projectId)
        .filter(
          (item) =>
            item.id !== task.id &&
            item.statusId === status.id &&
            item.parentTaskId === task.parentTaskId,
        );
      const insertionIndex =
        input.beforeTaskId === undefined
          ? targetTasks.length
          : targetTasks.findIndex((item) => item.id === input.beforeTaskId);
      if (insertionIndex < 0) {
        throw new TaskOrderInvalidError(
          "The task used as the ordering anchor is outside the target column.",
        );
      }
      const ordered = [...targetTasks];
      ordered.splice(insertionIndex, 0, task);
      const unchanged = ordered.every(
        (item, position) => item.position === position && item.statusId === status.id,
      );
      if (unchanged) return this.toView(context, task, project);
      const now = this.dependencies.clock();
      const reordered = ordered.map((item, position): Task => {
        const changed = item.position !== position || item.statusId !== status.id;
        if (!changed) return item;
        return Object.freeze({
          ...item,
          position,
          revision: item.revision + 1,
          statusId: status.id,
          updatedAt: now,
          updatedByUserId: input.userId,
        });
      });
      this.dependencies.tasks.reorderTasks(context, reordered);
      const updated = reordered.find((item) => item.id === task.id);
      if (!updated) throw new TaskOrderInvalidError("The moved task was lost from its order.");
      this.record(context, input, "task.moved", task.id, {
        beforeTaskId: input.beforeTaskId ?? null,
        fromStatusId: task.statusId,
        revision: updated.revision,
        toStatusId: updated.statusId,
      });
      return this.toView(context, updated, project);
    });
  }

  setAssignees(
    input: CommandContext &
      Readonly<{ expectedRevision: number; taskId: string; userIds: readonly string[] }>,
  ): Promise<TaskView> {
    validateContext(input);
    validateExpectedRevision(input.expectedRevision);
    const userIds = uniqueIds(input.userIds, "Assignees");
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      this.requireRevision(task, input.expectedRevision);
      for (const userId of userIds) {
        const membership = this.dependencies.memberships.find(
          context,
          input.organizationId,
          userId,
        );
        if (membership?.state !== "active") {
          throw new TaskAssigneeInvalidError(
            "Every assignee must be an active organization member.",
          );
        }
      }
      const now = this.dependencies.clock();
      this.dependencies.tasks.replaceAssignees(context, {
        assignedAt: now,
        assignedByUserId: input.userId,
        taskId: task.id,
        userIds,
        organizationId: input.organizationId,
      });
      const updated = this.touch(task, input.userId, now);
      this.dependencies.tasks.saveTask(context, updated);
      this.record(context, input, "task.assignees_changed", task.id, {
        assigneeUserIds: userIds,
        revision: updated.revision,
      });
      return this.toView(context, updated, project);
    });
  }

  createLabel(
    input: CommandContext &
      Readonly<{ color: string; name: string; scope?: "project" | "organization" }>,
  ): Promise<Label> {
    validateContext(input);
    const name = normalizeLabelName(input.name);
    const key = comparisonKey(name);
    if (!colorPattern.test(input.color)) {
      return Promise.reject(new TypeError("Label color must be a six-digit hexadecimal color."));
    }
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      this.requireProject(context, input.organizationId, input.projectId, true);
      const projectId = input.scope === "organization" ? undefined : input.projectId;
      if (this.dependencies.tasks.findLabelByName(context, input.organizationId, projectId, key)) {
        throw new TaskLabelNameConflictError("A label with this name already exists in the scope.");
      }
      const now = this.dependencies.clock();
      const label: Label = Object.freeze({
        color: input.color.toLowerCase(),
        comparisonKey: key,
        createdAt: now,
        id: this.dependencies.generateId(),
        name,
        ...(projectId ? { projectId } : {}),
        revision: 1,
        updatedAt: now,
        organizationId: input.organizationId,
      });
      this.dependencies.tasks.createLabel(context, label);
      this.record(context, input, "label.created", label.id, {
        color: label.color,
        name: label.name,
        projectId: label.projectId ?? null,
      });
      return label;
    });
  }

  setLabels(
    input: CommandContext &
      Readonly<{ expectedRevision: number; labelIds: readonly string[]; taskId: string }>,
  ): Promise<TaskView> {
    validateContext(input);
    validateExpectedRevision(input.expectedRevision);
    const labelIds = uniqueIds(input.labelIds, "Labels");
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      this.requireRevision(task, input.expectedRevision);
      for (const labelId of labelIds) {
        const label = this.dependencies.tasks.findLabelById(context, labelId);
        if (
          !label ||
          label.organizationId !== input.organizationId ||
          label.archivedAt !== undefined ||
          (label.projectId !== undefined && label.projectId !== input.projectId)
        ) {
          throw new TaskLabelInvalidError(
            "Every label must be active and available to the project.",
          );
        }
      }
      const now = this.dependencies.clock();
      this.dependencies.tasks.replaceLabels(context, {
        appliedAt: now,
        appliedByUserId: input.userId,
        labelIds,
        taskId: task.id,
        organizationId: input.organizationId,
      });
      const updated = this.touch(task, input.userId, now);
      this.dependencies.tasks.saveTask(context, updated);
      this.record(context, input, "task.labels_changed", task.id, {
        labelIds,
        revision: updated.revision,
      });
      return this.toView(context, updated, project);
    });
  }

  archiveTask(
    input: CommandContext & Readonly<{ expectedRevision: number; taskId: string }>,
  ): Promise<TaskView> {
    return this.setLifecycle(input, "archive");
  }

  restoreTask(
    input: CommandContext & Readonly<{ expectedRevision: number; taskId: string }>,
  ): Promise<TaskView> {
    return this.setLifecycle(input, "restore");
  }

  private setLifecycle(
    input: CommandContext & Readonly<{ expectedRevision: number; taskId: string }>,
    action: "archive" | "restore",
  ): Promise<TaskView> {
    validateContext(input);
    validateExpectedRevision(input.expectedRevision);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.organizationId, input.userId);
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId, true);
      this.requireRevision(task, input.expectedRevision);
      if (action === "archive" && task.archivedAt !== undefined) {
        return this.toView(context, task, project);
      }
      if (action === "restore" && task.archivedAt === undefined) {
        return this.toView(context, task, project);
      }
      const now = this.dependencies.clock();
      let updated: Task;
      if (action === "archive") {
        updated = Object.freeze({
          ...task,
          archivedAt: now,
          revision: task.revision + 1,
          updatedAt: now,
          updatedByUserId: input.userId,
        });
      } else {
        if (task.parentTaskId) {
          const parent = this.dependencies.tasks.findTaskById(context, task.parentTaskId);
          if (!parent || parent.archivedAt !== undefined || parent.deletedAt !== undefined) {
            throw new TaskParentInvalidError(
              "Restore the parent task before restoring its subtask.",
            );
          }
        }
        updated = Object.freeze({
          ...withoutOptional(task, "archivedAt"),
          position: this.dependencies.tasks.nextPosition(
            context,
            task.projectId,
            task.statusId,
            task.parentTaskId,
          ),
          revision: task.revision + 1,
          updatedAt: now,
          updatedByUserId: input.userId,
        });
      }
      this.dependencies.tasks.saveTask(context, updated);
      this.record(context, input, `task.${action}d`, task.id, { revision: updated.revision });
      return this.toView(context, updated, project);
    });
  }

  private requireActor(context: ReadContext, organizationId: string, userId: string) {
    const membership = this.dependencies.memberships.find(context, organizationId, userId);
    if (membership?.state !== "active") {
      throw new TaskAccessDeniedError("Active organization membership is required.");
    }
    return membership;
  }

  private requireProject(
    context: ReadContext,
    organizationId: string,
    projectId: string,
    mutable = false,
  ) {
    const project = this.dependencies.projects.findProjectById(context, projectId);
    if (
      !project ||
      project.organizationId !== organizationId ||
      project.deletedAt !== undefined ||
      (mutable && project.archivedAt !== undefined)
    ) {
      throw new TaskProjectUnavailableError("The project is unavailable.");
    }
    return project;
  }

  private activeStatuses(context: ReadContext, organizationId: string, projectId: string) {
    return this.dependencies.projects
      .listStatuses(context, organizationId)
      .filter((status) => status.projectId === projectId && status.archivedAt === undefined);
  }

  private requireStatus(statuses: readonly ProjectStatus[], statusId: string) {
    const status = statuses.find((item) => item.id === statusId);
    if (!status) throw new TaskStatusInvalidError("The task status is unavailable.");
    return status;
  }

  private requireTask(
    context: ReadContext,
    scope: Readonly<{ projectId: string; organizationId: string }>,
    taskId: string,
    includeArchived = false,
  ) {
    const task = this.dependencies.tasks.findTaskById(context, taskId);
    if (
      !task ||
      task.organizationId !== scope.organizationId ||
      task.projectId !== scope.projectId ||
      task.deletedAt !== undefined ||
      (!includeArchived && task.archivedAt !== undefined)
    ) {
      throw new TaskNotFoundError("The task does not exist.");
    }
    return task;
  }

  private requireParent(context: ReadContext, scope: CommandContext, parentId: string) {
    const parent = this.requireTask(context, scope, parentId);
    if (parent.parentTaskId !== undefined) {
      throw new TaskParentInvalidError("Tasks support only one subtask level.");
    }
    return parent;
  }

  private requireRevision(task: Task, expectedRevision: number) {
    if (task.revision !== expectedRevision) {
      throw new TaskRevisionConflictError(task.id, expectedRevision, task.revision);
    }
  }

  private touch(task: Task, userId: string, now: number): Task {
    return Object.freeze({
      ...task,
      revision: task.revision + 1,
      updatedAt: now,
      updatedByUserId: userId,
    });
  }

  private toDetail(
    context: ReadContext,
    task: Task,
    project: Project,
    currentUserId: string,
  ): TaskDetail {
    const subtasks = this.dependencies.tasks
      .listTasks(context, task.organizationId, task.projectId)
      .filter((item) => item.parentTaskId === task.id)
      .map((item) => this.toView(context, item, project));
    const reactionGroups = new Map<
      string,
      Map<string, { count: number; reactedByCurrentUser: boolean }>
    >();
    for (const reaction of this.dependencies.tasks.listCommentReactions(context, task.id)) {
      const commentReactions = reactionGroups.get(reaction.commentId) ?? new Map();
      const summary = commentReactions.get(reaction.emoji) ?? {
        count: 0,
        reactedByCurrentUser: false,
      };
      commentReactions.set(reaction.emoji, {
        count: summary.count + 1,
        reactedByCurrentUser: summary.reactedByCurrentUser || reaction.userId === currentUserId,
      });
      reactionGroups.set(reaction.commentId, commentReactions);
    }
    const comments = this.dependencies.tasks.listComments(context, task.id).map((comment) =>
      Object.freeze({
        ...comment,
        reactions: Array.from(reactionGroups.get(comment.id) ?? []).map(([emoji, summary]) =>
          Object.freeze({ emoji, ...summary }),
        ),
      }),
    );
    return Object.freeze({
      activity: this.dependencies.tasks.listTaskActivity(context, task.organizationId, task.id),
      attachments: this.dependencies.tasks.listAttachments(context, task.id),
      availableLabels: this.dependencies.tasks.listLabels(
        context,
        task.organizationId,
        task.projectId,
      ),
      comments,
      subtasks,
      task: this.toView(context, task, project),
    });
  }

  private toView(context: ReadContext, task: Task, project: Project): TaskView {
    return Object.freeze({
      ...task,
      assigneeUserIds: this.dependencies.tasks.listAssigneeUserIds(context, task.id),
      commentCount: this.dependencies.tasks.listComments(context, task.id).length,
      labels: this.dependencies.tasks.listLabelsForTask(context, task.id),
      reference: `${project.key}-${task.number}`,
    });
  }

  private record(
    context: WriteContext,
    input: CommandContext,
    operation: string,
    targetId: string,
    metadata: Readonly<Record<string, unknown>>,
  ) {
    const occurredAt = this.dependencies.clock();
    const targetType = operation.startsWith("label.") ? "label" : "task";
    this.dependencies.audit.append(context, {
      actorId: input.userId,
      actorType: "user",
      correlationId: input.correlationId,
      id: this.dependencies.generateId(),
      installationId: input.installationId,
      metadata: { projectId: input.projectId, ...metadata },
      occurredAt,
      operation,
      outcome: "succeeded",
      targetId,
      targetType,
      organizationId: input.organizationId,
    });
    this.dependencies.outbox.append(context, {
      availableAt: occurredAt,
      correlationId: input.correlationId,
      id: this.dependencies.generateId(),
      installationId: input.installationId,
      occurredAt,
      payload: {
        actorId: input.userId,
        projectId: input.projectId,
        ...metadata,
        targetId,
        organizationId: input.organizationId,
      },
      topic: operation,
    });
  }
}

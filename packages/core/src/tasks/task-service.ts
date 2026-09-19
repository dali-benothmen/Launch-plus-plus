import type { OutboxWriter } from "../shared/outbox.js";
import type { ReadContext, TransactionManager, WriteContext } from "../shared/transactions.js";
import type { Project, ProjectRepository, ProjectStatus } from "../projects/project.js";
import type { AuditWriter, WorkspaceMembershipRepository } from "../workspaces/workspace.js";
import type { Label, Task, TaskCatalog, TaskRepository, TaskView } from "./task.js";
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
} from "./task.js";

interface CommandContext {
  readonly correlationId: string;
  readonly installationId: string;
  readonly projectId: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface TaskServiceDependencies {
  readonly audit: AuditWriter;
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly memberships: WorkspaceMembershipRepository;
  readonly outbox: OutboxWriter;
  readonly projects: ProjectRepository;
  readonly tasks: TaskRepository;
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
    input.workspaceId.length === 0
  ) {
    throw new TypeError(
      "Workspace, project, user, installation, and correlation identifiers are required.",
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

function withoutOptional<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const { [key]: _removed, ...remaining } = value;
  return remaining;
}

export class TaskService {
  constructor(private readonly dependencies: TaskServiceDependencies) {}

  list(input: Readonly<{ projectId: string; userId: string; workspaceId: string }>): TaskCatalog {
    if (
      input.projectId.length === 0 ||
      input.userId.length === 0 ||
      input.workspaceId.length === 0
    ) {
      throw new TypeError("Workspace, project, and user identifiers are required.");
    }
    return this.dependencies.transactions.read((context) => {
      this.requireActor(context, input.workspaceId, input.userId);
      const project = this.requireProject(context, input.workspaceId, input.projectId);
      const tasks = this.dependencies.tasks
        .listTasks(context, input.workspaceId, input.projectId)
        .map((task) => this.toView(context, task, project));
      return Object.freeze({
        labels: this.dependencies.tasks.listLabels(context, input.workspaceId, input.projectId),
        tasks,
      });
    });
  }

  createTask(
    input: CommandContext &
      Readonly<{
        description?: string;
        dueDate?: string;
        parentTaskId?: string;
        statusId?: string;
        title: string;
      }>,
  ): Promise<TaskView> {
    validateContext(input);
    const title = normalizeTitle(input.title);
    const description = normalizeDescription(input.description);
    const dueDate = normalizeDueDate(input.dueDate);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.workspaceId, input.userId);
      const project = this.requireProject(context, input.workspaceId, input.projectId, true);
      const statuses = this.activeStatuses(context, input.workspaceId, input.projectId);
      const status = input.statusId ? this.requireStatus(statuses, input.statusId) : statuses[0];
      if (!status) throw new TaskStatusInvalidError("The project has no active status.");
      const parent = input.parentTaskId
        ? this.requireParent(context, input, input.parentTaskId)
        : undefined;
      const now = this.dependencies.clock();
      const task: Task = Object.freeze({
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
        projectId: input.projectId,
        revision: 1,
        statusId: status.id,
        title,
        updatedAt: now,
        updatedByUserId: input.userId,
        workspaceId: input.workspaceId,
      });
      this.dependencies.tasks.createTask(context, task);
      this.dependencies.projects.saveProject(context, {
        ...project,
        nextTaskNumber: project.nextTaskNumber + 1,
        revision: project.revision + 1,
        updatedAt: now,
      });
      this.record(context, input, "task.created", task.id, {
        number: task.number,
        parentTaskId: task.parentTaskId ?? null,
        statusId: task.statusId,
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
        taskId: string;
        title?: string;
      }>,
  ): Promise<TaskView> {
    validateContext(input);
    validateExpectedRevision(input.expectedRevision);
    const title = input.title === undefined ? undefined : normalizeTitle(input.title);
    const description =
      input.description === undefined ? undefined : normalizeDescription(input.description);
    const dueDate = input.dueDate === undefined ? undefined : normalizeDueDate(input.dueDate);
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.workspaceId, input.userId);
      const project = this.requireProject(context, input.workspaceId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      this.requireRevision(task, input.expectedRevision);
      const base = input.dueDate === null ? withoutOptional(task, "dueDate") : task;
      const updated: Task = Object.freeze({
        ...base,
        ...(title === undefined ? {} : { title }),
        ...(description === undefined ? {} : { description }),
        ...(dueDate === undefined ? {} : { dueDate }),
        revision: task.revision + 1,
        updatedAt: this.dependencies.clock(),
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
      this.requireActor(context, input.workspaceId, input.userId);
      const project = this.requireProject(context, input.workspaceId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      this.requireRevision(task, input.expectedRevision);
      const status = this.requireStatus(
        this.activeStatuses(context, input.workspaceId, input.projectId),
        input.statusId,
      );
      const targetTasks = this.dependencies.tasks
        .listTasks(context, input.workspaceId, input.projectId)
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
      this.requireActor(context, input.workspaceId, input.userId);
      const project = this.requireProject(context, input.workspaceId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      this.requireRevision(task, input.expectedRevision);
      for (const userId of userIds) {
        const membership = this.dependencies.memberships.find(context, input.workspaceId, userId);
        if (membership?.state !== "active") {
          throw new TaskAssigneeInvalidError("Every assignee must be an active workspace member.");
        }
      }
      const now = this.dependencies.clock();
      this.dependencies.tasks.replaceAssignees(context, {
        assignedAt: now,
        assignedByUserId: input.userId,
        taskId: task.id,
        userIds,
        workspaceId: input.workspaceId,
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
      Readonly<{ color: string; name: string; scope?: "project" | "workspace" }>,
  ): Promise<Label> {
    validateContext(input);
    const name = normalizeLabelName(input.name);
    const key = comparisonKey(name);
    if (!colorPattern.test(input.color)) {
      return Promise.reject(new TypeError("Label color must be a six-digit hexadecimal color."));
    }
    return this.dependencies.transactions.write((context) => {
      this.requireActor(context, input.workspaceId, input.userId);
      this.requireProject(context, input.workspaceId, input.projectId, true);
      const projectId = input.scope === "workspace" ? undefined : input.projectId;
      if (this.dependencies.tasks.findLabelByName(context, input.workspaceId, projectId, key)) {
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
        workspaceId: input.workspaceId,
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
      this.requireActor(context, input.workspaceId, input.userId);
      const project = this.requireProject(context, input.workspaceId, input.projectId, true);
      const task = this.requireTask(context, input, input.taskId);
      this.requireRevision(task, input.expectedRevision);
      for (const labelId of labelIds) {
        const label = this.dependencies.tasks.findLabelById(context, labelId);
        if (
          !label ||
          label.workspaceId !== input.workspaceId ||
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
        workspaceId: input.workspaceId,
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
      this.requireActor(context, input.workspaceId, input.userId);
      const project = this.requireProject(context, input.workspaceId, input.projectId, true);
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

  private requireActor(context: ReadContext, workspaceId: string, userId: string) {
    const membership = this.dependencies.memberships.find(context, workspaceId, userId);
    if (membership?.state !== "active") {
      throw new TaskAccessDeniedError("Active workspace membership is required.");
    }
    return membership;
  }

  private requireProject(
    context: ReadContext,
    workspaceId: string,
    projectId: string,
    mutable = false,
  ) {
    const project = this.dependencies.projects.findProjectById(context, projectId);
    if (
      !project ||
      project.workspaceId !== workspaceId ||
      project.deletedAt !== undefined ||
      (mutable && project.archivedAt !== undefined)
    ) {
      throw new TaskProjectUnavailableError("The project is unavailable.");
    }
    return project;
  }

  private activeStatuses(context: ReadContext, workspaceId: string, projectId: string) {
    return this.dependencies.projects
      .listStatuses(context, workspaceId)
      .filter((status) => status.projectId === projectId && status.archivedAt === undefined);
  }

  private requireStatus(statuses: readonly ProjectStatus[], statusId: string) {
    const status = statuses.find((item) => item.id === statusId);
    if (!status) throw new TaskStatusInvalidError("The task status is unavailable.");
    return status;
  }

  private requireTask(
    context: ReadContext,
    scope: Readonly<{ projectId: string; workspaceId: string }>,
    taskId: string,
    includeArchived = false,
  ) {
    const task = this.dependencies.tasks.findTaskById(context, taskId);
    if (
      !task ||
      task.workspaceId !== scope.workspaceId ||
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

  private toView(context: ReadContext, task: Task, project: Project): TaskView {
    return Object.freeze({
      ...task,
      assigneeUserIds: this.dependencies.tasks.listAssigneeUserIds(context, task.id),
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
      workspaceId: input.workspaceId,
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
        workspaceId: input.workspaceId,
      },
      topic: operation,
    });
  }
}

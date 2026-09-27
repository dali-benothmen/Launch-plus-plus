import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PluginSourceManifest, PreviewPermission } from "@launchpp/plugin-protocol";

export interface DevProject {
  readonly access: "organization" | "restricted";
  readonly createdByUserId: string;
  readonly description: string;
  readonly favorite: boolean;
  readonly id: string;
  readonly key: string;
  readonly lastOpenedAt: number;
  readonly name: string;
  readonly organizationId: string;
  readonly position: number;
  readonly revision: number;
  readonly slug: string;
  readonly updatedAt: number;
}

export interface DevTask {
  readonly assigneeUserIds: readonly string[];
  readonly attachmentCount: number;
  readonly commentCount: number;
  readonly createdAt: number;
  readonly createdByUserId: string;
  readonly description: string;
  readonly dueDate?: string;
  readonly id: string;
  readonly labels: readonly [];
  readonly number: number;
  readonly organizationId: string;
  readonly position: number;
  readonly priority: "high" | "low" | "medium";
  readonly projectId: string;
  readonly reference: string;
  readonly revision: number;
  readonly statusId: string;
  readonly title: string;
  readonly updatedAt: number;
  readonly updatedByUserId: string;
}

export interface DevComment {
  readonly authorUserId: string;
  readonly body: string;
  readonly createdAt: number;
  readonly id: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly reactions: readonly [];
  readonly revision: number;
  readonly taskId: string;
  readonly updatedAt: number;
}

export interface DisposableDevState {
  readonly actor: Readonly<{ id: string; name: string }>;
  comments: DevComment[];
  readonly organization: Readonly<{ id: string; name: string }>;
  readonly pluginStorage: Record<string, unknown>;
  projects: DevProject[];
  readonly schemaVersion: 1;
  tasks: DevTask[];
}

interface CapabilityInput {
  readonly [key: string]: unknown;
  readonly assigneeUserIds?: unknown;
  readonly body?: unknown;
  readonly command?: unknown;
  readonly description?: unknown;
  readonly dueDate?: unknown;
  readonly expectedRevision?: unknown;
  readonly input?: unknown;
  readonly name?: unknown;
  readonly priority?: unknown;
  readonly projectId?: unknown;
  readonly statusId?: unknown;
  readonly taskId?: unknown;
  readonly title?: unknown;
}

export class DevCapabilityError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly retryable: boolean;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "DevCapabilityError";
    this.code = code;
    this.details = details;
    this.retryable = false;
  }
}

const capabilityPermissions: Readonly<Record<string, PreviewPermission | undefined>> = {
  "comments.create": "comments:write",
  "comments.list": "comments:read",
  "commands.invoke": undefined,
  "navigation.back": undefined,
  "navigation.open": undefined,
  "projects.create": "projects:write",
  "projects.list": "projects:read",
  "projects.update": "projects:write",
  "tasks.create": "tasks:write",
  "tasks.get": "tasks:read",
  "tasks.list": "tasks:read",
  "tasks.update": "tasks:write",
};

function record(input: unknown): CapabilityInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new DevCapabilityError("INVALID_REQUEST", "Capability input must be an object.");
  }
  return input as CapabilityInput;
}

function requiredString(input: CapabilityInput, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DevCapabilityError("INVALID_REQUEST", `'${key}' must be a non-empty string.`);
  }
  return value;
}

function nextId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createFixtureState(): DisposableDevState {
  const now = Date.now();
  const organizationId = "dev-organization";
  const actorId = "dev-user";
  const project: DevProject = {
    access: "organization",
    createdByUserId: actorId,
    description: "Disposable project fixtures for plugin development.",
    favorite: true,
    id: "dev-project",
    key: "DEV",
    lastOpenedAt: now,
    name: "Plugin development",
    organizationId,
    position: 0,
    revision: 1,
    slug: "plugin-development",
    updatedAt: now,
  };
  const tasks: DevTask[] = [
    {
      assigneeUserIds: [actorId],
      attachmentCount: 1,
      commentCount: 1,
      createdAt: now,
      createdByUserId: actorId,
      description: "Use this fixture to exercise plugin reads and mutations.",
      dueDate: new Date(now + 86_400_000).toISOString().slice(0, 10),
      id: "dev-task-1",
      labels: [],
      number: 1,
      organizationId,
      position: 0,
      priority: "medium",
      projectId: project.id,
      reference: "DEV-1",
      revision: 1,
      statusId: "todo",
      title: "Explore the Launch++ plugin SDK",
      updatedAt: now,
      updatedByUserId: actorId,
    },
    {
      assigneeUserIds: [],
      attachmentCount: 0,
      commentCount: 0,
      createdAt: now,
      createdByUserId: actorId,
      description: "Changes stay inside this disposable profile.",
      id: "dev-task-2",
      labels: [],
      number: 2,
      organizationId,
      position: 1,
      priority: "low",
      projectId: project.id,
      reference: "DEV-2",
      revision: 1,
      statusId: "in-progress",
      title: "Verify development isolation",
      updatedAt: now,
      updatedByUserId: actorId,
    },
  ];
  return {
    actor: { id: actorId, name: "Plugin Developer" },
    comments: [
      {
        authorUserId: actorId,
        body: "This comment belongs to the disposable development profile.",
        createdAt: now,
        id: "dev-comment-1",
        organizationId,
        projectId: project.id,
        reactions: [],
        revision: 1,
        taskId: tasks[0]?.id ?? "dev-task-1",
        updatedAt: now,
      },
    ],
    organization: { id: organizationId, name: "Launch++ Plugin Lab" },
    pluginStorage: {},
    projects: [project],
    schemaVersion: 1,
    tasks,
  };
}

export async function readDevState(statePath: string): Promise<DisposableDevState | undefined> {
  try {
    const value = JSON.parse(await readFile(statePath, "utf8")) as Partial<DisposableDevState>;
    if (
      value.schemaVersion !== 1 ||
      !Array.isArray(value.projects) ||
      !Array.isArray(value.tasks) ||
      !Array.isArray(value.comments)
    ) {
      return undefined;
    }
    return value as DisposableDevState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeDevState(statePath: string, state: DisposableDevState): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function resetDevState(statePath: string): Promise<DisposableDevState> {
  const state = createFixtureState();
  await writeDevState(statePath, state);
  return state;
}

function assertPermission(manifest: PluginSourceManifest, capability: string): void {
  if (!(capability in capabilityPermissions)) {
    throw new DevCapabilityError(
      "CAPABILITY_NOT_FOUND",
      `Capability '${capability}' is not available in the preview host.`,
    );
  }
  const permission = capabilityPermissions[capability];
  if (permission !== undefined && !manifest.permissions.includes(permission)) {
    throw new DevCapabilityError(
      "FORBIDDEN",
      `Capability '${capability}' requires '${permission}'.`,
    );
  }
}

export async function invokeDevCapability(
  manifest: PluginSourceManifest,
  statePath: string,
  state: DisposableDevState,
  capability: string,
  rawInput: unknown,
): Promise<unknown> {
  assertPermission(manifest, capability);
  const input = record(rawInput);
  const now = Date.now();

  switch (capability) {
    case "projects.list":
      return state.projects;
    case "projects.create": {
      const name = requiredString(input, "name");
      const id = nextId("project");
      const project: DevProject = {
        access: "organization",
        createdByUserId: state.actor.id,
        description: typeof input.description === "string" ? input.description : "",
        favorite: false,
        id,
        key: `DEV${state.projects.length + 1}`,
        lastOpenedAt: now,
        name,
        organizationId: state.organization.id,
        position: state.projects.length,
        revision: 1,
        slug: name
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, "-")
          .replaceAll(/^-+|-+$/g, ""),
        updatedAt: now,
      };
      state.projects.push(project);
      await writeDevState(statePath, state);
      return project;
    }
    case "projects.update": {
      const projectId = requiredString(input, "projectId");
      const index = state.projects.findIndex(({ id }) => id === projectId);
      const current = state.projects[index];
      if (index < 0 || current === undefined) {
        throw new DevCapabilityError("NOT_FOUND", `Project '${projectId}' was not found.`);
      }
      const updated: DevProject = {
        ...current,
        ...(typeof input.description === "string" ? { description: input.description } : {}),
        ...(typeof input.name === "string" ? { name: input.name } : {}),
        revision: current.revision + 1,
        updatedAt: now,
      };
      state.projects[index] = updated;
      await writeDevState(statePath, state);
      return updated;
    }
    case "tasks.list":
      return state.tasks;
    case "tasks.get": {
      const taskId = requiredString(input, "taskId");
      const task = state.tasks.find(({ id }) => id === taskId);
      if (task === undefined) {
        throw new DevCapabilityError("NOT_FOUND", `Task '${taskId}' was not found.`);
      }
      return task;
    }
    case "tasks.create": {
      const title = requiredString(input, "title");
      const project = state.projects[0];
      if (project === undefined)
        throw new DevCapabilityError("NOT_FOUND", "No fixture project exists.");
      const number = state.tasks.length + 1;
      const task: DevTask = {
        assigneeUserIds: Array.isArray(input.assigneeUserIds)
          ? input.assigneeUserIds.filter((value): value is string => typeof value === "string")
          : [],
        attachmentCount: 0,
        commentCount: 0,
        createdAt: now,
        createdByUserId: state.actor.id,
        description: typeof input.description === "string" ? input.description : "",
        ...(typeof input.dueDate === "string" ? { dueDate: input.dueDate } : {}),
        id: nextId("task"),
        labels: [],
        number,
        organizationId: state.organization.id,
        position: state.tasks.length,
        priority:
          input.priority === "high" || input.priority === "low" || input.priority === "medium"
            ? input.priority
            : "medium",
        projectId: project.id,
        reference: `${project.key}-${number}`,
        revision: 1,
        statusId: typeof input.statusId === "string" ? input.statusId : "todo",
        title,
        updatedAt: now,
        updatedByUserId: state.actor.id,
      };
      state.tasks.push(task);
      await writeDevState(statePath, state);
      return task;
    }
    case "tasks.update": {
      const taskId = requiredString(input, "taskId");
      const index = state.tasks.findIndex(({ id }) => id === taskId);
      const current = state.tasks[index];
      if (index < 0 || current === undefined) {
        throw new DevCapabilityError("NOT_FOUND", `Task '${taskId}' was not found.`);
      }
      if (input.expectedRevision !== current.revision) {
        throw new DevCapabilityError("CONFLICT", "The fixture task revision has changed.", {
          currentRevision: current.revision,
        });
      }
      const { dueDate: _dueDate, ...withoutDueDate } = current;
      const updated: DevTask = {
        ...(input.dueDate === null ? withoutDueDate : current),
        ...(typeof input.description === "string" ? { description: input.description } : {}),
        ...(typeof input.dueDate === "string" ? { dueDate: input.dueDate } : {}),
        ...(input.priority === "high" || input.priority === "low" || input.priority === "medium"
          ? { priority: input.priority }
          : {}),
        ...(typeof input.title === "string" ? { title: input.title } : {}),
        revision: current.revision + 1,
        updatedAt: now,
        updatedByUserId: state.actor.id,
      };
      state.tasks[index] = updated;
      await writeDevState(statePath, state);
      return updated;
    }
    case "comments.list": {
      const taskId = requiredString(input, "taskId");
      return state.comments.filter((comment) => comment.taskId === taskId);
    }
    case "comments.create": {
      const taskId = requiredString(input, "taskId");
      const body = requiredString(input, "body");
      const taskIndex = state.tasks.findIndex(({ id }) => id === taskId);
      const task = state.tasks[taskIndex];
      if (taskIndex < 0 || task === undefined) {
        throw new DevCapabilityError("NOT_FOUND", `Task '${taskId}' was not found.`);
      }
      const comment: DevComment = {
        authorUserId: state.actor.id,
        body,
        createdAt: now,
        id: nextId("comment"),
        organizationId: state.organization.id,
        projectId: task.projectId,
        reactions: [],
        revision: 1,
        taskId,
        updatedAt: now,
      };
      state.comments.push(comment);
      state.tasks[taskIndex] = { ...task, commentCount: task.commentCount + 1 };
      await writeDevState(statePath, state);
      return comment;
    }
    case "navigation.back":
    case "navigation.open":
      return null;
    case "commands.invoke":
      return { command: input.command ?? null, input: input.input ?? null };
    default:
      throw new DevCapabilityError(
        "CAPABILITY_NOT_FOUND",
        `Capability '${capability}' is not available.`,
      );
  }
}

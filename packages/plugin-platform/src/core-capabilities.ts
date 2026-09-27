import Type from "typebox";

import type { CapabilityDefinition, CapabilityExecutionContext } from "./capability-broker.js";

const StrictObject = <const Properties extends Type.TProperties>(properties: Properties) =>
  Type.Object(properties, { additionalProperties: false });

const EmptyInputSchema = StrictObject({});
const IdentifierSchema = Type.String({ maxLength: 128, minLength: 1 });
const DateSchema = Type.String({
  maxLength: 10,
  minLength: 10,
  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
});
const ResourceSchema = Type.Object({ id: IdentifierSchema }, { additionalProperties: true });
const ResourceListSchema = Type.Array(ResourceSchema, { maxItems: 10_000 });

export const CORE_PLUGIN_CAPABILITIES = {
  commentsCreate: "comments.create",
  commentsList: "comments.list",
  contextGet: "context.get",
  projectsCreate: "projects.create",
  projectsList: "projects.list",
  projectsUpdate: "projects.update",
  tasksCreate: "tasks.create",
  tasksGet: "tasks.get",
  tasksList: "tasks.list",
  tasksUpdate: "tasks.update",
} as const;

export const ProjectCreateCapabilityInputSchema = StrictObject({
  description: Type.Optional(Type.String({ maxLength: 20_000 })),
  folderId: Type.Optional(IdentifierSchema),
  name: Type.String({ maxLength: 120, minLength: 1 }),
});

export const ProjectUpdateCapabilityInputSchema = StrictObject({
  description: Type.Optional(Type.String({ maxLength: 20_000 })),
  folderId: Type.Optional(Type.Union([IdentifierSchema, Type.Null()])),
  name: Type.Optional(Type.String({ maxLength: 120, minLength: 1 })),
});

export const TaskGetCapabilityInputSchema = StrictObject({
  taskId: IdentifierSchema,
});

export const TaskCreateCapabilityInputSchema = StrictObject({
  assigneeUserIds: Type.Optional(
    Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }),
  ),
  description: Type.Optional(Type.String({ maxLength: 100_000 })),
  dueDate: Type.Optional(DateSchema),
  labelIds: Type.Optional(Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true })),
  parentTaskId: Type.Optional(IdentifierSchema),
  priority: Type.Optional(
    Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")]),
  ),
  statusId: Type.Optional(IdentifierSchema),
  teamId: Type.Optional(IdentifierSchema),
  title: Type.String({ maxLength: 500, minLength: 1 }),
});

export const TaskUpdateCapabilityInputSchema = StrictObject({
  description: Type.Optional(Type.String({ maxLength: 100_000 })),
  dueDate: Type.Optional(Type.Union([DateSchema, Type.Null()])),
  expectedRevision: Type.Integer({ minimum: 1 }),
  priority: Type.Optional(
    Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")]),
  ),
  taskId: IdentifierSchema,
  teamId: Type.Optional(Type.Union([IdentifierSchema, Type.Null()])),
  title: Type.Optional(Type.String({ maxLength: 500, minLength: 1 })),
});

export const CommentCreateCapabilityInputSchema = StrictObject({
  body: Type.String({ maxLength: 20_000, minLength: 1 }),
  taskId: IdentifierSchema,
});

export type ProjectCreateCapabilityInput = Type.Static<typeof ProjectCreateCapabilityInputSchema>;
export type ProjectUpdateCapabilityInput = Type.Static<typeof ProjectUpdateCapabilityInputSchema>;
export type TaskGetCapabilityInput = Type.Static<typeof TaskGetCapabilityInputSchema>;
export type TaskCreateCapabilityInput = Type.Static<typeof TaskCreateCapabilityInputSchema>;
export type TaskUpdateCapabilityInput = Type.Static<typeof TaskUpdateCapabilityInputSchema>;
export type CommentCreateCapabilityInput = Type.Static<typeof CommentCreateCapabilityInputSchema>;

export interface CoreCapabilityServices {
  readonly createComment: (
    context: CapabilityExecutionContext,
    input: CommentCreateCapabilityInput,
  ) => unknown | Promise<unknown>;
  readonly createProject: (
    context: CapabilityExecutionContext,
    input: ProjectCreateCapabilityInput,
  ) => unknown | Promise<unknown>;
  readonly createTask: (
    context: CapabilityExecutionContext,
    input: TaskCreateCapabilityInput,
  ) => unknown | Promise<unknown>;
  readonly getTask: (
    context: CapabilityExecutionContext,
    input: TaskGetCapabilityInput,
  ) => unknown | Promise<unknown>;
  readonly listComments: (
    context: CapabilityExecutionContext,
    input: TaskGetCapabilityInput,
  ) => unknown | Promise<unknown>;
  readonly listProjects: (context: CapabilityExecutionContext) => unknown | Promise<unknown>;
  readonly listTasks: (context: CapabilityExecutionContext) => unknown | Promise<unknown>;
  readonly updateProject: (
    context: CapabilityExecutionContext,
    input: ProjectUpdateCapabilityInput,
  ) => unknown | Promise<unknown>;
  readonly updateTask: (
    context: CapabilityExecutionContext,
    input: TaskUpdateCapabilityInput,
  ) => unknown | Promise<unknown>;
}

export function createCoreCapabilityDefinitions(
  services: CoreCapabilityServices,
): readonly CapabilityDefinition[] {
  return [
    {
      execute: (context) => ({
        actorId: context.actorId,
        grantedPermissions: context.grantedPermissions,
        organizationId: context.organizationId,
        packageId: context.packageId,
        pluginId: context.pluginId,
        projectId: context.projectId ?? null,
      }),
      input: EmptyInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.contextGet,
      output: StrictObject({
        actorId: IdentifierSchema,
        grantedPermissions: Type.Array(Type.String({ maxLength: 120, minLength: 1 }), {
          maxItems: 100,
          uniqueItems: true,
        }),
        organizationId: IdentifierSchema,
        packageId: IdentifierSchema,
        pluginId: Type.String({ maxLength: 120, minLength: 3 }),
        projectId: Type.Union([IdentifierSchema, Type.Null()]),
      }),
      scope: "organization",
    },
    {
      execute: (context) => services.listProjects(context),
      input: EmptyInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.projectsList,
      output: ResourceListSchema,
      permission: "projects:read",
      scope: "organization",
    },
    {
      execute: (context, input) =>
        services.createProject(context, input as ProjectCreateCapabilityInput),
      input: ProjectCreateCapabilityInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.projectsCreate,
      output: ResourceSchema,
      permission: "projects:write",
      scope: "organization",
    },
    {
      execute: (context, input) =>
        services.updateProject(context, input as ProjectUpdateCapabilityInput),
      input: ProjectUpdateCapabilityInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.projectsUpdate,
      output: ResourceSchema,
      permission: "projects:write",
      scope: "project",
    },
    {
      execute: (context) => services.listTasks(context),
      input: EmptyInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.tasksList,
      output: ResourceListSchema,
      permission: "tasks:read",
      scope: "project",
    },
    {
      execute: (context, input) => services.getTask(context, input as TaskGetCapabilityInput),
      input: TaskGetCapabilityInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.tasksGet,
      output: ResourceSchema,
      permission: "tasks:read",
      scope: "project",
    },
    {
      execute: (context, input) => services.createTask(context, input as TaskCreateCapabilityInput),
      input: TaskCreateCapabilityInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.tasksCreate,
      output: ResourceSchema,
      permission: "tasks:write",
      scope: "project",
    },
    {
      execute: (context, input) => services.updateTask(context, input as TaskUpdateCapabilityInput),
      input: TaskUpdateCapabilityInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.tasksUpdate,
      output: ResourceSchema,
      permission: "tasks:write",
      scope: "project",
    },
    {
      execute: (context, input) => services.listComments(context, input as TaskGetCapabilityInput),
      input: TaskGetCapabilityInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.commentsList,
      output: ResourceListSchema,
      permission: "comments:read",
      scope: "project",
    },
    {
      execute: (context, input) =>
        services.createComment(context, input as CommentCreateCapabilityInput),
      input: CommentCreateCapabilityInputSchema,
      name: CORE_PLUGIN_CAPABILITIES.commentsCreate,
      output: ResourceSchema,
      permission: "comments:write",
      scope: "project",
    },
  ];
}

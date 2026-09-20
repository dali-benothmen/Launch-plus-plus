import Type from "typebox";

export const API_VERSION = "v1" as const;

const StrictObject = <const Properties extends Type.TProperties>(
  properties: Properties,
  options: Omit<Type.TObjectOptions, "additionalProperties"> = {},
) => Type.Object(properties, { ...options, additionalProperties: false });

const IdentifierSchema = Type.String({ maxLength: 100, minLength: 1 });
const CursorSchema = Type.String({ maxLength: 2_048, minLength: 1 });
const RevisionSchema = Type.Integer({ minimum: 1 });
const TimestampSchema = Type.Integer({ minimum: 0 });
const DateSchema = Type.String({ pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" });

export const ProblemDetailsSchema = StrictObject(
  {
    code: Type.String({ maxLength: 100, minLength: 1 }),
    correlationId: Type.String({ maxLength: 128, minLength: 1 }),
    detail: Type.String({ maxLength: 2_000, minLength: 1 }),
    extensions: Type.Optional(
      Type.Record(Type.String({ maxLength: 100, minLength: 1 }), Type.Unknown()),
    ),
    status: Type.Integer({ maximum: 599, minimum: 400 }),
    title: Type.String({ maxLength: 200, minLength: 1 }),
    type: Type.String({ format: "uri", maxLength: 500 }),
  },
  { $id: "LaunchppProblemDetailsV1", title: "Problem details" },
);

export type ProblemDetails = Type.Static<typeof ProblemDetailsSchema>;

export const CursorPageQuerySchema = StrictObject(
  {
    cursor: Type.Optional(CursorSchema),
    limit: Type.Optional(Type.Integer({ maximum: 100, minimum: 1 })),
  },
  { $id: "LaunchppCursorPageQueryV1" },
);

export type CursorPageQuery = Type.Static<typeof CursorPageQuerySchema>;

export const IdempotencyHeadersSchema = Type.Object(
  {
    "idempotency-key": Type.Optional(Type.String({ maxLength: 200, minLength: 8 })),
  },
  { $id: "LaunchppIdempotencyHeadersV1", additionalProperties: true },
);

export type IdempotencyHeaders = Type.Static<typeof IdempotencyHeadersSchema>;

export const WorkspaceSummarySchema = StrictObject(
  {
    id: IdentifierSchema,
    name: Type.String({ maxLength: 80, minLength: 1 }),
    revision: RevisionSchema,
    slug: Type.String({ maxLength: 120, minLength: 1 }),
  },
  { $id: "LaunchppWorkspaceSummaryV1" },
);

export type WorkspaceSummary = Type.Static<typeof WorkspaceSummarySchema>;

export const WorkspaceContextSchema = StrictObject(
  {
    currentWorkspaceId: Type.Optional(IdentifierSchema),
    nextCursor: Type.Optional(CursorSchema),
    workspaces: Type.Array(
      Type.Unsafe<Type.Static<typeof WorkspaceSummarySchema>>(
        Type.Ref("LaunchppWorkspaceSummaryV1"),
      ),
      { maxItems: 100 },
    ),
  },
  { $id: "LaunchppWorkspaceContextV1" },
);

export type WorkspaceContext = Type.Static<typeof WorkspaceContextSchema>;

export const CreateWorkspaceInputSchema = StrictObject(
  { name: Type.String({ maxLength: 80, minLength: 1, pattern: "\\S" }) },
  { $id: "LaunchppCreateWorkspaceInputV1" },
);
export type CreateWorkspaceInput = Type.Static<typeof CreateWorkspaceInputSchema>;

export const RenameWorkspaceInputSchema = StrictObject(
  { name: Type.String({ maxLength: 80, minLength: 1, pattern: "\\S" }) },
  { $id: "LaunchppRenameWorkspaceInputV1" },
);
export type RenameWorkspaceInput = Type.Static<typeof RenameWorkspaceInputSchema>;

export const SelectWorkspaceInputSchema = StrictObject(
  { workspaceId: IdentifierSchema },
  { $id: "LaunchppSelectWorkspaceInputV1" },
);
export type SelectWorkspaceInput = Type.Static<typeof SelectWorkspaceInputSchema>;

export const ProjectFolderSummarySchema = StrictObject(
  {
    id: IdentifierSchema,
    name: Type.String({ maxLength: 80, minLength: 1 }),
    position: Type.Integer({ minimum: 0 }),
    revision: RevisionSchema,
    workspaceId: IdentifierSchema,
  },
  { $id: "LaunchppProjectFolderSummaryV1" },
);
export type ProjectFolderSummary = Type.Static<typeof ProjectFolderSummarySchema>;

export const ProjectSummarySchema = StrictObject(
  {
    access: Type.Union([Type.Literal("restricted"), Type.Literal("workspace")]),
    archivedAt: Type.Optional(TimestampSchema),
    description: Type.String({ maxLength: 20_000 }),
    favorite: Type.Boolean(),
    folderId: Type.Optional(IdentifierSchema),
    id: IdentifierSchema,
    key: Type.String({ maxLength: 20, minLength: 1 }),
    lastOpenedAt: Type.Optional(TimestampSchema),
    name: Type.String({ maxLength: 120, minLength: 1 }),
    position: Type.Integer({ minimum: 0 }),
    revision: RevisionSchema,
    slug: Type.String({ maxLength: 160, minLength: 1 }),
    workspaceId: IdentifierSchema,
  },
  { $id: "LaunchppProjectSummaryV1" },
);
export type ProjectSummary = Type.Static<typeof ProjectSummarySchema>;

export const ProjectStatusSummarySchema = StrictObject(
  {
    category: Type.Union([Type.Literal("active"), Type.Literal("backlog"), Type.Literal("done")]),
    color: Type.String({ maxLength: 30, minLength: 1 }),
    id: IdentifierSchema,
    name: Type.String({ maxLength: 80, minLength: 1 }),
    position: Type.Integer({ minimum: 0 }),
    projectId: IdentifierSchema,
    revision: RevisionSchema,
  },
  { $id: "LaunchppProjectStatusSummaryV1" },
);
export type ProjectStatusSummary = Type.Static<typeof ProjectStatusSummarySchema>;

export const ProjectCatalogSchema = StrictObject(
  {
    folders: Type.Array(
      Type.Unsafe<Type.Static<typeof ProjectFolderSummarySchema>>(
        Type.Ref("LaunchppProjectFolderSummaryV1"),
      ),
      { maxItems: 100 },
    ),
    nextCursor: Type.Optional(CursorSchema),
    projects: Type.Array(
      Type.Unsafe<Type.Static<typeof ProjectSummarySchema>>(Type.Ref("LaunchppProjectSummaryV1")),
      { maxItems: 100 },
    ),
    statuses: Type.Array(
      Type.Unsafe<Type.Static<typeof ProjectStatusSummarySchema>>(
        Type.Ref("LaunchppProjectStatusSummaryV1"),
      ),
      { maxItems: 1_000 },
    ),
  },
  { $id: "LaunchppProjectCatalogV1" },
);
export type ProjectCatalog = Type.Static<typeof ProjectCatalogSchema>;

export const ProjectFolderInputSchema = StrictObject(
  { name: Type.String({ maxLength: 80, minLength: 1, pattern: "\\S" }) },
  { $id: "LaunchppProjectFolderInputV1" },
);
export type ProjectFolderInput = Type.Static<typeof ProjectFolderInputSchema>;

export const FolderOrderInputSchema = StrictObject(
  { orderedFolderIds: Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }) },
  { $id: "LaunchppFolderOrderInputV1" },
);
export type FolderOrderInput = Type.Static<typeof FolderOrderInputSchema>;

export const ProjectOrderInputSchema = StrictObject(
  {
    folderId: Type.Optional(IdentifierSchema),
    orderedProjectIds: Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }),
  },
  { $id: "LaunchppProjectOrderInputV1" },
);
export type ProjectOrderInput = Type.Static<typeof ProjectOrderInputSchema>;

export const FavoriteProjectInputSchema = StrictObject(
  { favorite: Type.Boolean() },
  { $id: "LaunchppFavoriteProjectInputV1" },
);
export type FavoriteProjectInput = Type.Static<typeof FavoriteProjectInputSchema>;

export const CreateProjectInputSchema = StrictObject(
  {
    description: Type.Optional(Type.String({ maxLength: 20_000 })),
    folderId: Type.Optional(IdentifierSchema),
    name: Type.String({ maxLength: 120, minLength: 1, pattern: "\\S" }),
  },
  { $id: "LaunchppCreateProjectInputV1" },
);
export type CreateProjectInput = Type.Static<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = StrictObject(
  {
    description: Type.Optional(Type.String({ maxLength: 20_000 })),
    folderId: Type.Optional(Type.Union([IdentifierSchema, Type.Null()])),
    name: Type.Optional(Type.String({ maxLength: 120, minLength: 1, pattern: "\\S" })),
  },
  { $id: "LaunchppUpdateProjectInputV1", minProperties: 1 },
);
export type UpdateProjectInput = Type.Static<typeof UpdateProjectInputSchema>;

export const LabelSummarySchema = StrictObject(
  {
    archivedAt: Type.Optional(TimestampSchema),
    color: Type.String({ maxLength: 7, minLength: 7, pattern: "^#[0-9A-Fa-f]{6}$" }),
    createdAt: TimestampSchema,
    id: IdentifierSchema,
    name: Type.String({ maxLength: 80, minLength: 1 }),
    projectId: Type.Optional(IdentifierSchema),
    revision: RevisionSchema,
    updatedAt: TimestampSchema,
    workspaceId: IdentifierSchema,
  },
  { $id: "LaunchppLabelSummaryV1" },
);
export type LabelSummary = Type.Static<typeof LabelSummarySchema>;

export const TaskViewSchema = StrictObject(
  {
    archivedAt: Type.Optional(TimestampSchema),
    assigneeUserIds: Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }),
    createdAt: TimestampSchema,
    createdByUserId: IdentifierSchema,
    description: Type.String({ maxLength: 100_000 }),
    dueDate: Type.Optional(DateSchema),
    id: IdentifierSchema,
    labels: Type.Array(
      Type.Unsafe<Type.Static<typeof LabelSummarySchema>>(Type.Ref("LaunchppLabelSummaryV1")),
      { maxItems: 100 },
    ),
    number: Type.Integer({ minimum: 1 }),
    parentTaskId: Type.Optional(IdentifierSchema),
    position: Type.Integer({ minimum: 0 }),
    projectId: IdentifierSchema,
    reference: Type.String({ maxLength: 128, minLength: 1 }),
    revision: RevisionSchema,
    statusId: IdentifierSchema,
    title: Type.String({ maxLength: 500, minLength: 1 }),
    updatedAt: TimestampSchema,
    updatedByUserId: IdentifierSchema,
    workspaceId: IdentifierSchema,
  },
  { $id: "LaunchppTaskViewV1" },
);
export type TaskView = Type.Static<typeof TaskViewSchema>;

export const TaskCommentSchema = StrictObject(
  {
    authorUserId: IdentifierSchema,
    body: Type.String({ maxLength: 20_000, minLength: 1 }),
    createdAt: TimestampSchema,
    id: IdentifierSchema,
    projectId: IdentifierSchema,
    revision: RevisionSchema,
    taskId: IdentifierSchema,
    updatedAt: TimestampSchema,
    workspaceId: IdentifierSchema,
  },
  { $id: "LaunchppTaskCommentV1" },
);
export type TaskComment = Type.Static<typeof TaskCommentSchema>;

export const TaskActivitySchema = StrictObject(
  {
    actorUserId: Type.Optional(IdentifierSchema),
    id: IdentifierSchema,
    metadata: Type.Record(Type.String(), Type.Unknown()),
    occurredAt: TimestampSchema,
    operation: Type.String({ maxLength: 100, minLength: 1 }),
  },
  { $id: "LaunchppTaskActivityV1" },
);
export type TaskActivity = Type.Static<typeof TaskActivitySchema>;

export const TaskDetailSchema = StrictObject(
  {
    activity: Type.Array(
      Type.Unsafe<Type.Static<typeof TaskActivitySchema>>(Type.Ref("LaunchppTaskActivityV1")),
      { maxItems: 100 },
    ),
    availableLabels: Type.Array(
      Type.Unsafe<Type.Static<typeof LabelSummarySchema>>(Type.Ref("LaunchppLabelSummaryV1")),
      { maxItems: 100 },
    ),
    comments: Type.Array(
      Type.Unsafe<Type.Static<typeof TaskCommentSchema>>(Type.Ref("LaunchppTaskCommentV1")),
      { maxItems: 1_000 },
    ),
    subtasks: Type.Array(
      Type.Unsafe<Type.Static<typeof TaskViewSchema>>(Type.Ref("LaunchppTaskViewV1")),
      { maxItems: 1_000 },
    ),
    task: Type.Unsafe<Type.Static<typeof TaskViewSchema>>(Type.Ref("LaunchppTaskViewV1")),
  },
  { $id: "LaunchppTaskDetailV1" },
);
export type TaskDetail = Type.Static<typeof TaskDetailSchema>;

export const TaskPageSchema = StrictObject(
  {
    items: Type.Array(
      Type.Unsafe<Type.Static<typeof TaskViewSchema>>(Type.Ref("LaunchppTaskViewV1")),
      { maxItems: 100 },
    ),
    labels: Type.Array(
      Type.Unsafe<Type.Static<typeof LabelSummarySchema>>(Type.Ref("LaunchppLabelSummaryV1")),
      { maxItems: 100 },
    ),
    nextCursor: Type.Optional(CursorSchema),
  },
  { $id: "LaunchppTaskPageV1" },
);
export type TaskPage = Type.Static<typeof TaskPageSchema>;

export const CreateTaskInputSchema = StrictObject(
  {
    description: Type.Optional(Type.String({ maxLength: 100_000 })),
    dueDate: Type.Optional(DateSchema),
    parentTaskId: Type.Optional(IdentifierSchema),
    statusId: Type.Optional(IdentifierSchema),
    title: Type.String({ maxLength: 500, minLength: 1, pattern: "\\S" }),
  },
  { $id: "LaunchppCreateTaskInputV1" },
);
export type CreateTaskInput = Type.Static<typeof CreateTaskInputSchema>;

export const CreateTaskCommentInputSchema = StrictObject(
  { body: Type.String({ maxLength: 20_000, minLength: 1, pattern: "\\S" }) },
  { $id: "LaunchppCreateTaskCommentInputV1" },
);
export type CreateTaskCommentInput = Type.Static<typeof CreateTaskCommentInputSchema>;

export const UpdateTaskInputSchema = StrictObject(
  {
    description: Type.Optional(Type.String({ maxLength: 100_000 })),
    dueDate: Type.Optional(Type.Union([DateSchema, Type.Null()])),
    expectedRevision: RevisionSchema,
    title: Type.Optional(Type.String({ maxLength: 500, minLength: 1, pattern: "\\S" })),
  },
  { $id: "LaunchppUpdateTaskInputV1", minProperties: 2 },
);
export type UpdateTaskInput = Type.Static<typeof UpdateTaskInputSchema>;

export const MoveTaskInputSchema = StrictObject(
  {
    beforeTaskId: Type.Optional(IdentifierSchema),
    expectedRevision: RevisionSchema,
    statusId: IdentifierSchema,
  },
  { $id: "LaunchppMoveTaskInputV1" },
);
export type MoveTaskInput = Type.Static<typeof MoveTaskInputSchema>;

export const ReplaceTaskAssigneesInputSchema = StrictObject(
  {
    expectedRevision: RevisionSchema,
    userIds: Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }),
  },
  { $id: "LaunchppReplaceTaskAssigneesInputV1" },
);
export type ReplaceTaskAssigneesInput = Type.Static<typeof ReplaceTaskAssigneesInputSchema>;

export const ReplaceTaskLabelsInputSchema = StrictObject(
  {
    expectedRevision: RevisionSchema,
    labelIds: Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }),
  },
  { $id: "LaunchppReplaceTaskLabelsInputV1" },
);
export type ReplaceTaskLabelsInput = Type.Static<typeof ReplaceTaskLabelsInputSchema>;

export const ArchiveTaskInputSchema = StrictObject(
  { expectedRevision: RevisionSchema },
  { $id: "LaunchppArchiveTaskInputV1" },
);
export type ArchiveTaskInput = Type.Static<typeof ArchiveTaskInputSchema>;

export const CreateLabelInputSchema = StrictObject(
  {
    color: Type.String({ maxLength: 7, minLength: 7, pattern: "^#[0-9A-Fa-f]{6}$" }),
    name: Type.String({ maxLength: 80, minLength: 1, pattern: "\\S" }),
    scope: Type.Optional(Type.Union([Type.Literal("project"), Type.Literal("workspace")])),
  },
  { $id: "LaunchppCreateLabelInputV1" },
);
export type CreateLabelInput = Type.Static<typeof CreateLabelInputSchema>;

export const WorkspaceParamsSchema = StrictObject(
  { workspaceId: IdentifierSchema },
  { $id: "LaunchppWorkspaceParamsV1" },
);

export const ProjectParamsSchema = StrictObject(
  { projectId: IdentifierSchema, workspaceId: IdentifierSchema },
  { $id: "LaunchppProjectParamsV1" },
);

export const ProjectFolderParamsSchema = StrictObject(
  { folderId: IdentifierSchema, workspaceId: IdentifierSchema },
  { $id: "LaunchppProjectFolderParamsV1" },
);

export const TaskParamsSchema = StrictObject(
  { projectId: IdentifierSchema, taskId: IdentifierSchema, workspaceId: IdentifierSchema },
  { $id: "LaunchppTaskParamsV1" },
);

export const CORE_API_SCHEMAS = Object.freeze([
  ProblemDetailsSchema,
  CursorPageQuerySchema,
  IdempotencyHeadersSchema,
  WorkspaceSummarySchema,
  WorkspaceContextSchema,
  CreateWorkspaceInputSchema,
  RenameWorkspaceInputSchema,
  SelectWorkspaceInputSchema,
  ProjectFolderSummarySchema,
  ProjectSummarySchema,
  ProjectStatusSummarySchema,
  ProjectCatalogSchema,
  ProjectFolderInputSchema,
  FolderOrderInputSchema,
  ProjectOrderInputSchema,
  FavoriteProjectInputSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  LabelSummarySchema,
  TaskViewSchema,
  TaskCommentSchema,
  TaskActivitySchema,
  TaskDetailSchema,
  TaskPageSchema,
  CreateTaskInputSchema,
  CreateTaskCommentInputSchema,
  UpdateTaskInputSchema,
  MoveTaskInputSchema,
  ReplaceTaskAssigneesInputSchema,
  ReplaceTaskLabelsInputSchema,
  ArchiveTaskInputSchema,
  CreateLabelInputSchema,
  WorkspaceParamsSchema,
  ProjectParamsSchema,
  ProjectFolderParamsSchema,
  TaskParamsSchema,
] as const);

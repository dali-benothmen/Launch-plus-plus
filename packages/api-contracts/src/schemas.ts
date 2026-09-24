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

export const OrganizationSummarySchema = StrictObject(
  {
    id: IdentifierSchema,
    name: Type.String({ maxLength: 80, minLength: 1 }),
    revision: RevisionSchema,
    slug: Type.String({ maxLength: 120, minLength: 1 }),
  },
  { $id: "LaunchppOrganizationSummaryV1" },
);

export type OrganizationSummary = Type.Static<typeof OrganizationSummarySchema>;

export const OrganizationContextSchema = StrictObject(
  {
    currentOrganizationId: Type.Optional(IdentifierSchema),
    nextCursor: Type.Optional(CursorSchema),
    organizations: Type.Array(
      Type.Unsafe<Type.Static<typeof OrganizationSummarySchema>>(
        Type.Ref("LaunchppOrganizationSummaryV1"),
      ),
      { maxItems: 100 },
    ),
  },
  { $id: "LaunchppOrganizationContextV1" },
);

export type OrganizationContext = Type.Static<typeof OrganizationContextSchema>;

export const OrganizationMemberSummarySchema = StrictObject(
  {
    displayName: Type.String({ maxLength: 200, minLength: 1 }),
    role: Type.Union([Type.Literal("admin"), Type.Literal("member"), Type.Literal("owner")]),
    userId: IdentifierSchema,
  },
  { $id: "LaunchppOrganizationMemberSummaryV1" },
);
export type OrganizationMemberSummary = Type.Static<typeof OrganizationMemberSummarySchema>;

export const TeamSummarySchema = StrictObject(
  {
    id: IdentifierSchema,
    name: Type.String({ maxLength: 80, minLength: 1 }),
    revision: RevisionSchema,
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppTeamSummaryV1" },
);
export type TeamSummary = Type.Static<typeof TeamSummarySchema>;

export const TeamInputSchema = StrictObject(
  { name: Type.String({ maxLength: 80, minLength: 1, pattern: "\\S" }) },
  { $id: "LaunchppTeamInputV1" },
);
export type TeamInput = Type.Static<typeof TeamInputSchema>;

export const CreateOrganizationInputSchema = StrictObject(
  { name: Type.String({ maxLength: 80, minLength: 1, pattern: "\\S" }) },
  { $id: "LaunchppCreateOrganizationInputV1" },
);
export type CreateOrganizationInput = Type.Static<typeof CreateOrganizationInputSchema>;

export const RenameOrganizationInputSchema = StrictObject(
  { name: Type.String({ maxLength: 80, minLength: 1, pattern: "\\S" }) },
  { $id: "LaunchppRenameOrganizationInputV1" },
);
export type RenameOrganizationInput = Type.Static<typeof RenameOrganizationInputSchema>;

export const SelectOrganizationInputSchema = StrictObject(
  { organizationId: IdentifierSchema },
  { $id: "LaunchppSelectOrganizationInputV1" },
);
export type SelectOrganizationInput = Type.Static<typeof SelectOrganizationInputSchema>;

export const ProjectFolderSummarySchema = StrictObject(
  {
    id: IdentifierSchema,
    name: Type.String({ maxLength: 80, minLength: 1 }),
    position: Type.Integer({ minimum: 0 }),
    revision: RevisionSchema,
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppProjectFolderSummaryV1" },
);
export type ProjectFolderSummary = Type.Static<typeof ProjectFolderSummarySchema>;

export const ProjectSummarySchema = StrictObject(
  {
    access: Type.Union([Type.Literal("restricted"), Type.Literal("organization")]),
    archivedAt: Type.Optional(TimestampSchema),
    createdByUserId: Type.Optional(IdentifierSchema),
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
    updatedAt: Type.Optional(TimestampSchema),
    organizationId: IdentifierSchema,
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

export const ProjectStatusInputSchema = StrictObject(
  {
    category: Type.Optional(
      Type.Union([Type.Literal("active"), Type.Literal("backlog"), Type.Literal("done")]),
    ),
    color: Type.Optional(Type.String({ maxLength: 7, minLength: 7, pattern: "^#[0-9A-Fa-f]{6}$" })),
    name: Type.String({ maxLength: 80, minLength: 1, pattern: "\\S" }),
  },
  { $id: "LaunchppProjectStatusInputV1" },
);
export type ProjectStatusInput = Type.Static<typeof ProjectStatusInputSchema>;

export const ProjectStatusOrderInputSchema = StrictObject(
  {
    orderedStatusIds: Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }),
  },
  { $id: "LaunchppProjectStatusOrderInputV1" },
);
export type ProjectStatusOrderInput = Type.Static<typeof ProjectStatusOrderInputSchema>;

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
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppLabelSummaryV1" },
);
export type LabelSummary = Type.Static<typeof LabelSummarySchema>;

export const TaskPrioritySchema = Type.Union([
  Type.Literal("low"),
  Type.Literal("medium"),
  Type.Literal("high"),
]);
export type TaskPriority = Type.Static<typeof TaskPrioritySchema>;

export const TaskViewSchema = StrictObject(
  {
    archivedAt: Type.Optional(TimestampSchema),
    assigneeUserIds: Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }),
    attachmentCount: Type.Integer({ maximum: 100, minimum: 0 }),
    commentCount: Type.Integer({ minimum: 0 }),
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
    priority: TaskPrioritySchema,
    projectId: IdentifierSchema,
    reference: Type.String({ maxLength: 128, minLength: 1 }),
    revision: RevisionSchema,
    statusId: IdentifierSchema,
    teamId: Type.Optional(IdentifierSchema),
    title: Type.String({ maxLength: 500, minLength: 1 }),
    updatedAt: TimestampSchema,
    updatedByUserId: IdentifierSchema,
    organizationId: IdentifierSchema,
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
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppTaskCommentV1" },
);
export type TaskComment = Type.Static<typeof TaskCommentSchema>;

export const TaskAttachmentSummarySchema = StrictObject(
  {
    commentId: Type.Optional(IdentifierSchema),
    contentType: Type.String({ maxLength: 127, minLength: 1 }),
    createdAt: TimestampSchema,
    id: IdentifierSchema,
    name: Type.String({ maxLength: 255, minLength: 1 }),
    projectId: IdentifierSchema,
    size: Type.Integer({ maximum: 5_242_880, minimum: 1 }),
    taskId: IdentifierSchema,
    uploadedByUserId: IdentifierSchema,
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppTaskAttachmentSummaryV1" },
);
export type TaskAttachmentSummary = Type.Static<typeof TaskAttachmentSummarySchema>;

export const CreateTaskAttachmentInputSchema = StrictObject(
  {
    commentId: Type.Optional(IdentifierSchema),
    contentBase64: Type.String({ maxLength: 6_990_508, minLength: 4 }),
    contentType: Type.String({ maxLength: 127, minLength: 1 }),
    name: Type.String({ maxLength: 255, minLength: 1, pattern: "\\S" }),
  },
  { $id: "LaunchppCreateTaskAttachmentInputV1" },
);
export type CreateTaskAttachmentInput = Type.Static<typeof CreateTaskAttachmentInputSchema>;

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
    attachments: Type.Array(
      Type.Unsafe<Type.Static<typeof TaskAttachmentSummarySchema>>(
        Type.Ref("LaunchppTaskAttachmentSummaryV1"),
      ),
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
    assigneeUserIds: Type.Optional(
      Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true }),
    ),
    description: Type.Optional(Type.String({ maxLength: 100_000 })),
    dueDate: Type.Optional(DateSchema),
    labelIds: Type.Optional(Type.Array(IdentifierSchema, { maxItems: 100, uniqueItems: true })),
    parentTaskId: Type.Optional(IdentifierSchema),
    priority: Type.Optional(TaskPrioritySchema),
    statusId: Type.Optional(IdentifierSchema),
    teamId: Type.Optional(IdentifierSchema),
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

export const UpdateTaskCommentInputSchema = StrictObject(
  {
    body: Type.String({ maxLength: 20_000, minLength: 1, pattern: "\\S" }),
    expectedRevision: RevisionSchema,
  },
  { $id: "LaunchppUpdateTaskCommentInputV1" },
);
export type UpdateTaskCommentInput = Type.Static<typeof UpdateTaskCommentInputSchema>;

export const DeleteTaskCommentInputSchema = StrictObject(
  { expectedRevision: RevisionSchema },
  { $id: "LaunchppDeleteTaskCommentInputV1" },
);
export type DeleteTaskCommentInput = Type.Static<typeof DeleteTaskCommentInputSchema>;

export const SearchQuerySchema = StrictObject(
  {
    limit: Type.Optional(Type.Integer({ maximum: 50, minimum: 1 })),
    projectId: Type.Optional(IdentifierSchema),
    q: Type.String({ maxLength: 200, minLength: 1, pattern: "\\S" }),
    organizationId: Type.Optional(IdentifierSchema),
  },
  { $id: "LaunchppSearchQueryV1" },
);
export type SearchQuery = Type.Static<typeof SearchQuerySchema>;

export const SearchResultSchema = StrictObject(
  {
    kind: Type.Union([Type.Literal("project"), Type.Literal("task")]),
    projectId: IdentifierSchema,
    resourceId: IdentifierSchema,
    subtitle: Type.String({ maxLength: 500 }),
    title: Type.String({ maxLength: 500, minLength: 1 }),
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppSearchResultV1" },
);
export type SearchResult = Type.Static<typeof SearchResultSchema>;

export const SearchResponseSchema = StrictObject(
  {
    items: Type.Array(
      Type.Unsafe<Type.Static<typeof SearchResultSchema>>(Type.Ref("LaunchppSearchResultV1")),
      { maxItems: 50 },
    ),
  },
  { $id: "LaunchppSearchResponseV1" },
);
export type SearchResponse = Type.Static<typeof SearchResponseSchema>;

export const InvalidationEventSchema = StrictObject(
  {
    occurredAt: TimestampSchema,
    projectId: Type.Optional(IdentifierSchema),
    resourceId: IdentifierSchema,
    resourceType: Type.String({ maxLength: 100, minLength: 1 }),
    sequence: Type.Integer({ minimum: 1 }),
    topic: Type.String({ maxLength: 100, minLength: 1 }),
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppInvalidationEventV1" },
);
export type InvalidationEvent = Type.Static<typeof InvalidationEventSchema>;

export const UpdateTaskInputSchema = StrictObject(
  {
    description: Type.Optional(Type.String({ maxLength: 100_000 })),
    dueDate: Type.Optional(Type.Union([DateSchema, Type.Null()])),
    expectedRevision: RevisionSchema,
    priority: Type.Optional(TaskPrioritySchema),
    title: Type.Optional(Type.String({ maxLength: 500, minLength: 1, pattern: "\\S" })),
    teamId: Type.Optional(Type.Union([IdentifierSchema, Type.Null()])),
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
    scope: Type.Optional(Type.Union([Type.Literal("project"), Type.Literal("organization")])),
  },
  { $id: "LaunchppCreateLabelInputV1" },
);
export type CreateLabelInput = Type.Static<typeof CreateLabelInputSchema>;

export const OrganizationParamsSchema = StrictObject(
  { organizationId: IdentifierSchema },
  { $id: "LaunchppOrganizationParamsV1" },
);

export const ProjectParamsSchema = StrictObject(
  { projectId: IdentifierSchema, organizationId: IdentifierSchema },
  { $id: "LaunchppProjectParamsV1" },
);

export const ProjectStatusParamsSchema = StrictObject(
  {
    organizationId: IdentifierSchema,
    projectId: IdentifierSchema,
    statusId: IdentifierSchema,
  },
  { $id: "LaunchppProjectStatusParamsV1" },
);

export const TaskAttachmentParamsSchema = StrictObject(
  {
    attachmentId: IdentifierSchema,
    projectId: IdentifierSchema,
    taskId: IdentifierSchema,
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppTaskAttachmentParamsV1" },
);

export const ProjectFolderParamsSchema = StrictObject(
  { folderId: IdentifierSchema, organizationId: IdentifierSchema },
  { $id: "LaunchppProjectFolderParamsV1" },
);

export const TaskParamsSchema = StrictObject(
  { projectId: IdentifierSchema, taskId: IdentifierSchema, organizationId: IdentifierSchema },
  { $id: "LaunchppTaskParamsV1" },
);

export const TaskCommentParamsSchema = StrictObject(
  {
    commentId: IdentifierSchema,
    projectId: IdentifierSchema,
    taskId: IdentifierSchema,
    organizationId: IdentifierSchema,
  },
  { $id: "LaunchppTaskCommentParamsV1" },
);

export const CORE_API_SCHEMAS = Object.freeze([
  ProblemDetailsSchema,
  CursorPageQuerySchema,
  IdempotencyHeadersSchema,
  OrganizationSummarySchema,
  OrganizationContextSchema,
  OrganizationMemberSummarySchema,
  TeamSummarySchema,
  TeamInputSchema,
  CreateOrganizationInputSchema,
  RenameOrganizationInputSchema,
  SelectOrganizationInputSchema,
  ProjectFolderSummarySchema,
  ProjectSummarySchema,
  ProjectStatusSummarySchema,
  ProjectStatusInputSchema,
  ProjectStatusOrderInputSchema,
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
  TaskAttachmentSummarySchema,
  CreateTaskAttachmentInputSchema,
  TaskActivitySchema,
  TaskDetailSchema,
  TaskPageSchema,
  CreateTaskInputSchema,
  CreateTaskCommentInputSchema,
  UpdateTaskCommentInputSchema,
  DeleteTaskCommentInputSchema,
  SearchQuerySchema,
  SearchResultSchema,
  SearchResponseSchema,
  InvalidationEventSchema,
  UpdateTaskInputSchema,
  MoveTaskInputSchema,
  ReplaceTaskAssigneesInputSchema,
  ReplaceTaskLabelsInputSchema,
  ArchiveTaskInputSchema,
  CreateLabelInputSchema,
  OrganizationParamsSchema,
  ProjectParamsSchema,
  ProjectStatusParamsSchema,
  ProjectFolderParamsSchema,
  TaskParamsSchema,
  TaskCommentParamsSchema,
  TaskAttachmentParamsSchema,
] as const);

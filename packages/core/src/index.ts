export type {
  AuthenticatedIdentity,
  IdentityProvider,
  IdentitySession,
} from "./identity/identity-provider.js";
export {
  type CreateInstallationDependencies,
  type CreateInstallationInput,
  CreateInstallationService,
} from "./installations/create-installation.js";
export type {
  Installation,
  InstallationRepository,
} from "./installations/installation.js";
export type {
  Project,
  ProjectAccess,
  ProjectCatalog,
  ProjectFolder,
  ProjectNavigationItem,
  ProjectRepository,
  ProjectStatus,
  ProjectStatusCategory,
} from "./projects/project.js";
export {
  ProjectFolderNameConflictError,
  ProjectFolderNotFoundError,
  ProjectNotFoundError,
  ProjectOrderInvalidError,
} from "./projects/project.js";
export {
  type ProjectCatalogDependencies,
  ProjectCatalogService,
} from "./projects/project-catalog.js";
export {
  type SearchRepository,
  type SearchResult,
  SearchService,
  type SearchServiceDependencies,
} from "./search/search.js";
export type { OutboxMessage, OutboxWriter } from "./shared/outbox.js";
export type {
  ReadContext,
  TransactionManager,
  WriteContext,
} from "./shared/transactions.js";
export type {
  Label,
  Task,
  TaskActivity,
  TaskCatalog,
  TaskComment,
  TaskDetail,
  TaskRepository,
  TaskView,
} from "./tasks/task.js";
export {
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
} from "./tasks/task.js";
export { TaskService, type TaskServiceDependencies } from "./tasks/task-service.js";
export {
  type CreateWorkspaceDependencies,
  type CreateWorkspaceInput,
  CreateWorkspaceService,
} from "./workspaces/create-workspace.js";
export {
  type InitializeOwnerDependencies,
  type InitializeOwnerInput,
  InitializeOwnerService,
} from "./workspaces/initialize-owner.js";
export {
  type RenameWorkspaceDependencies,
  type RenameWorkspaceInput,
  RenameWorkspaceService,
} from "./workspaces/rename-workspace.js";
export {
  type SelectCurrentWorkspaceDependencies,
  SelectCurrentWorkspaceService,
} from "./workspaces/select-current-workspace.js";
export type {
  AuditEntry,
  AuditWriter,
  UserProfile,
  UserProfileRepository,
  Workspace,
  WorkspaceMemberRole,
  WorkspaceMemberState,
  WorkspaceMembership,
  WorkspaceMembershipRepository,
  WorkspaceRepository,
} from "./workspaces/workspace.js";
export {
  UserProfileMissingError,
  WorkspaceMembershipRequiredError,
  WorkspaceNameAlreadyExistsError,
  WorkspaceNotFoundError,
} from "./workspaces/workspace.js";
export {
  type WorkspaceContext,
  WorkspaceQueryService,
} from "./workspaces/workspace-query.js";

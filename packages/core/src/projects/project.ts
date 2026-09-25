import type { ReadContext, WriteContext } from "../shared/transactions.js";

export type ProjectAccess = "restricted" | "organization";
export type ProjectStatusCategory = "active" | "backlog" | "done";

export interface ProjectFolder {
  readonly createdAt: number;
  readonly createdByUserId: string;
  readonly id: string;
  readonly name: string;
  readonly position: number;
  readonly revision: number;
  readonly updatedAt: number;
  readonly organizationId: string;
}

export interface Project {
  readonly access: ProjectAccess;
  readonly archivedAt?: number;
  readonly createdAt: number;
  readonly createdByUserId: string;
  readonly deletedAt?: number;
  readonly description: string;
  readonly folderId?: string;
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly nextTaskNumber: number;
  readonly position: number;
  readonly revision: number;
  readonly slug: string;
  readonly updatedAt: number;
  readonly organizationId: string;
}

export interface ProjectStatus {
  readonly archivedAt?: number;
  readonly category: ProjectStatusCategory;
  readonly color: string;
  readonly createdAt: number;
  readonly icon?: string;
  readonly id: string;
  readonly name: string;
  readonly position: number;
  readonly projectId: string;
  readonly revision: number;
  readonly updatedAt: number;
  readonly organizationId: string;
}

export interface ProjectNavigationItem extends Project {
  readonly favorite: boolean;
  readonly lastOpenedAt?: number;
}

export interface ProjectCatalog {
  readonly folders: readonly ProjectFolder[];
  readonly projects: readonly ProjectNavigationItem[];
  readonly statuses: readonly ProjectStatus[];
}

export interface ProjectRepository {
  createFolder(context: WriteContext, folder: ProjectFolder): void;
  createProject(context: WriteContext, project: Project): void;
  createStatus(context: WriteContext, status: ProjectStatus): void;
  deleteFolder(
    context: WriteContext,
    organizationId: string,
    folderId: string,
    updatedAt: number,
  ): void;
  findFolderById(context: ReadContext, folderId: string): ProjectFolder | undefined;
  findFolderByName(
    context: ReadContext,
    organizationId: string,
    name: string,
  ): ProjectFolder | undefined;
  findProjectById(context: ReadContext, projectId: string): Project | undefined;
  findProjectByKey(context: ReadContext, organizationId: string, key: string): Project | undefined;
  findProjectBySlug(
    context: ReadContext,
    organizationId: string,
    slug: string,
  ): Project | undefined;
  listFolders(context: ReadContext, organizationId: string): readonly ProjectFolder[];
  listProjects(
    context: ReadContext,
    organizationId: string,
    userId: string,
  ): readonly ProjectNavigationItem[];
  listStatuses(context: ReadContext, organizationId: string): readonly ProjectStatus[];
  nextFolderPosition(context: ReadContext, organizationId: string): number;
  nextProjectPosition(context: ReadContext, organizationId: string, folderId?: string): number;
  reorderFolders(
    context: WriteContext,
    organizationId: string,
    orderedIds: readonly string[],
    updatedAt: number,
  ): void;
  reorderProjects(
    context: WriteContext,
    organizationId: string,
    folderId: string | undefined,
    orderedIds: readonly string[],
    updatedAt: number,
  ): void;
  reorderStatuses(
    context: WriteContext,
    organizationId: string,
    projectId: string,
    orderedIds: readonly string[],
    updatedAt: number,
  ): void;
  saveFolder(context: WriteContext, folder: ProjectFolder): void;
  saveProject(context: WriteContext, project: Project): void;
  saveStatus(context: WriteContext, status: ProjectStatus): void;
  statusHasActiveTasks(
    context: ReadContext,
    organizationId: string,
    projectId: string,
    statusId: string,
  ): boolean;
  setPreference(
    context: WriteContext,
    input: Readonly<{
      favorite?: boolean;
      lastOpenedAt?: number;
      projectId: string;
      updatedAt: number;
      userId: string;
    }>,
  ): void;
}

export class ProjectNotFoundError extends Error {
  override readonly name = "ProjectNotFoundError";
}

export class ProjectFolderNotFoundError extends Error {
  override readonly name = "ProjectFolderNotFoundError";
}

export class ProjectFolderNameConflictError extends Error {
  override readonly name = "ProjectFolderNameConflictError";
}

export class ProjectStatusNameConflictError extends Error {
  override readonly name = "ProjectStatusNameConflictError";
}

export class ProjectStatusNotFoundError extends Error {
  override readonly name = "ProjectStatusNotFoundError";
}

export class ProjectStatusInUseError extends Error {
  override readonly name = "ProjectStatusInUseError";
}

export class ProjectOrderInvalidError extends Error {
  override readonly name = "ProjectOrderInvalidError";
}

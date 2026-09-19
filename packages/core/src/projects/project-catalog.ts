import type { OutboxWriter } from "../shared/outbox.js";
import type { TransactionManager, WriteContext } from "../shared/transactions.js";
import type { AuditWriter } from "../workspaces/workspace.js";
import {
  availableProjectKey,
  availableProjectSlug,
  normalizeFolderName,
  normalizeProjectName,
} from "./project-naming.js";
import type {
  Project,
  ProjectCatalog,
  ProjectFolder,
  ProjectRepository,
  ProjectStatus,
  ProjectStatusCategory,
} from "./project.js";
import {
  ProjectFolderNameConflictError,
  ProjectFolderNotFoundError,
  ProjectNotFoundError,
  ProjectOrderInvalidError,
} from "./project.js";

export interface ProjectCatalogDependencies {
  readonly audit: AuditWriter;
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly outbox: OutboxWriter;
  readonly projects: ProjectRepository;
  readonly transactions: TransactionManager;
}

interface CommandContext {
  readonly correlationId: string;
  readonly installationId: string;
  readonly userId: string;
  readonly workspaceId: string;
}

interface DefaultStatus {
  readonly category: ProjectStatusCategory;
  readonly color: string;
  readonly name: string;
}

const defaultStatuses: readonly DefaultStatus[] = [
  { category: "backlog", color: "#8c8c8c", name: "To do" },
  { category: "active", color: "#1668dc", name: "In progress" },
  { category: "done", color: "#52c41a", name: "Done" },
];

function validateContext(input: CommandContext) {
  if (
    input.correlationId.length === 0 ||
    input.installationId.length === 0 ||
    input.userId.length === 0 ||
    input.workspaceId.length === 0
  ) {
    throw new TypeError("Workspace, user, and correlation identifiers are required.");
  }
}

function sameIds(actual: readonly string[], requested: readonly string[]): boolean {
  return (
    actual.length === requested.length &&
    new Set(requested).size === requested.length &&
    actual.every((id) => requested.includes(id))
  );
}

export class ProjectCatalogService {
  constructor(private readonly dependencies: ProjectCatalogDependencies) {}

  list(workspaceId: string, userId: string): ProjectCatalog {
    if (workspaceId.length === 0 || userId.length === 0) {
      throw new TypeError("Workspace and user identifiers are required.");
    }
    return this.dependencies.transactions.read((context) => ({
      folders: this.dependencies.projects.listFolders(context, workspaceId),
      projects: this.dependencies.projects.listProjects(context, workspaceId, userId),
      statuses: this.dependencies.projects.listStatuses(context, workspaceId),
    }));
  }

  createFolder(input: CommandContext & Readonly<{ name: string }>): Promise<ProjectFolder> {
    validateContext(input);
    const name = normalizeFolderName(input.name);
    return this.dependencies.transactions.write((context) => {
      if (this.dependencies.projects.findFolderByName(context, input.workspaceId, name)) {
        throw new ProjectFolderNameConflictError("A folder with this name already exists.");
      }
      const now = this.dependencies.clock();
      const folder: ProjectFolder = Object.freeze({
        createdAt: now,
        createdByUserId: input.userId,
        id: this.dependencies.generateId(),
        name,
        position: this.dependencies.projects.nextFolderPosition(context, input.workspaceId),
        revision: 1,
        updatedAt: now,
        workspaceId: input.workspaceId,
      });
      this.dependencies.projects.createFolder(context, folder);
      this.record(context, input, "project_folder.created", folder.id, { name });
      return folder;
    });
  }

  renameFolder(
    input: CommandContext & Readonly<{ folderId: string; name: string }>,
  ): Promise<ProjectFolder> {
    validateContext(input);
    const name = normalizeFolderName(input.name);
    return this.dependencies.transactions.write((context) => {
      const folder = this.requireFolder(context, input.workspaceId, input.folderId);
      if (folder.name === name) return folder;
      const conflict = this.dependencies.projects.findFolderByName(
        context,
        input.workspaceId,
        name,
      );
      if (conflict && conflict.id !== folder.id) {
        throw new ProjectFolderNameConflictError("A folder with this name already exists.");
      }
      const updated: ProjectFolder = Object.freeze({
        ...folder,
        name,
        revision: folder.revision + 1,
        updatedAt: this.dependencies.clock(),
      });
      this.dependencies.projects.saveFolder(context, updated);
      this.record(context, input, "project_folder.renamed", folder.id, {
        name,
        previousName: folder.name,
      });
      return updated;
    });
  }

  deleteFolder(input: CommandContext & Readonly<{ folderId: string }>): Promise<void> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      const folder = this.requireFolder(context, input.workspaceId, input.folderId);
      const now = this.dependencies.clock();
      this.dependencies.projects.deleteFolder(context, input.workspaceId, folder.id, now);
      this.record(context, input, "project_folder.deleted", folder.id, { name: folder.name });
    });
  }

  reorderFolders(
    input: CommandContext & Readonly<{ orderedFolderIds: readonly string[] }>,
  ): Promise<void> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      const actual = this.dependencies.projects
        .listFolders(context, input.workspaceId)
        .map((folder) => folder.id);
      if (!sameIds(actual, input.orderedFolderIds)) {
        throw new ProjectOrderInvalidError("Folder order must include every folder exactly once.");
      }
      this.dependencies.projects.reorderFolders(
        context,
        input.workspaceId,
        input.orderedFolderIds,
        this.dependencies.clock(),
      );
      this.record(context, input, "project_folders.reordered", input.workspaceId, {
        orderedFolderIds: input.orderedFolderIds,
      });
    });
  }

  createProject(
    input: CommandContext & Readonly<{ description?: string; folderId?: string; name: string }>,
  ): Promise<Project> {
    validateContext(input);
    const name = normalizeProjectName(input.name);
    const description = input.description?.trim() ?? "";
    if (description.length > 20_000) {
      return Promise.reject(new TypeError("Project description cannot exceed 20,000 characters."));
    }
    return this.dependencies.transactions.write((context) => {
      if (input.folderId) this.requireFolder(context, input.workspaceId, input.folderId);
      const now = this.dependencies.clock();
      const project: Project = Object.freeze({
        access: "workspace",
        createdAt: now,
        createdByUserId: input.userId,
        description,
        ...(input.folderId ? { folderId: input.folderId } : {}),
        id: this.dependencies.generateId(),
        key: availableProjectKey(context, this.dependencies.projects, input.workspaceId, name),
        name,
        nextTaskNumber: 1,
        position: this.dependencies.projects.nextProjectPosition(
          context,
          input.workspaceId,
          input.folderId,
        ),
        revision: 1,
        slug: availableProjectSlug(context, this.dependencies.projects, input.workspaceId, name),
        updatedAt: now,
        workspaceId: input.workspaceId,
      });
      this.dependencies.projects.createProject(context, project);
      defaultStatuses.forEach((status, position) => {
        const projectStatus: ProjectStatus = Object.freeze({
          ...status,
          createdAt: now,
          id: this.dependencies.generateId(),
          position,
          projectId: project.id,
          revision: 1,
          updatedAt: now,
          workspaceId: input.workspaceId,
        });
        this.dependencies.projects.createStatus(context, projectStatus);
      });
      this.record(context, input, "project.created", project.id, {
        folderId: input.folderId ?? null,
        key: project.key,
        name,
      });
      return project;
    });
  }

  updateProject(
    input: CommandContext &
      Readonly<{
        description?: string;
        folderId?: string | null;
        name?: string;
        projectId: string;
      }>,
  ): Promise<Project> {
    validateContext(input);
    const name = input.name === undefined ? undefined : normalizeProjectName(input.name);
    const description = input.description?.trim();
    if (description !== undefined && description.length > 20_000) {
      return Promise.reject(new TypeError("Project description cannot exceed 20,000 characters."));
    }
    return this.dependencies.transactions.write((context) => {
      const project = this.requireProject(context, input.workspaceId, input.projectId);
      const requestedFolderId = input.folderId === null ? undefined : input.folderId;
      if (requestedFolderId) this.requireFolder(context, input.workspaceId, requestedFolderId);
      const folderChanged = input.folderId !== undefined && requestedFolderId !== project.folderId;
      const now = this.dependencies.clock();
      const changes = {
        ...(description === undefined ? {} : { description }),
        ...(name === undefined ? {} : { name }),
        revision: project.revision + 1,
        updatedAt: now,
      };
      if (requestedFolderId === undefined && folderChanged) {
        const { folderId: _folderId, ...projectWithoutFolder } = project;
        const ungrouped: Project = Object.freeze({
          ...projectWithoutFolder,
          ...changes,
          position: this.dependencies.projects.nextProjectPosition(context, input.workspaceId),
        });
        this.dependencies.projects.saveProject(context, ungrouped);
        this.record(context, input, "project.updated", project.id, {
          folderId: null,
          name: ungrouped.name,
        });
        return ungrouped;
      }
      const updated: Project = Object.freeze({
        ...project,
        ...changes,
        ...(folderChanged && requestedFolderId
          ? {
              folderId: requestedFolderId,
              position: this.dependencies.projects.nextProjectPosition(
                context,
                input.workspaceId,
                requestedFolderId,
              ),
            }
          : {}),
      });
      this.dependencies.projects.saveProject(context, updated);
      this.record(context, input, "project.updated", project.id, {
        folderId: updated.folderId ?? null,
        name: updated.name,
      });
      return updated;
    });
  }

  archiveProject(input: CommandContext & Readonly<{ projectId: string }>): Promise<Project> {
    return this.setProjectLifecycle(input, "archive");
  }

  restoreProject(input: CommandContext & Readonly<{ projectId: string }>): Promise<Project> {
    return this.setProjectLifecycle(input, "restore");
  }

  deleteProject(input: CommandContext & Readonly<{ projectId: string }>): Promise<Project> {
    return this.setProjectLifecycle(input, "delete");
  }

  reorderProjects(
    input: CommandContext & Readonly<{ folderId?: string; orderedProjectIds: readonly string[] }>,
  ): Promise<void> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      if (input.folderId) this.requireFolder(context, input.workspaceId, input.folderId);
      const actual = this.dependencies.projects
        .listProjects(context, input.workspaceId, input.userId)
        .filter(
          (project) =>
            project.archivedAt === undefined &&
            project.deletedAt === undefined &&
            project.folderId === input.folderId,
        )
        .map((project) => project.id);
      if (!sameIds(actual, input.orderedProjectIds)) {
        throw new ProjectOrderInvalidError(
          "Project order must include every active project in the folder exactly once.",
        );
      }
      this.dependencies.projects.reorderProjects(
        context,
        input.workspaceId,
        input.folderId,
        input.orderedProjectIds,
        this.dependencies.clock(),
      );
      this.record(context, input, "projects.reordered", input.workspaceId, {
        folderId: input.folderId ?? null,
        orderedProjectIds: input.orderedProjectIds,
      });
    });
  }

  setFavorite(
    input: CommandContext & Readonly<{ favorite: boolean; projectId: string }>,
  ): Promise<void> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      this.requireProject(context, input.workspaceId, input.projectId);
      const now = this.dependencies.clock();
      this.dependencies.projects.setPreference(context, {
        favorite: input.favorite,
        projectId: input.projectId,
        updatedAt: now,
        userId: input.userId,
      });
    });
  }

  recordOpen(input: CommandContext & Readonly<{ projectId: string }>): Promise<void> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      this.requireProject(context, input.workspaceId, input.projectId);
      const now = this.dependencies.clock();
      this.dependencies.projects.setPreference(context, {
        lastOpenedAt: now,
        projectId: input.projectId,
        updatedAt: now,
        userId: input.userId,
      });
    });
  }

  private setProjectLifecycle(
    input: CommandContext & Readonly<{ projectId: string }>,
    action: "archive" | "delete" | "restore",
  ): Promise<Project> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      const project = this.requireProject(context, input.workspaceId, input.projectId, true);
      const now = this.dependencies.clock();
      let updated: Project;
      if (action === "archive") {
        if (project.archivedAt !== undefined) return project;
        updated = Object.freeze({
          ...project,
          archivedAt: now,
          revision: project.revision + 1,
          updatedAt: now,
        });
      } else if (action === "delete") {
        if (project.deletedAt !== undefined) return project;
        updated = Object.freeze({
          ...project,
          deletedAt: now,
          revision: project.revision + 1,
          updatedAt: now,
        });
      } else {
        if (project.deletedAt !== undefined) {
          throw new ProjectNotFoundError("Deleted projects cannot be restored from the archive.");
        }
        if (project.archivedAt === undefined) return project;
        const { archivedAt: _archivedAt, ...activeProject } = project;
        updated = Object.freeze({
          ...activeProject,
          position: this.dependencies.projects.nextProjectPosition(
            context,
            input.workspaceId,
            project.folderId,
          ),
          revision: project.revision + 1,
          updatedAt: now,
        });
      }
      this.dependencies.projects.saveProject(context, updated);
      this.record(context, input, `project.${action}d`, project.id, { name: project.name });
      return updated;
    });
  }

  private requireFolder(context: WriteContext, workspaceId: string, folderId: string) {
    const folder = this.dependencies.projects.findFolderById(context, folderId);
    if (!folder || folder.workspaceId !== workspaceId) {
      throw new ProjectFolderNotFoundError("The project folder does not exist.");
    }
    return folder;
  }

  private requireProject(
    context: WriteContext,
    workspaceId: string,
    projectId: string,
    includeDeleted = false,
  ) {
    const project = this.dependencies.projects.findProjectById(context, projectId);
    if (
      !project ||
      project.workspaceId !== workspaceId ||
      (!includeDeleted && project.deletedAt !== undefined)
    ) {
      throw new ProjectNotFoundError("The project does not exist.");
    }
    return project;
  }

  private record(
    context: WriteContext,
    input: CommandContext,
    operation: string,
    targetId: string,
    metadata: Readonly<Record<string, unknown>>,
  ) {
    const occurredAt = this.dependencies.clock();
    this.dependencies.audit.append(context, {
      actorId: input.userId,
      actorType: "user",
      correlationId: input.correlationId,
      id: this.dependencies.generateId(),
      installationId: input.installationId,
      metadata,
      occurredAt,
      operation,
      outcome: "succeeded",
      targetId,
      targetType: operation.startsWith("project_folder") ? "project_folder" : "project",
      workspaceId: input.workspaceId,
    });
    this.dependencies.outbox.append(context, {
      availableAt: occurredAt,
      correlationId: input.correlationId,
      id: this.dependencies.generateId(),
      installationId: input.installationId,
      occurredAt,
      payload: { actorId: input.userId, ...metadata, targetId, workspaceId: input.workspaceId },
      topic: operation,
    });
  }
}

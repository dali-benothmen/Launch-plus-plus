import type { OutboxWriter } from "../shared/outbox.js";
import type { TransactionManager, WriteContext } from "../shared/transactions.js";
import type { AuditWriter } from "../organizations/organization.js";
import { normalizeFolderName } from "./project-naming.js";
import { createOwnedProject } from "./create-owned-project.js";
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
  ProjectStatusInUseError,
  ProjectStatusNameConflictError,
  ProjectStatusNotFoundError,
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
  readonly organizationId: string;
}

const generatedStatusColors = [
  "#1677ff",
  "#13c2c2",
  "#52c41a",
  "#fa8c16",
  "#eb2f96",
  "#faad14",
] as const;

function validateContext(input: CommandContext) {
  if (
    input.correlationId.length === 0 ||
    input.installationId.length === 0 ||
    input.userId.length === 0 ||
    input.organizationId.length === 0
  ) {
    throw new TypeError("Organization, user, and correlation identifiers are required.");
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

  list(organizationId: string, userId: string): ProjectCatalog {
    if (organizationId.length === 0 || userId.length === 0) {
      throw new TypeError("Organization and user identifiers are required.");
    }
    return this.dependencies.transactions.read((context) => ({
      folders: this.dependencies.projects.listFolders(context, organizationId),
      projects: this.dependencies.projects.listProjects(context, organizationId, userId),
      statuses: this.dependencies.projects.listStatuses(context, organizationId),
    }));
  }

  createFolder(input: CommandContext & Readonly<{ name: string }>): Promise<ProjectFolder> {
    validateContext(input);
    const name = normalizeFolderName(input.name);
    return this.dependencies.transactions.write((context) => {
      if (this.dependencies.projects.findFolderByName(context, input.organizationId, name)) {
        throw new ProjectFolderNameConflictError("A folder with this name already exists.");
      }
      const now = this.dependencies.clock();
      const folder: ProjectFolder = Object.freeze({
        createdAt: now,
        createdByUserId: input.userId,
        id: this.dependencies.generateId(),
        name,
        position: this.dependencies.projects.nextFolderPosition(context, input.organizationId),
        revision: 1,
        updatedAt: now,
        organizationId: input.organizationId,
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
      const folder = this.requireFolder(context, input.organizationId, input.folderId);
      if (folder.name === name) return folder;
      const conflict = this.dependencies.projects.findFolderByName(
        context,
        input.organizationId,
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
      const folder = this.requireFolder(context, input.organizationId, input.folderId);
      const now = this.dependencies.clock();
      this.dependencies.projects.deleteFolder(context, input.organizationId, folder.id, now);
      this.record(context, input, "project_folder.deleted", folder.id, { name: folder.name });
    });
  }

  reorderFolders(
    input: CommandContext & Readonly<{ orderedFolderIds: readonly string[] }>,
  ): Promise<void> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      const actual = this.dependencies.projects
        .listFolders(context, input.organizationId)
        .map((folder) => folder.id);
      if (!sameIds(actual, input.orderedFolderIds)) {
        throw new ProjectOrderInvalidError("Folder order must include every folder exactly once.");
      }
      this.dependencies.projects.reorderFolders(
        context,
        input.organizationId,
        input.orderedFolderIds,
        this.dependencies.clock(),
      );
      this.record(context, input, "project_folders.reordered", input.organizationId, {
        orderedFolderIds: input.orderedFolderIds,
      });
    });
  }

  createProject(
    input: CommandContext & Readonly<{ description?: string; folderId?: string; name: string }>,
  ): Promise<Project> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      if (input.folderId) this.requireFolder(context, input.organizationId, input.folderId);
      return createOwnedProject(context, this.dependencies, {
        ...input,
        now: this.dependencies.clock(),
      });
    });
  }

  createStatus(
    input: CommandContext &
      Readonly<{
        category?: ProjectStatusCategory;
        color?: string;
        name: string;
        projectId: string;
      }>,
  ): Promise<ProjectStatus> {
    validateContext(input);
    const name = input.name.trim().replace(/\s+/g, " ");
    if (name.length === 0 || name.length > 80) {
      return Promise.reject(new TypeError("Board column name must contain 1 to 80 characters."));
    }
    if (input.color !== undefined && !/^#[0-9a-f]{6}$/i.test(input.color)) {
      return Promise.reject(new TypeError("Board column color must be a six-digit hex color."));
    }
    return this.dependencies.transactions.write((context) => {
      this.requireProject(context, input.organizationId, input.projectId);
      const projectStatuses = this.dependencies.projects
        .listStatuses(context, input.organizationId)
        .filter(
          (status) => status.projectId === input.projectId && status.archivedAt === undefined,
        );
      if (projectStatuses.some((status) => status.name.toLowerCase() === name.toLowerCase())) {
        throw new ProjectStatusNameConflictError("A board column with this name already exists.");
      }
      const color =
        input.color ??
        generatedStatusColors[projectStatuses.length % generatedStatusColors.length] ??
        "#1677ff";
      const now = this.dependencies.clock();
      const status: ProjectStatus = Object.freeze({
        category: input.category ?? "active",
        color,
        createdAt: now,
        id: this.dependencies.generateId(),
        name,
        position: projectStatuses.reduce(
          (position, item) => Math.max(position, item.position + 1),
          0,
        ),
        projectId: input.projectId,
        revision: 1,
        updatedAt: now,
        organizationId: input.organizationId,
      });
      this.dependencies.projects.createStatus(context, status);
      this.record(context, input, "project_status.created", status.id, {
        name,
        projectId: input.projectId,
      });
      return status;
    });
  }

  renameStatus(
    input: CommandContext & Readonly<{ name: string; projectId: string; statusId: string }>,
  ): Promise<ProjectStatus> {
    validateContext(input);
    const name = input.name.trim().replace(/\s+/g, " ");
    if (name.length === 0 || name.length > 80) {
      return Promise.reject(new TypeError("Board column name must contain 1 to 80 characters."));
    }
    return this.dependencies.transactions.write((context) => {
      this.requireProject(context, input.organizationId, input.projectId);
      const statuses = this.dependencies.projects
        .listStatuses(context, input.organizationId)
        .filter(
          (status) => status.projectId === input.projectId && status.archivedAt === undefined,
        );
      const status = statuses.find((item) => item.id === input.statusId);
      if (!status) throw new ProjectStatusNotFoundError("The board column does not exist.");
      if (
        statuses.some(
          (item) => item.id !== status.id && item.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw new ProjectStatusNameConflictError("A board column with this name already exists.");
      }
      if (status.name === name) return status;
      const updated = Object.freeze({
        ...status,
        name,
        revision: status.revision + 1,
        updatedAt: this.dependencies.clock(),
      });
      this.dependencies.projects.saveStatus(context, updated);
      this.record(context, input, "project_status.renamed", status.id, {
        name,
        projectId: input.projectId,
      });
      return updated;
    });
  }

  deleteStatus(
    input: CommandContext & Readonly<{ projectId: string; statusId: string }>,
  ): Promise<void> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      this.requireProject(context, input.organizationId, input.projectId);
      const statuses = this.dependencies.projects
        .listStatuses(context, input.organizationId)
        .filter(
          (status) => status.projectId === input.projectId && status.archivedAt === undefined,
        );
      const status = statuses.find((item) => item.id === input.statusId);
      if (!status) throw new ProjectStatusNotFoundError("The board column does not exist.");
      if (statuses.length <= 1) {
        throw new ProjectStatusInUseError("A project must keep at least one board column.");
      }
      if (
        this.dependencies.projects.statusHasActiveTasks(
          context,
          input.organizationId,
          input.projectId,
          status.id,
        )
      ) {
        throw new ProjectStatusInUseError("Move every task out of this column before deleting it.");
      }
      const now = this.dependencies.clock();
      this.dependencies.projects.saveStatus(context, {
        ...status,
        archivedAt: now,
        revision: status.revision + 1,
        updatedAt: now,
      });
      this.record(context, input, "project_status.deleted", status.id, {
        projectId: input.projectId,
      });
    });
  }

  reorderStatuses(
    input: CommandContext & Readonly<{ projectId: string; orderedStatusIds: readonly string[] }>,
  ): Promise<void> {
    validateContext(input);
    return this.dependencies.transactions.write((context) => {
      this.requireProject(context, input.organizationId, input.projectId);
      const currentIds = this.dependencies.projects
        .listStatuses(context, input.organizationId)
        .filter((status) => status.projectId === input.projectId && status.archivedAt === undefined)
        .map((status) => status.id);
      if (
        currentIds.length !== input.orderedStatusIds.length ||
        new Set(input.orderedStatusIds).size !== currentIds.length ||
        currentIds.some((id) => !input.orderedStatusIds.includes(id))
      ) {
        throw new ProjectOrderInvalidError(
          "Board column order must include every active column exactly once.",
        );
      }
      this.dependencies.projects.reorderStatuses(
        context,
        input.organizationId,
        input.projectId,
        input.orderedStatusIds,
        this.dependencies.clock(),
      );
      this.record(context, input, "project.statuses_reordered", input.projectId, {
        orderedStatusIds: input.orderedStatusIds,
        projectId: input.projectId,
      });
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
      const project = this.requireProject(context, input.organizationId, input.projectId);
      const requestedFolderId = input.folderId === null ? undefined : input.folderId;
      if (requestedFolderId) this.requireFolder(context, input.organizationId, requestedFolderId);
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
          position: this.dependencies.projects.nextProjectPosition(context, input.organizationId),
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
                input.organizationId,
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
      if (input.folderId) this.requireFolder(context, input.organizationId, input.folderId);
      const actual = this.dependencies.projects
        .listProjects(context, input.organizationId, input.userId)
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
        input.organizationId,
        input.folderId,
        input.orderedProjectIds,
        this.dependencies.clock(),
      );
      this.record(context, input, "projects.reordered", input.organizationId, {
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
      this.requireProject(context, input.organizationId, input.projectId);
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
      this.requireProject(context, input.organizationId, input.projectId);
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
      const project = this.requireProject(context, input.organizationId, input.projectId, true);
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
            input.organizationId,
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

  private requireFolder(context: WriteContext, organizationId: string, folderId: string) {
    const folder = this.dependencies.projects.findFolderById(context, folderId);
    if (!folder || folder.organizationId !== organizationId) {
      throw new ProjectFolderNotFoundError("The project folder does not exist.");
    }
    return folder;
  }

  private requireProject(
    context: WriteContext,
    organizationId: string,
    projectId: string,
    includeDeleted = false,
  ) {
    const project = this.dependencies.projects.findProjectById(context, projectId);
    if (
      !project ||
      project.organizationId !== organizationId ||
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
      targetType: operation.startsWith("project_folder")
        ? "project_folder"
        : operation.startsWith("project_status")
          ? "project_status"
          : "project",
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
        ...metadata,
        targetId,
        organizationId: input.organizationId,
      },
      topic: operation,
    });
  }
}

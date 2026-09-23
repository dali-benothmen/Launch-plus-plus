import type {
  Project,
  ProjectFolder,
  ProjectNavigationItem,
  ProjectRepository,
  ProjectStatus,
  ReadContext,
  WriteContext,
} from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface FolderRow {
  readonly created_at: number;
  readonly created_by_user_id: string;
  readonly id: string;
  readonly name: string;
  readonly position: number;
  readonly revision: number;
  readonly updated_at: number;
  readonly organization_id: string;
}

interface ProjectRow {
  readonly access: "restricted" | "organization";
  readonly archived_at: number | null;
  readonly created_at: number;
  readonly created_by_user_id: string;
  readonly deleted_at: number | null;
  readonly description: string;
  readonly favorite?: number;
  readonly folder_id: string | null;
  readonly id: string;
  readonly key: string;
  readonly last_opened_at?: number | null;
  readonly name: string;
  readonly next_task_number: number;
  readonly position: number;
  readonly revision: number;
  readonly slug: string;
  readonly updated_at: number;
  readonly organization_id: string;
}

interface StatusRow {
  readonly archived_at: number | null;
  readonly category: "active" | "backlog" | "done";
  readonly color: string;
  readonly created_at: number;
  readonly icon: string | null;
  readonly id: string;
  readonly name: string;
  readonly position: number;
  readonly project_id: string;
  readonly revision: number;
  readonly updated_at: number;
  readonly organization_id: string;
}

const folderSelection = `
  SELECT id, organization_id, name, position, created_by_user_id, created_at, updated_at, revision
  FROM project_folders`;

const projectSelection = `
  SELECT id, organization_id, folder_id, key, slug, name, description, access, position,
         next_task_number, created_by_user_id, created_at, updated_at, archived_at,
         deleted_at, revision
  FROM projects`;

function mapFolder(row: FolderRow): ProjectFolder {
  return Object.freeze({
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    id: row.id,
    name: row.name,
    position: row.position,
    revision: row.revision,
    updatedAt: row.updated_at,
    organizationId: row.organization_id,
  });
}

function mapProject(row: ProjectRow): Project {
  return Object.freeze({
    access: row.access,
    ...(row.archived_at === null ? {} : { archivedAt: row.archived_at }),
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    ...(row.deleted_at === null ? {} : { deletedAt: row.deleted_at }),
    description: row.description,
    ...(row.folder_id === null ? {} : { folderId: row.folder_id }),
    id: row.id,
    key: row.key,
    name: row.name,
    nextTaskNumber: row.next_task_number,
    position: row.position,
    revision: row.revision,
    slug: row.slug,
    updatedAt: row.updated_at,
    organizationId: row.organization_id,
  });
}

function mapNavigationProject(row: ProjectRow): ProjectNavigationItem {
  return Object.freeze({
    ...mapProject(row),
    favorite: row.favorite === 1,
    ...(row.last_opened_at === null || row.last_opened_at === undefined
      ? {}
      : { lastOpenedAt: row.last_opened_at }),
  });
}

function mapStatus(row: StatusRow): ProjectStatus {
  return Object.freeze({
    ...(row.archived_at === null ? {} : { archivedAt: row.archived_at }),
    category: row.category,
    color: row.color,
    createdAt: row.created_at,
    ...(row.icon === null ? {} : { icon: row.icon }),
    id: row.id,
    name: row.name,
    position: row.position,
    projectId: row.project_id,
    revision: row.revision,
    updatedAt: row.updated_at,
    organizationId: row.organization_id,
  });
}

function folderClause(folderId: string | undefined) {
  return folderId === undefined ? "folder_id IS NULL" : "folder_id = ?";
}

export class SqliteProjectRepository implements ProjectRepository {
  createFolder(context: WriteContext, folder: ProjectFolder): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO project_folders (
          id, organization_id, name, position, created_by_user_id, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        folder.id,
        folder.organizationId,
        folder.name,
        folder.position,
        folder.createdByUserId,
        folder.createdAt,
        folder.updatedAt,
        folder.revision,
      );
  }

  createProject(context: WriteContext, project: Project): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO projects (
          id, organization_id, folder_id, key, slug, name, description, access, position,
          next_task_number, created_by_user_id, created_at, updated_at, archived_at,
          deleted_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        project.id,
        project.organizationId,
        project.folderId ?? null,
        project.key,
        project.slug,
        project.name,
        project.description,
        project.access,
        project.position,
        project.nextTaskNumber,
        project.createdByUserId,
        project.createdAt,
        project.updatedAt,
        project.archivedAt ?? null,
        project.deletedAt ?? null,
        project.revision,
      );
  }

  createStatus(context: WriteContext, status: ProjectStatus): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO project_statuses (
          id, organization_id, project_id, name, color, icon, position, category,
          created_at, updated_at, archived_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        status.id,
        status.organizationId,
        status.projectId,
        status.name,
        status.color,
        status.icon ?? null,
        status.position,
        status.category,
        status.createdAt,
        status.updatedAt,
        status.archivedAt ?? null,
        status.revision,
      );
  }

  deleteFolder(
    context: WriteContext,
    organizationId: string,
    folderId: string,
    updatedAt: number,
  ): void {
    const connection = requireSqliteConnection(context);
    const activeProjectIds = connection
      .prepare<[string, string], { readonly id: string }>(
        `SELECT id FROM projects
         WHERE organization_id = ? AND folder_id = ? AND archived_at IS NULL AND deleted_at IS NULL
         ORDER BY position ASC, id ASC`,
      )
      .all(organizationId, folderId);
    let position = this.nextProjectPosition(context, organizationId);
    const moveActive = connection.prepare(
      `UPDATE projects
       SET folder_id = NULL, position = ?, updated_at = ?, revision = revision + 1
       WHERE id = ? AND organization_id = ?`,
    );
    for (const project of activeProjectIds) {
      moveActive.run(position, updatedAt, project.id, organizationId);
      position += 1;
    }
    connection
      .prepare(
        `UPDATE projects
         SET folder_id = NULL, updated_at = ?, revision = revision + 1
         WHERE organization_id = ? AND folder_id = ?
           AND (archived_at IS NOT NULL OR deleted_at IS NOT NULL)`,
      )
      .run(updatedAt, organizationId, folderId);
    connection
      .prepare("DELETE FROM project_folders WHERE id = ? AND organization_id = ?")
      .run(folderId, organizationId);
    this.reorderFolders(
      context,
      organizationId,
      this.listFolders(context, organizationId).map((folder) => folder.id),
      updatedAt,
    );
  }

  findFolderById(context: ReadContext, folderId: string): ProjectFolder | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], FolderRow>(`${folderSelection} WHERE id = ?`)
      .get(folderId);
    return row ? mapFolder(row) : undefined;
  }

  findFolderByName(
    context: ReadContext,
    organizationId: string,
    name: string,
  ): ProjectFolder | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], FolderRow>(
        `${folderSelection} WHERE organization_id = ? AND lower(name) = lower(?)`,
      )
      .get(organizationId, name);
    return row ? mapFolder(row) : undefined;
  }

  findProjectById(context: ReadContext, projectId: string): Project | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], ProjectRow>(`${projectSelection} WHERE id = ?`)
      .get(projectId);
    return row ? mapProject(row) : undefined;
  }

  findProjectByKey(context: ReadContext, organizationId: string, key: string): Project | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], ProjectRow>(
        `${projectSelection} WHERE organization_id = ? AND key = ?`,
      )
      .get(organizationId, key);
    return row ? mapProject(row) : undefined;
  }

  findProjectBySlug(
    context: ReadContext,
    organizationId: string,
    slug: string,
  ): Project | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], ProjectRow>(
        `${projectSelection} WHERE organization_id = ? AND slug = ?`,
      )
      .get(organizationId, slug);
    return row ? mapProject(row) : undefined;
  }

  listFolders(context: ReadContext, organizationId: string): readonly ProjectFolder[] {
    return requireSqliteConnection(context)
      .prepare<[string], FolderRow>(
        `${folderSelection} WHERE organization_id = ? ORDER BY position ASC, id ASC`,
      )
      .all(organizationId)
      .map(mapFolder);
  }

  listProjects(
    context: ReadContext,
    organizationId: string,
    userId: string,
  ): readonly ProjectNavigationItem[] {
    return requireSqliteConnection(context)
      .prepare<[string, string], ProjectRow>(
        `SELECT projects.id, projects.organization_id, projects.folder_id, projects.key,
                projects.slug, projects.name, projects.description, projects.access,
                projects.position, projects.next_task_number, projects.created_by_user_id,
                projects.created_at, projects.updated_at, projects.archived_at,
                projects.deleted_at, projects.revision,
                coalesce(preference.favorite, 0) AS favorite,
                preference.last_opened_at AS last_opened_at
         FROM projects
         LEFT JOIN project_preferences preference
           ON preference.project_id = projects.id AND preference.user_id = ?
         WHERE projects.organization_id = ? AND projects.deleted_at IS NULL
         ORDER BY projects.archived_at IS NOT NULL ASC,
                  projects.folder_id IS NULL ASC,
                  projects.position ASC,
                  projects.id ASC`,
      )
      .all(userId, organizationId)
      .map(mapNavigationProject);
  }

  listStatuses(context: ReadContext, organizationId: string): readonly ProjectStatus[] {
    return requireSqliteConnection(context)
      .prepare<[string], StatusRow>(
        `SELECT status.id, status.organization_id, status.project_id, status.name, status.color,
                status.icon, status.position, status.category, status.created_at,
                status.updated_at, status.archived_at, status.revision
         FROM project_statuses status
         INNER JOIN projects project ON project.id = status.project_id
         WHERE status.organization_id = ? AND status.archived_at IS NULL
           AND project.deleted_at IS NULL
         ORDER BY status.project_id ASC, status.position ASC`,
      )
      .all(organizationId)
      .map(mapStatus);
  }

  nextFolderPosition(context: ReadContext, organizationId: string): number {
    const row = requireSqliteConnection(context)
      .prepare<[string], { readonly position: number }>(
        "SELECT coalesce(max(position), -1) + 1 AS position FROM project_folders WHERE organization_id = ?",
      )
      .get(organizationId);
    return row?.position ?? 0;
  }

  nextProjectPosition(context: ReadContext, organizationId: string, folderId?: string): number {
    const params = folderId === undefined ? [organizationId] : [organizationId, folderId];
    const row = requireSqliteConnection(context)
      .prepare<unknown[], { readonly position: number }>(
        `SELECT coalesce(max(position), -1) + 1 AS position
         FROM projects
         WHERE organization_id = ? AND ${folderClause(folderId)}
           AND archived_at IS NULL AND deleted_at IS NULL`,
      )
      .get(...params);
    return row?.position ?? 0;
  }

  reorderFolders(
    context: WriteContext,
    organizationId: string,
    orderedIds: readonly string[],
    updatedAt: number,
  ): void {
    const connection = requireSqliteConnection(context);
    const offset = this.nextFolderPosition(context, organizationId) + orderedIds.length + 1;
    connection
      .prepare("UPDATE project_folders SET position = position + ? WHERE organization_id = ?")
      .run(offset, organizationId);
    const update = connection.prepare(
      "UPDATE project_folders SET position = ?, updated_at = ?, revision = revision + 1 WHERE id = ? AND organization_id = ?",
    );
    orderedIds.forEach((id, position) => {
      update.run(position, updatedAt, id, organizationId);
    });
  }

  reorderProjects(
    context: WriteContext,
    organizationId: string,
    folderId: string | undefined,
    orderedIds: readonly string[],
    updatedAt: number,
  ): void {
    const connection = requireSqliteConnection(context);
    const clause = folderClause(folderId);
    const params = folderId === undefined ? [organizationId] : [organizationId, folderId];
    const offset =
      this.nextProjectPosition(context, organizationId, folderId) + orderedIds.length + 1;
    connection
      .prepare(
        `UPDATE projects SET position = position + ?
         WHERE organization_id = ? AND ${clause} AND archived_at IS NULL AND deleted_at IS NULL`,
      )
      .run(offset, ...params);
    const update = connection.prepare(
      "UPDATE projects SET position = ?, updated_at = ?, revision = revision + 1 WHERE id = ? AND organization_id = ?",
    );
    orderedIds.forEach((id, position) => {
      update.run(position, updatedAt, id, organizationId);
    });
  }

  reorderStatuses(
    context: WriteContext,
    organizationId: string,
    projectId: string,
    orderedIds: readonly string[],
    updatedAt: number,
  ): void {
    const connection = requireSqliteConnection(context);
    const offset = orderedIds.length * 2 + 1;
    connection
      .prepare(
        `UPDATE project_statuses SET position = position + ?
         WHERE organization_id = ? AND project_id = ? AND archived_at IS NULL`,
      )
      .run(offset, organizationId, projectId);
    const update = connection.prepare(
      `UPDATE project_statuses SET position = ?, updated_at = ?, revision = revision + 1
       WHERE id = ? AND organization_id = ? AND project_id = ? AND archived_at IS NULL`,
    );
    orderedIds.forEach((id, position) => {
      update.run(position, updatedAt, id, organizationId, projectId);
    });
  }

  saveFolder(context: WriteContext, folder: ProjectFolder): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE project_folders
         SET name = ?, position = ?, updated_at = ?, revision = ?
         WHERE id = ? AND organization_id = ?`,
      )
      .run(
        folder.name,
        folder.position,
        folder.updatedAt,
        folder.revision,
        folder.id,
        folder.organizationId,
      );
  }

  saveProject(context: WriteContext, project: Project): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE projects
         SET folder_id = ?, name = ?, description = ?, access = ?, position = ?,
             next_task_number = ?, updated_at = ?, archived_at = ?, deleted_at = ?, revision = ?
         WHERE id = ? AND organization_id = ?`,
      )
      .run(
        project.folderId ?? null,
        project.name,
        project.description,
        project.access,
        project.position,
        project.nextTaskNumber,
        project.updatedAt,
        project.archivedAt ?? null,
        project.deletedAt ?? null,
        project.revision,
        project.id,
        project.organizationId,
      );
  }

  setPreference(
    context: WriteContext,
    input: Readonly<{
      favorite?: boolean;
      lastOpenedAt?: number;
      projectId: string;
      updatedAt: number;
      userId: string;
    }>,
  ): void {
    const connection = requireSqliteConnection(context);
    if (input.favorite !== undefined) {
      connection
        .prepare(
          `INSERT INTO project_preferences (user_id, project_id, favorite, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, project_id) DO UPDATE SET
             favorite = excluded.favorite,
             updated_at = excluded.updated_at`,
        )
        .run(input.userId, input.projectId, input.favorite ? 1 : 0, input.updatedAt);
    }
    if (input.lastOpenedAt !== undefined) {
      connection
        .prepare(
          `INSERT INTO project_preferences (user_id, project_id, favorite, last_opened_at, updated_at)
           VALUES (?, ?, 0, ?, ?)
           ON CONFLICT(user_id, project_id) DO UPDATE SET
             last_opened_at = excluded.last_opened_at,
             updated_at = excluded.updated_at`,
        )
        .run(input.userId, input.projectId, input.lastOpenedAt, input.updatedAt);
    }
  }
}

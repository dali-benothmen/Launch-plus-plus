import type { ReadContext, Workspace, WorkspaceRepository, WriteContext } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface WorkspaceRow {
  readonly archived_at: number | null;
  readonly created_at: number;
  readonly created_by_user_id: string;
  readonly deleted_at: number | null;
  readonly id: string;
  readonly installation_id: string;
  readonly name: string;
  readonly revision: number;
  readonly slug: string;
  readonly updated_at: number;
}

const selection = `
  SELECT workspaces.id AS id,
         workspaces.installation_id AS installation_id,
         workspaces.slug AS slug,
         workspaces.name AS name,
         workspaces.created_by_user_id AS created_by_user_id,
         workspaces.created_at AS created_at,
         workspaces.updated_at AS updated_at,
         workspaces.archived_at AS archived_at,
         workspaces.deleted_at AS deleted_at,
         workspaces.revision AS revision
  FROM workspaces`;

function mapWorkspace(row: WorkspaceRow): Workspace {
  return Object.freeze({
    ...(row.archived_at === null ? {} : { archivedAt: row.archived_at }),
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    ...(row.deleted_at === null ? {} : { deletedAt: row.deleted_at }),
    id: row.id,
    installationId: row.installation_id,
    name: row.name,
    revision: row.revision,
    slug: row.slug,
    updatedAt: row.updated_at,
  });
}

export class SqliteWorkspaceRepository implements WorkspaceRepository {
  create(context: WriteContext, workspace: Workspace): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO workspaces (
          id, installation_id, slug, name, created_by_user_id,
          created_at, updated_at, archived_at, deleted_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        workspace.id,
        workspace.installationId,
        workspace.slug,
        workspace.name,
        workspace.createdByUserId,
        workspace.createdAt,
        workspace.updatedAt,
        workspace.archivedAt ?? null,
        workspace.deletedAt ?? null,
        workspace.revision,
      );
  }

  findById(context: ReadContext, workspaceId: string): Workspace | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], WorkspaceRow>(`${selection} WHERE workspaces.id = ?`)
      .get(workspaceId);
    return row ? mapWorkspace(row) : undefined;
  }

  findByName(context: ReadContext, installationId: string, name: string): Workspace | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], WorkspaceRow>(
        `${selection}
         WHERE workspaces.installation_id = ? AND lower(workspaces.name) = lower(?)`,
      )
      .get(installationId, name);
    return row ? mapWorkspace(row) : undefined;
  }

  findBySlug(context: ReadContext, installationId: string, slug: string): Workspace | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], WorkspaceRow>(
        `${selection} WHERE workspaces.installation_id = ? AND workspaces.slug = ?`,
      )
      .get(installationId, slug);
    return row ? mapWorkspace(row) : undefined;
  }

  listForUser(context: ReadContext, userId: string): readonly Workspace[] {
    return requireSqliteConnection(context)
      .prepare<[string], WorkspaceRow>(
        `${selection}
         INNER JOIN workspace_members member ON member.workspace_id = workspaces.id
         WHERE member.user_id = ? AND member.state = 'active' AND workspaces.deleted_at IS NULL
         ORDER BY workspaces.updated_at DESC, workspaces.id ASC`,
      )
      .all(userId)
      .map(mapWorkspace);
  }

  updateName(
    context: WriteContext,
    input: Readonly<{
      name: string;
      revision: number;
      updatedAt: number;
      workspaceId: string;
    }>,
  ): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE workspaces
         SET name = ?, updated_at = ?, revision = ?
         WHERE id = ?`,
      )
      .run(input.name, input.updatedAt, input.revision, input.workspaceId);
  }
}

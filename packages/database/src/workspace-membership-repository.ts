import type {
  ReadContext,
  WorkspaceMembership,
  WorkspaceMembershipRepository,
  WriteContext,
} from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface MembershipRow {
  readonly joined_at: number;
  readonly role: WorkspaceMembership["role"];
  readonly state: WorkspaceMembership["state"];
  readonly updated_at: number;
  readonly user_id: string;
  readonly workspace_id: string;
}

function mapMembership(row: MembershipRow): WorkspaceMembership {
  return Object.freeze({
    joinedAt: row.joined_at,
    role: row.role,
    state: row.state,
    updatedAt: row.updated_at,
    userId: row.user_id,
    workspaceId: row.workspace_id,
  });
}

export class SqliteWorkspaceMembershipRepository implements WorkspaceMembershipRepository {
  create(context: WriteContext, membership: WorkspaceMembership): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO workspace_members (
          workspace_id, user_id, role, state, joined_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        membership.workspaceId,
        membership.userId,
        membership.role,
        membership.state,
        membership.joinedAt,
        membership.updatedAt,
      );
  }

  find(context: ReadContext, workspaceId: string, userId: string): WorkspaceMembership | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], MembershipRow>(
        `SELECT workspace_id, user_id, role, state, joined_at, updated_at
         FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
      )
      .get(workspaceId, userId);
    return row ? mapMembership(row) : undefined;
  }
}

import type {
  ReadContext,
  OrganizationMembership,
  OrganizationMembershipRepository,
  WriteContext,
} from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface MembershipRow {
  readonly joined_at: number;
  readonly role: OrganizationMembership["role"];
  readonly state: OrganizationMembership["state"];
  readonly updated_at: number;
  readonly user_id: string;
  readonly organization_id: string;
}

function mapMembership(row: MembershipRow): OrganizationMembership {
  return Object.freeze({
    joinedAt: row.joined_at,
    role: row.role,
    state: row.state,
    updatedAt: row.updated_at,
    userId: row.user_id,
    organizationId: row.organization_id,
  });
}

export class SqliteOrganizationMembershipRepository implements OrganizationMembershipRepository {
  create(context: WriteContext, membership: OrganizationMembership): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO organization_members (
          organization_id, user_id, role, state, joined_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        membership.organizationId,
        membership.userId,
        membership.role,
        membership.state,
        membership.joinedAt,
        membership.updatedAt,
      );
  }

  find(
    context: ReadContext,
    organizationId: string,
    userId: string,
  ): OrganizationMembership | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], MembershipRow>(
        `SELECT organization_id, user_id, role, state, joined_at, updated_at
         FROM organization_members WHERE organization_id = ? AND user_id = ?`,
      )
      .get(organizationId, userId);
    return row ? mapMembership(row) : undefined;
  }
}

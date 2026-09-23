import type { ReadContext, Team, TeamRepository, WriteContext } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface TeamRow {
  readonly created_at: number;
  readonly created_by_user_id: string;
  readonly id: string;
  readonly name: string;
  readonly revision: number;
  readonly updated_at: number;
  readonly organization_id: string;
}

function mapTeam(row: TeamRow): Team {
  return Object.freeze({
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    id: row.id,
    name: row.name,
    revision: row.revision,
    updatedAt: row.updated_at,
    organizationId: row.organization_id,
  });
}

export class SqliteTeamRepository implements TeamRepository {
  create(context: WriteContext, team: Team): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO teams (
          id, organization_id, name, created_by_user_id, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        team.id,
        team.organizationId,
        team.name,
        team.createdByUserId,
        team.createdAt,
        team.updatedAt,
        team.revision,
      );
  }

  findByName(context: ReadContext, organizationId: string, name: string): Team | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], TeamRow>(
        `SELECT id, organization_id, name, created_by_user_id, created_at, updated_at, revision
         FROM teams
         WHERE organization_id = ? AND lower(name) = lower(?)`,
      )
      .get(organizationId, name);
    return row ? mapTeam(row) : undefined;
  }

  list(context: ReadContext, organizationId: string): readonly Team[] {
    return requireSqliteConnection(context)
      .prepare<[string], TeamRow>(
        `SELECT id, organization_id, name, created_by_user_id, created_at, updated_at, revision
         FROM teams
         WHERE organization_id = ?
         ORDER BY created_at ASC, id ASC`,
      )
      .all(organizationId)
      .map(mapTeam);
  }
}

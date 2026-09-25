import type {
  ReadContext,
  Organization,
  OrganizationRepository,
  WriteContext,
} from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface OrganizationRow {
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
  SELECT organizations.id AS id,
         organizations.installation_id AS installation_id,
         organizations.slug AS slug,
         organizations.name AS name,
         organizations.created_by_user_id AS created_by_user_id,
         organizations.created_at AS created_at,
         organizations.updated_at AS updated_at,
         organizations.archived_at AS archived_at,
         organizations.deleted_at AS deleted_at,
         organizations.revision AS revision
  FROM organizations`;

function mapOrganization(row: OrganizationRow): Organization {
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

export class SqliteOrganizationRepository implements OrganizationRepository {
  create(context: WriteContext, organization: Organization): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO organizations (
          id, installation_id, slug, name, created_by_user_id,
          created_at, updated_at, archived_at, deleted_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        organization.id,
        organization.installationId,
        organization.slug,
        organization.name,
        organization.createdByUserId,
        organization.createdAt,
        organization.updatedAt,
        organization.archivedAt ?? null,
        organization.deletedAt ?? null,
        organization.revision,
      );
  }

  findById(context: ReadContext, organizationId: string): Organization | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], OrganizationRow>(`${selection} WHERE organizations.id = ?`)
      .get(organizationId);
    return row ? mapOrganization(row) : undefined;
  }

  findByName(context: ReadContext, installationId: string, name: string): Organization | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], OrganizationRow>(
        `${selection}
         WHERE organizations.installation_id = ? AND lower(organizations.name) = lower(?)`,
      )
      .get(installationId, name);
    return row ? mapOrganization(row) : undefined;
  }

  findBySlug(context: ReadContext, installationId: string, slug: string): Organization | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string, string], OrganizationRow>(
        `${selection} WHERE organizations.installation_id = ? AND organizations.slug = ?`,
      )
      .get(installationId, slug);
    return row ? mapOrganization(row) : undefined;
  }

  listForUser(context: ReadContext, userId: string): readonly Organization[] {
    return requireSqliteConnection(context)
      .prepare<[string], OrganizationRow>(
        `${selection}
         INNER JOIN organization_members member ON member.organization_id = organizations.id
         WHERE member.user_id = ? AND member.state = 'active' AND organizations.deleted_at IS NULL
         ORDER BY organizations.created_at ASC, organizations.id ASC`,
      )
      .all(userId)
      .map(mapOrganization);
  }

  updateName(
    context: WriteContext,
    input: Readonly<{
      name: string;
      revision: number;
      updatedAt: number;
      organizationId: string;
    }>,
  ): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE organizations
         SET name = ?, updated_at = ?, revision = ?
         WHERE id = ?`,
      )
      .run(input.name, input.updatedAt, input.revision, input.organizationId);
  }
}

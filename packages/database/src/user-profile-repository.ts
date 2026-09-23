import type { ReadContext, UserProfile, UserProfileRepository, WriteContext } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface ProfileRow {
  readonly avatar_asset_id: string | null;
  readonly created_at: number;
  readonly current_organization_id: string | null;
  readonly display_name: string;
  readonly locale: string;
  readonly revision: number;
  readonly time_zone: string;
  readonly updated_at: number;
  readonly user_id: string;
}

function mapProfile(row: ProfileRow): UserProfile {
  return Object.freeze({
    ...(row.avatar_asset_id ? { avatarAssetId: row.avatar_asset_id } : {}),
    createdAt: row.created_at,
    ...(row.current_organization_id ? { currentOrganizationId: row.current_organization_id } : {}),
    displayName: row.display_name,
    locale: row.locale,
    revision: row.revision,
    timeZone: row.time_zone,
    updatedAt: row.updated_at,
    userId: row.user_id,
  });
}

export class SqliteUserProfileRepository implements UserProfileRepository {
  create(context: WriteContext, profile: UserProfile): void {
    requireSqliteConnection(context)
      .prepare(
        `INSERT INTO user_profiles (
          user_id, display_name, avatar_asset_id, locale, time_zone,
          current_organization_id, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        profile.userId,
        profile.displayName,
        profile.avatarAssetId ?? null,
        profile.locale,
        profile.timeZone,
        profile.currentOrganizationId ?? null,
        profile.createdAt,
        profile.updatedAt,
        profile.revision,
      );
  }

  findByUserId(context: ReadContext, userId: string): UserProfile | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], ProfileRow>(
        `SELECT user_id, display_name, avatar_asset_id, locale, time_zone,
                current_organization_id, created_at, updated_at, revision
         FROM user_profiles WHERE user_id = ?`,
      )
      .get(userId);
    return row ? mapProfile(row) : undefined;
  }

  setCurrentOrganization(
    context: WriteContext,
    input: Readonly<{ updatedAt: number; userId: string; organizationId: string }>,
  ): void {
    const result = requireSqliteConnection(context)
      .prepare(
        `UPDATE user_profiles
         SET current_organization_id = ?, updated_at = ?, revision = revision + 1
         WHERE user_id = ?`,
      )
      .run(input.organizationId, input.updatedAt, input.userId);
    if (result.changes !== 1) throw new Error("User profile was not found.");
  }
}

import type {
  OrganizationRegistrationCompletion,
  OrganizationRegistrationRepository,
  OrganizationRegistrationReservation,
  OrganizationRegistrationScope,
  WriteContext,
} from "@launchpp/core";

import { requireSqliteConnection } from "./context.js";
import type { SqliteDatabase } from "./sqlite-database.js";

interface RegistrationRow {
  readonly request_hash: string;
  readonly result_json: null | string;
  readonly state: "completed" | "pending";
}

const retentionMs = 24 * 60 * 60 * 1_000;

function parseCompletion(value: string): OrganizationRegistrationCompletion {
  const result = JSON.parse(value) as Partial<OrganizationRegistrationCompletion>;
  if (
    !result.organization ||
    typeof result.organization.id !== "string" ||
    typeof result.organization.name !== "string" ||
    typeof result.organization.slug !== "string" ||
    typeof result.ownerUserId !== "string" ||
    !result.project ||
    typeof result.project.id !== "string" ||
    typeof result.project.slug !== "string"
  ) {
    throw new Error("Completed organization registration has an invalid result.");
  }
  return Object.freeze({
    organization: Object.freeze({
      id: result.organization.id,
      name: result.organization.name,
      slug: result.organization.slug,
    }),
    ownerUserId: result.ownerUserId,
    project: Object.freeze({
      id: result.project.id,
      slug: result.project.slug,
    }),
  });
}

export class SqliteOrganizationRegistrationRepository
  implements OrganizationRegistrationRepository
{
  constructor(
    private readonly database: SqliteDatabase,
    private readonly clock: () => number = Date.now,
  ) {}

  reserve(scope: OrganizationRegistrationScope): Promise<OrganizationRegistrationReservation> {
    return this.database.write((context) => {
      const connection = requireSqliteConnection(context);
      const now = this.clock();
      connection
        .prepare("DELETE FROM organization_registration_commands WHERE expires_at <= ?")
        .run(now);
      const existing = connection
        .prepare<[string, string], RegistrationRow>(
          `SELECT request_hash, state, result_json
           FROM organization_registration_commands
           WHERE installation_id = ? AND idempotency_key = ?`,
        )
        .get(scope.installationId, scope.key);

      if (existing) {
        if (existing.request_hash !== scope.requestHash) return { kind: "conflict" };
        if (existing.state === "pending") return { kind: "in_progress" };
        if (existing.result_json === null) {
          throw new Error("Completed organization registration is missing its result.");
        }
        return { kind: "completed", result: parseCompletion(existing.result_json) };
      }

      connection
        .prepare(
          `INSERT INTO organization_registration_commands (
             installation_id, idempotency_key, request_hash, state, result_json,
             created_at, updated_at, expires_at
           ) VALUES (?, ?, ?, 'pending', NULL, ?, ?, ?)`,
        )
        .run(scope.installationId, scope.key, scope.requestHash, now, now, now + retentionMs);
      return { kind: "started" };
    });
  }

  complete(
    context: WriteContext,
    scope: OrganizationRegistrationScope,
    result: OrganizationRegistrationCompletion,
    completedAt: number,
  ): void {
    const update = requireSqliteConnection(context)
      .prepare(
        `UPDATE organization_registration_commands
         SET state = 'completed', result_json = ?, updated_at = ?
         WHERE installation_id = ? AND idempotency_key = ?
           AND request_hash = ? AND state = 'pending'`,
      )
      .run(JSON.stringify(result), completedAt, scope.installationId, scope.key, scope.requestHash);
    if (update.changes !== 1) {
      throw new Error("Organization registration reservation was not completed.");
    }
  }

  abandon(scope: OrganizationRegistrationScope): Promise<void> {
    return this.database.write((context) => {
      requireSqliteConnection(context)
        .prepare(
          `DELETE FROM organization_registration_commands
           WHERE installation_id = ? AND idempotency_key = ?
             AND request_hash = ? AND state = 'pending'`,
        )
        .run(scope.installationId, scope.key, scope.requestHash);
    });
  }
}

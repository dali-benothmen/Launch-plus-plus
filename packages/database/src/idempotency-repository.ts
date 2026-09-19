import type { SqliteDatabase } from "./sqlite-database.js";
import { requireSqliteConnection } from "./context.js";

export interface IdempotencyScope {
  readonly actorUserId: string;
  readonly key: string;
  readonly operation: string;
  readonly requestHash: string;
  readonly scopeKey: string;
}

export type IdempotencyReservation =
  | { readonly kind: "started" }
  | { readonly kind: "conflict" }
  | { readonly kind: "in_progress" }
  | { readonly body: unknown; readonly kind: "replay"; readonly status: number };

interface IdempotencyRow {
  readonly request_hash: string;
  readonly response_json: null | string;
  readonly response_status: null | number;
  readonly state: "completed" | "pending";
}

const retentionMs = 24 * 60 * 60 * 1_000;

export class SqliteIdempotencyRepository {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly clock: () => number = Date.now,
  ) {}

  reserve(scope: IdempotencyScope): Promise<IdempotencyReservation> {
    return this.database.write((context) => {
      const connection = requireSqliteConnection(context);
      const now = this.clock();
      connection.prepare("DELETE FROM idempotency_records WHERE expires_at <= ?").run(now);
      const existing = connection
        .prepare<[string, string, string, string], IdempotencyRow>(
          `SELECT request_hash, state, response_status, response_json
           FROM idempotency_records
           WHERE actor_user_id = ? AND scope_key = ? AND operation = ? AND idempotency_key = ?`,
        )
        .get(scope.actorUserId, scope.scopeKey, scope.operation, scope.key);

      if (existing) {
        if (existing.request_hash !== scope.requestHash) return { kind: "conflict" };
        if (existing.state === "pending") return { kind: "in_progress" };
        if (existing.response_status === null || existing.response_json === null) {
          throw new Error("Completed idempotency record is missing its response");
        }
        return {
          body: JSON.parse(existing.response_json) as unknown,
          kind: "replay",
          status: existing.response_status,
        };
      }

      connection
        .prepare(
          `INSERT INTO idempotency_records (
             actor_user_id, scope_key, operation, idempotency_key, request_hash, state,
             response_status, response_json, created_at, updated_at, expires_at
           ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?, ?)`,
        )
        .run(
          scope.actorUserId,
          scope.scopeKey,
          scope.operation,
          scope.key,
          scope.requestHash,
          now,
          now,
          now + retentionMs,
        );
      return { kind: "started" };
    });
  }

  complete(scope: IdempotencyScope, status: number, body: unknown): Promise<void> {
    return this.database.write((context) => {
      const result = requireSqliteConnection(context)
        .prepare(
          `UPDATE idempotency_records
           SET state = 'completed', response_status = ?, response_json = ?, updated_at = ?
           WHERE actor_user_id = ? AND scope_key = ? AND operation = ?
             AND idempotency_key = ? AND request_hash = ? AND state = 'pending'`,
        )
        .run(
          status,
          JSON.stringify(body),
          this.clock(),
          scope.actorUserId,
          scope.scopeKey,
          scope.operation,
          scope.key,
          scope.requestHash,
        );
      if (result.changes !== 1) throw new Error("Idempotency reservation was not completed");
    });
  }

  abandon(scope: IdempotencyScope): Promise<void> {
    return this.database.write((context) => {
      requireSqliteConnection(context)
        .prepare(
          `DELETE FROM idempotency_records
           WHERE actor_user_id = ? AND scope_key = ? AND operation = ?
             AND idempotency_key = ? AND request_hash = ? AND state = 'pending'`,
        )
        .run(scope.actorUserId, scope.scopeKey, scope.operation, scope.key, scope.requestHash);
    });
  }
}

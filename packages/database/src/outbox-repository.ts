import type { OutboxMessage, OutboxWriter, ReadContext, WriteContext } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface CountRow {
  count: number;
}

interface OutboxRow {
  readonly attempts: number;
  readonly available_at: number;
  readonly correlation_id: string;
  readonly id: string;
  readonly installation_id: string;
  readonly occurred_at: number;
  readonly payload_json: string;
  readonly topic: string;
}

export interface LeasedOutboxMessage extends OutboxMessage {
  readonly attempts: number;
}

function mapOutbox(row: OutboxRow): LeasedOutboxMessage {
  return Object.freeze({
    attempts: row.attempts,
    availableAt: row.available_at,
    correlationId: row.correlation_id,
    id: row.id,
    installationId: row.installation_id,
    occurredAt: row.occurred_at,
    payload: JSON.parse(row.payload_json) as Readonly<Record<string, unknown>>,
    topic: row.topic,
  });
}

export class SqliteOutboxRepository implements OutboxWriter {
  append(context: WriteContext, message: OutboxMessage): void {
    requireSqliteConnection(context)
      .prepare<[string, string, string, string, number, number, string]>(
        `INSERT INTO outbox_messages (
          id, installation_id, topic, payload_json, occurred_at, available_at, correlation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        message.id,
        message.installationId,
        message.topic,
        JSON.stringify(message.payload),
        message.occurredAt,
        message.availableAt,
        message.correlationId,
      );
  }

  countPending(context: ReadContext): number {
    const row = requireSqliteConnection(context)
      .prepare<[], CountRow>(
        "SELECT count(*) AS count FROM outbox_messages WHERE processed_at IS NULL",
      )
      .get();
    return row?.count ?? 0;
  }

  lease(
    context: WriteContext,
    input: Readonly<{ leaseOwner: string; leaseUntil: number; limit: number; now: number }>,
  ): readonly LeasedOutboxMessage[] {
    return requireSqliteConnection(context)
      .prepare<[string, number, number, number, number], OutboxRow>(
        `UPDATE outbox_messages
         SET attempts = attempts + 1, lease_owner = ?, leased_until = ?
         WHERE id IN (
           SELECT id FROM outbox_messages
           WHERE processed_at IS NULL AND available_at <= ?
             AND (leased_until IS NULL OR leased_until <= ?)
           ORDER BY occurred_at ASC, id ASC
           LIMIT ?
         )
         RETURNING id, installation_id, topic, payload_json, occurred_at, available_at,
                   correlation_id, attempts`,
      )
      .all(input.leaseOwner, input.leaseUntil, input.now, input.now, input.limit)
      .map(mapOutbox);
  }

  complete(
    context: WriteContext,
    messageId: string,
    leaseOwner: string,
    processedAt: number,
  ): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE outbox_messages
         SET processed_at = ?, lease_owner = NULL, leased_until = NULL
         WHERE id = ? AND lease_owner = ? AND processed_at IS NULL`,
      )
      .run(processedAt, messageId, leaseOwner);
  }

  retry(
    context: WriteContext,
    input: Readonly<{
      availableAt: number;
      leaseOwner: string;
      messageId: string;
    }>,
  ): void {
    requireSqliteConnection(context)
      .prepare(
        `UPDATE outbox_messages
         SET available_at = ?, lease_owner = NULL, leased_until = NULL
         WHERE id = ? AND lease_owner = ? AND processed_at IS NULL`,
      )
      .run(input.availableAt, input.messageId, input.leaseOwner);
  }
}

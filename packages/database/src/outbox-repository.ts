import type { OutboxMessage, OutboxWriter, ReadContext, WriteContext } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface CountRow {
  count: number;
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
}

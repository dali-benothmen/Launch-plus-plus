import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const installations = sqliteTable("installations", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
});

export const outboxMessages = sqliteTable(
  "outbox_messages",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => installations.id, { onDelete: "restrict" }),
    topic: text("topic").notNull(),
    payloadJson: text("payload_json").notNull(),
    occurredAt: integer("occurred_at").notNull(),
    availableAt: integer("available_at").notNull(),
    correlationId: text("correlation_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    leasedUntil: integer("leased_until"),
    processedAt: integer("processed_at"),
  },
  (table) => [
    index("outbox_pending_idx").on(table.processedAt, table.availableAt),
    index("outbox_installation_idx").on(table.installationId, table.occurredAt),
  ],
);

export const databaseSchema = { installations, outboxMessages };

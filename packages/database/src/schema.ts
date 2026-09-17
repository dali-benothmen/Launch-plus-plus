import { index, integer, sqliteTable, text, customType } from "drizzle-orm/sqlite-core";

const authDate = customType<{ data: Date; driverData: string }>({
  dataType: () => "date",
  fromDriver: (value) => new Date(value),
  toDriver: (value) => value.toISOString(),
});

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

export const authUsers = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: authDate("createdAt").notNull(),
  updatedAt: authDate("updatedAt").notNull(),
});

export const authSessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: authDate("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: authDate("createdAt").notNull(),
    updatedAt: authDate("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const authAccounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: authDate("accessTokenExpiresAt"),
    refreshTokenExpiresAt: authDate("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: authDate("createdAt").notNull(),
    updatedAt: authDate("updatedAt").notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const authVerifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: authDate("expiresAt").notNull(),
    createdAt: authDate("createdAt").notNull(),
    updatedAt: authDate("updatedAt").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const databaseSchema = {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  installations,
  outboxMessages,
};

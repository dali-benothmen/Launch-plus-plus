import Database from "better-sqlite3";

import { createAuthOptions } from "./auth-options.js";
import { BetterAuthIdentityAdapter, type BetterAuthIdentityStorage } from "./identity-adapter.js";

export interface OpenBetterAuthIdentityAdapterInput {
  readonly baseUrl: string;
  readonly databasePath: string;
  readonly secret: string;
}

export interface OpenedBetterAuthIdentityAdapter {
  readonly adapter: BetterAuthIdentityAdapter;
  close(): void;
}

interface IdentityRow {
  readonly email: string;
  readonly emailVerified: number;
  readonly id: string;
  readonly image: string | null;
  readonly name: string;
}

export function openBetterAuthIdentityAdapter(
  input: OpenBetterAuthIdentityAdapterInput,
): OpenedBetterAuthIdentityAdapter {
  const database = new Database(input.databasePath, { fileMustExist: true });
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  database.pragma("journal_mode = WAL");
  database.pragma("synchronous = NORMAL");

  const storage: BetterAuthIdentityStorage = {
    deleteUser(userId) {
      database.prepare("DELETE FROM user WHERE id = ?").run(userId);
    },
    findUserByEmail(email) {
      const row = database
        .prepare<[string], IdentityRow>(
          "SELECT id, name, email, emailVerified, image FROM user WHERE email = ?",
        )
        .get(email);
      if (!row) return undefined;
      return Object.freeze({
        email: row.email,
        emailVerified: row.emailVerified === 1,
        id: row.id,
        ...(row.image ? { imageUrl: row.image } : {}),
        name: row.name,
      });
    },
  };
  const adapter = new BetterAuthIdentityAdapter(
    createAuthOptions({
      baseUrl: input.baseUrl,
      database,
      secret: input.secret,
    }),
    input.baseUrl,
    storage,
  );
  let closed = false;
  return Object.freeze({
    adapter,
    close() {
      if (closed) return;
      closed = true;
      database.close();
    },
  });
}

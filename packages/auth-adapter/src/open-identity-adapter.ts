import Database from "better-sqlite3";

import { createAuthOptions } from "./auth-options.js";
import { BetterAuthIdentityAdapter } from "./identity-adapter.js";

export interface OpenBetterAuthIdentityAdapterInput {
  readonly baseUrl: string;
  readonly databasePath: string;
  readonly secret: string;
}

export interface OpenedBetterAuthIdentityAdapter {
  readonly adapter: BetterAuthIdentityAdapter;
  close(): void;
}

export function openBetterAuthIdentityAdapter(
  input: OpenBetterAuthIdentityAdapterInput,
): OpenedBetterAuthIdentityAdapter {
  const database = new Database(input.databasePath, { fileMustExist: true });
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  database.pragma("journal_mode = WAL");
  database.pragma("synchronous = NORMAL");

  const adapter = new BetterAuthIdentityAdapter(
    createAuthOptions({
      baseUrl: input.baseUrl,
      database,
      secret: input.secret,
    }),
    input.baseUrl,
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

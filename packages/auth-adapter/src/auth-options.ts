import type Database from "better-sqlite3";
import type { BetterAuthOptions } from "better-auth";

export interface CreateAuthOptionsInput {
  readonly baseUrl: string;
  readonly database: Database.Database;
  readonly secret: string;
  readonly secureCookies?: boolean;
}

export function createAuthOptions(input: CreateAuthOptionsInput): BetterAuthOptions {
  const origin = new URL(input.baseUrl).origin;
  return {
    advanced: {
      cookiePrefix: "launchpp",
      useSecureCookies: input.secureCookies ?? new URL(origin).protocol === "https:",
    },
    basePath: "/api/auth",
    baseURL: origin,
    database: input.database,
    emailAndPassword: {
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 12,
    },
    secret: input.secret,
    session: {
      cookieCache: { enabled: false },
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    telemetry: { enabled: false },
    trustedOrigins: [origin],
  };
}

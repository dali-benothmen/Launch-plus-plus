import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { openSqliteDatabase } from "@launchpp/database";
import { createAuthOptions } from "./auth-options.js";
import { registerBetterAuthRoutes } from "./fastify-routes.js";
import { BetterAuthIdentityAdapter } from "./identity-adapter.js";

const baseUrl = "https://launchpp.test";
const resources: Array<{
  app: FastifyInstance;
  database: Database.Database;
  root: string;
}> = [];

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "launchpp-identity-"));
  const filePath = path.join(root, "identity.sqlite");
  const migratedDatabase = openSqliteDatabase({ filePath });
  await migratedDatabase.close();

  const database = new Database(filePath);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  const options = createAuthOptions({
    baseUrl,
    database,
    secret: "test-only-secret-that-is-at-least-thirty-two-characters",
    secureCookies: true,
  });
  const adapter = new BetterAuthIdentityAdapter(options, baseUrl);
  const app = Fastify({ logger: false });
  await registerBetterAuthRoutes(app, adapter);
  resources.push({ app, database, root });
  return { adapter, app, database };
}

function cookieFrom(setCookie: string | string[] | undefined): string {
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return values
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

afterEach(async () => {
  for (const resource of resources.splice(0)) {
    await resource.app.close();
    resource.database.close();
    await rm(resource.root, { recursive: true });
  }
});

describe("Better Auth identity adapter", () => {
  it("creates a secure cookie session and maps it to the public identity port", async () => {
    const { adapter, app, database } = await createFixture();
    const signUp = await app.inject({
      headers: { origin: baseUrl },
      method: "POST",
      payload: {
        email: "owner@example.test",
        name: "Launch Owner",
        password: "correct-horse-battery-staple",
      },
      url: "/api/auth/sign-up/email",
    });

    expect(signUp.statusCode).toBe(200);
    const setCookie = signUp.headers["set-cookie"];
    const serialized = Array.isArray(setCookie) ? setCookie.join("\n") : setCookie;
    expect(serialized).toMatch(/HttpOnly/i);
    expect(serialized).toMatch(/SameSite=Lax/i);
    expect(serialized).toMatch(/Secure/i);

    const cookie = cookieFrom(setCookie);
    const session = await adapter.resolveSession(new Headers({ cookie }));
    expect(session).toMatchObject({
      identity: {
        email: "owner@example.test",
        emailVerified: false,
        name: "Launch Owner",
      },
    });
    expect(session?.id).toBeTruthy();
    expect(session?.expiresAt).toBeGreaterThan(Date.now());

    const storedAccount = database
      .prepare<[], { password: string }>("SELECT password FROM account LIMIT 1")
      .get();
    expect(storedAccount?.password).toBeTruthy();
    expect(storedAccount?.password).not.toContain("correct-horse-battery-staple");
  });

  it("rejects a tampered session and resolves a revoked session as anonymous", async () => {
    const { adapter, app } = await createFixture();
    const signUp = await app.inject({
      headers: { origin: baseUrl },
      method: "POST",
      payload: {
        email: "owner@example.test",
        name: "Launch Owner",
        password: "correct-horse-battery-staple",
      },
      url: "/api/auth/sign-up/email",
    });
    const cookie = cookieFrom(signUp.headers["set-cookie"]);
    const tampered = `${cookie.slice(0, -1)}${cookie.endsWith("a") ? "b" : "a"}`;
    await expect(adapter.resolveSession(new Headers({ cookie: tampered }))).resolves.toBeNull();

    const signOut = await app.inject({
      headers: { cookie, origin: baseUrl },
      method: "POST",
      url: "/api/auth/sign-out",
    });
    expect(signOut.statusCode).toBe(200);
    await expect(adapter.resolveSession(new Headers({ cookie }))).resolves.toBeNull();
  });

  it("does not cache identity state in a client-readable session-data cookie", async () => {
    const { app } = await createFixture();
    const signUp = await app.inject({
      headers: { origin: baseUrl },
      method: "POST",
      payload: {
        email: "owner@example.test",
        name: "Launch Owner",
        password: "correct-horse-battery-staple",
      },
      url: "/api/auth/sign-up/email",
    });
    const serialized = Array.isArray(signUp.headers["set-cookie"])
      ? signUp.headers["set-cookie"].join("\n")
      : (signUp.headers["set-cookie"] ?? "");

    expect(serialized).toContain("session_token");
    expect(serialized).not.toContain("session_data");
  });

  it("rejects authentication mutations from an untrusted origin", async () => {
    const { app } = await createFixture();
    const response = await app.inject({
      headers: { origin: "https://attacker.example" },
      method: "POST",
      payload: {
        email: "owner@example.test",
        name: "Launch Owner",
        password: "correct-horse-battery-staple",
      },
      url: "/api/auth/sign-up/email",
    });

    expect(response.statusCode).toBe(403);
  });
});

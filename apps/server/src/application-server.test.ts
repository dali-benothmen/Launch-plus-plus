import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { CreateInstallationService } from "@launchpp/core";
import { SqliteInstallationRepository, SqliteOutboxRepository } from "@launchpp/database";

import { buildApplicationServer } from "./application-server.js";
import { loadServerConfig } from "./config.js";
import { createReadiness } from "./readiness.js";

const roots: string[] = [];
const servers: FastifyInstance[] = [];

async function createProductionConfig() {
  const root = await mkdtemp(path.join(tmpdir(), "launchpp-application-"));
  roots.push(root);
  return loadServerConfig({
    LAUNCHPP_AUTH_SECRET: "production-test-secret-with-more-than-thirty-two-characters",
    LAUNCHPP_BASE_URL: "https://launchpp.test",
    LAUNCHPP_DATABASE_PATH: path.join(root, "launchpp.sqlite"),
    NODE_ENV: "production",
  });
}

function cookieFrom(setCookie: string | string[] | undefined): string {
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return values
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

afterEach(async () => {
  await Promise.allSettled(servers.splice(0).map((server) => server.close()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true })));
});

describe("application server composition", () => {
  it("opens a migrated production database and releases every connection on close", async () => {
    const config = await createProductionConfig();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const readiness = createReadiness();
      const app = await buildApplicationServer({ config, logger: false, readiness });
      servers.push(app);
      await app.ready();
      readiness.markReady();

      const response = await app.inject({ method: "GET", url: "/health/ready" });
      expect(response.statusCode).toBe(200);
      await app.close();
      servers.pop();
    }
  });

  it("carries an authenticated HTTP request through a service, repository, and outbox", async () => {
    const config = await createProductionConfig();
    const readiness = createReadiness();
    const installations = new SqliteInstallationRepository();
    const outbox = new SqliteOutboxRepository();
    let inspectState: (() => { installationExists: boolean; pendingEvents: number }) | undefined;
    let nextId = 0;

    const app = await buildApplicationServer({
      config,
      logger: false,
      readiness,
      configure: async (server, resources) => {
        const service = new CreateInstallationService({
          clock: () => 1_750_000_000_000,
          generateId: () => `generated-${++nextId}`,
          installations,
          outbox,
          transactions: resources.database,
        });
        inspectState = () =>
          resources.database.read((context) => ({
            installationExists:
              installations.findById(context, "generated-1")?.id === "generated-1",
            pendingEvents: outbox.countPending(context),
          }));

        server.post("/api/foundation/installation-proof", async (request, reply) => {
          const headers = new Headers();
          if (request.headers.cookie) headers.set("cookie", request.headers.cookie);
          const session = await resources.identity.resolveSession(headers);
          if (!session) {
            return reply.status(401).send({ code: "unauthenticated" });
          }
          const installation = await service.execute({
            actorId: session.identity.id,
            correlationId: request.id,
          });
          return reply.status(201).send(installation);
        });
      },
    });
    servers.push(app);
    await app.ready();
    readiness.markReady();

    const rejected = await app.inject({
      headers: { origin: config.baseUrl },
      method: "POST",
      url: "/api/foundation/installation-proof",
    });
    expect(rejected.statusCode).toBe(401);
    expect(inspectState?.()).toEqual({ installationExists: false, pendingEvents: 0 });

    const signUp = await app.inject({
      headers: { origin: config.baseUrl },
      method: "POST",
      payload: {
        email: "owner@example.test",
        name: "Launch Owner",
        password: "correct-horse-battery-staple",
      },
      url: "/api/auth/sign-up/email",
    });
    expect(signUp.statusCode).toBe(200);
    const serializedCookies = Array.isArray(signUp.headers["set-cookie"])
      ? signUp.headers["set-cookie"].join("\n")
      : (signUp.headers["set-cookie"] ?? "");
    expect(serializedCookies).toContain("Secure");

    const created = await app.inject({
      headers: { cookie: cookieFrom(signUp.headers["set-cookie"]), origin: config.baseUrl },
      method: "POST",
      url: "/api/foundation/installation-proof",
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toEqual({ createdAt: 1_750_000_000_000, id: "generated-1" });
    expect(inspectState?.()).toEqual({ installationExists: true, pendingEvents: 1 });
  });
});

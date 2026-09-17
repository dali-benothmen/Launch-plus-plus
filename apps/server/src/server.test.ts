import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { loadServerConfig } from "./config.js";
import { createReadiness } from "./readiness.js";
import { buildServer } from "./server.js";

const openServers: FastifyInstance[] = [];

async function createTestServer(overrides: NodeJS.ProcessEnv = {}) {
  const readiness = createReadiness();
  const config = loadServerConfig({
    NODE_ENV: "test",
    LAUNCHPP_BASE_URL: "http://launchpp.test",
    ...overrides,
  });
  const app = await buildServer({ config, logger: false, readiness });
  openServers.push(app);
  return { app, readiness };
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((app) => app.close()));
});

describe("server transport foundation", () => {
  it("reports liveness separately from mutable readiness", async () => {
    const { app, readiness } = await createTestServer();

    const live = await app.inject({ method: "GET", url: "/health/live" });
    expect(live.statusCode).toBe(200);
    expect(live.json()).toEqual({ status: "ok" });
    expect(live.headers["x-content-type-options"]).toBe("nosniff");

    const unavailable = await app.inject({ method: "GET", url: "/health/ready" });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json()).toEqual({ status: "not_ready" });

    readiness.markReady();
    const ready = await app.inject({ method: "GET", url: "/health/ready" });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ status: "ready" });
  });

  it("accepts bounded correlation IDs and replaces invalid values", async () => {
    const { app } = await createTestServer();
    const accepted = await app.inject({
      headers: { "x-request-id": "client-request:42" },
      method: "GET",
      url: "/health/live",
    });
    expect(accepted.headers["x-request-id"]).toBe("client-request:42");

    const rejected = await app.inject({
      headers: { "x-request-id": "not valid because it contains spaces" },
      method: "GET",
      url: "/health/live",
    });
    expect(rejected.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects state changes without the canonical browser origin", async () => {
    const { app } = await createTestServer();
    app.post("/mutation", async () => ({ changed: true }));

    const missing = await app.inject({ method: "POST", url: "/mutation" });
    expect(missing.statusCode).toBe(403);
    expect(missing.json()).toMatchObject({ code: "origin_rejected", status: 403 });

    const crossOrigin = await app.inject({
      headers: { origin: "https://attacker.example" },
      method: "POST",
      url: "/mutation",
    });
    expect(crossOrigin.statusCode).toBe(403);

    const sameOrigin = await app.inject({
      headers: { origin: "http://launchpp.test" },
      method: "POST",
      url: "/mutation",
    });
    expect(sameOrigin.statusCode).toBe(200);
  });

  it("maps missing and unexpected failures to safe problem details", async () => {
    const { app } = await createTestServer();
    app.get("/failure", async () => {
      throw new Error("database password must never escape");
    });

    const missing = await app.inject({ method: "GET", url: "/missing" });
    expect(missing.statusCode).toBe(404);
    expect(missing.headers["content-type"]).toContain("application/problem+json");
    expect(missing.json()).toMatchObject({ code: "route_not_found", status: 404 });

    const failure = await app.inject({ method: "GET", url: "/failure" });
    expect(failure.statusCode).toBe(500);
    expect(failure.body).not.toContain("database password");
    expect(failure.json()).toMatchObject({ code: "internal_error", status: 500 });
  });

  it("applies a configurable baseline rate limit", async () => {
    const { app } = await createTestServer({ LAUNCHPP_RATE_LIMIT_MAX: "2" });
    app.get("/limited", async () => ({ ok: true }));

    expect((await app.inject({ method: "GET", url: "/limited" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/limited" })).statusCode).toBe(200);
    const limited = await app.inject({ method: "GET", url: "/limited" });
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toMatchObject({ code: "rate_limit_exceeded", status: 429 });
  });
});

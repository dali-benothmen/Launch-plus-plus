import type { FastifyInstance } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { startServer } from "./lifecycle.js";

function createFakeServer() {
  const close = vi.fn(async () => undefined);
  const listen = vi.fn(async () => "http://127.0.0.1:3000");
  const app = {
    close,
    listen,
    log: { error: vi.fn(), info: vi.fn() },
  } as unknown as FastifyInstance;
  return { app, close, listen };
}

describe("server lifecycle", () => {
  it("validates configuration before constructing or listening", async () => {
    const build = vi.fn();

    await expect(
      startServer({
        build,
        environment: { NODE_ENV: "production", LAUNCHPP_BASE_URL: "http://unsafe.test" },
      }),
    ).rejects.toThrowError(/must use HTTPS/);
    expect(build).not.toHaveBeenCalled();
  });

  it("becomes ready after listening and becomes unavailable before closing", async () => {
    const { app, close, listen } = createFakeServer();
    const running = await startServer({
      build: async () => app,
      environment: { NODE_ENV: "test" },
    });

    expect(listen).toHaveBeenCalledOnce();
    expect(running.readiness.isReady()).toBe(true);

    const firstStop = running.stop("test");
    expect(running.readiness.isReady()).toBe(false);
    await firstStop;
    await running.stop("duplicate");
    expect(close).toHaveBeenCalledOnce();
  });

  it("cleans up a constructed server when listening fails", async () => {
    const { app, close, listen } = createFakeServer();
    listen.mockRejectedValueOnce(new Error("address unavailable"));

    await expect(
      startServer({ build: async () => app, environment: { NODE_ENV: "test" } }),
    ).rejects.toThrowError("address unavailable");
    expect(close).toHaveBeenCalledOnce();
  });
});

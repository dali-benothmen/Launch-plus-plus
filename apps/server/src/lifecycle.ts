import type { FastifyInstance } from "fastify";
import { loadServerConfig, type ServerConfig } from "./config.js";
import { createReadiness, type Readiness } from "./readiness.js";
import { buildServer, type BuildServerOptions } from "./server.js";

export interface RunningServer {
  readonly app: FastifyInstance;
  readonly config: ServerConfig;
  readonly readiness: Readiness;
  stop(reason?: string): Promise<void>;
}

export interface StartServerOptions {
  readonly build?: (options: BuildServerOptions) => Promise<FastifyInstance>;
  readonly environment?: NodeJS.ProcessEnv;
}

async function closeWithin(app: FastifyInstance, timeoutMs: number): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      app.close(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Server shutdown exceeded ${timeoutMs}ms`)),
          timeoutMs,
        );
        timeout.unref();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function startServer(options: StartServerOptions = {}): Promise<RunningServer> {
  const config = loadServerConfig(options.environment);
  const readiness = createReadiness();
  const app = await (options.build ?? buildServer)({ config, readiness });
  try {
    await app.listen({ host: config.bindAddress, port: config.port });
  } catch (error) {
    readiness.markNotReady();
    await app.close().catch((closeError: unknown) => {
      app.log.error({ err: closeError }, "server cleanup after startup failure failed");
    });
    throw error;
  }
  readiness.markReady();

  let stopping: Promise<void> | undefined;
  return Object.freeze({
    app,
    config,
    readiness,
    stop(reason = "requested") {
      if (stopping) return stopping;
      readiness.markNotReady();
      app.log.info({ reason }, "server shutdown started");
      stopping = closeWithin(app, config.shutdownGraceMs);
      return stopping;
    },
  });
}

export function installSignalHandlers(server: RunningServer): () => void {
  const handleSignal = (signal: NodeJS.Signals) => {
    void server.stop(signal).catch((error: unknown) => {
      server.app.log.error({ err: error, signal }, "server shutdown failed");
      process.exitCode = 1;
    });
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);
  return () => {
    process.off("SIGINT", handleSignal);
    process.off("SIGTERM", handleSignal);
  };
}

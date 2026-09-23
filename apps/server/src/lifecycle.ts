import type { FastifyInstance } from "fastify";
import { buildApplicationServer } from "./application-server.js";
import { loadServerConfig, type ServerConfig } from "./config.js";
import { createReadiness, type Readiness } from "./readiness.js";
import type { BuildServerOptions } from "./server.js";

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
  const closing = app.close();
  try {
    await Promise.race([
      closing,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Server shutdown exceeded ${timeoutMs}ms`)),
          timeoutMs,
        );
        timeout.unref();
      }),
    ]);
  } catch (error) {
    app.server.closeAllConnections?.();
    await closing.catch(() => undefined);
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function startServer(options: StartServerOptions = {}): Promise<RunningServer> {
  const config = loadServerConfig(options.environment);
  const readiness = createReadiness();
  const app = await (options.build ?? buildApplicationServer)({ config, readiness });
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
  let signalReceived = false;
  const handleSignal = (signal: NodeJS.Signals) => {
    if (signalReceived) {
      server.app.log.error({ signal }, "forced shutdown requested");
      process.exitCode = 1;
      server.app.server.closeAllConnections?.();
      return;
    }
    signalReceived = true;
    void server.stop(signal).catch((error: unknown) => {
      server.app.log.error({ err: error, signal }, "server shutdown failed");
      process.exitCode = 1;
    });
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
  return () => {
    process.off("SIGINT", handleSignal);
    process.off("SIGTERM", handleSignal);
  };
}

import {
  type BetterAuthIdentityAdapter,
  openBetterAuthIdentityAdapter,
  registerBetterAuthRoutes,
} from "@launchpp/auth-adapter";
import { openSqliteDatabase, type SqliteDatabase } from "@launchpp/database";
import type { FastifyInstance } from "fastify";

import { type BuildServerOptions, buildServer } from "./server.js";
import { registerProjectRoutes } from "./project-routes.js";
import { createSetupCoordinator } from "./setup-routes.js";
import { registerWorkspaceRoutes } from "./workspace-routes.js";

export interface ApplicationResources {
  readonly database: SqliteDatabase;
  readonly identity: BetterAuthIdentityAdapter;
}

export interface BuildApplicationServerOptions extends BuildServerOptions {
  readonly configure?: (
    app: FastifyInstance,
    resources: ApplicationResources,
  ) => void | Promise<void>;
}

export async function buildApplicationServer(
  options: BuildApplicationServerOptions,
): Promise<FastifyInstance> {
  const database = openSqliteDatabase({ filePath: options.config.databasePath });
  let app: FastifyInstance | undefined;
  let identity: ReturnType<typeof openBetterAuthIdentityAdapter> | undefined;

  try {
    identity = openBetterAuthIdentityAdapter({
      baseUrl: options.config.baseUrl,
      databasePath: options.config.databasePath,
      secret: options.config.authSecret,
    });
    app = await buildServer(options);
    const setup = createSetupCoordinator({
      baseUrl: options.config.baseUrl,
      database,
      identity: identity.adapter,
    });
    await setup.register(app);
    const setupToken = setup.takeToken();
    if (setupToken) {
      app.log.warn(
        {
          expiresInMinutes: 30,
          setupUrl: `${options.config.baseUrl}/setup#token=${encodeURIComponent(setupToken)}`,
        },
        "first-owner setup link generated",
      );
    }
    await registerWorkspaceRoutes(app, { database, identity: identity.adapter });
    await registerProjectRoutes(app, { database, identity: identity.adapter });
    await registerBetterAuthRoutes(app, identity.adapter);
    app.addHook("onClose", async () => {
      identity?.close();
      await database.close();
    });
    await options.configure?.(app, { database, identity: identity.adapter });
    return app;
  } catch (error) {
    if (app) await app.close().catch(() => undefined);
    else {
      identity?.close();
      await database.close();
    }
    throw error;
  }
}

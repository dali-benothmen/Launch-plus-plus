import {
  type BetterAuthIdentityAdapter,
  openBetterAuthIdentityAdapter,
  registerBetterAuthRoutes,
} from "@launchpp/auth-adapter";
import {
  acquireInstallationLock,
  openSqliteDatabase,
  type SqliteDatabase,
} from "@launchpp/database";
import type { FastifyInstance } from "fastify";

import { registerEventRoutes } from "./event-routes.js";
import { InvalidationHub } from "./invalidation-hub.js";
import { createOutboxDispatcher } from "./outbox-dispatcher.js";
import { registerProjectRoutes } from "./project-routes.js";
import { registerSearchRoutes } from "./search-routes.js";
import { type BuildServerOptions, buildServer } from "./server.js";
import { createSetupCoordinator } from "./setup-routes.js";
import { registerStaticWeb } from "./static-web.js";
import { registerTaskRoutes } from "./task-routes.js";
import { registerOrganizationRoutes } from "./organization-routes.js";

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
  const installationLock = await acquireInstallationLock(options.config.databasePath);
  let database: SqliteDatabase | undefined;
  let app: FastifyInstance | undefined;
  let identity: ReturnType<typeof openBetterAuthIdentityAdapter> | undefined;
  let dispatcher: ReturnType<typeof createOutboxDispatcher> | undefined;
  const hub = new InvalidationHub();

  try {
    try {
      database = openSqliteDatabase({ filePath: options.config.databasePath });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Could not open or migrate the SQLite database at ${options.config.databasePath}. ${detail}`,
        { cause: error },
      );
    }
    identity = openBetterAuthIdentityAdapter({
      baseUrl: options.config.baseUrl,
      databasePath: options.config.databasePath,
      secret: options.config.authSecret,
    });
    app = await buildServer(options);
    app.addHook("preClose", async () => {
      try {
        await dispatcher?.stop();
      } finally {
        hub.close();
      }
    });
    app.addHook("onClose", async () => {
      let closeFailure: unknown;
      try {
        identity?.close();
      } catch (error) {
        closeFailure = error;
      }
      try {
        await database?.close();
      } catch (error) {
        closeFailure ??= error;
      }
      if (closeFailure) throw closeFailure;
      await installationLock.release();
    });
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
    await registerOrganizationRoutes(app, { database, identity: identity.adapter });
    await registerProjectRoutes(app, { database, identity: identity.adapter });
    await registerTaskRoutes(app, { database, identity: identity.adapter });
    await registerSearchRoutes(app, { database, identity: identity.adapter });
    await registerEventRoutes(app, { database, hub, identity: identity.adapter });
    await registerBetterAuthRoutes(app, identity.adapter);
    if (options.config.webRoot) await registerStaticWeb(app, options.config.webRoot);
    dispatcher = createOutboxDispatcher({ database, hub, logger: app.log });
    await dispatcher.start();
    await options.configure?.(app, { database, identity: identity.adapter });
    return app;
  } catch (error) {
    if (app) await app.close().catch(() => undefined);
    else {
      identity?.close();
      await database?.close();
      await installationLock.release();
    }
    throw error;
  }
}

import { randomUUID } from "node:crypto";
import { CORE_API_SCHEMAS } from "@launchpp/api-contracts";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import Fastify, { type FastifyInstance, type FastifyServerOptions, LogController } from "fastify";
import type { ServerConfig } from "./config.js";
import { registerHealthRoutes } from "./health-routes.js";
import { HttpError, sendProblem } from "./problem-details.js";
import type { Readiness } from "./readiness.js";
import { createOriginGuard } from "./security.js";

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function hasProperty<TKey extends PropertyKey>(
  value: unknown,
  property: TKey,
): value is Record<TKey, unknown> {
  return typeof value === "object" && value !== null && property in value;
}

export interface BuildServerOptions {
  readonly config: ServerConfig;
  readonly logger?: FastifyServerOptions["logger"];
  readonly readiness: Readiness;
}

export async function buildServer(options: BuildServerOptions): Promise<FastifyInstance> {
  const { config, readiness } = options;
  const app = Fastify({
    bodyLimit: 1_048_576,
    genReqId(request) {
      const supplied = request.headers["x-request-id"];
      return typeof supplied === "string" && requestIdPattern.test(supplied)
        ? supplied
        : randomUUID();
    },
    logger: options.logger ?? {
      level: config.logLevel,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['x-csrf-token']",
          "request.headers.authorization",
          "request.headers.cookie",
        ],
        censor: "[REDACTED]",
      },
    },
    logController: new LogController({ disableRequestLogging: true }),
    trustProxy: config.trustedProxies.length > 0 ? [...config.trustedProxies] : false,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'self'"], frameAncestors: ["'none'"] },
    },
  });
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
  });
  await app.register(swagger, {
    openapi: {
      info: {
        description: "Versioned HTTP contract for Launch++ core resources.",
        title: "Launch++ Core API",
        version: "1.0.0",
      },
      openapi: "3.1.0",
    },
  });
  for (const schema of CORE_API_SCHEMAS) app.addSchema(schema);

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
  app.addHook("onRequest", createOriginGuard(config));
  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        durationMs: reply.elapsedTime,
        method: request.method,
        route: request.routeOptions.url,
        statusCode: reply.statusCode,
      },
      "request completed",
    );
  });

  app.setNotFoundHandler(async (request, reply) =>
    sendProblem(
      reply,
      request,
      404,
      "route_not_found",
      "Route not found",
      "The requested route does not exist.",
    ),
  );

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof HttpError) {
      return sendProblem(
        reply,
        request,
        error.statusCode,
        error.code,
        "Request failed",
        error.message,
      );
    }
    if (hasProperty(error, "validation") && error.validation) {
      return sendProblem(
        reply,
        request,
        400,
        "invalid_request",
        "Invalid request",
        "The request did not match the expected schema.",
      );
    }
    if (hasProperty(error, "statusCode") && error.statusCode === 429) {
      return sendProblem(
        reply,
        request,
        429,
        "rate_limit_exceeded",
        "Too many requests",
        "Try the request again later.",
      );
    }

    request.log.error({ err: error }, "unhandled request error");
    return sendProblem(
      reply,
      request,
      500,
      "internal_error",
      "Internal server error",
      "The server could not complete the request.",
    );
  });

  await registerHealthRoutes(app, readiness);
  app.get("/api/v1/openapi.json", { schema: { hide: true } }, async (_request, reply) =>
    reply.type("application/json").send(app.swagger()),
  );
  return app;
}

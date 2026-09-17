import type { FastifyInstance } from "fastify";
import type { Readiness } from "./readiness.js";

const healthResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: { status: { type: "string" } },
} as const;

export async function registerHealthRoutes(app: FastifyInstance, readiness: Readiness) {
  app.get(
    "/health/live",
    {
      config: { rateLimit: false },
      schema: { response: { 200: healthResponseSchema } },
    },
    async () => ({ status: "ok" }),
  );

  app.get(
    "/health/ready",
    {
      config: { rateLimit: false },
      schema: { response: { 200: healthResponseSchema, 503: healthResponseSchema } },
    },
    async (_request, reply) => {
      if (!readiness.isReady()) return reply.status(503).send({ status: "not_ready" });
      return { status: "ready" };
    },
  );
}

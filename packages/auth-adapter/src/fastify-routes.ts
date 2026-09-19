import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import type { BetterAuthIdentityAdapter } from "./identity-adapter.js";

function responseBody(request: { body?: unknown; method: string }): BodyInit | undefined {
  if (request.method === "GET" || request.method === "HEAD" || request.body === undefined) {
    return undefined;
  }
  return typeof request.body === "string" ? request.body : JSON.stringify(request.body);
}

export async function registerBetterAuthRoutes(
  app: FastifyInstance,
  adapter: BetterAuthIdentityAdapter,
): Promise<void> {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async preHandler(request, reply) {
      if (request.method !== "POST") return;

      if (request.url.startsWith("/api/auth/sign-up")) {
        return reply.status(403).send({
          code: "registration_disabled",
          message: "Accounts can only be created through installation setup or an invitation.",
        });
      }

      let origin: string | undefined;
      try {
        origin = request.headers.origin ? new URL(request.headers.origin).origin : undefined;
      } catch {
        origin = undefined;
      }
      if (origin !== adapter.baseUrl) {
        return reply.status(403).send({
          code: "origin_rejected",
          message: "Authentication mutations require the configured Launch++ origin.",
        });
      }
    },
    async handler(request, reply) {
      const body = responseBody(request);
      const authResponse = await adapter.handle(
        new Request(new URL(request.url, adapter.baseUrl), {
          ...(body ? { body } : {}),
          headers: fromNodeHeaders(request.headers),
          method: request.method,
        }),
      );

      reply.status(authResponse.status);
      const setCookies = authResponse.headers.getSetCookie();
      if (setCookies.length > 0) reply.header("set-cookie", setCookies);
      for (const [name, value] of authResponse.headers.entries()) {
        if (name !== "set-cookie") reply.header(name, value);
      }

      if (!authResponse.body) return reply.send();
      return reply.send(Buffer.from(await authResponse.arrayBuffer()));
    },
  });
}

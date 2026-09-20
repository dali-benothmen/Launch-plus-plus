import type { SearchQuery } from "@launchpp/api-contracts";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { SearchService } from "@launchpp/core";
import { type SqliteDatabase, SqliteSearchRepository } from "@launchpp/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { sendProblem } from "./problem-details.js";

function webHeaders(headers: FastifyRequest["headers"]): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) result.set(name, String(value));
  }
  return result;
}

export async function registerSearchRoutes(
  app: FastifyInstance,
  input: Readonly<{ database: SqliteDatabase; identity: BetterAuthIdentityAdapter }>,
): Promise<void> {
  const service = new SearchService({
    repository: new SqliteSearchRepository(),
    transactions: input.database,
  });

  app.get<{ Querystring: SearchQuery }>(
    "/api/v1/search",
    {
      schema: {
        operationId: "search",
        querystring: { $ref: "LaunchppSearchQueryV1#" },
        response: {
          200: { $ref: "LaunchppSearchResponseV1#" },
          400: { $ref: "LaunchppProblemDetailsV1#" },
          401: { $ref: "LaunchppProblemDetailsV1#" },
        },
        summary: "Search accessible projects and tasks",
        tags: ["Search"],
      },
    },
    async (request, reply) => {
      const session = await input.identity.resolveSession(webHeaders(request.headers));
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to search Launch++.",
        );
      }
      try {
        return {
          items: service.search({
            ...request.query,
            query: request.query.q,
            userId: session.identity.id,
          }),
        };
      } catch (error) {
        if (error instanceof TypeError) {
          return sendProblem(
            reply,
            request,
            400,
            "invalid_search",
            "Invalid search",
            error.message,
          );
        }
        throw error;
      }
    },
  );
}

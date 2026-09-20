import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import {
  type SqliteDatabase,
  SqliteProjectionRepository,
  SqliteWorkspaceMembershipRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

import type { InvalidationHub } from "./invalidation-hub.js";
import { sendProblem } from "./problem-details.js";

interface EventQuery {
  readonly after?: string;
}

function webHeaders(headers: FastifyRequest["headers"]): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) result.set(name, String(value));
  }
  return result;
}

function cursorFrom(request: FastifyRequest<{ Querystring: EventQuery }>): number | undefined {
  const raw = request.headers["last-event-id"] ?? request.query.after;
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

export async function registerEventRoutes(
  app: FastifyInstance,
  input: Readonly<{
    database: SqliteDatabase;
    hub: InvalidationHub;
    identity: BetterAuthIdentityAdapter;
  }>,
): Promise<void> {
  const projections = new SqliteProjectionRepository();
  const memberships = new SqliteWorkspaceMembershipRepository();

  app.get<{ Querystring: EventQuery }>(
    "/api/v1/events",
    {
      schema: {
        operationId: "streamInvalidations",
        querystring: {
          additionalProperties: false,
          properties: { after: { pattern: "^[0-9]+$", type: "string" } },
          type: "object",
        },
        summary: "Stream authoritative-state invalidations",
        tags: ["Events"],
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
          "Sign in to receive live updates.",
        );
      }

      const latestSequence = input.database.read((context) =>
        projections.latestInvalidationSequence(context, session.identity.id),
      );
      const requestedCursor = cursorFrom(request);
      let cursor =
        requestedCursor === undefined ? latestSequence : Math.min(requestedCursor, latestSequence);

      reply.hijack();
      reply.raw.writeHead(200, {
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
        "x-accel-buffering": "no",
      });
      reply.raw.write("retry: 2000\n\n");

      const write = (
        event: ReturnType<SqliteProjectionRepository["listInvalidations"]>[number],
      ) => {
        if (reply.raw.destroyed || event.sequence <= cursor) return;
        cursor = event.sequence;
        reply.raw.write(
          `id: ${event.sequence}\nevent: invalidate\ndata: ${JSON.stringify(event)}\n\n`,
        );
      };

      const unsubscribe = input.hub.subscribe((event) => {
        const membership = input.database.read((context) =>
          memberships.find(context, event.workspaceId, session.identity.id),
        );
        if (membership?.state === "active") write(event);
      });
      let replay: ReturnType<SqliteProjectionRepository["listInvalidations"]>;
      do {
        replay = input.database.read((context) =>
          projections.listInvalidations(context, {
            after: cursor,
            limit: 500,
            userId: session.identity.id,
          }),
        );
        for (const event of replay) write(event);
      } while (replay.length === 500);

      const heartbeat = setInterval(() => {
        if (!reply.raw.destroyed) reply.raw.write(": keep-alive\n\n");
      }, 20_000);
      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      request.raw.once("close", close);
    },
  );
}

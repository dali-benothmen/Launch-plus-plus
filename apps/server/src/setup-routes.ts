import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { CreateInstallationService } from "@launchpp/core";
import {
  type SqliteDatabase,
  SqliteInstallationRepository,
  SqliteOutboxRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

interface OwnerSetupBody {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly setupToken: string;
}

function requestOrigin(request: FastifyRequest): string | undefined {
  try {
    return request.headers.origin ? new URL(request.headers.origin).origin : undefined;
  } catch {
    return undefined;
  }
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

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .filter((value): value is string => value !== undefined)
    .join("; ");
}

async function forwardResponse(response: Response, reply: import("fastify").FastifyReply) {
  reply.status(response.status);
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) reply.header("set-cookie", cookies);
  for (const [name, value] of response.headers.entries()) {
    if (name !== "set-cookie") reply.header(name, value);
  }
  return response.body ? reply.send(Buffer.from(await response.arrayBuffer())) : reply.send();
}

export interface SetupCoordinator {
  readonly token: string | undefined;
  register(app: FastifyInstance): Promise<void>;
}

export function createSetupCoordinator(input: {
  readonly baseUrl: string;
  readonly database: SqliteDatabase;
  readonly identity: BetterAuthIdentityAdapter;
}): SetupCoordinator {
  const installations = new SqliteInstallationRepository();
  const outbox = new SqliteOutboxRepository();
  let initialized = input.database.read(
    (context) => installations.findFirst(context) !== undefined,
  );
  let setupToken = initialized ? undefined : randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + 30 * 60 * 1000;
  let setupInProgress = false;
  const service = new CreateInstallationService({
    clock: Date.now,
    generateId: randomUUID,
    installations,
    outbox,
    transactions: input.database,
  });

  return {
    get token() {
      return setupToken;
    },
    async register(app) {
      app.addHook("preHandler", async (request, reply) => {
        const path = request.url.split("?", 1)[0];
        if (!initialized && path?.startsWith("/api/") && !path.startsWith("/api/setup/")) {
          return reply.status(503).send({
            code: "setup_required",
            message: "Complete first-owner setup before using the Launch++ API.",
          });
        }
      });

      app.get("/api/setup/status", async () => ({ requiresSetup: !initialized }));

      app.post<{ Body: OwnerSetupBody }>(
        "/api/setup/owner",
        {
          config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
          schema: {
            body: {
              additionalProperties: false,
              required: ["email", "name", "password", "setupToken"],
              type: "object",
              properties: {
                email: { format: "email", maxLength: 320, type: "string" },
                name: { maxLength: 100, minLength: 1, type: "string" },
                password: { maxLength: 128, minLength: 12, type: "string" },
                setupToken: { maxLength: 128, minLength: 1, type: "string" },
              },
            },
          },
        },
        async (request, reply) => {
          if (initialized) {
            return reply
              .status(409)
              .send({ code: "setup_complete", message: "Setup is complete." });
          }
          if (setupInProgress) {
            return reply
              .status(409)
              .send({ code: "setup_in_progress", message: "Setup is already in progress." });
          }
          if (requestOrigin(request) !== input.baseUrl) {
            return reply
              .status(403)
              .send({ code: "origin_rejected", message: "The request origin was rejected." });
          }
          const supplied = Buffer.from(request.body.setupToken);
          const expected = Buffer.from(setupToken ?? "");
          if (
            Date.now() > expiresAt ||
            supplied.length !== expected.length ||
            !timingSafeEqual(supplied, expected)
          ) {
            return reply.status(403).send({
              code: "invalid_setup_token",
              message: "The setup token is invalid or expired.",
            });
          }

          setupInProgress = true;
          try {
            const authResponse = await input.identity.handle(
              new Request(new URL("/api/auth/sign-up/email", input.baseUrl), {
                body: JSON.stringify({
                  email: request.body.email.trim(),
                  name: request.body.name.trim(),
                  password: request.body.password,
                }),
                headers: { "content-type": "application/json", origin: input.baseUrl },
                method: "POST",
              }),
            );
            if (!authResponse.ok) return forwardResponse(authResponse, reply);

            const session = await input.identity.resolveSession(
              new Headers({ cookie: cookieHeader(authResponse) }),
            );
            if (!session) throw new Error("Owner session was not created during setup");
            await service.execute({ actorId: session.identity.id, correlationId: request.id });
            initialized = true;
            setupToken = undefined;
            return forwardResponse(authResponse, reply);
          } finally {
            setupInProgress = false;
          }
        },
      );

      app.get("/api/session", async (request, reply) => {
        const session = await input.identity.resolveSession(webHeaders(request.headers));
        if (!session) return reply.status(401).send({ code: "unauthenticated" });
        return { session };
      });

      app.get("/api/auth/recovery-capabilities", async () => ({
        email: false,
        operatorRecovery: true,
      }));
    },
  };
}

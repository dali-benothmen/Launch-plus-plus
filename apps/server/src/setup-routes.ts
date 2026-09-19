import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
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
}

interface SetupClaimBody {
  readonly token: string;
}

const setupCookieName = "launchpp.setup";

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

function requestCookie(request: FastifyRequest, name: string): string | undefined {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isLoopback(address: string): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function isLoopbackOrigin(origin: string): boolean {
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

async function forwardResponse(
  response: Response,
  reply: import("fastify").FastifyReply,
  additionalCookies: readonly string[] = [],
) {
  reply.status(response.status);
  const cookies = [...response.headers.getSetCookie(), ...additionalCookies];
  if (cookies.length > 0) reply.header("set-cookie", cookies);
  for (const [name, value] of response.headers.entries()) {
    if (name !== "set-cookie") reply.header(name, value);
  }
  return response.body ? reply.send(Buffer.from(await response.arrayBuffer())) : reply.send();
}

export interface SetupCoordinator {
  register(app: FastifyInstance): Promise<void>;
  takeToken(): string | undefined;
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
  let printableSetupToken = initialized ? undefined : randomBytes(32).toString("base64url");
  let setupTokenHash = printableSetupToken
    ? createHash("sha256").update(printableSetupToken).digest()
    : undefined;
  const setupClaimHashes: Buffer[] = [];
  const expiresAt = Date.now() + 30 * 60 * 1000;
  let setupInProgress = false;
  const service = new CreateInstallationService({
    clock: Date.now,
    generateId: randomUUID,
    installations,
    outbox,
    transactions: input.database,
  });
  const secureCookie = new URL(input.baseUrl).protocol === "https:";
  const localSetupOrigin = isLoopbackOrigin(input.baseUrl);

  const setupCookie = (value: string, maxAge: number) =>
    [
      `${setupCookieName}=${encodeURIComponent(value)}`,
      "HttpOnly",
      "SameSite=Strict",
      "Path=/api/setup",
      `Max-Age=${maxAge}`,
      ...(secureCookie ? ["Secure"] : []),
    ].join("; ");

  const issueSetupClaim = (reply: import("fastify").FastifyReply) => {
    const claim = randomBytes(32).toString("base64url");
    setupClaimHashes.push(createHash("sha256").update(claim).digest());
    if (setupClaimHashes.length > 16) setupClaimHashes.shift();
    const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
    reply.header("set-cookie", setupCookie(claim, maxAge));
  };

  const hasValidSetupClaim = (request: FastifyRequest) => {
    const claim = requestCookie(request, setupCookieName);
    if (!claim || setupClaimHashes.length === 0 || Date.now() > expiresAt) return false;
    const claimHash = createHash("sha256").update(claim).digest();
    return setupClaimHashes.some((expected) => timingSafeEqual(claimHash, expected));
  };

  return {
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

      app.get("/api/setup/status", async (request, reply) => {
        if (initialized) return { requiresSetup: false, setupAuthorized: false };

        let setupAuthorized = hasValidSetupClaim(request);
        if (
          !setupAuthorized &&
          Date.now() <= expiresAt &&
          localSetupOrigin &&
          isLoopback(request.ip)
        ) {
          issueSetupClaim(reply);
          setupAuthorized = true;
        }
        return { requiresSetup: true, setupAuthorized };
      });

      app.post<{ Body: SetupClaimBody }>(
        "/api/setup/claim",
        {
          config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
          schema: {
            body: {
              additionalProperties: false,
              required: ["token"],
              type: "object",
              properties: { token: { maxLength: 128, minLength: 1, type: "string" } },
            },
          },
        },
        async (request, reply) => {
          const supplied = createHash("sha256").update(request.body.token).digest();
          const expected = setupTokenHash;
          if (
            initialized ||
            Date.now() > expiresAt ||
            !expected ||
            !timingSafeEqual(supplied, expected)
          ) {
            return reply.status(403).send({
              code: "invalid_setup_link",
              message: "The setup link is invalid or expired.",
            });
          }
          issueSetupClaim(reply);
          setupTokenHash = undefined;
          return { setupAuthorized: true };
        },
      );

      app.post<{ Body: OwnerSetupBody }>(
        "/api/setup/owner",
        {
          config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
          schema: {
            body: {
              additionalProperties: false,
              required: ["email", "name", "password"],
              type: "object",
              properties: {
                email: { format: "email", maxLength: 320, type: "string" },
                name: { maxLength: 100, minLength: 1, type: "string" },
                password: { maxLength: 128, minLength: 12, type: "string" },
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
          if (!hasValidSetupClaim(request)) {
            return reply.status(403).send({
              code: "setup_authorization_required",
              message: "Open the authorized setup link before creating the owner account.",
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
            setupTokenHash = undefined;
            setupClaimHashes.length = 0;
            return forwardResponse(authResponse, reply, [setupCookie("", 0)]);
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
    takeToken() {
      const token = printableSetupToken;
      printableSetupToken = undefined;
      return token;
    },
  };
}

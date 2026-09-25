import { createHash } from "node:crypto";
import type { SqliteIdempotencyRepository } from "@launchpp/database";
import type { FastifyReply, FastifyRequest } from "fastify";

import { HttpError, sendProblem } from "./problem-details.js";

interface CursorPayload {
  readonly after: string;
  readonly scope: string;
  readonly version: 1;
}

export interface CursorPage<Value> {
  readonly items: readonly Value[];
  readonly nextCursor?: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string, scope: string): CursorPayload {
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (
      typeof value !== "object" ||
      value === null ||
      !("version" in value) ||
      value.version !== 1 ||
      !("scope" in value) ||
      value.scope !== scope ||
      !("after" in value) ||
      typeof value.after !== "string" ||
      value.after.length === 0
    ) {
      throw new Error("invalid cursor");
    }
    return value as unknown as CursorPayload;
  } catch {
    throw new HttpError(400, "invalid_cursor", "The pagination cursor is invalid or expired.");
  }
}

export function cursorPage<Value>(
  values: readonly Value[],
  input: Readonly<{ cursor?: string; limit?: number; scope: string }>,
  identity: (value: Value) => string,
): CursorPage<Value> {
  const limit = input.limit ?? 50;
  const payload = input.cursor ? decodeCursor(input.cursor, input.scope) : undefined;
  const start = payload ? values.findIndex((value) => identity(value) === payload.after) + 1 : 0;
  if (payload && start === 0) {
    throw new HttpError(400, "invalid_cursor", "The pagination cursor is invalid or expired.");
  }
  const items = values.slice(start, start + limit);
  const last = items.at(-1);
  return {
    items,
    ...(last && start + items.length < values.length
      ? { nextCursor: encodeCursor({ after: identity(last), scope: input.scope, version: 1 }) }
      : {}),
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export interface IdempotentResult {
  readonly body: unknown;
  readonly status: number;
}

export async function executeIdempotent(
  request: FastifyRequest,
  reply: FastifyReply,
  repository: SqliteIdempotencyRepository,
  input: Readonly<{
    actorUserId: string;
    operation: string;
    payload: unknown;
    scopeKey: string;
  }>,
  execute: () => Promise<IdempotentResult>,
) {
  const suppliedKey = request.headers["idempotency-key"];
  if (suppliedKey === undefined) {
    const result = await execute();
    return reply.status(result.status).send(result.body);
  }
  if (typeof suppliedKey !== "string" || suppliedKey.length < 8 || suppliedKey.length > 200) {
    return sendProblem(
      reply,
      request,
      400,
      "invalid_idempotency_key",
      "Invalid idempotency key",
      "Idempotency-Key must contain between 8 and 200 characters.",
    );
  }

  const scope = {
    actorUserId: input.actorUserId,
    key: suppliedKey,
    operation: input.operation,
    requestHash: createHash("sha256").update(canonicalJson(input.payload)).digest("hex"),
    scopeKey: input.scopeKey,
  };
  const reservation = await repository.reserve(scope);
  if (reservation.kind === "conflict") {
    return sendProblem(
      reply,
      request,
      409,
      "idempotency_key_reused",
      "Idempotency key conflict",
      "This idempotency key was already used with a different request.",
    );
  }
  if (reservation.kind === "in_progress") {
    reply.header("retry-after", "1");
    return sendProblem(
      reply,
      request,
      409,
      "idempotency_request_in_progress",
      "Request already in progress",
      "A request with this idempotency key is still being processed.",
    );
  }
  if (reservation.kind === "replay") {
    reply.header("idempotency-replayed", "true");
    return reply.status(reservation.status).send(reservation.body);
  }

  try {
    const result = await execute();
    await repository.complete(scope, result.status, result.body);
    return reply.status(result.status).send(result.body);
  } catch (error) {
    await repository.abandon(scope);
    throw error;
  }
}

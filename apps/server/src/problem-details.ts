import type { FastifyReply, FastifyRequest } from "fastify";

export interface ProblemDetails {
  readonly code: string;
  readonly correlationId: string;
  readonly detail: string;
  readonly status: number;
  readonly title: string;
  readonly type: string;
}

export class HttpError extends Error {
  override readonly name = "HttpError";

  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function sendProblem(
  reply: FastifyReply,
  request: FastifyRequest,
  status: number,
  code: string,
  title: string,
  detail: string,
) {
  const problem: ProblemDetails = {
    code,
    correlationId: request.id,
    detail,
    status,
    title,
    type: `https://launchpp.dev/problems/${code}`,
  };
  return reply.status(status).type("application/problem+json").send(problem);
}

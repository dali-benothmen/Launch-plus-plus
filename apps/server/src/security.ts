import type { onRequestHookHandler } from "fastify";
import type { ServerConfig } from "./config.js";
import { sendProblem } from "./problem-details.js";

const mutationMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

export function createOriginGuard(config: ServerConfig): onRequestHookHandler {
  return async (request, reply) => {
    if (!mutationMethods.has(request.method)) return;

    const origin = request.headers.origin;
    let requestOrigin: string | undefined;
    try {
      requestOrigin = origin ? new URL(origin).origin : undefined;
    } catch {
      requestOrigin = undefined;
    }

    if (requestOrigin !== config.baseUrl) {
      return sendProblem(
        reply,
        request,
        403,
        "origin_rejected",
        "Request origin rejected",
        "State-changing browser requests must come from the configured Launch++ origin.",
      );
    }
  };
}

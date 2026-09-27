import { randomUUID } from "node:crypto";

import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { actorFromIdentitySession, canAccessOrganization } from "@launchpp/authorization";
import {
  SqliteAuditWriter,
  type SqliteDatabase,
  SqliteInstallationRepository,
  SqliteInstallationSettingsRepository,
  SqliteOrganizationMembershipRepository,
  SqliteProjectRepository,
} from "@launchpp/database";
import { validatePluginSourceManifest } from "@launchpp/plugin-protocol";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { ServerConfig } from "./config.js";
import { type DeveloperModeCoordinator, DeveloperModeError } from "./developer-mode.js";
import { sendProblem } from "./problem-details.js";

interface PairingParams {
  readonly pairingId: string;
}

interface SessionParams {
  readonly sessionId: string;
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

function bearer(request: FastifyRequest): string {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ") || authorization.length <= 7) {
    throw new DeveloperModeError(
      "developer_credential_required",
      "A Developer Mode bearer credential is required.",
    );
  }
  return authorization.slice(7);
}

function statusFor(error: DeveloperModeError): number {
  if (error.code.endsWith("_not_found")) return 404;
  if (error.code.endsWith("_unauthorized") || error.code === "developer_credential_required") {
    return 401;
  }
  if (error.code === "developer_mode_disabled") return 503;
  if (error.code.endsWith("_expired") || error.code.endsWith("_unavailable")) return 410;
  return 409;
}

function sendDeveloperError(reply: FastifyReply, request: FastifyRequest, error: unknown) {
  if (!(error instanceof DeveloperModeError)) throw error;
  return sendProblem(
    reply,
    request,
    statusFor(error),
    error.code,
    "Developer Mode request failed",
    error.message,
  );
}

const paramsSchema = (property: string) => ({
  additionalProperties: false,
  properties: { [property]: { maxLength: 100, minLength: 1, type: "string" } },
  required: [property],
  type: "object",
});

const problemResponses = {
  400: { $ref: "LaunchppProblemDetailsV1#" },
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
  404: { $ref: "LaunchppProblemDetailsV1#" },
  409: { $ref: "LaunchppProblemDetailsV1#" },
  410: { $ref: "LaunchppProblemDetailsV1#" },
  503: { $ref: "LaunchppProblemDetailsV1#" },
} as const;

const openObjectResponse = { additionalProperties: true, type: "object" } as const;

export async function registerDeveloperModeRoutes(
  app: FastifyInstance,
  input: Readonly<{
    config: ServerConfig;
    coordinator: DeveloperModeCoordinator;
    database: SqliteDatabase;
    identity: BetterAuthIdentityAdapter;
  }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const installations = new SqliteInstallationRepository();
  const settings = new SqliteInstallationSettingsRepository();
  const memberships = new SqliteOrganizationMembershipRepository();
  const projects = new SqliteProjectRepository();
  const currentInstallation = () =>
    input.database.read((context) => installations.findFirst(context));
  const persistedInstallation = currentInstallation();
  if (persistedInstallation) {
    input.coordinator.setEnabled(
      input.database.read((context) =>
        settings.developerModeEnabled(context, persistedInstallation.id),
      ),
    );
  }

  const identity = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await input.identity.resolveSession(webHeaders(request.headers));
    if (!session) {
      sendProblem(
        reply,
        request,
        401,
        "unauthenticated",
        "Authentication required",
        "Sign in to manage Developer Mode.",
      );
      return undefined;
    }
    return session;
  };

  const owner = async (request: FastifyRequest, reply: FastifyReply, organizationId: string) => {
    const session = await identity(request, reply);
    if (!session) return undefined;
    const membership = input.database.read((context) =>
      memberships.find(context, organizationId, session.identity.id),
    );
    if (
      !canAccessOrganization(actorFromIdentitySession(session), membership, "organization.manage")
    ) {
      sendProblem(
        reply,
        request,
        403,
        "developer_mode_denied",
        "Developer Mode access denied",
        "Organization ownership is required to approve or revoke development sessions.",
      );
      return undefined;
    }
    return session;
  };

  app.post<{ Body: { readonly manifest: unknown } }>(
    "/api/v1/developer-mode/pairings",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          additionalProperties: false,
          properties: { manifest: { type: "object" } },
          required: ["manifest"],
          type: "object",
        },
        operationId: "createDeveloperModePairing",
        response: { 201: openObjectResponse, ...problemResponses },
        summary: "Create a short-lived Developer Mode pairing request",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      const validation = validatePluginSourceManifest(request.body.manifest);
      if (!validation.ok) {
        return sendProblem(
          reply,
          request,
          400,
          "invalid_plugin_manifest",
          "Invalid plugin manifest",
          validation.issues[0]?.message ?? "The plugin manifest is invalid.",
        );
      }
      try {
        const pairing = input.coordinator.createPairing(validation.value);
        request.log.info(
          { pairingId: pairing.id, pluginId: validation.value.id },
          "developer pairing created",
        );
        return reply.status(201).send({
          ...pairing,
          approvalUrl: `${input.config.baseUrl}/app/plugins?pairing=${encodeURIComponent(pairing.id)}&code=${encodeURIComponent(pairing.code)}`,
        });
      } catch (error) {
        return sendDeveloperError(reply, request, error);
      }
    },
  );

  app.get<{ Params: PairingParams }>(
    "/api/v1/developer-mode/pairings/:pairingId",
    {
      schema: {
        operationId: "pollDeveloperModePairing",
        params: paramsSchema("pairingId"),
        response: { 200: openObjectResponse, ...problemResponses },
        summary: "Poll a Developer Mode pairing request",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      try {
        return input.coordinator.pollPairing(request.params.pairingId, bearer(request));
      } catch (error) {
        return sendDeveloperError(reply, request, error);
      }
    },
  );

  app.get<{ Params: PairingParams; Querystring: { readonly code: string } }>(
    "/api/v1/developer-mode/pairings/:pairingId/review",
    {
      schema: {
        operationId: "reviewDeveloperModePairing",
        params: paramsSchema("pairingId"),
        querystring: {
          additionalProperties: false,
          properties: { code: { maxLength: 12, minLength: 6, type: "string" } },
          required: ["code"],
          type: "object",
        },
        response: { 200: openObjectResponse, ...problemResponses },
        summary: "Review a pending Developer Mode pairing",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      if (!(await identity(request, reply))) return;
      try {
        return input.coordinator.reviewPairing(request.params.pairingId, request.query.code);
      } catch (error) {
        return sendDeveloperError(reply, request, error);
      }
    },
  );

  app.post<{
    Body: { readonly code: string; readonly organizationId: string; readonly projectId?: string };
    Params: PairingParams;
  }>(
    "/api/v1/developer-mode/pairings/:pairingId/approve",
    {
      schema: {
        body: {
          additionalProperties: false,
          properties: {
            code: { maxLength: 12, minLength: 6, type: "string" },
            organizationId: { maxLength: 100, minLength: 1, type: "string" },
            projectId: { maxLength: 100, minLength: 1, type: "string" },
          },
          required: ["code", "organizationId"],
          type: "object",
        },
        operationId: "approveDeveloperModePairing",
        params: paramsSchema("pairingId"),
        response: { 200: openObjectResponse, ...problemResponses },
        summary: "Approve a Developer Mode pairing",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      const session = await owner(request, reply, request.body.organizationId);
      if (!session) return;
      if (request.body.projectId) {
        const project = input.database.read((context) =>
          projects.findProjectById(context, request.body.projectId as string),
        );
        if (!project || project.organizationId !== request.body.organizationId) {
          return sendProblem(
            reply,
            request,
            404,
            "project_not_found",
            "Project not found",
            "The selected development project is unavailable.",
          );
        }
      }
      try {
        const result = input.coordinator.approvePairing({
          actorUserId: session.identity.id,
          code: request.body.code,
          id: request.params.pairingId,
          organizationId: request.body.organizationId,
          ...(request.body.projectId ? { projectId: request.body.projectId } : {}),
        });
        request.log.warn(
          {
            actorUserId: session.identity.id,
            organizationId: request.body.organizationId,
            pluginId: result.pluginId,
            sessionId: result.id,
          },
          "connected developer session approved",
        );
        return result;
      } catch (error) {
        return sendDeveloperError(reply, request, error);
      }
    },
  );

  app.get<{ Querystring: { readonly organizationId?: string } }>(
    "/api/v1/developer-mode/status",
    {
      schema: {
        operationId: "getDeveloperModeStatus",
        querystring: {
          additionalProperties: false,
          properties: { organizationId: { maxLength: 100, minLength: 1, type: "string" } },
          type: "object",
        },
        response: { 200: openObjectResponse, ...problemResponses },
        summary: "Read Developer Mode status and sessions",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      const session = request.query.organizationId
        ? await owner(request, reply, request.query.organizationId)
        : await identity(request, reply);
      if (!session) return;
      return {
        enabled: input.coordinator.enabled,
        pairingTtlSeconds: input.coordinator.pairingTtlSeconds,
        sessionTtlSeconds: input.coordinator.sessionTtlSeconds,
        sessions: request.query.organizationId
          ? input.coordinator.list(request.query.organizationId)
          : [],
      };
    },
  );

  app.patch<{ Body: { readonly enabled: boolean; readonly organizationId: string } }>(
    "/api/v1/developer-mode/status",
    {
      schema: {
        body: {
          additionalProperties: false,
          properties: {
            enabled: { type: "boolean" },
            organizationId: { maxLength: 100, minLength: 1, type: "string" },
          },
          required: ["enabled", "organizationId"],
          type: "object",
        },
        operationId: "setDeveloperModeStatus",
        response: { 200: openObjectResponse, ...problemResponses },
        summary: "Enable or disable connected Developer Mode",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      const session = await owner(request, reply, request.body.organizationId);
      if (!session) return;
      const installation = currentInstallation();
      if (!installation) {
        return sendProblem(
          reply,
          request,
          503,
          "setup_required",
          "Setup required",
          "Setup is incomplete.",
        );
      }
      const occurredAt = Date.now();
      await input.database.write((context) => {
        settings.setDeveloperModeEnabled(context, installation.id, request.body.enabled);
        audit.append(context, {
          actorId: session.identity.id,
          actorType: "user",
          correlationId: request.id,
          id: randomUUID(),
          installationId: installation.id,
          metadata: { enabled: request.body.enabled },
          occurredAt,
          operation: "developer_mode.settings.update",
          organizationId: request.body.organizationId,
          outcome: "succeeded",
          targetId: installation.id,
          targetType: "installation",
        });
      });
      input.coordinator.setEnabled(request.body.enabled);
      request.log.warn(
        {
          actorUserId: session.identity.id,
          enabled: request.body.enabled,
          organizationId: request.body.organizationId,
        },
        "connected Developer Mode setting changed",
      );
      return {
        enabled: input.coordinator.enabled,
        pairingTtlSeconds: input.coordinator.pairingTtlSeconds,
        sessionTtlSeconds: input.coordinator.sessionTtlSeconds,
        sessions: input.coordinator.list(request.body.organizationId),
      };
    },
  );

  app.post<{ Params: SessionParams }>(
    "/api/v1/developer-mode/sessions/:sessionId/approve-permissions",
    {
      schema: {
        operationId: "approveDeveloperModePermissions",
        params: paramsSchema("sessionId"),
        response: { 200: openObjectResponse, ...problemResponses },
        summary: "Approve changed permissions for a connected session",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      const current = input.coordinator.session(request.params.sessionId);
      if (!current) {
        return sendProblem(
          reply,
          request,
          404,
          "session_not_found",
          "Session not found",
          "The development session was not found.",
        );
      }
      const session = await owner(request, reply, current.organizationId);
      if (!session) return;
      try {
        return input.coordinator.approvePermissions(request.params.sessionId, session.identity.id);
      } catch (error) {
        return sendDeveloperError(reply, request, error);
      }
    },
  );

  app.put<{ Body: { readonly manifest: unknown }; Params: SessionParams }>(
    "/api/v1/developer-mode/sessions/:sessionId/manifest",
    {
      bodyLimit: 256 * 1024,
      schema: {
        body: {
          additionalProperties: false,
          properties: { manifest: { type: "object" } },
          required: ["manifest"],
          type: "object",
        },
        operationId: "updateDeveloperModeManifest",
        params: paramsSchema("sessionId"),
        response: { 200: openObjectResponse, ...problemResponses },
        summary: "Re-register a connected development manifest",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      const validation = validatePluginSourceManifest(request.body.manifest);
      if (!validation.ok) {
        return sendProblem(
          reply,
          request,
          400,
          "invalid_plugin_manifest",
          "Invalid plugin manifest",
          validation.issues[0]?.message ?? "The plugin manifest is invalid.",
        );
      }
      try {
        const updated = input.coordinator.updateManifest(
          request.params.sessionId,
          bearer(request),
          validation.value,
        );
        request.log.info(
          { pluginId: updated.pluginId, sessionId: updated.id, state: updated.state },
          "connected developer manifest registered",
        );
        return updated;
      } catch (error) {
        return sendDeveloperError(reply, request, error);
      }
    },
  );

  app.post<{ Params: SessionParams }>(
    "/api/v1/developer-mode/sessions/:sessionId/heartbeat",
    {
      schema: {
        operationId: "heartbeatDeveloperModeSession",
        params: paramsSchema("sessionId"),
        response: { 200: openObjectResponse, ...problemResponses },
        summary: "Keep a connected development session observable",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      try {
        return input.coordinator.heartbeat(request.params.sessionId, bearer(request));
      } catch (error) {
        return sendDeveloperError(reply, request, error);
      }
    },
  );

  app.delete<{ Params: SessionParams }>(
    "/api/v1/developer-mode/sessions/:sessionId",
    {
      schema: {
        operationId: "revokeDeveloperModeSession",
        params: paramsSchema("sessionId"),
        response: { 204: { type: "null" }, ...problemResponses },
        summary: "Revoke and tear down a connected development session",
        tags: ["Developer Mode"],
      },
    },
    async (request, reply) => {
      try {
        if (request.headers.authorization) {
          input.coordinator.revokeWithToken(request.params.sessionId, bearer(request));
        } else {
          const current = input.coordinator.session(request.params.sessionId);
          if (!current) return reply.status(204).send();
          if (!(await owner(request, reply, current.organizationId))) return;
          input.coordinator.revoke(request.params.sessionId);
        }
        request.log.warn(
          { sessionId: request.params.sessionId },
          "connected developer session revoked",
        );
        return reply.status(204).send();
      } catch (error) {
        return sendDeveloperError(reply, request, error);
      }
    },
  );
}

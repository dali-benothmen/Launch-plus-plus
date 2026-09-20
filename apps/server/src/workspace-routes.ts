import { randomUUID } from "node:crypto";
import { IdempotencyHeadersSchema } from "@launchpp/api-contracts";
import type {
  CreateWorkspaceInput,
  CursorPageQuery,
  RenameWorkspaceInput,
  SelectWorkspaceInput,
} from "@launchpp/api-contracts";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import {
  actorFromIdentitySession,
  canAccessWorkspace,
  canCreateWorkspace,
} from "@launchpp/authorization";
import {
  CreateWorkspaceService,
  RenameWorkspaceService,
  SelectCurrentWorkspaceService,
  type Workspace,
  WorkspaceNameAlreadyExistsError,
  WorkspaceNotFoundError,
  WorkspaceQueryService,
} from "@launchpp/core";
import {
  type SqliteDatabase,
  SqliteAuditWriter,
  SqliteInstallationRepository,
  SqliteIdempotencyRepository,
  SqliteOutboxRepository,
  SqliteUserProfileRepository,
  SqliteWorkspaceMembershipRepository,
  SqliteWorkspaceRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { cursorPage, executeIdempotent } from "./http-contract.js";
import { sendProblem } from "./problem-details.js";

const problemResponses = {
  400: { $ref: "LaunchppProblemDetailsV1#" },
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
  404: { $ref: "LaunchppProblemDetailsV1#" },
  409: { $ref: "LaunchppProblemDetailsV1#" },
  503: { $ref: "LaunchppProblemDetailsV1#" },
} as const;

function webHeaders(headers: FastifyRequest["headers"]): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) result.set(name, String(value));
  }
  return result;
}

function workspaceSummary(workspace: Workspace) {
  return {
    id: workspace.id,
    name: workspace.name,
    revision: workspace.revision,
    slug: workspace.slug,
  };
}

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
  input: Readonly<{ database: SqliteDatabase; identity: BetterAuthIdentityAdapter }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const installations = new SqliteInstallationRepository();
  const idempotency = new SqliteIdempotencyRepository(input.database);
  const memberships = new SqliteWorkspaceMembershipRepository();
  const outbox = new SqliteOutboxRepository();
  const profiles = new SqliteUserProfileRepository();
  const workspaces = new SqliteWorkspaceRepository();
  const shared = {
    audit,
    clock: Date.now,
    generateId: randomUUID,
    memberships,
    outbox,
    profiles,
    transactions: input.database,
    workspaces,
  };
  const createWorkspace = new CreateWorkspaceService(shared);
  const renameWorkspace = new RenameWorkspaceService(shared);
  const selectWorkspace = new SelectCurrentWorkspaceService({
    clock: Date.now,
    memberships,
    profiles,
    transactions: input.database,
  });
  const queryWorkspaces = new WorkspaceQueryService({
    profiles,
    transactions: input.database,
    workspaces,
  });

  const sessionFor = (request: FastifyRequest) =>
    input.identity.resolveSession(webHeaders(request.headers));
  const installation = () => input.database.read((context) => installations.findFirst(context));

  app.get<{ Querystring: CursorPageQuery }>(
    "/api/v1/workspaces",
    {
      schema: {
        operationId: "listWorkspaces",
        querystring: { $ref: "LaunchppCursorPageQueryV1#" },
        response: { 200: { $ref: "LaunchppWorkspaceContextV1#" }, ...problemResponses },
        summary: "List accessible workspaces",
        tags: ["Workspaces"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to access workspaces.",
        );
      }
      const currentInstallation = installation();
      if (!currentInstallation) {
        return sendProblem(
          reply,
          request,
          503,
          "setup_required",
          "Setup required",
          "Setup is incomplete.",
        );
      }

      const result = queryWorkspaces.forUser(session.identity.id);
      const page = cursorPage(
        result.workspaces,
        { ...request.query, scope: `workspaces:${session.identity.id}` },
        (workspace) => workspace.id,
      );
      return {
        ...(result.currentWorkspaceId ? { currentWorkspaceId: result.currentWorkspaceId } : {}),
        ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        workspaces: page.items.map(workspaceSummary),
      };
    },
  );

  app.post<{ Body: CreateWorkspaceInput }>(
    "/api/v1/workspaces",
    {
      schema: {
        body: { $ref: "LaunchppCreateWorkspaceInputV1#" },
        headers: IdempotencyHeadersSchema,
        operationId: "createWorkspace",
        response: { 201: { $ref: "LaunchppWorkspaceSummaryV1#" }, ...problemResponses },
        summary: "Create a workspace",
        tags: ["Workspaces"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to create a workspace.",
        );
      }
      if (!canCreateWorkspace(actor)) {
        return sendProblem(
          reply,
          request,
          403,
          "forbidden",
          "Workspace creation denied",
          "The current actor cannot create workspaces.",
        );
      }
      const currentInstallation = installation();
      if (!currentInstallation) {
        return sendProblem(
          reply,
          request,
          503,
          "setup_required",
          "Setup required",
          "Setup is incomplete.",
        );
      }
      try {
        return await executeIdempotent(
          request,
          reply,
          idempotency,
          {
            actorUserId: session.identity.id,
            operation: "workspace.create",
            payload: request.body,
            scopeKey: `installation:${currentInstallation.id}`,
          },
          async () => {
            const workspace = await createWorkspace.execute({
              correlationId: request.id,
              displayName: session.identity.name,
              installationId: currentInstallation.id,
              name: request.body.name,
              userId: session.identity.id,
            });
            return { body: workspaceSummary(workspace), status: 201 };
          },
        );
      } catch (error) {
        if (error instanceof WorkspaceNameAlreadyExistsError) {
          return sendProblem(
            reply,
            request,
            409,
            "workspace_name_conflict",
            "Workspace name conflict",
            error.message,
          );
        }
        throw error;
      }
    },
  );

  app.put<{ Body: SelectWorkspaceInput }>(
    "/api/v1/workspaces/current",
    {
      schema: {
        body: { $ref: "LaunchppSelectWorkspaceInputV1#" },
        operationId: "selectWorkspace",
        response: { 204: { type: "null" }, ...problemResponses },
        summary: "Select the current workspace",
        tags: ["Workspaces"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to select a workspace.",
        );
      }
      const membership = input.database.read((context) =>
        memberships.find(context, request.body.workspaceId, session.identity.id),
      );
      if (!canAccessWorkspace(actor, membership, "workspace.select")) {
        return sendProblem(
          reply,
          request,
          403,
          "workspace_access_denied",
          "Workspace access denied",
          "Active membership is required to select this workspace.",
        );
      }
      await selectWorkspace.execute({
        userId: session.identity.id,
        workspaceId: request.body.workspaceId,
      });
      return reply.status(204).send();
    },
  );

  app.patch<{
    Body: RenameWorkspaceInput;
    Params: { readonly workspaceId: string };
  }>(
    "/api/v1/workspaces/:workspaceId",
    {
      schema: {
        body: { $ref: "LaunchppRenameWorkspaceInputV1#" },
        operationId: "renameWorkspace",
        params: { $ref: "LaunchppWorkspaceParamsV1#" },
        response: { 200: { $ref: "LaunchppWorkspaceSummaryV1#" }, ...problemResponses },
        summary: "Rename a workspace",
        tags: ["Workspaces"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to rename a workspace.",
        );
      }
      const membership = input.database.read((context) =>
        memberships.find(context, request.params.workspaceId, session.identity.id),
      );
      if (!canAccessWorkspace(actor, membership, "workspace.manage")) {
        return sendProblem(
          reply,
          request,
          403,
          "workspace_management_denied",
          "Workspace management denied",
          "Workspace ownership is required to rename this workspace.",
        );
      }

      try {
        const workspace = await renameWorkspace.execute({
          correlationId: request.id,
          name: request.body.name,
          userId: session.identity.id,
          workspaceId: request.params.workspaceId,
        });
        return workspaceSummary(workspace);
      } catch (error) {
        if (error instanceof WorkspaceNameAlreadyExistsError) {
          return sendProblem(
            reply,
            request,
            409,
            "workspace_name_conflict",
            "Workspace name conflict",
            error.message,
          );
        }
        if (error instanceof WorkspaceNotFoundError) {
          return sendProblem(
            reply,
            request,
            404,
            "workspace_not_found",
            "Workspace not found",
            error.message,
          );
        }
        throw error;
      }
    },
  );
}

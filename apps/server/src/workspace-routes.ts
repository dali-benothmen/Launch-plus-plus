import { randomUUID } from "node:crypto";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import {
  actorFromIdentitySession,
  canAccessWorkspace,
  canCreateWorkspace,
} from "@launchpp/authorization";
import {
  CreateWorkspaceService,
  EnsureOwnerWorkspaceService,
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
  SqliteOutboxRepository,
  SqliteUserProfileRepository,
  SqliteWorkspaceMembershipRepository,
  SqliteWorkspaceRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

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
  const ensureWorkspace = new EnsureOwnerWorkspaceService(shared);
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

  app.get("/api/workspaces", async (request, reply) => {
    const session = await sessionFor(request);
    if (!session) return reply.status(401).send({ code: "unauthenticated" });
    const currentInstallation = installation();
    if (!currentInstallation) {
      return reply.status(503).send({ code: "setup_required", message: "Setup is incomplete." });
    }

    let result = queryWorkspaces.forUser(session.identity.id);
    if (result.workspaces.length === 0 || !result.currentWorkspaceId) {
      await ensureWorkspace.execute({
        correlationId: request.id,
        displayName: session.identity.name,
        installationId: currentInstallation.id,
        userId: session.identity.id,
      });
      result = queryWorkspaces.forUser(session.identity.id);
    }
    return {
      ...(result.currentWorkspaceId ? { currentWorkspaceId: result.currentWorkspaceId } : {}),
      workspaces: result.workspaces.map(workspaceSummary),
    };
  });

  app.post<{ Body: { readonly name: string } }>(
    "/api/workspaces",
    {
      schema: {
        body: {
          additionalProperties: false,
          required: ["name"],
          type: "object",
          properties: {
            name: { maxLength: 80, minLength: 1, pattern: "\\S", type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) return reply.status(401).send({ code: "unauthenticated" });
      if (!canCreateWorkspace(actor)) {
        return reply.status(403).send({ code: "forbidden", message: "Workspace creation denied." });
      }
      const currentInstallation = installation();
      if (!currentInstallation) {
        return reply.status(503).send({ code: "setup_required", message: "Setup is incomplete." });
      }
      try {
        const workspace = await createWorkspace.execute({
          correlationId: request.id,
          displayName: session.identity.name,
          installationId: currentInstallation.id,
          name: request.body.name,
          userId: session.identity.id,
        });
        return reply.status(201).send(workspaceSummary(workspace));
      } catch (error) {
        if (error instanceof WorkspaceNameAlreadyExistsError) {
          return reply.status(409).send({
            code: "workspace_name_conflict",
            message: error.message,
          });
        }
        throw error;
      }
    },
  );

  app.put<{ Body: { readonly workspaceId: string } }>(
    "/api/workspaces/current",
    {
      schema: {
        body: {
          additionalProperties: false,
          required: ["workspaceId"],
          type: "object",
          properties: { workspaceId: { maxLength: 100, minLength: 1, type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) return reply.status(401).send({ code: "unauthenticated" });
      const membership = input.database.read((context) =>
        memberships.find(context, request.body.workspaceId, session.identity.id),
      );
      if (!canAccessWorkspace(actor, membership, "workspace.select")) {
        return reply.status(403).send({
          code: "workspace_access_denied",
          message: "Active membership is required to select this workspace.",
        });
      }
      await selectWorkspace.execute({
        userId: session.identity.id,
        workspaceId: request.body.workspaceId,
      });
      return { currentWorkspaceId: request.body.workspaceId };
    },
  );

  app.patch<{
    Body: { readonly name: string };
    Params: { readonly workspaceId: string };
  }>(
    "/api/workspaces/:workspaceId",
    {
      schema: {
        body: {
          additionalProperties: false,
          required: ["name"],
          type: "object",
          properties: {
            name: { maxLength: 80, minLength: 1, pattern: "\\S", type: "string" },
          },
        },
        params: {
          additionalProperties: false,
          required: ["workspaceId"],
          type: "object",
          properties: {
            workspaceId: { maxLength: 100, minLength: 1, type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) return reply.status(401).send({ code: "unauthenticated" });
      const membership = input.database.read((context) =>
        memberships.find(context, request.params.workspaceId, session.identity.id),
      );
      if (!canAccessWorkspace(actor, membership, "workspace.manage")) {
        return reply.status(403).send({
          code: "workspace_management_denied",
          message: "Workspace ownership is required to rename this workspace.",
        });
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
          return reply.status(409).send({
            code: "workspace_name_conflict",
            message: error.message,
          });
        }
        if (error instanceof WorkspaceNotFoundError) {
          return reply.status(404).send({
            code: "workspace_not_found",
            message: error.message,
          });
        }
        throw error;
      }
    },
  );
}

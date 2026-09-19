import { randomUUID } from "node:crypto";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { actorFromIdentitySession, canAccessWorkspace } from "@launchpp/authorization";
import {
  ProjectCatalogService,
  ProjectFolderNameConflictError,
  ProjectFolderNotFoundError,
  ProjectNotFoundError,
  ProjectOrderInvalidError,
  type Project,
  type ProjectCatalog,
  type ProjectFolder,
  type ProjectStatus,
} from "@launchpp/core";
import {
  type SqliteDatabase,
  SqliteAuditWriter,
  SqliteInstallationRepository,
  SqliteOutboxRepository,
  SqliteProjectRepository,
  SqliteWorkspaceMembershipRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

function webHeaders(headers: FastifyRequest["headers"]): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) result.set(name, String(value));
  }
  return result;
}

function folderSummary(folder: ProjectFolder) {
  return {
    id: folder.id,
    name: folder.name,
    position: folder.position,
    revision: folder.revision,
    workspaceId: folder.workspaceId,
  };
}

function projectSummary(
  project: Project & { readonly favorite?: boolean; readonly lastOpenedAt?: number },
) {
  return {
    access: project.access,
    ...(project.archivedAt === undefined ? {} : { archivedAt: project.archivedAt }),
    description: project.description,
    favorite: project.favorite ?? false,
    ...(project.folderId === undefined ? {} : { folderId: project.folderId }),
    id: project.id,
    key: project.key,
    ...(project.lastOpenedAt === undefined ? {} : { lastOpenedAt: project.lastOpenedAt }),
    name: project.name,
    position: project.position,
    revision: project.revision,
    slug: project.slug,
    workspaceId: project.workspaceId,
  };
}

function statusSummary(status: ProjectStatus) {
  return {
    category: status.category,
    color: status.color,
    id: status.id,
    name: status.name,
    position: status.position,
    projectId: status.projectId,
    revision: status.revision,
  };
}

function catalogSummary(catalog: ProjectCatalog) {
  return {
    folders: catalog.folders.map(folderSummary),
    projects: catalog.projects.map(projectSummary),
    statuses: catalog.statuses.map(statusSummary),
  };
}

export async function registerProjectRoutes(
  app: FastifyInstance,
  input: Readonly<{ database: SqliteDatabase; identity: BetterAuthIdentityAdapter }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const installations = new SqliteInstallationRepository();
  const memberships = new SqliteWorkspaceMembershipRepository();
  const outbox = new SqliteOutboxRepository();
  const projects = new SqliteProjectRepository();
  const catalog = new ProjectCatalogService({
    audit,
    clock: Date.now,
    generateId: randomUUID,
    outbox,
    projects,
    transactions: input.database,
  });

  const authorize = async (
    request: FastifyRequest,
    reply: FastifyReply,
    workspaceId: string,
    manage: boolean,
  ) => {
    const session = await input.identity.resolveSession(webHeaders(request.headers));
    const actor = actorFromIdentitySession(session);
    if (!session) {
      reply.status(401).send({ code: "unauthenticated" });
      return undefined;
    }
    const installation = input.database.read((context) => installations.findFirst(context));
    if (!installation) {
      reply.status(503).send({ code: "setup_required", message: "Setup is incomplete." });
      return undefined;
    }
    const membership = input.database.read((context) =>
      memberships.find(context, workspaceId, session.identity.id),
    );
    if (!canAccessWorkspace(actor, membership, manage ? "workspace.manage" : "workspace.read")) {
      reply.status(403).send({
        code: "workspace_access_denied",
        message: manage
          ? "Workspace ownership is required to manage projects."
          : "Active workspace membership is required.",
      });
      return undefined;
    }
    return { installationId: installation.id, userId: session.identity.id };
  };

  const sendDomainError = (error: unknown, reply: FastifyReply) => {
    if (error instanceof ProjectFolderNameConflictError) {
      reply.status(409).send({ code: "project_folder_name_conflict", message: error.message });
      return true;
    }
    if (error instanceof ProjectFolderNotFoundError || error instanceof ProjectNotFoundError) {
      reply.status(404).send({ code: "project_resource_not_found", message: error.message });
      return true;
    }
    if (error instanceof ProjectOrderInvalidError || error instanceof TypeError) {
      reply.status(400).send({ code: "invalid_project_operation", message: error.message });
      return true;
    }
    return false;
  };

  app.get<{ Params: { readonly workspaceId: string } }>(
    "/api/workspaces/:workspaceId/projects",
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, false);
      if (!access) return;
      return catalogSummary(catalog.list(request.params.workspaceId, access.userId));
    },
  );

  app.post<{
    Body: { readonly name: string };
    Params: { readonly workspaceId: string };
  }>(
    "/api/workspaces/:workspaceId/folders",
    {
      schema: {
        body: {
          additionalProperties: false,
          properties: { name: { maxLength: 80, minLength: 1, pattern: "\\S", type: "string" } },
          required: ["name"],
          type: "object",
        },
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        const folder = await catalog.createFolder({
          ...access,
          correlationId: request.id,
          name: request.body.name,
          workspaceId: request.params.workspaceId,
        });
        return reply.status(201).send(folderSummary(folder));
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  app.patch<{
    Body: { readonly name: string };
    Params: { readonly folderId: string; readonly workspaceId: string };
  }>(
    "/api/workspaces/:workspaceId/folders/:folderId",
    {
      schema: {
        body: {
          additionalProperties: false,
          properties: { name: { maxLength: 80, minLength: 1, pattern: "\\S", type: "string" } },
          required: ["name"],
          type: "object",
        },
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        return folderSummary(
          await catalog.renameFolder({
            ...access,
            correlationId: request.id,
            folderId: request.params.folderId,
            name: request.body.name,
            workspaceId: request.params.workspaceId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  app.delete<{ Params: { readonly folderId: string; readonly workspaceId: string } }>(
    "/api/workspaces/:workspaceId/folders/:folderId",
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        await catalog.deleteFolder({
          ...access,
          correlationId: request.id,
          folderId: request.params.folderId,
          workspaceId: request.params.workspaceId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  app.put<{
    Body: { readonly orderedFolderIds: readonly string[] };
    Params: { readonly workspaceId: string };
  }>(
    "/api/workspaces/:workspaceId/folder-order",
    {
      schema: {
        body: {
          additionalProperties: false,
          properties: {
            orderedFolderIds: {
              items: { maxLength: 100, minLength: 1, type: "string" },
              type: "array",
            },
          },
          required: ["orderedFolderIds"],
          type: "object",
        },
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        await catalog.reorderFolders({
          ...access,
          correlationId: request.id,
          orderedFolderIds: request.body.orderedFolderIds,
          workspaceId: request.params.workspaceId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  app.post<{
    Body: { readonly description?: string; readonly folderId?: string; readonly name: string };
    Params: { readonly workspaceId: string };
  }>(
    "/api/workspaces/:workspaceId/projects",
    {
      schema: {
        body: {
          additionalProperties: false,
          properties: {
            description: { maxLength: 20_000, type: "string" },
            folderId: { maxLength: 100, minLength: 1, type: "string" },
            name: { maxLength: 120, minLength: 1, pattern: "\\S", type: "string" },
          },
          required: ["name"],
          type: "object",
        },
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        const project = await catalog.createProject({
          ...access,
          correlationId: request.id,
          ...request.body,
          workspaceId: request.params.workspaceId,
        });
        return reply.status(201).send(projectSummary(project));
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  app.patch<{
    Body: {
      readonly description?: string;
      readonly folderId?: null | string;
      readonly name?: string;
    };
    Params: { readonly projectId: string; readonly workspaceId: string };
  }>(
    "/api/workspaces/:workspaceId/projects/:projectId",
    {
      schema: {
        body: {
          additionalProperties: false,
          minProperties: 1,
          properties: {
            description: { maxLength: 20_000, type: "string" },
            folderId: {
              anyOf: [{ maxLength: 100, minLength: 1, type: "string" }, { type: "null" }],
            },
            name: { maxLength: 120, minLength: 1, pattern: "\\S", type: "string" },
          },
          type: "object",
        },
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        return projectSummary(
          await catalog.updateProject({
            ...access,
            correlationId: request.id,
            ...request.body,
            projectId: request.params.projectId,
            workspaceId: request.params.workspaceId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  for (const action of ["archive", "restore"] as const) {
    app.post<{ Params: { readonly projectId: string; readonly workspaceId: string } }>(
      `/api/workspaces/:workspaceId/projects/:projectId/${action}`,
      async (request, reply) => {
        const access = await authorize(request, reply, request.params.workspaceId, true);
        if (!access) return;
        try {
          const command = {
            ...access,
            correlationId: request.id,
            projectId: request.params.projectId,
            workspaceId: request.params.workspaceId,
          };
          const project =
            action === "archive"
              ? await catalog.archiveProject(command)
              : await catalog.restoreProject(command);
          return projectSummary(project);
        } catch (error) {
          if (sendDomainError(error, reply)) return;
          throw error;
        }
      },
    );
  }

  app.delete<{ Params: { readonly projectId: string; readonly workspaceId: string } }>(
    "/api/workspaces/:workspaceId/projects/:projectId",
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        await catalog.deleteProject({
          ...access,
          correlationId: request.id,
          projectId: request.params.projectId,
          workspaceId: request.params.workspaceId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  app.put<{
    Body: { readonly folderId?: string; readonly orderedProjectIds: readonly string[] };
    Params: { readonly workspaceId: string };
  }>(
    "/api/workspaces/:workspaceId/project-order",
    {
      schema: {
        body: {
          additionalProperties: false,
          properties: {
            folderId: { maxLength: 100, minLength: 1, type: "string" },
            orderedProjectIds: {
              items: { maxLength: 100, minLength: 1, type: "string" },
              type: "array",
            },
          },
          required: ["orderedProjectIds"],
          type: "object",
        },
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        await catalog.reorderProjects({
          ...access,
          correlationId: request.id,
          ...request.body,
          workspaceId: request.params.workspaceId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  app.put<{
    Body: { readonly favorite: boolean };
    Params: { readonly projectId: string; readonly workspaceId: string };
  }>(
    "/api/workspaces/:workspaceId/projects/:projectId/favorite",
    {
      schema: {
        body: {
          additionalProperties: false,
          properties: { favorite: { type: "boolean" } },
          required: ["favorite"],
          type: "object",
        },
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, false);
      if (!access) return;
      try {
        await catalog.setFavorite({
          ...access,
          correlationId: request.id,
          favorite: request.body.favorite,
          projectId: request.params.projectId,
          workspaceId: request.params.workspaceId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  app.post<{ Params: { readonly projectId: string; readonly workspaceId: string } }>(
    "/api/workspaces/:workspaceId/projects/:projectId/opened",
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, false);
      if (!access) return;
      try {
        await catalog.recordOpen({
          ...access,
          correlationId: request.id,
          projectId: request.params.projectId,
          workspaceId: request.params.workspaceId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, reply)) return;
        throw error;
      }
    },
  );
}

import { randomUUID } from "node:crypto";
import { IdempotencyHeadersSchema } from "@launchpp/api-contracts";
import type {
  CreateProjectInput,
  CursorPageQuery,
  FavoriteProjectInput,
  FolderOrderInput,
  ProjectFolderInput,
  ProjectOrderInput,
  UpdateProjectInput,
} from "@launchpp/api-contracts";
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
  SqliteIdempotencyRepository,
  SqliteOutboxRepository,
  SqliteProjectRepository,
  SqliteWorkspaceMembershipRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

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

function catalogSummary(catalog: ProjectCatalog, query: CursorPageQuery, workspaceId: string) {
  const page = cursorPage(
    catalog.projects,
    { ...query, scope: `projects:${workspaceId}` },
    (project) => project.id,
  );
  const projectIds = new Set(page.items.map((project) => project.id));
  return {
    folders: catalog.folders.map(folderSummary),
    ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
    projects: page.items.map(projectSummary),
    statuses: catalog.statuses
      .filter((status) => projectIds.has(status.projectId))
      .map(statusSummary),
  };
}

export async function registerProjectRoutes(
  app: FastifyInstance,
  input: Readonly<{ database: SqliteDatabase; identity: BetterAuthIdentityAdapter }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const installations = new SqliteInstallationRepository();
  const idempotency = new SqliteIdempotencyRepository(input.database);
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
      sendProblem(
        reply,
        request,
        401,
        "unauthenticated",
        "Authentication required",
        "Sign in to access projects.",
      );
      return undefined;
    }
    const installation = input.database.read((context) => installations.findFirst(context));
    if (!installation) {
      sendProblem(reply, request, 503, "setup_required", "Setup required", "Setup is incomplete.");
      return undefined;
    }
    const membership = input.database.read((context) =>
      memberships.find(context, workspaceId, session.identity.id),
    );
    if (!canAccessWorkspace(actor, membership, manage ? "workspace.manage" : "workspace.read")) {
      sendProblem(
        reply,
        request,
        403,
        "workspace_access_denied",
        "Workspace access denied",
        manage
          ? "Workspace ownership is required to manage projects."
          : "Active workspace membership is required.",
      );
      return undefined;
    }
    return { installationId: installation.id, userId: session.identity.id };
  };

  const sendDomainError = (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ProjectFolderNameConflictError) {
      sendProblem(
        reply,
        request,
        409,
        "project_folder_name_conflict",
        "Project folder name conflict",
        error.message,
      );
      return true;
    }
    if (error instanceof ProjectFolderNotFoundError || error instanceof ProjectNotFoundError) {
      sendProblem(
        reply,
        request,
        404,
        "project_resource_not_found",
        "Project resource not found",
        error.message,
      );
      return true;
    }
    if (error instanceof ProjectOrderInvalidError || error instanceof TypeError) {
      sendProblem(
        reply,
        request,
        400,
        "invalid_project_operation",
        "Invalid project operation",
        error.message,
      );
      return true;
    }
    return false;
  };

  app.get<{
    Params: { readonly workspaceId: string };
    Querystring: CursorPageQuery;
  }>(
    "/api/v1/workspaces/:workspaceId/projects",
    {
      schema: {
        operationId: "listProjects",
        params: { $ref: "LaunchppWorkspaceParamsV1#" },
        querystring: { $ref: "LaunchppCursorPageQueryV1#" },
        response: { 200: { $ref: "LaunchppProjectCatalogV1#" }, ...problemResponses },
        summary: "List a workspace project catalog",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, false);
      if (!access) return;
      return catalogSummary(
        catalog.list(request.params.workspaceId, access.userId),
        request.query,
        request.params.workspaceId,
      );
    },
  );

  app.post<{
    Body: ProjectFolderInput;
    Params: { readonly workspaceId: string };
  }>(
    "/api/v1/workspaces/:workspaceId/folders",
    {
      schema: {
        body: { $ref: "LaunchppProjectFolderInputV1#" },
        operationId: "createProjectFolder",
        params: { $ref: "LaunchppWorkspaceParamsV1#" },
        response: { 201: { $ref: "LaunchppProjectFolderSummaryV1#" }, ...problemResponses },
        summary: "Create a project folder",
        tags: ["Projects"],
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.patch<{
    Body: ProjectFolderInput;
    Params: { readonly folderId: string; readonly workspaceId: string };
  }>(
    "/api/v1/workspaces/:workspaceId/folders/:folderId",
    {
      schema: {
        body: { $ref: "LaunchppProjectFolderInputV1#" },
        operationId: "renameProjectFolder",
        params: { $ref: "LaunchppProjectFolderParamsV1#" },
        response: { 200: { $ref: "LaunchppProjectFolderSummaryV1#" }, ...problemResponses },
        summary: "Rename a project folder",
        tags: ["Projects"],
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.delete<{ Params: { readonly folderId: string; readonly workspaceId: string } }>(
    "/api/v1/workspaces/:workspaceId/folders/:folderId",
    {
      schema: {
        operationId: "deleteProjectFolder",
        params: { $ref: "LaunchppProjectFolderParamsV1#" },
        response: problemResponses,
        summary: "Delete a project folder",
        tags: ["Projects"],
      },
    },
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.put<{
    Body: FolderOrderInput;
    Params: { readonly workspaceId: string };
  }>(
    "/api/v1/workspaces/:workspaceId/folder-order",
    {
      schema: {
        body: { $ref: "LaunchppFolderOrderInputV1#" },
        operationId: "reorderProjectFolders",
        params: { $ref: "LaunchppWorkspaceParamsV1#" },
        response: problemResponses,
        summary: "Reorder project folders",
        tags: ["Projects"],
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.post<{
    Body: CreateProjectInput;
    Params: { readonly workspaceId: string };
  }>(
    "/api/v1/workspaces/:workspaceId/projects",
    {
      schema: {
        body: { $ref: "LaunchppCreateProjectInputV1#" },
        headers: IdempotencyHeadersSchema,
        operationId: "createProject",
        params: { $ref: "LaunchppWorkspaceParamsV1#" },
        response: { 201: { $ref: "LaunchppProjectSummaryV1#" }, ...problemResponses },
        summary: "Create a project",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.workspaceId, true);
      if (!access) return;
      try {
        return await executeIdempotent(
          request,
          reply,
          idempotency,
          {
            actorUserId: access.userId,
            operation: "project.create",
            payload: request.body,
            scopeKey: `workspace:${request.params.workspaceId}`,
          },
          async () => {
            const project = await catalog.createProject({
              ...access,
              correlationId: request.id,
              ...request.body,
              workspaceId: request.params.workspaceId,
            });
            return { body: projectSummary(project), status: 201 };
          },
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.patch<{
    Body: UpdateProjectInput;
    Params: { readonly projectId: string; readonly workspaceId: string };
  }>(
    "/api/v1/workspaces/:workspaceId/projects/:projectId",
    {
      schema: {
        body: { $ref: "LaunchppUpdateProjectInputV1#" },
        operationId: "updateProject",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: { 200: { $ref: "LaunchppProjectSummaryV1#" }, ...problemResponses },
        summary: "Update a project",
        tags: ["Projects"],
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  for (const action of ["archive", "restore"] as const) {
    app.post<{ Params: { readonly projectId: string; readonly workspaceId: string } }>(
      `/api/v1/workspaces/:workspaceId/projects/:projectId/${action}`,
      {
        schema: {
          operationId: `${action}Project`,
          params: { $ref: "LaunchppProjectParamsV1#" },
          response: { 200: { $ref: "LaunchppProjectSummaryV1#" }, ...problemResponses },
          summary: `${action === "archive" ? "Archive" : "Restore"} a project`,
          tags: ["Projects"],
        },
      },
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
          if (sendDomainError(error, request, reply)) return;
          throw error;
        }
      },
    );
  }

  app.delete<{ Params: { readonly projectId: string; readonly workspaceId: string } }>(
    "/api/v1/workspaces/:workspaceId/projects/:projectId",
    {
      schema: {
        operationId: "deleteProject",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: problemResponses,
        summary: "Delete a project",
        tags: ["Projects"],
      },
    },
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.put<{
    Body: ProjectOrderInput;
    Params: { readonly workspaceId: string };
  }>(
    "/api/v1/workspaces/:workspaceId/project-order",
    {
      schema: {
        body: { $ref: "LaunchppProjectOrderInputV1#" },
        operationId: "reorderProjects",
        params: { $ref: "LaunchppWorkspaceParamsV1#" },
        response: problemResponses,
        summary: "Reorder projects",
        tags: ["Projects"],
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.put<{
    Body: FavoriteProjectInput;
    Params: { readonly projectId: string; readonly workspaceId: string };
  }>(
    "/api/v1/workspaces/:workspaceId/projects/:projectId/favorite",
    {
      schema: {
        body: { $ref: "LaunchppFavoriteProjectInputV1#" },
        operationId: "setProjectFavorite",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: problemResponses,
        summary: "Set project favorite state",
        tags: ["Projects"],
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.post<{ Params: { readonly projectId: string; readonly workspaceId: string } }>(
    "/api/v1/workspaces/:workspaceId/projects/:projectId/opened",
    {
      schema: {
        operationId: "recordProjectOpened",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: problemResponses,
        summary: "Record a project as opened",
        tags: ["Projects"],
      },
    },
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
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );
}

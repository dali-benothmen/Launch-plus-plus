import { randomUUID } from "node:crypto";
import { IdempotencyHeadersSchema } from "@launchpp/api-contracts";
import type {
  CreateProjectInput,
  CursorPageQuery,
  FavoriteProjectInput,
  FolderOrderInput,
  ProjectFolderInput,
  ProjectOrderInput,
  ProjectStatusInput,
  ProjectStatusOrderInput,
  UpdateProjectInput,
} from "@launchpp/api-contracts";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { actorFromIdentitySession, canAccessOrganization } from "@launchpp/authorization";
import {
  ProjectCatalogService,
  ProjectFolderNameConflictError,
  ProjectFolderNotFoundError,
  ProjectNotFoundError,
  ProjectOrderInvalidError,
  ProjectStatusNameConflictError,
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
  SqliteOrganizationMembershipRepository,
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
    organizationId: folder.organizationId,
  };
}

function projectSummary(
  project: Project & { readonly favorite?: boolean; readonly lastOpenedAt?: number },
) {
  return {
    access: project.access,
    ...(project.archivedAt === undefined ? {} : { archivedAt: project.archivedAt }),
    createdByUserId: project.createdByUserId,
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
    updatedAt: project.updatedAt,
    organizationId: project.organizationId,
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

function catalogSummary(catalog: ProjectCatalog, query: CursorPageQuery, organizationId: string) {
  const page = cursorPage(
    catalog.projects,
    { ...query, scope: `projects:${organizationId}` },
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
  const memberships = new SqliteOrganizationMembershipRepository();
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
    organizationId: string,
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
      memberships.find(context, organizationId, session.identity.id),
    );
    if (
      !canAccessOrganization(
        actor,
        membership,
        manage ? "organization.manage" : "organization.read",
      )
    ) {
      sendProblem(
        reply,
        request,
        403,
        "organization_access_denied",
        "Organization access denied",
        manage
          ? "Organization ownership is required to manage projects."
          : "Active organization membership is required.",
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
    if (error instanceof ProjectStatusNameConflictError) {
      sendProblem(
        reply,
        request,
        409,
        "project_status_name_conflict",
        "Board column name conflict",
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
    Params: { readonly organizationId: string };
    Querystring: CursorPageQuery;
  }>(
    "/api/v1/organizations/:organizationId/projects",
    {
      schema: {
        operationId: "listProjects",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        querystring: { $ref: "LaunchppCursorPageQueryV1#" },
        response: { 200: { $ref: "LaunchppProjectCatalogV1#" }, ...problemResponses },
        summary: "List an organization project catalog",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, false);
      if (!access) return;
      return catalogSummary(
        catalog.list(request.params.organizationId, access.userId),
        request.query,
        request.params.organizationId,
      );
    },
  );

  app.post<{
    Body: ProjectFolderInput;
    Params: { readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/folders",
    {
      schema: {
        body: { $ref: "LaunchppProjectFolderInputV1#" },
        operationId: "createProjectFolder",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: { 201: { $ref: "LaunchppProjectFolderSummaryV1#" }, ...problemResponses },
        summary: "Create a project folder",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        const folder = await catalog.createFolder({
          ...access,
          correlationId: request.id,
          name: request.body.name,
          organizationId: request.params.organizationId,
        });
        return reply.status(201).send(folderSummary(folder));
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.put<{
    Body: ProjectStatusOrderInput;
    Params: { readonly projectId: string; readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/status-order",
    {
      schema: {
        body: { $ref: "LaunchppProjectStatusOrderInputV1#" },
        operationId: "reorderProjectStatuses",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: problemResponses,
        summary: "Reorder project board columns",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        await catalog.reorderStatuses({
          ...access,
          correlationId: request.id,
          orderedStatusIds: request.body.orderedStatusIds,
          projectId: request.params.projectId,
          organizationId: request.params.organizationId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.patch<{
    Body: ProjectFolderInput;
    Params: { readonly folderId: string; readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/folders/:folderId",
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
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        return folderSummary(
          await catalog.renameFolder({
            ...access,
            correlationId: request.id,
            folderId: request.params.folderId,
            name: request.body.name,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.delete<{ Params: { readonly folderId: string; readonly organizationId: string } }>(
    "/api/v1/organizations/:organizationId/folders/:folderId",
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
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        await catalog.deleteFolder({
          ...access,
          correlationId: request.id,
          folderId: request.params.folderId,
          organizationId: request.params.organizationId,
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
    Params: { readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/folder-order",
    {
      schema: {
        body: { $ref: "LaunchppFolderOrderInputV1#" },
        operationId: "reorderProjectFolders",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: problemResponses,
        summary: "Reorder project folders",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        await catalog.reorderFolders({
          ...access,
          correlationId: request.id,
          orderedFolderIds: request.body.orderedFolderIds,
          organizationId: request.params.organizationId,
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
    Params: { readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/projects",
    {
      schema: {
        body: { $ref: "LaunchppCreateProjectInputV1#" },
        headers: IdempotencyHeadersSchema,
        operationId: "createProject",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: { 201: { $ref: "LaunchppProjectSummaryV1#" }, ...problemResponses },
        summary: "Create a project",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, true);
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
            scopeKey: `organization:${request.params.organizationId}`,
          },
          async () => {
            const project = await catalog.createProject({
              ...access,
              correlationId: request.id,
              ...request.body,
              organizationId: request.params.organizationId,
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

  app.post<{
    Body: ProjectStatusInput;
    Params: { readonly projectId: string; readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/statuses",
    {
      schema: {
        body: { $ref: "LaunchppProjectStatusInputV1#" },
        operationId: "createProjectStatus",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: { 201: { $ref: "LaunchppProjectStatusSummaryV1#" }, ...problemResponses },
        summary: "Create a project board column",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        const status = await catalog.createStatus({
          ...access,
          ...request.body,
          correlationId: request.id,
          projectId: request.params.projectId,
          organizationId: request.params.organizationId,
        });
        return reply.status(201).send(statusSummary(status));
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.patch<{
    Body: UpdateProjectInput;
    Params: { readonly projectId: string; readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/projects/:projectId",
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
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        return projectSummary(
          await catalog.updateProject({
            ...access,
            correlationId: request.id,
            ...request.body,
            projectId: request.params.projectId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  for (const action of ["archive", "restore"] as const) {
    app.post<{ Params: { readonly projectId: string; readonly organizationId: string } }>(
      `/api/v1/organizations/:organizationId/projects/:projectId/${action}`,
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
        const access = await authorize(request, reply, request.params.organizationId, true);
        if (!access) return;
        try {
          const command = {
            ...access,
            correlationId: request.id,
            projectId: request.params.projectId,
            organizationId: request.params.organizationId,
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

  app.delete<{ Params: { readonly projectId: string; readonly organizationId: string } }>(
    "/api/v1/organizations/:organizationId/projects/:projectId",
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
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        await catalog.deleteProject({
          ...access,
          correlationId: request.id,
          projectId: request.params.projectId,
          organizationId: request.params.organizationId,
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
    Params: { readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/project-order",
    {
      schema: {
        body: { $ref: "LaunchppProjectOrderInputV1#" },
        operationId: "reorderProjects",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: problemResponses,
        summary: "Reorder projects",
        tags: ["Projects"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        await catalog.reorderProjects({
          ...access,
          correlationId: request.id,
          ...request.body,
          organizationId: request.params.organizationId,
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
    Params: { readonly projectId: string; readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/favorite",
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
      const access = await authorize(request, reply, request.params.organizationId, false);
      if (!access) return;
      try {
        await catalog.setFavorite({
          ...access,
          correlationId: request.id,
          favorite: request.body.favorite,
          projectId: request.params.projectId,
          organizationId: request.params.organizationId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.post<{ Params: { readonly projectId: string; readonly organizationId: string } }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/opened",
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
      const access = await authorize(request, reply, request.params.organizationId, false);
      if (!access) return;
      try {
        await catalog.recordOpen({
          ...access,
          correlationId: request.id,
          projectId: request.params.projectId,
          organizationId: request.params.organizationId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );
}

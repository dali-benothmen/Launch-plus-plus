import { randomUUID } from "node:crypto";

import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { canAccessOrganization } from "@launchpp/authorization";
import {
  ProjectCatalogService,
  ProjectFolderNameConflictError,
  ProjectNotFoundError,
  ProjectStatusNameConflictError,
  TaskAccessDeniedError,
  TaskAssigneeInvalidError,
  TaskLabelInvalidError,
  TaskLabelNameConflictError,
  TaskNotFoundError,
  TaskOrderInvalidError,
  TaskParentInvalidError,
  TaskProjectUnavailableError,
  TaskRevisionConflictError,
  TaskService,
  TaskStatusInvalidError,
  TaskTeamInvalidError,
} from "@launchpp/core";
import {
  SqliteAuditWriter,
  type SqliteDatabase,
  SqliteInstallationRepository,
  SqliteOrganizationMembershipRepository,
  SqliteOutboxRepository,
  SqlitePluginPackageRepository,
  SqliteProjectRepository,
  SqliteTaskRepository,
  SqliteTeamRepository,
} from "@launchpp/database";
import {
  CapabilityBroker,
  CapabilityBrokerError,
  type CapabilityExecutionContext,
  createCoreCapabilityDefinitions,
} from "@launchpp/plugin-platform";
import {
  PLUGIN_ERROR_CODES,
  PLUGIN_PREVIEW_PERMISSIONS,
  type PreviewPermission,
} from "@launchpp/plugin-protocol";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { type DeveloperModeCoordinator, DeveloperModeError } from "./developer-mode.js";
import { sendProblem } from "./problem-details.js";

interface CapabilityParams {
  readonly capability: string;
  readonly organizationId: string;
  readonly packageId: string;
  readonly projectId?: string;
}

interface CapabilityBody {
  readonly input: unknown;
  readonly requestId: string;
}

const problemResponses = {
  400: { $ref: "LaunchppProblemDetailsV1#" },
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
  404: { $ref: "LaunchppProblemDetailsV1#" },
  408: { $ref: "LaunchppProblemDetailsV1#" },
  409: { $ref: "LaunchppProblemDetailsV1#" },
  413: { $ref: "LaunchppProblemDetailsV1#" },
  429: { $ref: "LaunchppProblemDetailsV1#" },
  500: { $ref: "LaunchppProblemDetailsV1#" },
  503: { $ref: "LaunchppProblemDetailsV1#" },
} as const;

const capabilityBodySchema = {
  additionalProperties: false,
  properties: {
    input: {},
    requestId: { maxLength: 128, minLength: 1, type: "string" },
  },
  required: ["input", "requestId"],
  type: "object",
} as const;

const capabilityParamsSchema = {
  additionalProperties: false,
  properties: {
    capability: { maxLength: 160, minLength: 1, type: "string" },
    organizationId: { maxLength: 128, minLength: 1, type: "string" },
    packageId: { maxLength: 128, minLength: 1, type: "string" },
    projectId: { maxLength: 128, minLength: 1, type: "string" },
  },
  required: ["capability", "organizationId", "packageId"],
  type: "object",
} as const;

function webHeaders(headers: FastifyRequest["headers"]): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) {
      result.set(name, String(value));
    }
  }
  return result;
}

function acceptedPermissions(document: string): readonly PreviewPermission[] {
  let value: unknown;
  try {
    value = JSON.parse(document) as unknown;
  } catch (error) {
    throw new Error("Stored plugin grants are invalid JSON.", { cause: error });
  }
  const allowed = new Set<string>(PLUGIN_PREVIEW_PERMISSIONS);
  if (
    !Array.isArray(value) ||
    value.some((permission) => typeof permission !== "string" || !allowed.has(permission))
  ) {
    throw new Error("Stored plugin grants are invalid.");
  }
  return value as readonly PreviewPermission[];
}

function projectId(context: CapabilityExecutionContext): string {
  if (!context.projectId) {
    throw new CapabilityBrokerError(
      PLUGIN_ERROR_CODES.invalidRequest,
      "This capability requires project context.",
      false,
      context.correlationId,
    );
  }
  return context.projectId;
}

function mapDomainError(error: unknown, correlationId: string): never {
  if (error instanceof CapabilityBrokerError) throw error;
  if (error instanceof TaskAccessDeniedError) {
    throw new CapabilityBrokerError(
      PLUGIN_ERROR_CODES.forbidden,
      error.message,
      false,
      correlationId,
      { cause: error },
    );
  }
  if (
    error instanceof TaskNotFoundError ||
    error instanceof TaskProjectUnavailableError ||
    error instanceof ProjectNotFoundError
  ) {
    throw new CapabilityBrokerError(
      PLUGIN_ERROR_CODES.notFound,
      error.message,
      false,
      correlationId,
      { cause: error },
    );
  }
  if (
    error instanceof TaskRevisionConflictError ||
    error instanceof TaskLabelNameConflictError ||
    error instanceof ProjectFolderNameConflictError ||
    error instanceof ProjectStatusNameConflictError
  ) {
    throw new CapabilityBrokerError(
      PLUGIN_ERROR_CODES.conflict,
      error.message,
      false,
      correlationId,
      { cause: error },
    );
  }
  if (
    error instanceof TaskAssigneeInvalidError ||
    error instanceof TaskLabelInvalidError ||
    error instanceof TaskOrderInvalidError ||
    error instanceof TaskParentInvalidError ||
    error instanceof TaskStatusInvalidError ||
    error instanceof TaskTeamInvalidError ||
    error instanceof TypeError
  ) {
    throw new TypeError(error.message, { cause: error });
  }
  throw error;
}

function statusFor(error: CapabilityBrokerError): number {
  switch (error.code) {
    case PLUGIN_ERROR_CODES.invalidRequest:
      return 400;
    case PLUGIN_ERROR_CODES.unauthorized:
      return 401;
    case PLUGIN_ERROR_CODES.forbidden:
      return 403;
    case PLUGIN_ERROR_CODES.capabilityNotFound:
    case PLUGIN_ERROR_CODES.notFound:
      return 404;
    case PLUGIN_ERROR_CODES.aborted:
    case PLUGIN_ERROR_CODES.timeout:
      return 408;
    case PLUGIN_ERROR_CODES.conflict:
      return 409;
    case PLUGIN_ERROR_CODES.payloadTooLarge:
      return 413;
    case PLUGIN_ERROR_CODES.quotaExceeded:
      return 429;
    case PLUGIN_ERROR_CODES.unavailable:
      return 503;
    default:
      return 500;
  }
}

export async function registerCapabilityBrokerRoutes(
  app: FastifyInstance,
  input: Readonly<{
    database: SqliteDatabase;
    developerMode: DeveloperModeCoordinator;
    identity: BetterAuthIdentityAdapter;
  }>,
): Promise<void> {
  const installations = new SqliteInstallationRepository();
  const memberships = new SqliteOrganizationMembershipRepository();
  const packages = new SqlitePluginPackageRepository();
  const projects = new SqliteProjectRepository();
  const taskService = new TaskService({
    audit: new SqliteAuditWriter(),
    clock: Date.now,
    generateId: randomUUID,
    memberships,
    outbox: new SqliteOutboxRepository(),
    projects,
    tasks: new SqliteTaskRepository(),
    teams: new SqliteTeamRepository(),
    transactions: input.database,
  });
  const projectService = new ProjectCatalogService({
    audit: new SqliteAuditWriter(),
    clock: Date.now,
    generateId: randomUUID,
    outbox: new SqliteOutboxRepository(),
    projects,
    transactions: input.database,
  });

  const requireOwner = (context: CapabilityExecutionContext) => {
    const membership = input.database.read((readContext) =>
      memberships.find(readContext, context.organizationId, context.actorId),
    );
    if (
      !canAccessOrganization(
        { identityId: context.actorId, sessionId: "plugin-capability", type: "user" },
        membership,
        "organization.manage",
      )
    ) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.forbidden,
        "Organization ownership is required for project mutations.",
        false,
        context.correlationId,
      );
    }
  };

  const withDomainErrors = async <Result>(
    context: CapabilityExecutionContext,
    operation: () => Result | Promise<Result>,
  ): Promise<Result> => {
    if (context.signal.aborted) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.aborted,
        "Capability invocation was cancelled.",
        false,
        context.correlationId,
      );
    }
    try {
      return await operation();
    } catch (error) {
      return mapDomainError(error, context.correlationId);
    }
  };

  const services = {
    createComment: (context: CapabilityExecutionContext, value: { body: string; taskId: string }) =>
      withDomainErrors(context, () =>
        taskService.createComment({
          body: value.body,
          correlationId: context.correlationId,
          installationId: context.installationId,
          projectId: projectId(context),
          taskId: value.taskId,
          userId: context.actorId,
          organizationId: context.organizationId,
        }),
      ),
    createProject: (
      context: CapabilityExecutionContext,
      value: { description?: string; folderId?: string; name: string },
    ) =>
      withDomainErrors(context, () => {
        requireOwner(context);
        return projectService.createProject({
          correlationId: context.correlationId,
          ...(value.description === undefined ? {} : { description: value.description }),
          ...(value.folderId === undefined ? {} : { folderId: value.folderId }),
          installationId: context.installationId,
          name: value.name,
          userId: context.actorId,
          organizationId: context.organizationId,
        });
      }),
    createTask: (
      context: CapabilityExecutionContext,
      value: {
        assigneeUserIds?: readonly string[];
        description?: string;
        dueDate?: string;
        labelIds?: readonly string[];
        parentTaskId?: string;
        priority?: "high" | "low" | "medium";
        statusId?: string;
        teamId?: string;
        title: string;
      },
    ) =>
      withDomainErrors(context, () =>
        taskService.createTask({
          ...value,
          correlationId: context.correlationId,
          installationId: context.installationId,
          projectId: projectId(context),
          userId: context.actorId,
          organizationId: context.organizationId,
        }),
      ),
    getTask: (context: CapabilityExecutionContext, value: { taskId: string }) =>
      withDomainErrors(
        context,
        () =>
          taskService.getDetail({
            projectId: projectId(context),
            taskId: value.taskId,
            userId: context.actorId,
            organizationId: context.organizationId,
          }).task,
      ),
    listComments: (context: CapabilityExecutionContext, value: { taskId: string }) =>
      withDomainErrors(
        context,
        () =>
          taskService.getDetail({
            projectId: projectId(context),
            taskId: value.taskId,
            userId: context.actorId,
            organizationId: context.organizationId,
          }).comments,
      ),
    listProjects: (context: CapabilityExecutionContext) =>
      withDomainErrors(context, () =>
        projectService
          .list(context.organizationId, context.actorId)
          .projects.filter(
            (project) => project.archivedAt === undefined && project.deletedAt === undefined,
          ),
      ),
    listTasks: (context: CapabilityExecutionContext) =>
      withDomainErrors(context, () =>
        taskService
          .list({
            projectId: projectId(context),
            userId: context.actorId,
            organizationId: context.organizationId,
          })
          .tasks.filter((task) => task.archivedAt === undefined),
      ),
    updateProject: (
      context: CapabilityExecutionContext,
      value: { description?: string; folderId?: null | string; name?: string },
    ) =>
      withDomainErrors(context, () => {
        requireOwner(context);
        return projectService.updateProject({
          correlationId: context.correlationId,
          ...value,
          installationId: context.installationId,
          projectId: projectId(context),
          userId: context.actorId,
          organizationId: context.organizationId,
        });
      }),
    updateTask: (
      context: CapabilityExecutionContext,
      value: {
        description?: string;
        dueDate?: null | string;
        expectedRevision: number;
        priority?: "high" | "low" | "medium";
        taskId: string;
        teamId?: null | string;
        title?: string;
      },
    ) =>
      withDomainErrors(context, () =>
        taskService.updateTask({
          correlationId: context.correlationId,
          ...value,
          installationId: context.installationId,
          projectId: projectId(context),
          userId: context.actorId,
          organizationId: context.organizationId,
        }),
      ),
  };

  const broker = new CapabilityBroker({
    authority: {
      resolve: (context) =>
        input.database.read((readContext) => {
          const membership = memberships.find(readContext, context.organizationId, context.actorId);
          if (
            !canAccessOrganization(
              { identityId: context.actorId, sessionId: "plugin-capability", type: "user" },
              membership,
              "organization.read",
            )
          ) {
            throw new CapabilityBrokerError(
              PLUGIN_ERROR_CODES.forbidden,
              "Active organization membership is required.",
              false,
              context.correlationId,
            );
          }
          if (context.projectId) {
            const project = projects.findProjectById(readContext, context.projectId);
            if (
              !project ||
              project.organizationId !== context.organizationId ||
              project.archivedAt !== undefined ||
              project.deletedAt !== undefined
            ) {
              throw new CapabilityBrokerError(
                PLUGIN_ERROR_CODES.notFound,
                "The project is unavailable.",
                false,
                context.correlationId,
              );
            }
          }
          try {
            const developmentGrant = input.developerMode.grantFor({
              actorUserId: context.actorId,
              organizationId: context.organizationId,
              packageId: context.packageId,
              ...(context.projectId ? { projectId: context.projectId } : {}),
            });
            if (developmentGrant) return developmentGrant;
          } catch (error) {
            if (error instanceof DeveloperModeError) {
              throw new CapabilityBrokerError(
                PLUGIN_ERROR_CODES.unavailable,
                error.message,
                false,
                context.correlationId,
              );
            }
            throw error;
          }
          const enabled = packages.findEnabledByPackageId(
            readContext,
            context.organizationId,
            context.packageId,
          );
          const pluginPackage = packages.findById(
            readContext,
            context.installationId,
            context.packageId,
          );
          if (!enabled || !pluginPackage || enabled.pluginId !== pluginPackage.pluginId) {
            throw new CapabilityBrokerError(
              PLUGIN_ERROR_CODES.unavailable,
              "The plugin package is not enabled for this organization.",
              false,
              context.correlationId,
            );
          }
          return {
            grantedPermissions: acceptedPermissions(enabled.acceptedPermissionsJson),
            pluginId: enabled.pluginId,
            projectEnabled: context.projectId
              ? packages
                  .listProjectEnabledPackageIds(
                    readContext,
                    context.organizationId,
                    context.projectId,
                  )
                  .includes(context.packageId)
              : false,
          };
        }),
    },
    definitions: createCoreCapabilityDefinitions(services),
  });

  const invoke = async (
    request: FastifyRequest<{ Body: CapabilityBody; Params: CapabilityParams }>,
    reply: FastifyReply,
  ) => {
    const session = await input.identity.resolveSession(webHeaders(request.headers));
    if (!session) {
      return sendProblem(
        reply,
        request,
        401,
        "unauthenticated",
        "Authentication required",
        "Sign in to invoke plugin capabilities.",
      );
    }
    const installation = input.database.read((context) => installations.findFirst(context));
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

    const controller = new AbortController();
    const abort = () => controller.abort(new Error("Client disconnected."));
    request.raw.once("aborted", abort);
    try {
      const invocation = broker.begin(
        {
          actorId: session.identity.id,
          correlationId: request.id,
          installationId: installation.id,
          organizationId: request.params.organizationId,
          packageId: request.params.packageId,
          ...(request.params.projectId ? { projectId: request.params.projectId } : {}),
        },
        { signal: controller.signal },
      );
      const output = await invocation.call(request.params.capability, request.body.input);
      return {
        correlationId: request.id,
        output,
        requestId: request.body.requestId,
      };
    } catch (error) {
      if (!(error instanceof CapabilityBrokerError)) throw error;
      return sendProblem(
        reply,
        request,
        statusFor(error),
        error.code.toLocaleLowerCase(),
        "Plugin capability failed",
        error.message,
        error.details === undefined ? undefined : { brokerDetails: error.details },
      );
    } finally {
      request.raw.off("aborted", abort);
    }
  };

  app.post<{ Body: CapabilityBody; Params: CapabilityParams }>(
    "/api/v1/organizations/:organizationId/plugin-packages/:packageId/capabilities/:capability",
    {
      schema: {
        body: capabilityBodySchema,
        operationId: "invokeOrganizationPluginCapability",
        params: capabilityParamsSchema,
        response: {
          200: {
            additionalProperties: false,
            properties: {
              correlationId: { type: "string" },
              output: {},
              requestId: { type: "string" },
            },
            required: ["correlationId", "output", "requestId"],
            type: "object",
          },
          ...problemResponses,
        },
        summary: "Invoke an organization-scoped plugin capability",
        tags: ["Plugins"],
      },
    },
    invoke,
  );

  app.post<{ Body: CapabilityBody; Params: CapabilityParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/plugin-packages/:packageId/capabilities/:capability",
    {
      schema: {
        body: capabilityBodySchema,
        operationId: "invokeProjectPluginCapability",
        params: {
          ...capabilityParamsSchema,
          required: ["capability", "organizationId", "packageId", "projectId"],
        },
        response: {
          200: {
            additionalProperties: false,
            properties: {
              correlationId: { type: "string" },
              output: {},
              requestId: { type: "string" },
            },
            required: ["correlationId", "output", "requestId"],
            type: "object",
          },
          ...problemResponses,
        },
        summary: "Invoke a project-scoped plugin capability",
        tags: ["Plugins"],
      },
    },
    invoke,
  );
}

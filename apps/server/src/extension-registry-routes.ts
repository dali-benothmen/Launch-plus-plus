import { randomUUID } from "node:crypto";

import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { actorFromIdentitySession, canAccessOrganization } from "@launchpp/authorization";
import {
  type EnabledOrganizationPluginPackageRecord,
  SqliteAuditWriter,
  type SqliteDatabase,
  SqliteInstallationRepository,
  SqliteOrganizationMembershipRepository,
  SqlitePluginPackageRepository,
  SqliteProjectRepository,
} from "@launchpp/database";
import { resolveExtensionRegistry } from "@launchpp/plugin-platform";
import {
  PLUGIN_PREVIEW_PERMISSIONS,
  type PluginPackageManifest,
  type PreviewPermission,
  validatePluginPackageManifest,
} from "@launchpp/plugin-protocol";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { sendProblem } from "./problem-details.js";

const problemResponses = {
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
  404: { $ref: "LaunchppProblemDetailsV1#" },
  409: { $ref: "LaunchppProblemDetailsV1#" },
  503: { $ref: "LaunchppProblemDetailsV1#" },
} as const;

interface ProjectPackageParams {
  readonly organizationId: string;
  readonly packageId: string;
  readonly projectId: string;
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

function storedManifest(record: EnabledOrganizationPluginPackageRecord): PluginPackageManifest {
  let document: unknown;
  try {
    document = JSON.parse(record.manifestJson) as unknown;
  } catch (error) {
    throw new Error(`Stored manifest for plugin package '${record.id}' is invalid JSON.`, {
      cause: error,
    });
  }
  const result = validatePluginPackageManifest(document);
  if (!result.ok) throw new Error(`Stored manifest for plugin package '${record.id}' is invalid.`);
  return result.value;
}

function acceptedPermissions(record: EnabledOrganizationPluginPackageRecord): PreviewPermission[] {
  let document: unknown;
  try {
    document = JSON.parse(record.acceptedPermissionsJson) as unknown;
  } catch (error) {
    throw new Error(`Stored grants for plugin package '${record.id}' are invalid JSON.`, {
      cause: error,
    });
  }
  const allowed = new Set<string>(PLUGIN_PREVIEW_PERMISSIONS);
  if (
    !Array.isArray(document) ||
    document.some((item) => typeof item !== "string" || !allowed.has(item))
  ) {
    throw new Error(`Stored grants for plugin package '${record.id}' are invalid.`);
  }
  return document as PreviewPermission[];
}

export async function registerExtensionRegistryRoutes(
  app: FastifyInstance,
  input: Readonly<{ database: SqliteDatabase; identity: BetterAuthIdentityAdapter }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const installations = new SqliteInstallationRepository();
  const memberships = new SqliteOrganizationMembershipRepository();
  const packages = new SqlitePluginPackageRepository();
  const projects = new SqliteProjectRepository();

  const authorize = async (
    request: FastifyRequest,
    reply: FastifyReply,
    organizationId: string,
    manage: boolean,
  ) => {
    const session = await input.identity.resolveSession(webHeaders(request.headers));
    if (!session) {
      sendProblem(
        reply,
        request,
        401,
        "unauthenticated",
        "Authentication required",
        "Sign in to access extensions.",
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
        actorFromIdentitySession(session),
        membership,
        manage ? "organization.manage" : "organization.read",
      )
    ) {
      sendProblem(
        reply,
        request,
        403,
        "extension_registry_denied",
        "Extension access denied",
        manage
          ? "Organization ownership is required to change project extension activation."
          : "Active organization membership is required to read the extension registry.",
      );
      return undefined;
    }
    return { installation, userId: session.identity.id };
  };

  const requireProject = (
    request: FastifyRequest,
    reply: FastifyReply,
    organizationId: string,
    projectId: string,
  ) => {
    const project = input.database.read((context) => projects.findProjectById(context, projectId));
    if (
      !project ||
      project.organizationId !== organizationId ||
      project.archivedAt !== undefined ||
      project.deletedAt !== undefined
    ) {
      sendProblem(
        reply,
        request,
        404,
        "project_not_found",
        "Project not found",
        "The project does not exist in this organization.",
      );
      return undefined;
    }
    return project;
  };

  const resolve = (installationId: string, organizationId: string, projectId?: string) => {
    const enabled = input.database.read((context) =>
      packages.listEnabledForOrganization(context, installationId, organizationId),
    );
    const projectPackageIds = new Set(
      projectId
        ? input.database.read((context) =>
            packages.listProjectEnabledPackageIds(context, organizationId, projectId),
          )
        : [],
    );
    return resolveExtensionRegistry(
      { organizationId, ...(projectId ? { projectId } : {}) },
      enabled.map((record) => ({
        acceptedPermissions: acceptedPermissions(record),
        manifest: storedManifest(record),
        packageId: record.id,
        projectEnabled: projectPackageIds.has(record.id),
      })),
    );
  };

  app.get<{ Params: { readonly organizationId: string } }>(
    "/api/v1/organizations/:organizationId/extensions/registry",
    {
      schema: {
        operationId: "getOrganizationExtensionRegistry",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: { 200: { $ref: "LaunchppExtensionRegistryV1#" }, ...problemResponses },
        summary: "Resolve organization extension contributions",
        tags: ["Plugins"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, false);
      if (!access) return;
      return resolve(access.installation.id, request.params.organizationId);
    },
  );

  app.get<{ Params: { readonly organizationId: string; readonly projectId: string } }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/extensions/registry",
    {
      schema: {
        operationId: "getProjectExtensionRegistry",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: { 200: { $ref: "LaunchppExtensionRegistryV1#" }, ...problemResponses },
        summary: "Resolve project extension contributions",
        tags: ["Plugins"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, false);
      if (
        !access ||
        !requireProject(request, reply, request.params.organizationId, request.params.projectId)
      ) {
        return;
      }
      return resolve(
        access.installation.id,
        request.params.organizationId,
        request.params.projectId,
      );
    },
  );

  app.post<{ Params: ProjectPackageParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/plugin-packages/:packageId/enable",
    {
      schema: {
        operationId: "enableProjectPluginPackage",
        params: {
          additionalProperties: false,
          properties: {
            organizationId: { maxLength: 100, minLength: 1, type: "string" },
            packageId: { maxLength: 100, minLength: 1, type: "string" },
            projectId: { maxLength: 100, minLength: 1, type: "string" },
          },
          required: ["organizationId", "packageId", "projectId"],
          type: "object",
        },
        response: { 200: { $ref: "LaunchppExtensionRegistryV1#" }, ...problemResponses },
        summary: "Enable an organization plugin for one project",
        tags: ["Plugins"],
      },
    },
    async (request, reply) => {
      const { organizationId, packageId, projectId } = request.params;
      const access = await authorize(request, reply, organizationId, true);
      if (!access || !requireProject(request, reply, organizationId, projectId)) return;
      const enabled = input.database.read((context) =>
        packages.findEnabledByPackageId(context, organizationId, packageId),
      );
      if (!enabled) {
        return sendProblem(
          reply,
          request,
          409,
          "plugin_not_enabled_for_organization",
          "Plugin is not enabled",
          "Enable this exact package for the organization before enabling its project contributions.",
        );
      }
      const now = Date.now();
      await input.database.write((context) => {
        packages.enableForProject(context, {
          enabledAt: now,
          enabledByUserId: access.userId,
          organizationId,
          pluginId: enabled.pluginId,
          pluginPackageId: enabled.pluginPackageId,
          projectId,
          updatedAt: now,
        });
        audit.append(context, {
          actorId: access.userId,
          actorType: "user",
          correlationId: request.id,
          id: randomUUID(),
          installationId: access.installation.id,
          metadata: { packageId, pluginId: enabled.pluginId },
          occurredAt: now,
          operation: "plugin.project.enabled",
          organizationId,
          outcome: "succeeded",
          targetId: projectId,
          targetType: "project",
        });
      });
      return resolve(access.installation.id, organizationId, projectId);
    },
  );

  app.delete<{ Params: ProjectPackageParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/plugin-packages/:packageId/enable",
    {
      schema: {
        operationId: "disableProjectPluginPackage",
        params: {
          additionalProperties: false,
          properties: {
            organizationId: { maxLength: 100, minLength: 1, type: "string" },
            packageId: { maxLength: 100, minLength: 1, type: "string" },
            projectId: { maxLength: 100, minLength: 1, type: "string" },
          },
          required: ["organizationId", "packageId", "projectId"],
          type: "object",
        },
        response: { 204: { type: "null" }, ...problemResponses },
        summary: "Disable a plugin for one project",
        tags: ["Plugins"],
      },
    },
    async (request, reply) => {
      const { organizationId, packageId, projectId } = request.params;
      const access = await authorize(request, reply, organizationId, true);
      if (!access || !requireProject(request, reply, organizationId, projectId)) return;
      const enabled = input.database.read((context) =>
        packages.findEnabledByPackageId(context, organizationId, packageId),
      );
      if (!enabled) {
        return sendProblem(
          reply,
          request,
          404,
          "plugin_package_not_found",
          "Plugin package not found",
          "This package is not enabled for the organization.",
        );
      }
      const now = Date.now();
      await input.database.write((context) => {
        packages.disableForProject(context, organizationId, projectId, enabled.pluginId);
        audit.append(context, {
          actorId: access.userId,
          actorType: "user",
          correlationId: request.id,
          id: randomUUID(),
          installationId: access.installation.id,
          metadata: { packageId, pluginId: enabled.pluginId },
          occurredAt: now,
          operation: "plugin.project.disabled",
          organizationId,
          outcome: "succeeded",
          targetId: projectId,
          targetType: "project",
        });
      });
      return reply.status(204).send();
    },
  );
}

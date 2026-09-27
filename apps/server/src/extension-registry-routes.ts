import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { actorFromIdentitySession, canAccessOrganization } from "@launchpp/authorization";
import {
  type EnabledInstallationPluginPackageRecord,
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

import type { DeveloperModeCoordinator } from "./developer-mode.js";
import { sendProblem } from "./problem-details.js";

const problemResponses = {
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

function storedManifest(record: EnabledInstallationPluginPackageRecord): PluginPackageManifest {
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

function acceptedPermissions(record: EnabledInstallationPluginPackageRecord): PreviewPermission[] {
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

  const authorize = async (
    request: FastifyRequest,
    reply: FastifyReply,
    organizationId: string,
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
      !canAccessOrganization(actorFromIdentitySession(session), membership, "organization.read")
    ) {
      sendProblem(
        reply,
        request,
        403,
        "extension_registry_denied",
        "Extension access denied",
        "Active organization membership is required to read the extension registry.",
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

  const resolve = (
    installationId: string,
    userId: string,
    organizationId: string,
    projectId?: string,
  ) => {
    const enabled = input.database.read((context) => packages.listEnabled(context, installationId));
    const connected = input.developerMode.packagesFor(userId, organizationId, projectId);
    const connectedPluginIds = new Set(connected.map((item) => item.manifest.id));
    return resolveExtensionRegistry({ organizationId, ...(projectId ? { projectId } : {}) }, [
      ...enabled
        .filter((record) => !connectedPluginIds.has(record.pluginId))
        .map((record) => ({
          acceptedPermissions: acceptedPermissions(record),
          manifest: storedManifest(record),
          packageId: record.id,
          projectEnabled: true,
        })),
      ...connected,
    ]);
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
      const access = await authorize(request, reply, request.params.organizationId);
      if (!access) return;
      return resolve(access.installation.id, access.userId, request.params.organizationId);
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
      const access = await authorize(request, reply, request.params.organizationId);
      if (
        !access ||
        !requireProject(request, reply, request.params.organizationId, request.params.projectId)
      ) {
        return;
      }
      return resolve(
        access.installation.id,
        access.userId,
        request.params.organizationId,
        request.params.projectId,
      );
    },
  );
}

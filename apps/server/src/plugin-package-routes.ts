import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";

import type { PluginPackageSummary } from "@launchpp/api-contracts";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import {
  type InstallationPluginPackageRecord,
  type PluginPackageRecord,
  SqliteAuditWriter,
  type SqliteDatabase,
  SqliteInstallationRepository,
  SqliteOrganizationMembershipRepository,
  SqlitePluginPackageRepository,
} from "@launchpp/database";
import {
  type PluginPackageManifest,
  validatePluginPackageManifest,
} from "@launchpp/plugin-protocol";
import {
  DEFAULT_PLUGIN_ARCHIVE_LIMITS,
  inspectPreviewPluginArchive,
  PluginArchiveError,
  stagePreviewPluginArchive,
} from "@launchpp/plugin-runtime";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { sendProblem } from "./problem-details.js";

const pluginPackageMediaType = "application/vnd.launchpp.plugin";
const problemResponses = {
  400: { $ref: "LaunchppProblemDetailsV1#" },
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
  404: { $ref: "LaunchppProblemDetailsV1#" },
  409: { $ref: "LaunchppProblemDetailsV1#" },
  413: { $ref: "LaunchppProblemDetailsV1#" },
  500: { $ref: "LaunchppProblemDetailsV1#" },
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

function sourceFileName(header: string | string[] | undefined): string {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return "package.launch-plugin";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Retain the literal safe basename when the header is not URI encoded.
  }
  const name = path
    .basename(decoded.replaceAll("\\", "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return name.length > 0 ? name.slice(0, 240) : "package.launch-plugin";
}

function contributionPreview(manifest: PluginPackageManifest) {
  const contributions = manifest.contributes;
  return [
    ...(contributions?.pages ?? []).map((item) => ({
      id: item.id,
      kind: "page" as const,
      placement: item.scope,
      title: item.title,
    })),
    ...(contributions?.panels ?? []).map((item) => ({
      id: item.id,
      kind: "panel" as const,
      placement: item.slot,
      title: item.title,
    })),
    ...(contributions?.actions ?? []).map((item) => ({
      id: item.id,
      kind: "action" as const,
      placement: item.slot,
      title: item.title,
    })),
    ...(contributions?.settings ?? []).map((item) => ({
      id: item.id,
      kind: "settings" as const,
      placement: item.scope,
      title: item.title,
    })),
    ...(contributions?.taskFields ?? []).map((item) => ({
      id: item.id,
      kind: "taskField" as const,
      ...(item.placements ? { placement: item.placements.join(", ") } : {}),
      title: item.label,
    })),
  ];
}

function parseStoredManifest(record: PluginPackageRecord): PluginPackageManifest {
  let document: unknown;
  try {
    document = JSON.parse(record.manifestJson) as unknown;
  } catch (error) {
    throw new Error(`Stored manifest for plugin package '${record.id}' is invalid JSON.`, {
      cause: error,
    });
  }
  const result = validatePluginPackageManifest(document);
  if (!result.ok) {
    throw new Error(`Stored manifest for plugin package '${record.id}' is invalid.`);
  }
  return result.value;
}

function packageSummary(record: InstallationPluginPackageRecord): PluginPackageSummary {
  const manifest = parseStoredManifest(record);
  return {
    archiveSizeBytes: record.archiveSizeBytes,
    compatibility: {
      apiMaximumExclusive: manifest.apiVersion.maximumExclusive,
      apiMinimum: manifest.apiVersion.minimum,
      ...(manifest.compatibility?.host ? { host: manifest.compatibility.host } : {}),
      ...(manifest.compatibility?.sdk ? { sdk: manifest.compatibility.sdk } : {}),
      ...(manifest.compatibility?.ui ? { ui: manifest.compatibility.ui } : {}),
    },
    contributions: contributionPreview(manifest),
    ...(manifest.description ? { description: manifest.description } : {}),
    ...(record.enabledAt === undefined ? {} : { enabledAt: record.enabledAt }),
    id: record.id,
    name: manifest.name,
    packageHash: record.packageHash,
    pluginId: record.pluginId,
    provenance: {
      kind: record.provenanceKind,
      label: "Unsigned local package",
      sourceFileName: record.sourceFileName,
    },
    requestedPermissions: manifest.permissions,
    state: record.enabledAt === undefined ? "staged" : "enabled",
    uploadedAt: record.uploadedAt,
    version: record.version,
  };
}

export async function registerPluginPackageRoutes(
  app: FastifyInstance,
  input: Readonly<{
    database: SqliteDatabase;
    databasePath: string;
    identity: BetterAuthIdentityAdapter;
  }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const installations = new SqliteInstallationRepository();
  const memberships = new SqliteOrganizationMembershipRepository();
  const packages = new SqlitePluginPackageRepository();
  const packageRoot = path.join(path.dirname(path.resolve(input.databasePath)), "packages");

  app.addContentTypeParser(
    [pluginPackageMediaType, "application/zip"],
    { bodyLimit: DEFAULT_PLUGIN_ARCHIVE_LIMITS.maxArchiveBytes, parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );

  const authorizeOwner = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await input.identity.resolveSession(webHeaders(request.headers));
    if (!session) {
      sendProblem(
        reply,
        request,
        401,
        "unauthenticated",
        "Authentication required",
        "Sign in to manage plugins.",
      );
      return undefined;
    }
    const installation = input.database.read((context) => installations.findFirst(context));
    if (!installation) {
      sendProblem(reply, request, 503, "setup_required", "Setup required", "Setup is incomplete.");
      return undefined;
    }
    const membership = input.database.read((context) =>
      memberships.findActiveOwnerForUser(context, session.identity.id),
    );
    if (!membership) {
      sendProblem(
        reply,
        request,
        403,
        "plugin_management_denied",
        "Plugin management denied",
        "Organization ownership is required to manage app plugins.",
      );
      return undefined;
    }
    return { installation, organizationId: membership.organizationId, userId: session.identity.id };
  };

  app.get(
    "/api/v1/plugin-packages",
    {
      schema: {
        operationId: "listPluginPackages",
        response: {
          200: { items: { $ref: "LaunchppPluginPackageSummaryV1#" }, type: "array" },
          ...problemResponses,
        },
        summary: "List staged plugin packages",
        tags: ["Plugins"],
      },
    },
    async (request, reply) => {
      const access = await authorizeOwner(request, reply);
      if (!access) return;
      return input.database
        .read((context) => packages.listForInstallation(context, access.installation.id))
        .map(packageSummary);
    },
  );

  app.post<{
    Body: Buffer;
  }>(
    "/api/v1/plugin-packages",
    {
      bodyLimit: DEFAULT_PLUGIN_ARCHIVE_LIMITS.maxArchiveBytes,
      schema: {
        consumes: [pluginPackageMediaType],
        operationId: "stagePluginPackage",
        response: {
          200: { $ref: "LaunchppPluginPackageSummaryV1#" },
          201: { $ref: "LaunchppPluginPackageSummaryV1#" },
          ...problemResponses,
        },
        summary: "Inspect and atomically stage a plugin package",
        tags: ["Plugins"],
      },
    },
    async (request, reply) => {
      const access = await authorizeOwner(request, reply);
      if (!access) return;
      if (!Buffer.isBuffer(request.body) || request.body.byteLength === 0) {
        return sendProblem(
          reply,
          request,
          400,
          "plugin_archive_required",
          "Plugin archive required",
          "Upload a non-empty .launch-plugin archive.",
        );
      }

      try {
        const inspected = inspectPreviewPluginArchive(request.body);
        const existing = input.database.read((context) =>
          packages.findByIdentity(
            context,
            access.installation.id,
            inspected.manifest.id,
            inspected.manifest.version,
          ),
        );
        if (existing) {
          if (existing.packageHash !== inspected.packageHash) {
            return sendProblem(
              reply,
              request,
              409,
              "plugin_package_identity_conflict",
              "Plugin package conflict",
              "A different unsigned archive already uses this plugin ID and version. Publish a new version before staging it.",
            );
          }
          const current = input.database.read((context) =>
            packages
              .listForInstallation(context, access.installation.id)
              .find((item) => item.id === existing.id),
          );
          return packageSummary(current ?? existing);
        }

        const staged = await stagePreviewPluginArchive(request.body, packageRoot);
        const now = Date.now();
        const record: PluginPackageRecord = {
          archiveSizeBytes: request.body.byteLength,
          id: randomUUID(),
          installationId: access.installation.id,
          integrityJson: JSON.stringify(staged.integrity),
          manifestJson: JSON.stringify(staged.manifest),
          packageHash: staged.packageHash,
          pluginId: staged.manifest.id,
          provenanceKind: "unsigned-local",
          sourceFileName: sourceFileName(request.headers["x-launchpp-file-name"]),
          uploadedAt: now,
          uploadedByUserId: access.userId,
          version: staged.manifest.version,
        };
        try {
          await input.database.write((context) => {
            packages.create(context, record);
            audit.append(context, {
              actorId: access.userId,
              actorType: "user",
              correlationId: request.id,
              id: randomUUID(),
              installationId: access.installation.id,
              metadata: {
                packageHash: record.packageHash,
                pluginId: record.pluginId,
                provenance: record.provenanceKind,
                version: record.version,
              },
              occurredAt: now,
              operation: "plugin.package.staged",
              organizationId: access.organizationId,
              outcome: "succeeded",
              targetId: record.id,
              targetType: "pluginPackage",
            });
          });
        } catch (error) {
          if (!staged.alreadyStaged) {
            await rm(staged.directory, { force: true, recursive: true }).catch(() => undefined);
          }
          throw error;
        }
        return reply.status(201).send(packageSummary(record));
      } catch (error) {
        if (error instanceof PluginArchiveError) {
          const status = error.code === "ARCHIVE_TOO_LARGE" ? 413 : 400;
          return sendProblem(
            reply,
            request,
            status,
            error.code.toLocaleLowerCase(),
            "Plugin package rejected",
            error.message,
          );
        }
        throw error;
      }
    },
  );

  app.post<{ Params: { readonly packageId: string } }>(
    "/api/v1/plugin-packages/:packageId/activate",
    {
      schema: {
        operationId: "activatePluginPackage",
        params: {
          additionalProperties: false,
          properties: { packageId: { maxLength: 100, minLength: 1, type: "string" } },
          required: ["packageId"],
          type: "object",
        },
        response: { 200: { $ref: "LaunchppPluginPackageSummaryV1#" }, ...problemResponses },
        summary: "Activate a staged package for the Launch++ app",
        tags: ["Plugins"],
      },
    },
    async (request, reply) => {
      const access = await authorizeOwner(request, reply);
      if (!access) return;
      const record = input.database.read((context) =>
        packages.findById(context, access.installation.id, request.params.packageId),
      );
      if (!record) {
        return sendProblem(
          reply,
          request,
          404,
          "plugin_package_not_found",
          "Plugin package not found",
          "The staged plugin package does not exist.",
        );
      }
      const manifest = parseStoredManifest(record);
      const now = Date.now();
      await input.database.write((context) => {
        packages.enable(context, {
          acceptedPermissionsJson: JSON.stringify(manifest.permissions),
          enabledAt: now,
          enabledByUserId: access.userId,
          installationId: access.installation.id,
          pluginId: record.pluginId,
          pluginPackageId: record.id,
          updatedAt: now,
        });
        audit.append(context, {
          actorId: access.userId,
          actorType: "user",
          correlationId: request.id,
          id: randomUUID(),
          installationId: access.installation.id,
          metadata: {
            acceptedPermissions: manifest.permissions,
            packageHash: record.packageHash,
            pluginId: record.pluginId,
            version: record.version,
          },
          occurredAt: now,
          operation: "plugin.installation.activated",
          organizationId: access.organizationId,
          outcome: "succeeded",
          targetId: record.id,
          targetType: "pluginPackage",
        });
      });
      return packageSummary({ ...record, enabledAt: now });
    },
  );

  app.delete<{ Params: { readonly packageId: string } }>(
    "/api/v1/plugin-packages/:packageId/activate",
    {
      schema: {
        operationId: "deactivatePluginPackage",
        params: {
          additionalProperties: false,
          properties: { packageId: { maxLength: 100, minLength: 1, type: "string" } },
          required: ["packageId"],
          type: "object",
        },
        response: { 204: { type: "null" }, ...problemResponses },
        summary: "Deactivate a plugin across the Launch++ app",
        tags: ["Plugins"],
      },
    },
    async (request, reply) => {
      const access = await authorizeOwner(request, reply);
      if (!access) return;
      const record = input.database.read((context) =>
        packages.findById(context, access.installation.id, request.params.packageId),
      );
      const enabled = record
        ? input.database.read((context) =>
            packages.findEnabledByPackageId(context, access.installation.id, record.id),
          )
        : undefined;
      if (!record || !enabled) {
        return sendProblem(
          reply,
          request,
          404,
          "plugin_package_not_active",
          "Plugin is not active",
          "The plugin package is not active in this Launch++ app.",
        );
      }
      const now = Date.now();
      await input.database.write((context) => {
        packages.disable(context, access.installation.id, record.pluginId);
        audit.append(context, {
          actorId: access.userId,
          actorType: "user",
          correlationId: request.id,
          id: randomUUID(),
          installationId: access.installation.id,
          metadata: {
            packageHash: record.packageHash,
            pluginId: record.pluginId,
            version: record.version,
          },
          occurredAt: now,
          operation: "plugin.installation.deactivated",
          organizationId: access.organizationId,
          outcome: "succeeded",
          targetId: record.id,
          targetType: "pluginPackage",
        });
      });
      return reply.status(204).send();
    },
  );
}

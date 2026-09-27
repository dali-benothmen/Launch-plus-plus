import { randomUUID } from "node:crypto";

import type { UpdateTaskExtensionFieldInput } from "@launchpp/api-contracts";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { actorFromIdentitySession, canAccessOrganization } from "@launchpp/authorization";
import {
  type EnabledOrganizationPluginPackageRecord,
  SqliteAuditWriter,
  type SqliteDatabase,
  SqliteInstallationRepository,
  SqliteOrganizationMembershipRepository,
  SqliteOutboxRepository,
  SqlitePluginFieldValueRepository,
  SqlitePluginPackageRepository,
  SqliteTaskRepository,
} from "@launchpp/database";
import { stableContributionId } from "@launchpp/plugin-platform";
import {
  type PluginPackageManifest,
  validatePluginPackageManifest,
} from "@launchpp/plugin-protocol";
import type { FastifyInstance, FastifyRequest } from "fastify";

import type { DeveloperModeCoordinator } from "./developer-mode.js";
import { sendProblem } from "./problem-details.js";

interface FieldParams {
  readonly fieldId: string;
  readonly organizationId: string;
  readonly pluginId: string;
  readonly projectId: string;
  readonly taskId: string;
}

const problemResponses = {
  400: { $ref: "LaunchppProblemDetailsV1#" },
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
  404: { $ref: "LaunchppProblemDetailsV1#" },
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

function storedManifest(record: EnabledOrganizationPluginPackageRecord): PluginPackageManifest {
  const validation = validatePluginPackageManifest(JSON.parse(record.manifestJson) as unknown);
  if (!validation.ok) throw new Error(`Stored manifest for '${record.pluginId}' is invalid.`);
  return validation.value;
}

function fieldValues(
  database: SqliteDatabase,
  repository: SqlitePluginFieldValueRepository,
  params: FieldParams,
) {
  return Object.fromEntries(
    database
      .read((context) =>
        repository.listForTask(context, params.organizationId, params.projectId, params.taskId),
      )
      .map((item) => [stableContributionId(item.pluginId, "field", item.fieldId), item.value]),
  );
}

export async function registerPluginFieldRoutes(
  app: FastifyInstance,
  input: Readonly<{
    database: SqliteDatabase;
    developerMode: DeveloperModeCoordinator;
    identity: BetterAuthIdentityAdapter;
  }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const fields = new SqlitePluginFieldValueRepository();
  const installations = new SqliteInstallationRepository();
  const memberships = new SqliteOrganizationMembershipRepository();
  const outbox = new SqliteOutboxRepository();
  const packages = new SqlitePluginPackageRepository();
  const tasks = new SqliteTaskRepository();

  app.put<{ Body: UpdateTaskExtensionFieldInput; Params: FieldParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/extension-fields/:pluginId/:fieldId",
    {
      schema: {
        body: { $ref: "LaunchppUpdateTaskExtensionFieldInputV1#" },
        operationId: "updateTaskExtensionField",
        params: { $ref: "LaunchppTaskExtensionFieldParamsV1#" },
        response: {
          200: { $ref: "LaunchppTaskExtensionFieldValuesV1#" },
          ...problemResponses,
        },
        summary: "Update a host-managed task field",
        tags: ["Plugins", "Tasks"],
      },
    },
    async (request, reply) => {
      const session = await input.identity.resolveSession(webHeaders(request.headers));
      if (!session) {
        sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to edit task fields.",
        );
        return;
      }
      const installation = input.database.read((context) => installations.findFirst(context));
      if (!installation) {
        sendProblem(
          reply,
          request,
          503,
          "setup_required",
          "Setup required",
          "Setup is incomplete.",
        );
        return;
      }
      const membership = input.database.read((context) =>
        memberships.find(context, request.params.organizationId, session.identity.id),
      );
      if (
        !canAccessOrganization(actorFromIdentitySession(session), membership, "organization.read")
      ) {
        sendProblem(
          reply,
          request,
          403,
          "task_field_denied",
          "Task field access denied",
          "Active organization membership is required to edit task fields.",
        );
        return;
      }

      const task = input.database.read((context) =>
        tasks.findTaskById(context, request.params.taskId),
      );
      if (
        !task ||
        task.organizationId !== request.params.organizationId ||
        task.projectId !== request.params.projectId ||
        task.archivedAt !== undefined ||
        task.deletedAt !== undefined
      ) {
        sendProblem(
          reply,
          request,
          404,
          "task_not_found",
          "Task not found",
          "The task is unavailable.",
        );
        return;
      }

      const installed = input.database.read((context) => {
        const enabledProjectPackages = new Set(
          packages.listProjectEnabledPackageIds(
            context,
            request.params.organizationId,
            request.params.projectId,
          ),
        );
        return packages
          .listEnabledForOrganization(context, installation.id, request.params.organizationId)
          .filter((item) => enabledProjectPackages.has(item.id))
          .map((item) => storedManifest(item));
      });
      const connected = input.developerMode
        .packagesFor(session.identity.id, request.params.organizationId, request.params.projectId)
        .filter((item) => item.projectEnabled)
        .map((item) => item.manifest);
      const manifest = [...connected, ...installed].find(
        (item) => item.id === request.params.pluginId,
      );
      const field = manifest?.contributes?.taskFields?.find(
        (item) => item.id === request.params.fieldId,
      );
      if (!manifest || !field) {
        sendProblem(
          reply,
          request,
          404,
          "task_field_unavailable",
          "Task field unavailable",
          "Enable the plugin for this project before editing its task field.",
        );
        return;
      }

      const value = request.body.value;
      if (
        (field.type === "number" &&
          value !== null &&
          (typeof value !== "number" || !Number.isFinite(value))) ||
        (field.type === "text" && value !== null && typeof value !== "string")
      ) {
        sendProblem(
          reply,
          request,
          400,
          "task_field_type_invalid",
          "Task field value is invalid",
          `${field.label} requires a ${field.type} value.`,
        );
        return;
      }

      const now = Date.now();
      await input.database.write((context) => {
        if (value === null || (typeof value === "string" && value.trim().length === 0)) {
          fields.remove(context, {
            fieldId: field.id,
            pluginId: manifest.id,
            taskId: task.id,
          });
        } else {
          fields.set(context, {
            fieldId: field.id,
            organizationId: task.organizationId,
            pluginId: manifest.id,
            projectId: task.projectId,
            taskId: task.id,
            updatedAt: now,
            updatedByUserId: session.identity.id,
            value: typeof value === "string" ? value.trim() : value,
            valueType: field.type,
          });
        }
        audit.append(context, {
          actorId: session.identity.id,
          actorType: "user",
          correlationId: request.id,
          id: randomUUID(),
          installationId: installation.id,
          metadata: { fieldId: field.id, pluginId: manifest.id, projectId: task.projectId },
          occurredAt: now,
          operation: "task.extension_field_updated",
          outcome: "succeeded",
          targetId: task.id,
          targetType: "task",
          organizationId: task.organizationId,
        });
        outbox.append(context, {
          availableAt: now,
          correlationId: request.id,
          id: randomUUID(),
          installationId: installation.id,
          occurredAt: now,
          payload: {
            actorId: session.identity.id,
            fieldId: field.id,
            pluginId: manifest.id,
            projectId: task.projectId,
            targetId: task.id,
            organizationId: task.organizationId,
          },
          topic: "task.extension_field_updated",
        });
      });

      return { values: fieldValues(input.database, fields, request.params) };
    },
  );
}

import type { AuditWriter } from "../organizations/organization.js";
import type { OutboxWriter } from "../shared/outbox.js";
import type { WriteContext } from "../shared/transactions.js";
import {
  availableProjectKey,
  availableProjectSlug,
  normalizeProjectName,
} from "./project-naming.js";
import type {
  Project,
  ProjectRepository,
  ProjectStatus,
  ProjectStatusCategory,
} from "./project.js";

interface DefaultStatus {
  readonly category: ProjectStatusCategory;
  readonly color: string;
  readonly name: string;
}

const defaultStatuses: readonly DefaultStatus[] = [
  { category: "backlog", color: "#faad14", name: "To do" },
  { category: "active", color: "#1668dc", name: "In progress" },
  { category: "done", color: "#52c41a", name: "Done" },
];

export interface CreateOwnedProjectDependencies {
  readonly audit: AuditWriter;
  readonly generateId: () => string;
  readonly outbox: OutboxWriter;
  readonly projects: ProjectRepository;
}

export interface CreateOwnedProjectInput {
  readonly correlationId: string;
  readonly description?: string;
  readonly folderId?: string;
  readonly installationId: string;
  readonly name: string;
  readonly now: number;
  readonly organizationId: string;
  readonly userId: string;
}

export function createOwnedProject(
  context: WriteContext,
  dependencies: CreateOwnedProjectDependencies,
  input: CreateOwnedProjectInput,
): Project {
  const name = normalizeProjectName(input.name);
  const description = input.description?.trim() ?? "";
  if (description.length > 20_000) {
    throw new TypeError("Project description cannot exceed 20,000 characters.");
  }

  const project: Project = Object.freeze({
    access: "organization",
    createdAt: input.now,
    createdByUserId: input.userId,
    description,
    ...(input.folderId ? { folderId: input.folderId } : {}),
    id: dependencies.generateId(),
    key: availableProjectKey(context, dependencies.projects, input.organizationId, name),
    name,
    nextTaskNumber: 1,
    position: dependencies.projects.nextProjectPosition(
      context,
      input.organizationId,
      input.folderId,
    ),
    revision: 1,
    slug: availableProjectSlug(context, dependencies.projects, input.organizationId, name),
    updatedAt: input.now,
    organizationId: input.organizationId,
  });
  dependencies.projects.createProject(context, project);
  defaultStatuses.forEach((status, position) => {
    const projectStatus: ProjectStatus = Object.freeze({
      ...status,
      createdAt: input.now,
      id: dependencies.generateId(),
      position,
      projectId: project.id,
      revision: 1,
      updatedAt: input.now,
      organizationId: input.organizationId,
    });
    dependencies.projects.createStatus(context, projectStatus);
  });

  dependencies.audit.append(context, {
    actorId: input.userId,
    actorType: "user",
    correlationId: input.correlationId,
    id: dependencies.generateId(),
    installationId: input.installationId,
    metadata: { folderId: input.folderId ?? null, key: project.key, name },
    occurredAt: input.now,
    operation: "project.created",
    outcome: "succeeded",
    targetId: project.id,
    targetType: "project",
    organizationId: input.organizationId,
  });
  dependencies.outbox.append(context, {
    availableAt: input.now,
    correlationId: input.correlationId,
    id: dependencies.generateId(),
    installationId: input.installationId,
    occurredAt: input.now,
    payload: {
      actorId: input.userId,
      folderId: input.folderId ?? null,
      key: project.key,
      name,
      targetId: project.id,
      organizationId: input.organizationId,
    },
    topic: "project.created",
  });
  return project;
}

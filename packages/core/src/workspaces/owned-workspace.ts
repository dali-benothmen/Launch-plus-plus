import type { OutboxWriter } from "../shared/outbox.js";
import type { WriteContext } from "../shared/transactions.js";
import { availableWorkspaceSlug, normalizeWorkspaceName } from "./workspace-naming.js";
import type {
  AuditWriter,
  UserProfileRepository,
  Workspace,
  WorkspaceMembershipRepository,
  WorkspaceRepository,
} from "./workspace.js";

export interface OwnedWorkspaceDependencies {
  readonly audit: AuditWriter;
  readonly generateId: () => string;
  readonly memberships: WorkspaceMembershipRepository;
  readonly outbox: OutboxWriter;
  readonly profiles: UserProfileRepository;
  readonly workspaces: WorkspaceRepository;
}

export interface CreateOwnedWorkspaceInput {
  readonly correlationId: string;
  readonly displayName: string;
  readonly installationId: string;
  readonly name: string;
  readonly now: number;
  readonly userId: string;
}

export function createOwnedWorkspace(
  context: WriteContext,
  dependencies: OwnedWorkspaceDependencies,
  input: CreateOwnedWorkspaceInput,
): Workspace {
  const name = normalizeWorkspaceName(input.name);
  const workspace: Workspace = Object.freeze({
    createdAt: input.now,
    createdByUserId: input.userId,
    id: dependencies.generateId(),
    installationId: input.installationId,
    name,
    revision: 1,
    slug: availableWorkspaceSlug(context, dependencies.workspaces, input.installationId, name),
    updatedAt: input.now,
  });
  dependencies.workspaces.create(context, workspace);
  dependencies.memberships.create(context, {
    joinedAt: input.now,
    role: "owner",
    state: "active",
    updatedAt: input.now,
    userId: input.userId,
    workspaceId: workspace.id,
  });

  const profile = dependencies.profiles.findByUserId(context, input.userId);
  if (profile) {
    dependencies.profiles.setCurrentWorkspace(context, {
      updatedAt: input.now,
      userId: input.userId,
      workspaceId: workspace.id,
    });
  } else {
    dependencies.profiles.create(context, {
      createdAt: input.now,
      currentWorkspaceId: workspace.id,
      displayName: input.displayName,
      locale: "en",
      revision: 1,
      timeZone: "UTC",
      updatedAt: input.now,
      userId: input.userId,
    });
  }

  dependencies.audit.append(context, {
    actorId: input.userId,
    actorType: "user",
    correlationId: input.correlationId,
    id: dependencies.generateId(),
    installationId: input.installationId,
    metadata: { role: "owner" },
    occurredAt: input.now,
    operation: "workspace.created",
    outcome: "succeeded",
    targetId: workspace.id,
    targetType: "workspace",
    workspaceId: workspace.id,
  });
  dependencies.outbox.append(context, {
    availableAt: input.now,
    correlationId: input.correlationId,
    id: dependencies.generateId(),
    installationId: input.installationId,
    occurredAt: input.now,
    payload: { actorId: input.userId, role: "owner", workspaceId: workspace.id },
    topic: "workspace.created",
  });
  return workspace;
}

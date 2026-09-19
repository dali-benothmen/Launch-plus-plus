import type { InstallationRepository } from "../installations/installation.js";
import type { OutboxWriter } from "../shared/outbox.js";
import type { TransactionManager } from "../shared/transactions.js";
import { availableWorkspaceSlug, defaultWorkspaceName } from "./workspace-naming.js";
import type {
  AuditWriter,
  UserProfileRepository,
  Workspace,
  WorkspaceMembershipRepository,
  WorkspaceRepository,
} from "./workspace.js";

export interface InitializeOwnerWorkspaceInput {
  readonly correlationId: string;
  readonly displayName: string;
  readonly userId: string;
}

export interface InitializeOwnerWorkspaceDependencies {
  readonly audit: AuditWriter;
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly installations: InstallationRepository;
  readonly memberships: WorkspaceMembershipRepository;
  readonly outbox: OutboxWriter;
  readonly profiles: UserProfileRepository;
  readonly transactions: TransactionManager;
  readonly workspaces: WorkspaceRepository;
}

export class InitializeOwnerWorkspaceService {
  constructor(private readonly dependencies: InitializeOwnerWorkspaceDependencies) {}

  execute(input: InitializeOwnerWorkspaceInput): Promise<Workspace> {
    const displayName = input.displayName.trim().replace(/\s+/g, " ");
    if (displayName.length === 0 || input.userId.length === 0 || input.correlationId.length === 0) {
      return Promise.reject(new TypeError("Owner identity and correlation values are required."));
    }

    const now = this.dependencies.clock();
    const installationId = this.dependencies.generateId();
    const workspaceId = this.dependencies.generateId();
    const workspaceName = defaultWorkspaceName(displayName);

    return this.dependencies.transactions.write((context) => {
      this.dependencies.installations.create(context, { createdAt: now, id: installationId });
      const workspace: Workspace = Object.freeze({
        createdAt: now,
        createdByUserId: input.userId,
        id: workspaceId,
        installationId,
        name: workspaceName,
        revision: 1,
        slug: availableWorkspaceSlug(
          context,
          this.dependencies.workspaces,
          installationId,
          workspaceName,
        ),
        updatedAt: now,
      });
      this.dependencies.workspaces.create(context, workspace);
      this.dependencies.memberships.create(context, {
        joinedAt: now,
        role: "owner",
        state: "active",
        updatedAt: now,
        userId: input.userId,
        workspaceId,
      });
      this.dependencies.profiles.create(context, {
        createdAt: now,
        currentWorkspaceId: workspaceId,
        displayName,
        locale: "en",
        revision: 1,
        timeZone: "UTC",
        updatedAt: now,
        userId: input.userId,
      });
      this.dependencies.audit.append(context, {
        actorId: input.userId,
        actorType: "user",
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId,
        metadata: { role: "owner" },
        occurredAt: now,
        operation: "workspace.created",
        outcome: "succeeded",
        targetId: workspaceId,
        targetType: "workspace",
        workspaceId,
      });
      this.dependencies.audit.append(context, {
        actorId: input.userId,
        actorType: "user",
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId,
        metadata: { workspaceId },
        occurredAt: now,
        operation: "first_owner.setup_completed",
        outcome: "succeeded",
        targetId: installationId,
        targetType: "installation",
      });
      this.dependencies.outbox.append(context, {
        availableAt: now,
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId,
        occurredAt: now,
        payload: { actorId: input.userId, installationId },
        topic: "installation.created",
      });
      this.dependencies.outbox.append(context, {
        availableAt: now,
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId,
        occurredAt: now,
        payload: { actorId: input.userId, role: "owner", workspaceId },
        topic: "workspace.created",
      });
      return workspace;
    });
  }
}

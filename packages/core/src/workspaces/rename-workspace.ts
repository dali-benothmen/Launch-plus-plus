import type { OutboxWriter } from "../shared/outbox.js";
import type { TransactionManager } from "../shared/transactions.js";
import { normalizeWorkspaceName } from "./workspace-naming.js";
import type { AuditWriter, Workspace, WorkspaceRepository } from "./workspace.js";
import { WorkspaceNameAlreadyExistsError, WorkspaceNotFoundError } from "./workspace.js";

export interface RenameWorkspaceInput {
  readonly correlationId: string;
  readonly name: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface RenameWorkspaceDependencies {
  readonly audit: AuditWriter;
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly outbox: OutboxWriter;
  readonly transactions: TransactionManager;
  readonly workspaces: WorkspaceRepository;
}

export class RenameWorkspaceService {
  constructor(private readonly dependencies: RenameWorkspaceDependencies) {}

  execute(input: RenameWorkspaceInput): Promise<Workspace> {
    const name = normalizeWorkspaceName(input.name);
    if (
      input.workspaceId.length === 0 ||
      input.userId.length === 0 ||
      input.correlationId.length === 0
    ) {
      return Promise.reject(
        new TypeError("Workspace, user, and correlation identifiers are required."),
      );
    }

    return this.dependencies.transactions.write((context) => {
      const workspace = this.dependencies.workspaces.findById(context, input.workspaceId);
      if (!workspace || workspace.deletedAt !== undefined) {
        throw new WorkspaceNotFoundError("The workspace does not exist.");
      }
      if (workspace.name === name) return workspace;

      const nameMatch = this.dependencies.workspaces.findByName(
        context,
        workspace.installationId,
        name,
      );
      if (nameMatch && nameMatch.id !== workspace.id) {
        throw new WorkspaceNameAlreadyExistsError("A workspace with this name already exists.");
      }

      const updatedAt = this.dependencies.clock();
      const renamedWorkspace: Workspace = Object.freeze({
        ...workspace,
        name,
        revision: workspace.revision + 1,
        updatedAt,
      });
      this.dependencies.workspaces.updateName(context, {
        name,
        revision: renamedWorkspace.revision,
        updatedAt,
        workspaceId: workspace.id,
      });
      this.dependencies.audit.append(context, {
        actorId: input.userId,
        actorType: "user",
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId: workspace.installationId,
        metadata: { name, previousName: workspace.name },
        occurredAt: updatedAt,
        operation: "workspace.renamed",
        outcome: "succeeded",
        targetId: workspace.id,
        targetType: "workspace",
        workspaceId: workspace.id,
      });
      this.dependencies.outbox.append(context, {
        availableAt: updatedAt,
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId: workspace.installationId,
        occurredAt: updatedAt,
        payload: {
          actorId: input.userId,
          name,
          previousName: workspace.name,
          workspaceId: workspace.id,
        },
        topic: "workspace.renamed",
      });
      return renamedWorkspace;
    });
  }
}

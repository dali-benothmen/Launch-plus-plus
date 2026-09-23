import type { TransactionManager } from "../shared/transactions.js";
import { createOwnedWorkspace, type OwnedWorkspaceDependencies } from "./owned-workspace.js";
import { normalizeWorkspaceName } from "./workspace-naming.js";
import type { Workspace } from "./workspace.js";

export interface CreateWorkspaceInput {
  readonly correlationId: string;
  readonly displayName: string;
  readonly installationId: string;
  readonly name: string;
  readonly userId: string;
}

export interface CreateWorkspaceDependencies extends OwnedWorkspaceDependencies {
  readonly clock: () => number;
  readonly transactions: TransactionManager;
}

export class CreateWorkspaceService {
  constructor(private readonly dependencies: CreateWorkspaceDependencies) {}

  execute(input: CreateWorkspaceInput): Promise<Workspace> {
    const name = normalizeWorkspaceName(input.name);
    const displayName = input.displayName.trim().replace(/\s+/g, " ");
    if (
      displayName.length === 0 ||
      input.userId.length === 0 ||
      input.installationId.length === 0 ||
      input.correlationId.length === 0
    ) {
      return Promise.reject(new TypeError("Workspace owner and installation values are required."));
    }
    const now = this.dependencies.clock();
    return this.dependencies.transactions.write((context) =>
      createOwnedWorkspace(context, this.dependencies, {
        correlationId: input.correlationId,
        displayName,
        installationId: input.installationId,
        name,
        now,
        userId: input.userId,
      }),
    );
  }
}

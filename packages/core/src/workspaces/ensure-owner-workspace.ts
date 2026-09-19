import type { TransactionManager } from "../shared/transactions.js";
import { createOwnedWorkspace, type OwnedWorkspaceDependencies } from "./owned-workspace.js";
import { defaultWorkspaceName } from "./workspace-naming.js";
import type { Workspace } from "./workspace.js";

export interface EnsureOwnerWorkspaceDependencies extends OwnedWorkspaceDependencies {
  readonly clock: () => number;
  readonly transactions: TransactionManager;
}

export class EnsureOwnerWorkspaceService {
  constructor(private readonly dependencies: EnsureOwnerWorkspaceDependencies) {}

  execute(
    input: Readonly<{
      correlationId: string;
      displayName: string;
      installationId: string;
      userId: string;
    }>,
  ): Promise<Workspace> {
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
    return this.dependencies.transactions.write((context) => {
      const existing = this.dependencies.workspaces.listForUser(context, input.userId);
      const first = existing[0];
      if (first) {
        const profile = this.dependencies.profiles.findByUserId(context, input.userId);
        if (!profile) {
          this.dependencies.profiles.create(context, {
            createdAt: now,
            currentWorkspaceId: first.id,
            displayName,
            locale: "en",
            revision: 1,
            timeZone: "UTC",
            updatedAt: now,
            userId: input.userId,
          });
        } else if (!existing.some((workspace) => workspace.id === profile.currentWorkspaceId)) {
          this.dependencies.profiles.setCurrentWorkspace(context, {
            updatedAt: now,
            userId: input.userId,
            workspaceId: first.id,
          });
        }
        return first;
      }

      return createOwnedWorkspace(context, this.dependencies, {
        correlationId: input.correlationId,
        displayName,
        installationId: input.installationId,
        name: defaultWorkspaceName(displayName),
        now,
        userId: input.userId,
      });
    });
  }
}

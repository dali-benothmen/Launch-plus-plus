import type { TransactionManager } from "../shared/transactions.js";
import type { UserProfileRepository, WorkspaceMembershipRepository } from "./workspace.js";
import { UserProfileMissingError, WorkspaceMembershipRequiredError } from "./workspace.js";

export interface SelectCurrentWorkspaceDependencies {
  readonly clock: () => number;
  readonly memberships: WorkspaceMembershipRepository;
  readonly profiles: UserProfileRepository;
  readonly transactions: TransactionManager;
}

export class SelectCurrentWorkspaceService {
  constructor(private readonly dependencies: SelectCurrentWorkspaceDependencies) {}

  execute(input: Readonly<{ userId: string; workspaceId: string }>): Promise<void> {
    if (input.userId.length === 0 || input.workspaceId.length === 0) {
      return Promise.reject(new TypeError("User and workspace identifiers are required."));
    }
    return this.dependencies.transactions.write((context) => {
      const membership = this.dependencies.memberships.find(
        context,
        input.workspaceId,
        input.userId,
      );
      if (!membership || membership.state !== "active") {
        throw new WorkspaceMembershipRequiredError("Active workspace membership is required.");
      }
      if (!this.dependencies.profiles.findByUserId(context, input.userId)) {
        throw new UserProfileMissingError("The user profile does not exist.");
      }
      this.dependencies.profiles.setCurrentWorkspace(context, {
        updatedAt: this.dependencies.clock(),
        userId: input.userId,
        workspaceId: input.workspaceId,
      });
    });
  }
}

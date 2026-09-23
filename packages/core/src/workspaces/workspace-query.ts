import type { TransactionManager } from "../shared/transactions.js";
import type { UserProfileRepository, Workspace, WorkspaceRepository } from "./workspace.js";

export interface WorkspaceContext {
  readonly currentWorkspaceId?: string;
  readonly workspaces: readonly Workspace[];
}

export class WorkspaceQueryService {
  constructor(
    private readonly dependencies: Readonly<{
      profiles: UserProfileRepository;
      transactions: TransactionManager;
      workspaces: WorkspaceRepository;
    }>,
  ) {}

  forUser(userId: string): WorkspaceContext {
    if (userId.length === 0) throw new TypeError("User identifier is required.");
    return this.dependencies.transactions.read((context) => {
      const profile = this.dependencies.profiles.findByUserId(context, userId);
      const workspaces = this.dependencies.workspaces.listForUser(context, userId);
      const currentWorkspaceId = workspaces.some(
        (workspace) => workspace.id === profile?.currentWorkspaceId,
      )
        ? profile?.currentWorkspaceId
        : undefined;
      return Object.freeze({
        ...(currentWorkspaceId ? { currentWorkspaceId } : {}),
        workspaces,
      });
    });
  }
}

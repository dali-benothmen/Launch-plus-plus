import type { ReadContext, WriteContext } from "../shared/transactions.js";

export interface UserProfile {
  readonly avatarAssetId?: string;
  readonly createdAt: number;
  readonly currentWorkspaceId?: string;
  readonly displayName: string;
  readonly locale: string;
  readonly revision: number;
  readonly timeZone: string;
  readonly updatedAt: number;
  readonly userId: string;
}

export interface Workspace {
  readonly archivedAt?: number;
  readonly createdAt: number;
  readonly createdByUserId: string;
  readonly deletedAt?: number;
  readonly id: string;
  readonly installationId: string;
  readonly name: string;
  readonly revision: number;
  readonly slug: string;
  readonly updatedAt: number;
}

export type WorkspaceMemberRole = "admin" | "member" | "owner";
export type WorkspaceMemberState = "active" | "suspended";

export interface WorkspaceMembership {
  readonly joinedAt: number;
  readonly role: WorkspaceMemberRole;
  readonly state: WorkspaceMemberState;
  readonly updatedAt: number;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface AuditEntry {
  readonly actorId?: string;
  readonly actorType: "operator" | "system" | "user";
  readonly correlationId: string;
  readonly id: string;
  readonly installationId: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly occurredAt: number;
  readonly operation: string;
  readonly outcome: "denied" | "failed" | "succeeded";
  readonly targetId: string;
  readonly targetType: string;
  readonly workspaceId?: string;
}

export interface UserProfileRepository {
  create(context: WriteContext, profile: UserProfile): void;
  findByUserId(context: ReadContext, userId: string): UserProfile | undefined;
  setCurrentWorkspace(
    context: WriteContext,
    input: Readonly<{ updatedAt: number; userId: string; workspaceId: string }>,
  ): void;
}

export interface WorkspaceRepository {
  create(context: WriteContext, workspace: Workspace): void;
  findById(context: ReadContext, workspaceId: string): Workspace | undefined;
  findByName(context: ReadContext, installationId: string, name: string): Workspace | undefined;
  findBySlug(context: ReadContext, installationId: string, slug: string): Workspace | undefined;
  listForUser(context: ReadContext, userId: string): readonly Workspace[];
  updateName(
    context: WriteContext,
    input: Readonly<{
      name: string;
      revision: number;
      updatedAt: number;
      workspaceId: string;
    }>,
  ): void;
}

export interface WorkspaceMembershipRepository {
  create(context: WriteContext, membership: WorkspaceMembership): void;
  find(context: ReadContext, workspaceId: string, userId: string): WorkspaceMembership | undefined;
}

export interface AuditWriter {
  append(context: WriteContext, entry: AuditEntry): void;
}

export class WorkspaceMembershipRequiredError extends Error {
  override readonly name = "WorkspaceMembershipRequiredError";
}

export class UserProfileMissingError extends Error {
  override readonly name = "UserProfileMissingError";
}

export class WorkspaceNameAlreadyExistsError extends Error {
  override readonly name = "WorkspaceNameAlreadyExistsError";
}

export class WorkspaceNotFoundError extends Error {
  override readonly name = "WorkspaceNotFoundError";
}

import type { ReadContext, WriteContext } from "../shared/transactions.js";

export interface UserProfile {
  readonly avatarAssetId?: string;
  readonly createdAt: number;
  readonly currentOrganizationId?: string;
  readonly displayName: string;
  readonly locale: string;
  readonly revision: number;
  readonly timeZone: string;
  readonly updatedAt: number;
  readonly userId: string;
}

export interface Organization {
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

export type OrganizationMemberRole = "admin" | "member" | "owner";
export type OrganizationMemberState = "active" | "suspended";

export interface OrganizationMembership {
  readonly joinedAt: number;
  readonly role: OrganizationMemberRole;
  readonly state: OrganizationMemberState;
  readonly updatedAt: number;
  readonly userId: string;
  readonly organizationId: string;
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
  readonly organizationId?: string;
}

export interface UserProfileRepository {
  create(context: WriteContext, profile: UserProfile): void;
  findByUserId(context: ReadContext, userId: string): UserProfile | undefined;
  setCurrentOrganization(
    context: WriteContext,
    input: Readonly<{ updatedAt: number; userId: string; organizationId: string }>,
  ): void;
}

export interface OrganizationRepository {
  create(context: WriteContext, organization: Organization): void;
  findById(context: ReadContext, organizationId: string): Organization | undefined;
  findByName(context: ReadContext, installationId: string, name: string): Organization | undefined;
  findBySlug(context: ReadContext, installationId: string, slug: string): Organization | undefined;
  listForUser(context: ReadContext, userId: string): readonly Organization[];
  updateName(
    context: WriteContext,
    input: Readonly<{
      name: string;
      revision: number;
      updatedAt: number;
      organizationId: string;
    }>,
  ): void;
}

export interface OrganizationMembershipRepository {
  create(context: WriteContext, membership: OrganizationMembership): void;
  find(
    context: ReadContext,
    organizationId: string,
    userId: string,
  ): OrganizationMembership | undefined;
  list(context: ReadContext, organizationId: string): readonly OrganizationMembership[];
}

export interface AuditWriter {
  append(context: WriteContext, entry: AuditEntry): void;
}

export class OrganizationMembershipRequiredError extends Error {
  override readonly name = "OrganizationMembershipRequiredError";
}

export class UserProfileMissingError extends Error {
  override readonly name = "UserProfileMissingError";
}

export class OrganizationNameAlreadyExistsError extends Error {
  override readonly name = "OrganizationNameAlreadyExistsError";
}

export class OrganizationNotFoundError extends Error {
  override readonly name = "OrganizationNotFoundError";
}

import type { OutboxWriter } from "../shared/outbox.js";
import type { WriteContext } from "../shared/transactions.js";
import { availableOrganizationSlug, normalizeOrganizationName } from "./organization-naming.js";
import type {
  AuditWriter,
  UserProfileRepository,
  Organization,
  OrganizationMembershipRepository,
  OrganizationRepository,
} from "./organization.js";
import { OrganizationNameAlreadyExistsError } from "./organization.js";

export interface OwnedOrganizationDependencies {
  readonly audit: AuditWriter;
  readonly generateId: () => string;
  readonly memberships: OrganizationMembershipRepository;
  readonly outbox: OutboxWriter;
  readonly profiles: UserProfileRepository;
  readonly organizations: OrganizationRepository;
}

export interface CreateOwnedOrganizationInput {
  readonly correlationId: string;
  readonly displayName: string;
  readonly installationId: string;
  readonly name: string;
  readonly now: number;
  readonly userId: string;
}

export function createOwnedOrganization(
  context: WriteContext,
  dependencies: OwnedOrganizationDependencies,
  input: CreateOwnedOrganizationInput,
): Organization {
  const name = normalizeOrganizationName(input.name);
  if (dependencies.organizations.findByName(context, input.installationId, name)) {
    throw new OrganizationNameAlreadyExistsError("An organization with this name already exists.");
  }
  const organization: Organization = Object.freeze({
    createdAt: input.now,
    createdByUserId: input.userId,
    id: dependencies.generateId(),
    installationId: input.installationId,
    name,
    revision: 1,
    slug: availableOrganizationSlug(
      context,
      dependencies.organizations,
      input.installationId,
      name,
    ),
    updatedAt: input.now,
  });
  dependencies.organizations.create(context, organization);
  dependencies.memberships.create(context, {
    joinedAt: input.now,
    role: "owner",
    state: "active",
    updatedAt: input.now,
    userId: input.userId,
    organizationId: organization.id,
  });

  const profile = dependencies.profiles.findByUserId(context, input.userId);
  if (profile) {
    dependencies.profiles.setCurrentOrganization(context, {
      updatedAt: input.now,
      userId: input.userId,
      organizationId: organization.id,
    });
  } else {
    dependencies.profiles.create(context, {
      createdAt: input.now,
      currentOrganizationId: organization.id,
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
    operation: "organization.created",
    outcome: "succeeded",
    targetId: organization.id,
    targetType: "organization",
    organizationId: organization.id,
  });
  dependencies.outbox.append(context, {
    availableAt: input.now,
    correlationId: input.correlationId,
    id: dependencies.generateId(),
    installationId: input.installationId,
    occurredAt: input.now,
    payload: { actorId: input.userId, role: "owner", organizationId: organization.id },
    topic: "organization.created",
  });
  return organization;
}

import type { OutboxWriter } from "../shared/outbox.js";
import type { TransactionManager } from "../shared/transactions.js";
import { normalizeOrganizationName } from "./organization-naming.js";
import type { AuditWriter, Organization, OrganizationRepository } from "./organization.js";
import { OrganizationNameAlreadyExistsError, OrganizationNotFoundError } from "./organization.js";

export interface RenameOrganizationInput {
  readonly correlationId: string;
  readonly name: string;
  readonly userId: string;
  readonly organizationId: string;
}

export interface RenameOrganizationDependencies {
  readonly audit: AuditWriter;
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly outbox: OutboxWriter;
  readonly transactions: TransactionManager;
  readonly organizations: OrganizationRepository;
}

export class RenameOrganizationService {
  constructor(private readonly dependencies: RenameOrganizationDependencies) {}

  execute(input: RenameOrganizationInput): Promise<Organization> {
    const name = normalizeOrganizationName(input.name);
    if (
      input.organizationId.length === 0 ||
      input.userId.length === 0 ||
      input.correlationId.length === 0
    ) {
      return Promise.reject(
        new TypeError("Organization, user, and correlation identifiers are required."),
      );
    }

    return this.dependencies.transactions.write((context) => {
      const organization = this.dependencies.organizations.findById(context, input.organizationId);
      if (!organization || organization.deletedAt !== undefined) {
        throw new OrganizationNotFoundError("The organization does not exist.");
      }
      if (organization.name === name) return organization;

      const nameMatch = this.dependencies.organizations.findByName(
        context,
        organization.installationId,
        name,
      );
      if (nameMatch && nameMatch.id !== organization.id) {
        throw new OrganizationNameAlreadyExistsError(
          "An organization with this name already exists.",
        );
      }

      const updatedAt = this.dependencies.clock();
      const renamedOrganization: Organization = Object.freeze({
        ...organization,
        name,
        revision: organization.revision + 1,
        updatedAt,
      });
      this.dependencies.organizations.updateName(context, {
        name,
        revision: renamedOrganization.revision,
        updatedAt,
        organizationId: organization.id,
      });
      this.dependencies.audit.append(context, {
        actorId: input.userId,
        actorType: "user",
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId: organization.installationId,
        metadata: { name, previousName: organization.name },
        occurredAt: updatedAt,
        operation: "organization.renamed",
        outcome: "succeeded",
        targetId: organization.id,
        targetType: "organization",
        organizationId: organization.id,
      });
      this.dependencies.outbox.append(context, {
        availableAt: updatedAt,
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId: organization.installationId,
        occurredAt: updatedAt,
        payload: {
          actorId: input.userId,
          name,
          previousName: organization.name,
          organizationId: organization.id,
        },
        topic: "organization.renamed",
      });
      return renamedOrganization;
    });
  }
}

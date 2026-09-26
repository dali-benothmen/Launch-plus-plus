import type { TransactionManager } from "../shared/transactions.js";
import {
  createOwnedOrganization,
  type OwnedOrganizationDependencies,
} from "./owned-organization.js";
import { normalizeOrganizationName } from "./organization-naming.js";
import type { Organization } from "./organization.js";

export interface CreateOrganizationInput {
  readonly correlationId: string;
  readonly displayName: string;
  readonly installationId: string;
  readonly name: string;
  readonly slug?: string;
  readonly userId: string;
}

export interface CreateOrganizationDependencies extends OwnedOrganizationDependencies {
  readonly clock: () => number;
  readonly transactions: TransactionManager;
}

export class CreateOrganizationService {
  constructor(private readonly dependencies: CreateOrganizationDependencies) {}

  execute(input: CreateOrganizationInput): Promise<Organization> {
    const name = normalizeOrganizationName(input.name);
    const displayName = input.displayName.trim().replace(/\s+/g, " ");
    if (
      displayName.length === 0 ||
      input.userId.length === 0 ||
      input.installationId.length === 0 ||
      input.correlationId.length === 0
    ) {
      return Promise.reject(
        new TypeError("Organization owner and installation values are required."),
      );
    }
    const now = this.dependencies.clock();
    return this.dependencies.transactions.write((context) =>
      createOwnedOrganization(context, this.dependencies, {
        correlationId: input.correlationId,
        displayName,
        installationId: input.installationId,
        name,
        now,
        ...(input.slug === undefined ? {} : { slug: input.slug }),
        userId: input.userId,
      }),
    );
  }
}

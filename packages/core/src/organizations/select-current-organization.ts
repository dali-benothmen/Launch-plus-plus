import type { TransactionManager } from "../shared/transactions.js";
import type { UserProfileRepository, OrganizationMembershipRepository } from "./organization.js";
import { UserProfileMissingError, OrganizationMembershipRequiredError } from "./organization.js";

export interface SelectCurrentOrganizationDependencies {
  readonly clock: () => number;
  readonly memberships: OrganizationMembershipRepository;
  readonly profiles: UserProfileRepository;
  readonly transactions: TransactionManager;
}

export class SelectCurrentOrganizationService {
  constructor(private readonly dependencies: SelectCurrentOrganizationDependencies) {}

  execute(input: Readonly<{ userId: string; organizationId: string }>): Promise<void> {
    if (input.userId.length === 0 || input.organizationId.length === 0) {
      return Promise.reject(new TypeError("User and organization identifiers are required."));
    }
    return this.dependencies.transactions.write((context) => {
      const membership = this.dependencies.memberships.find(
        context,
        input.organizationId,
        input.userId,
      );
      if (!membership || membership.state !== "active") {
        throw new OrganizationMembershipRequiredError(
          "Active organization membership is required.",
        );
      }
      if (!this.dependencies.profiles.findByUserId(context, input.userId)) {
        throw new UserProfileMissingError("The user profile does not exist.");
      }
      this.dependencies.profiles.setCurrentOrganization(context, {
        updatedAt: this.dependencies.clock(),
        userId: input.userId,
        organizationId: input.organizationId,
      });
    });
  }
}

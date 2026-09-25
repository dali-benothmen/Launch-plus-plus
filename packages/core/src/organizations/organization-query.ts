import type { TransactionManager } from "../shared/transactions.js";
import type {
  UserProfileRepository,
  Organization,
  OrganizationRepository,
} from "./organization.js";

export interface OrganizationContext {
  readonly currentOrganizationId?: string;
  readonly organizations: readonly Organization[];
}

export class OrganizationQueryService {
  constructor(
    private readonly dependencies: Readonly<{
      profiles: UserProfileRepository;
      transactions: TransactionManager;
      organizations: OrganizationRepository;
    }>,
  ) {}

  forUser(userId: string): OrganizationContext {
    if (userId.length === 0) throw new TypeError("User identifier is required.");
    return this.dependencies.transactions.read((context) => {
      const profile = this.dependencies.profiles.findByUserId(context, userId);
      const organizations = this.dependencies.organizations.listForUser(context, userId);
      const currentOrganizationId = organizations.some(
        (organization) => organization.id === profile?.currentOrganizationId,
      )
        ? profile?.currentOrganizationId
        : undefined;
      return Object.freeze({
        ...(currentOrganizationId ? { currentOrganizationId } : {}),
        organizations,
      });
    });
  }
}

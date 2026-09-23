import type { ReadContext, TransactionManager } from "../shared/transactions.js";

export interface SearchResult {
  readonly kind: "project" | "task";
  readonly projectId: string;
  readonly reference?: string;
  readonly resourceId: string;
  readonly subtitle: string;
  readonly title: string;
  readonly organizationId: string;
}

export interface SearchRepository {
  search(
    context: ReadContext,
    input: Readonly<{
      limit: number;
      projectId?: string;
      query: string;
      userId: string;
      organizationId?: string;
    }>,
  ): readonly SearchResult[];
}

export interface SearchServiceDependencies {
  readonly repository: SearchRepository;
  readonly transactions: TransactionManager;
}

export class SearchService {
  constructor(private readonly dependencies: SearchServiceDependencies) {}

  search(
    input: Readonly<{
      limit?: number;
      projectId?: string;
      query: string;
      userId: string;
      organizationId?: string;
    }>,
  ): readonly SearchResult[] {
    const query = input.query.trim().replace(/\s+/g, " ");
    if (query.length === 0) return [];
    if (query.length > 200) throw new TypeError("Search queries cannot exceed 200 characters.");
    const limit = input.limit ?? 20;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      throw new TypeError("Search result limit must be between 1 and 50.");
    }
    if (input.userId.length === 0) throw new TypeError("A user identifier is required.");
    return this.dependencies.transactions.read((context) =>
      this.dependencies.repository.search(context, { ...input, limit, query }),
    );
  }
}

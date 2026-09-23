import type { ReadContext, WriteContext } from "../shared/transactions.js";

export interface Team {
  readonly createdAt: number;
  readonly createdByUserId: string;
  readonly id: string;
  readonly name: string;
  readonly revision: number;
  readonly updatedAt: number;
  readonly organizationId: string;
}

export interface TeamRepository {
  create(context: WriteContext, team: Team): void;
  findByName(context: ReadContext, organizationId: string, name: string): Team | undefined;
  list(context: ReadContext, organizationId: string): readonly Team[];
}

export class TeamNameConflictError extends Error {
  override readonly name = "TeamNameConflictError";
}

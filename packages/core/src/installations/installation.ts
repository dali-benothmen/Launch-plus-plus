import type { ReadContext, WriteContext } from "../shared/transactions.js";

export interface Installation {
  readonly createdAt: number;
  readonly id: string;
}

export interface InstallationRepository {
  create(context: WriteContext, installation: Installation): void;
  findById(context: ReadContext, id: string): Installation | undefined;
}

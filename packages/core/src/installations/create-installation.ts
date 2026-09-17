import type { Installation, InstallationRepository } from "./installation.js";
import type { OutboxWriter } from "../shared/outbox.js";
import type { TransactionManager } from "../shared/transactions.js";

export interface CreateInstallationInput {
  readonly actorId: string;
  readonly correlationId: string;
}

export interface CreateInstallationDependencies {
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly installations: InstallationRepository;
  readonly outbox: OutboxWriter;
  readonly transactions: TransactionManager;
}

export class CreateInstallationService {
  constructor(private readonly dependencies: CreateInstallationDependencies) {}

  execute(input: CreateInstallationInput): Promise<Installation> {
    if (input.actorId.length === 0 || input.correlationId.length === 0) {
      return Promise.reject(new TypeError("Actor and correlation identifiers are required."));
    }

    const createdAt = this.dependencies.clock();
    const installation = Object.freeze({ createdAt, id: this.dependencies.generateId() });
    const eventId = this.dependencies.generateId();
    return this.dependencies.transactions.write((context) => {
      this.dependencies.installations.create(context, installation);
      this.dependencies.outbox.append(context, {
        availableAt: createdAt,
        correlationId: input.correlationId,
        id: eventId,
        installationId: installation.id,
        occurredAt: createdAt,
        payload: { actorId: input.actorId, installationId: installation.id },
        topic: "installation.created",
      });
      return installation;
    });
  }
}

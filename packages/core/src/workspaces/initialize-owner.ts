import type { InstallationRepository } from "../installations/installation.js";
import type { OutboxWriter } from "../shared/outbox.js";
import type { TransactionManager } from "../shared/transactions.js";
import type { AuditWriter, UserProfileRepository } from "./workspace.js";

export interface InitializeOwnerInput {
  readonly correlationId: string;
  readonly displayName: string;
  readonly userId: string;
}

export interface InitializeOwnerDependencies {
  readonly audit: AuditWriter;
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly installations: InstallationRepository;
  readonly outbox: OutboxWriter;
  readonly profiles: UserProfileRepository;
  readonly transactions: TransactionManager;
}

export class InitializeOwnerService {
  constructor(private readonly dependencies: InitializeOwnerDependencies) {}

  execute(input: InitializeOwnerInput): Promise<void> {
    const displayName = input.displayName.trim().replace(/\s+/g, " ");
    if (displayName.length === 0 || input.userId.length === 0 || input.correlationId.length === 0) {
      return Promise.reject(new TypeError("Owner identity and correlation values are required."));
    }

    const now = this.dependencies.clock();
    const installationId = this.dependencies.generateId();

    return this.dependencies.transactions.write((context) => {
      this.dependencies.installations.create(context, { createdAt: now, id: installationId });
      this.dependencies.profiles.create(context, {
        createdAt: now,
        displayName,
        locale: "en",
        revision: 1,
        timeZone: "UTC",
        updatedAt: now,
        userId: input.userId,
      });
      this.dependencies.audit.append(context, {
        actorId: input.userId,
        actorType: "user",
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId,
        metadata: { role: "owner" },
        occurredAt: now,
        operation: "first_owner.setup_completed",
        outcome: "succeeded",
        targetId: installationId,
        targetType: "installation",
      });
      this.dependencies.outbox.append(context, {
        availableAt: now,
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId,
        occurredAt: now,
        payload: { actorId: input.userId, installationId },
        topic: "installation.created",
      });
    });
  }
}

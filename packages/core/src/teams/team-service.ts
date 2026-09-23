import type { AuditWriter } from "../organizations/organization.js";
import type { OutboxWriter } from "../shared/outbox.js";
import type { TransactionManager } from "../shared/transactions.js";
import type { Team, TeamRepository } from "./team.js";
import { TeamNameConflictError } from "./team.js";

export interface TeamServiceDependencies {
  readonly audit: AuditWriter;
  readonly clock: () => number;
  readonly generateId: () => string;
  readonly outbox: OutboxWriter;
  readonly teams: TeamRepository;
  readonly transactions: TransactionManager;
}

export class TeamService {
  constructor(private readonly dependencies: TeamServiceDependencies) {}

  list(organizationId: string): readonly Team[] {
    if (!organizationId) throw new TypeError("Organization identifier is required.");
    return this.dependencies.transactions.read((context) =>
      this.dependencies.teams.list(context, organizationId),
    );
  }

  create(
    input: Readonly<{
      correlationId: string;
      installationId: string;
      name: string;
      userId: string;
      organizationId: string;
    }>,
  ): Promise<Team> {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (!input.correlationId || !input.installationId || !input.userId || !input.organizationId) {
      return Promise.reject(new TypeError("Team creation context is incomplete."));
    }
    if (name.length === 0 || name.length > 80) {
      return Promise.reject(new TypeError("Team name must contain 1 to 80 characters."));
    }
    return this.dependencies.transactions.write((context) => {
      if (this.dependencies.teams.findByName(context, input.organizationId, name)) {
        throw new TeamNameConflictError("A team with this name already exists.");
      }
      const now = this.dependencies.clock();
      const team: Team = Object.freeze({
        createdAt: now,
        createdByUserId: input.userId,
        id: this.dependencies.generateId(),
        name,
        revision: 1,
        updatedAt: now,
        organizationId: input.organizationId,
      });
      this.dependencies.teams.create(context, team);
      this.dependencies.audit.append(context, {
        actorId: input.userId,
        actorType: "user",
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId: input.installationId,
        metadata: { name },
        occurredAt: now,
        operation: "team.created",
        outcome: "succeeded",
        targetId: team.id,
        targetType: "team",
        organizationId: input.organizationId,
      });
      this.dependencies.outbox.append(context, {
        availableAt: now,
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId: input.installationId,
        occurredAt: now,
        payload: {
          actorId: input.userId,
          name,
          targetId: team.id,
          organizationId: input.organizationId,
        },
        topic: "team.created",
      });
      return team;
    });
  }
}

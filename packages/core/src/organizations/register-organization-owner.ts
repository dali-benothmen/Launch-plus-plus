import type { OwnerIdentityProvisioner } from "../identity/identity-provider.js";
import { IdentityProvisioningError } from "../identity/identity-provider.js";
import type { ProjectRepository } from "../projects/project.js";
import { createOwnedProject } from "../projects/create-owned-project.js";
import type { TransactionManager, WriteContext } from "../shared/transactions.js";
import {
  createOwnedOrganization,
  type OwnedOrganizationDependencies,
} from "./owned-organization.js";
import { normalizeOrganizationName, normalizeOrganizationSlug } from "./organization-naming.js";

export type OrganizationRegistrationPolicy = "authenticated" | "disabled" | "open";

export interface OrganizationRegistrationCompletion {
  readonly organization: Readonly<{
    id: string;
    name: string;
    slug: string;
  }>;
  readonly ownerUserId: string;
  readonly project: Readonly<{
    id: string;
    slug: string;
  }>;
}

export type OrganizationRegistrationReservation =
  | Readonly<{ kind: "conflict" }>
  | Readonly<{ kind: "in_progress" }>
  | Readonly<{ kind: "started" }>
  | Readonly<{ kind: "completed"; result: OrganizationRegistrationCompletion }>;

export interface OrganizationRegistrationScope {
  readonly installationId: string;
  readonly key: string;
  readonly requestHash: string;
}

export interface OrganizationRegistrationRepository {
  abandon(scope: OrganizationRegistrationScope): Promise<void>;
  complete(
    context: WriteContext,
    scope: OrganizationRegistrationScope,
    result: OrganizationRegistrationCompletion,
    completedAt: number,
  ): void;
  reserve(scope: OrganizationRegistrationScope): Promise<OrganizationRegistrationReservation>;
}

export interface RegisterOrganizationOwnerInput extends OrganizationRegistrationScope {
  readonly correlationId: string;
  readonly email: string;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly ownerName: string;
  readonly password: string;
}

export interface RegisterOrganizationOwnerResult {
  readonly organization: OrganizationRegistrationCompletion["organization"];
  readonly project: OrganizationRegistrationCompletion["project"];
  readonly setCookieHeaders: readonly string[];
}

export interface RegisterOrganizationOwnerDependencies extends OwnedOrganizationDependencies {
  readonly clock: () => number;
  readonly identity: OwnerIdentityProvisioner;
  readonly policy: OrganizationRegistrationPolicy;
  readonly projects: ProjectRepository;
  readonly registrations: OrganizationRegistrationRepository;
  readonly transactions: TransactionManager;
}

export class OrganizationRegistrationDisabledError extends Error {
  override readonly name = "OrganizationRegistrationDisabledError";
}

export class OrganizationRegistrationInProgressError extends Error {
  override readonly name = "OrganizationRegistrationInProgressError";
}

export class OrganizationRegistrationKeyConflictError extends Error {
  override readonly name = "OrganizationRegistrationKeyConflictError";
}

function normalizeOwnerName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > 100) {
    throw new TypeError("Owner name must contain between 1 and 100 characters.");
  }
  return name;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TypeError("A valid owner email address is required.");
  }
  return email;
}

function validateSecret(password: string): void {
  if (password.length < 12 || password.length > 128) {
    throw new TypeError("Password must contain between 12 and 128 characters.");
  }
}

function validateCommand(input: RegisterOrganizationOwnerInput): void {
  if (input.correlationId.length === 0 || input.installationId.length === 0) {
    throw new TypeError("Installation and correlation identifiers are required.");
  }
  if (input.key.length < 8 || input.key.length > 200) {
    throw new TypeError("Registration idempotency key must contain between 8 and 200 characters.");
  }
  if (!/^[0-9a-f]{64}$/i.test(input.requestHash)) {
    throw new TypeError("Registration request hash must be a 64-character fingerprint.");
  }
}

export class RegisterOrganizationOwnerService {
  constructor(private readonly dependencies: RegisterOrganizationOwnerDependencies) {}

  async execute(input: RegisterOrganizationOwnerInput): Promise<RegisterOrganizationOwnerResult> {
    validateCommand(input);
    const organizationName = normalizeOrganizationName(input.organizationName);
    const organizationSlug = normalizeOrganizationSlug(input.organizationSlug);
    const ownerName = normalizeOwnerName(input.ownerName);
    const email = normalizeEmail(input.email);
    validateSecret(input.password);

    if (this.dependencies.policy !== "open") {
      await this.recordPolicyDenial(input, organizationSlug);
      throw new OrganizationRegistrationDisabledError(
        this.dependencies.policy === "disabled"
          ? "Organization registration is disabled for this installation."
          : "Organization creation requires an authenticated account for this installation.",
      );
    }

    const scope: OrganizationRegistrationScope = Object.freeze({
      installationId: input.installationId,
      key: input.key,
      requestHash: input.requestHash,
    });
    const reservation = await this.dependencies.registrations.reserve(scope);
    if (reservation.kind === "conflict") {
      throw new OrganizationRegistrationKeyConflictError(
        "This registration key was already used with a different request.",
      );
    }
    if (reservation.kind === "in_progress") {
      throw new OrganizationRegistrationInProgressError(
        "A registration with this key is already in progress.",
      );
    }
    if (reservation.kind === "completed") {
      return this.issueSession(reservation.result, email, input.password);
    }

    let provisionalOwnerId: string | undefined;
    let completion: OrganizationRegistrationCompletion;
    try {
      const owner = await this.dependencies.identity.createProvisionalOwner({
        email,
        name: ownerName,
        password: input.password,
      });
      provisionalOwnerId = owner.id;
      const now = this.dependencies.clock();
      completion = await this.dependencies.transactions.write((context) => {
        const organization = createOwnedOrganization(context, this.dependencies, {
          correlationId: input.correlationId,
          displayName: ownerName,
          installationId: input.installationId,
          name: organizationName,
          now,
          slug: organizationSlug,
          userId: owner.id,
        });
        const project = createOwnedProject(context, this.dependencies, {
          correlationId: input.correlationId,
          installationId: input.installationId,
          name: "Welcome",
          now,
          organizationId: organization.id,
          userId: owner.id,
        });
        const result: OrganizationRegistrationCompletion = Object.freeze({
          organization: Object.freeze({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          }),
          ownerUserId: owner.id,
          project: Object.freeze({ id: project.id, slug: project.slug }),
        });
        this.dependencies.registrations.complete(context, scope, result, now);
        return result;
      });
    } catch (error) {
      const rollbackFailures: unknown[] = [];
      if (provisionalOwnerId) {
        try {
          await this.dependencies.identity.discardProvisionalOwner(provisionalOwnerId);
        } catch (rollbackError) {
          rollbackFailures.push(rollbackError);
        }
      }
      try {
        await this.dependencies.registrations.abandon(scope);
      } catch (rollbackError) {
        rollbackFailures.push(rollbackError);
      }
      if (rollbackFailures.length > 0) {
        throw new AggregateError(
          [error, ...rollbackFailures],
          "Organization registration failed and could not be fully rolled back.",
        );
      }
      throw error;
    }

    return this.issueSession(completion, email, input.password);
  }

  private async issueSession(
    completion: OrganizationRegistrationCompletion,
    email: string,
    password: string,
  ): Promise<RegisterOrganizationOwnerResult> {
    const session = await this.dependencies.identity.issueOwnerSession({ email, password });
    if (session.identity.id !== completion.ownerUserId) {
      throw new IdentityProvisioningError(
        "The issued session does not belong to the registered organization owner.",
      );
    }
    return Object.freeze({
      organization: completion.organization,
      project: completion.project,
      setCookieHeaders: Object.freeze([...session.setCookieHeaders]),
    });
  }

  private recordPolicyDenial(
    input: RegisterOrganizationOwnerInput,
    organizationSlug: string,
  ): Promise<void> {
    const now = this.dependencies.clock();
    return this.dependencies.transactions.write((context) => {
      this.dependencies.audit.append(context, {
        actorType: "system",
        correlationId: input.correlationId,
        id: this.dependencies.generateId(),
        installationId: input.installationId,
        metadata: { policy: this.dependencies.policy },
        occurredAt: now,
        operation: "organization.registration_denied",
        outcome: "denied",
        targetId: organizationSlug,
        targetType: "organization_slug",
      });
    });
  }
}

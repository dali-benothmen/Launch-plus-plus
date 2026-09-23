import type { IdentitySession, OrganizationMembership } from "@launchpp/core";

export type Actor =
  | Readonly<{ type: "anonymous" }>
  | Readonly<{ identityId: string; sessionId: string; type: "user" }>;

export function actorFromIdentitySession(session: IdentitySession | null): Actor {
  if (!session) return Object.freeze({ type: "anonymous" });
  return Object.freeze({
    identityId: session.identity.id,
    sessionId: session.id,
    type: "user",
  });
}

export type OrganizationOperation =
  | "organization.create"
  | "organization.manage"
  | "organization.read"
  | "organization.select";

export function canCreateOrganization(actor: Actor): boolean {
  return actor.type === "user";
}

export function canAccessOrganization(
  actor: Actor,
  membership: OrganizationMembership | undefined,
  operation: Exclude<OrganizationOperation, "organization.create">,
): boolean {
  if (
    actor.type !== "user" ||
    !membership ||
    membership.userId !== actor.identityId ||
    membership.state !== "active"
  ) {
    return false;
  }
  if (operation === "organization.read" || operation === "organization.select") return true;
  return membership.role === "owner";
}

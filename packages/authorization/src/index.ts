import type { IdentitySession, WorkspaceMembership } from "@launchpp/core";

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

export type WorkspaceOperation =
  | "workspace.create"
  | "workspace.manage"
  | "workspace.read"
  | "workspace.select";

export function canCreateWorkspace(actor: Actor): boolean {
  return actor.type === "user";
}

export function canAccessWorkspace(
  actor: Actor,
  membership: WorkspaceMembership | undefined,
  operation: Exclude<WorkspaceOperation, "workspace.create">,
): boolean {
  if (
    actor.type !== "user" ||
    !membership ||
    membership.userId !== actor.identityId ||
    membership.state !== "active"
  ) {
    return false;
  }
  if (operation === "workspace.read" || operation === "workspace.select") return true;
  return membership.role === "owner";
}

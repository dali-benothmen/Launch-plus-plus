import type { IdentitySession } from "@launchpp/core";

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

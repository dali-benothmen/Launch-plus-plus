import { describe, expect, it } from "vitest";
import { actorFromIdentitySession } from "./index.js";

describe("actor mapping", () => {
  it("maps identity facts without granting product permissions", () => {
    const actor = actorFromIdentitySession({
      expiresAt: 10_000,
      id: "session-1",
      identity: {
        email: "owner@example.test",
        emailVerified: false,
        id: "identity-1",
        name: "Owner",
      },
    });

    expect(actor).toEqual({ identityId: "identity-1", sessionId: "session-1", type: "user" });
    expect(actor).not.toHaveProperty("role");
    expect(actor).not.toHaveProperty("permissions");
  });

  it("keeps anonymous requests explicit", () => {
    expect(actorFromIdentitySession(null)).toEqual({ type: "anonymous" });
  });
});

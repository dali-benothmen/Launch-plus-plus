import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { IdentityProvider, IdentitySession } from "@launchpp/core";

export class BetterAuthIdentityAdapter implements IdentityProvider {
  private readonly auth;

  constructor(
    options: BetterAuthOptions,
    readonly baseUrl: string,
  ) {
    this.auth = betterAuth(options);
  }

  handle(request: Request): Promise<Response> {
    return this.auth.handler(request);
  }

  async resolveSession(headers: Headers): Promise<IdentitySession | null> {
    const result = await this.auth.api.getSession({ headers });
    if (!result) return null;

    return Object.freeze({
      expiresAt: result.session.expiresAt.getTime(),
      id: result.session.id,
      identity: Object.freeze({
        email: result.user.email,
        emailVerified: result.user.emailVerified,
        id: result.user.id,
        ...(result.user.image ? { imageUrl: result.user.image } : {}),
        name: result.user.name,
      }),
    });
  }
}

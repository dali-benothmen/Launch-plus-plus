export interface AuthenticatedIdentity {
  readonly email: string;
  readonly emailVerified: boolean;
  readonly id: string;
  readonly imageUrl?: string;
  readonly name: string;
}

export interface IdentitySession {
  readonly expiresAt: number;
  readonly id: string;
  readonly identity: AuthenticatedIdentity;
}

export interface IdentityProvider {
  resolveSession(headers: Headers): Promise<IdentitySession | null>;
}

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

export interface CreateProvisionalOwnerInput {
  readonly email: string;
  readonly name: string;
  readonly password: string;
}

export interface IssueOwnerSessionInput {
  readonly email: string;
  readonly password: string;
}

export interface IssuedOwnerSession {
  readonly identity: AuthenticatedIdentity;
  readonly setCookieHeaders: readonly string[];
}

export interface OwnerIdentityProvisioner {
  createProvisionalOwner(input: CreateProvisionalOwnerInput): Promise<AuthenticatedIdentity>;
  discardProvisionalOwner(userId: string): Promise<void>;
  issueOwnerSession(input: IssueOwnerSessionInput): Promise<IssuedOwnerSession>;
}

export class IdentityAccountAlreadyExistsError extends Error {
  override readonly name = "IdentityAccountAlreadyExistsError";
}

export class IdentityProvisioningError extends Error {
  override readonly name = "IdentityProvisioningError";
}

import { betterAuth, type BetterAuthOptions } from "better-auth";
import {
  IdentityAccountAlreadyExistsError,
  IdentityProvisioningError,
  type AuthenticatedIdentity,
  type IdentityProvider,
  type IdentitySession,
  type OwnerIdentityProvisioner,
} from "@launchpp/core";

export interface BetterAuthIdentityStorage {
  deleteUser(userId: string): void;
  findUserByEmail(email: string): AuthenticatedIdentity | undefined;
}

interface AuthUserBody {
  readonly user?: Readonly<{
    readonly email?: unknown;
    readonly emailVerified?: unknown;
    readonly id?: unknown;
    readonly image?: unknown;
    readonly name?: unknown;
  }>;
}

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .filter((value): value is string => value !== undefined)
    .join("; ");
}

function identityFromBody(body: AuthUserBody): AuthenticatedIdentity | undefined {
  const user = body.user;
  if (
    !user ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.name !== "string"
  ) {
    return undefined;
  }
  return Object.freeze({
    email: user.email,
    emailVerified: user.emailVerified === true,
    id: user.id,
    ...(typeof user.image === "string" && user.image.length > 0 ? { imageUrl: user.image } : {}),
    name: user.name,
  });
}

async function errorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.clone().json()) as { message?: unknown };
    return typeof body.message === "string" && body.message.length > 0 ? body.message : fallback;
  } catch {
    return fallback;
  }
}

export class BetterAuthIdentityAdapter implements IdentityProvider, OwnerIdentityProvisioner {
  private readonly auth;
  private readonly provisioningAuth;

  constructor(
    options: BetterAuthOptions,
    readonly baseUrl: string,
    private readonly storage?: BetterAuthIdentityStorage,
  ) {
    this.auth = betterAuth(options);
    this.provisioningAuth = betterAuth({
      ...options,
      emailAndPassword: {
        ...options.emailAndPassword,
        autoSignIn: false,
        enabled: true,
      },
    });
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

  async createProvisionalOwner(
    input: Readonly<{ email: string; name: string; password: string }>,
  ): Promise<AuthenticatedIdentity> {
    const storage = this.requireStorage();
    const email = input.email.trim().toLowerCase();
    if (storage.findUserByEmail(email)) {
      throw new IdentityAccountAlreadyExistsError(
        "An account already exists for this email address.",
      );
    }

    const response = await this.provisioningAuth.handler(
      this.authRequest("/api/auth/sign-up/email", {
        email,
        name: input.name,
        password: input.password,
      }),
    );
    if (!response.ok) {
      throw new IdentityProvisioningError(
        await errorDetail(response, "The owner identity could not be created."),
      );
    }

    const responseIdentity = identityFromBody((await response.json()) as AuthUserBody);
    const storedIdentity = storage.findUserByEmail(email);
    if (!responseIdentity || !storedIdentity || responseIdentity.id !== storedIdentity.id) {
      throw new IdentityAccountAlreadyExistsError(
        "An account already exists for this email address.",
      );
    }
    return storedIdentity;
  }

  async discardProvisionalOwner(userId: string): Promise<void> {
    this.requireStorage().deleteUser(userId);
  }

  async issueOwnerSession(input: Readonly<{ email: string; password: string }>): Promise<
    Readonly<{
      identity: AuthenticatedIdentity;
      setCookieHeaders: readonly string[];
    }>
  > {
    const response = await this.auth.handler(
      this.authRequest("/api/auth/sign-in/email", {
        email: input.email,
        password: input.password,
      }),
    );
    if (!response.ok) {
      throw new IdentityProvisioningError(
        await errorDetail(response, "The owner session could not be created."),
      );
    }
    const setCookieHeaders = response.headers.getSetCookie();
    const session = await this.resolveSession(new Headers({ cookie: cookieHeader(response) }));
    if (!session || setCookieHeaders.length === 0) {
      throw new IdentityProvisioningError("The owner session could not be created.");
    }
    return Object.freeze({
      identity: session.identity,
      setCookieHeaders: Object.freeze([...setCookieHeaders]),
    });
  }

  private authRequest(path: string, body: unknown): Request {
    return new Request(new URL(path, this.baseUrl), {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", origin: this.baseUrl },
      method: "POST",
    });
  }

  private requireStorage(): BetterAuthIdentityStorage {
    if (!this.storage) {
      throw new IdentityProvisioningError(
        "Bounded owner provisioning is not configured for this identity adapter.",
      );
    }
    return this.storage;
  }
}

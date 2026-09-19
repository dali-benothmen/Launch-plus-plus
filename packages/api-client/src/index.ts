export interface HealthReadiness {
  readonly status: "not_ready" | "ready";
}

export interface SessionIdentity {
  readonly email: string;
  readonly id: string;
  readonly name: string;
}

export interface SessionState {
  readonly expiresAt: number;
  readonly id: string;
  readonly identity: SessionIdentity;
}

export interface OwnerSetupInput {
  readonly email: string;
  readonly name: string;
  readonly password: string;
}

export interface SetupStatus {
  readonly requiresSetup: boolean;
  readonly setupAuthorized: boolean;
}

export interface WorkspaceSummary {
  readonly id: string;
  readonly name: string;
  readonly revision: number;
  readonly slug: string;
}

export interface WorkspaceContext {
  readonly currentWorkspaceId?: string;
  readonly workspaces: readonly WorkspaceSummary[];
}

export class ApiError extends Error {
  override readonly name = "ApiError";
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiClient {
  readonly auth: {
    recoveryCapabilities(): Promise<{
      readonly email: boolean;
      readonly operatorRecovery: boolean;
    }>;
    session(): Promise<SessionState | null>;
    signIn(input: { readonly email: string; readonly password: string }): Promise<void>;
    signOut(): Promise<void>;
  };
  readonly health: {
    readiness(signal?: AbortSignal): Promise<HealthReadiness>;
  };
  readonly setup: {
    claim(token: string): Promise<void>;
    createOwner(input: OwnerSetupInput): Promise<void>;
    status(): Promise<SetupStatus>;
  };
  readonly workspaces: {
    create(name: string): Promise<WorkspaceSummary>;
    list(): Promise<WorkspaceContext>;
    rename(workspaceId: string, name: string): Promise<WorkspaceSummary>;
    select(workspaceId: string): Promise<void>;
  };
}

export interface CreateApiClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const request = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl?.replace(/\/$/, "") ?? "";

  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await request(`${baseUrl}${path}`, {
      credentials: "include",
      ...init,
      headers: { accept: "application/json", ...init?.headers },
    });
    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as { detail?: string; message?: string };
        message = payload.detail ?? payload.message ?? message;
      } catch {
        // Keep the status-based fallback for non-JSON responses.
      }
      throw new ApiError(response.status, message);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return Object.freeze({
    auth: Object.freeze({
      recoveryCapabilities: () =>
        json<{ readonly email: boolean; readonly operatorRecovery: boolean }>(
          "/api/auth/recovery-capabilities",
        ),
      async session(): Promise<SessionState | null> {
        try {
          const payload = await json<{ readonly session: SessionState }>("/api/session");
          return payload.session;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) return null;
          throw error;
        }
      },
      async signIn(input: { readonly email: string; readonly password: string }): Promise<void> {
        await json("/api/auth/sign-in/email", {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
      },
      async signOut(): Promise<void> {
        await json("/api/auth/sign-out", { method: "POST" });
      },
    }),
    health: Object.freeze({
      async readiness(signal?: AbortSignal): Promise<HealthReadiness> {
        const response = await request(`${baseUrl}/health/ready`, {
          headers: { accept: "application/json" },
          method: "GET",
          ...(signal ? { signal } : {}),
        });
        if (!response.ok) throw new Error(`Health request failed with status ${response.status}`);
        const payload: unknown = await response.json();
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("status" in payload) ||
          (payload.status !== "ready" && payload.status !== "not_ready")
        ) {
          throw new Error("Health response did not match the expected contract");
        }
        return { status: payload.status };
      },
    }),
    setup: Object.freeze({
      async claim(token: string): Promise<void> {
        await json("/api/setup/claim", {
          body: JSON.stringify({ token }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
      },
      async createOwner(input: OwnerSetupInput): Promise<void> {
        await json("/api/setup/owner", {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
      },
      status: () => json<SetupStatus>("/api/setup/status"),
    }),
    workspaces: Object.freeze({
      create: (name: string) =>
        json<WorkspaceSummary>("/api/workspaces", {
          body: JSON.stringify({ name }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      list: () => json<WorkspaceContext>("/api/workspaces"),
      rename: (workspaceId: string, name: string) =>
        json<WorkspaceSummary>(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
          body: JSON.stringify({ name }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
      async select(workspaceId: string): Promise<void> {
        await json("/api/workspaces/current", {
          body: JSON.stringify({ workspaceId }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
    }),
  });
}

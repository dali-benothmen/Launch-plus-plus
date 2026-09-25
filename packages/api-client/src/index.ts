import type { ProblemDetails } from "@launchpp/api-contracts";

import { type CoreApiClient, createCoreApiClient } from "./generated.js";

export type {
  CursorPageQuery,
  InvalidationEvent,
  LabelSummary,
  OrganizationContext,
  OrganizationMemberSummary,
  OrganizationSummary,
  ProblemDetails,
  ProjectCatalog,
  ProjectFolderSummary,
  ProjectStatusOrderInput,
  ProjectStatusSummary,
  ProjectSummary,
  SearchQuery,
  SearchResponse,
  SearchResult,
  SetTaskCommentReactionInput,
  TaskActivity,
  TaskAttachmentSummary,
  TaskComment,
  TaskDetail,
  TaskPage,
  TaskPriority,
  TaskView,
  TeamInput,
  TeamSummary,
} from "@launchpp/api-contracts";
export type { CoreApiClient, RequestOptions } from "./generated.js";

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

export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    readonly status: number,
    message: string,
    readonly problem?: ProblemDetails,
  ) {
    super(message);
  }

  get code(): string | undefined {
    return this.problem?.code;
  }

  get correlationId(): string | undefined {
    return this.problem?.correlationId;
  }
}

export interface ApiClient extends Omit<CoreApiClient, "tasks"> {
  readonly tasks: CoreApiClient["tasks"] & {
    downloadAttachment(
      organizationId: string,
      projectId: string,
      taskId: string,
      attachmentId: string,
    ): Promise<Blob>;
  };
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
}

export interface CreateApiClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string" &&
    "correlationId" in value &&
    typeof value.correlationId === "string" &&
    "detail" in value &&
    typeof value.detail === "string" &&
    "status" in value &&
    typeof value.status === "number"
  );
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const request = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl?.replace(/\/$/, "") ?? "";

  async function json<Value>(path: string, init?: RequestInit): Promise<Value> {
    const response = await request(`${baseUrl}${path}`, {
      credentials: "include",
      ...init,
      headers: { accept: "application/json", ...init?.headers },
    });
    if (!response.ok) {
      let problem: ProblemDetails | undefined;
      let message = `Request failed with status ${response.status}`;
      try {
        const payload: unknown = await response.json();
        if (isProblemDetails(payload)) {
          problem = payload;
          message = payload.detail;
        } else if (typeof payload === "object" && payload !== null && "message" in payload) {
          if (typeof payload.message === "string") message = payload.message;
        }
      } catch {
        // Keep the status-based fallback for non-JSON responses.
      }
      throw new ApiError(response.status, message, problem);
    }
    if (response.status === 204) return undefined as Value;
    return (await response.json()) as Value;
  }

  const core = createCoreApiClient(json);
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
    projects: core.projects,
    search: core.search,
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
    tasks: Object.freeze({
      ...core.tasks,
      async downloadAttachment(
        organizationId: string,
        projectId: string,
        taskId: string,
        attachmentId: string,
      ): Promise<Blob> {
        const path = `/api/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachmentId)}/content`;
        const response = await request(`${baseUrl}${path}`, {
          credentials: "include",
          headers: { accept: "*/*" },
        });
        if (!response.ok) {
          let message = `Request failed with status ${response.status}`;
          try {
            const payload: unknown = await response.json();
            if (isProblemDetails(payload)) message = payload.detail;
          } catch {
            // Keep the status-based fallback for non-JSON responses.
          }
          throw new ApiError(response.status, message);
        }
        return response.blob();
      },
    }),
    teams: core.teams,
    organizations: core.organizations,
  });
}

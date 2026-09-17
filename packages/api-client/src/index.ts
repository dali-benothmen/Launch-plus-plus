export interface HealthReadiness {
  readonly status: "not_ready" | "ready";
}

export interface ApiClient {
  readonly health: {
    readiness(signal?: AbortSignal): Promise<HealthReadiness>;
  };
}

export interface CreateApiClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const request = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl?.replace(/\/$/, "") ?? "";

  return Object.freeze({
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
  });
}

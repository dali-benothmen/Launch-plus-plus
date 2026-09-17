import { createContext, useContext, type PropsWithChildren } from "react";
import type { ApiClient } from "@launchpp/api-client";

const ApiClientContext = createContext<ApiClient | undefined>(undefined);

export interface ApiClientProviderProps extends PropsWithChildren {
  readonly client: ApiClient;
}

export function ApiClientProvider({ children, client }: ApiClientProviderProps) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error("useApiClient must be used inside ApiClientProvider");
  return client;
}

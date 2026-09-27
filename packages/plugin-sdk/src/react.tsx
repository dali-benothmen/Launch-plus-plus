import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { type LaunchppClient, SDK_CAPABILITIES } from "./client.js";
import { type LaunchppError, toLaunchppError } from "./errors.js";
import type { CapabilityRequestOptions } from "./transport.js";
import type { PluginTheme, Project, Task } from "./types.js";

const ClientContext = createContext<LaunchppClient | undefined>(undefined);

export interface LaunchppProviderProps {
  readonly children?: ReactNode;
  readonly client: LaunchppClient;
}

export function LaunchppProvider({ children, client }: LaunchppProviderProps) {
  return createElement(ClientContext.Provider, { value: client }, children);
}

export function useLaunchpp(): LaunchppClient {
  const client = useContext(ClientContext);
  if (client === undefined) {
    throw new Error("Launch++ SDK hooks must be used inside LaunchppProvider.");
  }
  return client;
}

export function usePluginContext(): LaunchppClient["context"] {
  return useLaunchpp().context;
}

export function useCurrentProject(): NonNullable<LaunchppClient["context"]["project"]> {
  const project = usePluginContext().project;
  if (project === undefined) {
    throw new Error("useCurrentProject requires a project-scoped plugin surface.");
  }
  return project;
}

export function useTheme(): PluginTheme {
  return useLaunchpp().theme.current;
}

export type PluginQueryStatus = "error" | "idle" | "loading" | "success";

export interface PluginQueryResult<Data> {
  readonly data: Data | undefined;
  readonly error: LaunchppError | undefined;
  readonly loading: boolean;
  readonly refetch: () => void;
  readonly status: PluginQueryStatus;
}

export interface PluginQueryOptions {
  readonly enabled?: boolean;
}

interface QueryState<Data> {
  readonly data: Data | undefined;
  readonly error: LaunchppError | undefined;
  readonly status: PluginQueryStatus;
}

export function useCapability<Data = unknown>(
  capability: string,
  input: unknown,
  options: PluginQueryOptions = {},
): PluginQueryResult<Data> {
  const client = useLaunchpp();
  const enabled = options.enabled ?? true;
  const inputKey = JSON.stringify(input);
  if (inputKey === undefined) {
    throw new TypeError("Plugin capability query input must be serializable JSON.");
  }
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<QueryState<Data>>({
    data: undefined,
    error: undefined,
    status: enabled ? "loading" : "idle",
  });
  const refetch = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) {
      setState((current) => ({ ...current, error: undefined, status: "idle" }));
      return;
    }
    void revision;
    const controller = new AbortController();
    const requestInput = JSON.parse(inputKey) as unknown;
    setState((current) => ({ ...current, error: undefined, status: "loading" }));
    void client
      .invoke<Data>(capability, requestInput, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ data, error: undefined, status: "success" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          data: current.data,
          error: toLaunchppError(error),
          status: "error",
        }));
      });
    return () => controller.abort();
  }, [capability, client, enabled, inputKey, revision]);

  return {
    ...state,
    loading: state.status === "loading",
    refetch,
  };
}

export function useProjects(options?: PluginQueryOptions): PluginQueryResult<readonly Project[]> {
  return useCapability(SDK_CAPABILITIES.projectsList, {}, options);
}

export function useTasks(options?: PluginQueryOptions): PluginQueryResult<readonly Task[]> {
  return useCapability(SDK_CAPABILITIES.tasksList, {}, options);
}

export function useTask(taskId: string, options?: PluginQueryOptions): PluginQueryResult<Task> {
  return useCapability(SDK_CAPABILITIES.tasksGet, { taskId }, options);
}

export function useMutation<Input, Output>(
  capability: string,
): (input: Input, options?: CapabilityRequestOptions) => Promise<Output> {
  const client = useLaunchpp();
  return useCallback(
    (input: Input, options?: CapabilityRequestOptions) =>
      client.invoke<Output>(capability, input, options),
    [capability, client],
  );
}

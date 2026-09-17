export const PLUGIN_EXECUTION_ERROR_CODES = {
  aborted: "ABORTED",
  cpuLimit: "CPU_LIMIT",
  invalidHandler: "INVALID_HANDLER",
  memoryLimit: "MEMORY_LIMIT",
  outputLimit: "OUTPUT_LIMIT",
  runtimeFailure: "RUNTIME_FAILURE",
  wallTimeLimit: "WALL_TIME_LIMIT",
} as const;

export type PluginExecutionErrorCode =
  (typeof PLUGIN_EXECUTION_ERROR_CODES)[keyof typeof PLUGIN_EXECUTION_ERROR_CODES];

export class PluginExecutionError extends Error {
  readonly code: PluginExecutionErrorCode;

  constructor(code: PluginExecutionErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PluginExecutionError";
    this.code = code;
  }
}

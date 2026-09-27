import { PLUGIN_ERROR_CODES, type PluginError } from "@launchpp/plugin-protocol";

const knownCodes = new Set<string>(Object.values(PLUGIN_ERROR_CODES));

function isPluginError(value: unknown): value is PluginError {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PluginError>;
  return (
    typeof candidate.code === "string" &&
    knownCodes.has(candidate.code) &&
    typeof candidate.message === "string" &&
    typeof candidate.retryable === "boolean"
  );
}

export class LaunchppError extends Error {
  readonly code: PluginError["code"];
  readonly details?: unknown;
  readonly retryable: boolean;

  constructor(error: PluginError, options?: ErrorOptions) {
    super(error.message, options);
    this.name = "LaunchppError";
    this.code = error.code;
    this.retryable = error.retryable;
    if (error.details !== undefined) this.details = error.details;
  }

  toPluginError(): PluginError {
    return {
      code: this.code,
      ...(this.details === undefined ? {} : { details: this.details }),
      message: this.message,
      retryable: this.retryable,
    };
  }
}

export function toLaunchppError(error: unknown): LaunchppError {
  if (error instanceof LaunchppError) return error;
  if (isPluginError(error)) return new LaunchppError(error);
  if (error instanceof Error) {
    return new LaunchppError(
      {
        code: PLUGIN_ERROR_CODES.internal,
        message: error.message || "The plugin request failed.",
        retryable: false,
      },
      { cause: error },
    );
  }
  return new LaunchppError({
    code: PLUGIN_ERROR_CODES.internal,
    message: "The plugin request failed.",
    retryable: false,
  });
}

export function abortedError(message = "The plugin request was cancelled."): LaunchppError {
  return new LaunchppError({
    code: PLUGIN_ERROR_CODES.aborted,
    message,
    retryable: false,
  });
}

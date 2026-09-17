import { Worker } from "node:worker_threads";

import {
  PLUGIN_EXECUTION_ERROR_CODES,
  PluginExecutionError,
  type PluginExecutionErrorCode,
} from "./execution-errors.js";

export interface PluginExecutionLimits {
  readonly cpuTimeMs: number;
  readonly maxInputBytes: number;
  readonly maxOutputBytes: number;
  readonly maxSourceBytes: number;
  readonly memoryLimitBytes: number;
  readonly stackLimitBytes: number;
  readonly wallTimeMs: number;
  readonly workerHeapMegabytes: number;
  readonly workerStackMegabytes: number;
}

export const DEFAULT_PLUGIN_EXECUTION_LIMITS: PluginExecutionLimits = {
  cpuTimeMs: 100,
  maxInputBytes: 64 * 1024,
  maxOutputBytes: 64 * 1024,
  maxSourceBytes: 512 * 1024,
  memoryLimitBytes: 8 * 1024 * 1024,
  stackLimitBytes: 512 * 1024,
  wallTimeMs: 2_000,
  workerHeapMegabytes: 64,
  workerStackMegabytes: 4,
};

export interface PluginHandlerInvocation {
  readonly input: unknown;
  /** A normalized function expression produced by the package compiler. */
  readonly source: string;
}

export interface PluginHandlerExecutionOptions {
  readonly limits?: Partial<PluginExecutionLimits>;
  readonly signal?: AbortSignal;
}

interface WorkerSuccess {
  readonly ok: true;
  readonly output: unknown;
}

interface WorkerFailure {
  readonly code: PluginExecutionErrorCode;
  readonly message: string;
  readonly ok: false;
}

type WorkerResult = WorkerFailure | WorkerSuccess;

interface WorkerInvocation extends PluginHandlerInvocation {
  readonly limits: PluginExecutionLimits;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function serializeInput(input: unknown): string {
  try {
    const value = JSON.stringify(input);
    if (value === undefined) throw new TypeError("Input is not a JSON value.");
    return value;
  } catch (error) {
    throw new PluginExecutionError(
      PLUGIN_EXECUTION_ERROR_CODES.invalidHandler,
      "Plugin input must be serializable JSON.",
      { cause: error },
    );
  }
}

function validateLimits(limits: PluginExecutionLimits): void {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError(`Plugin execution limit '${name}' must be a positive safe integer.`);
    }
  }
}

function workerError(result: WorkerFailure): PluginExecutionError {
  return new PluginExecutionError(result.code, result.message);
}

export class IsolatedPluginHandlerRuntime {
  readonly #workerUrl: URL;

  constructor(workerUrl = new URL("../worker/server-handler-worker.mjs", import.meta.url)) {
    this.#workerUrl = workerUrl;
  }

  async execute(
    invocation: PluginHandlerInvocation,
    options: PluginHandlerExecutionOptions = {},
  ): Promise<unknown> {
    const limits = { ...DEFAULT_PLUGIN_EXECUTION_LIMITS, ...options.limits };
    validateLimits(limits);

    const input = serializeInput(invocation.input);
    if (byteLength(input) > limits.maxInputBytes) {
      return Promise.reject(
        new PluginExecutionError(
          PLUGIN_EXECUTION_ERROR_CODES.invalidHandler,
          "Plugin input exceeds the configured size limit.",
        ),
      );
    }
    if (byteLength(invocation.source) > limits.maxSourceBytes) {
      return Promise.reject(
        new PluginExecutionError(
          PLUGIN_EXECUTION_ERROR_CODES.invalidHandler,
          "Plugin handler source exceeds the configured size limit.",
        ),
      );
    }
    if (options.signal?.aborted === true) {
      return Promise.reject(
        new PluginExecutionError(
          PLUGIN_EXECUTION_ERROR_CODES.aborted,
          "Plugin execution was cancelled before it started.",
        ),
      );
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(this.#workerUrl, {
        execArgv: [],
        resourceLimits: {
          maxOldGenerationSizeMb: limits.workerHeapMegabytes,
          stackSizeMb: limits.workerStackMegabytes,
        },
      });
      let settled = false;

      const finish = (action: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(wallTimer);
        options.signal?.removeEventListener("abort", abort);
        action();
        void worker.terminate();
      };

      const abort = (): void =>
        finish(() =>
          reject(
            new PluginExecutionError(
              PLUGIN_EXECUTION_ERROR_CODES.aborted,
              "Plugin execution was cancelled.",
            ),
          ),
        );

      const wallTimer = setTimeout(
        () =>
          finish(() =>
            reject(
              new PluginExecutionError(
                PLUGIN_EXECUTION_ERROR_CODES.wallTimeLimit,
                "Plugin execution exceeded the wall-time limit.",
              ),
            ),
          ),
        limits.wallTimeMs,
      );

      options.signal?.addEventListener("abort", abort, { once: true });
      worker.once("message", (result: WorkerResult) => {
        finish(() => (result.ok ? resolve(result.output) : reject(workerError(result))));
      });
      worker.once("error", (error) => {
        finish(() =>
          reject(
            new PluginExecutionError(
              PLUGIN_EXECUTION_ERROR_CODES.runtimeFailure,
              "The isolated plugin worker failed.",
              { cause: error },
            ),
          ),
        );
      });
      worker.once("exit", (code) => {
        if (code !== 0) {
          finish(() =>
            reject(
              new PluginExecutionError(
                PLUGIN_EXECUTION_ERROR_CODES.runtimeFailure,
                `The isolated plugin worker exited with code ${code}.`,
              ),
            ),
          );
        }
      });

      const request: WorkerInvocation = {
        input: JSON.parse(input) as unknown,
        limits,
        source: invocation.source,
      };
      worker.postMessage(request);
    });
  }
}

import {
  PLUGIN_ERROR_CODES,
  type PluginError,
  type PreviewPermission,
} from "@launchpp/plugin-protocol";
import type Type from "typebox";
import { Value } from "typebox/value";

export interface CapabilityBrokerLimits {
  readonly maxCalls: number;
  readonly maxInputBytes: number;
  readonly maxOutputBytes: number;
  readonly timeoutMs: number;
}

export const DEFAULT_CAPABILITY_BROKER_LIMITS: CapabilityBrokerLimits = {
  maxCalls: 50,
  maxInputBytes: 64 * 1024,
  maxOutputBytes: 256 * 1024,
  timeoutMs: 5_000,
};

export interface CapabilityInvocationContext {
  readonly actorId: string;
  readonly correlationId: string;
  readonly installationId: string;
  readonly organizationId: string;
  readonly packageId: string;
  readonly projectId?: string;
}

export interface CapabilityGrant {
  readonly grantedPermissions: readonly PreviewPermission[];
  readonly pluginId: string;
  readonly projectEnabled: boolean;
}

export interface CapabilityAuthority {
  resolve(context: CapabilityInvocationContext): CapabilityGrant | Promise<CapabilityGrant>;
}

export interface CapabilityExecutionContext extends CapabilityInvocationContext {
  readonly grantedPermissions: readonly PreviewPermission[];
  readonly pluginId: string;
  readonly signal: AbortSignal;
}

export interface CapabilityDefinition<
  InputSchema extends Type.TSchema = Type.TSchema,
  OutputSchema extends Type.TSchema = Type.TSchema,
> {
  readonly execute: (
    context: CapabilityExecutionContext,
    input: Type.Static<InputSchema>,
  ) => unknown | Promise<unknown>;
  readonly input: InputSchema;
  readonly name: string;
  readonly output: OutputSchema;
  readonly permission?: PreviewPermission;
  readonly scope: "organization" | "project";
}

export interface CapabilityBrokerOptions {
  readonly authority: CapabilityAuthority;
  readonly clock?: () => number;
  readonly definitions: readonly CapabilityDefinition[];
  readonly limits?: Partial<CapabilityBrokerLimits>;
}

export interface CapabilityInvocationOptions {
  readonly limits?: Partial<CapabilityBrokerLimits>;
  readonly signal?: AbortSignal;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function resolveLimits(
  base: CapabilityBrokerLimits,
  override: Partial<CapabilityBrokerLimits> = {},
): CapabilityBrokerLimits {
  const merged = { ...base, ...override };
  return {
    maxCalls: positiveLimit("maxCalls", merged.maxCalls),
    maxInputBytes: positiveLimit("maxInputBytes", merged.maxInputBytes),
    maxOutputBytes: positiveLimit("maxOutputBytes", merged.maxOutputBytes),
    timeoutMs: positiveLimit("timeoutMs", merged.timeoutMs),
  };
}

function positiveLimit(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`Capability broker limit '${name}' must be a positive safe integer.`);
  }
  return value;
}

function serialize(value: unknown, label: string, correlationId: string): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError(`${label} is not JSON serializable.`);
    return serialized;
  } catch (error) {
    throw new CapabilityBrokerError(
      PLUGIN_ERROR_CODES.invalidRequest,
      `${label} must be serializable JSON.`,
      false,
      correlationId,
      { cause: error },
    );
  }
}

function schemaIssues(schema: Type.TSchema, value: unknown) {
  return Value.Errors(schema, value)
    .slice(0, 10)
    .map((error) => ({
      message: error.message,
      path: error.instancePath || "/",
    }));
}

function validateContext(context: CapabilityInvocationContext): void {
  const identifiers = [
    context.actorId,
    context.correlationId,
    context.installationId,
    context.organizationId,
    context.packageId,
    context.projectId,
  ].filter((value): value is string => value !== undefined);
  if (identifiers.some((value) => value.length === 0 || value.length > 128)) {
    throw new TypeError("Capability invocation identifiers must contain 1 to 128 characters.");
  }
}

export class CapabilityBrokerError extends Error {
  readonly code: PluginError["code"];
  readonly correlationId?: string;
  readonly details?: unknown;
  readonly retryable: boolean;

  constructor(
    code: PluginError["code"],
    message: string,
    retryable: boolean,
    correlationId?: string,
    options?: ErrorOptions & Readonly<{ details?: unknown }>,
  ) {
    super(message, options);
    this.name = "CapabilityBrokerError";
    this.code = code;
    this.retryable = retryable;
    if (correlationId !== undefined) this.correlationId = correlationId;
    if (options?.details !== undefined) this.details = options.details;
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

export class CapabilityInvocation {
  readonly #authority: CapabilityAuthority;
  readonly #clock: () => number;
  readonly #context: CapabilityInvocationContext;
  readonly #definitions: ReadonlyMap<string, CapabilityDefinition>;
  readonly #limits: CapabilityBrokerLimits;
  readonly #signal: AbortSignal | undefined;
  #calls = 0;

  constructor(
    broker: CapabilityBroker,
    context: CapabilityInvocationContext,
    options: CapabilityInvocationOptions,
  ) {
    validateContext(context);
    this.#authority = broker.authority;
    this.#clock = broker.clock;
    this.#context = context;
    this.#definitions = broker.definitions;
    this.#limits = broker.limits(options.limits);
    this.#signal = options.signal;
  }

  async call(name: string, input: unknown): Promise<unknown> {
    const correlationId = this.#context.correlationId;
    if (this.#signal?.aborted) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.aborted,
        "Capability invocation was cancelled.",
        false,
        correlationId,
      );
    }
    this.#calls += 1;
    if (this.#calls > this.#limits.maxCalls) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.quotaExceeded,
        "Capability call quota exceeded.",
        false,
        correlationId,
        { details: { limit: this.#limits.maxCalls } },
      );
    }
    const definition = this.#definitions.get(name);
    if (!definition) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.capabilityNotFound,
        `Capability '${name}' is not available.`,
        false,
        correlationId,
      );
    }

    const serializedInput = serialize(input, "Capability input", correlationId);
    if (byteLength(serializedInput) > this.#limits.maxInputBytes) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.payloadTooLarge,
        "Capability input exceeds the configured size limit.",
        false,
        correlationId,
        { details: { limitBytes: this.#limits.maxInputBytes } },
      );
    }
    const inputIssues = schemaIssues(definition.input, input);
    if (inputIssues.length > 0) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.invalidRequest,
        "Capability input does not match its schema.",
        false,
        correlationId,
        { details: { issues: inputIssues } },
      );
    }

    let grant: CapabilityGrant;
    try {
      grant = await this.#authority.resolve(this.#context);
    } catch (error) {
      if (error instanceof CapabilityBrokerError) throw error;
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.internal,
        "Capability authorization failed.",
        false,
        correlationId,
        { cause: error },
      );
    }
    if (this.#context.projectId && !grant.projectEnabled) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.forbidden,
        "The plugin is not enabled for this project.",
        false,
        correlationId,
      );
    }
    if (definition.scope === "project" && !this.#context.projectId) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.invalidRequest,
        "This capability requires project context.",
        false,
        correlationId,
      );
    }
    if (definition.permission && !grant.grantedPermissions.includes(definition.permission)) {
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.forbidden,
        `Capability '${name}' requires the '${definition.permission}' grant.`,
        false,
        correlationId,
      );
    }

    const controller = new AbortController();
    const abort = () => controller.abort(this.#signal?.reason);
    this.#signal?.addEventListener("abort", abort, { once: true });
    const startedAt = this.#clock();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort(new Error("Capability deadline exceeded."));
        reject(
          new CapabilityBrokerError(
            PLUGIN_ERROR_CODES.timeout,
            "Capability invocation exceeded its deadline.",
            true,
            correlationId,
            { details: { timeoutMs: this.#limits.timeoutMs } },
          ),
        );
      }, this.#limits.timeoutMs);
    });
    const cancelled = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => {
          if (this.#clock() - startedAt >= this.#limits.timeoutMs) return;
          reject(
            new CapabilityBrokerError(
              PLUGIN_ERROR_CODES.aborted,
              "Capability invocation was cancelled.",
              false,
              correlationId,
            ),
          );
        },
        { once: true },
      );
    });

    try {
      const output = await Promise.race([
        Promise.resolve(
          definition.execute(
            {
              ...this.#context,
              grantedPermissions: grant.grantedPermissions,
              pluginId: grant.pluginId,
              signal: controller.signal,
            },
            input,
          ),
        ),
        timeout,
        cancelled,
      ]);
      const outputIssues = schemaIssues(definition.output, output);
      if (outputIssues.length > 0) {
        throw new CapabilityBrokerError(
          PLUGIN_ERROR_CODES.internal,
          "Capability output did not match its schema.",
          false,
          correlationId,
        );
      }
      const serializedOutput = serialize(output, "Capability output", correlationId);
      if (byteLength(serializedOutput) > this.#limits.maxOutputBytes) {
        throw new CapabilityBrokerError(
          PLUGIN_ERROR_CODES.payloadTooLarge,
          "Capability output exceeds the configured size limit.",
          false,
          correlationId,
          { details: { limitBytes: this.#limits.maxOutputBytes } },
        );
      }
      return output;
    } catch (error) {
      if (error instanceof CapabilityBrokerError) throw error;
      if (error instanceof TypeError) {
        throw new CapabilityBrokerError(
          PLUGIN_ERROR_CODES.invalidRequest,
          error.message,
          false,
          correlationId,
          { cause: error },
        );
      }
      throw new CapabilityBrokerError(
        PLUGIN_ERROR_CODES.internal,
        "Capability execution failed.",
        false,
        correlationId,
        { cause: error },
      );
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      this.#signal?.removeEventListener("abort", abort);
    }
  }
}

export class CapabilityBroker {
  readonly authority: CapabilityAuthority;
  readonly clock: () => number;
  readonly definitions: ReadonlyMap<string, CapabilityDefinition>;
  readonly #limits: CapabilityBrokerLimits;

  constructor(options: CapabilityBrokerOptions) {
    this.authority = options.authority;
    this.clock = options.clock ?? Date.now;
    const entries = options.definitions.map((definition) => [definition.name, definition] as const);
    if (new Set(entries.map(([name]) => name)).size !== entries.length) {
      throw new TypeError("Capability names must be unique.");
    }
    this.definitions = new Map(entries);
    this.#limits = resolveLimits(DEFAULT_CAPABILITY_BROKER_LIMITS, options.limits);
  }

  begin(
    context: CapabilityInvocationContext,
    options: CapabilityInvocationOptions = {},
  ): CapabilityInvocation {
    return new CapabilityInvocation(this, context, options);
  }

  limits(override: Partial<CapabilityBrokerLimits> = {}): CapabilityBrokerLimits {
    return resolveLimits(this.#limits, override);
  }
}

import {
  PLUGIN_ERROR_CODES,
  PLUGIN_MESSAGE_TYPES,
  PLUGIN_PROTOCOL_VERSION,
  type PluginContext,
  type PluginError,
  type PluginMessage,
  validatePluginMessage,
} from "@launchpp/plugin-protocol";

export const DEFAULT_PLUGIN_MESSAGE_LIMIT_BYTES = 64 * 1024;

export interface CapabilityInvocation {
  readonly context: PluginContext;
  readonly signal: AbortSignal;
}

export type BrowserCapabilityHandler = (
  input: unknown,
  invocation: CapabilityInvocation,
) => unknown | Promise<unknown>;

export interface BrowserBridgeSecurityEvent {
  readonly reason:
    | "invalid-message"
    | "origin-mismatch"
    | "oversized-message"
    | "source-mismatch"
    | "unexpected-direction";
  readonly issues?: readonly string[];
}

export type BrowserBridgeStatus = "created" | "handshaking" | "ready" | "stopped";

export interface BrowserBridgeHostOptions {
  readonly capabilities?: Readonly<Record<string, BrowserCapabilityHandler>>;
  readonly context: PluginContext;
  readonly hostWindow: Window;
  readonly maxMessageBytes?: number;
  readonly nonce?: string;
  readonly onSecurityEvent?: (event: BrowserBridgeSecurityEvent) => void;
  readonly onStatusChange?: (status: BrowserBridgeStatus) => void;
  readonly pluginWindow: Window;
  readonly targetOrigin: string;
}

function serializedSize(value: unknown): number | undefined {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return undefined;
  }
}

const pluginErrorCodes = new Set<string>(Object.values(PLUGIN_ERROR_CODES));

function isPluginErrorCode(value: unknown): value is PluginError["code"] {
  return typeof value === "string" && pluginErrorCodes.has(value);
}

function pluginError(error: unknown, signal: AbortSignal): PluginError {
  if (signal.aborted) {
    return {
      code: PLUGIN_ERROR_CODES.aborted,
      message: "The host cancelled this request.",
      retryable: false,
    };
  }

  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    const candidate = error as Partial<PluginError>;
    if (
      isPluginErrorCode(candidate.code) &&
      typeof candidate.message === "string" &&
      typeof candidate.retryable === "boolean"
    ) {
      return {
        code: candidate.code,
        ...(candidate.details === undefined ? {} : { details: candidate.details }),
        message: candidate.message,
        retryable: candidate.retryable,
      };
    }
  }

  return {
    code: PLUGIN_ERROR_CODES.internal,
    message: "The plugin request failed.",
    retryable: false,
  };
}

export class BrowserBridgeHost {
  readonly #capabilities: Readonly<Record<string, BrowserCapabilityHandler>>;
  readonly #context: PluginContext;
  readonly #hostWindow: Window;
  readonly #maxMessageBytes: number;
  readonly #nonce: string;
  readonly #onSecurityEvent: ((event: BrowserBridgeSecurityEvent) => void) | undefined;
  readonly #onStatusChange: ((status: BrowserBridgeStatus) => void) | undefined;
  readonly #pluginWindow: Window;
  readonly #targetOrigin: string;
  readonly #requests = new Map<string, AbortController>();
  #status: BrowserBridgeStatus = "created";

  constructor(options: BrowserBridgeHostOptions) {
    this.#capabilities = options.capabilities ?? {};
    this.#context = options.context;
    this.#hostWindow = options.hostWindow;
    this.#maxMessageBytes = options.maxMessageBytes ?? DEFAULT_PLUGIN_MESSAGE_LIMIT_BYTES;
    this.#nonce = options.nonce ?? crypto.randomUUID();
    this.#onSecurityEvent = options.onSecurityEvent;
    this.#onStatusChange = options.onStatusChange;
    this.#pluginWindow = options.pluginWindow;
    this.#targetOrigin = options.targetOrigin;
  }

  get status(): BrowserBridgeStatus {
    return this.#status;
  }

  start(): void {
    if (this.#status !== "created") return;
    this.#hostWindow.addEventListener("message", this.#handleMessage);
    this.#setStatus("handshaking");
  }

  handshake(): void {
    if (this.#status === "stopped") return;
    this.#post({
      context: this.#context,
      nonce: this.#nonce,
      protocolVersion: PLUGIN_PROTOCOL_VERSION,
      type: PLUGIN_MESSAGE_TYPES.handshake,
    });
  }

  stop(): void {
    if (this.#status === "stopped") return;
    this.#hostWindow.removeEventListener("message", this.#handleMessage);
    for (const controller of this.#requests.values()) controller.abort();
    this.#requests.clear();
    this.#setStatus("stopped");
  }

  readonly #handleMessage = (event: MessageEvent<unknown>): void => {
    if (event.source !== this.#pluginWindow) {
      // Every surface listens on the host window. A message from a sibling
      // frame belongs to that frame's bridge and must not affect this session.
      return;
    }
    if (event.origin !== this.#targetOrigin) {
      this.#security({ reason: "origin-mismatch" });
      return;
    }

    const size = serializedSize(event.data);
    if (size === undefined) {
      this.#security({ reason: "invalid-message", issues: ["Message is not serializable."] });
      return;
    }
    if (size > this.#maxMessageBytes) {
      this.#security({ reason: "oversized-message" });
      return;
    }

    const validation = validatePluginMessage(event.data);
    if (!validation.ok) {
      this.#security({
        reason: "invalid-message",
        issues: validation.issues.map(({ message, path }) => `${path}: ${message}`),
      });
      return;
    }

    this.#dispatch(validation.value);
  };

  #dispatch(message: PluginMessage): void {
    switch (message.type) {
      case PLUGIN_MESSAGE_TYPES.ready:
        if (this.#status !== "handshaking" || message.nonce !== this.#nonce) {
          this.#security({ reason: "invalid-message", issues: ["Handshake nonce mismatch."] });
          return;
        }
        this.#setStatus("ready");
        return;
      case PLUGIN_MESSAGE_TYPES.request:
        if (this.#status !== "ready") {
          this.#security({
            reason: "invalid-message",
            issues: ["Requests are not accepted before the handshake completes."],
          });
          return;
        }
        void this.#invoke(message.requestId, message.capability, message.input);
        return;
      case PLUGIN_MESSAGE_TYPES.cancel:
        this.#requests.get(message.requestId)?.abort();
        return;
      case PLUGIN_MESSAGE_TYPES.handshake:
      case PLUGIN_MESSAGE_TYPES.response:
        this.#security({ reason: "unexpected-direction" });
    }
  }

  async #invoke(requestId: string, capability: string, input: unknown): Promise<void> {
    if (this.#requests.has(requestId)) {
      this.#respondWithError(requestId, {
        code: PLUGIN_ERROR_CODES.conflict,
        message: "A request with this identifier is already running.",
        retryable: false,
      });
      return;
    }

    const handler = this.#capabilities[capability];
    if (handler === undefined) {
      this.#respondWithError(requestId, {
        code: PLUGIN_ERROR_CODES.capabilityNotFound,
        message: `Capability '${capability}' is not available.`,
        retryable: false,
      });
      return;
    }

    const controller = new AbortController();
    this.#requests.set(requestId, controller);
    try {
      const output = await handler(input, {
        context: this.#context,
        signal: controller.signal,
      });
      if (controller.signal.aborted) throw controller.signal.reason;
      this.#post({
        ok: true,
        output,
        protocolVersion: PLUGIN_PROTOCOL_VERSION,
        requestId,
        type: PLUGIN_MESSAGE_TYPES.response,
      });
    } catch (error) {
      this.#respondWithError(requestId, pluginError(error, controller.signal));
    } finally {
      this.#requests.delete(requestId);
    }
  }

  #respondWithError(requestId: string, error: PluginError): void {
    this.#post({
      error,
      ok: false,
      protocolVersion: PLUGIN_PROTOCOL_VERSION,
      requestId,
      type: PLUGIN_MESSAGE_TYPES.response,
    });
  }

  #post(message: PluginMessage): void {
    const size = serializedSize(message);
    if (size === undefined || size > this.#maxMessageBytes) {
      this.#security({ reason: "oversized-message" });
      return;
    }
    this.#pluginWindow.postMessage(message, this.#targetOrigin);
  }

  #security(event: BrowserBridgeSecurityEvent): void {
    this.#onSecurityEvent?.(event);
  }

  #setStatus(status: BrowserBridgeStatus): void {
    this.#status = status;
    this.#onStatusChange?.(status);
  }
}

export function resolvePluginAssetOrigin(source: string, hostOrigin: string): string {
  const url = new URL(source);
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error("Plugin surfaces require HTTPS, except on loopback development hosts.");
  }
  if (url.origin === hostOrigin) {
    throw new Error("Plugin surfaces must use an origin isolated from the Launch++ shell.");
  }
  return url.origin;
}

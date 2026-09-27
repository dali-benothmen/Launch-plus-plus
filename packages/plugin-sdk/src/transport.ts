import {
  PLUGIN_ERROR_CODES,
  PLUGIN_MESSAGE_TYPES,
  PLUGIN_PROTOCOL_VERSION,
  type PluginContext,
  type PluginMessage,
  validatePluginMessage,
} from "@launchpp/plugin-protocol";

import { abortedError, LaunchppError } from "./errors.js";

export const DEFAULT_PLUGIN_MESSAGE_LIMIT_BYTES = 64 * 1024;
export const DEFAULT_PLUGIN_HANDSHAKE_TIMEOUT_MS = 5_000;

export interface CapabilityRequestOptions {
  readonly signal?: AbortSignal;
}

export interface PluginTransport {
  close(): void;
  connect(options?: CapabilityRequestOptions): Promise<PluginContext>;
  invoke(capability: string, input: unknown, options?: CapabilityRequestOptions): Promise<unknown>;
}

export interface BrowserMessageTransportOptions {
  readonly applyTheme?: boolean;
  readonly handshakeTimeoutMs?: number;
  readonly hostOrigin?: string;
  readonly maxMessageBytes?: number;
  readonly onProtocolError?: (error: LaunchppError) => void;
  readonly window?: Window;
}

interface PendingRequest {
  readonly cleanup: () => void;
  readonly reject: (error: LaunchppError) => void;
  readonly resolve: (output: unknown) => void;
}

function serializedSize(value: unknown): number | undefined {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return undefined;
    return new TextEncoder().encode(serialized).byteLength;
  } catch {
    return undefined;
  }
}

function positiveInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
  return value;
}

function canonicalOrigin(value: string): string {
  const url = new URL(value);
  if (url.origin !== value) throw new TypeError("The host origin must be canonical.");
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new TypeError("The plugin host origin must use HTTPS outside loopback development.");
  }
  return url.origin;
}

function configuredHostOrigin(browserWindow: Window, explicit?: string): string {
  if (explicit !== undefined) return canonicalOrigin(explicit);
  const value = new URLSearchParams(browserWindow.location.search).get("hostOrigin");
  if (value === null) throw new TypeError("The Launch++ host origin is missing.");
  return canonicalOrigin(value);
}

function applyTheme(document: Document, context: PluginContext): void {
  document.documentElement.setAttribute("data-launch-theme", context.theme.id);
  document.documentElement.setAttribute("data-launch-theme-appearance", context.theme.mode);
  for (const [name, value] of Object.entries(context.theme.tokens)) {
    document.documentElement.style.setProperty(name, value);
  }
}

function protocolError(message: string): LaunchppError {
  return new LaunchppError({
    code: PLUGIN_ERROR_CODES.invalidRequest,
    message,
    retryable: false,
  });
}

export class BrowserMessageTransport implements PluginTransport {
  readonly #applyTheme: boolean;
  readonly #handshakeTimeoutMs: number;
  readonly #hostOrigin: string;
  readonly #maxMessageBytes: number;
  readonly #onProtocolError: ((error: LaunchppError) => void) | undefined;
  readonly #pending = new Map<string, PendingRequest>();
  readonly #window: Window;
  #closed = false;
  #connectPromise: Promise<PluginContext> | undefined;
  #connectionCleanup: (() => void) | undefined;
  #connected = false;
  #context: PluginContext | undefined;
  #rejectConnection: ((error: LaunchppError) => void) | undefined;

  constructor(options: BrowserMessageTransportOptions = {}) {
    const browserWindow = options.window ?? globalThis.window;
    if (browserWindow === undefined) {
      throw new TypeError("BrowserMessageTransport requires a browser Window.");
    }
    this.#window = browserWindow;
    this.#hostOrigin = configuredHostOrigin(browserWindow, options.hostOrigin);
    if (this.#hostOrigin === browserWindow.location.origin) {
      throw new TypeError("Plugin surfaces must use an origin isolated from the Launch++ host.");
    }
    this.#applyTheme = options.applyTheme ?? true;
    this.#handshakeTimeoutMs = positiveInteger(
      "handshakeTimeoutMs",
      options.handshakeTimeoutMs ?? DEFAULT_PLUGIN_HANDSHAKE_TIMEOUT_MS,
    );
    this.#maxMessageBytes = positiveInteger(
      "maxMessageBytes",
      options.maxMessageBytes ?? DEFAULT_PLUGIN_MESSAGE_LIMIT_BYTES,
    );
    this.#onProtocolError = options.onProtocolError;
  }

  connect(options: CapabilityRequestOptions = {}): Promise<PluginContext> {
    if (this.#closed) return Promise.reject(abortedError("The plugin connection is closed."));
    if (options.signal?.aborted) return Promise.reject(abortedError());
    if (this.#context !== undefined) return Promise.resolve(this.#context);
    if (this.#connectPromise !== undefined) return this.#connectPromise;

    this.#window.addEventListener("message", this.#handleMessage);
    this.#connectPromise = new Promise<PluginContext>((resolve, reject) => {
      this.#rejectConnection = reject;
      const timeout = this.#window.setTimeout(() => {
        const error = new LaunchppError({
          code: PLUGIN_ERROR_CODES.timeout,
          message: "The Launch++ host handshake timed out.",
          retryable: true,
        });
        this.#failConnection(error);
      }, this.#handshakeTimeoutMs);
      const abort = () => this.#failConnection(abortedError());
      options.signal?.addEventListener("abort", abort, { once: true });
      const cleanup = () => {
        this.#window.clearTimeout(timeout);
        options.signal?.removeEventListener("abort", abort);
      };
      this.#connectionCleanup = cleanup;
      const finish = (context: PluginContext) => {
        cleanup();
        this.#connectionCleanup = undefined;
        this.#rejectConnection = undefined;
        resolve(context);
      };
      this.#resolveConnection = finish;
    });
    return this.#connectPromise;
  }

  async invoke(
    capability: string,
    input: unknown,
    options: CapabilityRequestOptions = {},
  ): Promise<unknown> {
    if (capability.length === 0 || capability.length > 160) {
      throw new TypeError("Capability names must contain 1 to 160 characters.");
    }
    await this.connect({ ...(options.signal ? { signal: options.signal } : {}) });
    if (this.#closed || options.signal?.aborted) throw abortedError();

    const requestId = this.#window.crypto.randomUUID();
    return new Promise<unknown>((resolve, reject) => {
      const abort = () => {
        if (!this.#pending.delete(requestId)) return;
        this.#post({
          protocolVersion: PLUGIN_PROTOCOL_VERSION,
          reason: "Plugin caller cancelled the request.",
          requestId,
          type: PLUGIN_MESSAGE_TYPES.cancel,
        });
        options.signal?.removeEventListener("abort", abort);
        reject(abortedError());
      };
      this.#pending.set(requestId, {
        cleanup: () => options.signal?.removeEventListener("abort", abort),
        reject,
        resolve,
      });
      options.signal?.addEventListener("abort", abort, { once: true });
      try {
        this.#post({
          capability,
          input,
          protocolVersion: PLUGIN_PROTOCOL_VERSION,
          requestId,
          type: PLUGIN_MESSAGE_TYPES.request,
        });
      } catch (error) {
        this.#pending.delete(requestId);
        options.signal?.removeEventListener("abort", abort);
        reject(error);
      }
    });
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#connectionCleanup?.();
    this.#connectionCleanup = undefined;
    this.#window.removeEventListener("message", this.#handleMessage);
    this.#rejectConnection?.(abortedError("The plugin connection was closed."));
    this.#rejectConnection = undefined;
    for (const [requestId, request] of this.#pending) {
      this.#post({
        protocolVersion: PLUGIN_PROTOCOL_VERSION,
        reason: "Plugin connection closed.",
        requestId,
        type: PLUGIN_MESSAGE_TYPES.cancel,
      });
      request.cleanup();
      request.reject(abortedError("The plugin connection was closed."));
    }
    this.#pending.clear();
  }

  #resolveConnection: ((context: PluginContext) => void) | undefined;

  readonly #handleMessage = (event: MessageEvent<unknown>): void => {
    if (event.source !== this.#window.parent || event.origin !== this.#hostOrigin) return;
    const size = serializedSize(event.data);
    if (size === undefined || size > this.#maxMessageBytes) {
      this.#reportProtocolError("The host sent an invalid or oversized plugin message.");
      return;
    }
    const validation = validatePluginMessage(event.data);
    if (!validation.ok) {
      this.#reportProtocolError("The host sent a plugin message that failed validation.");
      return;
    }
    this.#dispatch(validation.value);
  };

  #dispatch(message: PluginMessage): void {
    if (message.protocolVersion !== PLUGIN_PROTOCOL_VERSION) {
      this.#failConnection(
        new LaunchppError({
          code: PLUGIN_ERROR_CODES.unsupportedProtocol,
          message: `Unsupported plugin protocol version '${message.protocolVersion}'.`,
          retryable: false,
        }),
      );
      return;
    }
    if (message.type === PLUGIN_MESSAGE_TYPES.handshake && !this.#connected) {
      this.#connected = true;
      this.#context = message.context;
      if (this.#applyTheme) applyTheme(this.#window.document, message.context);
      this.#post({
        nonce: message.nonce,
        protocolVersion: PLUGIN_PROTOCOL_VERSION,
        type: PLUGIN_MESSAGE_TYPES.ready,
      });
      this.#resolveConnection?.(message.context);
      this.#resolveConnection = undefined;
      return;
    }
    if (message.type !== PLUGIN_MESSAGE_TYPES.response || !this.#connected) {
      this.#reportProtocolError("The host sent a message in an unexpected direction or state.");
      return;
    }
    const pending = this.#pending.get(message.requestId);
    if (pending === undefined) return;
    this.#pending.delete(message.requestId);
    pending.cleanup();
    if (message.ok) pending.resolve(message.output);
    else pending.reject(new LaunchppError(message.error));
  }

  #post(message: PluginMessage): void {
    const size = serializedSize(message);
    if (size === undefined) throw protocolError("Plugin messages must be serializable JSON.");
    if (size > this.#maxMessageBytes) {
      throw new LaunchppError({
        code: PLUGIN_ERROR_CODES.payloadTooLarge,
        message: "The plugin message exceeds the configured size limit.",
        retryable: false,
      });
    }
    this.#window.parent.postMessage(message, this.#hostOrigin);
  }

  #failConnection(error: LaunchppError): void {
    this.#closed = true;
    this.#connectionCleanup?.();
    this.#connectionCleanup = undefined;
    this.#rejectConnection?.(error);
    this.#rejectConnection = undefined;
    this.#resolveConnection = undefined;
    this.#window.removeEventListener("message", this.#handleMessage);
    for (const request of this.#pending.values()) {
      request.cleanup();
      request.reject(error);
    }
    this.#pending.clear();
  }

  #reportProtocolError(message: string): void {
    const error = protocolError(message);
    this.#onProtocolError?.(error);
    if (!this.#connected) this.#failConnection(error);
  }
}

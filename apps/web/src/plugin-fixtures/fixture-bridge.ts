import {
  PLUGIN_MESSAGE_TYPES,
  PLUGIN_PROTOCOL_VERSION,
  type PluginContext,
  type PluginError,
  type PluginMessage,
  validatePluginMessage,
} from "@launchpp/plugin-protocol";

interface PendingRequest {
  readonly reject: (error: PluginError) => void;
  readonly resolve: (value: unknown) => void;
}

export interface FixtureBridge {
  readonly context: PluginContext;
  cancel(requestId: string): void;
  invoke(
    capability: string,
    input: unknown,
  ): { readonly requestId: string; readonly result: Promise<unknown> };
}

function requiredHostOrigin(): string {
  const value = new URLSearchParams(window.location.search).get("hostOrigin");
  if (value === null) throw new Error("The host origin is missing.");
  const origin = new URL(value).origin;
  if (origin !== value) throw new Error("The host origin must be canonical.");
  return origin;
}

function applyTheme(context: PluginContext): void {
  document.documentElement.setAttribute("data-launch-theme", context.theme.id);
  document.documentElement.setAttribute("data-launch-theme-appearance", context.theme.mode);
  for (const [name, value] of Object.entries(context.theme.tokens)) {
    document.documentElement.style.setProperty(name, value);
  }
}

export function connectFixtureBridge(): Promise<FixtureBridge> {
  const hostOrigin = requiredHostOrigin();

  return new Promise((resolve, reject) => {
    const pending = new Map<string, PendingRequest>();
    let connected = false;

    const post = (message: PluginMessage): void => window.parent.postMessage(message, hostOrigin);

    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || event.origin !== hostOrigin) return;
      const validation = validatePluginMessage(event.data);
      if (!validation.ok) return;
      const message = validation.value;

      if (message.type === PLUGIN_MESSAGE_TYPES.handshake && !connected) {
        connected = true;
        applyTheme(message.context);
        post({
          nonce: message.nonce,
          protocolVersion: PLUGIN_PROTOCOL_VERSION,
          type: PLUGIN_MESSAGE_TYPES.ready,
        });

        resolve({
          context: message.context,
          cancel: (requestId) =>
            post({
              protocolVersion: PLUGIN_PROTOCOL_VERSION,
              requestId,
              type: PLUGIN_MESSAGE_TYPES.cancel,
            }),
          invoke: (capability, input) => {
            const requestId = crypto.randomUUID();
            const result = new Promise<unknown>((resolveRequest, rejectRequest) => {
              pending.set(requestId, { reject: rejectRequest, resolve: resolveRequest });
            });
            post({
              capability,
              input,
              protocolVersion: PLUGIN_PROTOCOL_VERSION,
              requestId,
              type: PLUGIN_MESSAGE_TYPES.request,
            });
            return { requestId, result };
          },
        });
        return;
      }

      if (message.type === PLUGIN_MESSAGE_TYPES.response) {
        const request = pending.get(message.requestId);
        if (request === undefined) return;
        pending.delete(message.requestId);
        if (message.ok) request.resolve(message.output);
        else request.reject(message.error);
      }
    });

    window.setTimeout(() => reject(new Error("The host handshake timed out.")), 5_000);
  });
}

export async function proveCsp(): Promise<"blocked" | "unexpectedly-allowed"> {
  try {
    await fetch(`${requiredHostOrigin()}/health`);
    return "unexpectedly-allowed";
  } catch {
    return "blocked";
  }
}

export function proveNavigationConfinement(): "blocked" | "unexpectedly-allowed" {
  try {
    window.top?.location.assign("https://example.invalid/plugin-navigation-escape");
    return "unexpectedly-allowed";
  } catch {
    return "blocked";
  }
}

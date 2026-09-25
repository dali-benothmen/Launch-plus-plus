// @vitest-environment jsdom

import {
  PLUGIN_MESSAGE_TYPES,
  PLUGIN_PROTOCOL_VERSION,
  type PluginContext,
} from "@launchpp/plugin-protocol";
import { describe, expect, it, vi } from "vitest";

import { BrowserBridgeHost, resolvePluginAssetOrigin } from "./browser-bridge.js";

const context: PluginContext = {
  actor: { id: "actor_test" },
  grantedPermissions: ["projects:read"],
  installationId: "installation_test",
  locale: "en-US",
  pluginId: "acme.browser-test",
  surfaceId: "overview",
  theme: {
    id: "launchpp.dark",
    mode: "dark",
    tokens: { "--launch-color-surface": "#141414" },
  },
  organization: { id: "organization_test" },
};

const targetOrigin = "https://plugins.launchpp.test";
const nonce = "nonce_00000000000000000001";

function message(
  pluginWindow: Window,
  data: unknown,
  origin = targetOrigin,
): MessageEvent<unknown> {
  return new MessageEvent("message", {
    data,
    origin,
    source: pluginWindow,
  });
}

function ready(pluginWindow: Window): void {
  window.dispatchEvent(
    message(pluginWindow, {
      nonce,
      protocolVersion: PLUGIN_PROTOCOL_VERSION,
      type: PLUGIN_MESSAGE_TYPES.ready,
    }),
  );
}

function fakePluginWindow(): Window & { postMessage: ReturnType<typeof vi.fn> } {
  return { postMessage: vi.fn() } as unknown as Window & {
    postMessage: ReturnType<typeof vi.fn>;
  };
}

describe("browser plugin bridge", () => {
  it("sends host-owned context and completes a nonce-bound handshake", () => {
    const pluginWindow = fakePluginWindow();
    const statuses: string[] = [];
    const bridge = new BrowserBridgeHost({
      context,
      hostWindow: window,
      nonce,
      onStatusChange: (status) => statuses.push(status),
      pluginWindow,
      targetOrigin,
    });

    bridge.start();
    bridge.handshake();
    ready(pluginWindow);

    expect(pluginWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ theme: context.theme }),
        nonce,
        type: PLUGIN_MESSAGE_TYPES.handshake,
      }),
      targetOrigin,
    );
    expect(statuses).toEqual(["handshaking", "ready"]);
    bridge.stop();
  });

  it("ignores other frames and rejects the expected frame on the wrong origin", () => {
    const pluginWindow = fakePluginWindow();
    const security = vi.fn();
    const bridge = new BrowserBridgeHost({
      context,
      hostWindow: window,
      nonce,
      onSecurityEvent: security,
      pluginWindow,
      targetOrigin,
    });
    bridge.start();

    window.dispatchEvent(message(fakePluginWindow(), {}, targetOrigin));
    window.dispatchEvent(message(pluginWindow, {}, "https://attacker.test"));

    expect(security).toHaveBeenCalledOnce();
    expect(security).toHaveBeenCalledWith({ reason: "origin-mismatch" });
    bridge.stop();
  });

  it("rejects oversized payloads before capability dispatch", () => {
    const pluginWindow = fakePluginWindow();
    const capability = vi.fn();
    const security = vi.fn();
    const bridge = new BrowserBridgeHost({
      capabilities: { "proof.echo": capability },
      context,
      hostWindow: window,
      maxMessageBytes: 2_000,
      nonce,
      onSecurityEvent: security,
      pluginWindow,
      targetOrigin,
    });
    bridge.start();
    ready(pluginWindow);

    window.dispatchEvent(
      message(pluginWindow, {
        capability: "proof.echo",
        input: { content: "x".repeat(3_000) },
        protocolVersion: PLUGIN_PROTOCOL_VERSION,
        requestId: "oversized_request",
        type: PLUGIN_MESSAGE_TYPES.request,
      }),
    );

    expect(security).toHaveBeenCalledWith({ reason: "oversized-message" });
    expect(capability).not.toHaveBeenCalled();
    bridge.stop();
  });

  it("cancels an in-flight capability and returns a structured error", async () => {
    const pluginWindow = fakePluginWindow();
    const bridge = new BrowserBridgeHost({
      capabilities: {
        "proof.wait": (_input, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          }),
      },
      context,
      hostWindow: window,
      nonce,
      pluginWindow,
      targetOrigin,
    });
    bridge.start();
    ready(pluginWindow);
    window.dispatchEvent(
      message(pluginWindow, {
        capability: "proof.wait",
        input: {},
        protocolVersion: PLUGIN_PROTOCOL_VERSION,
        requestId: "request_to_cancel",
        type: PLUGIN_MESSAGE_TYPES.request,
      }),
    );
    window.dispatchEvent(
      message(pluginWindow, {
        protocolVersion: PLUGIN_PROTOCOL_VERSION,
        requestId: "request_to_cancel",
        type: PLUGIN_MESSAGE_TYPES.cancel,
      }),
    );

    await vi.waitFor(() =>
      expect(pluginWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "ABORTED" }),
          ok: false,
          requestId: "request_to_cancel",
        }),
        targetOrigin,
      ),
    );
    bridge.stop();
  });

  it("confines protocol failure to the affected surface session", () => {
    const pluginWindow = fakePluginWindow();
    const security = vi.fn();
    const bridge = new BrowserBridgeHost({
      context,
      hostWindow: window,
      nonce,
      onSecurityEvent: security,
      pluginWindow,
      targetOrigin,
    });
    bridge.start();
    ready(pluginWindow);

    expect(() =>
      window.dispatchEvent(
        message(pluginWindow, {
          protocolVersion: PLUGIN_PROTOCOL_VERSION,
          type: PLUGIN_MESSAGE_TYPES.handshake,
        }),
      ),
    ).not.toThrow();
    expect(security).toHaveBeenCalled();
    expect(bridge.status).toBe("ready");
    bridge.stop();
  });
});

describe("plugin asset origin policy", () => {
  it("requires an isolated HTTPS origin", () => {
    expect(
      resolvePluginAssetOrigin(
        "https://plugins.launchpp.test/surface.html",
        "https://launchpp.test",
      ),
    ).toBe("https://plugins.launchpp.test");
    expect(() =>
      resolvePluginAssetOrigin("https://launchpp.test/plugin.html", "https://launchpp.test"),
    ).toThrow(/isolated/);
    expect(() =>
      resolvePluginAssetOrigin("http://plugins.example.test/plugin.html", "http://launchpp.test"),
    ).toThrow(/HTTPS/);
    expect(
      resolvePluginAssetOrigin("http://localhost:4173/plugin.html", "http://127.0.0.1:4173"),
    ).toBe("http://localhost:4173");
  });
});

import type { PluginContext } from "@launchpp/plugin-protocol";
import { getBuiltInTheme } from "@launchpp/theme-runtime";
import { Typography } from "@launchpp/ui";

import type { BrowserCapabilityHandler } from "./browser-bridge.js";
import { PluginSurface } from "./plugin-surface.js";

const proofTheme = getBuiltInTheme("dark");

const context: PluginContext = {
  actor: { id: "actor_proof" },
  grantedPermissions: ["projects:read"],
  installationId: "installation_proof",
  locale: "en-US",
  pluginId: "launchpp.react-proof",
  project: { id: "project_proof" },
  surfaceId: "proof",
  theme: {
    id: proofTheme.id,
    mode: proofTheme.appearance,
    tokens: proofTheme.cssVariables,
  },
  workspace: { id: "workspace_proof" },
};

const capabilities: Readonly<Record<string, BrowserCapabilityHandler>> = {
  "proof.echo": (input) => ({ input, servedBy: "launchpp-host" }),
  "proof.wait": (_input, { signal }) =>
    new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => resolve({ completed: true }), 10_000);
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timeout);
          reject(signal.reason);
        },
        { once: true },
      );
    }),
};

function isolatedSurfaceUrl(path: string): string {
  const pluginHostname = window.location.hostname === "localhost" ? "127.0.0.1" : "localhost";
  const pluginOrigin = `${window.location.protocol}//${pluginHostname}:${window.location.port}`;
  const url = new URL(path, pluginOrigin);
  url.searchParams.set("hostOrigin", window.location.origin);
  return url.href;
}

export function PluginSurfaceProofPage() {
  return (
    <section aria-labelledby="plugin-proof-title" className="page-stack plugin-proof-page">
      <Typography.Title id="plugin-proof-title" level={1}>
        Browser isolation proof
      </Typography.Title>
      <Typography.Text type="secondary">
        React and vanilla artifacts use the same versioned bridge.
      </Typography.Text>
      <div className="plugin-proof-grid">
        <PluginSurface
          capabilities={capabilities}
          context={context}
          source={isolatedSurfaceUrl("/plugin-fixtures/react/index.html")}
          title="Packed React surface"
        />
        <PluginSurface
          capabilities={capabilities}
          context={{ ...context, pluginId: "launchpp.vanilla-proof" }}
          source={isolatedSurfaceUrl("/plugin-fixtures/vanilla/index.html")}
          title="Packed vanilla surface"
        />
      </div>
    </section>
  );
}

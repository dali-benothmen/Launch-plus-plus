import { randomBytes } from "node:crypto";
import { type FSWatcher, watch } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { createServer as createHttpServer, type Server, type ServerResponse } from "node:http";
import path from "node:path";
import {
  PLUGIN_PROTOCOL_VERSION,
  type PluginSourceManifest,
  validatePluginSourceManifest,
} from "@launchpp/plugin-protocol";
import { getBuiltInTheme } from "@launchpp/theme-runtime";
import {
  createServer as createViteServer,
  normalizePath,
  type Plugin,
  type ViteDevServer,
} from "vite";

import { renderDevHostPage } from "./dev-host-page.js";
import {
  DevCapabilityError,
  type DisposableDevState,
  invokeDevCapability,
  readDevState,
  resetDevState,
} from "./dev-state.js";

const loopback = "127.0.0.1";
const manifestFilename = "launchpp.plugin.json";
const virtualSurfacePrefix = "virtual:launchpp-surface:";

export interface DisposableDevHostOptions {
  readonly fresh?: boolean;
  readonly port?: number;
  readonly profile?: string;
  readonly projectDirectory?: string;
  readonly surfacePort?: number;
}

export interface DisposableDevHost {
  readonly pluginUrl: string;
  readonly profileDirectory: string;
  readonly url: string;
  close(): Promise<void>;
}

interface InvocationRequest {
  readonly [key: string]: unknown;
  readonly capability?: unknown;
  readonly input?: unknown;
}

interface DevSurface {
  readonly id: string;
  readonly title: string;
  readonly url: string;
}

function validPort(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new TypeError(`${name} must be an integer from 1 to 65535.`);
  }
  return value;
}

function validateProfile(value: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new TypeError("Profile names may contain lowercase letters, numbers, and single dashes.");
  }
  return value;
}

async function parseManifest(manifestPath: string): Promise<PluginSourceManifest> {
  let input: unknown;
  try {
    input = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${manifestFilename} is not valid JSON: ${error.message}`);
    }
    throw error;
  }
  const validation = validatePluginSourceManifest(input);
  if (!validation.ok) {
    throw new Error(
      validation.issues
        .map(({ message, path: issuePath }) => `${issuePath}: ${message}`)
        .join("\n"),
    );
  }
  return validation.value;
}

function sourcePath(projectDirectory: string, entry: string): string {
  return path.resolve(projectDirectory, entry.slice(2));
}

async function validateEntries(
  projectDirectory: string,
  manifest: PluginSourceManifest,
): Promise<void> {
  const entries = [
    ...Object.values(manifest.browser?.surfaces ?? {}).map(({ entry }) => entry),
    ...Object.values(manifest.server?.handlers ?? {}).map(({ entry }) => entry),
  ];
  for (const entry of entries) {
    try {
      await access(sourcePath(projectDirectory, entry));
    } catch {
      throw new Error(`Declared source entry '${entry}' does not exist.`);
    }
  }
}

function surfaceTitle(manifest: PluginSourceManifest, surfaceId: string): string {
  for (const page of manifest.contributes?.pages ?? []) {
    if (page.surface === surfaceId) return page.title;
  }
  for (const panel of manifest.contributes?.panels ?? []) {
    if (panel.surface === surfaceId) return panel.title;
  }
  for (const settings of manifest.contributes?.settings ?? []) {
    if ("surface" in settings && settings.surface === surfaceId) return settings.title;
  }
  return surfaceId;
}

function devSurfaces(manifest: PluginSourceManifest, pluginOrigin: string): readonly DevSurface[] {
  return Object.entries(manifest.browser?.surfaces ?? {}).map(([id, surface]) => ({
    id,
    title: surfaceTitle(manifest, id),
    url:
      manifest.authoring.adapter === "react-vite"
        ? `${pluginOrigin}/__launchpp/surfaces/${encodeURIComponent(id)}.html`
        : `${pluginOrigin}/${surface.entry.slice(2)}`,
  }));
}

function reactSurfacePlugin(
  projectDirectory: string,
  getManifest: () => PluginSourceManifest,
): Plugin {
  return {
    name: "launchpp-disposable-surface",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void (async () => {
          const pathname = new URL(request.url ?? "/", "http://launchpp.local").pathname;
          const match = /^\/__launchpp\/surfaces\/([^/]+)\.html$/.exec(pathname);
          if (match === null) return next();
          const surfaceId = decodeURIComponent(match[1] ?? "");
          if (getManifest().browser?.surfaces[surfaceId] === undefined) {
            response.statusCode = 404;
            response.end("Unknown plugin surface.");
            return;
          }
          response.statusCode = 200;
          response.setHeader("content-type", "text/html; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          const html = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body><div id="root"></div><script type="module" src="/@id/${virtualSurfacePrefix}${encodeURIComponent(surfaceId)}"></script></body>
</html>`;
          response.end(await server.transformIndexHtml(pathname, html));
        })().catch(next);
      });
    },
    load(id) {
      if (!id.startsWith(`\0${virtualSurfacePrefix}`)) return undefined;
      const surfaceId = decodeURIComponent(id.slice(`\0${virtualSurfacePrefix}`.length));
      const surface = getManifest().browser?.surfaces[surfaceId];
      if (surface === undefined) throw new Error(`Unknown plugin surface '${surfaceId}'.`);
      const entry = `/@fs/${normalizePath(sourcePath(projectDirectory, surface.entry))}`;
      return `import Surface from ${JSON.stringify(entry)};
import { mountPluginSurface } from "@launchpp/ui";

void mountPluginSurface({ component: Surface }).catch(() => undefined);
`;
    },
    resolveId(id) {
      return id.startsWith(virtualSurfacePrefix) ? `\0${id}` : undefined;
    },
  };
}

function themes() {
  return Object.fromEntries(
    (["light", "dark", "high-contrast"] as const).map((appearance) => {
      const theme = getBuiltInTheme(appearance);
      return [appearance, { id: theme.id, mode: appearance, tokens: theme.cssVariables }];
    }),
  );
}

async function requestBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.byteLength;
    if (size > 64 * 1024)
      throw new DevCapabilityError("PAYLOAD_TOO_LARGE", "Request is too large.");
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DevCapabilityError("INVALID_REQUEST", "Request body must contain JSON.");
  }
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(`${JSON.stringify(value)}\n`);
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(port, loopback, () => {
      server.off("error", onError);
      resolve();
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

function devError(error: unknown) {
  if (error instanceof DevCapabilityError) {
    return {
      code: error.code,
      ...(error.details === undefined ? {} : { details: error.details }),
      message: error.message,
      retryable: error.retryable,
    };
  }
  return {
    code: "INTERNAL",
    message: error instanceof Error ? error.message : "The development request failed.",
    retryable: false,
  };
}

export async function startDisposableDevHost(
  options: DisposableDevHostOptions = {},
): Promise<DisposableDevHost> {
  const projectDirectory = path.resolve(options.projectDirectory ?? process.cwd());
  const port = validPort(options.port ?? 4173, "port");
  const surfacePort = validPort(options.surfacePort ?? port + 1, "surfacePort");
  if (surfacePort === port)
    throw new TypeError("The host and plugin surface require separate ports.");
  const profile = validateProfile(options.profile ?? "default");
  const profileDirectory = path.join(projectDirectory, ".launchpp", "dev", profile);
  const statePath = path.join(profileDirectory, "state.json");
  const manifestPath = path.join(projectDirectory, manifestFilename);
  let manifest = await parseManifest(manifestPath);
  await validateEntries(projectDirectory, manifest);
  let manifestError: string | undefined;
  let state: DisposableDevState =
    options.fresh === true
      ? await resetDevState(statePath)
      : ((await readDevState(statePath)) ?? (await resetDevState(statePath)));
  const hostOrigin = `http://${loopback}:${port}`;
  const pluginOrigin = `http://${loopback}:${surfacePort}`;
  const subscribers = new Set<ServerResponse>();
  let vite: ViteDevServer | undefined;
  let watcher: FSWatcher | undefined;
  let reloadTimer: NodeJS.Timeout | undefined;
  let closed = false;

  const publish = (event: "manifest" | "manifest-error") => {
    for (const response of subscribers) response.write(`event: ${event}\ndata: {}\n\n`);
  };
  const session = () => ({
    fixture: {
      actor: state.actor,
      organization: state.organization,
      projectCount: state.projects.length,
      projectId: state.projects[0]?.id ?? "dev-project",
      taskCount: state.tasks.length,
    },
    manifest,
    ...(manifestError === undefined ? {} : { manifestError }),
    profile,
    surfaces: devSurfaces(manifest, pluginOrigin),
    themes: themes(),
  });
  const server = createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", hostOrigin);
      if (request.method === "GET" && url.pathname === "/") {
        response.statusCode = 302;
        response.setHeader("location", `/dev/${encodeURIComponent(manifest.id)}`);
        response.end();
        return;
      }
      if (request.method === "GET" && url.pathname === `/dev/${manifest.id}`) {
        const nonce = randomBytes(18).toString("base64");
        response.statusCode = 200;
        response.setHeader("cache-control", "no-store");
        response.setHeader(
          "content-security-policy",
          `default-src 'none'; connect-src 'self'; frame-src ${pluginOrigin}; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';`,
        );
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.setHeader("referrer-policy", "no-referrer");
        response.end(
          renderDevHostPage({
            nonce,
            pluginName: manifest.name,
            pluginOrigin,
            protocolVersion: PLUGIN_PROTOCOL_VERSION,
          }),
        );
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/session") {
        sendJson(response, 200, session());
        return;
      }
      if (request.method === "GET" && url.pathname === "/events") {
        response.statusCode = 200;
        response.setHeader("cache-control", "no-cache, no-transform");
        response.setHeader("connection", "keep-alive");
        response.setHeader("content-type", "text/event-stream");
        response.write(": connected\n\n");
        subscribers.add(response);
        request.once("close", () => subscribers.delete(response));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/reset") {
        state = await resetDevState(statePath);
        process.stdout.write(`[launchpp:dev] Reset disposable profile '${profile}'.\n`);
        sendJson(response, 200, { ok: true });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/invoke") {
        const body = await requestBody(request);
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          throw new DevCapabilityError("INVALID_REQUEST", "Invocation must be an object.");
        }
        const invocation = body as InvocationRequest;
        if (typeof invocation.capability !== "string") {
          throw new DevCapabilityError("INVALID_REQUEST", "Capability is required.");
        }
        process.stdout.write(`[launchpp:dev] ${manifest.id} → ${invocation.capability}\n`);
        const output = await invokeDevCapability(
          manifest,
          statePath,
          state,
          invocation.capability,
          invocation.input,
        );
        sendJson(response, 200, { output });
        return;
      }
      sendJson(response, 404, {
        error: { code: "NOT_FOUND", message: "Route not found.", retryable: false },
      });
    } catch (error) {
      const resolved = devError(error);
      const status =
        resolved.code === "FORBIDDEN" ? 403 : resolved.code === "NOT_FOUND" ? 404 : 400;
      sendJson(response, status, { error: resolved });
    }
  });

  try {
    const typeScriptConfig = path.join(projectDirectory, "vite.config.ts");
    const javaScriptConfig = path.join(projectDirectory, "vite.config.js");
    let configFile: string | false = false;
    try {
      await access(typeScriptConfig);
      configFile = typeScriptConfig;
    } catch {
      try {
        await access(javaScriptConfig);
        configFile = javaScriptConfig;
      } catch {
        configFile = false;
      }
    }
    vite = await createViteServer({
      appType: "custom",
      clearScreen: false,
      configFile,
      plugins: [reactSurfacePlugin(projectDirectory, () => manifest)],
      root: projectDirectory,
      server: {
        host: loopback,
        port: surfacePort,
        strictPort: true,
      },
    });
    await vite.listen();
    await listen(server, port);
    watcher = watch(manifestPath, () => {
      if (reloadTimer !== undefined) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        void (async () => {
          try {
            const nextManifest = await parseManifest(manifestPath);
            await validateEntries(projectDirectory, nextManifest);
            manifest = nextManifest;
            manifestError = undefined;
            await vite?.restart();
            process.stdout.write(`[launchpp:dev] Re-registered ${manifest.id}.\n`);
            publish("manifest");
          } catch (error) {
            manifestError = error instanceof Error ? error.message : String(error);
            process.stderr.write(`[launchpp:dev] Manifest update rejected: ${manifestError}\n`);
            publish("manifest-error");
          }
        })();
      }, 120);
    });
  } catch (error) {
    await vite?.close();
    if (server.listening) await closeServer(server);
    throw error;
  }

  return Object.freeze({
    pluginUrl: pluginOrigin,
    profileDirectory,
    url: `${hostOrigin}/dev/${encodeURIComponent(manifest.id)}`,
    close: async () => {
      if (closed) return;
      closed = true;
      if (reloadTimer !== undefined) clearTimeout(reloadTimer);
      watcher?.close();
      for (const response of subscribers) response.end();
      subscribers.clear();
      await Promise.all([vite?.close(), closeServer(server)]);
    },
  });
}

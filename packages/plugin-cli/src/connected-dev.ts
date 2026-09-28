import { spawn } from "node:child_process";
import { type FSWatcher, watch } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { type PluginSourceManifest, validatePluginSourceManifest } from "@launchpp/plugin-protocol";

export interface ConnectedDeveloperSession {
  readonly expiresAt: number;
  readonly organizationId: string;
  readonly projectId?: string;
  readonly sessionId: string;
  readonly token: string;
}

export interface ConnectedDeveloperMode {
  readonly session: ConnectedDeveloperSession;
  close(): Promise<void>;
}

interface PairingResponse {
  readonly approvalUrl: string;
  readonly code: string;
  readonly expiresAt: number;
  readonly id: string;
  readonly pollingToken: string;
}

interface PairingStatus {
  readonly expiresAt: number;
  readonly session?: ConnectedDeveloperSession;
  readonly state: "approved" | "expired" | "pending" | "rejected";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function connectedBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("--connect must contain an absolute Launch++ URL.");
  }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new TypeError("Connected Developer Mode requires HTTPS except on loopback hosts.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError("--connect cannot contain credentials, a query, or a fragment.");
  }
  return url.origin;
}

async function sourceManifest(path: string): Promise<PluginSourceManifest> {
  let document: unknown;
  try {
    document = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    throw new Error("launchpp.plugin.json must contain valid JSON.", { cause: error });
  }
  const validation = validatePluginSourceManifest(document);
  if (!validation.ok) {
    const issue = validation.issues[0];
    throw new Error(
      issue
        ? `Invalid plugin manifest at ${issue.path}: ${issue.message}`
        : "The plugin manifest is invalid.",
    );
  }
  return validation.value;
}

async function responseJson<Value>(response: Response): Promise<Value> {
  if (response.ok) return (await response.json()) as Value;
  let detail = `Request failed with status ${response.status}.`;
  try {
    const body = (await response.json()) as { readonly detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
  } catch {
    // Keep the status fallback.
  }
  throw new Error(detail);
}

function launchBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    const child = spawn(command[0] as string, command[1] as string[], {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    // The printed URL remains the portable fallback.
  }
}

async function pairing(baseUrl: string, manifest: PluginSourceManifest): Promise<PairingResponse> {
  return responseJson<PairingResponse>(
    await fetch(`${baseUrl}/api/v1/developer-mode/pairings`, {
      body: JSON.stringify({ manifest }),
      headers: { "content-type": "application/json", "x-launchpp-cli": "1" },
      method: "POST",
    }),
  );
}

async function waitForApproval(
  baseUrl: string,
  request: PairingResponse,
): Promise<ConnectedDeveloperSession> {
  while (Date.now() < request.expiresAt) {
    const status = await responseJson<PairingStatus>(
      await fetch(`${baseUrl}/api/v1/developer-mode/pairings/${encodeURIComponent(request.id)}`, {
        headers: {
          authorization: `Bearer ${request.pollingToken}`,
          "x-launchpp-cli": "1",
        },
      }),
    );
    if (status.state === "approved" && status.session) return status.session;
    if (status.state === "rejected") throw new Error("The pairing request was rejected.");
    if (status.state === "expired") throw new Error("The pairing request expired.");
    await delay(1_000);
  }
  throw new Error("The pairing request expired.");
}

export async function connectDeveloperMode(
  input: Readonly<{
    manifestPath: string;
    url: string;
  }>,
): Promise<ConnectedDeveloperMode> {
  const baseUrl = connectedBaseUrl(input.url);
  const manifest = await sourceManifest(input.manifestPath);
  const request = await pairing(baseUrl, manifest);
  process.stdout.write(`[launchpp:connect] Pairing code: ${request.code}\n`);
  process.stdout.write(`[launchpp:connect] Approve: ${request.approvalUrl}\n`);
  launchBrowser(request.approvalUrl);
  const session = await waitForApproval(baseUrl, request);
  process.stdout.write(
    `[launchpp:connect] Connected ${manifest.id} to organization ${session.organizationId}.\n`,
  );
  process.stdout.write(
    `[launchpp:connect] Session expires at ${new Date(session.expiresAt).toLocaleString()}.\n`,
  );

  let closed = false;
  let reloadTimer: NodeJS.Timeout | undefined;
  let watcher: FSWatcher | undefined;

  const authenticated = (method: string, path: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: {
        authorization: `Bearer ${session.token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        "x-launchpp-cli": "1",
      },
      method,
    });

  const register = async () => {
    try {
      const next = await sourceManifest(input.manifestPath);
      const response = await authenticated(
        "PUT",
        `/api/v1/developer-mode/sessions/${encodeURIComponent(session.sessionId)}/manifest`,
        { manifest: next },
      );
      const result = await responseJson<{ readonly state: string }>(response);
      if (result.state === "awaiting_permission_review") {
        process.stderr.write(
          "[launchpp:connect] Permission changes require approval in Organization settings.\n",
        );
      } else {
        process.stdout.write("[launchpp:connect] Manifest re-registered.\n");
      }
    } catch (error) {
      process.stderr.write(
        `[launchpp:connect] Manifest update rejected: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  };

  const manifestDirectory = path.dirname(input.manifestPath);
  const manifestFilename = path.basename(input.manifestPath);
  watcher = watch(manifestDirectory, (_eventType, filename) => {
    if (filename !== null && filename.toString() !== manifestFilename) return;
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => void register(), 150);
  });
  const heartbeat = setInterval(() => {
    void authenticated(
      "POST",
      `/api/v1/developer-mode/sessions/${encodeURIComponent(session.sessionId)}/heartbeat`,
    ).then((response) => {
      if (!response.ok) process.stderr.write("[launchpp:connect] Session heartbeat failed.\n");
    });
  }, 30_000);
  heartbeat.unref();

  return Object.freeze({
    session,
    close: async () => {
      if (closed) return;
      closed = true;
      watcher?.close();
      if (reloadTimer) clearTimeout(reloadTimer);
      clearInterval(heartbeat);
      const response = await authenticated(
        "DELETE",
        `/api/v1/developer-mode/sessions/${encodeURIComponent(session.sessionId)}`,
      );
      if (!response.ok && response.status !== 404 && response.status !== 410) {
        throw new Error(`Connected session teardown failed with status ${response.status}.`);
      }
      process.stdout.write("[launchpp:connect] Connected session torn down.\n");
    },
  });
}

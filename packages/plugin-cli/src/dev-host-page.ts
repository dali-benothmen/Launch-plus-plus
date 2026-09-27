export interface DevHostPageOptions {
  readonly nonce: string;
  readonly pluginName: string;
  readonly pluginOrigin: string;
  readonly protocolVersion: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderDevHostPage(options: DevHostPageOptions): string {
  const pluginOrigin = JSON.stringify(options.pluginOrigin);
  const protocolVersion = JSON.stringify(options.protocolVersion);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(options.pluginName)} · Launch++ Dev</title>
    <style nonce="${options.nonce}">
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #172033; background: #eef2f7; }
      * { box-sizing: border-box; }
      body { margin: 0; }
      button, select { min-height: 34px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: inherit; font: inherit; }
      button { cursor: pointer; }
      button:hover, select:hover { border-color: #2563eb; }
      header { height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 18px; border-bottom: 1px solid #dbe3ed; background: #fff; }
      header h1 { margin: 0; font-size: 16px; }
      header p { margin: 2px 0 0; color: #64748b; font-size: 12px; }
      .toolbar { display: flex; align-items: center; gap: 8px; }
      .layout { height: calc(100vh - 58px); display: grid; grid-template-columns: minmax(240px, 300px) minmax(0, 1fr); }
      aside { overflow: auto; padding: 16px; border-right: 1px solid #dbe3ed; background: #f8fafc; }
      aside section + section { margin-top: 20px; }
      h2 { margin: 0 0 8px; color: #64748b; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
      .status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
      .status::before { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; content: ""; }
      .status.ready::before { background: #16a34a; }
      .status.error::before { background: #dc2626; }
      .facts { display: grid; gap: 6px; margin: 0; font-size: 12px; }
      .facts div { display: flex; justify-content: space-between; gap: 12px; }
      .facts dt { color: #64748b; }
      .facts dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
      pre { max-height: 220px; overflow: auto; margin: 0; padding: 10px; border: 1px solid #dbe3ed; border-radius: 6px; background: #fff; font-size: 11px; white-space: pre-wrap; }
      #logs { display: grid; gap: 6px; max-height: 240px; overflow: auto; }
      .log { padding: 7px 8px; border-left: 2px solid #94a3b8; background: #fff; color: #475569; font: 11px/1.4 ui-monospace, monospace; }
      .surface { min-width: 0; padding: 14px; }
      iframe { width: 100%; height: 100%; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
      .empty { height: 100%; display: grid; place-items: center; border: 1px dashed #94a3b8; border-radius: 8px; color: #64748b; background: #fff; }
      @media (max-width: 760px) { .layout { grid-template-columns: 1fr; grid-template-rows: auto minmax(420px, 1fr); overflow: auto; } aside { border-right: 0; border-bottom: 1px solid #dbe3ed; } .surface { min-height: 520px; } }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>${escapeHtml(options.pluginName)}</h1>
        <p>Disposable Launch++ development organization</p>
      </div>
      <div class="toolbar">
        <select id="surface" aria-label="Plugin surface"></select>
        <select id="theme" aria-label="Preview theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="high-contrast">High contrast</option>
        </select>
        <button id="reload" type="button">Reload surface</button>
        <button id="reset" type="button">Reset fixtures</button>
      </div>
    </header>
    <div class="layout">
      <aside>
        <section>
          <h2>Session</h2>
          <div class="status" id="status">Loading</div>
          <dl class="facts" id="facts"></dl>
        </section>
        <section>
          <h2>Registered contributions</h2>
          <pre id="contributions">Loading…</pre>
        </section>
        <section>
          <h2>Bridge trace</h2>
          <div id="logs"></div>
        </section>
      </aside>
      <main class="surface" id="surface-container">
        <div class="empty">Loading plugin surface…</div>
      </main>
    </div>
    <script nonce="${options.nonce}" type="module">
      const pluginOrigin = ${pluginOrigin};
      const protocolVersion = ${protocolVersion};
      const statusElement = document.querySelector("#status");
      const factsElement = document.querySelector("#facts");
      const contributionElement = document.querySelector("#contributions");
      const logsElement = document.querySelector("#logs");
      const surfaceSelect = document.querySelector("#surface");
      const themeSelect = document.querySelector("#theme");
      const container = document.querySelector("#surface-container");
      let session;
      let frame;
      let nonce;
      let ready = false;
      const requests = new Map();

      function log(message) {
        const item = document.createElement("div");
        item.className = "log";
        item.textContent = new Date().toLocaleTimeString() + "  " + message;
        logsElement.prepend(item);
        while (logsElement.children.length > 100) logsElement.lastElementChild?.remove();
      }

      function setStatus(label, state = "") {
        statusElement.textContent = label;
        statusElement.className = "status " + state;
      }

      function option(value, label) {
        const element = document.createElement("option");
        element.value = value;
        element.textContent = label;
        return element;
      }

      function renderSession() {
        const selected = surfaceSelect.value;
        surfaceSelect.replaceChildren();
        for (const surface of session.surfaces) surfaceSelect.append(option(surface.id, surface.title));
        if (session.surfaces.some(({ id }) => id === selected)) surfaceSelect.value = selected;
        factsElement.replaceChildren();
        const facts = [
          ["Organization", session.fixture.organization.name],
          ["Actor", session.fixture.actor.name],
          ["Profile", session.profile],
          ["Permissions", session.manifest.permissions.join(", ") || "none"],
          ["Projects", String(session.fixture.projectCount)],
          ["Tasks", String(session.fixture.taskCount)],
        ];
        for (const [label, value] of facts) {
          const row = document.createElement("div");
          const term = document.createElement("dt");
          const detail = document.createElement("dd");
          term.textContent = label;
          detail.textContent = value;
          row.append(term, detail);
          factsElement.append(row);
        }
        contributionElement.textContent = JSON.stringify(session.manifest.contributes ?? {}, null, 2);
        if (session.manifestError) {
          setStatus("Manifest error", "error");
          log(session.manifestError);
        }
      }

      async function loadSession() {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (!response.ok) throw new Error("The development session could not be loaded.");
        session = await response.json();
        renderSession();
      }

      function currentSurface() {
        return session.surfaces.find(({ id }) => id === surfaceSelect.value) ?? session.surfaces[0];
      }

      function stopBridge() {
        ready = false;
        nonce = undefined;
        for (const controller of requests.values()) controller.abort();
        requests.clear();
      }

      function contextFor(surfaceId) {
        const theme = session.themes[themeSelect.value] ?? session.themes.light;
        return {
          actor: { id: session.fixture.actor.id },
          grantedPermissions: session.manifest.permissions,
          installationId: "dev:" + session.profile + ":" + session.manifest.id,
          locale: navigator.language || "en",
          organization: { id: session.fixture.organization.id },
          pluginId: session.manifest.id,
          project: { id: session.fixture.projectId },
          surfaceId,
          theme,
        };
      }

      function handshake() {
        if (!frame?.contentWindow) return;
        stopBridge();
        nonce = crypto.randomUUID();
        const surface = currentSurface();
        setStatus("Handshaking");
        frame.contentWindow.postMessage({
          context: contextFor(surface.id),
          nonce,
          protocolVersion,
          type: "launchpp.handshake",
        }, pluginOrigin);
        log("handshake → " + surface.id);
      }

      function openSurface() {
        stopBridge();
        container.replaceChildren();
        const surface = currentSurface();
        if (!surface) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "This plugin has no custom browser surfaces.";
          container.append(empty);
          setStatus("No surface");
          return;
        }
        frame = document.createElement("iframe");
        frame.allow = "";
        frame.referrerPolicy = "no-referrer";
        frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
        frame.title = surface.title;
        const url = new URL(surface.url);
        url.searchParams.set("hostOrigin", window.location.origin);
        url.searchParams.set("surfaceId", surface.id);
        frame.src = url.href;
        frame.addEventListener("load", handshake);
        container.append(frame);
        setStatus("Loading");
      }

      function sendResponse(requestId, payload) {
        frame?.contentWindow?.postMessage({
          protocolVersion,
          requestId,
          type: "launchpp.response",
          ...payload,
        }, pluginOrigin);
      }

      async function invoke(message) {
        const controller = new AbortController();
        requests.set(message.requestId, controller);
        log("request → " + message.capability);
        try {
          const response = await fetch("/api/invoke", {
            body: JSON.stringify({ capability: message.capability, input: message.input }),
            headers: { "content-type": "application/json" },
            method: "POST",
            signal: controller.signal,
          });
          const result = await response.json();
          if (response.ok) {
            sendResponse(message.requestId, { ok: true, output: result.output });
            log("response ✓ " + message.capability);
          } else {
            sendResponse(message.requestId, { error: result.error, ok: false });
            log("response ✕ " + message.capability + ": " + result.error.message);
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          sendResponse(message.requestId, {
            error: { code: "UNAVAILABLE", message: "The disposable host request failed.", retryable: true },
            ok: false,
          });
          log("response ✕ host unavailable");
        } finally {
          requests.delete(message.requestId);
        }
      }

      window.addEventListener("message", (event) => {
        if (event.source !== frame?.contentWindow || event.origin !== pluginOrigin) return;
        let size;
        try { size = new TextEncoder().encode(JSON.stringify(event.data)).byteLength; } catch { return; }
        if (size > 65536 || typeof event.data !== "object" || event.data === null) return;
        const message = event.data;
        if (message.protocolVersion !== protocolVersion) return;
        if (message.type === "launchpp.ready" && message.nonce === nonce) {
          ready = true;
          setStatus("Ready", "ready");
          log("handshake ✓ ready");
          return;
        }
        if (message.type === "launchpp.cancel") {
          requests.get(message.requestId)?.abort();
          requests.delete(message.requestId);
          log("cancel ← " + message.requestId);
          return;
        }
        if (message.type === "launchpp.request" && ready) void invoke(message);
      });

      surfaceSelect.addEventListener("change", openSurface);
      themeSelect.addEventListener("change", () => {
        log("theme → " + themeSelect.value);
        openSurface();
      });
      document.querySelector("#reload").addEventListener("click", openSurface);
      document.querySelector("#reset").addEventListener("click", async () => {
        if (!window.confirm("Reset this disposable profile to its original fixtures?")) return;
        const response = await fetch("/api/reset", { method: "POST" });
        if (!response.ok) return log("reset ✕ failed");
        log("fixtures reset");
        await loadSession();
        openSurface();
      });

      const events = new EventSource("/events");
      events.addEventListener("manifest", async () => {
        log("manifest re-registered");
        await loadSession();
        openSurface();
      });
      events.addEventListener("manifest-error", async () => {
        await loadSession();
      });

      try {
        await loadSession();
        openSurface();
      } catch (error) {
        setStatus("Host error", "error");
        log(error instanceof Error ? error.message : String(error));
      }
    </script>
  </body>
</html>
`;
}

import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";

const contentTypes: Readonly<Record<string, string>> = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function sendFile(reply: FastifyReply, root: string, filePath: string): Promise<void> {
  const resolved = await realpath(filePath);
  if (!isWithin(root, resolved))
    throw new Error("Static asset resolved outside LAUNCHPP_WEB_ROOT.");
  const extension = path.extname(resolved).toLowerCase();
  reply.type(contentTypes[extension] ?? "application/octet-stream");
  reply.header(
    "cache-control",
    resolved.includes(`${path.sep}assets${path.sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  );
  reply.send(await readFile(resolved));
}

export async function registerStaticWeb(app: FastifyInstance, webRoot: string): Promise<void> {
  const root = await realpath(path.resolve(webRoot)).catch(() => undefined);
  const indexPath = root ? path.join(root, "index.html") : undefined;
  const index = indexPath ? await stat(indexPath).catch(() => undefined) : undefined;
  if (!root || !indexPath || !index?.isFile()) {
    throw new Error(
      `LAUNCHPP_WEB_ROOT must point to a built web application containing index.html: ${path.resolve(webRoot)}`,
    );
  }

  app.get("/", async (_request, reply) => sendFile(reply, root, indexPath));
  app.get<{ Params: { "*": string } }>("/*", async (request, reply) => {
    let requestPath: string;
    try {
      requestPath = decodeURIComponent(request.params["*"]);
    } catch {
      reply.callNotFound();
      return;
    }
    const segments = requestPath.split("/").filter(Boolean);
    if (
      segments.some((segment) => segment === "." || segment === ".." || segment.startsWith("."))
    ) {
      reply.callNotFound();
      return;
    }

    const candidate = path.resolve(root, ...segments);
    if (isWithin(root, candidate)) {
      const candidateFile = await stat(candidate).catch(() => undefined);
      if (candidateFile?.isFile()) {
        await sendFile(reply, root, candidate);
        return;
      }
    }
    if (
      request.url === "/api" ||
      request.url.startsWith("/api/") ||
      request.url === "/health" ||
      request.url.startsWith("/health/") ||
      path.extname(requestPath)
    ) {
      reply.callNotFound();
      return;
    }
    await sendFile(reply, root, indexPath);
  });
}

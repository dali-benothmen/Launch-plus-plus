#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
process.env.NODE_ENV ??= "development";
process.env.LAUNCHPP_BASE_URL ??= "http://127.0.0.1:3000";
process.env.LAUNCHPP_BIND_ADDRESS ??= "127.0.0.1";
process.env.LAUNCHPP_DATABASE_PATH ??= path.join(root, "data", "launchpp.sqlite");
process.env.LAUNCHPP_WEB_ROOT ??= path.join(root, "apps", "web", "dist");

try {
  const entry = pathToFileURL(path.join(root, "apps", "server", "dist", "main.js")).href;
  const { main } = await import(entry);
  await main();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Launch++ local start failed: ${detail}\n`);
  process.exitCode = 1;
}

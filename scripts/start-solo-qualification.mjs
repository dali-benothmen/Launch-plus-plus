#!/usr/bin/env node

import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const qualificationRoot = path.join(root, ".cache", "solo-qualification");
await rm(qualificationRoot, { force: true, recursive: true });
await mkdir(qualificationRoot, { recursive: true });

process.env.NODE_ENV = "test";
process.env.LAUNCHPP_AUTH_SECRET = "solo-qualification-secret-at-least-32-characters";
process.env.LAUNCHPP_BASE_URL = "http://127.0.0.1:4180";
process.env.LAUNCHPP_BIND_ADDRESS = "127.0.0.1";
process.env.LAUNCHPP_DATABASE_PATH = path.join(qualificationRoot, "launchpp.sqlite");
process.env.LAUNCHPP_LOG_LEVEL = "warn";
process.env.LAUNCHPP_PORT = "4180";
process.env.LAUNCHPP_WEB_ROOT = path.join(root, "apps", "web", "dist");

try {
  const entry = pathToFileURL(path.join(root, "apps", "server", "dist", "main.js")).href;
  const { main } = await import(entry);
  await main();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Launch++ solo qualification failed to start: ${detail}\n`);
  process.exitCode = 1;
}

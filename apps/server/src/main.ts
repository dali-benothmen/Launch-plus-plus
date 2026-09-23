import { pathToFileURL } from "node:url";
import { InstallationLockedError } from "@launchpp/database";
import { ConfigurationError } from "./config.js";
import { installSignalHandlers, startServer } from "./lifecycle.js";

export async function main(): Promise<void> {
  const server = await startServer();
  installSignalHandlers(server);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    const category =
      error instanceof ConfigurationError
        ? "configuration is invalid"
        : error instanceof InstallationLockedError
          ? "database is already in use"
          : "startup failed";
    process.stderr.write(`Launch++ ${category}: ${detail}\n`);
    process.exitCode = 1;
  });
}

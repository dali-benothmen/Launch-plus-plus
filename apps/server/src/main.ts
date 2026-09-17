import { pathToFileURL } from "node:url";
import { installSignalHandlers, startServer } from "./lifecycle.js";

export async function main(): Promise<void> {
  const server = await startServer();
  installSignalHandlers(server);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`Launch++ failed to start: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

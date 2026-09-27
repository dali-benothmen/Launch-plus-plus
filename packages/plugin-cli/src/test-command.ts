import { spawn } from "node:child_process";
import path from "node:path";

import { checkPlugin } from "./check-command.js";

export interface RunPluginTestsOptions {
  readonly args?: readonly string[];
  readonly projectDirectory?: string;
}

export async function runPluginTests(options: RunPluginTestsOptions = {}): Promise<number> {
  const projectDirectory = path.resolve(options.projectDirectory ?? process.cwd());
  const checked = await checkPlugin({ projectDirectory });
  if (!checked.ok) {
    throw new Error("Plugin checks failed. Run 'launchpp check' for details.");
  }

  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(executable, ["exec", "vitest", "run", ...(options.args ?? [])], {
      cwd: projectDirectory,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Vitest stopped with signal ${signal}.`));
      else resolve(code ?? 1);
    });
  });
}

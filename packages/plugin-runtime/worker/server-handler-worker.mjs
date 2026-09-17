import { parentPort } from "node:worker_threads";

import RELEASE_SYNC from "@jitl/quickjs-wasmfile-release-sync";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";

if (parentPort === null) throw new Error("Plugin worker requires a parent port.");

const errorCodes = {
  cpuLimit: "CPU_LIMIT",
  invalidHandler: "INVALID_HANDLER",
  memoryLimit: "MEMORY_LIMIT",
  outputLimit: "OUTPUT_LIMIT",
  runtimeFailure: "RUNTIME_FAILURE",
};

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function classify(error) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error?.message === "string"
        ? error.message
        : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("interrupted")) {
    return { code: errorCodes.cpuLimit, message: "Plugin CPU-time limit exceeded." };
  }
  if (normalized.includes("out of memory") || normalized.includes("memory limit")) {
    return { code: errorCodes.memoryLimit, message: "Plugin memory limit exceeded." };
  }
  if (
    normalized.includes("handler must") ||
    normalized.includes("asynchronous handlers") ||
    normalized.includes("serializable json") ||
    normalized.includes("could not load module") ||
    normalized.includes("module loader") ||
    normalized.includes("syntaxerror") ||
    normalized.includes("referenceerror") ||
    normalized.includes("typeerror")
  ) {
    return { code: errorCodes.invalidHandler, message: `Invalid plugin handler: ${message}` };
  }
  return { code: errorCodes.runtimeFailure, message: "Plugin execution failed." };
}

parentPort.once("message", async ({ input, limits, source }) => {
  try {
    const QuickJS = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
    const deadline = performance.now() + limits.cpuTimeMs;
    const inputJson = JSON.stringify(input);
    const program = `
      "use strict";
      (() => {
        const handler = (${source});
        if (typeof handler !== "function") {
          throw new TypeError("Handler must be a function expression.");
        }
        const output = handler(${inputJson});
        if (output !== null && (typeof output === "object" || typeof output === "function") && typeof output.then === "function") {
          throw new TypeError("Asynchronous handlers require the future capability bridge.");
        }
        const serialized = JSON.stringify(output);
        if (serialized === undefined) {
          throw new TypeError("Handler output must be serializable JSON.");
        }
        return serialized;
      })()
    `;

    const serializedOutput = QuickJS.evalCode(program, {
      maxStackSizeBytes: limits.stackLimitBytes,
      memoryLimitBytes: limits.memoryLimitBytes,
      shouldInterrupt: () => performance.now() > deadline,
    });
    if (typeof serializedOutput !== "string") {
      throw new TypeError("Handler output must be serializable JSON.");
    }
    if (byteLength(serializedOutput) > limits.maxOutputBytes) {
      parentPort.postMessage({
        code: errorCodes.outputLimit,
        message: "Plugin output exceeds the configured size limit.",
        ok: false,
      });
      return;
    }

    parentPort.postMessage({ ok: true, output: JSON.parse(serializedOutput) });
  } catch (error) {
    parentPort.postMessage({ ...classify(error), ok: false });
  }
});

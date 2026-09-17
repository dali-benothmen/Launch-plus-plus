import { describe, expect, it } from "vitest";

import {
  IsolatedPluginHandlerRuntime,
  PLUGIN_EXECUTION_ERROR_CODES,
  PluginExecutionError,
  type PluginExecutionErrorCode,
} from "./index.js";

const runtime = new IsolatedPluginHandlerRuntime();

async function expectCode(
  promise: Promise<unknown>,
  code: PluginExecutionErrorCode,
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected plugin execution to fail with ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(PluginExecutionError);
    expect((error as PluginExecutionError).code).toBe(code);
  }
}

async function expectOneOfCodes(
  promise: Promise<unknown>,
  codes: readonly PluginExecutionErrorCode[],
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected plugin execution to fail with one of ${codes.join(", ")}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(PluginExecutionError);
    expect(codes).toContain((error as PluginExecutionError).code);
  }
}

describe("isolated plugin handler runtime", () => {
  it("executes a normalized JSON handler in a fresh QuickJS worker", async () => {
    await expect(
      runtime.execute({
        input: { value: 21 },
        source: "(input) => ({ doubled: input.value * 2 })",
      }),
    ).resolves.toEqual({ doubled: 42 });
  });

  it("does not expose process, filesystem loading, or network globals", async () => {
    await expect(
      runtime.execute({
        input: {},
        source: `() => ({
          fetchBlocked: typeof fetch === "undefined",
          processBlocked: typeof process === "undefined",
          requireBlocked: typeof require === "undefined",
          webAssemblyBlocked: typeof WebAssembly === "undefined"
        })`,
      }),
    ).resolves.toEqual({
      fetchBlocked: true,
      processBlocked: true,
      requireBlocked: true,
      webAssemblyBlocked: true,
    });
  });

  it("rejects module imports instead of resolving host modules", async () => {
    await expectCode(
      runtime.execute({ input: {}, source: "() => import('node:fs')" }),
      PLUGIN_EXECUTION_ERROR_CODES.invalidHandler,
    );
  });

  it("interrupts guest CPU loops", async () => {
    await expectCode(
      runtime.execute(
        { input: {}, source: "() => { while (true) {} }" },
        { limits: { cpuTimeMs: 20, wallTimeMs: 1_000 } },
      ),
      PLUGIN_EXECUTION_ERROR_CODES.cpuLimit,
    );
  });

  it("enforces a parent-owned wall deadline even when the guest deadline is longer", async () => {
    const started = performance.now();
    await expectCode(
      runtime.execute(
        { input: {}, source: "() => { while (true) {} }" },
        { limits: { cpuTimeMs: 10_000, wallTimeMs: 150 } },
      ),
      PLUGIN_EXECUTION_ERROR_CODES.wallTimeLimit,
    );
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it("contains long native guest operations even if interrupt callbacks are delayed", async () => {
    const started = performance.now();
    await expectOneOfCodes(
      runtime.execute(
        {
          input: {},
          source: "() => { new Array(1_000_000_000) + ''; return null; }",
        },
        {
          limits: {
            cpuTimeMs: 20,
            memoryLimitBytes: 2 * 1024 * 1024,
            wallTimeMs: 250,
          },
        },
      ),
      [
        PLUGIN_EXECUTION_ERROR_CODES.cpuLimit,
        PLUGIN_EXECUTION_ERROR_CODES.memoryLimit,
        PLUGIN_EXECUTION_ERROR_CODES.wallTimeLimit,
      ],
    );
    expect(performance.now() - started).toBeLessThan(1_500);
  });

  it("stops guest heap growth at the QuickJS memory boundary", async () => {
    await expectCode(
      runtime.execute(
        {
          input: {},
          source: "() => { const values = []; while (true) values.push('x'.repeat(1024)); }",
        },
        {
          limits: {
            cpuTimeMs: 1_000,
            memoryLimitBytes: 2 * 1024 * 1024,
            wallTimeMs: 1_500,
          },
        },
      ),
      PLUGIN_EXECUTION_ERROR_CODES.memoryLimit,
    );
  });

  it("rejects oversized output before it crosses the worker boundary", async () => {
    await expectCode(
      runtime.execute(
        { input: {}, source: "() => 'x'.repeat(2048)" },
        { limits: { maxOutputBytes: 100 } },
      ),
      PLUGIN_EXECUTION_ERROR_CODES.outputLimit,
    );
  });

  it("terminates an invocation when its caller cancels", async () => {
    const controller = new AbortController();
    const execution = runtime.execute(
      { input: {}, source: "() => { while (true) {} }" },
      { limits: { cpuTimeMs: 10_000 }, signal: controller.signal },
    );
    setTimeout(() => controller.abort(), 25);

    await expectCode(execution, PLUGIN_EXECUTION_ERROR_CODES.aborted);
  });

  it("does not preserve globals between invocations", async () => {
    await expect(
      runtime.execute({
        input: {},
        source: "() => { globalThis.pluginSecret = 'private'; return true; }",
      }),
    ).resolves.toBe(true);
    await expect(
      runtime.execute({
        input: {},
        source: "() => Object.hasOwn(globalThis, 'pluginSecret')",
      }),
    ).resolves.toBe(false);
  });

  it("rejects non-JSON input before creating a worker", async () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    await expectCode(
      runtime.execute({ input: cyclic, source: "(input) => input" }),
      PLUGIN_EXECUTION_ERROR_CODES.invalidHandler,
    );
  });
});

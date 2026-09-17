import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { validateInstalledPluginManifest, validatePluginMessage } from "./index.js";

async function fixture(group: "forward" | "invalid" | "valid", name: string): Promise<unknown> {
  const file = new URL(`../fixtures/${group}/${name}`, import.meta.url);
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

describe("installed plugin manifest v0", () => {
  it("accepts the canonical minimal manifest", async () => {
    const result = validateInstalledPluginManifest(await fixture("valid", "minimal-manifest.json"));

    expect(result).toMatchObject({ ok: true });
  });

  it.each([
    ["archive-traversal-manifest.json", "pattern"],
    ["duplicate-contribution-id-manifest.json", "uniqueContributionId"],
    ["unknown-surface-manifest.json", "surfaceReference"],
  ])("rejects %s with a precise issue", async (name, keyword) => {
    const result = validateInstalledPluginManifest(await fixture("invalid", name));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ keyword })]));
    }
  });

  it("rejects a forward plugin API version explicitly", async () => {
    const result = validateInstalledPluginManifest(
      await fixture("forward", "manifest-api-version.json"),
    );

    expect(result).toEqual({
      issues: [
        expect.objectContaining({
          keyword: "compatibility",
          path: "/apiVersion",
        }),
      ],
      ok: false,
    });
  });
});

describe("browser bridge protocol v0", () => {
  it.each([
    "handshake.json",
    "ready.json",
    "request.json",
    "response.json",
    "error-response.json",
    "cancellation.json",
  ])("accepts %s", async (name) => {
    expect(validatePluginMessage(await fixture("valid", name))).toMatchObject({
      ok: true,
    });
  });

  it("rejects properties that could forge host context", async () => {
    const result = validatePluginMessage(
      await fixture("invalid", "unexpected-property-message.json"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some(({ keyword }) => keyword === "additionalProperties")).toBe(true);
    }
  });

  it("rejects a forward protocol version explicitly", async () => {
    const result = validatePluginMessage(await fixture("forward", "protocol-message.json"));

    expect(result).toEqual({
      issues: [
        expect.objectContaining({
          keyword: "compatibility",
          path: "/protocolVersion",
        }),
      ],
      ok: false,
    });
  });
});

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { semanticThemeValues } from "./index.js";

describe("semantic theme tokens", () => {
  it("publishes matching light and dark CSS variables", async () => {
    const stylesheet = await readFile(new URL("../styles.css", import.meta.url), "utf8");

    expect(stylesheet).toContain('[data-launch-theme="light"]');
    expect(stylesheet).toContain('[data-launch-theme="dark"]');
    expect(stylesheet).toContain(
      `--launch-color-bg-canvas: ${semanticThemeValues.light.background}`,
    );
    expect(stylesheet).toContain(
      `--launch-color-bg-canvas: ${semanticThemeValues.dark.background}`,
    );
    expect(stylesheet).not.toContain(".ant-");
  });
});

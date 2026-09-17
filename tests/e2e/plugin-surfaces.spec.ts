import { expect, test } from "@playwright/test";

test("packed React and vanilla surfaces remain isolated behind one bridge", async ({ page }) => {
  await page.goto("/__proofs/plugin-surfaces");

  await expect(page.getByRole("heading", { name: "Browser isolation proof" })).toBeVisible();
  await expect(page.getByLabel("Packed React surface").getByText("ready")).toBeVisible();
  await expect(page.getByLabel("Packed vanilla surface").getByText("ready")).toBeVisible();

  const frames = page.locator("iframe");
  await expect(frames).toHaveCount(2);
  for (const frame of await frames.all()) {
    await expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-same-origin");
    await expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
  }

  const react = page.frameLocator('iframe[title="Packed React surface"]');
  await expect(react.getByText("Theme: dark")).toBeVisible();
  await react.getByRole("button", { name: "Call host" }).click();
  await expect(react.getByText("Echo from launchpp-host")).toBeVisible();
  await react.getByRole("button", { name: "Cancel request" }).click();
  await expect(react.getByText("Cancelled: ABORTED")).toBeVisible();
  await react.getByRole("button", { name: "Check isolation" }).click();
  await expect(react.getByText("Navigation blocked; CSP blocked")).toBeVisible();

  const vanilla = page.frameLocator('iframe[title="Packed vanilla surface"]');
  await expect(vanilla.getByText("Theme: dark")).toBeVisible();
  await vanilla.getByRole("button", { name: "Call host" }).click();
  await expect(vanilla.getByText("Echo from launchpp-host")).toBeVisible();
  await vanilla.getByRole("button", { name: "Check isolation" }).click();
  await expect(vanilla.getByText("Navigation blocked; CSP blocked")).toBeVisible();

  await react.getByRole("button", { name: "Crash plugin" }).click();
  await expect(page.getByRole("heading", { name: "Browser isolation proof" })).toBeVisible();
  await expect(vanilla.getByText("Echo from launchpp-host")).toBeVisible();
});

test("built fixtures retain validated distribution manifests", async ({ request }) => {
  for (const framework of ["react", "vanilla"]) {
    const response = await request.get(
      `http://localhost:4173/plugin-fixtures/${framework}/manifest.json`,
    );
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as {
      apiVersion: string;
      browser: { surfaces: { proof: { document: string } } };
    };
    expect(manifest.apiVersion).toBe("0");
    expect(manifest.browser.surfaces.proof.document).toBe(
      `./plugin-fixtures/${framework}/index.html`,
    );
  }
});

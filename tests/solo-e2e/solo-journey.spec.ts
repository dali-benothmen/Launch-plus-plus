import { expect, type Page, test } from "@playwright/test";

async function expectAccessiblePage(page: Page) {
  const issues = await page.evaluate(() => {
    const visible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && bounds.width > 0;
    };
    const nameOf = (element: Element) =>
      element.getAttribute("aria-label")?.trim() ||
      element.getAttribute("title")?.trim() ||
      element.getAttribute("aria-labelledby")?.trim() ||
      element.textContent?.trim();
    const problems: string[] = [];
    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map((element) => element.id);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    if (duplicates.length > 0) problems.push(`Duplicate IDs: ${duplicates.join(", ")}`);

    for (const control of document.querySelectorAll("button, [role='button'], a[href]")) {
      if (visible(control) && !nameOf(control)) {
        problems.push(`Unnamed control: ${control.outerHTML.slice(0, 100)}`);
      }
    }
    for (const field of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input:not([type='hidden']), textarea",
    )) {
      if (!visible(field)) continue;
      const labelled =
        field.getAttribute("aria-label") ||
        field.getAttribute("aria-labelledby") ||
        field.getAttribute("placeholder") ||
        field.labels?.length;
      if (!labelled) problems.push(`Unlabelled field: ${field.outerHTML.slice(0, 100)}`);
    }
    for (const image of document.querySelectorAll("img")) {
      if (!image.hasAttribute("alt")) problems.push(`Image without alt: ${image.outerHTML}`);
    }
    if (!document.querySelector("main")) problems.push("Page has no main landmark.");
    if (!document.querySelector("h1")) problems.push("Page has no level-one heading.");
    return problems;
  });
  expect(issues).toEqual([]);
}

test("a first owner can complete the solo project journey without plugins", async ({ page }) => {
  const navigationStarted = Date.now();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Set up Launch++" })).toBeVisible();
  expect(Date.now() - navigationStarted).toBeLessThan(10_000);
  await expectAccessiblePage(page);

  await page.getByLabel("Your name").fill("Solo Owner");
  await page.getByLabel("Email").fill("owner@launchpp.test");
  await page.locator("#setup-password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create owner account" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Create project" })).toBeVisible();
  await page.getByPlaceholder("Project name").fill("Launch plan");
  await page.getByRole("button", { name: "Create project" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Launch plan" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Board" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "New task" }).focus();
  await page.keyboard.press("Enter");
  const taskEditor = page.getByRole("dialog", { name: "Create task" });
  await expect(taskEditor).toBeVisible();
  await taskEditor.locator("input").first().fill("Prepare alpha release");
  await taskEditor.locator("textarea").fill("Verify the complete solo workflow.");
  await taskEditor.getByRole("button", { name: "Create task" }).focus();
  await page.keyboard.press("Enter");

  await expect(
    page
      .getByRole("tabpanel", { name: "Board" })
      .getByRole("button", { name: "Prepare alpha release", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "List" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/list$/);
  const listTask = page
    .getByRole("tabpanel", { name: "List" })
    .getByRole("button", { name: "Prepare alpha release", exact: true });
  await expect(listTask).toBeVisible();

  await listTask.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();
  await expect(page).toHaveURL(/\/list\/tasks\//);

  const detail = page.locator(".task-detail-content");
  const title = detail.locator("input").first();
  await title.fill("Prepare qualified alpha release");
  await detail.getByRole("checkbox", { name: "Assign to me" }).check();
  await detail.getByRole("button", { name: "Save changes" }).click();
  await expect(title).toHaveValue("Prepare qualified alpha release");

  await detail.getByPlaceholder("Add a subtask").fill("Write release notes");
  await detail.getByRole("button", { name: "Add", exact: true }).click();
  await expect(detail.getByText("Write release notes", { exact: true })).toBeVisible();

  await detail.getByPlaceholder("Write a comment").fill("Solo journey qualified.");
  await detail.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(detail.getByText("Solo journey qualified.", { exact: true })).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expect(detail.getByText(/You (created|updated|added)/).first()).toBeVisible();

  const route = new URL(page.url()).pathname.match(
    /organizations\/([^/]+)\/projects\/([^/]+)\/list\/tasks\/([^/]+)/,
  );
  expect(route).not.toBeNull();
  const [, organizationId, projectId, taskId] = route as RegExpMatchArray;
  const conflict = await page.evaluate(
    async ({ projectId, taskId, organizationId }) => {
      const taskUrl = `/api/v1/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`;
      const current = await fetch(taskUrl).then((response) => response.json());
      const update = (title: string) =>
        fetch(taskUrl, {
          body: JSON.stringify({ expectedRevision: current.task.revision, title }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        });
      const responses = await Promise.all([
        update("Concurrent edit A"),
        update("Concurrent edit B"),
      ]);
      const bodies = await Promise.all(responses.map((response) => response.json()));
      const authoritative = await fetch(taskUrl).then((response) => response.json());
      return {
        authoritativeTitle: authoritative.task.title,
        bodies,
        statuses: responses.map((response) => response.status).sort(),
      };
    },
    { projectId, taskId, organizationId },
  );
  expect(conflict.statuses).toEqual([200, 409]);
  expect(conflict.bodies).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "task_revision_conflict",
        extensions: expect.objectContaining({ currentRevision: expect.any(Number) }),
      }),
    ]),
  );
  expect(["Concurrent edit A", "Concurrent edit B"]).toContain(conflict.authoritativeTitle);

  await page.getByRole("button", { name: "Close drawer" }).click();
  await page
    .getByRole("complementary", { name: "Primary navigation" })
    .getByRole("button", { name: "Search", exact: true })
    .click();
  const search = page.getByRole("dialog", { name: "Search" });
  await search.getByPlaceholder("Search projects and tasks").fill("Concurrent edit");
  await expect(
    search.getByRole("button", { name: new RegExp(conflict.authoritativeTitle) }),
  ).toBeVisible();
  await expectAccessiblePage(page);

  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).not.toBe("BODY");
  expect(await page.locator("iframe").count()).toBe(0);
});

// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createMemoryRouter } from "react-router-dom";
import type { ApiClient } from "@launchpp/api-client";
import { App, appRoutes } from "./app.js";

const apiClient: ApiClient = {
  health: { readiness: vi.fn(async () => ({ status: "ready" as const })) },
};

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => cleanup());

function renderApp(pathname = "/", initialTheme: "dark" | "light" = "light") {
  const router = createMemoryRouter(appRoutes, { initialEntries: [pathname] });
  return render(<App apiClient={apiClient} initialTheme={initialTheme} router={router} />);
}

describe("web application shell", () => {
  it("propagates semantic light and dark themes to the document", async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() =>
      expect(document.documentElement.getAttribute("data-launch-theme")).toBe("light"),
    );
    await user.click(screen.getByRole("button", { name: "Use dark theme" }));
    await waitFor(() =>
      expect(document.documentElement.getAttribute("data-launch-theme")).toBe("dark"),
    );
  });

  it("navigates to Settings using the keyboard", async () => {
    const user = userEvent.setup();
    renderApp();

    const settingsLink = screen.getByRole("link", { name: "Settings" });
    settingsLink.focus();
    expect(document.activeElement).toBe(settingsLink);
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeTruthy();
  });

  it("offers the first-time project action without onboarding", () => {
    renderApp();

    expect(screen.getByRole("heading", { level: 1, name: "My Work" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Create project" }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/onboarding/i)).toBeNull();
  });
});

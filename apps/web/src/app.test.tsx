// @vitest-environment jsdom

import type { ApiClient } from "@launchpp/api-client";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { App, appRoutes } from "./app.js";

const apiClient: ApiClient = {
  auth: {
    recoveryCapabilities: vi.fn(async () => ({ email: false, operatorRecovery: true })),
    session: vi.fn(async () => ({
      expiresAt: Date.now() + 60_000,
      id: "session-1",
      identity: { email: "owner@example.com", id: "owner-1", name: "Owner" },
    })),
    signIn: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
  },
  health: { readiness: vi.fn(async () => ({ status: "ready" as const })) },
  setup: {
    claim: vi.fn(async () => undefined),
    createOwner: vi.fn(async () => undefined),
    status: vi.fn(async () => ({ requiresSetup: false, setupAuthorized: false })),
  },
  workspaces: {
    create: vi.fn(async () => ({
      id: "workspace-1",
      name: "My Workspace",
      revision: 1,
      slug: "my-workspace",
    })),
    list: vi.fn(async () => ({
      currentWorkspaceId: "workspace-1",
      workspaces: [{ id: "workspace-1", name: "My Workspace", revision: 1, slug: "my-workspace" }],
    })),
    select: vi.fn(async () => undefined),
  },
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

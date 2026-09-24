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
  search: vi.fn(async () => ({ items: [] })),
  projects: {
    archive: vi.fn(async () => ({
      access: "organization" as const,
      archivedAt: Date.now(),
      description: "",
      favorite: false,
      id: "project-1",
      key: "PROJ",
      name: "Project",
      position: 0,
      revision: 2,
      slug: "project",
      organizationId: "organization-1",
    })),
    create: vi.fn(async (_organizationId, input) => ({
      access: "organization" as const,
      description: input.description ?? "",
      favorite: false,
      ...(input.folderId ? { folderId: input.folderId } : {}),
      id: "project-1",
      key: "PROJ",
      name: input.name,
      position: 0,
      revision: 1,
      slug: "project",
      organizationId: "organization-1",
    })),
    createFolder: vi.fn(async (_organizationId, name) => ({
      id: "folder-1",
      name,
      position: 0,
      revision: 1,
      organizationId: "organization-1",
    })),
    createStatus: vi.fn(async (_organizationId, projectId, input) => ({
      category: input.category ?? ("active" as const),
      color: input.color ?? "#8c8c8c",
      id: "status-1",
      name: input.name,
      position: 0,
      projectId,
      revision: 1,
    })),
    delete: vi.fn(async () => undefined),
    deleteStatus: vi.fn(async () => undefined),
    deleteFolder: vi.fn(async () => undefined),
    list: vi.fn(async () => ({ folders: [], projects: [], statuses: [] })),
    markOpened: vi.fn(async () => undefined),
    renameFolder: vi.fn(async (_organizationId, folderId, name) => ({
      id: folderId,
      name,
      position: 0,
      revision: 2,
      organizationId: "organization-1",
    })),
    renameStatus: vi.fn(async (_organizationId, projectId, statusId, name) => ({
      category: "active" as const,
      color: "#1677ff",
      id: statusId,
      name,
      position: 0,
      projectId,
      revision: 2,
    })),
    reorderFolders: vi.fn(async () => undefined),
    reorderProjects: vi.fn(async () => undefined),
    reorderStatuses: vi.fn(async () => undefined),
    restore: vi.fn(async () => ({
      access: "organization" as const,
      description: "",
      favorite: false,
      id: "project-1",
      key: "PROJ",
      name: "Project",
      position: 0,
      revision: 3,
      slug: "project",
      organizationId: "organization-1",
    })),
    setFavorite: vi.fn(async () => undefined),
    update: vi.fn(async (_organizationId, projectId, input) => ({
      access: "organization" as const,
      description: input.description ?? "",
      favorite: false,
      ...(typeof input.folderId === "string" ? { folderId: input.folderId } : {}),
      id: projectId,
      key: "PROJ",
      name: input.name ?? "Project",
      position: 0,
      revision: 2,
      slug: "project",
      organizationId: "organization-1",
    })),
  },
  setup: {
    claim: vi.fn(async () => undefined),
    createOwner: vi.fn(async () => undefined),
    status: vi.fn(async () => ({ requiresSetup: false, setupAuthorized: false })),
  },
  tasks: {
    archive: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    create: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    createAttachment: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    createComment: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    createLabel: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    deleteAttachment: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    downloadAttachment: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    get: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    list: vi.fn(async () => ({ items: [], labels: [] })),
    move: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    replaceAssignees: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    replaceLabels: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    restore: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
    update: vi.fn(async () => {
      throw new Error("Task API is not used by this shell fixture.");
    }),
  },
  teams: {
    create: vi.fn(async (organizationId, input) => ({
      id: "team-1",
      name: input.name,
      organizationId,
      revision: 1,
    })),
    list: vi.fn(async () => []),
  },
  organizations: {
    create: vi.fn(async () => ({
      id: "organization-1",
      name: "My Organization",
      revision: 1,
      slug: "my-organization",
    })),
    list: vi.fn(async () => ({
      currentOrganizationId: "organization-1",
      organizations: [
        { id: "organization-1", name: "My Organization", revision: 1, slug: "my-organization" },
      ],
    })),
    rename: vi.fn(async (_organizationId, name) => ({
      id: "organization-1",
      name,
      revision: 2,
      slug: "my-organization",
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

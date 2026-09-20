import type { ApiClient } from "@launchpp/api-client";
import type { ThemeMode } from "@launchpp/ui-tokens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
  RouterProvider,
  type RouterProviderProps,
} from "react-router-dom";
import "@launchpp/ui-tokens/styles.css";
import "./app.css";
import { ApiClientProvider } from "./api-client-context.js";
import {
  AuthenticatedRoute,
  EntryRedirect,
  InstallationBoundary,
  RecoveryPage,
  SetupPage,
  SignInPage,
} from "./auth-pages.js";
import {
  MembersPage,
  MyWorkPage,
  ProjectCreationEntryPage,
  ProjectOverviewPage,
  SettingsPage,
} from "./pages.js";
import { RouteFailurePage, RouteNotFoundPage } from "./route-boundaries.js";
import { AppShell } from "./shell.js";
import { ThemeControllerProvider } from "./theme-context.js";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <EntryRedirect />,
  },
  {
    path: "/setup",
    element: (
      <InstallationBoundary requiresSetup>
        <SetupPage />
      </InstallationBoundary>
    ),
  },
  {
    path: "/sign-in",
    element: (
      <InstallationBoundary requiresSetup={false}>
        <SignInPage />
      </InstallationBoundary>
    ),
  },
  {
    path: "/recover",
    element: (
      <InstallationBoundary requiresSetup={false}>
        <RecoveryPage />
      </InstallationBoundary>
    ),
  },
  {
    path: "/app",
    element: (
      <AuthenticatedRoute>
        <AppShell />
      </AuthenticatedRoute>
    ),
    errorElement: <RouteFailurePage />,
    children: [
      { index: true, element: <MyWorkPage />, errorElement: <RouteFailurePage /> },
      {
        path: "projects/new",
        element: <ProjectCreationEntryPage />,
        errorElement: <RouteFailurePage />,
      },
      {
        path: "workspaces/:workspaceId/projects/:projectId",
        element: <Navigate replace to="board" />,
        errorElement: <RouteFailurePage />,
      },
      {
        path: "workspaces/:workspaceId/projects/:projectId/:view",
        element: <ProjectOverviewPage />,
        errorElement: <RouteFailurePage />,
      },
      {
        path: "workspaces/:workspaceId/projects/:projectId/:view/tasks/:taskId",
        element: <ProjectOverviewPage />,
        errorElement: <RouteFailurePage />,
      },
      { path: "members", element: <MembersPage />, errorElement: <RouteFailurePage /> },
      { path: "settings", element: <SettingsPage />, errorElement: <RouteFailurePage /> },
      ...(import.meta.env.VITE_ENABLE_PLUGIN_PROOF === "true"
        ? [
            {
              path: "__proofs/plugin-surfaces",
              errorElement: <RouteFailurePage />,
              lazy: async () => {
                const { PluginSurfaceProofPage } = await import("./plugin-host/proof-page.js");
                return { Component: PluginSurfaceProofPage };
              },
            },
          ]
        : []),
      { path: "*", element: <RouteNotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export interface AppProps {
  readonly apiClient: ApiClient;
  readonly initialTheme?: ThemeMode;
  readonly router: RouterProviderProps["router"];
}

export function App({ apiClient, initialTheme, router }: AppProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 15_000 },
    },
  });

  return (
    <ApiClientProvider client={apiClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeControllerProvider initialMode={initialTheme}>
          <RouterProvider router={router} />
        </ThemeControllerProvider>
      </QueryClientProvider>
    </ApiClientProvider>
  );
}

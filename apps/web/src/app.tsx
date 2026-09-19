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
  RecoveryPage,
  SetupPage,
  SignInPage,
} from "./auth-pages.js";
import { MembersPage, MyWorkPage, SettingsPage } from "./pages.js";
import { AppShell } from "./shell.js";
import { ThemeControllerProvider } from "./theme-context.js";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <EntryRedirect />,
  },
  { path: "/setup", element: <SetupPage /> },
  { path: "/sign-in", element: <SignInPage /> },
  { path: "/recover", element: <RecoveryPage /> },
  {
    path: "/app",
    element: (
      <AuthenticatedRoute>
        <AppShell />
      </AuthenticatedRoute>
    ),
    children: [
      { index: true, element: <MyWorkPage /> },
      {
        path: "projects/new",
        element: <Navigate replace to="/app" />,
      },
      { path: "members", element: <MembersPage /> },
      { path: "settings", element: <SettingsPage /> },
      ...(import.meta.env.VITE_ENABLE_PLUGIN_PROOF === "true"
        ? [
            {
              path: "__proofs/plugin-surfaces",
              lazy: async () => {
                const { PluginSurfaceProofPage } = await import("./plugin-host/proof-page.js");
                return { Component: PluginSurfaceProofPage };
              },
            },
          ]
        : []),
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

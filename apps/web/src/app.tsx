import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  RouterProvider,
  type RouteObject,
  type RouterProviderProps,
} from "react-router-dom";
import type { ApiClient } from "@launchpp/api-client";
import type { ThemeMode } from "@launchpp/ui-tokens";
import "@launchpp/ui-tokens/styles.css";
import "./app.css";
import { ApiClientProvider } from "./api-client-context.js";
import { MembersPage, MyWorkPage, SettingsPage } from "./pages.js";
import { AppShell } from "./shell.js";
import { ThemeControllerProvider } from "./theme-context.js";

export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <MyWorkPage /> },
      { path: "members", element: <MembersPage /> },
      { path: "settings", element: <SettingsPage /> },
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

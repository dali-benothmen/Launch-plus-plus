import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { LaunchProvider } from "@launchpp/ui";
import type { ThemeMode } from "@launchpp/ui-tokens";

interface ThemeController {
  readonly mode: ThemeMode;
  toggle(): void;
}

const ThemeContext = createContext<ThemeController | undefined>(undefined);

export interface ThemeControllerProviderProps extends PropsWithChildren {
  readonly initialMode?: ThemeMode | undefined;
}

export function ThemeControllerProvider({
  children,
  initialMode = "light",
}: ThemeControllerProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const value = useMemo<ThemeController>(
    () => ({
      mode,
      toggle: () => setMode((current) => (current === "light" ? "dark" : "light")),
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <LaunchProvider mode={mode}>{children}</LaunchProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeController(): ThemeController {
  const controller = useContext(ThemeContext);
  if (!controller)
    throw new Error("useThemeController must be used inside ThemeControllerProvider");
  return controller;
}

import {
  type BuiltInThemeId,
  builtInThemeDocuments,
  getBuiltInTheme,
  isBuiltInThemeId,
  type ResolvedTheme,
} from "@launchpp/theme-runtime";
import { LaunchProvider } from "@launchpp/ui";
import type { ThemeMode } from "@launchpp/ui-tokens";
import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";

const preferenceKey = "launchpp:theme";

function savedTheme(): BuiltInThemeId | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const saved = window.localStorage.getItem(preferenceKey);
    return saved && isBuiltInThemeId(saved) ? saved : undefined;
  } catch {
    return undefined;
  }
}

function saveTheme(themeId: BuiltInThemeId) {
  try {
    window.localStorage.setItem(preferenceKey, themeId);
  } catch {
    // The selection still applies for this session when storage is unavailable.
  }
}

interface ThemeController {
  readonly mode: ThemeMode;
  readonly theme: ResolvedTheme;
  readonly themeId: BuiltInThemeId;
  setTheme(themeId: BuiltInThemeId): void;
}

const ThemeContext = createContext<ThemeController | undefined>(undefined);

export interface ThemeControllerProviderProps extends PropsWithChildren {
  readonly initialMode?: ThemeMode | undefined;
}

export function ThemeControllerProvider({ children, initialMode }: ThemeControllerProviderProps) {
  const [themeId, setThemeId] = useState<BuiltInThemeId>(() => {
    if (initialMode) return `launchpp.${initialMode}` as BuiltInThemeId;
    return savedTheme() ?? "launchpp.light";
  });
  const theme = getBuiltInTheme(themeId);
  const value = useMemo<ThemeController>(
    () => ({
      mode: theme.appearance,
      setTheme: (nextThemeId) => {
        setThemeId(nextThemeId);
        saveTheme(nextThemeId);
      },
      theme,
      themeId,
    }),
    [theme, themeId],
  );

  return (
    <ThemeContext.Provider value={value}>
      <LaunchProvider resolvedTheme={theme}>{children}</LaunchProvider>
    </ThemeContext.Provider>
  );
}

export const themeOptions = Object.freeze(
  (["launchpp.light", "launchpp.dark", "launchpp.high-contrast"] as const).map((themeId) => ({
    label: builtInThemeDocuments[themeId].name,
    value: themeId,
  })),
);

export function useThemeController(): ThemeController {
  const controller = useContext(ThemeContext);
  if (!controller)
    throw new Error("useThemeController must be used inside ThemeControllerProvider");
  return controller;
}

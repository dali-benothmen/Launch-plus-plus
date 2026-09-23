import { getBuiltInTheme, type ResolvedTheme, toAntThemeTokens } from "@launchpp/theme-runtime";
import { type ThemeMode, themeAttribute } from "@launchpp/ui-tokens";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ConfigProvider, theme } from "antd";
import { type PropsWithChildren, useLayoutEffect } from "react";

export interface LaunchProviderProps extends PropsWithChildren {
  readonly mode?: ThemeMode;
  readonly resolvedTheme?: ResolvedTheme;
}

export function LaunchProvider({ children, mode = "light", resolvedTheme }: LaunchProviderProps) {
  const activeTheme = resolvedTheme ?? getBuiltInTheme(mode);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute(themeAttribute, activeTheme.id);
    root.setAttribute("data-launch-theme-appearance", activeTheme.appearance);
    root.style.colorScheme = activeTheme.appearance === "light" ? "light" : "dark";
    for (const [name, value] of Object.entries(activeTheme.cssVariables)) {
      root.style.setProperty(name, value);
    }
    return () => {
      root.removeAttribute(themeAttribute);
      root.removeAttribute("data-launch-theme-appearance");
      root.style.removeProperty("color-scheme");
      for (const name of Object.keys(activeTheme.cssVariables)) root.style.removeProperty(name);
    };
  }, [activeTheme]);

  const antTokens = toAntThemeTokens(activeTheme);

  return (
    <ConfigProvider
      theme={{
        algorithm:
          activeTheme.appearance === "light" ? theme.defaultAlgorithm : theme.darkAlgorithm,
        cssVar: { prefix: "launch-ant" },
        token: antTokens,
      }}
    >
      <TooltipPrimitive.Provider delayDuration={300}>{children}</TooltipPrimitive.Provider>
    </ConfigProvider>
  );
}

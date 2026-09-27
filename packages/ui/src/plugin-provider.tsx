import type { LaunchppClient, PluginTheme } from "@launchpp/sdk";
import { LaunchppProvider } from "@launchpp/sdk/react";
import { getBuiltInTheme, type ResolvedTheme } from "@launchpp/theme-runtime";
import { type PropsWithChildren, useMemo } from "react";

import { LaunchProvider } from "./launch-provider.js";

function themeValue(theme: PluginTheme, name: `--launch-${string}`, fallback: string): string {
  return theme.tokens[name] ?? fallback;
}

/** Convert host-provided public CSS tokens into the shared React theme contract. */
export function resolvePluginTheme(theme: PluginTheme): ResolvedTheme {
  const base = getBuiltInTheme(theme.mode);
  const fallbackPaths = Object.keys(base.cssVariables).filter(
    (name) => theme.tokens[name as `--launch-${string}`] === undefined,
  );
  const cssVariables = Object.freeze({ ...base.cssVariables, ...theme.tokens });

  return Object.freeze({
    appearance: theme.mode,
    cssVariables,
    fallbackPaths: Object.freeze(fallbackPaths),
    id: theme.id,
    name: theme.id,
    tokens: Object.freeze({
      color: Object.freeze({
        accent: themeValue(theme, "--launch-color-accent", base.tokens.color.accent),
        accentHover: themeValue(
          theme,
          "--launch-color-accent-hover",
          base.tokens.color.accentHover,
        ),
        border: themeValue(theme, "--launch-color-border", base.tokens.color.border),
        borderStrong: themeValue(
          theme,
          "--launch-color-border-strong",
          base.tokens.color.borderStrong,
        ),
        canvas: themeValue(theme, "--launch-color-bg-canvas", base.tokens.color.canvas),
        danger: themeValue(theme, "--launch-color-danger", base.tokens.color.danger),
        focus: themeValue(theme, "--launch-color-focus", base.tokens.color.focus),
        onAccent: themeValue(theme, "--launch-color-on-accent", base.tokens.color.onAccent),
        success: themeValue(theme, "--launch-color-success", base.tokens.color.success),
        surface: themeValue(theme, "--launch-color-surface", base.tokens.color.surface),
        surfaceHover: themeValue(
          theme,
          "--launch-color-surface-hover",
          base.tokens.color.surfaceHover,
        ),
        surfaceRaised: themeValue(
          theme,
          "--launch-color-surface-raised",
          base.tokens.color.surfaceRaised,
        ),
        textMuted: themeValue(theme, "--launch-color-text-muted", base.tokens.color.textMuted),
        textPrimary: themeValue(
          theme,
          "--launch-color-text-primary",
          base.tokens.color.textPrimary,
        ),
        textSecondary: themeValue(
          theme,
          "--launch-color-text-secondary",
          base.tokens.color.textSecondary,
        ),
        warning: themeValue(theme, "--launch-color-warning", base.tokens.color.warning),
      }),
      radius: Object.freeze({
        large: themeValue(theme, "--launch-radius-large", base.tokens.radius.large),
        medium: themeValue(theme, "--launch-radius-medium", base.tokens.radius.medium),
        small: themeValue(theme, "--launch-radius-small", base.tokens.radius.small),
      }),
      shadow: Object.freeze({
        dialog: themeValue(theme, "--launch-shadow-dialog", base.tokens.shadow.dialog),
        menu: themeValue(theme, "--launch-shadow-menu", base.tokens.shadow.menu),
        panel: themeValue(theme, "--launch-shadow-panel", base.tokens.shadow.panel),
      }),
      typography: Object.freeze({
        fontFamily: themeValue(theme, "--launch-font-family", base.tokens.typography.fontFamily),
        monoFontFamily: themeValue(
          theme,
          "--launch-font-family-code",
          base.tokens.typography.monoFontFamily,
        ),
      }),
    }),
    version: "1-preview",
  });
}

export interface PluginProviderProps extends PropsWithChildren {
  readonly client: LaunchppClient;
}

/** Apply one SDK context and one Launch++ visual theme to a React plugin surface. */
export function PluginProvider({ children, client }: PluginProviderProps) {
  const theme = useMemo(() => resolvePluginTheme(client.theme.current), [client]);

  return (
    <LaunchppProvider client={client}>
      <LaunchProvider resolvedTheme={theme}>{children}</LaunchProvider>
    </LaunchppProvider>
  );
}

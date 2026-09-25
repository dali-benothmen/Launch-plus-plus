import type {
  ThemeAppearance,
  ThemeColorTokens,
  ThemeDocument,
  ThemeRadiusTokens,
} from "@launchpp/theme-schema";

import {
  type BuiltInThemeId,
  builtInThemeDocuments,
  builtInThemeIdByAppearance,
  isBuiltInThemeId,
} from "./built-in-themes.js";

const fontFamilies = Object.freeze({
  humanist: "Inter, ui-sans-serif, system-ui, sans-serif",
  system:
    "AlibabaSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  "system-mono": "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
});

export interface ResolvedThemeTokens {
  readonly color: ThemeColorTokens;
  readonly radius: ThemeRadiusTokens;
  readonly shadow: Readonly<{ dialog: string; menu: string; panel: string }>;
  readonly typography: Readonly<{ fontFamily: string; monoFontFamily: string }>;
}

export interface ResolvedTheme {
  readonly appearance: ThemeAppearance;
  readonly cssVariables: Readonly<Record<`--launch-${string}`, string>>;
  readonly fallbackPaths: readonly string[];
  readonly id: string;
  readonly name: string;
  readonly tokens: ResolvedThemeTokens;
  readonly version: string;
}

function cssVariables(
  tokens: ResolvedThemeTokens,
  appearance: ThemeAppearance,
): ResolvedTheme["cssVariables"] {
  return Object.freeze({
    "--launch-color-accent": tokens.color.accent,
    "--launch-color-accent-hover": tokens.color.accentHover,
    "--launch-color-primary": tokens.color.accent,
    "--launch-color-primary-hover": tokens.color.accentHover,
    "--launch-color-bg-canvas": tokens.color.canvas,
    "--launch-color-bg-elevated": tokens.color.surface,
    "--launch-color-bg-subtle": tokens.color.surfaceHover,
    "--launch-color-bg-container": tokens.color.surface,
    "--launch-color-bg-layout": tokens.color.canvas,
    "--launch-color-border": tokens.color.border,
    "--launch-color-border-secondary":
      appearance === "high-contrast"
        ? tokens.color.border
        : `color-mix(in srgb, ${tokens.color.border} 35%, ${tokens.color.surface})`,
    "--launch-color-border-strong": tokens.color.borderStrong,
    "--launch-color-canvas": tokens.color.canvas,
    "--launch-color-danger": tokens.color.danger,
    "--launch-color-error": tokens.color.danger,
    "--launch-color-focus": tokens.color.focus,
    "--launch-color-on-accent": tokens.color.onAccent,
    "--launch-color-success": tokens.color.success,
    "--launch-color-surface": tokens.color.surface,
    "--launch-color-surface-hover": tokens.color.surfaceHover,
    "--launch-color-surface-raised": tokens.color.surfaceRaised,
    "--launch-color-text": tokens.color.textPrimary,
    "--launch-color-text-muted": tokens.color.textMuted,
    "--launch-color-text-primary": tokens.color.textPrimary,
    "--launch-color-text-secondary": tokens.color.textSecondary,
    "--launch-color-warning": tokens.color.warning,
    "--launch-font-family": tokens.typography.fontFamily,
    "--launch-font-family-code": tokens.typography.monoFontFamily,
    "--launch-radius": tokens.radius.medium,
    "--launch-radius-large": tokens.radius.large,
    "--launch-radius-lg": tokens.radius.large,
    "--launch-radius-medium": tokens.radius.medium,
    "--launch-radius-small": tokens.radius.small,
    "--launch-radius-sm": tokens.radius.small,
    "--launch-shadow-dialog": tokens.shadow.dialog,
    "--launch-shadow-menu": tokens.shadow.menu,
    "--launch-shadow-panel": tokens.shadow.panel,
    "--launch-shadow-surface": tokens.shadow.panel,
  });
}

/** Resolve a document after it has passed `validateThemeDocument`. */
export function resolveTheme(document: ThemeDocument): ResolvedTheme {
  const base = builtInThemeDocuments[builtInThemeIdByAppearance[document.appearance]];
  const fallbackPaths: string[] = [];
  const shadow = {
    dialog: document.tokens.shadow?.dialog ?? base.tokens.shadow?.dialog ?? "none",
    menu: document.tokens.shadow?.menu ?? base.tokens.shadow?.menu ?? "none",
    panel: document.tokens.shadow?.panel ?? base.tokens.shadow?.panel ?? "none",
  };
  const fontFamilyKey =
    document.tokens.typography?.fontFamily ?? base.tokens.typography?.fontFamily;
  const monoFontFamilyKey =
    document.tokens.typography?.monoFontFamily ?? base.tokens.typography?.monoFontFamily;
  if (!document.tokens.shadow?.dialog) fallbackPaths.push("tokens.shadow.dialog");
  if (!document.tokens.shadow?.menu) fallbackPaths.push("tokens.shadow.menu");
  if (!document.tokens.shadow?.panel) fallbackPaths.push("tokens.shadow.panel");
  if (!document.tokens.typography?.fontFamily) fallbackPaths.push("tokens.typography.fontFamily");
  if (!document.tokens.typography?.monoFontFamily)
    fallbackPaths.push("tokens.typography.monoFontFamily");
  const tokens: ResolvedThemeTokens = Object.freeze({
    color: Object.freeze({ ...document.tokens.color }),
    radius: Object.freeze({ ...document.tokens.radius }),
    shadow: Object.freeze(shadow),
    typography: Object.freeze({
      fontFamily: fontFamilies[fontFamilyKey ?? "system"],
      monoFontFamily: fontFamilies[monoFontFamilyKey ?? "system-mono"],
    }),
  });
  return Object.freeze({
    appearance: document.appearance,
    cssVariables: cssVariables(tokens, document.appearance),
    fallbackPaths: Object.freeze(fallbackPaths),
    id: document.id,
    name: document.name,
    tokens,
    version: document.version,
  });
}

const resolvedBuiltIns = Object.freeze({
  "launchpp.dark": resolveTheme(builtInThemeDocuments["launchpp.dark"]),
  "launchpp.high-contrast": resolveTheme(builtInThemeDocuments["launchpp.high-contrast"]),
  "launchpp.light": resolveTheme(builtInThemeDocuments["launchpp.light"]),
});

export function getBuiltInTheme(id: BuiltInThemeId | ThemeAppearance): ResolvedTheme {
  const themeId = isBuiltInThemeId(id) ? id : builtInThemeIdByAppearance[id];
  return resolvedBuiltIns[themeId];
}

export function toAntThemeTokens(theme: ResolvedTheme) {
  return Object.freeze({
    borderRadius: Number.parseInt(theme.tokens.radius.medium, 10),
    borderRadiusLG: Number.parseInt(theme.tokens.radius.large, 10),
    boxShadow: theme.tokens.shadow.panel,
    boxShadowSecondary: theme.tokens.shadow.menu,
    colorBgBase: theme.tokens.color.canvas,
    colorBgContainer: theme.tokens.color.surface,
    colorBgContainerDisabled: theme.tokens.color.surfaceHover,
    colorBgElevated: theme.tokens.color.surfaceRaised,
    colorBgLayout: theme.tokens.color.canvas,
    colorBgSpotlight: theme.tokens.color.surfaceRaised,
    colorBorder: theme.tokens.color.border,
    colorBorderSecondary: theme.tokens.color.border,
    colorError: theme.tokens.color.danger,
    colorFillAlter: theme.tokens.color.surfaceHover,
    colorLink: theme.tokens.color.accent,
    colorLinkHover: theme.tokens.color.accentHover,
    colorPrimary: theme.tokens.color.accent,
    colorPrimaryHover: theme.tokens.color.accentHover,
    colorSuccess: theme.tokens.color.success,
    colorText: theme.tokens.color.textPrimary,
    colorTextBase: theme.tokens.color.textPrimary,
    colorTextDisabled: theme.tokens.color.textMuted,
    colorTextSecondary: theme.tokens.color.textSecondary,
    colorTextTertiary: theme.tokens.color.textMuted,
    colorWarning: theme.tokens.color.warning,
    controlOutline: theme.tokens.color.focus,
    fontFamily: theme.tokens.typography.fontFamily,
    fontFamilyCode: theme.tokens.typography.monoFontFamily,
  });
}

export type { ThemeAppearance, ThemeDocument } from "@launchpp/theme-schema";
export { type BuiltInThemeId, builtInThemeDocuments, builtInThemeIdByAppearance, isBuiltInThemeId };

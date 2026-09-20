import type { ThemeAppearance, ThemeDocument } from "@launchpp/theme-schema";

const common = {
  radius: { large: "8px", medium: "6px", small: "4px" },
  shadow: { dialog: "none", menu: "none", panel: "none" },
  typography: { fontFamily: "system", monoFontFamily: "system-mono" },
} as const;

export const builtInThemeDocuments = Object.freeze({
  "launchpp.dark": Object.freeze({
    appearance: "dark",
    author: { name: "Launch++" },
    id: "launchpp.dark",
    name: "Launch++ Dark",
    schemaVersion: "1",
    tokens: {
      ...common,
      color: {
        accent: "#165bbe",
        accentHover: "#387ed3",
        border: "#424242",
        borderStrong: "#737373",
        canvas: "#000000",
        danger: "#ff7875",
        focus: "#69b1ff",
        onAccent: "#ffffff",
        success: "#95de64",
        surface: "#141414",
        surfaceHover: "#1f1f1f",
        surfaceRaised: "#1f1f1f",
        textMuted: "rgba(255, 255, 255, 0.65)",
        textPrimary: "rgba(255, 255, 255, 0.85)",
        textSecondary: "rgba(255, 255, 255, 0.65)",
        warning: "#ffc53d",
      },
    },
    version: "1.0.0",
  } satisfies ThemeDocument),
  "launchpp.high-contrast": Object.freeze({
    appearance: "high-contrast",
    author: { name: "Launch++" },
    id: "launchpp.high-contrast",
    name: "Launch++ High Contrast",
    schemaVersion: "1",
    tokens: {
      ...common,
      color: {
        accent: "#69b1ff",
        accentHover: "#91caff",
        border: "#ffffff",
        borderStrong: "#ffffff",
        canvas: "#000000",
        danger: "#ff7875",
        focus: "#ffff00",
        onAccent: "#000000",
        success: "#95de64",
        surface: "#000000",
        surfaceHover: "#1f1f1f",
        surfaceRaised: "#000000",
        textMuted: "#ffffff",
        textPrimary: "#ffffff",
        textSecondary: "#ffffff",
        warning: "#ffff00",
      },
    },
    version: "1.0.0",
  } satisfies ThemeDocument),
  "launchpp.light": Object.freeze({
    appearance: "light",
    author: { name: "Launch++" },
    id: "launchpp.light",
    name: "Launch++ Light",
    schemaVersion: "1",
    tokens: {
      ...common,
      color: {
        accent: "#1668dc",
        accentHover: "#3c8ae8",
        border: "#d9d9d9",
        borderStrong: "#bfbfbf",
        canvas: "#f5f5f5",
        danger: "#ff4d4f",
        focus: "#1668dc",
        onAccent: "#ffffff",
        success: "#52c41a",
        surface: "#ffffff",
        surfaceHover: "#fafafa",
        surfaceRaised: "#ffffff",
        textMuted: "rgba(0, 0, 0, 0.88)",
        textPrimary: "rgba(0, 0, 0, 0.88)",
        textSecondary: "rgba(0, 0, 0, 0.88)",
        warning: "#faad14",
      },
    },
    version: "1.0.0",
  } satisfies ThemeDocument),
});

export type BuiltInThemeId = keyof typeof builtInThemeDocuments;

export const builtInThemeIdByAppearance: Readonly<Record<ThemeAppearance, BuiltInThemeId>> =
  Object.freeze({
    dark: "launchpp.dark",
    "high-contrast": "launchpp.high-contrast",
    light: "launchpp.light",
  });

export function isBuiltInThemeId(value: string): value is BuiltInThemeId {
  return value in builtInThemeDocuments;
}

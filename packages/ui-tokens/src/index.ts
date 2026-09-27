export type { ThemeAppearance as ThemeMode } from "@launchpp/theme-schema";

export const themeAttribute = "data-launch-theme" as const;

export const semanticThemeTokens = Object.freeze({
  color: Object.freeze({
    accent: "--launch-color-accent",
    accentHover: "--launch-color-accent-hover",
    background: "--launch-color-bg-canvas",
    border: "--launch-color-border",
    borderStrong: "--launch-color-border-strong",
    danger: "--launch-color-danger",
    focus: "--launch-color-focus",
    onAccent: "--launch-color-on-accent",
    success: "--launch-color-success",
    surface: "--launch-color-surface",
    surfaceHover: "--launch-color-surface-hover",
    surfaceRaised: "--launch-color-surface-raised",
    text: "--launch-color-text-primary",
    textMuted: "--launch-color-text-muted",
    textSecondary: "--launch-color-text-secondary",
    warning: "--launch-color-warning",
  }),
  radius: Object.freeze({
    large: "--launch-radius-large",
    medium: "--launch-radius-medium",
    small: "--launch-radius-small",
  }),
  shadow: Object.freeze({
    dialog: "--launch-shadow-dialog",
    menu: "--launch-shadow-menu",
    panel: "--launch-shadow-panel",
  }),
  typography: Object.freeze({
    fontFamily: "--launch-font-family",
    monoFontFamily: "--launch-font-family-code",
  }),
});

export type SemanticThemeToken =
  (typeof semanticThemeTokens)[keyof typeof semanticThemeTokens][keyof (typeof semanticThemeTokens)[keyof typeof semanticThemeTokens]];

export const semanticThemeValues = Object.freeze({
  light: Object.freeze({
    accent: "#1668dc",
    background: "#f5f5f5",
    elevated: "#ffffff",
    text: "rgba(0, 0, 0, 0.88)",
    textMuted: "rgba(0, 0, 0, 0.88)",
  }),
  dark: Object.freeze({
    accent: "#165bbe",
    background: "#000000",
    elevated: "#141414",
    text: "rgb(255 255 255 / 85%)",
    textMuted: "rgb(255 255 255 / 65%)",
  }),
  "high-contrast": Object.freeze({
    accent: "#69b1ff",
    background: "#000000",
    elevated: "#000000",
    text: "#ffffff",
    textMuted: "#ffffff",
  }),
});

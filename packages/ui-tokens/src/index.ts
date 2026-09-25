export type { ThemeAppearance as ThemeMode } from "@launchpp/theme-schema";

export const themeAttribute = "data-launch-theme" as const;

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

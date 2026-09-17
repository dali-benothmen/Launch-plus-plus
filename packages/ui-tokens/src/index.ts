export type ThemeMode = "dark" | "light";

export const themeAttribute = "data-launch-theme" as const;

export const semanticThemeValues = Object.freeze({
  light: Object.freeze({
    accent: "#5b5bd6",
    background: "#f6f7f9",
    elevated: "#ffffff",
    text: "#1d2433",
    textMuted: "#687083",
  }),
  dark: Object.freeze({
    accent: "#8b8bf5",
    background: "#111318",
    elevated: "#191c23",
    text: "#f4f6fa",
    textMuted: "#a4abba",
  }),
});

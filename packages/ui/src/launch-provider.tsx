import { ConfigProvider, theme } from "antd";
import { useLayoutEffect, type PropsWithChildren } from "react";
import { semanticThemeValues, themeAttribute, type ThemeMode } from "@launchpp/ui-tokens";

export interface LaunchProviderProps extends PropsWithChildren {
  readonly mode: ThemeMode;
}

export function LaunchProvider({ children, mode }: LaunchProviderProps) {
  const values = semanticThemeValues[mode];

  useLayoutEffect(() => {
    document.documentElement.setAttribute(themeAttribute, mode);
    return () => document.documentElement.removeAttribute(themeAttribute);
  }, [mode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        cssVar: { prefix: "launch-ant" },
        token: {
          borderRadius: 8,
          colorBgBase: values.background,
          colorBgContainer: values.elevated,
          colorPrimary: values.accent,
          colorText: values.text,
          colorTextSecondary: values.textMuted,
          controlHeight: 36,
          fontFamily: "inherit",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

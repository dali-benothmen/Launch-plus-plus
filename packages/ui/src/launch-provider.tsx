import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ConfigProvider, theme } from "antd";
import { useLayoutEffect, type PropsWithChildren } from "react";
import { themeAttribute, type ThemeMode } from "@launchpp/ui-tokens";

export interface LaunchProviderProps extends PropsWithChildren {
  readonly mode: ThemeMode;
}

export function LaunchProvider({ children, mode }: LaunchProviderProps) {
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
          colorPrimary: "#1668dc",
        },
      }}
    >
      <TooltipPrimitive.Provider delayDuration={300}>{children}</TooltipPrimitive.Provider>
    </ConfigProvider>
  );
}

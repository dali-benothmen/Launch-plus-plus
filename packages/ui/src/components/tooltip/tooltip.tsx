import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";

export interface TooltipProps {
  readonly children: ReactElement;
  readonly placement?: "bottom" | "left" | "right" | "top";
  readonly title: ReactNode;
}

export function Tooltip({ children, placement = "top", title }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="launch-ui-tooltip" side={placement} sideOffset={6}>
          {title}
          <TooltipPrimitive.Arrow className="launch-ui-tooltip-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

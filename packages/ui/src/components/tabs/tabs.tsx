import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { classes } from "../internal/classes.js";

export interface TabItem {
  readonly content: ReactNode;
  readonly label: ReactNode;
  readonly value: string;
}

export interface TabsProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly defaultValue: string;
  readonly items: ReadonlyArray<TabItem>;
  readonly onValueChange?: (value: string) => void;
  readonly value?: string;
}

export function Tabs({
  ariaLabel,
  className,
  defaultValue,
  items,
  onValueChange,
  value,
}: TabsProps) {
  return (
    <TabsPrimitive.Root
      className={classes("launch-ui-tabs", className)}
      defaultValue={defaultValue}
      {...(onValueChange === undefined ? {} : { onValueChange })}
      {...(value === undefined ? {} : { value })}
    >
      <TabsPrimitive.List aria-label={ariaLabel} className="launch-ui-tabs-list">
        {items.map((item) => (
          <TabsPrimitive.Trigger className="launch-ui-tab" key={item.value} value={item.value}>
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          className="launch-ui-tab-content"
          key={item.value}
          value={item.value}
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

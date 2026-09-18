import * as SwitchPrimitive from "@radix-ui/react-switch";
import { classes } from "../internal/classes.js";

export interface SwitchProps {
  readonly ariaLabel: string;
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly disabled?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly size?: "small" | "medium";
}

export function Switch({
  ariaLabel,
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  size = "medium",
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      aria-label={ariaLabel}
      className={classes("launch-ui-switch", size === "small" && "is-small")}
      {...(checked === undefined ? {} : { checked })}
      {...(defaultChecked === undefined ? {} : { defaultChecked })}
      {...(disabled === undefined ? {} : { disabled })}
      {...(onCheckedChange === undefined ? {} : { onCheckedChange })}
    >
      <SwitchPrimitive.Thumb className="launch-ui-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}

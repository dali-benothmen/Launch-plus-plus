import type { HTMLAttributes } from "react";
import { classes } from "../internal/classes.js";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  readonly color?: "blue" | "green" | "neutral" | "purple";
  readonly variant?: "filled" | "outlined" | "solid";
}

export function Tag({ className, color = "neutral", variant = "outlined", ...props }: TagProps) {
  return (
    <span
      {...props}
      className={classes("launch-ui-tag", `is-${color}`, `is-${variant}`, className)}
    />
  );
}

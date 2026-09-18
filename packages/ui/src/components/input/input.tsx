import { forwardRef, type InputHTMLAttributes } from "react";
import { classes } from "../internal/classes.js";

export type InputVariant = "borderless" | "filled" | "outlined" | "underlined";
export type InputShape = "default" | "round";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly shape?: InputShape;
  readonly status?: "error" | "warning";
  readonly variant?: InputVariant;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, shape = "default", status, variant = "outlined", ...props },
  ref,
) {
  return (
    <input
      {...props}
      aria-invalid={status === "error" || props["aria-invalid"]}
      className={classes(
        "launch-ui-input",
        `is-${variant}`,
        shape === "round" && "is-round",
        status && `is-${status}`,
        className,
      )}
      ref={ref}
    />
  );
});

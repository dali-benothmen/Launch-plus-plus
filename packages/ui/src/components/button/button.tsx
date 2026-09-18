import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { classes } from "../internal/classes.js";
import { LoadingIcon } from "../internal/icons.js";

export type ButtonVariant = "dashed" | "default" | "filled" | "link" | "primary" | "text";
export type ComponentSize = "large" | "medium" | "small";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly danger?: boolean;
  readonly icon?: ReactNode;
  readonly iconOnly?: boolean;
  readonly loading?: boolean;
  readonly size?: ComponentSize;
  readonly variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    danger = false,
    disabled,
    icon,
    iconOnly = false,
    loading = false,
    size = "medium",
    type = "button",
    variant = "default",
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classes(
        "launch-ui-button",
        `is-${variant}`,
        `is-${size}`,
        danger && "is-danger",
        iconOnly && "is-icon-only",
        className,
      )}
      disabled={disabled || loading}
      ref={ref}
      type={type}
    >
      {loading ? <LoadingIcon /> : icon}
      {iconOnly ? null : children}
    </button>
  );
});

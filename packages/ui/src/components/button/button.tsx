import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from "react";
import { classes } from "../internal/classes.js";
import { LoadingIcon } from "../internal/icons.js";

export type ButtonColor = "cyan" | "danger" | "default" | "pink" | "primary" | "purple";
export type ButtonIconPlacement = "end" | "start";
export type ButtonShape = "circle" | "default" | "round";
export type ButtonVariant =
  | "dashed"
  | "default"
  | "filled"
  | "link"
  | "outlined"
  | "primary"
  | "solid"
  | "text";
export type ComponentSize = "large" | "medium" | "small";

export interface ButtonLoadingConfig {
  readonly icon?: ReactNode;
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  readonly block?: boolean;
  readonly color?: ButtonColor;
  readonly danger?: boolean;
  readonly ghost?: boolean;
  readonly href?: string;
  readonly icon?: ReactNode;
  readonly iconOnly?: boolean;
  readonly iconPlacement?: ButtonIconPlacement;
  readonly loading?: boolean | ButtonLoadingConfig;
  readonly rel?: string;
  readonly shape?: ButtonShape;
  readonly size?: ComponentSize;
  readonly target?: string;
  readonly variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    block = false,
    children,
    className,
    color = "default",
    danger = false,
    disabled = false,
    ghost = false,
    href,
    icon,
    iconOnly = false,
    iconPlacement = "start",
    loading = false,
    onClick,
    rel,
    shape = "default",
    size = "medium",
    target,
    type = "button",
    variant = "default",
    ...props
  },
  ref,
) {
  const isLoading = loading !== false;
  const loadingConfig = typeof loading === "object" ? loading : undefined;
  const resolvedColor = danger ? "danger" : color;
  const displayedIcon = isLoading ? (loadingConfig?.icon ?? <LoadingIcon />) : icon;
  const isIconOnly =
    iconOnly || ((children === undefined || children === null) && displayedIcon !== undefined);
  const isDisabled = disabled || isLoading;
  const classNames = classes(
    "launch-ui-button",
    `is-${variant}`,
    `is-color-${resolvedColor}`,
    `is-${size}`,
    `is-shape-${shape}`,
    block && "is-block",
    ghost && "is-ghost",
    danger && "is-danger",
    isDisabled && "is-disabled",
    isIconOnly && "is-icon-only",
    className,
  );
  const content = (
    <>
      {iconPlacement === "start" ? displayedIcon : null}
      {isIconOnly ? null : children}
      {iconPlacement === "end" ? displayedIcon : null}
    </>
  );

  if (href !== undefined) {
    const anchorProps = props as unknown as AnchorHTMLAttributes<HTMLAnchorElement>;
    const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      (onClick as unknown as MouseEventHandler<HTMLAnchorElement> | undefined)?.(event);
    };

    return (
      <a
        {...anchorProps}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        className={classNames}
        href={isDisabled ? undefined : href}
        onClick={handleClick}
        ref={ref as Ref<HTMLAnchorElement>}
        rel={rel}
        tabIndex={isDisabled ? -1 : anchorProps.tabIndex}
        target={target}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={classNames}
      disabled={isDisabled}
      onClick={onClick}
      ref={ref as Ref<HTMLButtonElement>}
      type={type}
    >
      {content}
    </button>
  );
});

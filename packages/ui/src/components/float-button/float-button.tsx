import {
  createContext,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEventHandler,
  type ReactNode,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { Tooltip } from "../tooltip/index.js";

export type FloatButtonShape = "circle" | "square";
export type FloatButtonType = "default" | "primary";
export type FloatButtonGroupPlacement = "bottom" | "left" | "right" | "top";
export type FloatButtonGroupTrigger = "click" | "hover";

export interface FloatButtonBadge {
  readonly count?: number | string;
  readonly dot?: boolean;
  readonly overflowCount?: number;
}

export interface FloatButtonProps {
  readonly "aria-label"?: string;
  readonly badge?: FloatButtonBadge;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly icon?: ReactNode;
  readonly onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  readonly shape?: FloatButtonShape;
  readonly style?: CSSProperties;
  readonly target?: string;
  readonly tooltip?: ReactNode;
  readonly type?: FloatButtonType;
}

const FloatButtonGroupShapeContext = createContext<FloatButtonShape | undefined>(undefined);

function AddIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

function BackTopIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <path d="M3 3.5h10M8 12.5v-7M5.5 8 8 5.5 10.5 8" />
    </svg>
  );
}

function Badge({ badge }: { readonly badge: FloatButtonBadge }) {
  if (badge.dot)
    return (
      <span
        aria-label="New activity"
        className="launch-ui-float-button-badge is-dot"
        role="status"
      />
    );
  if (badge.count === undefined) return null;

  const count =
    typeof badge.count === "number" &&
    badge.overflowCount !== undefined &&
    badge.count > badge.overflowCount
      ? `${badge.overflowCount}+`
      : badge.count;

  return <span className="launch-ui-float-button-badge">{count}</span>;
}

function FloatButtonRoot({
  "aria-label": ariaLabel,
  badge,
  className,
  description,
  disabled = false,
  href,
  icon,
  onClick,
  shape,
  style,
  target,
  tooltip,
  type = "default",
}: FloatButtonProps) {
  const groupShape = useContext(FloatButtonGroupShapeContext);
  const resolvedShape = shape ?? groupShape ?? "circle";
  const accessibleLabel =
    ariaLabel ??
    (typeof description === "string" ? description : undefined) ??
    (typeof tooltip === "string" ? tooltip : undefined) ??
    "Floating action";
  const content = (
    <>
      <span className="launch-ui-float-button-content">
        {description === undefined ? (
          <span className="launch-ui-float-button-icon">{icon ?? <AddIcon />}</span>
        ) : (
          <span className="launch-ui-float-button-description">{description}</span>
        )}
      </span>
      {badge ? <Badge badge={badge} /> : null}
    </>
  );

  const control = href ? (
    <a
      aria-disabled={disabled || undefined}
      aria-label={accessibleLabel}
      className={classes(
        "launch-ui-float-button",
        `is-${resolvedShape}`,
        `is-${type}`,
        disabled && "is-disabled",
        className,
      )}
      href={disabled ? undefined : href}
      onClick={onClick}
      style={style}
      target={target}
    >
      {content}
    </a>
  ) : (
    <button
      aria-label={accessibleLabel}
      className={classes("launch-ui-float-button", `is-${resolvedShape}`, `is-${type}`, className)}
      disabled={disabled}
      onClick={onClick}
      style={style}
      type="button"
    >
      {content}
    </button>
  );

  return tooltip === undefined ? control : <Tooltip title={tooltip}>{control}</Tooltip>;
}

export interface FloatButtonGroupProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly closeIcon?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly icon?: ReactNode;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly placement?: FloatButtonGroupPlacement;
  readonly shape?: FloatButtonShape;
  readonly style?: CSSProperties;
  readonly trigger?: FloatButtonGroupTrigger;
  readonly triggerLabel?: string;
  readonly type?: FloatButtonType;
}

function FloatButtonGroup({
  children,
  className,
  closeIcon,
  defaultOpen = false,
  icon,
  onOpenChange,
  open,
  placement = "top",
  shape = "circle",
  style,
  trigger,
  triggerLabel = "Toggle floating actions",
  type = "default",
}: FloatButtonGroupProps) {
  const groupRef = useRef<HTMLFieldSetElement>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = trigger === undefined ? true : (open ?? internalOpen);

  const changeOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (trigger !== "click" || !isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!groupRef.current?.contains(event.target as Node)) changeOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [changeOpen, isOpen, trigger]);

  function handleKeyDown(event: KeyboardEvent<HTMLFieldSetElement>) {
    if (event.key === "Escape" && isOpen && trigger !== undefined) {
      changeOpen(false);
      groupRef.current
        ?.querySelector<HTMLButtonElement>(".launch-ui-float-button-trigger")
        ?.focus();
    }
  }

  return (
    <FloatButtonGroupShapeContext.Provider value={shape}>
      <fieldset
        aria-label="Floating actions"
        className={classes(
          "launch-ui-float-button-group",
          `is-${placement}`,
          `is-${shape}`,
          trigger === undefined && "is-static",
          className,
        )}
        data-state={isOpen ? "open" : "closed"}
        onKeyDown={handleKeyDown}
        onMouseEnter={trigger === "hover" ? () => changeOpen(true) : undefined}
        onMouseLeave={trigger === "hover" ? () => changeOpen(false) : undefined}
        ref={groupRef}
        style={style}
      >
        <div aria-hidden={!isOpen} className="launch-ui-float-button-group-items" inert={!isOpen}>
          {children}
        </div>
        {trigger ? (
          <FloatButtonRoot
            aria-label={triggerLabel}
            className="launch-ui-float-button-trigger"
            type={type}
            {...(isOpen
              ? { icon: closeIcon ?? <CloseIcon /> }
              : icon === undefined
                ? {}
                : { icon })}
            {...(trigger === "click" ? { onClick: () => changeOpen(!isOpen) } : {})}
            {...(trigger === "hover" ? { tooltip: triggerLabel } : {})}
          />
        ) : null}
      </fieldset>
    </FloatButtonGroupShapeContext.Provider>
  );
}

export interface FloatButtonBackTopProps
  extends Omit<FloatButtonProps, "href" | "onClick" | "target"> {
  readonly onClick?: MouseEventHandler<HTMLButtonElement>;
  readonly target?: () => HTMLElement | Window;
  readonly visibilityHeight?: number;
}

function FloatButtonBackTop({
  icon = <BackTopIcon />,
  onClick,
  target,
  tooltip = "Back to top",
  visibilityHeight = 400,
  ...props
}: FloatButtonBackTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scrollTarget = target?.() ?? window;
    const updateVisibility = () => {
      const scrollTop =
        scrollTarget === window ? window.scrollY : (scrollTarget as HTMLElement).scrollTop;
      setVisible(scrollTop >= visibilityHeight);
    };

    updateVisibility();
    scrollTarget.addEventListener("scroll", updateVisibility, { passive: true });
    return () => scrollTarget.removeEventListener("scroll", updateVisibility);
  }, [target, visibilityHeight]);

  if (!visible) return null;

  return (
    <FloatButtonRoot
      {...props}
      icon={icon}
      onClick={(event) => {
        const scrollTarget = target?.() ?? window;
        scrollTarget.scrollTo({ behavior: "smooth", top: 0 });
        onClick?.(event as React.MouseEvent<HTMLButtonElement>);
      }}
      tooltip={tooltip}
    />
  );
}

export const FloatButton = Object.assign(FloatButtonRoot, {
  BackTop: FloatButtonBackTop,
  Group: FloatButtonGroup,
});

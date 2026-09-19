import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  type AriaAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "../button/index.js";
import { classes } from "../internal/classes.js";
import { CloseIcon } from "../internal/icons.js";

export type DrawerPlacement = "bottom" | "left" | "right" | "top";
export type DrawerSize = "default" | "large" | number | string;
export type DrawerSemanticName =
  | "body"
  | "close"
  | "content"
  | "extra"
  | "footer"
  | "header"
  | "mask"
  | "resizer"
  | "root"
  | "title";
export type DrawerClassNames = Partial<Record<DrawerSemanticName, string>>;
export type DrawerStyles = Partial<Record<DrawerSemanticName, CSSProperties>>;
export type DrawerCloseEvent = Event | SyntheticEvent;

export interface DrawerClosableConfig extends AriaAttributes {
  readonly closeIcon?: ReactNode;
  readonly disabled?: boolean;
  readonly placement?: "end" | "start";
}

export interface DrawerMaskConfig {
  readonly blur?: boolean;
  readonly closable?: boolean;
  readonly enabled?: boolean;
}

export interface DrawerFocusableConfig {
  readonly focusTriggerAfterClose?: boolean;
  readonly trap?: boolean;
}

export interface DrawerResizableConfig {
  readonly onResize?: (size: number) => void;
  readonly onResizeEnd?: () => void;
  readonly onResizeStart?: () => void;
}

export interface DrawerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "onClose" | "style" | "title"> {
  readonly afterOpenChange?: (open: boolean) => void;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly classNames?:
    | DrawerClassNames
    | ((info: { readonly props: DrawerProps }) => DrawerClassNames);
  readonly closable?: boolean | DrawerClosableConfig;
  readonly defaultOpen?: boolean;
  readonly destroyOnHidden?: boolean;
  readonly drawerRender?: (node: ReactNode) => ReactNode;
  readonly extra?: ReactNode;
  readonly focusable?: DrawerFocusableConfig;
  readonly footer?: ReactNode;
  readonly forceRender?: boolean;
  readonly getContainer?: HTMLElement | (() => HTMLElement) | string | false;
  readonly keyboard?: boolean;
  readonly loading?: boolean;
  readonly mask?: boolean | DrawerMaskConfig;
  readonly maxSize?: number;
  readonly onClose?: (event: DrawerCloseEvent) => void;
  readonly open?: boolean;
  readonly placement?: DrawerPlacement;
  readonly resizable?: boolean | DrawerResizableConfig;
  readonly rootClassName?: string;
  readonly rootStyle?: CSSProperties;
  readonly size?: DrawerSize;
  readonly style?: CSSProperties;
  readonly styles?: DrawerStyles | ((info: { readonly props: DrawerProps }) => DrawerStyles);
  readonly title?: ReactNode;
  readonly zIndex?: number;
}

const presetSizes = { default: 378, large: 736 } as const;

interface DrawerResizeState {
  readonly placement: DrawerPlacement;
  readonly size: DrawerSize;
  readonly value: number;
}

function resolveContainer(container: DrawerProps["getContainer"]) {
  if (container === false || container === undefined || typeof document === "undefined") {
    return container;
  }
  if (typeof container === "function") return container();
  if (typeof container === "string") return document.querySelector<HTMLElement>(container);
  return container;
}

function resolveSize(size: DrawerSize) {
  if (typeof size === "number") return `${size}px`;
  if (size === "default" || size === "large") return `${presetSizes[size]}px`;
  return size;
}

function DrawerSkeleton() {
  return (
    <div aria-label="Loading" className="launch-ui-drawer-skeleton" role="status">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function Drawer(drawerProps: DrawerProps) {
  const {
    afterOpenChange,
    children,
    className,
    classNames: classNamesProp,
    closable = true,
    defaultOpen = false,
    destroyOnHidden = false,
    drawerRender,
    extra,
    focusable,
    footer,
    forceRender = false,
    getContainer,
    keyboard = true,
    loading = false,
    mask = true,
    maxSize,
    onClose,
    open,
    placement = "right",
    resizable = false,
    rootClassName,
    rootStyle,
    size = "default",
    style,
    styles: stylesProp,
    title,
    zIndex = 1000,
    ...contentProps
  } = drawerProps;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? internalOpen;
  const [hasOpened, setHasOpened] = useState(resolvedOpen);
  const [resizeState, setResizeState] = useState<DrawerResizeState>();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastCloseEvent = useRef<DrawerCloseEvent | undefined>(undefined);
  const lastAnimationState = useRef<boolean | undefined>(undefined);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: drawerProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: drawerProps }) : (stylesProp ?? {});
  const closableConfig = typeof closable === "object" ? closable : undefined;
  const closePlacement = closableConfig?.placement ?? "start";
  const maskConfig = typeof mask === "object" ? mask : undefined;
  const maskEnabled = typeof mask === "boolean" ? mask : (maskConfig?.enabled ?? true);
  const maskClosable = maskEnabled && (maskConfig?.closable ?? true);
  const resizeConfig = typeof resizable === "object" ? resizable : undefined;
  const {
    closeIcon,
    disabled: closeDisabled,
    placement: _closePlacement,
    ...closeButtonAria
  } = closableConfig ?? {};
  // Keeping a modal Radix overlay mounted also keeps its scroll and pointer locks mounted.
  // Preserve hidden content only for drawers without a modal mask; masked drawers unmount after
  // their exit animation so the page is always restored completely.
  const keepMounted = !maskEnabled && (forceRender || (!destroyOnHidden && hasOpened));
  const container = resolveContainer(getContainer);
  const resizedSize =
    resizeState?.placement === placement && Object.is(resizeState.size, size)
      ? resizeState.value
      : undefined;
  const drawerSize = resizedSize === undefined ? resolveSize(size) : `${resizedSize}px`;

  useEffect(() => {
    if (resolvedOpen) setHasOpened(true);
  }, [resolvedOpen]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    if (!nextOpen) {
      onClose?.(lastCloseEvent.current ?? new Event("close"));
      lastCloseEvent.current = undefined;
    }
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizable || !panelRef.current) return;
    event.preventDefault();
    const bounds = panelRef.current.getBoundingClientRect();
    const horizontal = placement === "left" || placement === "right";
    const initialSize = horizontal ? bounds.width : bounds.height;
    const initialPoint = horizontal ? event.clientX : event.clientY;
    const direction = placement === "right" || placement === "bottom" ? -1 : 1;
    const maximum =
      maxSize ??
      (horizontal
        ? typeof window === "undefined"
          ? Number.POSITIVE_INFINITY
          : window.innerWidth
        : typeof window === "undefined"
          ? Number.POSITIVE_INFINITY
          : window.innerHeight);
    resizeConfig?.onResizeStart?.();

    const handleMove = (moveEvent: PointerEvent) => {
      const point = horizontal ? moveEvent.clientX : moveEvent.clientY;
      const nextSize = Math.min(
        maximum,
        Math.max(180, initialSize + (point - initialPoint) * direction),
      );
      setResizeState({ placement, size, value: nextSize });
      resizeConfig?.onResize?.(nextSize);
    };
    const handleEnd = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      document.body.classList.remove("launch-ui-is-resizing-drawer");
      resizeConfig?.onResizeEnd?.();
    };
    document.body.classList.add("launch-ui-is-resizing-drawer");
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd, { once: true });
  };

  const closeButton = closable ? (
    <DialogPrimitive.Close asChild>
      <Button
        {...closeButtonAria}
        aria-label={closeButtonAria["aria-label"] ?? "Close drawer"}
        className={classes("launch-ui-drawer-close", resolvedClassNames.close)}
        disabled={closeDisabled}
        icon={closeIcon ?? <CloseIcon />}
        iconOnly
        onClick={(event) => {
          lastCloseEvent.current = event;
        }}
        style={resolvedStyles.close}
        variant="text"
      />
    </DialogPrimitive.Close>
  ) : null;
  const hasHeader = closable || title !== undefined || extra !== undefined;
  const panel = (
    <DialogPrimitive.Content
      {...contentProps}
      className={classes(
        "launch-ui-drawer-content",
        `is-${placement}`,
        loading && "is-loading",
        className,
        resolvedClassNames.content,
      )}
      {...(keepMounted ? { forceMount: true } : {})}
      onAnimationEnd={(event) => {
        contentProps.onAnimationEnd?.(event);
        if (event.currentTarget !== event.target) return;
        const nextState = event.currentTarget.getAttribute("data-state") === "open";
        if (lastAnimationState.current === nextState) return;
        lastAnimationState.current = nextState;
        afterOpenChange?.(nextState);
      }}
      onCloseAutoFocus={(event) => {
        if (focusable?.focusTriggerAfterClose === false) event.preventDefault();
      }}
      onEscapeKeyDown={(event) => {
        lastCloseEvent.current = event;
        if (!keyboard) event.preventDefault();
      }}
      onPointerDownOutside={(event) => {
        lastCloseEvent.current = event;
        if (!maskClosable) event.preventDefault();
      }}
      ref={panelRef}
      style={
        {
          "--launch-ui-drawer-size": drawerSize,
          ...resolvedStyles.content,
          ...style,
        } as CSSProperties
      }
    >
      {hasHeader ? (
        <header
          className={classes("launch-ui-drawer-header", resolvedClassNames.header)}
          style={resolvedStyles.header}
        >
          {closePlacement === "start" ? closeButton : null}
          <DialogPrimitive.Title
            className={classes("launch-ui-drawer-title", resolvedClassNames.title)}
            style={resolvedStyles.title}
          >
            {title ?? <span className="launch-ui-visually-hidden">Drawer</span>}
          </DialogPrimitive.Title>
          {extra !== undefined ? (
            <div
              className={classes("launch-ui-drawer-extra", resolvedClassNames.extra)}
              style={resolvedStyles.extra}
            >
              {extra}
            </div>
          ) : null}
          {closePlacement === "end" ? closeButton : null}
        </header>
      ) : (
        <DialogPrimitive.Title className="launch-ui-visually-hidden">Drawer</DialogPrimitive.Title>
      )}
      <div
        className={classes("launch-ui-drawer-body", resolvedClassNames.body)}
        style={resolvedStyles.body}
      >
        {loading ? <DrawerSkeleton /> : children}
      </div>
      {footer !== undefined && footer !== null ? (
        <footer
          className={classes("launch-ui-drawer-footer", resolvedClassNames.footer)}
          style={resolvedStyles.footer}
        >
          {footer}
        </footer>
      ) : null}
      {resizable ? (
        <hr
          aria-label="Resize drawer"
          className={classes("launch-ui-drawer-resizer", resolvedClassNames.resizer)}
          onPointerDown={handleResizeStart}
          style={resolvedStyles.resizer}
        />
      ) : null}
    </DialogPrimitive.Content>
  );
  const renderedPanel = drawerRender?.(panel) ?? panel;
  const portalContents = (
    <div
      className={classes(
        "launch-ui-drawer-root",
        hasOpened && "has-opened",
        rootClassName,
        resolvedClassNames.root,
      )}
      data-placement={placement}
      style={{ ...resolvedStyles.root, ...rootStyle, zIndex }}
    >
      {maskEnabled ? (
        <DialogPrimitive.Overlay
          className={classes(
            "launch-ui-drawer-mask",
            maskConfig?.blur && "is-blurred",
            resolvedClassNames.mask,
          )}
          {...(keepMounted ? { forceMount: true } : {})}
          style={resolvedStyles.mask}
        />
      ) : null}
      {renderedPanel}
    </div>
  );

  return (
    <DialogPrimitive.Root
      modal={focusable?.trap !== false && maskEnabled}
      onOpenChange={handleOpenChange}
      open={resolvedOpen}
    >
      {container === false ? (
        portalContents
      ) : (
        <DialogPrimitive.Portal
          {...(typeof HTMLElement !== "undefined" && container instanceof HTMLElement
            ? { container }
            : {})}
          {...(keepMounted ? { forceMount: true } : {})}
        >
          {portalContents}
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}

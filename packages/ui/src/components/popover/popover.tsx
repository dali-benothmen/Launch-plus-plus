import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  type CSSProperties,
  cloneElement,
  type FocusEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";

export type PopoverPlacement =
  | "bottom"
  | "bottomLeft"
  | "bottomRight"
  | "left"
  | "leftBottom"
  | "leftTop"
  | "right"
  | "rightBottom"
  | "rightTop"
  | "top"
  | "topLeft"
  | "topRight";
export type PopoverTrigger = "click" | "contextMenu" | "focus" | "hover";
export type PopoverSemanticName = "arrow" | "container" | "content" | "title";
export type PopoverClassNames = Partial<Record<PopoverSemanticName, string>>;
export type PopoverStyles = Partial<Record<PopoverSemanticName, CSSProperties>>;

export interface PopoverProps {
  readonly arrow?: boolean | { readonly pointAtCenter?: boolean };
  readonly autoAdjustOverflow?: boolean;
  readonly children: ReactElement;
  readonly className?: string;
  readonly classNames?:
    | PopoverClassNames
    | ((info: { readonly props: PopoverProps }) => PopoverClassNames);
  readonly color?: string;
  readonly content?: ReactNode | (() => ReactNode);
  readonly defaultOpen?: boolean;
  readonly destroyOnHidden?: boolean;
  readonly getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  readonly mouseEnterDelay?: number;
  readonly mouseLeaveDelay?: number;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly placement?: PopoverPlacement;
  readonly style?: CSSProperties;
  readonly styles?: PopoverStyles | ((info: { readonly props: PopoverProps }) => PopoverStyles);
  readonly title?: ReactNode | (() => ReactNode);
  readonly trigger?: PopoverTrigger | ReadonlyArray<PopoverTrigger>;
  readonly zIndex?: number;
}

interface PlacementConfig {
  readonly align: "center" | "end" | "start";
  readonly side: "bottom" | "left" | "right" | "top";
}

type TriggerElementProps = {
  readonly "aria-controls"?: string;
  readonly "aria-expanded"?: boolean;
  readonly "aria-haspopup"?: "dialog";
  readonly onBlur?: FocusEventHandler<HTMLElement>;
  readonly onClick?: MouseEventHandler<HTMLElement>;
  readonly onContextMenu?: MouseEventHandler<HTMLElement>;
  readonly onFocus?: FocusEventHandler<HTMLElement>;
  readonly onPointerEnter?: PointerEventHandler<HTMLElement>;
  readonly onPointerLeave?: PointerEventHandler<HTMLElement>;
  readonly ref?: Ref<HTMLElement>;
};

const placementConfig: Record<PopoverPlacement, PlacementConfig> = {
  bottom: { align: "center", side: "bottom" },
  bottomLeft: { align: "start", side: "bottom" },
  bottomRight: { align: "end", side: "bottom" },
  left: { align: "center", side: "left" },
  leftBottom: { align: "end", side: "left" },
  leftTop: { align: "start", side: "left" },
  right: { align: "center", side: "right" },
  rightBottom: { align: "end", side: "right" },
  rightTop: { align: "start", side: "right" },
  top: { align: "center", side: "top" },
  topLeft: { align: "start", side: "top" },
  topRight: { align: "end", side: "top" },
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref !== null && ref !== undefined) ref.current = value;
}

function resolveNode(value: ReactNode | (() => ReactNode) | undefined) {
  return typeof value === "function" ? value() : value;
}

export function Popover(popoverProps: PopoverProps) {
  const {
    arrow = true,
    autoAdjustOverflow = true,
    children,
    className,
    classNames: classNamesProp,
    color,
    content,
    defaultOpen = false,
    destroyOnHidden = false,
    getPopupContainer,
    mouseEnterDelay = 0.1,
    mouseLeaveDelay = 0.1,
    onOpenChange,
    open: controlledOpen,
    placement = "top",
    style,
    styles: stylesProp,
    title,
    trigger = "hover",
    zIndex,
  } = popoverProps;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [hasOpened, setHasOpened] = useState(defaultOpen || controlledOpen === true);
  const [triggerNode, setTriggerNode] = useState<HTMLElement | null>(null);
  const activeTrigger = useRef<PopoverTrigger | undefined>(undefined);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const contentId = useId();
  const open = controlledOpen ?? internalOpen;
  const triggers = useMemo(() => new Set(Array.isArray(trigger) ? trigger : [trigger]), [trigger]);
  const childProps = children.props as TriggerElementProps;
  const resolvedPlacement = placementConfig[placement];
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: popoverProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: popoverProps }) : (stylesProp ?? {});
  const popupContainer =
    triggerNode !== null && getPopupContainer !== undefined
      ? getPopupContainer(triggerNode)
      : undefined;

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current !== undefined) {
      clearTimeout(openTimer.current);
      openTimer.current = undefined;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== undefined) {
      clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  const updateOpen = useCallback(
    (nextOpen: boolean, source?: PopoverTrigger) => {
      clearOpenTimer();
      clearCloseTimer();
      activeTrigger.current = nextOpen ? source : undefined;
      if (controlledOpen === undefined) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [clearCloseTimer, clearOpenTimer, controlledOpen, onOpenChange],
  );

  const scheduleOpen = useCallback(
    (source: "focus" | "hover") => {
      clearCloseTimer();
      clearOpenTimer();
      openTimer.current = setTimeout(
        () => updateOpen(true, source),
        Math.max(0, mouseEnterDelay * 1000),
      );
    },
    [clearCloseTimer, clearOpenTimer, mouseEnterDelay, updateOpen],
  );

  const scheduleClose = useCallback(
    (source: "focus" | "hover") => {
      clearOpenTimer();
      clearCloseTimer();
      closeTimer.current = setTimeout(
        () => {
          if (activeTrigger.current === source || activeTrigger.current === undefined) {
            updateOpen(false);
          }
        },
        Math.max(0, mouseLeaveDelay * 1000),
      );
    },
    [clearCloseTimer, clearOpenTimer, mouseLeaveDelay, updateOpen],
  );

  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
    },
    [clearCloseTimer, clearOpenTimer],
  );

  useEffect(() => {
    if (open) setHasOpened(true);
    else activeTrigger.current = undefined;
  }, [open]);

  const setMergedTriggerRef = useCallback(
    (node: HTMLElement | null) => {
      setTriggerNode(node);
      assignRef(childProps.ref, node);
    },
    [childProps.ref],
  );

  const triggerElement = cloneElement(
    children as ReactElement<TriggerElementProps>,
    {
      "aria-controls": open ? contentId : undefined,
      "aria-expanded": open,
      "aria-haspopup": "dialog",
      onBlur(event) {
        childProps.onBlur?.(event);
        if (!event.defaultPrevented && triggers.has("focus")) scheduleClose("focus");
      },
      onClick(event) {
        childProps.onClick?.(event);
        if (!event.defaultPrevented && triggers.has("click")) {
          if (open && activeTrigger.current !== "hover" && activeTrigger.current !== "focus") {
            updateOpen(false);
          } else updateOpen(true, "click");
        }
      },
      onContextMenu(event) {
        childProps.onContextMenu?.(event);
        if (event.defaultPrevented || !triggers.has("contextMenu")) return;
        event.preventDefault();
        updateOpen(true, "contextMenu");
      },
      onFocus(event) {
        childProps.onFocus?.(event);
        if (!event.defaultPrevented && triggers.has("focus")) scheduleOpen("focus");
      },
      onPointerEnter(event) {
        childProps.onPointerEnter?.(event);
        if (!event.defaultPrevented && triggers.has("hover")) scheduleOpen("hover");
      },
      onPointerLeave(event) {
        childProps.onPointerLeave?.(event);
        if (!event.defaultPrevented && triggers.has("hover")) scheduleClose("hover");
      },
      ref: setMergedTriggerRef,
    } as TriggerElementProps,
  );

  const titleNode = resolveNode(title);
  const contentNode = resolveNode(content);
  const containerStyle = {
    ...(color === undefined ? {} : { "--launch-ui-popover-bg": color }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...resolvedStyles.container,
    ...style,
  } as CSSProperties;

  return (
    <PopoverPrimitive.Root modal={false} onOpenChange={updateOpen} open={open}>
      <PopoverPrimitive.Anchor asChild>{triggerElement}</PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal
        container={popupContainer}
        {...(!destroyOnHidden && hasOpened ? { forceMount: true as const } : {})}
      >
        <PopoverPrimitive.Content
          align={resolvedPlacement.align}
          avoidCollisions={autoAdjustOverflow}
          className={classes(
            "launch-ui-popover-container",
            resolvedClassNames.container,
            className,
          )}
          collisionPadding={8}
          id={contentId}
          onBlurCapture={(event) => {
            const nextTarget = event.relatedTarget;
            if (
              triggers.has("focus") &&
              (nextTarget === null ||
                (nextTarget instanceof Node &&
                  !event.currentTarget.contains(nextTarget) &&
                  !triggerNode?.contains(nextTarget)))
            ) {
              scheduleClose("focus");
            }
          }}
          onFocusCapture={clearCloseTimer}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            const target = event.detail.originalEvent.target;
            if (target instanceof Node && triggerNode?.contains(target)) event.preventDefault();
          }}
          onPointerEnter={clearCloseTimer}
          onPointerLeave={() => {
            if (triggers.has("hover")) scheduleClose("hover");
          }}
          role="dialog"
          side={resolvedPlacement.side}
          sideOffset={8}
          style={containerStyle}
        >
          {titleNode !== undefined && titleNode !== null ? (
            <div
              className={classes("launch-ui-popover-title", resolvedClassNames.title)}
              style={resolvedStyles.title}
            >
              {titleNode}
            </div>
          ) : null}
          <div
            className={classes("launch-ui-popover-content", resolvedClassNames.content)}
            style={resolvedStyles.content}
          >
            {contentNode}
          </div>
          {arrow !== false ? (
            <PopoverPrimitive.Arrow
              className={classes("launch-ui-popover-arrow", resolvedClassNames.arrow)}
              style={resolvedStyles.arrow}
            />
          ) : null}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

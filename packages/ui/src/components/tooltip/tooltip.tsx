import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  type CSSProperties,
  cloneElement,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";

export type TooltipPlacement =
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
export type TooltipTrigger = "click" | "contextMenu" | "focus" | "hover";
export type TooltipSemanticName = "arrow" | "container";
export type TooltipClassNames = Partial<Record<TooltipSemanticName, string>>;
export type TooltipStyles = Partial<Record<TooltipSemanticName, CSSProperties>>;

export interface TooltipProps {
  readonly arrow?: boolean | { readonly pointAtCenter?: boolean };
  readonly autoAdjustOverflow?: boolean;
  readonly children: ReactElement;
  readonly className?: string;
  readonly classNames?:
    | TooltipClassNames
    | ((info: { readonly props: TooltipProps }) => TooltipClassNames);
  readonly color?: string;
  readonly defaultOpen?: boolean;
  readonly destroyOnHidden?: boolean;
  readonly fresh?: boolean;
  readonly getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  readonly mouseEnterDelay?: number;
  readonly mouseLeaveDelay?: number;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly placement?: TooltipPlacement;
  readonly style?: CSSProperties;
  readonly styles?: TooltipStyles | ((info: { readonly props: TooltipProps }) => TooltipStyles);
  readonly title: ReactNode | (() => ReactNode);
  readonly trigger?: TooltipTrigger | ReadonlyArray<TooltipTrigger>;
  readonly zIndex?: number;
}

interface PlacementConfig {
  readonly align: "center" | "end" | "start";
  readonly side: "bottom" | "left" | "right" | "top";
}

type TriggerElementProps = {
  readonly onBlur?: FocusEventHandler<HTMLElement>;
  readonly onClick?: MouseEventHandler<HTMLElement>;
  readonly onContextMenu?: MouseEventHandler<HTMLElement>;
  readonly onFocus?: FocusEventHandler<HTMLElement>;
  readonly onKeyDown?: KeyboardEventHandler<HTMLElement>;
  readonly onPointerEnter?: PointerEventHandler<HTMLElement>;
  readonly onPointerLeave?: PointerEventHandler<HTMLElement>;
  readonly ref?: Ref<HTMLElement>;
};

const placementConfig: Record<TooltipPlacement, PlacementConfig> = {
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

const presetColors: Record<string, string> = {
  blue: "#1677ff",
  cyan: "#13c2c2",
  geekblue: "#2f54eb",
  gold: "#faad14",
  green: "#52c41a",
  lime: "#a0d911",
  magenta: "#eb2f96",
  orange: "#fa8c16",
  pink: "#eb2f96",
  purple: "#722ed1",
  red: "#f5222d",
  volcano: "#fa541c",
  yellow: "#fadb14",
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref !== null && ref !== undefined) ref.current = value;
}

function resolveTitle(title: TooltipProps["title"]) {
  return typeof title === "function" ? title() : title;
}

function textColorFor(background: string) {
  const hex = background.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (!hex) return "#fff";
  const normalized = hex.length === 3 ? [...hex].map((part) => `${part}${part}`).join("") : hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000;
  return luminance > 0.68 ? "rgba(0, 0, 0, 0.88)" : "#fff";
}

export function Tooltip(tooltipProps: TooltipProps) {
  const {
    arrow = true,
    autoAdjustOverflow = true,
    children,
    className,
    classNames: classNamesProp,
    color,
    defaultOpen = false,
    destroyOnHidden = false,
    fresh = false,
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
  } = tooltipProps;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [hasOpened, setHasOpened] = useState(defaultOpen || controlledOpen === true);
  const [triggerNode, setTriggerNode] = useState<HTMLElement | null>(null);
  const activeTrigger = useRef<TooltipTrigger | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cachedTitle = useRef<ReactNode>(undefined);
  const open = controlledOpen ?? internalOpen;
  const triggers = useMemo(() => {
    const triggerList = Array.isArray(trigger) ? trigger : [trigger];
    const modes = new Set<TooltipTrigger>(triggerList);
    if (modes.has("hover")) modes.add("focus");
    return modes;
  }, [trigger]);
  const childProps = children.props as TriggerElementProps;
  const resolvedPlacement = placementConfig[placement];
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: tooltipProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: tooltipProps }) : (stylesProp ?? {});
  const popupContainer =
    triggerNode !== null && getPopupContainer !== undefined
      ? getPopupContainer(triggerNode)
      : undefined;
  const currentTitle = resolveTitle(title);
  const disabled = currentTitle === null || currentTitle === undefined || currentTitle === "";
  if (fresh || open || cachedTitle.current === undefined) cachedTitle.current = currentTitle;

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
    (nextOpen: boolean, source?: TooltipTrigger) => {
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
  useEffect(() => {
    if (!open || (activeTrigger.current !== "click" && activeTrigger.current !== "contextMenu")) {
      return;
    }
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerNode?.contains(target) || contentRef.current?.contains(target)) return;
      updateOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside, true);
    return () => document.removeEventListener("pointerdown", closeOutside, true);
  }, [open, triggerNode, updateOpen]);

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
      onBlur(event) {
        childProps.onBlur?.(event);
        if (!event.defaultPrevented && triggers.has("focus")) scheduleClose("focus");
      },
      onClick(event) {
        childProps.onClick?.(event);
        if (event.defaultPrevented || !triggers.has("click")) return;
        updateOpen(!(open && activeTrigger.current === "click"), "click");
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
      onKeyDown(event) {
        childProps.onKeyDown?.(event);
        if (!event.defaultPrevented && event.key === "Escape" && open) updateOpen(false);
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

  if (disabled) return children;

  const resolvedColor = color === undefined ? undefined : (presetColors[color] ?? color);
  const containerStyle = {
    ...(resolvedColor === undefined
      ? {}
      : {
          "--launch-ui-tooltip-bg": resolvedColor,
          "--launch-ui-tooltip-text": textColorFor(resolvedColor),
        }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...resolvedStyles.container,
    ...style,
  } as CSSProperties;
  return (
    <TooltipPrimitive.Root delayDuration={0} open={open}>
      <TooltipPrimitive.Trigger asChild>{triggerElement}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal
        container={popupContainer}
        {...(!destroyOnHidden && hasOpened ? { forceMount: true as const } : {})}
      >
        <TooltipPrimitive.Content
          align={
            arrow !== false && typeof arrow === "object" && arrow.pointAtCenter
              ? "center"
              : resolvedPlacement.align
          }
          avoidCollisions={autoAdjustOverflow}
          className={classes("launch-ui-tooltip", resolvedClassNames.container, className)}
          collisionPadding={8}
          ref={contentRef}
          side={resolvedPlacement.side}
          sideOffset={6}
          style={containerStyle}
        >
          {cachedTitle.current}
          {arrow !== false ? (
            <TooltipPrimitive.Arrow
              className={classes("launch-ui-tooltip-arrow", resolvedClassNames.arrow)}
              style={resolvedStyles.arrow}
            />
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

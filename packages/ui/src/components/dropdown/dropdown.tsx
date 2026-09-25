import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
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
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { classes } from "../internal/classes.js";
import { CheckIcon } from "../internal/icons.js";

export type DropdownPlacement =
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

export type DropdownTrigger = "click" | "contextMenu" | "hover";
export type DropdownSemanticName = "item" | "itemContent" | "itemIcon" | "itemTitle" | "root";
export type DropdownClassNames = Partial<Record<DropdownSemanticName, string>>;
export type DropdownStyles = Partial<Record<DropdownSemanticName, CSSProperties>>;

export interface DropdownMenuClickInfo {
  readonly domEvent: Event;
  readonly key: string;
  readonly keyPath: ReadonlyArray<string>;
}

interface DropdownMenuItemBase {
  readonly key: string;
}

export interface DropdownMenuDividerItem {
  readonly key?: string;
  readonly type: "divider";
}

export interface DropdownMenuGroupItem extends DropdownMenuItemBase {
  readonly children: ReadonlyArray<DropdownMenuItem>;
  readonly label: ReactNode;
  readonly type: "group";
}

export interface DropdownMenuActionItem extends DropdownMenuItemBase {
  readonly children?: ReadonlyArray<DropdownMenuItem>;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly extra?: ReactNode;
  readonly icon?: ReactNode;
  readonly label: ReactNode;
  readonly onClick?: (info: DropdownMenuClickInfo) => void;
  readonly type?: "item";
}

export type DropdownMenuItem =
  | DropdownMenuActionItem
  | DropdownMenuDividerItem
  | DropdownMenuGroupItem;

export interface DropdownMenuConfig {
  readonly defaultSelectedKeys?: ReadonlyArray<string>;
  readonly items: ReadonlyArray<DropdownMenuItem>;
  readonly onClick?: (info: DropdownMenuClickInfo) => void;
  readonly onDeselect?: (info: DropdownMenuClickInfo) => void;
  readonly onSelect?: (info: DropdownMenuClickInfo) => void;
  readonly selectable?: boolean;
  readonly selectedKeys?: ReadonlyArray<string>;
}

export interface DropdownProps {
  readonly arrow?: boolean | { readonly pointAtCenter?: boolean };
  readonly autoAdjustOverflow?: boolean;
  readonly children: ReactElement;
  readonly classNames?:
    | DropdownClassNames
    | ((info: { readonly props: DropdownProps }) => DropdownClassNames);
  readonly destroyOnHidden?: boolean;
  readonly disabled?: boolean;
  readonly getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  readonly menu: DropdownMenuConfig;
  readonly onOpenChange?: (open: boolean, info: { readonly source: "menu" | "trigger" }) => void;
  readonly open?: boolean;
  readonly placement?: DropdownPlacement;
  readonly popupRender?: (menu: ReactNode) => ReactNode;
  readonly styles?: DropdownStyles | ((info: { readonly props: DropdownProps }) => DropdownStyles);
  readonly trigger?: ReadonlyArray<DropdownTrigger>;
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
  readonly onPointerDown?: PointerEventHandler<HTMLElement>;
  readonly onPointerEnter?: PointerEventHandler<HTMLElement>;
  readonly onPointerLeave?: PointerEventHandler<HTMLElement>;
  readonly ref?: Ref<HTMLElement>;
};

const placementConfig: Record<DropdownPlacement, PlacementConfig> = {
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
  if (typeof ref === "function") {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-dropdown-submenu-icon" viewBox="0 0 16 16">
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}

export function Dropdown(dropdownProps: DropdownProps) {
  const {
    arrow = false,
    autoAdjustOverflow = true,
    children,
    classNames: classNamesProp,
    destroyOnHidden = false,
    disabled = false,
    getPopupContainer,
    menu,
    onOpenChange,
    open: controlledOpen,
    placement = "bottomLeft",
    popupRender,
    styles: stylesProp,
    trigger = ["hover"],
  } = dropdownProps;
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<ReadonlyArray<string>>(
    menu.defaultSelectedKeys ?? [],
  );
  const [triggerNode, setTriggerNode] = useState<HTMLElement | null>(null);
  const [contextPoint, setContextPoint] = useState<{ readonly x: number; readonly y: number }>();
  const [activeTrigger, setActiveTrigger] = useState<DropdownTrigger>(trigger[0] ?? "hover");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const interactionSource = useRef<"click" | "contextMenu" | "hover" | "menu" | undefined>(
    undefined,
  );
  const open = controlledOpen ?? internalOpen;
  const selectedKeys = menu.selectedKeys ?? internalSelectedKeys;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: dropdownProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: dropdownProps }) : (stylesProp ?? {});
  const resolvedPlacement = placementConfig[placement];
  const triggerModes = useMemo(() => new Set(trigger), [trigger]);
  const childProps = children.props as TriggerElementProps;
  const isContextTrigger = activeTrigger === "contextMenu" && contextPoint !== undefined;
  const popupContainer =
    triggerNode !== null && getPopupContainer !== undefined
      ? getPopupContainer(triggerNode)
      : undefined;

  const updateOpen = useCallback(
    (nextOpen: boolean, source: "menu" | "trigger") => {
      if (controlledOpen === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen, { source });
    },
    [controlledOpen, onOpenChange],
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== undefined) {
      clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  const openFromHover = useCallback(() => {
    if (disabled || !triggerModes.has("hover")) return;
    clearCloseTimer();
    interactionSource.current = "hover";
    setActiveTrigger("hover");
    updateOpen(true, "trigger");
  }, [clearCloseTimer, disabled, triggerModes, updateOpen]);

  const closeFromHover = useCallback(() => {
    if (!triggerModes.has("hover")) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      interactionSource.current = "hover";
      updateOpen(false, "trigger");
    }, 120);
  }, [clearCloseTimer, triggerModes, updateOpen]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

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
      "aria-disabled": disabled || undefined,
      onBlur(event) {
        childProps.onBlur?.(event);
      },
      onClick(event) {
        childProps.onClick?.(event);
        if (!event.defaultPrevented) interactionSource.current = "click";
      },
      onContextMenu(event) {
        childProps.onContextMenu?.(event);
        if (event.defaultPrevented || disabled || !triggerModes.has("contextMenu")) return;
        event.preventDefault();
        clearCloseTimer();
        interactionSource.current = "contextMenu";
        setContextPoint({ x: event.clientX, y: event.clientY });
        setActiveTrigger("contextMenu");
        updateOpen(true, "trigger");
      },
      onFocus(event) {
        childProps.onFocus?.(event);
        if (!event.defaultPrevented) openFromHover();
      },
      onPointerDown(event) {
        childProps.onPointerDown?.(event);
        if (!event.defaultPrevented) interactionSource.current = "click";
      },
      onPointerEnter(event) {
        childProps.onPointerEnter?.(event);
        if (!event.defaultPrevented) openFromHover();
      },
      onPointerLeave(event) {
        childProps.onPointerLeave?.(event);
        if (!event.defaultPrevented) closeFromHover();
      },
      ref: setMergedTriggerRef,
    } as TriggerElementProps,
  );

  const handleOpenChange = (nextOpen: boolean) => {
    const interaction = interactionSource.current;
    interactionSource.current = undefined;

    if (interaction === "click" && !triggerModes.has("click")) return;
    if (nextOpen) {
      setActiveTrigger("click");
    }
    updateOpen(nextOpen, interaction === "menu" ? "menu" : "trigger");
  };

  const handleItemSelect = (
    item: DropdownMenuActionItem,
    keyPath: ReadonlyArray<string>,
    event: Event,
  ) => {
    interactionSource.current = "menu";
    const info: DropdownMenuClickInfo = { domEvent: event, key: item.key, keyPath };
    item.onClick?.(info);
    menu.onClick?.(info);

    if (menu.selectable) {
      const wasSelected = selectedKeys.includes(item.key);
      if (!wasSelected) {
        if (menu.selectedKeys === undefined) setInternalSelectedKeys([item.key]);
        menu.onSelect?.(info);
      } else {
        menu.onDeselect?.(info);
      }
    }
  };

  const renderItemContent = (item: DropdownMenuActionItem) => (
    <>
      {menu.selectable ? (
        <DropdownPrimitive.ItemIndicator className="launch-ui-dropdown-check">
          <CheckIcon />
        </DropdownPrimitive.ItemIndicator>
      ) : null}
      <span
        className={classes("launch-ui-dropdown-item-content", resolvedClassNames.itemContent)}
        style={resolvedStyles.itemContent}
      >
        {item.icon !== undefined ? (
          <span
            className={classes("launch-ui-dropdown-item-icon", resolvedClassNames.itemIcon)}
            style={resolvedStyles.itemIcon}
          >
            {item.icon}
          </span>
        ) : null}
        <span
          className={classes("launch-ui-dropdown-item-title", resolvedClassNames.itemTitle)}
          style={resolvedStyles.itemTitle}
        >
          {item.label}
        </span>
      </span>
      {item.extra !== undefined ? (
        <span className="launch-ui-dropdown-item-extra">{item.extra}</span>
      ) : null}
    </>
  );

  const renderItems = (
    items: ReadonlyArray<DropdownMenuItem>,
    parentPath: ReadonlyArray<string> = [],
  ): ReactNode =>
    items.map((item, index) => {
      if (item.type === "divider") {
        return (
          <DropdownPrimitive.Separator
            className="launch-ui-dropdown-separator"
            key={item.key ?? `divider-${index}`}
          />
        );
      }

      const keyPath = [item.key, ...parentPath];
      if (item.type === "group") {
        return (
          <DropdownPrimitive.Group key={item.key}>
            <DropdownPrimitive.Label className="launch-ui-dropdown-group-label">
              {item.label}
            </DropdownPrimitive.Label>
            {renderItems(item.children, keyPath)}
          </DropdownPrimitive.Group>
        );
      }

      const itemClassName = classes(
        "launch-ui-dropdown-item",
        item.danger && "is-danger",
        menu.selectable && "is-selectable",
        resolvedClassNames.item,
      );
      const itemStyle = resolvedStyles.item;

      if (item.children !== undefined && item.children.length > 0) {
        return (
          <DropdownPrimitive.Sub key={item.key}>
            <DropdownPrimitive.SubTrigger
              className={itemClassName}
              {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
              style={itemStyle}
            >
              {renderItemContent(item)}
              <ChevronRightIcon />
            </DropdownPrimitive.SubTrigger>
            <DropdownPrimitive.Portal container={popupContainer}>
              <DropdownPrimitive.SubContent
                avoidCollisions={autoAdjustOverflow}
                className={classes(
                  "launch-ui-dropdown-content",
                  "launch-ui-dropdown-subcontent",
                  resolvedClassNames.root,
                )}
                collisionPadding={8}
                data-launch-ui-popup="dropdown"
                onClick={(event) => event.stopPropagation()}
                onPointerEnter={clearCloseTimer}
                onPointerLeave={closeFromHover}
                sideOffset={4}
                style={resolvedStyles.root}
              >
                {renderItems(item.children, keyPath)}
              </DropdownPrimitive.SubContent>
            </DropdownPrimitive.Portal>
          </DropdownPrimitive.Sub>
        );
      }

      if (menu.selectable) {
        return (
          <DropdownPrimitive.CheckboxItem
            checked={selectedKeys.includes(item.key)}
            className={itemClassName}
            {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
            key={item.key}
            onSelect={(event) => handleItemSelect(item, keyPath, event)}
            style={itemStyle}
          >
            {renderItemContent(item)}
          </DropdownPrimitive.CheckboxItem>
        );
      }

      return (
        <DropdownPrimitive.Item
          className={itemClassName}
          {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
          key={item.key}
          onSelect={(event) => handleItemSelect(item, keyPath, event)}
          style={itemStyle}
        >
          {renderItemContent(item)}
        </DropdownPrimitive.Item>
      );
    });

  const menuNode = <div className="launch-ui-dropdown-menu">{renderItems(menu.items)}</div>;
  const popup = popupRender?.(menuNode) ?? menuNode;
  const arrowVisible = arrow !== false;
  const portalTarget =
    popupContainer ?? (typeof document === "undefined" ? undefined : document.body);

  return (
    <DropdownPrimitive.Root modal={false} onOpenChange={handleOpenChange} open={open}>
      {isContextTrigger ? (
        triggerElement
      ) : (
        <DropdownPrimitive.Trigger asChild disabled={disabled}>
          {triggerElement}
        </DropdownPrimitive.Trigger>
      )}
      {isContextTrigger && portalTarget !== undefined
        ? createPortal(
            <DropdownPrimitive.Trigger asChild>
              <span
                aria-hidden="true"
                className="launch-ui-dropdown-context-anchor"
                style={{ left: contextPoint.x, top: contextPoint.y }}
                tabIndex={-1}
              />
            </DropdownPrimitive.Trigger>,
            portalTarget,
          )
        : null}
      <DropdownPrimitive.Portal
        container={popupContainer}
        {...(destroyOnHidden ? {} : { forceMount: true as const })}
      >
        <DropdownPrimitive.Content
          align={resolvedPlacement.align}
          avoidCollisions={autoAdjustOverflow}
          className={classes("launch-ui-dropdown-content", resolvedClassNames.root)}
          data-launch-ui-popup="dropdown"
          onClick={(event) => event.stopPropagation()}
          collisionPadding={8}
          onAnimationEnd={(event) => {
            if (
              event.currentTarget !== event.target ||
              event.currentTarget.getAttribute("data-state") !== "closed" ||
              activeTrigger !== "contextMenu"
            ) {
              return;
            }
            setContextPoint(undefined);
            setActiveTrigger(trigger[0] ?? "hover");
          }}
          onPointerEnter={clearCloseTimer}
          onPointerLeave={closeFromHover}
          onPointerDownOutside={(event) => {
            const target = event.detail.originalEvent.target;
            if (target instanceof Node && triggerNode?.contains(target)) event.preventDefault();
          }}
          side={resolvedPlacement.side}
          sideOffset={6}
          style={resolvedStyles.root}
        >
          {popup}
          {arrowVisible ? <DropdownPrimitive.Arrow className="launch-ui-dropdown-arrow" /> : null}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

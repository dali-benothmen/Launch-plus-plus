import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { CloseIcon } from "../internal/icons.js";

export type TabsPlacement = "bottom" | "end" | "start" | "top";
export type TabsSize = "large" | "medium" | "small";
export type TabsType = "card" | "editable-card" | "line";
export type TabsIndicatorAlign = "center" | "end" | "start";
export type TabsSemanticName = "body" | "content" | "header" | "indicator" | "item" | "root";
export type TabsClassNames = Partial<Record<TabsSemanticName, string>>;
export type TabsStyles = Partial<Record<TabsSemanticName, CSSProperties>>;

export interface TabsIndicatorConfig {
  readonly align?: TabsIndicatorAlign;
  readonly size?: number | ((origin: number) => number);
}

export interface TabsAnimatedConfig {
  readonly inkBar?: boolean;
  readonly tabPane?: boolean;
}

export interface TabsExtraContent {
  readonly left?: ReactNode;
  readonly right?: ReactNode;
}

export interface TabItem {
  /** Ant-style content property. */
  readonly children?: ReactNode;
  readonly closable?: boolean;
  readonly closeIcon?: ReactNode | false | null;
  /** Compatibility alias for children. */
  readonly content?: ReactNode;
  readonly destroyOnHidden?: boolean;
  readonly disabled?: boolean;
  readonly forceRender?: boolean;
  readonly icon?: ReactNode;
  /** Ant-style tab identifier. */
  readonly key?: string;
  readonly label: ReactNode;
  readonly style?: CSSProperties;
  /** Compatibility alias for key. */
  readonly value?: string;
}

export type TabsEditTarget = ReactMouseEvent<HTMLButtonElement> | string;

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  readonly activeKey?: string;
  readonly addIcon?: ReactNode;
  readonly animated?: boolean | TabsAnimatedConfig;
  readonly ariaLabel?: string;
  readonly centered?: boolean;
  readonly classNames?: TabsClassNames | ((info: { readonly props: TabsProps }) => TabsClassNames);
  readonly defaultActiveKey?: string;
  /** Compatibility alias for defaultActiveKey. */
  readonly defaultValue?: string;
  readonly destroyOnHidden?: boolean;
  readonly hideAdd?: boolean;
  readonly indicator?: TabsIndicatorConfig;
  readonly items?: ReadonlyArray<TabItem>;
  readonly onChange?: (activeKey: string) => void;
  readonly onEdit?: (targetKey: TabsEditTarget, action: "add" | "remove") => void;
  readonly onTabClick?: (key: string, event: ReactMouseEvent<HTMLButtonElement>) => void;
  readonly onTabScroll?: (info: {
    readonly direction: "bottom" | "left" | "right" | "top";
  }) => void;
  /** Compatibility alias for onChange. */
  readonly onValueChange?: (value: string) => void;
  readonly removeIcon?: ReactNode;
  readonly size?: TabsSize;
  readonly styles?: TabsStyles | ((info: { readonly props: TabsProps }) => TabsStyles);
  readonly tabBarExtraContent?: ReactNode | TabsExtraContent;
  readonly tabBarGutter?: number;
  readonly tabBarStyle?: CSSProperties;
  readonly tabPlacement?: TabsPlacement;
  readonly type?: TabsType;
  /** Compatibility alias for activeKey. */
  readonly value?: string;
}

interface ResolvedTabItem extends TabItem {
  readonly resolvedContent: ReactNode;
  readonly resolvedKey: string;
}

function AddIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-control-icon" viewBox="0 0 16 16">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function TabIndicator({
  config,
  placement,
  style,
  trigger,
}: {
  readonly config?: TabsIndicatorConfig | undefined;
  readonly placement: TabsPlacement;
  readonly style?: CSSProperties | undefined;
  readonly trigger: HTMLButtonElement | null;
}) {
  const vertical = placement === "start" || placement === "end";
  const [length, setLength] = useState<number>();
  const requestedSize = config?.size;

  useLayoutEffect(() => {
    if (trigger === null || requestedSize === undefined) {
      setLength(undefined);
      return;
    }

    const update = () => {
      const origin = vertical ? trigger.offsetHeight : trigger.offsetWidth;
      const requested = typeof requestedSize === "function" ? requestedSize(origin) : requestedSize;
      setLength(Math.max(0, Math.min(origin, requested)));
    };

    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [requestedSize, trigger, vertical]);

  const align = config?.align ?? "center";
  const indicatorStyle: CSSProperties = { ...style };
  if (length !== undefined) {
    if (vertical) indicatorStyle.height = length;
    else indicatorStyle.width = length;
    if (align === "start") {
      if (vertical) {
        indicatorStyle.top = 0;
        indicatorStyle.bottom = "auto";
      } else {
        indicatorStyle.left = 0;
        indicatorStyle.right = "auto";
      }
    } else if (align === "end") {
      if (vertical) {
        indicatorStyle.top = "auto";
        indicatorStyle.bottom = 0;
      } else {
        indicatorStyle.right = 0;
        indicatorStyle.left = "auto";
      }
    } else if (vertical) {
      indicatorStyle.top = "50%";
      indicatorStyle.bottom = "auto";
      indicatorStyle.transform = "translateY(-50%)";
    } else {
      indicatorStyle.left = "50%";
      indicatorStyle.right = "auto";
      indicatorStyle.transform = "translateX(-50%)";
    }
  }

  return <span aria-hidden="true" className="launch-ui-tabs-indicator" style={indicatorStyle} />;
}

function TabTrigger({
  className,
  indicator,
  indicatorStyle,
  item,
  onEdit,
  onTabClick,
  placement,
  removeIcon,
  style,
  type,
}: {
  readonly className?: string | undefined;
  readonly indicator?: TabsIndicatorConfig | undefined;
  readonly indicatorStyle?: CSSProperties | undefined;
  readonly item: ResolvedTabItem;
  readonly onEdit?: TabsProps["onEdit"] | undefined;
  readonly onTabClick?: TabsProps["onTabClick"] | undefined;
  readonly placement: TabsPlacement;
  readonly removeIcon?: ReactNode | undefined;
  readonly style?: CSSProperties | undefined;
  readonly type: TabsType;
}) {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const closeIcon = item.closeIcon === undefined ? removeIcon : item.closeIcon;
  const showRemove =
    type === "editable-card" &&
    item.closable !== false &&
    closeIcon !== false &&
    closeIcon !== null;

  return (
    <div className="launch-ui-tab-shell">
      <TabsPrimitive.Trigger
        className={classes("launch-ui-tab", className)}
        disabled={item.disabled}
        onClick={(event) => onTabClick?.(item.resolvedKey, event)}
        ref={setTrigger}
        style={style}
        value={item.resolvedKey}
      >
        {item.icon !== undefined ? <span className="launch-ui-tab-icon">{item.icon}</span> : null}
        <span className="launch-ui-tab-label">{item.label}</span>
        {type === "line" ? (
          <TabIndicator
            config={indicator}
            placement={placement}
            style={indicatorStyle}
            trigger={trigger}
          />
        ) : null}
      </TabsPrimitive.Trigger>
      {showRemove ? (
        <button
          aria-label={`Close ${typeof item.label === "string" ? item.label : "tab"}`}
          className="launch-ui-tab-remove"
          disabled={item.disabled}
          onClick={(event) => {
            event.stopPropagation();
            onEdit?.(item.resolvedKey, "remove");
          }}
          type="button"
        >
          {closeIcon ?? <CloseIcon />}
        </button>
      ) : null}
    </div>
  );
}

export function Tabs(tabsProps: TabsProps) {
  const {
    activeKey,
    addIcon,
    animated = { inkBar: true, tabPane: false },
    ariaLabel = "Tabs",
    centered = false,
    className,
    classNames: classNamesProp,
    defaultActiveKey,
    defaultValue,
    destroyOnHidden = false,
    dir,
    hideAdd = false,
    indicator,
    items = [],
    onChange,
    onEdit,
    onTabClick,
    onTabScroll,
    onValueChange,
    removeIcon,
    size = "medium",
    style,
    styles: stylesProp,
    tabBarExtraContent,
    tabBarGutter,
    tabBarStyle,
    tabPlacement = "top",
    type = "line",
    value,
    ...rootProps
  } = tabsProps;
  const previousScroll = useRef({ left: 0, top: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const resolvedItems: ReadonlyArray<ResolvedTabItem> = items.map((item, index) => ({
    ...item,
    resolvedContent: item.children ?? item.content,
    resolvedKey: item.key ?? item.value ?? String(index),
  }));
  const firstEnabledKey = resolvedItems.find((item) => !item.disabled)?.resolvedKey;
  const initialKey = defaultActiveKey ?? defaultValue ?? firstEnabledKey ?? "";
  const controlledKey = activeKey ?? value;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: tabsProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: tabsProps }) : (stylesProp ?? {});
  const animatedConfig = typeof animated === "object" ? animated : undefined;
  const animateIndicator =
    animated !== false && (animated === true || animatedConfig?.inkBar !== false);
  const animatePane = animated === true || animatedConfig?.tabPane === true;
  const resolvedPlacement =
    isMobile && (tabPlacement === "start" || tabPlacement === "end") ? "top" : tabPlacement;
  const vertical = resolvedPlacement === "start" || resolvedPlacement === "end";
  const extra: TabsExtraContent =
    tabBarExtraContent !== null &&
    typeof tabBarExtraContent === "object" &&
    !Array.isArray(tabBarExtraContent) &&
    ("left" in tabBarExtraContent || "right" in tabBarExtraContent)
      ? (tabBarExtraContent as TabsExtraContent)
      : { right: tabBarExtraContent as ReactNode };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 575px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const handleValueChange = (nextKey: string) => {
    onChange?.(nextKey);
    onValueChange?.(nextKey);
  };

  return (
    <TabsPrimitive.Root
      {...rootProps}
      {...(controlledKey === undefined ? { defaultValue: initialKey } : { value: controlledKey })}
      {...(dir === "ltr" || dir === "rtl" ? { dir } : {})}
      className={classes(
        "launch-ui-tabs",
        `is-${type}`,
        `is-${size}`,
        `is-placement-${resolvedPlacement}`,
        centered && "is-centered",
        !animateIndicator && "has-static-indicator",
        animatePane && "has-pane-animation",
        resolvedClassNames.root,
        className,
      )}
      onValueChange={handleValueChange}
      orientation={vertical ? "vertical" : "horizontal"}
      style={{ ...resolvedStyles.root, ...style }}
    >
      <div
        className={classes("launch-ui-tabs-header", resolvedClassNames.header)}
        style={{ ...tabBarStyle, ...resolvedStyles.header }}
      >
        {extra.left !== undefined ? (
          <div className="launch-ui-tabs-extra is-left">{extra.left}</div>
        ) : null}
        <div
          className="launch-ui-tabs-nav-viewport"
          onScroll={(event) => {
            const { scrollLeft, scrollTop } = event.currentTarget;
            const previous = previousScroll.current;
            const horizontalDelta = scrollLeft - previous.left;
            const verticalDelta = scrollTop - previous.top;
            previousScroll.current = { left: scrollLeft, top: scrollTop };
            if (Math.abs(horizontalDelta) >= Math.abs(verticalDelta) && horizontalDelta !== 0) {
              onTabScroll?.({ direction: horizontalDelta > 0 ? "right" : "left" });
            } else if (verticalDelta !== 0) {
              onTabScroll?.({ direction: verticalDelta > 0 ? "bottom" : "top" });
            }
          }}
        >
          <TabsPrimitive.List
            aria-label={ariaLabel}
            className="launch-ui-tabs-list"
            style={
              tabBarGutter === undefined
                ? undefined
                : ({ "--launch-ui-tabs-gutter": `${tabBarGutter}px` } as CSSProperties)
            }
          >
            {resolvedItems.map((item) => (
              <TabTrigger
                className={resolvedClassNames.item}
                indicator={indicator}
                indicatorStyle={resolvedStyles.indicator}
                item={item}
                key={item.resolvedKey}
                onEdit={onEdit}
                onTabClick={onTabClick}
                placement={resolvedPlacement}
                removeIcon={removeIcon}
                style={resolvedStyles.item}
                type={type}
              />
            ))}
          </TabsPrimitive.List>
          {type === "editable-card" && !hideAdd ? (
            <button
              aria-label="Add tab"
              className="launch-ui-tabs-add"
              onClick={(event) => onEdit?.(event, "add")}
              type="button"
            >
              {addIcon ?? <AddIcon />}
            </button>
          ) : null}
        </div>
        {extra.right !== undefined ? (
          <div className="launch-ui-tabs-extra is-right">{extra.right}</div>
        ) : null}
      </div>
      <div
        className={classes("launch-ui-tabs-body", resolvedClassNames.body)}
        style={resolvedStyles.body}
      >
        {resolvedItems.map((item) => {
          const shouldPreserve = item.forceRender || !(item.destroyOnHidden ?? destroyOnHidden);
          return (
            <TabsPrimitive.Content
              className={classes("launch-ui-tab-content", resolvedClassNames.content)}
              {...(shouldPreserve ? { forceMount: true } : {})}
              key={item.resolvedKey}
              style={{ ...item.style, ...resolvedStyles.content }}
              value={item.resolvedKey}
            >
              {item.resolvedContent}
            </TabsPrimitive.Content>
          );
        })}
      </div>
    </TabsPrimitive.Root>
  );
}

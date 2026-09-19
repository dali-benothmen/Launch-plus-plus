import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { classes } from "../internal/classes.js";
import { LoadingIcon } from "../internal/icons.js";

export type TimelineMode = "alternate" | "end" | "start";
export type TimelineOrientation = "horizontal" | "vertical";
export type TimelineVariant = "filled" | "outlined";
export type TimelineSemanticName =
  | "item"
  | "itemContent"
  | "itemIcon"
  | "itemRail"
  | "itemTitle"
  | "root";
export type TimelineClassNames = Partial<Record<TimelineSemanticName, string>>;
export type TimelineStyles = Partial<Record<TimelineSemanticName, CSSProperties>>;
export type TimelineItemSemanticName = "content" | "icon" | "rail" | "root" | "title";
export type TimelineItemClassNames = Partial<Record<TimelineItemSemanticName, string>>;
export type TimelineItemStyles = Partial<Record<TimelineItemSemanticName, CSSProperties>>;

export interface TimelineItem {
  readonly className?: string;
  readonly classNames?: TimelineItemClassNames;
  readonly color?: string;
  readonly content?: ReactNode;
  readonly icon?: ReactNode;
  readonly key?: number | string;
  readonly loading?: boolean;
  readonly placement?: "end" | "start";
  readonly style?: CSSProperties;
  readonly styles?: TimelineItemStyles;
  readonly title?: ReactNode;
}

export interface TimelineProps extends Omit<HTMLAttributes<HTMLUListElement>, "children"> {
  readonly classNames?:
    | TimelineClassNames
    | ((info: { readonly props: TimelineProps }) => TimelineClassNames);
  readonly items?: ReadonlyArray<TimelineItem>;
  readonly mode?: TimelineMode;
  readonly orientation?: TimelineOrientation;
  readonly reverse?: boolean;
  readonly styles?: TimelineStyles | ((info: { readonly props: TimelineProps }) => TimelineStyles);
  readonly titleSpan?: number | string;
  readonly variant?: TimelineVariant;
}

const presetColors = new Set(["blue", "gray", "green", "red"]);

function resolvePlacement(mode: TimelineMode, item: TimelineItem, index: number) {
  if (item.placement !== undefined) return item.placement;
  if (mode === "alternate") return index % 2 === 0 ? "end" : "start";
  return mode === "start" ? "end" : "start";
}

function resolveTitleSpan(value: number | string) {
  return typeof value === "number" ? `${Math.max(0, value)}px` : value;
}

export function Timeline(timelineProps: TimelineProps) {
  const {
    className,
    classNames: classNamesProp,
    items = [],
    mode = "start",
    orientation = "vertical",
    reverse = false,
    style,
    styles: stylesProp,
    titleSpan = 12,
    variant = "outlined",
    ...rootProps
  } = timelineProps;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: timelineProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: timelineProps }) : (stylesProp ?? {});
  const displayedItems = reverse ? [...items].reverse() : items;
  const hasCustomPlacement = displayedItems.some((item) => item.placement !== undefined);
  const rootStyle = {
    "--launch-ui-timeline-title-span": resolveTitleSpan(titleSpan),
    ...resolvedStyles.root,
    ...style,
  } as CSSProperties;

  return (
    <ul
      {...rootProps}
      className={classes(
        "launch-ui-timeline",
        `is-${orientation}`,
        `is-mode-${mode}`,
        `is-${variant}`,
        hasCustomPlacement && "has-custom-placement",
        resolvedClassNames.root,
        className,
      )}
      style={rootStyle}
    >
      {displayedItems.map((item, index) => {
        const placement = resolvePlacement(mode, item, index);
        const color = item.color ?? "blue";
        const customColor = !presetColors.has(color);
        const itemStyle = {
          ...(customColor ? { "--launch-ui-timeline-color": color } : {}),
          ...resolvedStyles.item,
          ...item.styles?.root,
          ...item.style,
        } as CSSProperties;
        const itemKey =
          item.key ?? `${index}-${typeof item.content === "string" ? item.content : "item"}`;
        return (
          <li
            className={classes(
              "launch-ui-timeline-item",
              `is-placement-${placement}`,
              customColor ? "is-custom-color" : `is-${color}`,
              item.loading && "is-loading",
              item.icon !== undefined && "has-custom-icon",
              resolvedClassNames.item,
              item.classNames?.root,
              item.className,
            )}
            key={itemKey}
            style={itemStyle}
          >
            <div
              className={classes(
                "launch-ui-timeline-title",
                resolvedClassNames.itemTitle,
                item.classNames?.title,
              )}
              style={{ ...resolvedStyles.itemTitle, ...item.styles?.title }}
            >
              {item.title}
            </div>
            <div className="launch-ui-timeline-axis">
              <span
                aria-hidden="true"
                className={classes(
                  "launch-ui-timeline-rail",
                  resolvedClassNames.itemRail,
                  item.classNames?.rail,
                )}
                style={{ ...resolvedStyles.itemRail, ...item.styles?.rail }}
              />
              <span
                aria-hidden="true"
                className={classes(
                  "launch-ui-timeline-icon",
                  resolvedClassNames.itemIcon,
                  item.classNames?.icon,
                )}
                style={{ ...resolvedStyles.itemIcon, ...item.styles?.icon }}
              >
                {item.loading ? <LoadingIcon /> : item.icon}
              </span>
            </div>
            <div
              className={classes(
                "launch-ui-timeline-content",
                resolvedClassNames.itemContent,
                item.classNames?.content,
              )}
              style={{ ...resolvedStyles.itemContent, ...item.styles?.content }}
            >
              {item.content}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

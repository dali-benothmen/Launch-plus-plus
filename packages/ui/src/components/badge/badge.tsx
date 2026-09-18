import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { classes } from "../internal/classes.js";

export type BadgeSize = "medium" | "small";
export type BadgeStatus = "default" | "error" | "processing" | "success" | "warning";
export type BadgeSemanticName = "indicator" | "root";
export type BadgeClassNames = Partial<Record<BadgeSemanticName, string>>;
export type BadgeStyles = Partial<Record<BadgeSemanticName, CSSProperties>>;

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "title"> {
  readonly classNames?:
    | BadgeClassNames
    | ((info: { readonly props: BadgeProps }) => BadgeClassNames);
  readonly color?: string;
  readonly count?: ReactNode;
  readonly dot?: boolean;
  readonly offset?: readonly [number, number];
  readonly overflowCount?: number;
  readonly showZero?: boolean;
  readonly size?: BadgeSize;
  readonly status?: BadgeStatus;
  readonly styles?: BadgeStyles | ((info: { readonly props: BadgeProps }) => BadgeStyles);
  readonly text?: ReactNode;
  readonly title?: false | null | string;
}

export type BadgeRibbonPlacement = "end" | "start";
export type BadgeRibbonSemanticName = "content" | "indicator" | "root";
export type BadgeRibbonClassNames = Partial<Record<BadgeRibbonSemanticName, string>>;
export type BadgeRibbonStyles = Partial<Record<BadgeRibbonSemanticName, CSSProperties>>;

export interface BadgeRibbonProps extends HTMLAttributes<HTMLDivElement> {
  readonly classNames?:
    | BadgeRibbonClassNames
    | ((info: { readonly props: BadgeRibbonProps }) => BadgeRibbonClassNames);
  readonly color?: string;
  readonly placement?: BadgeRibbonPlacement;
  readonly styles?:
    | BadgeRibbonStyles
    | ((info: { readonly props: BadgeRibbonProps }) => BadgeRibbonStyles);
  readonly text?: ReactNode;
}

const presetColors = new Set([
  "blue",
  "cyan",
  "geekblue",
  "gold",
  "green",
  "lime",
  "magenta",
  "orange",
  "pink",
  "purple",
  "red",
  "volcano",
  "yellow",
]);

function colorClass(color: string | undefined) {
  return color && presetColors.has(color) ? `is-color-${color}` : undefined;
}

function colorStyle(color: string | undefined): CSSProperties {
  if (!color || presetColors.has(color)) return {};
  return { "--launch-ui-badge-color": color } as CSSProperties;
}

function displayCount(count: ReactNode, overflowCount: number) {
  return typeof count === "number" && count > overflowCount ? `${overflowCount}+` : count;
}

function BadgeRoot(badgeProps: BadgeProps) {
  const {
    children,
    className,
    classNames: classNamesProp,
    color,
    count,
    dot = false,
    offset,
    overflowCount = 99,
    showZero = false,
    size = "medium",
    status,
    style,
    styles: stylesProp,
    text,
    title,
    ...props
  } = badgeProps;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: badgeProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: badgeProps }) : (stylesProp ?? {});
  const isStatus = status !== undefined || text !== undefined;
  const resolvedStatus = status ?? "default";
  const isZero = count === 0 || count === "0";
  const visible = isStatus || (dot ? count !== 0 : count !== undefined && (!isZero || showZero));
  const displayedCount = displayCount(count, Math.max(0, overflowCount));
  const hasChildren = children !== undefined && children !== null;
  const customCount =
    !dot && typeof displayedCount !== "number" && typeof displayedCount !== "string";
  const nativeTitle =
    title === false || title === null
      ? undefined
      : (title ??
        (typeof count === "number" || typeof count === "string" ? String(count) : undefined));
  const indicatorStyle = {
    ...colorStyle(color),
    ...(offset ? { insetInlineEnd: -offset[0], top: offset[1] } : {}),
    ...resolvedStyles.indicator,
  };

  if (isStatus) {
    return (
      <span
        {...props}
        className={classes(
          "launch-ui-badge",
          "is-status",
          `is-status-${resolvedStatus}`,
          colorClass(color),
          resolvedClassNames.root,
          className,
        )}
        style={{ ...colorStyle(color), ...resolvedStyles.root, ...style }}
        title={nativeTitle}
      >
        <span
          aria-hidden="true"
          className={classes("launch-ui-badge-status-dot", resolvedClassNames.indicator)}
          style={indicatorStyle}
        />
        {text !== undefined ? <span className="launch-ui-badge-status-text">{text}</span> : null}
      </span>
    );
  }

  return (
    <span
      {...props}
      className={classes(
        "launch-ui-badge",
        hasChildren ? "has-children" : "is-standalone",
        !visible && "is-hidden",
        resolvedClassNames.root,
        className,
      )}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {children}
      {visible ? (
        <sup
          className={classes(
            "launch-ui-badge-indicator",
            dot ? "is-dot" : "is-count",
            `is-${size}`,
            customCount && "is-custom",
            colorClass(color),
            resolvedClassNames.indicator,
          )}
          key={String(displayedCount)}
          style={indicatorStyle}
          title={nativeTitle}
        >
          {dot ? null : displayedCount}
        </sup>
      ) : null}
    </span>
  );
}

function BadgeRibbon(ribbonProps: BadgeRibbonProps) {
  const {
    children,
    className,
    classNames: classNamesProp,
    color,
    placement = "end",
    style,
    styles: stylesProp,
    text,
    ...props
  } = ribbonProps;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: ribbonProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: ribbonProps }) : (stylesProp ?? {});

  return (
    <div
      {...props}
      className={classes(
        "launch-ui-badge-ribbon-wrapper",
        `is-${placement}`,
        resolvedClassNames.root,
        className,
      )}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {children}
      <div
        className={classes(
          "launch-ui-badge-ribbon",
          colorClass(color),
          resolvedClassNames.indicator,
        )}
        style={{ ...colorStyle(color), ...resolvedStyles.indicator }}
      >
        <span
          className={classes("launch-ui-badge-ribbon-content", resolvedClassNames.content)}
          style={resolvedStyles.content}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

export const Badge = Object.assign(BadgeRoot, { Ribbon: BadgeRibbon }) as typeof BadgeRoot & {
  readonly Ribbon: typeof BadgeRibbon;
};

import { forwardRef, type CSSProperties, type HTMLAttributes, useEffect, useState } from "react";
import { classes } from "../internal/classes.js";

export const gridBreakpoints = ["xs", "sm", "md", "lg", "xl", "xxl", "xxxl"] as const;

export type GridBreakpoint = (typeof gridBreakpoints)[number];
export type GridResponsiveValue<T> = Partial<Record<GridBreakpoint, T>>;
export type GridScreens = Record<GridBreakpoint, boolean>;

export type RowAlign = "bottom" | "middle" | "stretch" | "top";
export type RowJustify =
  | "center"
  | "end"
  | "space-around"
  | "space-between"
  | "space-evenly"
  | "start";
export type RowGutterValue = number | string;
export type RowGutterSetting = RowGutterValue | GridResponsiveValue<RowGutterValue>;
export type RowGutter = RowGutterSetting | readonly [RowGutterSetting, RowGutterSetting];

export interface RowProps extends HTMLAttributes<HTMLDivElement> {
  readonly align?: GridResponsiveValue<RowAlign> | RowAlign;
  readonly gutter?: RowGutter;
  readonly justify?: GridResponsiveValue<RowJustify> | RowJustify;
  readonly wrap?: boolean;
}

export interface ColSize {
  readonly flex?: number | string;
  readonly offset?: number;
  readonly order?: number;
  readonly pull?: number;
  readonly push?: number;
  readonly span?: number;
}

export type ColResponsiveSize = ColSize | number;

export interface ColProps extends HTMLAttributes<HTMLDivElement>, ColSize {
  readonly lg?: ColResponsiveSize;
  readonly md?: ColResponsiveSize;
  readonly sm?: ColResponsiveSize;
  readonly xl?: ColResponsiveSize;
  readonly xs?: ColResponsiveSize;
  readonly xxl?: ColResponsiveSize;
  readonly xxxl?: ColResponsiveSize;
}

type GridVariables = Record<string, number | string>;

const alignValues: Record<RowAlign, string> = {
  bottom: "flex-end",
  middle: "center",
  stretch: "stretch",
  top: "flex-start",
};

const justifyValues: Record<RowJustify, string> = {
  center: "center",
  end: "flex-end",
  "space-around": "space-around",
  "space-between": "space-between",
  "space-evenly": "space-evenly",
  start: "flex-start",
};

function isResponsiveValue<T>(value: T | GridResponsiveValue<T>): value is GridResponsiveValue<T> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyResponsiveValue<T>(
  variables: GridVariables,
  name: string,
  value: GridResponsiveValue<T> | T,
  fallback: T,
  transform: (item: T) => number | string,
) {
  const responsiveValue = isResponsiveValue(value) ? value : undefined;
  let currentValue = responsiveValue ? fallback : value;

  for (const breakpoint of gridBreakpoints) {
    const breakpointValue = responsiveValue?.[breakpoint];
    if (breakpointValue !== undefined) {
      currentValue = breakpointValue;
    }
    variables[`--launch-ui-${name}-${breakpoint}`] = transform(currentValue as T);
  }
}

function toCssLength(value: RowGutterValue) {
  return typeof value === "number" ? `${value}px` : value;
}

function normalizeSpan(value: number) {
  return Math.max(0, Math.min(24, value));
}

function toGridPercentage(value: number) {
  return `${(normalizeSpan(value) / 24) * 100}%`;
}

function toFlexValue(value: number | string) {
  if (typeof value === "number") {
    return `${value} ${value} auto`;
  }
  return /^\d+(?:\.\d+)?$/.test(value) ? `${value} 1 0` : value;
}

interface ResolvedColSize {
  readonly display: string;
  readonly flex: string;
  readonly offset: string;
  readonly order: number;
  readonly position: string;
  readonly width: string;
}

const defaultColSize: ResolvedColSize = {
  display: "block",
  flex: "0 0 auto",
  offset: "0%",
  order: 0,
  position: "0%",
  width: "100%",
};

function resolveColSize(current: ResolvedColSize, size: ColSize): ResolvedColSize {
  const resolved = { ...current };
  if (size.span !== undefined) {
    const width = toGridPercentage(size.span);
    resolved.flex = `0 0 ${width}`;
    resolved.width = width;
    resolved.display = normalizeSpan(size.span) === 0 ? "none" : "block";
  }
  if (size.flex !== undefined) {
    resolved.flex = toFlexValue(size.flex);
  }
  if (size.offset !== undefined) {
    resolved.offset = toGridPercentage(size.offset);
  }
  if (size.order !== undefined) {
    resolved.order = size.order;
  }
  if (size.pull !== undefined || size.push !== undefined) {
    const position = normalizeSpan(size.push ?? 0) - normalizeSpan(size.pull ?? 0);
    resolved.position = `${(position / 24) * 100}%`;
  }
  return resolved;
}

function applyResolvedColSize(
  variables: GridVariables,
  breakpoint: GridBreakpoint,
  size: ResolvedColSize,
) {
  variables[`--launch-ui-col-display-${breakpoint}`] = size.display;
  variables[`--launch-ui-col-flex-${breakpoint}`] = size.flex;
  variables[`--launch-ui-col-offset-${breakpoint}`] = size.offset;
  variables[`--launch-ui-col-order-${breakpoint}`] = size.order;
  variables[`--launch-ui-col-position-${breakpoint}`] = size.position;
  variables[`--launch-ui-col-width-${breakpoint}`] = size.width;
}

export const Row = forwardRef<HTMLDivElement, RowProps>(function Row(
  {
    align = "top",
    children,
    className,
    gutter = 0,
    justify = "start",
    style,
    wrap = true,
    ...props
  },
  ref,
) {
  const variables: GridVariables = {};
  const gutterPair = Array.isArray(gutter) ? gutter : [gutter, 0];
  const horizontalGutter = gutterPair[0];
  const verticalGutter = gutterPair[1];

  applyResponsiveValue(variables, "row-gutter-x", horizontalGutter, 0, toCssLength);
  applyResponsiveValue(variables, "row-gutter-y", verticalGutter, 0, toCssLength);
  applyResponsiveValue<RowAlign>(
    variables,
    "row-align",
    align,
    "top",
    (value) => alignValues[value],
  );
  applyResponsiveValue<RowJustify>(
    variables,
    "row-justify",
    justify,
    "start",
    (value) => justifyValues[value],
  );

  return (
    <div
      {...props}
      className={classes("launch-ui-row", !wrap && "is-nowrap", className)}
      ref={ref}
      style={{ ...variables, ...style } as CSSProperties}
    >
      {children}
    </div>
  );
});

export const Col = forwardRef<HTMLDivElement, ColProps>(function Col(
  {
    children,
    className,
    flex,
    lg,
    md,
    offset,
    order,
    pull,
    push,
    sm,
    span,
    style,
    xl,
    xs,
    xxl,
    xxxl,
    ...props
  },
  ref,
) {
  const variables: GridVariables = {};
  const baseSize: ColSize = {
    ...(flex === undefined ? {} : { flex }),
    ...(offset === undefined ? {} : { offset }),
    ...(order === undefined ? {} : { order }),
    ...(pull === undefined ? {} : { pull }),
    ...(push === undefined ? {} : { push }),
    ...(span === undefined ? {} : { span }),
  };

  const responsiveSizes: Record<GridBreakpoint, ColResponsiveSize | undefined> = {
    lg,
    md,
    sm,
    xl,
    xs,
    xxl,
    xxxl,
  };

  let resolvedSize = resolveColSize(defaultColSize, baseSize);
  for (const breakpoint of gridBreakpoints) {
    const responsiveSize = responsiveSizes[breakpoint];
    if (responsiveSize !== undefined) {
      resolvedSize = resolveColSize(
        resolvedSize,
        typeof responsiveSize === "number" ? { span: responsiveSize } : responsiveSize,
      );
    }
    applyResolvedColSize(variables, breakpoint, resolvedSize);
  }

  return (
    <div
      {...props}
      className={classes("launch-ui-col", className)}
      ref={ref}
      style={{ ...variables, ...style } as CSSProperties}
    >
      {children}
    </div>
  );
});

const breakpointQueries: Record<GridBreakpoint, string> = {
  xs: "(max-width: 575px)",
  sm: "(min-width: 576px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 992px)",
  xl: "(min-width: 1200px)",
  xxl: "(min-width: 1600px)",
  xxxl: "(min-width: 1920px)",
};

const emptyScreens: GridScreens = {
  lg: false,
  md: false,
  sm: false,
  xl: false,
  xs: false,
  xxl: false,
  xxxl: false,
};

export function useBreakpoint(): GridScreens {
  const [screens, setScreens] = useState<GridScreens>(emptyScreens);

  useEffect(() => {
    const mediaQueries = gridBreakpoints.map((breakpoint) => ({
      breakpoint,
      query: window.matchMedia(breakpointQueries[breakpoint]),
    }));
    const updateScreens = () => {
      const nextScreens = { ...emptyScreens };
      for (const { breakpoint, query } of mediaQueries) {
        nextScreens[breakpoint] = query.matches;
      }
      setScreens(nextScreens);
    };

    updateScreens();
    for (const { query } of mediaQueries) {
      query.addEventListener("change", updateScreens);
    }
    return () => {
      for (const { query } of mediaQueries) {
        query.removeEventListener("change", updateScreens);
      }
    };
  }, []);

  return screens;
}

export const Grid = { useBreakpoint } as const;

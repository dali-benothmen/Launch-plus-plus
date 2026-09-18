import {
  createElement,
  forwardRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
} from "react";
import { classes } from "../internal/classes.js";

export type FlexGapPreset = "large" | "medium" | "small";
export type FlexGap = FlexGapPreset | number | string;
export type FlexOrientation = "horizontal" | "vertical";
export type FlexWrap = boolean | NonNullable<CSSProperties["flexWrap"]>;

export interface FlexProps extends HTMLAttributes<HTMLElement> {
  readonly align?: CSSProperties["alignItems"];
  readonly component?: ElementType;
  readonly flex?: CSSProperties["flex"];
  readonly gap?: FlexGap;
  readonly justify?: CSSProperties["justifyContent"];
  readonly orientation?: FlexOrientation;
  readonly vertical?: boolean;
  readonly wrap?: FlexWrap;
}

const gapSizes: Record<FlexGapPreset, number> = {
  large: 24,
  medium: 16,
  small: 8,
};

export const Flex = forwardRef<HTMLElement, FlexProps>(function Flex(
  {
    align,
    children,
    className,
    component = "div",
    flex,
    gap,
    justify,
    orientation,
    style,
    vertical = false,
    wrap = false,
    ...props
  },
  ref,
) {
  const resolvedOrientation = orientation ?? (vertical ? "vertical" : "horizontal");
  const resolvedGap =
    typeof gap === "string" && Object.hasOwn(gapSizes, gap) ? gapSizes[gap as FlexGapPreset] : gap;
  const resolvedWrap = typeof wrap === "boolean" ? (wrap ? "wrap" : "nowrap") : wrap;
  const layoutStyle: CSSProperties = {
    ...(align === undefined ? {} : { alignItems: align }),
    ...(flex === undefined ? {} : { flex }),
    ...(resolvedGap === undefined ? {} : { gap: resolvedGap }),
    ...(justify === undefined ? {} : { justifyContent: justify }),
    flexWrap: resolvedWrap,
    ...style,
  };

  return createElement(
    component,
    {
      ...props,
      className: classes("launch-ui-flex", `is-${resolvedOrientation}`, className),
      ref,
      style: layoutStyle,
    },
    children,
  );
});

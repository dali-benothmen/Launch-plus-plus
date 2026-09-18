import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
} from "react";
import { classes } from "../internal/classes.js";

export type SpaceAlign = "baseline" | "center" | "end" | "start";
export type SpaceOrientation = "horizontal" | "vertical";
export type SpaceSizePreset = "large" | "medium" | "small";
export type SpaceSize = SpaceSizePreset | number;
export type SpaceSemanticName = "item" | "root" | "separator";
export type SpaceClassNames = Partial<Record<SpaceSemanticName, string>>;
export type SpaceStyles = Partial<Record<SpaceSemanticName, CSSProperties>>;

export interface SpaceProps extends HTMLAttributes<HTMLDivElement> {
  readonly align?: SpaceAlign;
  readonly classNames?:
    | SpaceClassNames
    | ((info: { readonly props: SpaceProps }) => SpaceClassNames);
  readonly orientation?: SpaceOrientation;
  readonly separator?: ReactNode;
  readonly size?: SpaceSize | readonly [SpaceSize, SpaceSize];
  readonly styles?: SpaceStyles | ((info: { readonly props: SpaceProps }) => SpaceStyles);
  readonly vertical?: boolean;
  readonly wrap?: boolean;
}

export interface SpaceCompactProps extends HTMLAttributes<HTMLDivElement> {
  readonly block?: boolean;
  readonly orientation?: SpaceOrientation;
  readonly size?: SpaceSizePreset;
  readonly vertical?: boolean;
}

export interface SpaceAddonProps extends HTMLAttributes<HTMLSpanElement> {}

const sizeValues: Record<SpaceSizePreset, number> = {
  large: 24,
  medium: 16,
  small: 8,
};

const alignValues: Record<SpaceAlign, CSSProperties["alignItems"]> = {
  baseline: "baseline",
  center: "center",
  end: "flex-end",
  start: "flex-start",
};

function resolveSize(size: SpaceSize) {
  return typeof size === "number" ? Math.max(0, size) : sizeValues[size];
}

const SpaceRoot = forwardRef<HTMLDivElement, SpaceProps>(function Space(spaceProps, ref) {
  const {
    align,
    children,
    className,
    classNames: classNamesProp,
    orientation,
    separator,
    size = "small",
    style,
    styles: stylesProp,
    vertical = false,
    wrap = false,
    ...rootProps
  } = spaceProps;
  const resolvedOrientation = orientation ?? (vertical ? "vertical" : "horizontal");
  const sizePair = Array.isArray(size) ? size : [size, size];
  const horizontalSize = resolveSize(sizePair[0] as SpaceSize);
  const verticalSize = resolveSize(sizePair[1] as SpaceSize);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: spaceProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: spaceProps }) : (stylesProp ?? {});
  const childItems = Children.toArray(children);
  const rootVariables = {
    "--launch-ui-space-column-gap": `${horizontalSize}px`,
    "--launch-ui-space-row-gap": `${verticalSize}px`,
    ...(align === undefined ? {} : { alignItems: alignValues[align] }),
  } as CSSProperties;

  return (
    <div
      {...rootProps}
      className={classes(
        "launch-ui-space",
        `is-${resolvedOrientation}`,
        wrap && "is-wrap",
        resolvedClassNames.root,
        className,
      )}
      ref={ref}
      style={{ ...rootVariables, ...resolvedStyles.root, ...style }}
    >
      {childItems.map((child, index) => {
        const childKey = isValidElement(child) && child.key !== null ? child.key : `item-${index}`;
        return (
          <div
            className={classes("launch-ui-space-item", resolvedClassNames.item)}
            key={childKey}
            style={resolvedStyles.item}
          >
            {index > 0 && separator !== undefined ? (
              <span
                aria-hidden="true"
                className={classes("launch-ui-space-separator", resolvedClassNames.separator)}
                style={resolvedStyles.separator}
              >
                {separator}
              </span>
            ) : null}
            <div className="launch-ui-space-item-content">{child}</div>
          </div>
        );
      })}
    </div>
  );
});

const SpaceCompact = forwardRef<HTMLDivElement, SpaceCompactProps>(function SpaceCompact(
  { block = false, children, className, orientation, size = "medium", vertical = false, ...props },
  ref,
) {
  const resolvedOrientation = orientation ?? (vertical ? "vertical" : "horizontal");

  return (
    <div
      {...props}
      className={classes(
        "launch-ui-space-compact",
        `is-${resolvedOrientation}`,
        `is-${size}`,
        block && "is-block",
        className,
      )}
      ref={ref}
    >
      {children}
    </div>
  );
});

const SpaceAddon = forwardRef<HTMLSpanElement, SpaceAddonProps>(function SpaceAddon(
  { children, className, ...props },
  ref,
) {
  return (
    <span {...props} className={classes("launch-ui-space-addon", className)} ref={ref}>
      {children}
    </span>
  );
});

export const Space = Object.assign(SpaceRoot, {
  Addon: SpaceAddon,
  Compact: SpaceCompact,
});

import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { classes } from "../internal/classes.js";

export type DividerOrientation = "horizontal" | "vertical";
export type DividerSize = "large" | "medium" | "small";
export type DividerTitlePlacement = "center" | "end" | "start";
export type DividerVariant = "dashed" | "dotted" | "solid";
export type DividerSemanticName = "content" | "rail" | "root";

export type DividerSemanticClassNames = Partial<Record<DividerSemanticName, string>>;
export type DividerSemanticStyles = Partial<Record<DividerSemanticName, CSSProperties>>;

export interface DividerSemanticInfo {
  readonly props: Readonly<DividerProps>;
}

export interface DividerProps extends HTMLAttributes<HTMLElement> {
  readonly children?: ReactNode;
  readonly classNames?:
    | DividerSemanticClassNames
    | ((info: DividerSemanticInfo) => DividerSemanticClassNames);
  readonly dashed?: boolean;
  readonly orientation?: DividerOrientation;
  readonly plain?: boolean;
  readonly size?: DividerSize;
  readonly styles?: DividerSemanticStyles | ((info: DividerSemanticInfo) => DividerSemanticStyles);
  readonly titlePlacement?: DividerTitlePlacement;
  readonly variant?: DividerVariant;
  readonly vertical?: boolean;
}

export const Divider = forwardRef<HTMLElement, DividerProps>(function Divider(inputProps, ref) {
  const {
    children,
    className,
    classNames: semanticClassNames,
    dashed = false,
    orientation,
    plain = false,
    size,
    style,
    styles: semanticStyles,
    titlePlacement = "center",
    variant = "solid",
    vertical = false,
    ...props
  } = inputProps;

  const resolvedOrientation = orientation ?? (vertical ? "vertical" : "horizontal");
  const resolvedVariant = dashed ? "dashed" : variant;
  const hasContent = children !== undefined && children !== null;
  const hasHorizontalContent = hasContent && resolvedOrientation === "horizontal";
  const semanticInfo: DividerSemanticInfo = { props: inputProps };
  const resolvedClassNames =
    typeof semanticClassNames === "function"
      ? semanticClassNames(semanticInfo)
      : (semanticClassNames ?? {});
  const resolvedStyles =
    typeof semanticStyles === "function" ? semanticStyles(semanticInfo) : (semanticStyles ?? {});
  const rootStyle = { ...resolvedStyles.root, ...style };
  const renderedRootStyle: CSSProperties = hasHorizontalContent
    ? { ...rootStyle, borderWidth: 0 }
    : rootStyle;
  const inheritedRailStyle: CSSProperties = {
    ...(rootStyle.borderColor === undefined
      ? {}
      : { borderBlockStartColor: rootStyle.borderColor }),
    ...(rootStyle.borderStyle === undefined
      ? {}
      : {
          borderBlockStartStyle: rootStyle.borderStyle as CSSProperties["borderBlockStartStyle"],
        }),
    ...(rootStyle.borderWidth === undefined
      ? {}
      : { borderBlockStartWidth: rootStyle.borderWidth }),
    ...resolvedStyles.rail,
  };
  const rootClassName = classes(
    "launch-ui-divider",
    `is-${resolvedOrientation}`,
    `is-${resolvedVariant}`,
    size && `is-${size}`,
    hasHorizontalContent && "has-content",
    hasHorizontalContent && `is-title-${titlePlacement}`,
    plain && "is-plain",
    resolvedClassNames.root,
    className,
  );

  if (resolvedOrientation === "vertical") {
    return (
      <hr
        {...props}
        aria-orientation="vertical"
        className={rootClassName}
        ref={ref as Ref<HTMLHRElement>}
        style={rootStyle}
      />
    );
  }

  if (!hasHorizontalContent) {
    return (
      <hr
        {...props}
        aria-orientation="horizontal"
        className={rootClassName}
        ref={ref as Ref<HTMLHRElement>}
        style={rootStyle}
      />
    );
  }

  return (
    // A titled separator cannot be represented by the void hr element.
    // biome-ignore lint/a11y/useSemanticElements: The wrapper must contain the visible title.
    <div
      {...props}
      aria-orientation="horizontal"
      className={rootClassName}
      ref={ref as Ref<HTMLDivElement>}
      role="separator"
      style={renderedRootStyle}
    >
      <span
        aria-hidden="true"
        className={classes("launch-ui-divider-rail", resolvedClassNames.rail)}
        style={inheritedRailStyle}
      />
      <span
        className={classes("launch-ui-divider-content", resolvedClassNames.content)}
        style={resolvedStyles.content}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className={classes("launch-ui-divider-rail", resolvedClassNames.rail)}
        style={inheritedRailStyle}
      />
    </div>
  );
});

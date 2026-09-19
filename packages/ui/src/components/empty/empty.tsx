import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { classes } from "../internal/classes.js";

export type EmptySemanticName = "description" | "footer" | "image" | "root";
export type EmptyClassNames = Partial<Record<EmptySemanticName, string>>;
export type EmptyStyles = Partial<Record<EmptySemanticName, CSSProperties>>;

export interface EmptyProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly children?: ReactNode;
  readonly classNames?:
    | EmptyClassNames
    | ((info: { readonly props: EmptyProps }) => EmptyClassNames);
  readonly description?: ReactNode | false;
  readonly image?: ReactNode | string;
  readonly styles?: EmptyStyles | ((info: { readonly props: EmptyProps }) => EmptyStyles);
}

const DefaultEmptyImage = (
  <svg aria-hidden="true" viewBox="0 0 64 41">
    <ellipse cx="32" cy="34" fill="currentColor" opacity="0.08" rx="32" ry="7" />
    <path
      d="M13 12.5 20.5 3h23L51 12.5v20H13v-20Z"
      fill="var(--launch-ui-surface)"
      stroke="currentColor"
      strokeOpacity="0.25"
    />
    <path d="M13 12.5h11l2.5 4h11l2.5-4h11" fill="none" stroke="currentColor" opacity="0.35" />
    <path d="M20.5 3 13 12.5h11l2.5 4h11l2.5-4h11L43.5 3h-23Z" fill="currentColor" opacity="0.06" />
  </svg>
);

const SimpleEmptyImage = (
  <svg aria-hidden="true" viewBox="0 0 64 41">
    <ellipse cx="32" cy="34" fill="currentColor" opacity="0.08" rx="32" ry="7" />
    <path
      d="M14 10h36v22H14z"
      fill="var(--launch-ui-surface-subtle)"
      stroke="currentColor"
      strokeOpacity="0.22"
    />
    <path d="M23 18h18M26 24h12" stroke="currentColor" strokeLinecap="round" opacity="0.25" />
  </svg>
);

const EmptyRoot = forwardRef<HTMLDivElement, EmptyProps>(function Empty(emptyProps, ref) {
  const {
    children,
    className,
    classNames: classNamesProp,
    description = "No data",
    image = DefaultEmptyImage,
    style,
    styles: stylesProp,
    ...rootProps
  } = emptyProps;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: emptyProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: emptyProps }) : (stylesProp ?? {});
  const isSimple = image === SimpleEmptyImage;
  const imageNode =
    typeof image === "string" ? (
      <img
        alt={typeof description === "string" ? description : "Empty state"}
        draggable={false}
        src={image}
      />
    ) : (
      image
    );

  return (
    <div
      {...rootProps}
      className={classes(
        "launch-ui-empty",
        isSimple && "is-simple",
        resolvedClassNames.root,
        className,
      )}
      ref={ref}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {imageNode !== null && imageNode !== false ? (
        <div
          className={classes("launch-ui-empty-image", resolvedClassNames.image)}
          style={resolvedStyles.image}
        >
          {imageNode}
        </div>
      ) : null}
      {description !== false && description !== null && description !== undefined ? (
        <div
          className={classes("launch-ui-empty-description", resolvedClassNames.description)}
          style={resolvedStyles.description}
        >
          {description}
        </div>
      ) : null}
      {children !== null && children !== undefined ? (
        <div
          className={classes("launch-ui-empty-footer", resolvedClassNames.footer)}
          style={resolvedStyles.footer}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
});

export const Empty = Object.assign(EmptyRoot, {
  PRESENTED_IMAGE_DEFAULT: DefaultEmptyImage,
  PRESENTED_IMAGE_SIMPLE: SimpleEmptyImage,
}) as typeof EmptyRoot & {
  readonly PRESENTED_IMAGE_DEFAULT: ReactNode;
  readonly PRESENTED_IMAGE_SIMPLE: ReactNode;
};

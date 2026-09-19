import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { classes } from "../internal/classes.js";

export type SkeletonSize = "large" | "medium" | "small";
export type SkeletonAvatarShape = "circle" | "square";
export type SkeletonButtonShape = "circle" | "default" | "round" | "square";
export type SkeletonSemanticName = "avatar" | "header" | "paragraph" | "root" | "section" | "title";
export type SkeletonClassNames = Partial<Record<SkeletonSemanticName, string>>;
export type SkeletonStyles = Partial<Record<SkeletonSemanticName, CSSProperties>>;
export type SkeletonElementSemanticName = "content" | "root";
export type SkeletonElementClassNames = Partial<Record<SkeletonElementSemanticName, string>>;
export type SkeletonElementStyles = Partial<Record<SkeletonElementSemanticName, CSSProperties>>;
export type SkeletonWidth = number | string;

export interface SkeletonAvatarConfig {
  readonly shape?: SkeletonAvatarShape;
  readonly size?: SkeletonSize | number;
}

export interface SkeletonTitleProps {
  readonly width?: SkeletonWidth;
}

export interface SkeletonParagraphProps {
  readonly rows?: number;
  readonly width?: SkeletonWidth | ReadonlyArray<SkeletonWidth>;
}

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  readonly active?: boolean;
  readonly avatar?: boolean | SkeletonAvatarConfig;
  readonly children?: ReactNode;
  readonly classNames?:
    | SkeletonClassNames
    | ((info: { readonly props: SkeletonProps }) => SkeletonClassNames);
  readonly loading?: boolean;
  readonly paragraph?: boolean | SkeletonParagraphProps;
  readonly round?: boolean;
  readonly styles?: SkeletonStyles | ((info: { readonly props: SkeletonProps }) => SkeletonStyles);
  readonly title?: boolean | SkeletonTitleProps;
}

interface SkeletonElementBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly active?: boolean;
}

type SkeletonElementClassNamesProp<TProps> =
  | SkeletonElementClassNames
  | ((info: { readonly props: TProps }) => SkeletonElementClassNames);

type SkeletonElementStylesProp<TProps> =
  | SkeletonElementStyles
  | ((info: { readonly props: TProps }) => SkeletonElementStyles);

export interface SkeletonAvatarProps extends SkeletonElementBaseProps {
  readonly classNames?: SkeletonElementClassNamesProp<SkeletonAvatarProps>;
  readonly shape?: SkeletonAvatarShape;
  readonly size?: SkeletonSize | number;
  readonly styles?: SkeletonElementStylesProp<SkeletonAvatarProps>;
}

export interface SkeletonButtonProps extends SkeletonElementBaseProps {
  readonly block?: boolean;
  readonly classNames?: SkeletonElementClassNamesProp<SkeletonButtonProps>;
  readonly shape?: SkeletonButtonShape;
  readonly size?: SkeletonSize;
  readonly styles?: SkeletonElementStylesProp<SkeletonButtonProps>;
}

export interface SkeletonInputProps extends SkeletonElementBaseProps {
  readonly block?: boolean;
  readonly classNames?: SkeletonElementClassNamesProp<SkeletonInputProps>;
  readonly size?: SkeletonSize;
  readonly styles?: SkeletonElementStylesProp<SkeletonInputProps>;
}

export interface SkeletonNodeProps extends SkeletonElementBaseProps {
  readonly children?: ReactNode;
  readonly classNames?: SkeletonElementClassNamesProp<SkeletonNodeProps>;
  readonly styles?: SkeletonElementStylesProp<SkeletonNodeProps>;
}

export interface SkeletonImageProps extends SkeletonElementBaseProps {
  readonly classNames?: SkeletonElementClassNamesProp<SkeletonImageProps>;
  readonly styles?: SkeletonElementStylesProp<SkeletonImageProps>;
}

const sizePixels: Record<SkeletonSize, number> = {
  large: 40,
  medium: 32,
  small: 24,
};

function objectValue<T extends object>(value: boolean | T): T | undefined {
  return typeof value === "object" ? value : undefined;
}

function createRowKeys(count: number) {
  return Array.from({ length: count }, (_, index) => `row-${index + 1}`);
}

function rowWidth(width: SkeletonParagraphProps["width"], index: number, rows: number) {
  if (Array.isArray(width)) return width[index];
  return index === rows - 1 ? width : undefined;
}

function BaseSkeleton(skeletonProps: SkeletonProps, ref: ForwardedRef<HTMLDivElement>) {
  const {
    active = false,
    avatar = false,
    children,
    className,
    classNames: classNamesProp,
    loading,
    paragraph = true,
    round = false,
    style,
    styles: stylesProp,
    title = true,
    ...rootProps
  } = skeletonProps;
  if (loading === false) return children ?? null;

  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: skeletonProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: skeletonProps }) : (stylesProp ?? {});
  const hasAvatar = avatar !== false;
  const hasTitle = title !== false;
  const hasParagraph = paragraph !== false;
  const avatarConfig = objectValue(avatar);
  const titleConfig = objectValue(title);
  const paragraphConfig = objectValue(paragraph);
  const avatarShape = avatarConfig?.shape ?? (hasTitle && !hasParagraph ? "square" : "circle");
  const avatarSize = avatarConfig?.size ?? "large";
  const titleWidth =
    titleConfig?.width ??
    (!hasAvatar && hasParagraph ? "38%" : hasAvatar && hasParagraph ? "50%" : undefined);
  const paragraphRows = Math.max(
    0,
    Math.floor(paragraphConfig?.rows ?? (!hasAvatar && hasTitle ? 3 : 2)),
  );
  const paragraphWidth = paragraphConfig?.width ?? (!hasAvatar || !hasTitle ? "61%" : undefined);
  const avatarPixels = typeof avatarSize === "number" ? avatarSize : sizePixels[avatarSize];

  return (
    <div
      {...rootProps}
      aria-hidden="true"
      className={classes(
        "launch-ui-skeleton",
        active && "is-active",
        hasAvatar && "has-avatar",
        round && "is-round",
        resolvedClassNames.root,
        className,
      )}
      ref={ref}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {hasAvatar ? (
        <div
          className={classes("launch-ui-skeleton-header", resolvedClassNames.header)}
          style={resolvedStyles.header}
        >
          <span
            className={classes(
              "launch-ui-skeleton-avatar",
              `is-${avatarShape}`,
              resolvedClassNames.avatar,
            )}
            style={{
              height: avatarPixels,
              width: avatarPixels,
              ...resolvedStyles.avatar,
            }}
          />
        </div>
      ) : null}
      {hasTitle || hasParagraph ? (
        <div
          className={classes("launch-ui-skeleton-section", resolvedClassNames.section)}
          style={resolvedStyles.section}
        >
          {hasTitle ? (
            <span
              className={classes("launch-ui-skeleton-title", resolvedClassNames.title)}
              style={{
                ...(titleWidth === undefined ? {} : { width: titleWidth }),
                ...resolvedStyles.title,
              }}
            />
          ) : null}
          {hasParagraph ? (
            <span
              className={classes("launch-ui-skeleton-paragraph", resolvedClassNames.paragraph)}
              style={resolvedStyles.paragraph}
            >
              {createRowKeys(paragraphRows).map((rowKey, index) => {
                const width = rowWidth(paragraphWidth, index, paragraphRows);
                return (
                  <span
                    className="launch-ui-skeleton-paragraph-row"
                    key={rowKey}
                    style={width === undefined ? undefined : { width }}
                  />
                );
              })}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const SkeletonRoot = forwardRef<HTMLDivElement, SkeletonProps>(BaseSkeleton);

function resolveElementSemantics<
  TProps extends SkeletonElementBaseProps & {
    readonly classNames?: SkeletonElementClassNamesProp<TProps>;
    readonly styles?: SkeletonElementStylesProp<TProps>;
  },
>(props: TProps) {
  const resolvedClassNames =
    typeof props.classNames === "function" ? props.classNames({ props }) : (props.classNames ?? {});
  const resolvedStyles =
    typeof props.styles === "function" ? props.styles({ props }) : (props.styles ?? {});
  return { resolvedClassNames, resolvedStyles };
}

const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  function SkeletonAvatar(avatarProps, ref) {
    const {
      active = false,
      className,
      classNames: _classNames,
      shape = "circle",
      size = "medium",
      style,
      styles: _styles,
      ...rootProps
    } = avatarProps;
    const { resolvedClassNames, resolvedStyles } = resolveElementSemantics(avatarProps);
    const pixels = typeof size === "number" ? size : sizePixels[size];
    return (
      <div
        {...rootProps}
        aria-hidden="true"
        className={classes(
          "launch-ui-skeleton-element",
          active && "is-active",
          resolvedClassNames.root,
          className,
        )}
        ref={ref}
        style={resolvedStyles.root}
      >
        <span
          className={classes(
            "launch-ui-skeleton-element-content",
            "is-avatar",
            `is-${shape}`,
            resolvedClassNames.content,
          )}
          style={{ height: pixels, width: pixels, ...resolvedStyles.content, ...style }}
        />
      </div>
    );
  },
);

const SkeletonButton = forwardRef<HTMLDivElement, SkeletonButtonProps>(
  function SkeletonButton(buttonProps, ref) {
    const {
      active = false,
      block = false,
      className,
      classNames: _classNames,
      shape = "default",
      size = "medium",
      style,
      styles: _styles,
      ...rootProps
    } = buttonProps;
    const { resolvedClassNames, resolvedStyles } = resolveElementSemantics(buttonProps);
    return (
      <div
        {...rootProps}
        aria-hidden="true"
        className={classes(
          "launch-ui-skeleton-element",
          "is-button-root",
          active && "is-active",
          block && "is-block",
          resolvedClassNames.root,
          className,
        )}
        ref={ref}
        style={resolvedStyles.root}
      >
        <span
          className={classes(
            "launch-ui-skeleton-element-content",
            "is-button",
            `is-${size}`,
            `is-${shape}`,
            resolvedClassNames.content,
          )}
          style={{ ...resolvedStyles.content, ...style }}
        />
      </div>
    );
  },
);

const SkeletonInput = forwardRef<HTMLDivElement, SkeletonInputProps>(
  function SkeletonInput(inputProps, ref) {
    const {
      active = false,
      block = false,
      className,
      classNames: _classNames,
      size = "medium",
      style,
      styles: _styles,
      ...rootProps
    } = inputProps;
    const { resolvedClassNames, resolvedStyles } = resolveElementSemantics(inputProps);
    return (
      <div
        {...rootProps}
        aria-hidden="true"
        className={classes(
          "launch-ui-skeleton-element",
          "is-input-root",
          active && "is-active",
          block && "is-block",
          resolvedClassNames.root,
          className,
        )}
        ref={ref}
        style={resolvedStyles.root}
      >
        <span
          className={classes(
            "launch-ui-skeleton-element-content",
            "is-input",
            `is-${size}`,
            resolvedClassNames.content,
          )}
          style={{ ...resolvedStyles.content, ...style }}
        />
      </div>
    );
  },
);

const SkeletonNode = forwardRef<HTMLDivElement, SkeletonNodeProps>(
  function SkeletonNode(nodeProps, ref) {
    const {
      active = false,
      children,
      className,
      classNames: _classNames,
      style,
      styles: _styles,
      ...rootProps
    } = nodeProps;
    const { resolvedClassNames, resolvedStyles } = resolveElementSemantics(nodeProps);
    return (
      <div
        {...rootProps}
        aria-hidden="true"
        className={classes(
          "launch-ui-skeleton-element",
          active && "is-active",
          resolvedClassNames.root,
          className,
        )}
        ref={ref}
        style={resolvedStyles.root}
      >
        <span
          className={classes(
            "launch-ui-skeleton-element-content",
            "is-node",
            resolvedClassNames.content,
          )}
          style={{ ...resolvedStyles.content, ...style }}
        >
          {children}
        </span>
      </div>
    );
  },
);

function ImagePlaceholderIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-skeleton-image-icon" viewBox="0 0 48 48">
      <rect height="34" rx="2" width="40" x="4" y="7" />
      <circle cx="16" cy="18" r="4" />
      <path d="m8 36 10-10 7 7 5-5 10 8" />
    </svg>
  );
}

const SkeletonImage = forwardRef<HTMLDivElement, SkeletonImageProps>(
  function SkeletonImage(imageProps, ref) {
    const {
      active = false,
      className,
      classNames: _classNames,
      style,
      styles: _styles,
      ...rootProps
    } = imageProps;
    const { resolvedClassNames, resolvedStyles } = resolveElementSemantics(imageProps);
    return (
      <div
        {...rootProps}
        aria-hidden="true"
        className={classes(
          "launch-ui-skeleton-element",
          active && "is-active",
          resolvedClassNames.root,
          className,
        )}
        ref={ref}
        style={resolvedStyles.root}
      >
        <span
          className={classes(
            "launch-ui-skeleton-element-content",
            "is-image",
            resolvedClassNames.content,
          )}
          style={{ ...resolvedStyles.content, ...style }}
        >
          <ImagePlaceholderIcon />
        </span>
      </div>
    );
  },
);

export const Skeleton = Object.assign(SkeletonRoot, {
  Avatar: SkeletonAvatar,
  Button: SkeletonButton,
  Image: SkeletonImage,
  Input: SkeletonInput,
  Node: SkeletonNode,
});

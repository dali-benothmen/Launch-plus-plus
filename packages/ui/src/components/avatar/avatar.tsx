import {
  Children,
  type CSSProperties,
  createContext,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  isValidElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";

export type AvatarShape = "circle" | "square";
export type AvatarNamedSize = "large" | "medium" | "small";

export interface AvatarResponsiveSize {
  readonly lg?: number;
  readonly md?: number;
  readonly sm?: number;
  readonly xl?: number;
  readonly xs?: number;
  readonly xxl?: number;
}

export type AvatarSize = AvatarNamedSize | AvatarResponsiveSize | number;

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "onError"> {
  readonly alt?: string;
  readonly children?: ReactNode;
  readonly crossOrigin?: ImgHTMLAttributes<HTMLImageElement>["crossOrigin"];
  readonly draggable?: boolean | "false" | "true";
  readonly gap?: number;
  readonly icon?: ReactNode;
  readonly onError?: () => boolean | undefined;
  readonly shape?: AvatarShape;
  readonly size?: AvatarSize;
  readonly src?: ReactNode;
  readonly srcSet?: string;
}

export interface AvatarGroupPopoverConfig {
  readonly placement?: "bottom" | "top";
  readonly trigger?: "click" | "hover";
}

export interface AvatarGroupMaxConfig {
  readonly count?: number;
  readonly popover?: AvatarGroupPopoverConfig;
  readonly style?: CSSProperties;
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  readonly max?: AvatarGroupMaxConfig;
  readonly shape?: AvatarShape;
  readonly size?: AvatarSize;
}

interface AvatarGroupContextValue {
  readonly shape?: AvatarShape;
  readonly size?: AvatarSize;
}

const AvatarGroupContext = createContext<AvatarGroupContextValue>({});

function avatarChildKey(item: ReactNode, fallback: string) {
  return isValidElement(item) && item.key !== null ? item.key : fallback;
}

const responsiveOrder: ReadonlyArray<keyof AvatarResponsiveSize> = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "xxl",
];

function isResponsiveSize(size: AvatarSize): size is AvatarResponsiveSize {
  return typeof size === "object";
}

function responsiveValues(size: AvatarResponsiveSize) {
  const first = responsiveOrder.map((key) => size[key]).find((value) => value !== undefined) ?? 32;
  let previous = first;
  return Object.fromEntries(
    responsiveOrder.map((key) => {
      previous = size[key] ?? previous;
      return [key, previous];
    }),
  ) as Record<keyof AvatarResponsiveSize, number>;
}

function avatarSizeStyle(size: AvatarSize): CSSProperties {
  if (typeof size === "number") {
    return {
      "--launch-ui-avatar-font-size": `${Math.max(12, Math.round(size * 0.44))}px`,
      "--launch-ui-avatar-size": `${size}px`,
    } as CSSProperties;
  }
  if (!isResponsiveSize(size)) return {};
  const values = responsiveValues(size);
  return {
    "--launch-ui-avatar-font-size": `${Math.max(12, Math.round(values.xs * 0.44))}px`,
    "--launch-ui-avatar-size-lg": `${values.lg}px`,
    "--launch-ui-avatar-size-md": `${values.md}px`,
    "--launch-ui-avatar-size-sm": `${values.sm}px`,
    "--launch-ui-avatar-size-xl": `${values.xl}px`,
    "--launch-ui-avatar-size-xs": `${values.xs}px`,
    "--launch-ui-avatar-size-xxl": `${values.xxl}px`,
  } as CSSProperties;
}

function AvatarRoot({
  alt,
  children,
  className,
  crossOrigin,
  draggable = true,
  gap = 4,
  icon,
  onError,
  shape: shapeProp,
  size: sizeProp,
  src,
  srcSet,
  style,
  ...props
}: AvatarProps) {
  const group = useContext(AvatarGroupContext);
  const shape = shapeProp ?? group.shape ?? "circle";
  const size = sizeProp ?? group.size ?? "medium";
  const [failedSource, setFailedSource] = useState<ReactNode>();
  const [textScale, setTextScale] = useState(1);
  const rootRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const imageSource = typeof src === "string";
  const hasImage = src !== undefined && src !== null && failedSource !== src;
  const contentType = hasImage ? "image" : icon ? "icon" : "text";

  useLayoutEffect(() => {
    if (contentType !== "text") {
      setTextScale(1);
      return;
    }
    const root = rootRef.current;
    const text = textRef.current;
    if (!root || !text) return;
    const update = () => {
      const available = Math.max(0, root.offsetWidth - gap * 2);
      const nextScale = text.offsetWidth > available ? available / text.offsetWidth : 1;
      setTextScale(Number.isFinite(nextScale) ? nextScale : 1);
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(root);
    return () => observer?.disconnect();
  });

  const handleImageError = () => {
    if (onError?.() === false) return;
    setFailedSource(src);
  };
  const sizeClass = typeof size === "string" ? `is-${size}` : undefined;
  const sizeStyle = avatarSizeStyle(size);

  return (
    <span
      {...props}
      className={classes(
        "launch-ui-avatar",
        `is-${shape}`,
        sizeClass,
        isResponsiveSize(size) && "is-responsive",
        `is-${contentType}`,
        className,
      )}
      ref={rootRef}
      style={{ ...sizeStyle, ...style }}
    >
      {hasImage ? (
        imageSource ? (
          <img
            alt={alt ?? ""}
            crossOrigin={crossOrigin}
            draggable={draggable}
            onError={handleImageError}
            src={src}
            srcSet={srcSet}
          />
        ) : (
          <span className="launch-ui-avatar-image-node">{src}</span>
        )
      ) : icon ? (
        <span className="launch-ui-avatar-icon">{icon}</span>
      ) : (
        <span
          className="launch-ui-avatar-text"
          ref={textRef}
          style={{ transform: `scale(${textScale}) translateX(-50%)` }}
        >
          {children}
        </span>
      )}
    </span>
  );
}

function AvatarGroup({
  children,
  className,
  max,
  shape = "circle",
  size = "medium",
  ...props
}: AvatarGroupProps) {
  const items = Children.toArray(children);
  const maximum = Math.max(0, max?.count ?? items.length);
  const visibleItems = items.slice(0, maximum);
  const hiddenItems = items.slice(maximum);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverTrigger = max?.popover?.trigger ?? "hover";
  const placement = max?.popover?.placement ?? "top";

  return (
    <AvatarGroupContext.Provider value={{ shape, size }}>
      <div {...props} className={classes("launch-ui-avatar-group", `is-${shape}`, className)}>
        {visibleItems.map((item, index) => (
          <span
            className="launch-ui-avatar-group-item"
            key={avatarChildKey(item, `avatar-${index}`)}
          >
            {item}
          </span>
        ))}
        {hiddenItems.length > 0 ? (
          <span
            className={classes(
              "launch-ui-avatar-overflow",
              `is-${popoverTrigger}`,
              popoverOpen && "is-open",
            )}
          >
            <button
              aria-expanded={popoverTrigger === "click" ? popoverOpen : undefined}
              aria-label={`Show ${hiddenItems.length} more avatars`}
              className="launch-ui-avatar-overflow-trigger"
              onClick={() => {
                if (popoverTrigger === "click") setPopoverOpen((open) => !open);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setPopoverOpen(false);
              }}
              type="button"
            >
              <AvatarRoot style={max?.style}>+{hiddenItems.length}</AvatarRoot>
            </button>
            <span className={classes("launch-ui-avatar-popover", `is-${placement}`)} role="tooltip">
              {hiddenItems.map((item, index) => (
                <span
                  className="launch-ui-avatar-popover-item"
                  key={avatarChildKey(item, `overflow-${index}`)}
                >
                  {item}
                </span>
              ))}
            </span>
          </span>
        ) : null}
      </div>
    </AvatarGroupContext.Provider>
  );
}

export const Avatar = Object.assign(AvatarRoot, { Group: AvatarGroup }) as typeof AvatarRoot & {
  readonly Group: typeof AvatarGroup;
};

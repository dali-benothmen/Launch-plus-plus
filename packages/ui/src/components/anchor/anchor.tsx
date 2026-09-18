import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type HTMLAttributes,
  type Key,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";

export type AnchorDirection = "horizontal" | "vertical";
export type AnchorSemanticName = "indicator" | "item" | "itemTitle" | "root";
export type AnchorClassNames = Partial<Record<AnchorSemanticName, string>>;
export type AnchorStyles = Partial<Record<AnchorSemanticName, CSSProperties>>;
export type AnchorContainer = HTMLElement | Window;

export interface AnchorAffixOptions {
  readonly offsetBottom?: number;
}

export interface AnchorItem {
  readonly children?: ReadonlyArray<AnchorItem>;
  readonly href: string;
  readonly key: Key;
  readonly replace?: boolean;
  readonly target?: string;
  readonly targetOffset?: number;
  readonly title: ReactNode;
}

export interface AnchorProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "onChange" | "onClick"> {
  readonly affix?: AnchorAffixOptions | boolean;
  readonly bounds?: number;
  readonly classNames?:
    | AnchorClassNames
    | ((info: { readonly props: AnchorProps }) => AnchorClassNames);
  readonly direction?: AnchorDirection;
  readonly getContainer?: () => AnchorContainer;
  readonly getCurrentAnchor?: (activeLink: string) => string;
  readonly items?: ReadonlyArray<AnchorItem>;
  readonly offsetTop?: number;
  readonly onChange?: (currentActiveLink: string) => void;
  readonly onClick?: (event: MouseEvent<HTMLAnchorElement>, link: AnchorItem) => void;
  readonly replace?: boolean;
  readonly showInkInFixed?: boolean;
  readonly styles?: AnchorStyles | ((info: { readonly props: AnchorProps }) => AnchorStyles);
  readonly targetOffset?: number;
}

function flattenItems(items: ReadonlyArray<AnchorItem>): ReadonlyArray<AnchorItem> {
  return items.flatMap((item) => [item, ...flattenItems(item.children ?? [])]);
}

function getTarget(href: string) {
  if (typeof document === "undefined") return null;
  const hashIndex = href.indexOf("#");
  if (hashIndex < 0) return null;

  const encodedId = href.slice(hashIndex + 1);
  if (!encodedId) return null;
  try {
    return document.getElementById(decodeURIComponent(encodedId));
  } catch {
    return document.getElementById(encodedId);
  }
}

function isWindow(container: AnchorContainer): container is Window {
  return "window" in container && container.window === container;
}

function getTargetTop(target: HTMLElement, container: AnchorContainer) {
  const targetRect = target.getBoundingClientRect();
  if (isWindow(container)) return targetRect.top;
  return targetRect.top - container.getBoundingClientRect().top;
}

function isAtScrollEnd(container: AnchorContainer, bounds: number) {
  if (isWindow(container)) {
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    );
    return (
      documentHeight > container.innerHeight &&
      container.scrollY + container.innerHeight >= documentHeight - bounds
    );
  }

  return (
    container.scrollHeight > container.clientHeight &&
    container.scrollTop + container.clientHeight >= container.scrollHeight - bounds
  );
}

function scrollToTarget(target: HTMLElement, container: AnchorContainer, offset: number) {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  if (isWindow(container)) {
    container.scrollTo({
      behavior,
      top: container.scrollY + target.getBoundingClientRect().top - offset,
    });
    return;
  }

  container.scrollTo({
    behavior,
    top:
      container.scrollTop +
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      offset,
  });
}

function setForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

export const Anchor = forwardRef<HTMLElement, AnchorProps>(function Anchor(anchorProps, ref) {
  const {
    affix = true,
    bounds = 5,
    className,
    classNames: classNamesProp,
    direction = "vertical",
    getContainer,
    getCurrentAnchor,
    items = [],
    offsetTop = 0,
    onChange,
    onClick,
    replace = false,
    showInkInFixed = false,
    style,
    styles: stylesProp,
    targetOffset,
    ...props
  } = anchorProps;
  const activeLinkRef = useRef("");
  const [activeLink, setActiveLink] = useState("");
  const flatItems = useMemo(() => flattenItems(items), [items]);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: anchorProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: anchorProps }) : (stylesProp ?? {});
  const isAffixed = affix !== false;
  const affixOptions = typeof affix === "object" ? affix : undefined;
  const indicatorVisible = direction === "horizontal" || isAffixed || showInkInFixed;

  const updateActiveLink = useCallback(
    (nextLink: string) => {
      const customizedLink = getCurrentAnchor?.(nextLink) ?? nextLink;
      if (customizedLink === activeLinkRef.current) return;
      activeLinkRef.current = customizedLink;
      setActiveLink(customizedLink);
      onChange?.(customizedLink);
    },
    [getCurrentAnchor, onChange],
  );

  const resolveContainer = useCallback((): AnchorContainer => {
    return getContainer?.() ?? window;
  }, [getContainer]);
  const setRootRef = useCallback((node: HTMLElement | null) => setForwardedRef(ref, node), [ref]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = resolveContainer();
    let frame = 0;

    const updateFromScroll = () => {
      let nextLink = "";
      const threshold = offsetTop + bounds;
      const targetItems = flatItems.filter(({ href }) => getTarget(href) !== null);

      for (const { href } of targetItems) {
        const target = getTarget(href);
        if (target && getTargetTop(target, container) <= threshold) nextLink = href;
      }
      if (isAtScrollEnd(container, bounds)) {
        nextLink = targetItems.at(-1)?.href ?? nextLink;
      }
      updateActiveLink(nextLink);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateFromScroll);
    };

    scheduleUpdate();
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [bounds, flatItems, offsetTop, resolveContainer, updateActiveLink]);

  const handleItemClick = (event: MouseEvent<HTMLAnchorElement>, item: AnchorItem) => {
    onClick?.(event, item);
    if (event.defaultPrevented || (item.target !== undefined && item.target !== "_self")) return;

    const target = getTarget(item.href);
    if (!target) return;
    event.preventDefault();

    const container = resolveContainer();
    scrollToTarget(target, container, item.targetOffset ?? targetOffset ?? offsetTop);
    updateActiveLink(item.href);

    const shouldReplace = item.replace ?? replace;
    if (shouldReplace) {
      window.history.replaceState(null, "", item.href);
    } else {
      window.history.pushState(null, "", item.href);
    }
  };

  const renderItems = (anchorItems: ReadonlyArray<AnchorItem>, level = 0): ReactElement => (
    <ul className="launch-ui-anchor-list" data-level={level}>
      {anchorItems.map((item) => {
        const isActive = activeLink === item.href;
        return (
          <li
            className={classes(
              "launch-ui-anchor-item",
              isActive && "is-active",
              resolvedClassNames.item,
            )}
            key={item.key}
            style={resolvedStyles.item}
          >
            <a
              aria-current={isActive ? "location" : undefined}
              className={classes("launch-ui-anchor-title", resolvedClassNames.itemTitle)}
              href={item.href}
              onClick={(event) => handleItemClick(event, item)}
              style={resolvedStyles.itemTitle}
              target={item.target}
            >
              {isActive && indicatorVisible ? (
                <span
                  aria-hidden="true"
                  className={classes("launch-ui-anchor-indicator", resolvedClassNames.indicator)}
                  style={resolvedStyles.indicator}
                />
              ) : null}
              {item.title}
            </a>
            {direction === "vertical" && item.children?.length
              ? renderItems(item.children, level + 1)
              : null}
          </li>
        );
      })}
    </ul>
  );

  const rootVariables = {
    "--launch-ui-anchor-offset-bottom": `${affixOptions?.offsetBottom ?? 0}px`,
    "--launch-ui-anchor-offset-top": `${offsetTop}px`,
  } as CSSProperties;

  return (
    <nav
      {...props}
      aria-label={props["aria-label"] ?? "On this page"}
      className={classes(
        "launch-ui-anchor",
        `is-${direction}`,
        isAffixed && "is-affixed",
        affixOptions?.offsetBottom !== undefined && "is-bottom-affixed",
        resolvedClassNames.root,
        className,
      )}
      ref={setRootRef}
      style={{ ...rootVariables, ...resolvedStyles.root, ...style }}
    >
      {renderItems(items)}
    </nav>
  );
});

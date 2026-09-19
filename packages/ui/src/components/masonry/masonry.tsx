import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type HTMLAttributes,
  type Key,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";

export const masonryBreakpoints = ["xs", "sm", "md", "lg", "xl", "xxl"] as const;

export type MasonryBreakpoint = (typeof masonryBreakpoints)[number];
export type MasonryResponsiveValue = Partial<Record<MasonryBreakpoint, number>>;
export type MasonryGap = number | MasonryResponsiveValue;
export type MasonryGutter = MasonryGap | readonly [MasonryGap, MasonryGap];
export type MasonrySemanticName = "item" | "root";

export interface MasonryItem<T> {
  readonly children?: ReactNode;
  readonly column?: number;
  readonly data: T;
  readonly height?: number;
  readonly key: Key;
}

export type MasonryRenderItem<T> = MasonryItem<T> & { readonly index: number };
export interface MasonryLayoutItem {
  readonly column: number;
  readonly key: Key;
}

export type MasonryClassNames = Partial<Record<MasonrySemanticName, string>>;
export type MasonryStyles = Partial<Record<MasonrySemanticName, CSSProperties>>;

export interface MasonryProps<T = unknown>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly classNames?:
    | MasonryClassNames
    | ((info: { readonly props: MasonryProps<T> }) => MasonryClassNames);
  readonly columns?: number | MasonryResponsiveValue;
  readonly fresh?: boolean;
  readonly gutter?: MasonryGutter;
  readonly itemRender?: (item: MasonryRenderItem<T>) => ReactNode;
  readonly items?: ReadonlyArray<MasonryItem<T>>;
  readonly onLayoutChange?: (items: ReadonlyArray<MasonryLayoutItem>) => void;
  readonly styles?: MasonryStyles | ((info: { readonly props: MasonryProps<T> }) => MasonryStyles);
}

const breakpointWidths: Record<MasonryBreakpoint, number> = {
  lg: 992,
  md: 768,
  sm: 576,
  xl: 1200,
  xs: 0,
  xxl: 1600,
};

function resolveResponsiveValue(
  value: MasonryResponsiveValue | number,
  width: number,
  fallback: number,
) {
  if (typeof value === "number") return value;

  let resolved = fallback;
  for (const breakpoint of masonryBreakpoints) {
    if (width >= breakpointWidths[breakpoint] && value[breakpoint] !== undefined) {
      resolved = value[breakpoint];
    }
  }
  return resolved;
}

function normalizeColumns(value: number) {
  return Math.max(1, Math.floor(value));
}

function normalizeGap(value: number) {
  return Math.max(0, value);
}

function findShortestColumn(heights: ReadonlyArray<number>) {
  let shortest = 0;
  for (let index = 1; index < heights.length; index += 1) {
    const height = heights[index] ?? Number.POSITIVE_INFINITY;
    const shortestHeight = heights[shortest] ?? Number.POSITIVE_INFINITY;
    if (height < shortestHeight) shortest = index;
  }
  return shortest;
}

function setForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

function MasonryInner<T>(props: MasonryProps<T>, forwardedRef: ForwardedRef<HTMLDivElement>) {
  const {
    className,
    classNames: classNamesProp,
    columns = 3,
    fresh = false,
    gutter = 0,
    itemRender,
    items = [],
    onLayoutChange,
    style,
    styles: stylesProp,
    ...rootProps
  } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemNodesRef = useRef(new Map<Key, HTMLDivElement>());
  const itemKeysByNodeRef = useRef(new WeakMap<Element, Key>());
  const itemRefCallbacks = useRef(new Map<Key, (node: HTMLDivElement | null) => void>());
  const itemObserverRef = useRef<ResizeObserver | null>(null);
  const previousLayoutRef = useRef("");
  const [containerWidth, setContainerWidth] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<ReadonlyMap<Key, number>>(new Map());

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      setForwardedRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const updateWidth = () => setContainerWidth(root.getBoundingClientRect().width);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateMeasurements = (entries: ReadonlyArray<ResizeObserverEntry>) => {
      setMeasuredHeights((current) => {
        const next = new Map(current);
        let changed = false;

        for (const entry of entries) {
          const node = entry.target as HTMLDivElement;
          const key = itemKeysByNodeRef.current.get(node);
          if (key === undefined) continue;

          const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
          if (Math.abs((current.get(key) ?? -1) - height) > 0.5) {
            next.set(key, height);
            changed = true;
          }
        }
        return changed ? next : current;
      });
    };

    const observer = new ResizeObserver(updateMeasurements);
    itemObserverRef.current = observer;
    for (const node of itemNodesRef.current.values()) observer.observe(node);

    return () => {
      observer.disconnect();
      itemObserverRef.current = null;
    };
  }, []);

  const getItemRef = useCallback((key: Key) => {
    const existing = itemRefCallbacks.current.get(key);
    if (existing) return existing;

    const itemRef = (node: HTMLDivElement | null) => {
      const previousNode = itemNodesRef.current.get(key);
      if (previousNode && previousNode !== node) itemObserverRef.current?.unobserve(previousNode);

      if (node) {
        itemNodesRef.current.set(key, node);
        itemKeysByNodeRef.current.set(node, key);
        itemObserverRef.current?.observe(node);
      } else {
        itemNodesRef.current.delete(key);
      }
    };
    itemRefCallbacks.current.set(key, itemRef);
    return itemRef;
  }, []);

  useEffect(() => {
    const itemKeys = new Set(items.map((item) => item.key));
    for (const key of itemRefCallbacks.current.keys()) {
      if (!itemKeys.has(key)) itemRefCallbacks.current.delete(key);
    }
    setMeasuredHeights((current) => {
      const next = new Map([...current].filter(([key]) => itemKeys.has(key)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  const columnCount = normalizeColumns(resolveResponsiveValue(columns, containerWidth, 3));
  const gutterPair = Array.isArray(gutter) ? gutter : [gutter, gutter];
  const horizontalGutter = normalizeGap(
    resolveResponsiveValue(gutterPair[0] as MasonryGap, containerWidth, 0),
  );
  const verticalGutter = normalizeGap(
    resolveResponsiveValue(gutterPair[1] as MasonryGap, containerWidth, 0),
  );

  const layout = useMemo(() => {
    const columnHeights = Array.from({ length: columnCount }, () => 0);
    const columnItemCounts = Array.from({ length: columnCount }, () => 0);
    const placements = items.map((item) => {
      const requestedColumn = item.column;
      const column =
        requestedColumn !== undefined && requestedColumn >= 0 && requestedColumn < columnCount
          ? Math.floor(requestedColumn)
          : findShortestColumn(columnHeights);
      const height = measuredHeights.get(item.key) ?? item.height ?? 0;
      const top =
        (columnHeights[column] ?? 0) + ((columnItemCounts[column] ?? 0) > 0 ? verticalGutter : 0);
      columnHeights[column] = top + height;
      columnItemCounts[column] = (columnItemCounts[column] ?? 0) + 1;
      return { column, key: item.key, top };
    });
    return { height: Math.max(0, ...columnHeights), placements };
  }, [columnCount, items, measuredHeights, verticalGutter]);

  useEffect(() => {
    const signature = layout.placements
      .map(({ column, key }) => `${String(key)}:${column}`)
      .join("|");
    if (signature === previousLayoutRef.current) return;
    previousLayoutRef.current = signature;
    onLayoutChange?.(layout.placements.map(({ column, key }) => ({ column, key })));
  }, [layout, onLayoutChange]);

  const resolvedClassNames =
    typeof classNamesProp === "function" ? classNamesProp({ props }) : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props }) : (stylesProp ?? {});

  const rootVariables = {
    "--launch-ui-masonry-height": `${layout.height}px`,
  } as CSSProperties;

  return (
    <div
      {...rootProps}
      className={classes("launch-ui-masonry", resolvedClassNames.root, className)}
      data-fresh={fresh || undefined}
      ref={setRootRef}
      style={{ ...rootVariables, ...resolvedStyles.root, ...style }}
    >
      {items.map((item, index) => {
        const placement = layout.placements[index];
        if (!placement) return null;
        const renderItem = { ...item, index };
        const itemVariables = {
          "--launch-ui-masonry-item-left": `calc(${(placement.column * 100) / columnCount}% + ${(placement.column * horizontalGutter) / columnCount}px)`,
          "--launch-ui-masonry-item-top": `${placement.top}px`,
          "--launch-ui-masonry-item-width": `calc(${100 / columnCount}% - ${(horizontalGutter * (columnCount - 1)) / columnCount}px)`,
        } as CSSProperties;

        return (
          <div
            className={classes("launch-ui-masonry-item", resolvedClassNames.item)}
            data-column={placement.column}
            key={item.key}
            ref={getItemRef(item.key)}
            style={{ ...itemVariables, ...resolvedStyles.item }}
          >
            {item.children !== undefined ? item.children : itemRender?.(renderItem)}
          </div>
        );
      })}
    </div>
  );
}

export const Masonry = forwardRef(MasonryInner) as <T = unknown>(
  props: MasonryProps<T> & { readonly ref?: ForwardedRef<HTMLDivElement> },
) => ReactElement | null;

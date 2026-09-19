import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type Key,
  type ReactElement,
  type ReactNode,
  type Ref,
  type UIEventHandler,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";

export type ListAlign = "auto" | "bottom" | "top";
export type ListSemanticName = "groupHeader" | "item" | "root";
export type ListClassNames = Partial<Record<ListSemanticName, string>>;
export type ListStyles = Partial<Record<ListSemanticName, CSSProperties>>;

export interface ListGroup<TItem, TGroupKey extends Key = Key> {
  readonly key: (item: TItem) => TGroupKey;
  readonly title: (groupKey: TGroupKey, items: ReadonlyArray<TItem>) => ReactNode;
}

export type ListScrollToConfig =
  | number
  | { readonly left?: number; readonly top?: number }
  | { readonly align?: ListAlign; readonly key: Key; readonly offset?: number }
  | { readonly align?: ListAlign; readonly groupKey: Key; readonly offset?: number };

export interface ListRef {
  readonly nativeElement: HTMLUListElement | null;
  readonly scrollTo: (config?: ListScrollToConfig) => void;
}

export interface ListProps<TItem, TGroupKey extends Key = Key>
  extends Omit<HTMLAttributes<HTMLUListElement>, "children" | "onScroll"> {
  readonly classNames?:
    | ListClassNames
    | ((info: { readonly props: ListProps<TItem, TGroupKey> }) => ListClassNames);
  readonly group?: ListGroup<TItem, TGroupKey>;
  readonly height?: number;
  readonly itemRender: (item: TItem, index: number) => ReactNode;
  readonly items?: ReadonlyArray<TItem>;
  readonly onScroll?: UIEventHandler<HTMLUListElement>;
  readonly rowKey?: keyof TItem | ((item: TItem) => Key);
  readonly sticky?: boolean;
  readonly styles?:
    | ListStyles
    | ((info: { readonly props: ListProps<TItem, TGroupKey> }) => ListStyles);
  readonly virtual?: boolean;
}

const virtualRowHeight = 40;
const virtualOverscan = 5;

function resolveRowKey<TItem>(
  item: TItem,
  index: number,
  rowKey?: ListProps<TItem>["rowKey"],
): Key {
  if (typeof rowKey === "function") return rowKey(item);
  if (rowKey !== undefined) {
    const value = item[rowKey];
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
      return value;
    }
  }
  return index;
}

function alignedScrollTop(top: number, height: number, viewport: number, align: ListAlign) {
  if (align === "bottom") return top - viewport + height;
  return top;
}

function relativeScrollTop(root: HTMLUListElement, element: HTMLElement) {
  return element.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
}

function scrollElementIntoView(
  root: HTMLUListElement,
  top: number,
  itemHeight: number,
  align: ListAlign,
  offset: number,
) {
  if (align === "auto") {
    if (top < root.scrollTop) root.scrollTo({ top: top + offset });
    else if (top + itemHeight > root.scrollTop + root.clientHeight) {
      root.scrollTo({ top: top - root.clientHeight + itemHeight + offset });
    }
    return;
  }
  root.scrollTo({ top: alignedScrollTop(top, itemHeight, root.clientHeight, align) + offset });
}

function ListInner<TItem, TGroupKey extends Key = Key>(
  listProps: ListProps<TItem, TGroupKey>,
  forwardedRef: Ref<ListRef>,
) {
  const {
    className,
    classNames: classNamesProp,
    group,
    height,
    itemRender,
    items = [],
    onScroll,
    rowKey,
    sticky = false,
    style,
    styles: stylesProp,
    virtual = false,
    ...props
  } = listProps;
  const rootRef = useRef<HTMLUListElement>(null);
  const itemElements = useRef(new Map<Key, HTMLLIElement>());
  const groupElements = useRef(new Map<Key, HTMLDivElement>());
  const [scrollTop, setScrollTop] = useState(0);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: listProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: listProps }) : (stylesProp ?? {});
  const useVirtual = virtual && height !== undefined && group === undefined;

  const groupedItems = useMemo(() => {
    if (!group) return [];
    const groups = new Map<TGroupKey, Array<{ readonly index: number; readonly item: TItem }>>();
    items.forEach((item, index) => {
      const key = group.key(item);
      const entries = groups.get(key) ?? [];
      entries.push({ index, item });
      groups.set(key, entries);
    });
    return Array.from(groups.entries());
  }, [group, items]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      get nativeElement() {
        return rootRef.current;
      },
      scrollTo: (config = 0) => {
        const root = rootRef.current;
        if (!root) return;
        if (typeof config === "number") {
          root.scrollTo({ top: config });
          return;
        }
        if ("key" in config) {
          const index = items.findIndex(
            (item, itemIndex) => resolveRowKey(item, itemIndex, rowKey) === config.key,
          );
          if (index < 0) return;
          const element = itemElements.current.get(config.key);
          const rowTop = useVirtual
            ? index * virtualRowHeight
            : element
              ? relativeScrollTop(root, element)
              : 0;
          const rowHeight = useVirtual ? virtualRowHeight : (element?.offsetHeight ?? 0);
          scrollElementIntoView(root, rowTop, rowHeight, config.align ?? "top", config.offset ?? 0);
          return;
        }
        if ("groupKey" in config) {
          const element = groupElements.current.get(config.groupKey);
          if (!element) return;
          scrollElementIntoView(
            root,
            relativeScrollTop(root, element),
            element.offsetHeight,
            config.align ?? "top",
            config.offset ?? 0,
          );
          return;
        }
        root.scrollTo(config);
      },
    }),
    [items, rowKey, useVirtual],
  );

  const handleScroll: UIEventHandler<HTMLUListElement> = (event) => {
    if (useVirtual) setScrollTop(event.currentTarget.scrollTop);
    onScroll?.(event);
  };

  const renderItem = (item: TItem, index: number, virtualTop?: number) => {
    const key = resolveRowKey(item, index, rowKey);
    return (
      <li
        className={classes(
          "launch-ui-list-item",
          index === items.length - 1 && "is-last",
          resolvedClassNames.item,
        )}
        data-row-key={String(key)}
        key={key}
        ref={(element) => {
          if (element) itemElements.current.set(key, element);
          else itemElements.current.delete(key);
        }}
        style={{
          ...resolvedStyles.item,
          ...(virtualTop === undefined
            ? {}
            : {
                height: virtualRowHeight,
                position: "absolute",
                top: virtualTop,
                width: "100%",
              }),
        }}
      >
        {itemRender(item, index)}
      </li>
    );
  };

  let content: ReactNode;
  if (group) {
    content = groupedItems.map(([groupKey, entries]) => (
      <li className="launch-ui-list-group" key={groupKey}>
        <div
          className={classes(
            "launch-ui-list-group-header",
            sticky && "is-sticky",
            resolvedClassNames.groupHeader,
          )}
          ref={(element) => {
            if (element) groupElements.current.set(groupKey, element);
            else groupElements.current.delete(groupKey);
          }}
          style={resolvedStyles.groupHeader}
        >
          {group.title(
            groupKey,
            entries.map(({ item }) => item),
          )}
        </div>
        <ul className="launch-ui-list-group-items">
          {entries.map(({ index, item }) => renderItem(item, index))}
        </ul>
      </li>
    ));
  } else if (useVirtual) {
    const start = Math.max(0, Math.floor(scrollTop / virtualRowHeight) - virtualOverscan);
    const visibleCount = Math.ceil(height / virtualRowHeight) + virtualOverscan * 2;
    const end = Math.min(items.length, start + visibleCount);
    content = (
      <li
        className="launch-ui-list-virtual-space"
        style={{ height: items.length * virtualRowHeight }}
      >
        <ul className="launch-ui-list-virtual-window">
          {items.slice(start, end).map((item, offset) => {
            const index = start + offset;
            return renderItem(item, index, index * virtualRowHeight);
          })}
        </ul>
      </li>
    );
  } else {
    content = items.map((item, index) => renderItem(item, index));
  }

  return (
    <ul
      {...props}
      className={classes(
        "launch-ui-list",
        height !== undefined && "is-scrollable",
        useVirtual && "is-virtual",
        resolvedClassNames.root,
        className,
      )}
      onScroll={handleScroll}
      ref={rootRef}
      style={{ ...resolvedStyles.root, ...(height === undefined ? {} : { height }), ...style }}
    >
      {content}
    </ul>
  );
}

export const List = forwardRef(ListInner) as <TItem, TGroupKey extends Key = Key>(
  props: ListProps<TItem, TGroupKey> & { readonly ref?: Ref<ListRef> },
) => ReactElement;

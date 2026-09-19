import {
  CaretDownOutlined,
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ForwardedRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type Key,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Checkbox } from "../checkbox/index.js";
import { classes } from "../internal/classes.js";
import { LoadingIcon } from "../internal/icons.js";

export type TreeSemanticName = "item" | "itemTitle" | "root";
export type TreeClassNames = Partial<Record<TreeSemanticName, string>>;
export type TreeStyles = Partial<Record<TreeSemanticName, CSSProperties>>;

export interface TreeNodeRenderProps {
  readonly checked: boolean;
  readonly data: TreeDataNode;
  readonly disabled: boolean;
  readonly expanded: boolean;
  readonly halfChecked: boolean;
  readonly isLeaf: boolean;
  readonly loading: boolean;
  readonly selected: boolean;
}

export type TreeNodeIcon = ReactNode | ((props: TreeNodeRenderProps) => ReactNode);

export interface TreeDataNode {
  readonly checkable?: boolean;
  readonly children?: ReadonlyArray<TreeDataNode>;
  readonly className?: string;
  readonly disableCheckbox?: boolean;
  readonly disabled?: boolean;
  readonly icon?: TreeNodeIcon;
  readonly isLeaf?: boolean;
  readonly key: Key;
  readonly selectable?: boolean;
  readonly style?: CSSProperties;
  readonly switcherIcon?: TreeNodeIcon;
  readonly title?: ReactNode;
}

export interface TreeFieldNames {
  readonly children?: string;
  readonly key?: string;
  readonly title?: string;
}

export interface TreeSelectInfo {
  readonly event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>;
  readonly node: TreeDataNode;
  readonly selected: boolean;
  readonly selectedNodes: ReadonlyArray<TreeDataNode>;
}

export interface TreeExpandInfo {
  readonly expanded: boolean;
  readonly node: TreeDataNode;
}

export interface TreeCheckInfo {
  readonly checked: boolean;
  readonly checkedNodes: ReadonlyArray<TreeDataNode>;
  readonly event:
    | ChangeEvent<HTMLInputElement>
    | KeyboardEvent<HTMLElement>
    | MouseEvent<HTMLElement>;
  readonly halfCheckedKeys: ReadonlyArray<Key>;
  readonly node: TreeDataNode;
}

export interface TreeDragInfo {
  readonly event: DragEvent<HTMLElement>;
  readonly expandedKeys?: ReadonlyArray<Key>;
  readonly node: TreeDataNode;
}

export interface TreeDropInfo extends TreeDragInfo {
  readonly dragNode: TreeDataNode;
  readonly dragNodesKeys: ReadonlyArray<Key>;
  readonly dropPosition: -1 | 0 | 1;
  readonly dropToGap: boolean;
}

export type TreeCheckedKeys =
  | ReadonlyArray<Key>
  | {
      readonly checked: ReadonlyArray<Key>;
      readonly halfChecked: ReadonlyArray<Key>;
    };

export interface TreeScrollToConfig {
  readonly align?: "auto" | "bottom" | "top";
  readonly key: Key;
  readonly offset?: number;
}

export interface TreeRef {
  readonly nativeElement: HTMLDivElement | null;
  readonly scrollTo: (config: TreeScrollToConfig) => void;
}

export interface TreeProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | "children"
    | "draggable"
    | "onDoubleClick"
    | "onDragEnd"
    | "onDragEnter"
    | "onDragLeave"
    | "onDragOver"
    | "onDragStart"
    | "onDrop"
    | "onLoad"
    | "onSelect"
  > {
  readonly allowDrop?: (info: {
    readonly dropNode: TreeDataNode;
    readonly dropPosition: -1 | 0 | 1;
  }) => boolean;
  readonly autoExpandParent?: boolean;
  readonly blockNode?: boolean;
  readonly checkable?: boolean;
  readonly checkedKeys?: TreeCheckedKeys;
  readonly checkStrictly?: boolean;
  readonly classNames?: TreeClassNames | ((info: { readonly props: TreeProps }) => TreeClassNames);
  readonly defaultCheckedKeys?: ReadonlyArray<Key>;
  readonly defaultExpandAll?: boolean;
  readonly defaultExpandedKeys?: ReadonlyArray<Key>;
  readonly defaultExpandParent?: boolean;
  readonly defaultSelectedKeys?: ReadonlyArray<Key>;
  readonly disabled?: boolean;
  readonly draggable?:
    | boolean
    | ((node: TreeDataNode) => boolean)
    | {
        readonly icon?: ReactNode | false;
        readonly nodeDraggable?: (node: TreeDataNode) => boolean;
      };
  readonly expandedKeys?: ReadonlyArray<Key>;
  readonly expandAction?: false | "click" | "doubleClick";
  readonly fieldNames?: TreeFieldNames;
  readonly filterTreeNode?: (node: TreeDataNode) => boolean;
  readonly height?: number;
  readonly icon?: TreeNodeIcon;
  readonly loadData?: (node: TreeDataNode) => Promise<unknown>;
  readonly loadedKeys?: ReadonlyArray<Key>;
  readonly multiple?: boolean;
  readonly onCheck?: (checkedKeys: TreeCheckedKeys, info: TreeCheckInfo) => void;
  readonly onDoubleClick?: (event: MouseEvent<HTMLElement>, node: TreeDataNode) => void;
  readonly onDragEnd?: (info: TreeDragInfo) => void;
  readonly onDragEnter?: (info: TreeDragInfo) => void;
  readonly onDragLeave?: (info: TreeDragInfo) => void;
  readonly onDragOver?: (info: TreeDragInfo) => void;
  readonly onDragStart?: (info: TreeDragInfo) => void;
  readonly onDrop?: (info: TreeDropInfo) => void;
  readonly onExpand?: (expandedKeys: ReadonlyArray<Key>, info: TreeExpandInfo) => void;
  readonly onLoad?: (loadedKeys: ReadonlyArray<Key>, info: { readonly node: TreeDataNode }) => void;
  readonly onRightClick?: (info: {
    readonly event: MouseEvent<HTMLElement>;
    readonly node: TreeDataNode;
  }) => void;
  readonly onSelect?: (selectedKeys: ReadonlyArray<Key>, info: TreeSelectInfo) => void;
  readonly selectable?: boolean;
  readonly selectedKeys?: ReadonlyArray<Key>;
  readonly showIcon?: boolean;
  readonly showLine?: boolean | { readonly showLeafIcon?: TreeNodeIcon | boolean };
  readonly styles?: TreeStyles | ((info: { readonly props: TreeProps }) => TreeStyles);
  readonly switcherIcon?: TreeNodeIcon;
  readonly switcherLoadingIcon?: ReactNode;
  readonly titleRender?: (node: TreeDataNode) => ReactNode;
  readonly treeData?: ReadonlyArray<TreeDataNode>;
}

interface NormalizedNode {
  readonly children: ReadonlyArray<NormalizedNode>;
  readonly data: TreeDataNode;
  readonly key: Key;
  readonly level: number;
  readonly parentKey?: Key;
  readonly position: string;
  readonly title: ReactNode;
}

interface NormalizedTree {
  readonly all: ReadonlyArray<NormalizedNode>;
  readonly byKey: ReadonlyMap<Key, NormalizedNode>;
  readonly roots: ReadonlyArray<NormalizedNode>;
}

function hasKey(keys: ReadonlySet<Key> | ReadonlyArray<Key>, key: Key) {
  for (const item of keys) {
    if (Object.is(item, key)) return true;
  }
  return false;
}

function isCheckedKeysRecord(
  value: TreeCheckedKeys,
): value is { readonly checked: ReadonlyArray<Key>; readonly halfChecked: ReadonlyArray<Key> } {
  return !Array.isArray(value);
}

function normalizeTree(
  treeData: ReadonlyArray<TreeDataNode>,
  fieldNames: TreeFieldNames | undefined,
): NormalizedTree {
  const all: NormalizedNode[] = [];
  const byKey = new Map<Key, NormalizedNode>();
  const keyField = fieldNames?.key ?? "key";
  const titleField = fieldNames?.title ?? "title";
  const childrenField = fieldNames?.children ?? "children";
  const walk = (
    data: ReadonlyArray<TreeDataNode>,
    level: number,
    parentKey?: Key,
    prefix = "0",
  ): NormalizedNode[] =>
    data.map((item, index) => {
      const record = item as unknown as Record<string, unknown>;
      const key = record[keyField] as Key;
      const childData = (record[childrenField] as ReadonlyArray<TreeDataNode> | undefined) ?? [];
      const normalized: NormalizedNode = {
        children: [],
        data: item,
        key,
        level,
        ...(parentKey === undefined ? {} : { parentKey }),
        position: `${prefix}-${index}`,
        title: record[titleField] as ReactNode,
      };
      const children = walk(childData, level + 1, key, normalized.position);
      const completed = { ...normalized, children };
      all.push(completed);
      byKey.set(key, completed);
      return completed;
    });
  const roots = walk(treeData, 1);
  return { all, byKey, roots };
}

function keysWithParents(keys: ReadonlyArray<Key>, tree: NormalizedTree) {
  const result = new Set(keys);
  for (const key of keys) {
    let parentKey = tree.byKey.get(key)?.parentKey;
    while (parentKey !== undefined) {
      result.add(parentKey);
      parentKey = tree.byKey.get(parentKey)?.parentKey;
    }
  }
  return result;
}

function descendants(node: NormalizedNode) {
  const result: NormalizedNode[] = [];
  const visit = (current: NormalizedNode) => {
    for (const child of current.children) {
      result.push(child);
      visit(child);
    }
  };
  visit(node);
  return result;
}

function resolveCheckedState(
  source: TreeCheckedKeys | undefined,
  tree: NormalizedTree,
  checkStrictly: boolean,
) {
  if (source !== undefined && isCheckedKeysRecord(source)) {
    return {
      checked: new Set(source.checked),
      halfChecked: new Set(source.halfChecked),
    };
  }
  const checked = new Set<Key>((source as ReadonlyArray<Key> | undefined) ?? []);
  const halfChecked = new Set<Key>();
  if (checkStrictly) return { checked, halfChecked };

  for (const key of [...checked]) {
    const node = tree.byKey.get(key);
    if (!node) continue;
    for (const child of descendants(node)) {
      if (!child.data.disabled && !child.data.disableCheckbox) checked.add(child.key);
    }
  }
  for (const node of [...tree.all].sort((a, b) => b.level - a.level)) {
    if (node.children.length === 0 || node.data.disabled || node.data.disableCheckbox) continue;
    const eligible = node.children.filter(
      (child) => !child.data.disabled && !child.data.disableCheckbox,
    );
    if (eligible.length === 0) continue;
    const allChecked = eligible.every((child) => checked.has(child.key));
    const someChecked = eligible.some(
      (child) => checked.has(child.key) || halfChecked.has(child.key),
    );
    if (allChecked) checked.add(node.key);
    else {
      checked.delete(node.key);
      if (someChecked) halfChecked.add(node.key);
    }
  }
  return { checked, halfChecked };
}

function renderNodeIcon(icon: TreeNodeIcon | undefined, props: TreeNodeRenderProps) {
  return typeof icon === "function" ? icon(props) : icon;
}

function isNodeDraggable(draggable: TreeProps["draggable"], node: TreeDataNode) {
  if (typeof draggable === "function") return draggable(node);
  if (typeof draggable === "object") return draggable.nodeDraggable?.(node) ?? true;
  return draggable === true;
}

function dragIcon(draggable: TreeProps["draggable"]) {
  if (typeof draggable === "object") return draggable.icon;
  return undefined;
}

function relativeScrollTop(root: HTMLElement, element: HTMLElement) {
  return element.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
}

function TreeInner(treeProps: TreeProps, forwardedRef: ForwardedRef<TreeRef>) {
  const {
    allowDrop,
    autoExpandParent = false,
    blockNode = false,
    checkable = false,
    checkedKeys,
    checkStrictly = false,
    className,
    classNames: classNamesProp,
    defaultCheckedKeys = [],
    defaultExpandAll = false,
    defaultExpandedKeys = [],
    defaultExpandParent = true,
    defaultSelectedKeys = [],
    disabled = false,
    draggable = false,
    expandedKeys,
    expandAction = false,
    fieldNames,
    filterTreeNode,
    height,
    icon,
    loadData,
    loadedKeys,
    multiple = false,
    onCheck,
    onDoubleClick,
    onDragEnd,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDragStart,
    onDrop,
    onExpand,
    onLoad,
    onRightClick,
    onSelect,
    selectable = true,
    selectedKeys,
    showIcon = false,
    showLine = false,
    style,
    styles: stylesProp,
    switcherIcon,
    switcherLoadingIcon,
    titleRender,
    treeData = [],
    ...rootProps
  } = treeProps;
  const tree = useMemo(() => normalizeTree(treeData, fieldNames), [fieldNames, treeData]);
  const initialExpanded = defaultExpandAll
    ? tree.all.filter((node) => node.children.length > 0).map((node) => node.key)
    : [...defaultExpandedKeys];
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<ReadonlyArray<Key>>(() =>
    defaultExpandParent ? [...keysWithParents(initialExpanded, tree)] : initialExpanded,
  );
  const [internalSelectedKeys, setInternalSelectedKeys] =
    useState<ReadonlyArray<Key>>(defaultSelectedKeys);
  const [internalCheckedKeys, setInternalCheckedKeys] =
    useState<ReadonlyArray<Key>>(defaultCheckedKeys);
  const [internalLoadedKeys, setInternalLoadedKeys] = useState<ReadonlyArray<Key>>([]);
  const [loadingKeys, setLoadingKeys] = useState<ReadonlySet<Key>>(new Set());
  const [draggedKey, setDraggedKey] = useState<Key | undefined>(undefined);
  const [dropTarget, setDropTarget] = useState<
    { readonly key: Key; readonly position: -1 | 0 | 1 } | undefined
  >(undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<Key, HTMLLIElement>());
  const resolvedExpandedKeys = expandedKeys ?? internalExpandedKeys;
  const expandedSet = autoExpandParent
    ? keysWithParents([...resolvedExpandedKeys], tree)
    : new Set(resolvedExpandedKeys);
  const resolvedSelectedKeys = selectedKeys ?? internalSelectedKeys;
  const resolvedLoadedKeys = loadedKeys ?? internalLoadedKeys;
  const checkedSource = checkedKeys ?? internalCheckedKeys;
  const checkState = resolveCheckedState(checkedSource, tree, checkStrictly);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: treeProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: treeProps }) : (stylesProp ?? {});

  const commitExpanded = useCallback(
    (next: ReadonlyArray<Key>, node: TreeDataNode, expanded: boolean) => {
      if (expandedKeys === undefined) setInternalExpandedKeys(next);
      onExpand?.(next, { expanded, node });
    },
    [expandedKeys, onExpand],
  );

  const toggleExpanded = useCallback(
    async (node: NormalizedNode) => {
      if (disabled || node.data.disabled) return;
      const isExpanded = expandedSet.has(node.key);
      const next = isExpanded
        ? resolvedExpandedKeys.filter((key) => !Object.is(key, node.key))
        : [...resolvedExpandedKeys, node.key];
      commitExpanded(next, node.data, !isExpanded);
      if (
        !isExpanded &&
        loadData !== undefined &&
        node.data.isLeaf !== true &&
        node.children.length === 0 &&
        !hasKey(resolvedLoadedKeys, node.key) &&
        !loadingKeys.has(node.key)
      ) {
        setLoadingKeys((current) => new Set(current).add(node.key));
        try {
          await loadData(node.data);
          const nextLoaded = [...resolvedLoadedKeys, node.key];
          if (loadedKeys === undefined) setInternalLoadedKeys(nextLoaded);
          onLoad?.(nextLoaded, { node: node.data });
        } finally {
          setLoadingKeys((current) => {
            const nextLoading = new Set(current);
            nextLoading.delete(node.key);
            return nextLoading;
          });
        }
      }
    },
    [
      commitExpanded,
      disabled,
      expandedSet,
      loadData,
      loadedKeys,
      loadingKeys,
      onLoad,
      resolvedExpandedKeys,
      resolvedLoadedKeys,
    ],
  );

  const selectNode = (
    node: NormalizedNode,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => {
    if (disabled || node.data.disabled || !selectable || node.data.selectable === false) return;
    const selected = hasKey(resolvedSelectedKeys, node.key);
    let next: ReadonlyArray<Key>;
    if (multiple && (event.metaKey || event.ctrlKey)) {
      next = selected
        ? resolvedSelectedKeys.filter((key) => !Object.is(key, node.key))
        : [...resolvedSelectedKeys, node.key];
    } else next = selected && !multiple ? [] : [node.key];
    if (selectedKeys === undefined) setInternalSelectedKeys(next);
    onSelect?.(next, {
      event,
      node: node.data,
      selected: hasKey(next, node.key),
      selectedNodes: next.flatMap((key) => {
        const selectedNode = tree.byKey.get(key);
        return selectedNode ? [selectedNode.data] : [];
      }),
    });
  };

  const toggleChecked = (
    node: NormalizedNode,
    event: ChangeEvent<HTMLInputElement> | KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement>,
  ) => {
    if (disabled || node.data.disabled || node.data.disableCheckbox) return;
    const isChecked = checkState.checked.has(node.key);
    const nextBase = new Set(checkState.checked);
    const affected = checkStrictly ? [node] : [node, ...descendants(node)];
    for (const item of affected) {
      if (item.data.disabled || item.data.disableCheckbox) continue;
      if (isChecked) nextBase.delete(item.key);
      else nextBase.add(item.key);
    }
    const nextState = resolveCheckedState([...nextBase], tree, checkStrictly);
    const nextChecked = [...nextState.checked];
    if (checkedKeys === undefined) setInternalCheckedKeys(nextChecked);
    const callbackValue: TreeCheckedKeys = checkStrictly
      ? { checked: nextChecked, halfChecked: [...nextState.halfChecked] }
      : nextChecked;
    onCheck?.(callbackValue, {
      checked: !isChecked,
      checkedNodes: nextChecked.flatMap((key) => {
        const checkedNode = tree.byKey.get(key);
        return checkedNode ? [checkedNode.data] : [];
      }),
      event,
      halfCheckedKeys: [...nextState.halfChecked],
      node: node.data,
    });
  };

  useImperativeHandle(
    forwardedRef,
    () => ({
      get nativeElement() {
        return rootRef.current;
      },
      scrollTo({ align = "auto", key, offset = 0 }) {
        const root = rootRef.current;
        const item = itemRefs.current.get(key);
        if (!root || !item) return;
        const top = relativeScrollTop(root, item);
        if (align === "auto") {
          if (top < root.scrollTop) root.scrollTo({ top: top + offset });
          else if (top + item.offsetHeight > root.scrollTop + root.clientHeight) {
            root.scrollTo({ top: top - root.clientHeight + item.offsetHeight + offset });
          }
        } else {
          root.scrollTo({
            top:
              align === "bottom"
                ? top - root.clientHeight + item.offsetHeight + offset
                : top + offset,
          });
        }
      },
    }),
    [],
  );

  const renderNodes = (nodes: ReadonlyArray<NormalizedNode>) => (
    <ul className="launch-ui-tree-group" role={nodes === tree.roots ? "tree" : "group"}>
      {nodes.map((node) => {
        const nodeDisabled = disabled || node.data.disabled === true;
        const expanded = expandedSet.has(node.key);
        const selected = hasKey(resolvedSelectedKeys, node.key);
        const checked = checkState.checked.has(node.key);
        const halfChecked = checkState.halfChecked.has(node.key);
        const loading = loadingKeys.has(node.key);
        const hasChildren = node.children.length > 0;
        const expandable =
          node.data.isLeaf === false ||
          hasChildren ||
          (loadData !== undefined && node.data.isLeaf !== true);
        const isLeaf = node.data.isLeaf ?? !expandable;
        const renderProps: TreeNodeRenderProps = {
          checked,
          data: node.data,
          disabled: nodeDisabled,
          expanded,
          halfChecked,
          isLeaf,
          loading,
          selected,
        };
        const customSwitcher = renderNodeIcon(node.data.switcherIcon ?? switcherIcon, renderProps);
        const customIcon = renderNodeIcon(node.data.icon ?? icon, renderProps);
        const showLeafIcon = typeof showLine === "object" ? showLine.showLeafIcon : true;
        const lineLeafIcon =
          showLeafIcon === true ? (
            <FileOutlined />
          ) : showLeafIcon === false ? null : (
            renderNodeIcon(showLeafIcon, renderProps)
          );
        const displayedIcon =
          customIcon ??
          (showLine || showIcon ? (
            isLeaf ? (
              lineLeafIcon
            ) : expanded ? (
              <FolderOpenOutlined />
            ) : (
              <FolderOutlined />
            )
          ) : undefined);
        const draggableNode = isNodeDraggable(draggable, node.data) && !nodeDisabled;
        const configuredDragIcon = dragIcon(draggable);
        const dropPosition = dropTarget?.key === node.key ? dropTarget.position : undefined;
        const title = titleRender?.(node.data) ?? node.title;
        const rowKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
          if (event.key === "ArrowRight" && expandable && !expanded) {
            event.preventDefault();
            void toggleExpanded(node);
          } else if (event.key === "ArrowLeft" && expanded) {
            event.preventDefault();
            void toggleExpanded(node);
          } else if (event.key === "Enter") {
            event.preventDefault();
            selectNode(node, event);
          } else if (event.key === " " && checkable && node.data.checkable !== false) {
            event.preventDefault();
            toggleChecked(node, event);
          }
        };
        return (
          <li
            aria-checked={checkable ? (halfChecked ? "mixed" : checked) : undefined}
            aria-disabled={nodeDisabled || undefined}
            aria-expanded={expandable ? expanded : undefined}
            aria-selected={selectable ? selected : undefined}
            className={classes(
              "launch-ui-tree-node",
              showLine && "has-line",
              dropPosition === -1 && "is-drop-before",
              dropPosition === 0 && "is-drop-inside",
              dropPosition === 1 && "is-drop-after",
              node.data.className,
            )}
            draggable={draggableNode}
            key={String(node.key)}
            onContextMenu={(event) => onRightClick?.({ event, node: node.data })}
            onDoubleClick={(event) => {
              onDoubleClick?.(event, node.data);
              if (expandAction === "doubleClick" && expandable) void toggleExpanded(node);
            }}
            onDragEnd={(event) => {
              event.stopPropagation();
              setDraggedKey(undefined);
              setDropTarget(undefined);
              onDragEnd?.({ event, node: node.data });
            }}
            onDragEnter={(event) => {
              event.stopPropagation();
              if (draggedKey === undefined || Object.is(draggedKey, node.key)) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientY - rect.top) / Math.min(rect.height, 24);
              const position: -1 | 0 | 1 = ratio < 0.25 ? -1 : ratio > 0.75 ? 1 : 0;
              if (allowDrop?.({ dropNode: node.data, dropPosition: position }) === false) return;
              event.preventDefault();
              setDropTarget({ key: node.key, position });
              onDragEnter?.({ event, expandedKeys: [...expandedSet], node: node.data });
            }}
            onDragLeave={(event) => {
              event.stopPropagation();
              onDragLeave?.({ event, node: node.data });
            }}
            onDragOver={(event) => {
              event.stopPropagation();
              if (draggedKey === undefined || Object.is(draggedKey, node.key)) return;
              event.preventDefault();
              onDragOver?.({ event, node: node.data });
            }}
            onDragStart={(event) => {
              event.stopPropagation();
              setDraggedKey(node.key);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(node.key));
              onDragStart?.({ event, node: node.data });
            }}
            onDrop={(event) => {
              if (draggedKey === undefined || Object.is(draggedKey, node.key)) return;
              event.preventDefault();
              event.stopPropagation();
              const draggedNode = tree.byKey.get(draggedKey);
              if (!draggedNode) return;
              const position = dropTarget?.position ?? 0;
              onDrop?.({
                dragNode: draggedNode.data,
                dragNodesKeys: [
                  draggedNode.key,
                  ...descendants(draggedNode).map((item) => item.key),
                ],
                dropPosition: position,
                dropToGap: position !== 0,
                event,
                node: node.data,
              });
              setDraggedKey(undefined);
              setDropTarget(undefined);
            }}
            onKeyDown={rowKeyDown}
            ref={(element) => {
              if (element) itemRefs.current.set(node.key, element);
              else itemRefs.current.delete(node.key);
            }}
            role="treeitem"
            style={node.data.style}
            tabIndex={nodeDisabled ? -1 : 0}
          >
            <div
              className={classes(
                "launch-ui-tree-item",
                blockNode && "is-block",
                selected && "is-selected",
                nodeDisabled && "is-disabled",
                filterTreeNode?.(node.data) && "is-filtered",
                draggedKey !== undefined && Object.is(draggedKey, node.key) && "is-dragging",
                resolvedClassNames.item,
              )}
              style={resolvedStyles.item}
            >
              {draggableNode && configuredDragIcon !== false ? (
                <span aria-hidden="true" className="launch-ui-tree-drag-handle">
                  {configuredDragIcon ?? <HolderOutlined />}
                </span>
              ) : null}
              {expandable ? (
                <button
                  aria-label={expanded ? "Collapse" : "Expand"}
                  className={classes(
                    "launch-ui-tree-switcher",
                    expanded && "is-expanded",
                    customSwitcher === undefined && !loading && "is-default",
                  )}
                  disabled={nodeDisabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggleExpanded(node);
                  }}
                  tabIndex={-1}
                  type="button"
                >
                  {loading
                    ? (switcherLoadingIcon ?? <LoadingIcon />)
                    : (customSwitcher ?? <CaretDownOutlined />)}
                </button>
              ) : (
                <span aria-hidden="true" className="launch-ui-tree-switcher is-leaf" />
              )}
              {checkable && node.data.checkable !== false ? (
                <span>
                  <Checkbox
                    checked={checked}
                    disabled={nodeDisabled || node.data.disableCheckbox}
                    indeterminate={halfChecked}
                    onChange={(event) => toggleChecked(node, event)}
                    tabIndex={-1}
                  />
                </span>
              ) : null}
              {showIcon || showLine ? (
                <span
                  aria-hidden="true"
                  className={classes(
                    "launch-ui-tree-icon",
                    expandAction === "click" && expandable && "is-expandable",
                  )}
                  onClick={
                    expandAction === "click" && expandable
                      ? (event) => {
                          event.stopPropagation();
                          void toggleExpanded(node);
                        }
                      : undefined
                  }
                >
                  {displayedIcon}
                </span>
              ) : null}
              <span
                className={classes("launch-ui-tree-title", resolvedClassNames.itemTitle)}
                onClick={(event) => {
                  selectNode(node, event);
                  if (expandAction === "click" && expandable) void toggleExpanded(node);
                }}
                style={resolvedStyles.itemTitle}
              >
                {title}
              </span>
            </div>
            {hasChildren ? (
              <div
                aria-hidden={!expanded}
                className={classes("launch-ui-tree-children", expanded && "is-expanded")}
                inert={!expanded}
              >
                <div className="launch-ui-tree-children-inner">{renderNodes(node.children)}</div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div
      {...rootProps}
      className={classes(
        "launch-ui-tree",
        blockNode && "is-block",
        disabled && "is-disabled",
        showLine && "has-line",
        resolvedClassNames.root,
        className,
      )}
      ref={rootRef}
      style={{
        ...(height === undefined ? {} : { height, overflow: "auto" }),
        ...resolvedStyles.root,
        ...style,
      }}
    >
      {renderNodes(tree.roots)}
    </div>
  );
}

const TreeRoot = forwardRef<TreeRef, TreeProps>(TreeInner);

export interface DirectoryTreeProps extends TreeProps {
  readonly expandAction?: false | "click" | "doubleClick";
}

export const DirectoryTree = forwardRef<TreeRef, DirectoryTreeProps>(function DirectoryTree(
  { className, expandAction = "click", ...props },
  ref,
) {
  return (
    <TreeRoot
      {...props}
      className={classes("launch-ui-directory-tree", className)}
      expandAction={expandAction}
      ref={ref}
      showIcon
    />
  );
});

export function useTree(treeData: ReadonlyArray<TreeDataNode>, fieldNames?: TreeFieldNames) {
  const tree = useMemo(() => normalizeTree(treeData, fieldNames), [fieldNames, treeData]);
  return {
    getPath(key: Key) {
      const path: TreeDataNode[] = [];
      let node = tree.byKey.get(key);
      while (node) {
        path.unshift(node.data);
        node = node.parentKey === undefined ? undefined : tree.byKey.get(node.parentKey);
      }
      return path;
    },
  };
}

interface TreeComponent extends ForwardRefExoticComponent<TreeProps & RefAttributes<TreeRef>> {
  readonly DirectoryTree: typeof DirectoryTree;
  readonly useTree: typeof useTree;
}

export const Tree = Object.assign(TreeRoot, { DirectoryTree, useTree }) as TreeComponent;

import { type Key, useMemo, useRef, useState } from "react";
import {
  CheckOutlined,
  FrownFilled,
  FrownOutlined,
  MehOutlined,
  SmileOutlined,
} from "../../src/icons.js";
import {
  Button,
  Flex,
  Input,
  Select,
  Space,
  Switch,
  Tree,
  type TreeCheckedKeys,
  type TreeDataNode,
  type TreeRef,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const basicTreeData: ReadonlyArray<TreeDataNode> = [
  {
    key: "0-0",
    title: "parent 1",
    children: [
      {
        key: "0-0-0",
        title: "parent 1-0",
        disabled: true,
        children: [
          { key: "0-0-0-0", title: "leaf", disableCheckbox: true },
          { key: "0-0-0-1", title: "leaf" },
        ],
      },
      {
        key: "0-0-1",
        title: "parent 1-1",
        children: [{ key: "0-0-1-0", title: "project notes" }],
      },
    ],
  },
];

function BasicTree() {
  return (
    <Tree
      checkable
      defaultCheckedKeys={["0-0-0", "0-0-1"]}
      defaultExpandedKeys={["0-0-0", "0-0-1"]}
      defaultSelectedKeys={["0-0-1"]}
      treeData={basicTreeData}
    />
  );
}

const controlledTreeData: ReadonlyArray<TreeDataNode> = [
  {
    key: "0-0",
    title: "0-0",
    children: [
      {
        key: "0-0-0",
        title: "0-0-0",
        children: [
          { key: "0-0-0-0", title: "0-0-0-0" },
          { key: "0-0-0-1", title: "0-0-0-1" },
          { key: "0-0-0-2", title: "0-0-0-2" },
        ],
      },
      {
        key: "0-0-1",
        title: "0-0-1",
        children: [
          { key: "0-0-1-0", title: "0-0-1-0" },
          { key: "0-0-1-1", title: "0-0-1-1" },
          { key: "0-0-1-2", title: "0-0-1-2" },
        ],
      },
      { key: "0-0-2", title: "0-0-2" },
    ],
  },
  { key: "0-1", title: "0-1", children: [{ key: "0-1-0", title: "0-1-0" }] },
  { key: "0-2", title: "0-2" },
];

function ControlledTree() {
  const [expandedKeys, setExpandedKeys] = useState<ReadonlyArray<Key>>(["0-0-0", "0-0-1"]);
  const [checkedKeys, setCheckedKeys] = useState<TreeCheckedKeys>(["0-0-0"]);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlyArray<Key>>([]);
  return (
    <Tree
      checkable
      checkedKeys={checkedKeys}
      expandedKeys={expandedKeys}
      onCheck={setCheckedKeys}
      onExpand={setExpandedKeys}
      onSelect={setSelectedKeys}
      selectedKeys={selectedKeys}
      treeData={controlledTreeData}
    />
  );
}

function treeTitle(node: TreeDataNode) {
  return typeof node.title === "string" ? node.title : String(node.key);
}

function SearchableTree() {
  const [query, setQuery] = useState("");
  const expandedKeys = query ? ["0-0", "0-0-0", "0-0-1", "0-1"] : ["0-0"];
  const titleRender = (node: TreeDataNode) => {
    const title = treeTitle(node);
    const index = title.toLowerCase().indexOf(query.toLowerCase());
    if (!query || index < 0) return title;
    return (
      <span>
        {title.slice(0, index)}
        <mark>{title.slice(index, index + query.length)}</mark>
        {title.slice(index + query.length)}
      </span>
    );
  };
  return (
    <Flex className="showcase-tree-search" gap="small" vertical>
      <Input.Search
        allowClear
        aria-label="Search tree nodes"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search"
        value={query}
      />
      <Tree
        expandedKeys={expandedKeys}
        filterTreeNode={(node) =>
          query.length > 0 && treeTitle(node).toLowerCase().includes(query.toLowerCase())
        }
        titleRender={titleRender}
        treeData={controlledTreeData}
      />
    </Flex>
  );
}

const iconTreeData: ReadonlyArray<TreeDataNode> = [
  {
    key: "icons-parent",
    title: "parent 1",
    icon: <SmileOutlined />,
    children: [
      { key: "icons-meh", title: "leaf", icon: <MehOutlined /> },
      {
        key: "icons-face",
        title: "selectable leaf",
        icon: ({ selected }) => (selected ? <FrownFilled /> : <FrownOutlined />),
      },
    ],
  },
];

function IconTree() {
  const [showLine, setShowLine] = useState(true);
  const [showIcon, setShowIcon] = useState(true);
  const [leafIcon, setLeafIcon] = useState<"custom" | "false" | "true">("true");
  const showLeafIcon = leafIcon === "custom" ? <CheckOutlined /> : leafIcon === "true";
  return (
    <Flex gap="medium" vertical>
      <Space wrap>
        <Space>
          <Typography.Text>Show line</Typography.Text>
          <Switch checked={showLine} onChange={setShowLine} size="small" />
        </Space>
        <Space>
          <Typography.Text>Show icon</Typography.Text>
          <Switch checked={showIcon} onChange={setShowIcon} size="small" />
        </Space>
        <Select
          aria-label="Leaf icon"
          onChange={(value) => {
            if (value === "custom" || value === "false" || value === "true") setLeafIcon(value);
          }}
          options={[
            { label: "Leaf icon", value: "true" },
            { label: "No leaf icon", value: "false" },
            { label: "Custom leaf icon", value: "custom" },
          ]}
          value={leafIcon}
        />
      </Space>
      <Tree
        defaultExpandAll
        defaultSelectedKeys={["icons-meh"]}
        showIcon={showIcon}
        showLine={showLine ? { showLeafIcon } : false}
        treeData={iconTreeData}
      />
    </Flex>
  );
}

function updateTreeData(
  nodes: ReadonlyArray<TreeDataNode>,
  key: Key,
  children: ReadonlyArray<TreeDataNode>,
): ReadonlyArray<TreeDataNode> {
  return nodes.map((node) => {
    if (Object.is(node.key, key)) return { ...node, children };
    return node.children
      ? { ...node, children: updateTreeData(node.children, key, children) }
      : node;
  });
}

function AsyncTree() {
  const [treeData, setTreeData] = useState<ReadonlyArray<TreeDataNode>>([
    { key: "load-0", title: "Expand to load" },
    { key: "load-1", title: "Expand to load" },
    { key: "load-2", title: "Tree node", isLeaf: true },
  ]);
  const loadData = (node: TreeDataNode) =>
    new Promise<void>((resolve) => {
      window.setTimeout(() => {
        setTreeData((current) =>
          updateTreeData(current, node.key, [
            { key: `${String(node.key)}-0`, title: "Child node", isLeaf: true },
            { key: `${String(node.key)}-1`, title: "Child node", isLeaf: true },
          ]),
        );
        resolve();
      }, 600);
    });
  return <Tree loadData={loadData} treeData={treeData} />;
}

function DraggableTree() {
  const [lastMove, setLastMove] = useState("Drag a node to see the drop result.");
  return (
    <Flex gap="small" vertical>
      <Tree
        blockNode
        defaultExpandAll
        draggable
        onDrop={({ dragNode, dropPosition, node }) =>
          setLastMove(
            `${treeTitle(dragNode)} dropped ${dropPosition === 0 ? "inside" : dropPosition < 0 ? "before" : "after"} ${treeTitle(node)}`,
          )
        }
        treeData={controlledTreeData.slice(0, 2)}
      />
      <Typography.Text type="secondary">{lastMove}</Typography.Text>
    </Flex>
  );
}

function DirectoryTreeDemo() {
  return (
    <Tree.DirectoryTree
      defaultExpandAll
      multiple
      treeData={[
        {
          key: "directory-0",
          title: "Projects",
          children: [
            { key: "directory-0-0", title: "Launch++", isLeaf: true },
            { key: "directory-0-1", title: "Website", isLeaf: true },
          ],
        },
        {
          key: "directory-1",
          title: "Archive",
          children: [{ key: "directory-1-0", title: "2025", isLeaf: true }],
        },
      ]}
    />
  );
}

function createDeepTree(key = "0", level = 1): TreeDataNode {
  return {
    key,
    title: key,
    ...(level < 5
      ? {
          children: [0, 1].map((index) => createDeepTree(`${key}-${index}`, level + 1)),
        }
      : {}),
  };
}

const deepTreeData = [createDeepTree()];

function ScrollableTree() {
  const ref = useRef<TreeRef>(null);
  const [expandedKeys, setExpandedKeys] = useState<ReadonlyArray<Key>>([]);
  const { getPath } = Tree.useTree(deepTreeData);
  const targetKey = "0-1-1-1-1";
  const scrollToTarget = () => {
    setExpandedKeys(getPath(targetKey).map((node) => node.key));
    window.requestAnimationFrame(() => ref.current?.scrollTo({ align: "top", key: targetKey }));
  };
  return (
    <Flex gap="small" vertical>
      <Button onClick={scrollToTarget}>Scroll to: {targetKey}</Button>
      <Tree
        className="showcase-tree-scroll"
        expandedKeys={expandedKeys}
        height={200}
        onExpand={setExpandedKeys}
        ref={ref}
        treeData={deepTreeData}
      />
    </Flex>
  );
}

function SemanticTree() {
  const styles = useMemo(
    () => ({
      item: { marginBlock: 2 },
      itemTitle: { fontSize: 13 },
      root: { border: "1px solid #d9d9d9", borderRadius: 6, padding: 8 },
    }),
    [],
  );
  return (
    <Tree
      checkable
      classNames={{ root: "showcase-tree-semantic" }}
      defaultExpandAll
      styles={styles}
      treeData={basicTreeData}
    />
  );
}

export const treeShowcase = defineShowcase({
  id: "tree",
  name: "Tree",
  category: "Data display",
  stage: "prod",
  description: "Displays nested data as an expandable, selectable hierarchy.",
  whenToUse: [
    "Use Tree for directories, project structures, organization hierarchies, and other nested relationships.",
    "Use checkboxes when users need to choose related parent and child nodes together.",
    "Use List instead when the content has no parent-child relationship.",
  ],
  examples: [
    {
      id: "tree-basic",
      name: "Basic",
      description: "Nodes can be expanded, selected, checked, or disabled independently.",
      preview: BasicTree,
      code: `<Tree
  checkable
  defaultExpandedKeys={["0-0-0", "0-0-1"]}
  defaultSelectedKeys={["0-0-1"]}
  defaultCheckedKeys={["0-0-0", "0-0-1"]}
  treeData={treeData}
/>`,
    },
    {
      id: "tree-controlled",
      name: "Controlled tree",
      description: "Expansion, selection, and checking can all be managed by the parent.",
      preview: ControlledTree,
      code: `<Tree
  checkable
  expandedKeys={expandedKeys}
  checkedKeys={checkedKeys}
  selectedKeys={selectedKeys}
  onExpand={setExpandedKeys}
  onCheck={setCheckedKeys}
  onSelect={setSelectedKeys}
  treeData={treeData}
/>`,
    },
    {
      id: "tree-search",
      name: "Searchable",
      description: "Compose Tree with Input.Search and highlight matching node titles.",
      preview: SearchableTree,
      code: `<Input.Search value={query} onChange={(event) => setQuery(event.target.value)} />
<Tree
  expandedKeys={query ? parentKeys : []}
  filterTreeNode={(node) => title(node).includes(query)}
  titleRender={renderHighlightedTitle}
  treeData={treeData}
/>`,
    },
    {
      id: "tree-icons-lines",
      name: "Icons and connecting lines",
      description: "Show node icons, connecting lines, and a configurable leaf icon.",
      preview: IconTree,
      code: `<Tree
  showIcon
  showLine={{ showLeafIcon: <CheckOutlined /> }}
  defaultExpandAll
  treeData={treeData}
/>`,
    },
    {
      id: "tree-async",
      name: "Load data asynchronously",
      description: "Load children when a non-leaf node is expanded for the first time.",
      preview: AsyncTree,
      code: `<Tree loadData={loadData} treeData={treeData} />`,
    },
    {
      id: "tree-draggable",
      name: "Draggable",
      description:
        "Native drag events report whether a node was dropped before, inside, or after another node.",
      preview: DraggableTree,
      code: `<Tree
  draggable
  blockNode
  onDrop={({ dragNode, node, dropPosition }) => updateData(dragNode, node, dropPosition)}
  treeData={treeData}
/>`,
    },
    {
      id: "tree-directory",
      name: "Directory tree",
      description: "DirectoryTree provides folder and file visuals with full-row selection.",
      preview: DirectoryTreeDemo,
      code: `<Tree.DirectoryTree multiple defaultExpandAll treeData={treeData} />`,
    },
    {
      id: "tree-scroll",
      name: "Scroll to nested node",
      description: "Expand a node path and scroll a constrained tree to the target.",
      preview: ScrollableTree,
      code: `const treeRef = useRef<TreeRef>(null);
const { getPath } = Tree.useTree(treeData);

setExpandedKeys(getPath(targetKey).map((node) => node.key));
treeRef.current?.scrollTo({ key: targetKey, align: "top" });`,
    },
    {
      id: "tree-semantic",
      name: "Semantic styling",
      description: "Customize the public root, item, and item title parts.",
      preview: SemanticTree,
      code: `<Tree
  classNames={{ root: "custom-tree" }}
  styles={{
    root: { border: "1px solid #d9d9d9", padding: 8 },
    item: { marginBlock: 2 },
    itemTitle: { fontSize: 13 },
  }}
  treeData={treeData}
/>`,
    },
  ],
  api: [
    {
      name: "treeData",
      description: "Hierarchical node data with unique keys.",
      type: "TreeDataNode[]",
    },
    {
      name: "checkable",
      description: "Displays checkboxes before nodes.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "checkStrictly",
      description: "Stops parent and child checkbox states from affecting each other.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "checkedKeys",
      description: "Controlled checked and optionally half-checked keys.",
      type: "TreeCheckedKeys",
    },
    { name: "expandedKeys", description: "Controlled expanded node keys.", type: "Key[]" },
    { name: "selectedKeys", description: "Controlled selected node keys.", type: "Key[]" },
    {
      name: "defaultExpandAll",
      description: "Expands every existing parent on first render.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "multiple",
      description: "Allows modifier-assisted multiple selection.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "selectable",
      description: "Allows node title selection.",
      type: "boolean",
      defaultValue: "true",
    },
    {
      name: "blockNode",
      description: "Makes each node row fill the available width.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "showIcon",
      description: "Displays node icons.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "showLine",
      description: "Displays connecting lines and optionally a custom leaf icon.",
      type: "boolean | { showLeafIcon?: TreeNodeIcon | boolean }",
      defaultValue: "false",
    },
    {
      name: "switcherIcon",
      description: "Custom expansion control icon or render function.",
      type: "TreeNodeIcon",
    },
    {
      name: "titleRender",
      description: "Custom node title renderer.",
      type: "(node) => ReactNode",
    },
    {
      name: "filterTreeNode",
      description: "Highlights nodes for which the function returns true.",
      type: "(node) => boolean",
    },
    {
      name: "loadData",
      description: "Loads a node's children when it first expands.",
      type: "(node) => Promise<unknown>",
    },
    {
      name: "draggable",
      description: "Enables native node drag and drop.",
      type: "boolean | function | config",
      defaultValue: "false",
    },
    {
      name: "height",
      description: "Constrains the tree height and enables vertical scrolling.",
      type: "number",
    },
    {
      name: "fieldNames",
      description: "Maps custom key, title, and children field names.",
      type: "TreeFieldNames",
    },
    {
      name: "classNames",
      description: "Classes for root, item, and itemTitle parts.",
      type: "TreeClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for root, item, and itemTitle parts.",
      type: "TreeStyles | function",
    },
  ],
  accessibility: [
    "Arrow Right expands a focused parent, Arrow Left collapses it, Enter selects it, and Space toggles its checkbox.",
    "Every node exposes treeitem state for expansion, selection, checking, and disabled status.",
    "Do not communicate hierarchy or selection using color alone; retain titles, indentation, and icons.",
  ],
});

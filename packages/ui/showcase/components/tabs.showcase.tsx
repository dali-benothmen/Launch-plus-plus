import { useRef, useState } from "react";
import { AndroidOutlined, AppleOutlined, HeartOutlined, PlusOutlined } from "../../src/icons.js";
import {
  Button,
  Space,
  type TabItem,
  Tabs,
  type TabsIndicatorAlign,
  type TabsPlacement,
  type TabsSize,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const basicItems: ReadonlyArray<TabItem> = [
  { key: "1", label: "Tab 1", children: "Content of Tab Pane 1" },
  { key: "2", label: "Tab 2", children: "Content of Tab Pane 2" },
  { key: "3", label: "Tab 3", children: "Content of Tab Pane 3" },
];

function BasicTabs() {
  const [message, setMessage] = useState("Active tab: 1");
  return (
    <Space size="large" vertical>
      <Tabs
        defaultActiveKey="1"
        items={basicItems}
        onChange={(key) => setMessage(`Active tab: ${key}`)}
      />
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function DisabledTabs() {
  return (
    <Tabs
      defaultActiveKey="1"
      items={[
        { key: "1", label: "Tab 1", children: "Tab 1" },
        { key: "2", label: "Tab 2", children: "Tab 2", disabled: true },
        { key: "3", label: "Tab 3", children: "Tab 3" },
      ]}
    />
  );
}

function CenteredTabs() {
  return <Tabs centered defaultActiveKey="1" items={basicItems} />;
}

function IconTabs() {
  return (
    <Tabs
      defaultActiveKey="2"
      items={[
        { key: "1", label: "Apple", children: "Apple tab", icon: <AppleOutlined /> },
        { key: "2", label: "Android", children: "Android tab", icon: <AndroidOutlined /> },
        { key: "3", label: "Favorites", children: "Favorites tab", icon: <HeartOutlined /> },
      ]}
    />
  );
}

function IndicatorTabs() {
  const [align, setAlign] = useState<TabsIndicatorAlign>("center");
  return (
    <Space size="large" vertical>
      <div className="showcase-tabs-controls">
        {(["start", "center", "end"] as const).map((value) => (
          <Button
            key={value}
            onClick={() => setAlign(value)}
            variant={align === value ? "primary" : "default"}
          >
            {value}
          </Button>
        ))}
      </div>
      <Tabs
        defaultActiveKey="1"
        indicator={{ align, size: (origin) => origin - 20 }}
        items={basicItems}
      />
    </Space>
  );
}

const manyItems: ReadonlyArray<TabItem> = Array.from({ length: 20 }, (_, index) => ({
  children: `Content of tab ${index}`,
  disabled: index === 18,
  key: String(index),
  label: `Tab-${index}`,
}));

function OverflowTabs() {
  return (
    <div className="showcase-tabs-overflow">
      <Tabs defaultActiveKey="1" items={manyItems} onTabScroll={() => undefined} />
    </div>
  );
}

function ExtraContentTabs() {
  return (
    <div className="showcase-tabs-stack">
      <Tabs items={basicItems} tabBarExtraContent={<Button>Extra action</Button>} />
      <Tabs
        items={basicItems}
        tabBarExtraContent={{
          left: <Button>Left action</Button>,
          right: <Button>Right action</Button>,
        }}
      />
    </div>
  );
}

function SizeTabs() {
  const [size, setSize] = useState<TabsSize>("medium");
  return (
    <Space size="large" vertical>
      <div className="showcase-tabs-controls">
        {(["small", "medium", "large"] as const).map((value) => (
          <Button
            key={value}
            onClick={() => setSize(value)}
            variant={size === value ? "primary" : "default"}
          >
            {value}
          </Button>
        ))}
      </div>
      <Tabs items={basicItems} size={size} />
      <Tabs items={basicItems} size={size} type="card" />
    </Space>
  );
}

function PlacementTabs() {
  const [placement, setPlacement] = useState<TabsPlacement>("start");
  return (
    <Space size="large" vertical>
      <div className="showcase-tabs-controls">
        {(["top", "bottom", "start", "end"] as const).map((value) => (
          <Button
            key={value}
            onClick={() => setPlacement(value)}
            variant={placement === value ? "primary" : "default"}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="showcase-tabs-placement">
        <Tabs items={basicItems} tabPlacement={placement} />
      </div>
    </Space>
  );
}

function CardTabs() {
  return <Tabs defaultActiveKey="1" items={basicItems} type="card" />;
}

const initialEditableItems: ReadonlyArray<TabItem> = [
  { key: "1", label: "Tab 1", children: "Content of Tab 1" },
  { key: "2", label: "Tab 2", children: "Content of Tab 2" },
  { key: "3", label: "Tab 3", children: "Content of Tab 3", closable: false },
];

function EditableTabs() {
  const nextIndex = useRef(1);
  const [items, setItems] = useState<ReadonlyArray<TabItem>>(initialEditableItems);
  const [activeKey, setActiveKey] = useState("1");

  const add = () => {
    const key = `new-${nextIndex.current++}`;
    setItems((current) => [...current, { key, label: "New Tab", children: `Content of ${key}` }]);
    setActiveKey(key);
  };

  const remove = (targetKey: string) => {
    const targetIndex = items.findIndex((item) => item.key === targetKey);
    const remaining = items.filter((item) => item.key !== targetKey);
    if (activeKey === targetKey && remaining.length > 0) {
      setActiveKey(remaining[Math.min(targetIndex, remaining.length - 1)]?.key ?? "");
    }
    setItems(remaining);
  };

  return (
    <Tabs
      activeKey={activeKey}
      items={items}
      onChange={setActiveKey}
      onEdit={(target, action) => {
        if (action === "add") add();
        else if (typeof target === "string") remove(target);
      }}
      type="editable-card"
    />
  );
}

function CustomAddTabs() {
  const nextIndex = useRef(3);
  const [items, setItems] = useState<ReadonlyArray<TabItem>>(basicItems);
  const add = () => {
    const key = String(nextIndex.current++);
    setItems((current) => [...current, { key, label: "New Tab", children: "New tab content" }]);
  };
  return (
    <Space size="large" vertical>
      <Button icon={<PlusOutlined />} onClick={add}>
        Add tab
      </Button>
      <Tabs hideAdd items={items} type="editable-card" />
    </Space>
  );
}

function SemanticTabs() {
  return (
    <Tabs
      classNames={{ root: "showcase-tabs-semantic-root" }}
      defaultActiveKey="1"
      items={basicItems}
      styles={{
        content: { padding: 16 },
        header: { background: "var(--launch-ui-fill-quaternary)" },
        indicator: { height: 4 },
        item: { paddingInline: 10 },
      }}
    />
  );
}

export const tabsShowcase = defineShowcase({
  id: "tabs",
  name: "Tabs",
  category: "Navigation",
  stage: "prod",
  description: "Makes related views easy to explore and switch between without leaving context.",
  usage: `import { Tabs } from "@launchpp/ui";`,
  whenToUse: [
    "Use line tabs for peer views within the same page context.",
    "Use card tabs for closely related document-style views, and editable cards only when users manage those views.",
  ],
  examples: [
    {
      id: "tabs-basic",
      name: "Basic",
      description:
        "The first enabled item is active by default unless a different key is provided.",
      preview: BasicTabs,
      code: `<Tabs
  defaultActiveKey="1"
  items={[
    { key: "1", label: "Tab 1", children: "Content of Tab Pane 1" },
    { key: "2", label: "Tab 2", children: "Content of Tab Pane 2" },
    { key: "3", label: "Tab 3", children: "Content of Tab Pane 3" },
  ]}
  onChange={(key) => setActiveKey(key)}
/>`,
    },
    {
      id: "tabs-disabled",
      name: "Disabled",
      description: "Disable individual views that are currently unavailable.",
      preview: DisabledTabs,
      code: `<Tabs items={[
  { key: "1", label: "Tab 1", children: "Tab 1" },
  { key: "2", label: "Tab 2", children: "Tab 2", disabled: true },
  { key: "3", label: "Tab 3", children: "Tab 3" },
]} />`,
    },
    {
      id: "tabs-centered",
      name: "Centered",
      description: "Center the complete tab list in the available header width.",
      preview: CenteredTabs,
      code: `<Tabs centered items={items} />`,
    },
    {
      id: "tabs-icons",
      name: "Icons",
      description: "Icons and bare SVG elements stay vertically centered with their labels.",
      preview: IconTabs,
      code: `<Tabs items={[
  { key: "1", label: "Apple", icon: <AppleOutlined />, children: "Apple tab" },
  { key: "2", label: "Android", icon: <AndroidOutlined />, children: "Android tab" },
]} />`,
    },
    {
      id: "tabs-indicator",
      name: "Indicator",
      description: "Customize the active indicator length and alignment.",
      preview: IndicatorTabs,
      code: `<Tabs
  indicator={{ align: "center", size: (origin) => origin - 20 }}
  items={items}
/>`,
    },
    {
      id: "tabs-overflow",
      name: "Overflow",
      description:
        "Long tab lists remain horizontally scrollable without compressing their labels.",
      preview: OverflowTabs,
      code: `<Tabs items={manyItems} onTabScroll={({ direction }) => track(direction)} />`,
    },
    {
      id: "tabs-extra",
      name: "Extra content",
      description: "Place actions on either side of the tab bar.",
      preview: ExtraContentTabs,
      code: `<Tabs tabBarExtraContent={<Button>Extra action</Button>} items={items} />
<Tabs
  tabBarExtraContent={{ left: <Button>Left</Button>, right: <Button>Right</Button> }}
  items={items}
/>`,
    },
    {
      id: "tabs-size",
      name: "Size",
      description: "Choose small, medium, or large density for line and card tabs.",
      preview: SizeTabs,
      code: `<Tabs size="small" items={items} />
<Tabs size="medium" type="card" items={items} />`,
    },
    {
      id: "tabs-placement",
      name: "Placement",
      description: "Place the tab bar at the top, bottom, start, or end of the content.",
      preview: PlacementTabs,
      code: `<Tabs tabPlacement="start" items={items} />`,
    },
    {
      id: "tabs-card",
      name: "Card tabs",
      description: "Use card styling for document-like views that belong together.",
      preview: CardTabs,
      code: `<Tabs type="card" items={items} />`,
    },
    {
      id: "tabs-editable",
      name: "Add and close tabs",
      description:
        "Editable cards expose add and close events while the application owns the items.",
      preview: EditableTabs,
      code: `<Tabs
  activeKey={activeKey}
  items={items}
  onChange={setActiveKey}
  onEdit={handleEdit}
  type="editable-card"
/>`,
    },
    {
      id: "tabs-custom-add",
      name: "Custom add trigger",
      description: "Hide the built-in add control when the page provides its own action.",
      preview: CustomAddTabs,
      code: `<Button onClick={add}>Add tab</Button>
<Tabs hideAdd items={items} type="editable-card" />`,
    },
    {
      id: "tabs-semantic",
      name: "Semantic styling",
      description: "Customize documented slots with classes or prop-aware style objects.",
      preview: SemanticTabs,
      code: `<Tabs
  classNames={{ root: "project-tabs" }}
  styles={{ header: { background: "#fafafa" }, content: { padding: 16 } }}
  items={items}
/>`,
    },
  ],
  api: [
    {
      name: "activeKey / defaultActiveKey",
      type: "string",
      description: "Controls or initializes the active tab key.",
    },
    {
      name: "items",
      type: "TabItem[]",
      defaultValue: "[]",
      description: "Defines each tab label, content, icon, state, and lifecycle behavior.",
    },
    {
      name: "type",
      type: '"line" | "card" | "editable-card"',
      defaultValue: '"line"',
      description: "Sets the tab presentation and editing behavior.",
    },
    {
      name: "size",
      type: '"large" | "medium" | "small"',
      defaultValue: '"medium"',
      description: "Sets tab bar density.",
    },
    {
      name: "tabPlacement",
      type: '"top" | "bottom" | "start" | "end"',
      defaultValue: '"top"',
      description: "Positions the tab bar around its content.",
    },
    {
      name: "centered",
      type: "boolean",
      defaultValue: "false",
      description: "Centers horizontal tabs in the available width.",
    },
    {
      name: "indicator",
      type: "{ size?; align? }",
      description: "Customizes the line indicator length and alignment.",
    },
    {
      name: "animated",
      type: "boolean | { inkBar?; tabPane? }",
      description: "Controls indicator and content transitions.",
    },
    {
      name: "tabBarExtraContent",
      type: "ReactNode | { left?; right? }",
      description: "Adds actions around the tab bar.",
    },
    { name: "tabBarGutter", type: "number", description: "Sets the space between tab items." },
    {
      name: "destroyOnHidden",
      type: "boolean",
      defaultValue: "false",
      description: "Unmounts inactive content instead of preserving it.",
    },
    {
      name: "hideAdd",
      type: "boolean",
      defaultValue: "false",
      description: "Hides the built-in editable-card add control.",
    },
    {
      name: "addIcon / removeIcon",
      type: "ReactNode",
      description: "Customizes editable-card controls.",
    },
    { name: "onChange", type: "(activeKey) => void", description: "Reports active tab changes." },
    {
      name: "onEdit",
      type: "(target, action) => void",
      description: "Reports editable-card add and remove requests.",
    },
    {
      name: "onTabClick",
      type: "(key, event) => void",
      description: "Reports every enabled tab click.",
    },
    {
      name: "onTabScroll",
      type: "({ direction }) => void",
      description: "Reports native tab-bar scrolling direction.",
    },
    {
      name: "classNames / styles",
      type: "TabsSlots | (info) => TabsSlots",
      description: "Customizes documented semantic elements.",
    },
  ],
  accessibility: [
    "The tab list, tabs, and panels use the WAI-ARIA tab pattern supplied by Radix.",
    "Arrow keys move focus between enabled tabs; Home and End move to the first and last enabled tabs.",
    "Editable controls have explicit add and close labels, while disabled tabs remain unavailable to interaction.",
  ],
});

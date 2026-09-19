import { useMemo, useState } from "react";
import {
  AppstoreOutlined,
  CalendarOutlined,
  ContainerOutlined,
  DesktopOutlined,
  LinkOutlined,
  MailOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PieChartOutlined,
  SettingOutlined,
} from "../../src/icons.js";
import {
  Button,
  Flex,
  Menu,
  type MenuItem,
  type MenuMode,
  type MenuTheme,
  Space,
  Switch,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const navigationItems: ReadonlyArray<MenuItem> = [
  {
    children: [
      {
        children: [
          { key: "1", label: "Option 1" },
          { key: "2", label: "Option 2" },
        ],
        key: "g1",
        label: "Item 1",
        type: "group",
      },
      {
        children: [
          { key: "3", label: "Option 3" },
          { key: "4", label: "Option 4" },
        ],
        key: "g2",
        label: "Item 2",
        type: "group",
      },
    ],
    icon: <MailOutlined />,
    key: "sub1",
    label: "Navigation One",
  },
  {
    children: [
      { key: "5", label: "Option 5" },
      { key: "6", label: "Option 6" },
      {
        children: [
          { key: "7", label: "Option 7" },
          { key: "8", label: "Option 8" },
        ],
        key: "sub3",
        label: "Submenu",
      },
    ],
    icon: <AppstoreOutlined />,
    key: "sub2",
    label: "Navigation Two",
  },
  { type: "divider" },
  {
    children: [
      { key: "9", label: "Option 9" },
      { key: "10", label: "Option 10" },
      { key: "11", label: "Option 11" },
      { key: "12", label: "Option 12" },
    ],
    icon: <SettingOutlined />,
    key: "sub4",
    label: "Navigation Three",
  },
  {
    children: [
      { key: "13", label: "Option 13" },
      { key: "14", label: "Option 14" },
    ],
    key: "group",
    label: "Group",
    type: "group",
  },
];

const collapsedItems: ReadonlyArray<MenuItem> = [
  { icon: <PieChartOutlined />, key: "1", label: "Option 1", title: "Option 1" },
  { icon: <DesktopOutlined />, key: "2", label: "Option 2", title: "Option 2" },
  { icon: <ContainerOutlined />, key: "3", label: "Option 3", title: "Option 3" },
  {
    children: [
      { key: "5", label: "Option 5" },
      { key: "6", label: "Option 6" },
      { key: "7", label: "Option 7" },
      { key: "8", label: "Option 8" },
    ],
    icon: <MailOutlined />,
    key: "sub1",
    label: "Navigation One",
    title: "Navigation One",
  },
  {
    children: [
      { key: "9", label: "Option 9" },
      { key: "10", label: "Option 10" },
      {
        children: [
          { key: "11", label: "Option 11" },
          { key: "12", label: "Option 12" },
        ],
        key: "sub3",
        label: "Submenu",
      },
    ],
    icon: <AppstoreOutlined />,
    key: "sub2",
    label: "Navigation Two",
    title: "Navigation Two",
  },
];

function TopNavigation() {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlyArray<string>>(["mail"]);
  return (
    <Menu
      items={[
        { icon: <MailOutlined />, key: "mail", label: "Navigation One" },
        {
          disabled: true,
          icon: <AppstoreOutlined />,
          key: "app",
          label: "Navigation Two",
        },
        {
          children: navigationItems.slice(0, 2),
          icon: <SettingOutlined />,
          key: "submenu",
          label: "Navigation Three - Submenu",
        },
        {
          key: "link",
          label: (
            <a href="https://launchpp.dev" rel="noreferrer" target="_blank">
              Navigation Four - Link
            </a>
          ),
        },
      ]}
      mode="horizontal"
      onSelect={({ selectedKeys: keys }) => setSelectedKeys(keys)}
      selectedKeys={selectedKeys}
    />
  );
}

function InlineMenu() {
  return (
    <Menu
      defaultOpenKeys={["sub1"]}
      defaultSelectedKeys={["1"]}
      items={navigationItems}
      mode="inline"
      style={{ width: 256 }}
    />
  );
}

function CollapsedInlineMenu() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="showcase-menu-column">
      <Button
        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed((current) => !current)}
        variant="primary"
      />
      <Menu
        defaultOpenKeys={["sub1"]}
        defaultSelectedKeys={["1"]}
        inlineCollapsed={collapsed}
        items={collapsedItems}
        mode="inline"
        theme="dark"
      />
    </div>
  );
}

function TooltipMenu() {
  const [collapsed, setCollapsed] = useState(true);
  const [tooltipEnabled, setTooltipEnabled] = useState(true);
  return (
    <div className="showcase-menu-column">
      <Flex align="center" gap="small">
        <Button
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed((current) => !current)}
          variant="primary"
        />
        <Switch
          ariaLabel="Enable collapsed menu tooltips"
          checked={tooltipEnabled}
          onCheckedChange={setTooltipEnabled}
        />
        <Typography.Text>Tooltips</Typography.Text>
      </Flex>
      <Menu
        defaultSelectedKeys={["1"]}
        inlineCollapsed={collapsed}
        items={collapsedItems}
        mode="inline"
        theme="dark"
        tooltip={tooltipEnabled ? { placement: "right" } : false}
      />
    </div>
  );
}

function collectLevels(
  items: ReadonlyArray<MenuItem>,
  level = 1,
  result = new Map<string, number>(),
) {
  for (const item of items) {
    if (item.type === "divider") continue;
    if (item.key !== undefined) result.set(item.key, level);
    if ("children" in item) collectLevels(item.children, level + 1, result);
  }
  return result;
}

function SingleOpenMenu() {
  const levels = useMemo(() => collectLevels(navigationItems), []);
  const [openKeys, setOpenKeys] = useState<ReadonlyArray<string>>(["sub2", "sub3"]);
  const handleOpenChange = (nextKeys: ReadonlyArray<string>) => {
    const addedKey = nextKeys.find((key) => !openKeys.includes(key));
    if (addedKey === undefined) {
      setOpenKeys(nextKeys);
      return;
    }
    const addedLevel = levels.get(addedKey);
    setOpenKeys(
      nextKeys.filter(
        (key) =>
          key === addedKey || (levels.get(key) ?? Number.POSITIVE_INFINITY) < (addedLevel ?? 0),
      ),
    );
  };

  return (
    <Menu
      defaultSelectedKeys={["7"]}
      items={navigationItems}
      mode="inline"
      onOpenChange={handleOpenChange}
      openKeys={openKeys}
      style={{ width: 256 }}
    />
  );
}

function VerticalMenu() {
  return <Menu items={navigationItems.slice(0, 3)} mode="vertical" style={{ width: 256 }} />;
}

function ThemeMenu() {
  const [theme, setTheme] = useState<MenuTheme>("dark");
  return (
    <div className="showcase-menu-column">
      <Flex align="center" gap="small">
        <Switch
          ariaLabel="Use dark menu theme"
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
        <Typography.Text>{theme === "dark" ? "Dark" : "Light"}</Typography.Text>
      </Flex>
      <Menu
        defaultOpenKeys={["sub1"]}
        defaultSelectedKeys={["1"]}
        items={navigationItems.slice(0, 3)}
        mode="inline"
        theme={theme}
      />
    </div>
  );
}

function SubMenuTheme() {
  const [subTheme, setSubTheme] = useState<MenuTheme>("light");
  return (
    <div className="showcase-menu-column">
      <Flex align="center" gap="small">
        <Switch
          ariaLabel="Use dark submenu theme"
          checked={subTheme === "dark"}
          onCheckedChange={(checked) => setSubTheme(checked ? "dark" : "light")}
        />
        <Typography.Text>Submenu: {subTheme}</Typography.Text>
      </Flex>
      <Menu
        items={[
          {
            children: [
              { key: "1", label: "Option 1" },
              { key: "2", label: "Option 2" },
              { key: "3", label: "Option 3" },
            ],
            icon: <MailOutlined />,
            key: "sub1",
            label: "Navigation One",
            theme: subTheme,
          },
          { key: "5", label: "Option 5" },
          { key: "6", label: "Option 6" },
        ]}
        mode="vertical"
        theme="dark"
        triggerSubMenuAction="click"
      />
    </div>
  );
}

const dynamicItems: ReadonlyArray<MenuItem> = [
  { icon: <MailOutlined />, key: "1", label: "Navigation One" },
  { icon: <CalendarOutlined />, key: "2", label: "Navigation Two" },
  {
    children: [
      { key: "3", label: "Option 3" },
      { key: "4", label: "Option 4" },
      {
        children: [
          { key: "5", label: "Option 5" },
          { key: "6", label: "Option 6" },
        ],
        key: "sub1-2",
        label: "Submenu",
      },
    ],
    icon: <AppstoreOutlined />,
    key: "sub1",
    label: "Navigation Three",
  },
  { icon: <LinkOutlined />, key: "link", label: "Launch++" },
];

function DynamicMenu() {
  const [mode, setMode] = useState<MenuMode>("inline");
  const [theme, setTheme] = useState<MenuTheme>("light");
  return (
    <div className="showcase-menu-column">
      <Flex align="center" gap="medium" wrap="wrap">
        <Flex align="center" gap="small">
          <Switch
            ariaLabel="Use vertical menu mode"
            checked={mode === "vertical"}
            onCheckedChange={(checked) => setMode(checked ? "vertical" : "inline")}
          />
          <Typography.Text>Vertical mode</Typography.Text>
        </Flex>
        <Flex align="center" gap="small">
          <Switch
            ariaLabel="Use dark menu theme"
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
          <Typography.Text>Dark theme</Typography.Text>
        </Flex>
      </Flex>
      <Menu
        defaultOpenKeys={["sub1"]}
        defaultSelectedKeys={["1"]}
        items={dynamicItems}
        mode={mode}
        theme={theme}
      />
    </div>
  );
}

function SemanticMenu() {
  return (
    <Space size="large" vertical>
      <Menu
        classNames={{ root: "showcase-menu-semantic-root" }}
        items={navigationItems.slice(0, 2)}
        styles={{ item: { color: "var(--launch-ui-primary)" } }}
      />
      <Menu
        classNames={{ root: "showcase-menu-semantic-root" }}
        defaultOpenKeys={["sub1"]}
        items={navigationItems.slice(0, 2)}
        mode="inline"
        styles={({ props }) => ({
          root: { background: props.items?.length ? "var(--launch-ui-primary-bg)" : undefined },
          subMenuList: { color: "var(--launch-ui-error)" },
        })}
      />
    </Space>
  );
}

function FeatureItem({
  description,
  title,
}: {
  readonly description: string;
  readonly title: string;
}) {
  return (
    <div className="showcase-menu-feature-item">
      <Typography.Text strong>{title}</Typography.Text>
      <Typography.Text type="secondary">{description}</Typography.Text>
    </div>
  );
}

function CustomPopupMenu() {
  return (
    <Menu
      items={[
        { key: "home", label: "Home" },
        {
          children: [
            {
              key: "getting-started",
              label: (
                <FeatureItem
                  description="Quick start guide and learn the basics."
                  title="Getting Started"
                />
              ),
            },
            {
              key: "components",
              label: (
                <FeatureItem description="Explore our component library." title="Components" />
              ),
            },
            {
              key: "templates",
              label: <FeatureItem description="Ready-to-use project patterns." title="Templates" />,
            },
          ],
          key: "features",
          label: "Features",
        },
        {
          children: [
            {
              key: "blog",
              label: <FeatureItem description="Latest updates and articles." title="Blog" />,
            },
            {
              key: "community",
              label: <FeatureItem description="Join our developer community." title="Community" />,
            },
          ],
          key: "resources",
          label: "Resources",
        },
      ]}
      mode="horizontal"
      popupRender={(menu, { item }) => (
        <div className="showcase-menu-custom-popup">
          <Typography.Title level={3}>{item.label}</Typography.Title>
          {menu}
        </div>
      )}
    />
  );
}

export const menuShowcase = defineShowcase({
  id: "menu",
  name: "Menu",
  category: "Navigation",
  stage: "prod",
  description: "Provides horizontal, vertical, and collapsible navigation from one item model.",
  usage: `import { Menu } from "@launchpp/ui";`,
  whenToUse: [
    "Use a horizontal menu for primary product areas and an inline menu for deeper side navigation.",
    "Keep menu labels concise and organize more than one nested level into intentional groups.",
  ],
  examples: [
    {
      id: "menu-horizontal",
      name: "Top navigation",
      description: "Use horizontal mode for primary categories and product functions.",
      preview: TopNavigation,
      code: `<Menu
  mode="horizontal"
  items={items}
  selectedKeys={selectedKeys}
  onSelect={({ selectedKeys }) => setSelectedKeys(selectedKeys)}
/>`,
    },
    {
      id: "menu-inline",
      name: "Inline menu",
      description: "Expand nested navigation directly inside a side menu.",
      preview: InlineMenu,
      code: `<Menu
  mode="inline"
  items={items}
  defaultSelectedKeys={["1"]}
  defaultOpenKeys={["sub1"]}
/>`,
    },
    {
      id: "menu-collapsed",
      name: "Collapsed inline menu",
      description:
        "Collapse an inline menu to an icon rail while retaining popup access to children.",
      preview: CollapsedInlineMenu,
      code: `<Menu
  mode="inline"
  theme="dark"
  inlineCollapsed={collapsed}
  items={items}
/>`,
    },
    {
      id: "menu-tooltip",
      name: "Menu tooltip",
      description: "Show or disable labels as tooltips while the inline menu is collapsed.",
      preview: TooltipMenu,
      code: `<Menu
  mode="inline"
  inlineCollapsed={collapsed}
  tooltip={tooltipEnabled ? { placement: "right" } : false}
  items={items}
/>`,
    },
    {
      id: "menu-single-open",
      name: "Open current submenu only",
      description: "Control openKeys to keep only the relevant branch expanded at each level.",
      preview: SingleOpenMenu,
      code: `<Menu
  mode="inline"
  items={items}
  openKeys={openKeys}
  onOpenChange={setOpenKeys}
/>`,
    },
    {
      id: "menu-vertical",
      name: "Vertical menu",
      description: "In vertical mode, nested navigation opens in adjacent popups.",
      preview: VerticalMenu,
      code: `<Menu mode="vertical" items={items} />`,
    },
    {
      id: "menu-themes",
      name: "Menu themes",
      description: "Menus include light and dark surface treatments.",
      preview: ThemeMenu,
      code: `<Menu mode="inline" theme={theme} items={items} />`,
    },
    {
      id: "menu-submenu-theme",
      name: "Submenu theme",
      description: "A popup submenu may override the theme inherited from its root menu.",
      preview: SubMenuTheme,
      code: `const items = [{
  key: "projects",
  label: "Projects",
  theme: submenuTheme,
  children: projectItems,
}];`,
    },
    {
      id: "menu-dynamic",
      name: "Switch the menu type",
      description: "Mode and theme can respond to the surrounding application layout.",
      preview: DynamicMenu,
      code: `<Menu mode={mode} theme={theme} items={items} />`,
    },
    {
      id: "menu-semantic-styles",
      name: "Semantic styling",
      description: "Customize documented menu slots with style objects or prop-aware functions.",
      preview: SemanticMenu,
      code: `<Menu
  classNames={{ root: "project-menu" }}
  styles={{ item: { color: "var(--launch-ui-primary)" } }}
  items={items}
/>`,
    },
    {
      id: "menu-custom-popup",
      name: "Custom submenu render",
      description: "Wrap popup menu content with richer navigation context.",
      preview: CustomPopupMenu,
      code: `<Menu
  mode="horizontal"
  items={items}
  popupRender={(menu, { item }) => (
    <div className="navigation-popup">
      <Typography.Title level={3}>{item.label}</Typography.Title>
      {menu}
    </div>
  )}
/>`,
    },
  ],
  api: [
    {
      name: "items",
      type: "MenuItem[]",
      defaultValue: "[]",
      description: "Defines items, submenus, groups, and dividers.",
    },
    {
      name: "mode",
      type: '"horizontal" | "inline" | "vertical"',
      defaultValue: '"vertical"',
      description: "Selects the menu layout and submenu presentation.",
    },
    {
      name: "selectedKeys / defaultSelectedKeys",
      type: "string[]",
      description: "Controls or initializes selected menu items.",
    },
    {
      name: "openKeys / defaultOpenKeys",
      type: "string[]",
      description: "Controls or initializes expanded submenus.",
    },
    {
      name: "selectable / multiple",
      type: "boolean",
      defaultValue: "true / false",
      description: "Configures item selection and whether more than one item can be selected.",
    },
    {
      name: "inlineCollapsed",
      type: "boolean",
      defaultValue: "false",
      description: "Collapses inline navigation to an icon rail.",
    },
    {
      name: "inlineIndent",
      type: "number",
      defaultValue: "24",
      description: "Sets the indentation added at each inline nesting level.",
    },
    {
      name: "theme",
      type: '"light" | "dark"',
      defaultValue: '"light"',
      description: "Sets the menu surface and text theme.",
    },
    {
      name: "triggerSubMenuAction",
      type: '"hover" | "click"',
      defaultValue: '"hover"',
      description: "Chooses how popup submenus are opened.",
    },
    {
      name: "tooltip",
      type: "false | { placement? }",
      description: "Configures labels shown for collapsed leaf items.",
    },
    {
      name: "expandIcon",
      type: "ReactNode | (info) => ReactNode",
      description: "Replaces the inline submenu expansion indicator.",
    },
    {
      name: "popupRender",
      type: "(menu, { item, keys }) => ReactNode",
      description: "Wraps popup submenu content globally or on one submenu item.",
    },
    {
      name: "onClick / onSelect / onDeselect",
      type: "(info) => void",
      description: "Reports activation and selection changes with keys and item data.",
    },
    {
      name: "onOpenChange",
      type: "(openKeys: string[]) => void",
      description: "Reports expanded inline or popup submenus.",
    },
    {
      name: "classNames / styles",
      type: "MenuSlots | (info) => MenuSlots",
      description: "Customizes documented semantic elements.",
    },
  ],
  accessibility: [
    "Menu renders semantic menu, menuitem, group, and separator roles.",
    "Leaf items support Enter and Space selection; submenu triggers are native buttons.",
    "Disabled items are removed from keyboard interaction and expose aria-disabled.",
  ],
});

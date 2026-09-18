import { useRef, useState } from "react";
import {
  DownOutlined,
  EllipsisOutlined,
  LogoutOutlined,
  SettingOutlined,
  SmileOutlined,
  UserOutlined,
} from "../../src/icons.js";
import {
  Button,
  Divider,
  Dropdown,
  type DropdownMenuItem,
  Flex,
  type LinkProps,
  Space,
  Tooltip,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const basicItems: ReadonlyArray<DropdownMenuItem> = [
  { key: "1", label: "1st menu item" },
  { disabled: true, icon: <SmileOutlined />, key: "2", label: "2nd menu item (disabled)" },
  { disabled: true, key: "3", label: "3rd menu item (disabled)" },
  { danger: true, key: "4", label: "A danger item" },
];

const standardItems: ReadonlyArray<DropdownMenuItem> = [
  { key: "1", label: "1st menu item" },
  { key: "2", label: "2nd menu item" },
  { key: "3", label: "3rd menu item" },
];

function DropdownLink({ children, onClick, ...props }: LinkProps) {
  return (
    <Typography.Link
      {...props}
      href="#dropdown"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) event.preventDefault();
      }}
    >
      <Space>
        {children}
        <DownOutlined />
      </Space>
    </Typography.Link>
  );
}

function BasicDropdown() {
  return (
    <Dropdown menu={{ items: basicItems }}>
      <DropdownLink>Hover me</DropdownLink>
    </Dropdown>
  );
}

function PlacementDropdowns() {
  const placements = [
    "bottomLeft",
    "bottom",
    "bottomRight",
    "topLeft",
    "top",
    "topRight",
    "leftTop",
    "left",
    "leftBottom",
    "rightTop",
    "right",
    "rightBottom",
  ] as const;

  return (
    <Flex gap="small" wrap="wrap">
      {placements.map((placement) => (
        <Dropdown key={placement} menu={{ items: standardItems }} placement={placement}>
          <Button>{placement}</Button>
        </Dropdown>
      ))}
    </Flex>
  );
}

function OtherElementsDropdown() {
  return (
    <Dropdown
      menu={{
        items: [
          { key: "1", label: "1st menu item" },
          { key: "2", label: "2nd menu item" },
          { type: "divider" },
          { disabled: true, key: "3", label: "3rd menu item (disabled)" },
        ],
      }}
    >
      <DropdownLink>Hover me</DropdownLink>
    </Dropdown>
  );
}

function ClickDropdown() {
  return (
    <Dropdown menu={{ items: standardItems }} trigger={["click"]}>
      <DropdownLink>Click me</DropdownLink>
    </Dropdown>
  );
}

const actionItems: ReadonlyArray<DropdownMenuItem> = [
  { icon: <UserOutlined />, key: "1", label: "1st menu item" },
  { icon: <UserOutlined />, key: "2", label: "2nd menu item" },
  { danger: true, icon: <UserOutlined />, key: "3", label: "3rd menu item" },
  {
    danger: true,
    disabled: true,
    icon: <UserOutlined />,
    key: "4",
    label: "4th menu item",
  },
];

function ButtonDropdowns() {
  const [message, setMessage] = useState("Choose an action");
  const menu = {
    items: actionItems,
    onClick: ({ key }: { readonly key: string }) => setMessage(`Clicked menu item ${key}`),
  };

  return (
    <Space vertical size="medium">
      <Flex gap="small" wrap="wrap">
        <Space.Compact>
          <Button onClick={() => setMessage("Clicked the primary action")}>Dropdown</Button>
          <Dropdown menu={menu} placement="bottomRight">
            <Button aria-label="Open actions" icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space.Compact>
        <Space.Compact>
          <Button onClick={() => setMessage("Clicked the account action")}>Dropdown</Button>
          <Dropdown menu={menu} placement="bottomRight">
            <Button aria-label="Open account actions" icon={<UserOutlined />} />
          </Dropdown>
        </Space.Compact>
        <Space.Compact>
          <Button disabled>Dropdown</Button>
          <Dropdown disabled menu={menu} placement="bottomRight">
            <Button disabled icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space.Compact>
        <Space.Compact>
          <Tooltip title="Tooltip">
            <Button>With Tooltip</Button>
          </Tooltip>
          <Dropdown menu={menu} placement="bottomRight">
            <Button aria-label="Loading actions" loading />
          </Dropdown>
        </Space.Compact>
        <Dropdown menu={menu}>
          <Button icon={<DownOutlined />} iconPlacement="end">
            Button
          </Button>
        </Dropdown>
        <Space.Compact>
          <Button danger>Danger</Button>
          <Dropdown menu={menu} placement="bottomRight">
            <Button aria-label="Open danger actions" danger icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space.Compact>
      </Flex>
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function CascadingDropdown() {
  return (
    <Dropdown
      menu={{
        items: [
          {
            children: [
              { key: "1-1", label: "1st menu item" },
              { key: "1-2", label: "2nd menu item" },
            ],
            key: "1",
            label: "Group title",
            type: "group",
          },
          {
            children: [
              { key: "2-1", label: "3rd menu item" },
              { key: "2-2", label: "4th menu item" },
            ],
            key: "2",
            label: "Sub menu",
          },
          {
            children: [
              { key: "3-1", label: "5th menu item" },
              { key: "3-2", label: "6th menu item" },
            ],
            disabled: true,
            key: "3",
            label: "Disabled sub menu",
          },
        ],
      }}
    >
      <DropdownLink>Cascading menu</DropdownLink>
    </Dropdown>
  );
}

function ContextDropdown() {
  return (
    <Dropdown menu={{ items: standardItems }} trigger={["contextMenu"]}>
      <div className="showcase-dropdown-context">Right click here</div>
    </Dropdown>
  );
}

function SelectableDropdown() {
  return (
    <Dropdown
      menu={{
        defaultSelectedKeys: ["3"],
        items: [
          { key: "1", label: "Item 1" },
          { key: "2", label: "Item 2" },
          { key: "3", label: "Item 3" },
        ],
        selectable: true,
      }}
    >
      <DropdownLink>Selectable</DropdownLink>
    </Dropdown>
  );
}

function SemanticDropdowns() {
  const items: ReadonlyArray<DropdownMenuItem> = [
    { key: "1", label: "Profile" },
    { icon: <SettingOutlined />, key: "2", label: "Settings" },
    { type: "divider" },
    { danger: true, icon: <LogoutOutlined />, key: "3", label: "Logout" },
  ];

  return (
    <Flex gap="medium" wrap="wrap">
      <Dropdown
        classNames={{ root: "showcase-dropdown-semantic-root" }}
        menu={{ items }}
        styles={{ item: { padding: "8px 12px" }, itemTitle: { fontWeight: 500 } }}
      >
        <Button icon={<DownOutlined />} iconPlacement="end">
          Object styles
        </Button>
      </Dropdown>
      <Dropdown
        menu={{ items }}
        styles={({ props }) => ({
          root: props.trigger?.includes("click")
            ? { border: "1px solid var(--launch-ui-primary)", borderRadius: 8 }
            : {},
        })}
        trigger={["click"]}
      >
        <Button icon={<DownOutlined />} iconPlacement="end" variant="primary">
          Function styles
        </Button>
      </Dropdown>
    </Flex>
  );
}

function ExtraDropdown() {
  return (
    <Dropdown
      menu={{
        items: [
          { disabled: true, key: "1", label: "My Account" },
          { type: "divider" },
          { extra: "⌘P", key: "2", label: "Profile" },
          { extra: "⌘B", key: "3", label: "Billing" },
          { extra: "⌘S", icon: <SettingOutlined />, key: "4", label: "Settings" },
        ],
      }}
    >
      <DropdownLink>Hover me</DropdownLink>
    </Dropdown>
  );
}

function ArrowDropdowns() {
  const placements = ["bottomLeft", "bottom", "bottomRight", "topLeft", "top", "topRight"] as const;

  return (
    <Flex gap="small" wrap="wrap">
      {placements.map((placement) => (
        <Dropdown arrow key={placement} menu={{ items: standardItems }} placement={placement}>
          <Button>{placement}</Button>
        </Dropdown>
      ))}
    </Flex>
  );
}

function CenteredArrowDropdowns() {
  return (
    <Flex gap="small" wrap="wrap">
      {(["bottomLeft", "bottom", "bottomRight", "topLeft", "top", "topRight"] as const).map(
        (placement) => (
          <Dropdown
            arrow={{ pointAtCenter: true }}
            key={placement}
            menu={{ items: standardItems }}
            placement={placement}
          >
            <Button>{placement}</Button>
          </Dropdown>
        ),
      )}
    </Flex>
  );
}

function ClickEventDropdown() {
  const [message, setMessage] = useState("Click a menu item");
  return (
    <Space vertical>
      <Dropdown
        menu={{
          items: standardItems,
          onClick: ({ key }) => setMessage(`Clicked item ${key}`),
        }}
      >
        <DropdownLink>Hover me, then click a menu item</DropdownLink>
      </Dropdown>
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function CustomDropdown() {
  return (
    <Dropdown
      menu={{ items: basicItems.slice(0, 3) }}
      popupRender={(menu) => (
        <div>
          {menu}
          <Divider style={{ margin: 0 }} />
          <div className="showcase-dropdown-footer">
            <Button variant="primary">Click me!</Button>
          </div>
        </div>
      )}
    >
      <DropdownLink>Hover me</DropdownLink>
    </Dropdown>
  );
}

function LoadingDropdowns() {
  const [loading, setLoading] = useState(false);
  const startLoading = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1600);
  };

  return (
    <Space vertical>
      <Space.Compact>
        <Button loading variant="primary">
          Submit
        </Button>
        <Dropdown menu={{ items: [{ key: "continue", label: "Submit and continue" }] }}>
          <Button icon={<EllipsisOutlined />} variant="primary" />
        </Dropdown>
      </Space.Compact>
      <Space.Compact>
        <Button loading={loading} onClick={startLoading} variant="primary">
          Submit
        </Button>
        <Dropdown menu={{ items: [{ key: "continue", label: "Submit and continue" }] }}>
          <Button icon={<EllipsisOutlined />} variant="primary" />
        </Dropdown>
      </Space.Compact>
    </Space>
  );
}

interface SelectionInfo {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

function SelectionDropdown() {
  const paragraphRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionInfo>();
  const [message, setMessage] = useState("Select text to reveal its actions");

  const readSelection = () => {
    const selected = window.getSelection();
    const text = selected?.toString().trim();
    if (!selected || !text || selected.rangeCount === 0) {
      setSelection(undefined);
      return;
    }
    const range = selected.getRangeAt(0);
    if (!paragraphRef.current?.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setSelection({ text, x: rect.left + rect.width / 2, y: rect.bottom + 4 });
  };

  return (
    <>
      <Dropdown
        menu={{
          items: [
            { key: "mask", label: "Mask keyword" },
            { key: "mark", label: "Mark keyword" },
            { key: "search", label: "Search keyword" },
          ],
          onClick: ({ key }) => {
            if (selection !== undefined) setMessage(`${key}: ${selection.text}`);
            window.getSelection()?.removeAllRanges();
            setSelection(undefined);
          },
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelection(undefined);
        }}
        open={selection !== undefined}
        placement="bottom"
        trigger={[]}
      >
        <span
          aria-hidden="true"
          className="showcase-dropdown-selection-anchor"
          style={{ left: selection?.x ?? -9999, top: selection?.y ?? -9999 }}
        />
      </Dropdown>
      <section
        aria-label="Selectable example text"
        className="showcase-dropdown-selection"
        onMouseDown={() => setSelection(undefined)}
        onMouseUp={() => window.setTimeout(readSelection)}
        ref={paragraphRef}
      >
        Select any text in this paragraph to open a dropdown near the selection. This is useful for
        masking sensitive words, marking entities, or searching the selected keyword. Example data:
        Alice, phone 13800138000, ID 110101199001011234.
      </section>
      <Typography.Text type="secondary">{message}</Typography.Text>
    </>
  );
}

export const dropdownShowcase = defineShowcase({
  id: "dropdown",
  name: "Dropdown",
  category: "Navigation",
  stage: "prod",
  description: "Reveals a menu of related actions from a compact trigger.",
  usage: `import { Dropdown } from "@launchpp/ui";`,
  whenToUse: [
    "Use Dropdown when a visible control has more than a few related choices or secondary actions.",
    "Use click for deliberate actions, hover for quick desktop navigation, and context menu for actions tied to a surface.",
  ],
  examples: [
    {
      id: "dropdown-basic",
      name: "Basic",
      description: "The default trigger opens the menu on hover or keyboard focus.",
      preview: BasicDropdown,
      code: `<Dropdown menu={{ items }}>
  <Typography.Link>Hover me <DownOutlined /></Typography.Link>
</Dropdown>`,
    },
    {
      id: "dropdown-placement",
      name: "Placement",
      description: "Position the popup on any side and align it to either edge or the center.",
      preview: PlacementDropdowns,
      code: `<Dropdown menu={{ items }} placement="bottomLeft">
  <Button>bottomLeft</Button>
</Dropdown>`,
    },
    {
      id: "dropdown-other-elements",
      name: "Other elements",
      description: "Menus support dividers and disabled items.",
      preview: OtherElementsDropdown,
      code: `const items = [
  { key: "1", label: "1st menu item" },
  { type: "divider" },
  { key: "2", label: "Disabled item", disabled: true },
];`,
    },
    {
      id: "dropdown-click-trigger",
      name: "Trigger mode",
      description: "Use a click trigger when opening the menu should be deliberate.",
      preview: ClickDropdown,
      code: `<Dropdown menu={{ items }} trigger={["click"]}>
  <Typography.Link>Click me <DownOutlined /></Typography.Link>
</Dropdown>`,
    },
    {
      id: "dropdown-button",
      name: "Button with dropdown menu",
      description: "Combine a primary action with a related action menu.",
      preview: ButtonDropdowns,
      code: `<Space.Compact>
  <Button onClick={handleButtonClick}>Dropdown</Button>
  <Dropdown menu={{ items, onClick: handleMenuClick }} placement="bottomRight">
    <Button icon={<EllipsisOutlined />} />
  </Dropdown>
</Space.Compact>`,
    },
    {
      id: "dropdown-cascading",
      name: "Cascading menu",
      description: "Nest children under a menu item when choices have multiple levels.",
      preview: CascadingDropdown,
      code: `const items = [
  { key: "group", type: "group", label: "Group title", children: groupItems },
  { key: "submenu", label: "Sub menu", children: nestedItems },
];`,
    },
    {
      id: "dropdown-context-menu",
      name: "Context menu",
      description: "The popup follows the point where the user right-clicks.",
      preview: ContextDropdown,
      code: `<Dropdown menu={{ items }} trigger={["contextMenu"]}>
  <div>Right click here</div>
</Dropdown>`,
    },
    {
      id: "dropdown-selectable",
      name: "Selectable",
      description: "Enable selection when menu items represent a current choice.",
      preview: SelectableDropdown,
      code: `<Dropdown
  menu={{ items, selectable: true, defaultSelectedKeys: ["3"] }}
>
  <Typography.Link>Selectable</Typography.Link>
</Dropdown>`,
    },
    {
      id: "dropdown-semantic-styles",
      name: "Semantic styling",
      description: "Customize documented popup and item slots with objects or functions.",
      preview: SemanticDropdowns,
      code: `<Dropdown
  classNames={{ root: "project-dropdown" }}
  styles={{ item: { padding: "8px 12px" }, itemTitle: { fontWeight: 500 } }}
  menu={{ items }}
>
  <Button>Object styles</Button>
</Dropdown>`,
    },
    {
      id: "dropdown-extra",
      name: "Extra node",
      description: "Place keyboard shortcuts or supporting text at the end of an item.",
      preview: ExtraDropdown,
      code: `const items = [
  { key: "profile", label: "Profile", extra: "⌘P" },
  { key: "settings", label: "Settings", icon: <SettingOutlined />, extra: "⌘S" },
];`,
    },
    {
      id: "dropdown-arrow",
      name: "Arrow",
      description: "Add an arrow between the trigger and popup.",
      preview: ArrowDropdowns,
      code: `<Dropdown arrow menu={{ items }} placement="bottomLeft">
  <Button>bottomLeft</Button>
</Dropdown>`,
    },
    {
      id: "dropdown-centered-arrow",
      name: "Arrow pointing at the center",
      description: "Keep the arrow visually tied to the center of its trigger.",
      preview: CenteredArrowDropdowns,
      code: `<Dropdown arrow={{ pointAtCenter: true }} menu={{ items }}>
  <Button>bottomLeft</Button>
</Dropdown>`,
    },
    {
      id: "dropdown-click-event",
      name: "Click event",
      description: "Use the selected key to run the corresponding operation.",
      preview: ClickEventDropdown,
      code: `<Dropdown menu={{ items, onClick: ({ key }) => runAction(key) }}>
  <Typography.Link>Hover me, then click a menu item</Typography.Link>
</Dropdown>`,
    },
    {
      id: "dropdown-custom-popup",
      name: "Custom dropdown",
      description: "Wrap the standard menu with additional popup content.",
      preview: CustomDropdown,
      code: `<Dropdown
  menu={{ items }}
  popupRender={(menu) => <div>{menu}<Divider /><Button>Click me!</Button></div>}
>
  <Typography.Link>Hover me</Typography.Link>
</Dropdown>`,
    },
    {
      id: "dropdown-loading",
      name: "Loading",
      description: "Compose Dropdown with loading buttons for asynchronous actions.",
      preview: LoadingDropdowns,
      code: `<Space.Compact>
  <Button type="primary" loading>Submit</Button>
  <Dropdown menu={{ items }}>
    <Button icon={<EllipsisOutlined />} />
  </Dropdown>
</Space.Compact>`,
    },
    {
      id: "dropdown-selection-actions",
      name: "Selection actions",
      description:
        "Control the popup and anchor it near text selected with the browser Selection API.",
      preview: SelectionDropdown,
      code: `<Dropdown
  menu={{ items, onClick: handleAction }}
  open={Boolean(selection)}
  placement="bottom"
  trigger={[]}
>
  <span style={{ position: "fixed", left: selection?.x, top: selection?.y }} />
</Dropdown>`,
    },
  ],
  api: [
    {
      name: "menu",
      type: "DropdownMenuProps",
      description: "Defines items, selection behavior, and menu event handlers.",
    },
    {
      name: "trigger",
      type: '("hover" | "click" | "contextMenu")[]',
      defaultValue: '["hover"]',
      description: "Sets the interactions that open the popup.",
    },
    {
      name: "placement",
      type: "DropdownPlacement",
      defaultValue: '"bottomLeft"',
      description: "Positions and aligns the popup around its trigger.",
    },
    {
      name: "arrow",
      type: "boolean | { pointAtCenter?: boolean }",
      defaultValue: "false",
      description: "Shows an arrow that points toward the trigger.",
    },
    {
      name: "open / onOpenChange",
      type: "boolean / (open, info) => void",
      description: "Controls the popup and observes trigger- or menu-driven state changes.",
    },
    {
      name: "disabled",
      type: "boolean",
      defaultValue: "false",
      description: "Prevents the trigger from opening the menu.",
    },
    {
      name: "popupRender",
      type: "(menu: ReactNode) => ReactNode",
      description: "Wraps or replaces the rendered menu content.",
    },
    {
      name: "autoAdjustOverflow",
      type: "boolean",
      defaultValue: "true",
      description: "Moves the popup when its requested placement would leave the viewport.",
    },
    {
      name: "destroyOnHidden",
      type: "boolean",
      defaultValue: "false",
      description: "Unmounts popup content whenever it is hidden.",
    },
    {
      name: "getPopupContainer",
      type: "(triggerNode: HTMLElement) => HTMLElement",
      defaultValue: "document.body",
      description: "Selects the portal container used by the popup.",
    },
    {
      name: "classNames / styles",
      type: "{ root?, item?, itemTitle?, itemIcon?, itemContent? } | (info) => Slots",
      description: "Customizes the component through public semantic slots.",
    },
  ],
  accessibility: [
    "Use a focusable child that forwards pointer, focus, and click events.",
    "Use concise action labels and provide visible text or an accessible name for icon-only triggers.",
    "Keyboard users can open click menus and navigate enabled items with the arrow keys.",
  ],
});

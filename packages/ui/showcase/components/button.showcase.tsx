import { useState } from "react";
import {
  Button,
  type ButtonColor,
  type ButtonVariant,
  type ComponentSize,
  DropdownMenu,
  Tooltip,
} from "../../src/index.js";
import {
  DownloadOutlined,
  EllipsisOutlined,
  PoweroffOutlined,
  SearchOutlined,
  SyncOutlined,
} from "../../src/icons.js";
import { defineShowcase } from "../showcase-definition.js";

function ButtonVariants() {
  return (
    <div className="showcase-preview-row">
      <Button variant="primary">Primary button</Button>
      <Button>Default button</Button>
      <Button variant="dashed">Dashed button</Button>
      <Button variant="text">Text button</Button>
      <Button variant="link">Link button</Button>
    </div>
  );
}

function ButtonIcons() {
  return (
    <div className="showcase-button-stack">
      <div className="showcase-preview-row">
        <Tooltip title="Search">
          <Button aria-label="Search" icon={<SearchOutlined />} shape="circle" variant="primary" />
        </Tooltip>
        <Button aria-label="Letter A action" shape="circle" variant="primary">
          A
        </Button>
        <Button icon={<SearchOutlined />} variant="primary">
          Search
        </Button>
        <Tooltip title="Search">
          <Button aria-label="Search" icon={<SearchOutlined />} shape="circle" variant="dashed" />
        </Tooltip>
        <Button icon={<SearchOutlined />} variant="dashed">
          Search
        </Button>
      </div>
      <div className="showcase-preview-row">
        <Tooltip title="Search">
          <Button aria-label="Search" icon={<SearchOutlined />} shape="circle" />
        </Tooltip>
        <Button icon={<SearchOutlined />}>Search</Button>
        <Tooltip title="Open search documentation">
          <Button
            aria-label="Open search documentation"
            href="https://example.com"
            icon={<SearchOutlined />}
            rel="noreferrer"
            shape="circle"
            target="_blank"
          />
        </Tooltip>
        <Button
          href="https://example.com"
          icon={<SearchOutlined />}
          rel="noreferrer"
          target="_blank"
        >
          Search
        </Button>
      </div>
    </div>
  );
}

function ButtonSizeRow({ label, size }: { label: string; size: ComponentSize }) {
  return (
    <div className="showcase-button-size-row">
      <span className="showcase-button-size-label">{label}</span>
      <Button size={size} variant="primary">
        Primary
      </Button>
      <Button size={size}>Default</Button>
      <Button size={size} variant="dashed">
        Dashed
      </Button>
      <Button
        aria-label={`Download ${label.toLowerCase()} file`}
        icon={<DownloadOutlined />}
        size={size}
      />
      <Button icon={<DownloadOutlined />} shape="round" size={size}>
        Download
      </Button>
    </div>
  );
}

function ButtonSizes() {
  return (
    <div className="showcase-button-stack">
      <ButtonSizeRow label="Large" size="large" />
      <ButtonSizeRow label="Medium" size="medium" />
      <ButtonSizeRow label="Small" size="small" />
    </div>
  );
}

function LoadingButtons() {
  const [loading, setLoading] = useState(false);

  const startLoading = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="showcase-button-stack">
      <div className="showcase-preview-row">
        <Button loading variant="primary">
          Loading
        </Button>
        <Button loading size="small" variant="primary">
          Loading
        </Button>
        <Button aria-label="Loading" icon={<PoweroffOutlined />} loading variant="primary" />
        <Button loading={{ icon: <SyncOutlined spin /> }} variant="primary">
          Custom icon
        </Button>
      </div>
      <div className="showcase-preview-row">
        <Button loading={loading} onClick={startLoading} variant="primary">
          Icon start
        </Button>
        <Button iconPlacement="end" loading={loading} onClick={startLoading} variant="primary">
          Icon end
        </Button>
        <Button
          icon={<PoweroffOutlined />}
          loading={loading}
          onClick={startLoading}
          variant="primary"
        >
          Icon replace
        </Button>
        <Button
          aria-label="Start loading"
          icon={<PoweroffOutlined />}
          loading={loading}
          onClick={startLoading}
          variant="primary"
        />
        <Button
          icon={<PoweroffOutlined />}
          loading={loading && { icon: <SyncOutlined spin /> }}
          onClick={startLoading}
          variant="primary"
        >
          Custom icon
        </Button>
      </div>
    </div>
  );
}

function GhostButtons() {
  return (
    <div className="showcase-button-ghost-surface">
      <div className="showcase-preview-row">
        <Button ghost variant="primary">
          Primary
        </Button>
        <Button ghost>Default</Button>
        <Button ghost variant="dashed">
          Dashed
        </Button>
        <Button danger ghost>
          Danger
        </Button>
      </div>
    </div>
  );
}

function BlockButtons() {
  return (
    <div className="showcase-button-block">
      <Button block variant="primary">
        Primary
      </Button>
      <Button block>Default</Button>
      <Button block variant="dashed">
        Dashed
      </Button>
      <Button block danger>
        Danger
      </Button>
      <Button block disabled>
        Disabled
      </Button>
      <Button block variant="text">
        Text
      </Button>
      <Button block variant="link">
        Link
      </Button>
    </div>
  );
}

const colors: ReadonlyArray<ButtonColor> = [
  "default",
  "primary",
  "danger",
  "pink",
  "purple",
  "cyan",
];
const variants: ReadonlyArray<ButtonVariant> = [
  "solid",
  "outlined",
  "dashed",
  "filled",
  "text",
  "link",
];

function ColorVariants() {
  return (
    <div className="showcase-button-color-grid">
      {colors.map((color) => (
        <div className="showcase-button-color-row" key={color}>
          <span className="showcase-button-color-label">{color}</span>
          <div className="showcase-preview-row">
            {variants.map((variant) => (
              <Button color={color} key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function IconPlacement() {
  return (
    <div className="showcase-preview-row">
      <Button icon={<SearchOutlined />} iconPlacement="start" variant="primary">
        Search
      </Button>
      <Button icon={<SearchOutlined />} iconPlacement="end" variant="primary">
        Search
      </Button>
    </div>
  );
}

function DisabledButtons() {
  return (
    <div className="showcase-button-stack">
      <div className="showcase-preview-row">
        <Button variant="primary">Primary</Button>
        <Button disabled variant="primary">
          Primary disabled
        </Button>
        <Button>Default</Button>
        <Button disabled>Default disabled</Button>
        <Button disabled variant="dashed">
          Dashed disabled
        </Button>
      </div>
      <div className="showcase-preview-row">
        <Button disabled variant="text">
          Text disabled
        </Button>
        <Button disabled href="https://example.com" variant="link">
          Link disabled
        </Button>
        <Button danger disabled>
          Danger disabled
        </Button>
      </div>
      <div className="showcase-button-ghost-surface">
        <div className="showcase-preview-row">
          <Button disabled ghost variant="primary">
            Primary disabled
          </Button>
          <Button disabled ghost>
            Default disabled
          </Button>
        </div>
      </div>
    </div>
  );
}

function MultipleButtons() {
  return (
    <div className="showcase-preview-row">
      <Button variant="primary">Primary</Button>
      <Button>Secondary</Button>
      <DropdownMenu
        items={[
          { id: "create", label: "Create project" },
          { id: "duplicate", label: "Duplicate project" },
          { danger: true, id: "archive", label: "Archive project", separatorBefore: true },
        ]}
        trigger={<Button aria-label="More actions" icon={<EllipsisOutlined />} />}
      />
    </div>
  );
}

function DangerButtons() {
  return (
    <div className="showcase-preview-row">
      <Button danger variant="primary">
        Primary
      </Button>
      <Button danger>Default</Button>
      <Button danger variant="dashed">
        Dashed
      </Button>
      <Button danger variant="text">
        Text
      </Button>
      <Button danger variant="link">
        Link
      </Button>
    </div>
  );
}

export const buttonShowcase = defineShowcase({
  id: "button",
  name: "Button",
  category: "General",
  stage: "prod",
  description: "Triggers an action or navigation in response to user input.",
  whenToUse: [
    "Use a primary button for the most important action in a group.",
    "Use default or text buttons for secondary actions, and danger only for destructive outcomes.",
  ],
  examples: [
    {
      id: "button-variants",
      name: "Button variants",
      description: "Use the shorthand variants for the most common action hierarchy.",
      preview: ButtonVariants,
      code: `<Button variant="primary">Primary button</Button>
<Button>Default button</Button>
<Button variant="dashed">Dashed button</Button>
<Button variant="text">Text button</Button>
<Button variant="link">Link button</Button>`,
    },
    {
      id: "button-icons",
      name: "Icon buttons",
      description: "Buttons can contain an icon, label, or both, and can render as links.",
      preview: ButtonIcons,
      code: `<Tooltip title="Search">
  <Button aria-label="Search" shape="circle" icon={<SearchOutlined />} />
</Tooltip>
<Button icon={<SearchOutlined />}>Search</Button>
<Button href="https://example.com" target="_blank" icon={<SearchOutlined />}>
  Search
</Button>`,
    },
    {
      id: "button-sizes",
      name: "Sizes and shapes",
      description: "Buttons support three sizes and default, round, or circular shapes.",
      preview: ButtonSizes,
      code: `<Button size="large">Large</Button>
<Button size="medium" shape="round" icon={<DownloadOutlined />}>Download</Button>
<Button size="small" shape="circle" icon={<DownloadOutlined />} aria-label="Download" />`,
    },
    {
      id: "button-loading",
      name: "Loading",
      description:
        "Loading prevents duplicate activation and can use the default or a custom icon.",
      preview: LoadingButtons,
      code: `<Button variant="primary" loading>Loading</Button>
<Button variant="primary" loading={{ icon: <SyncOutlined spin /> }}>
  Custom icon
</Button>
<Button loading={loading} onClick={startLoading}>Start loading</Button>`,
    },
    {
      id: "button-ghost",
      name: "Ghost buttons",
      description:
        "Ghost buttons retain their outline and remove their fill on a contrasting surface.",
      preview: GhostButtons,
      code: `<Button variant="primary" ghost>Primary</Button>
<Button ghost>Default</Button>
<Button variant="dashed" ghost>Dashed</Button>
<Button danger ghost>Danger</Button>`,
    },
    {
      id: "button-block",
      name: "Block buttons",
      description: "A block button fills the available width of its container.",
      preview: BlockButtons,
      code: `<Button block variant="primary">Primary</Button>
<Button block>Default</Button>
<Button block variant="dashed">Dashed</Button>`,
    },
    {
      id: "button-color-variants",
      name: "Colors and variants",
      description:
        "Combine semantic color with a visual variant when shorthand variants are not enough.",
      preview: ColorVariants,
      code: `<Button color="primary" variant="solid">Solid</Button>
<Button color="purple" variant="outlined">Outlined</Button>
<Button color="cyan" variant="filled">Filled</Button>
<Button color="danger" variant="text">Text</Button>`,
    },
    {
      id: "button-icon-placement",
      name: "Icon placement",
      description:
        "Place an icon before or after the label without changing content order manually.",
      preview: IconPlacement,
      code: `<Button icon={<SearchOutlined />} iconPlacement="start">Search</Button>
<Button icon={<SearchOutlined />} iconPlacement="end">Search</Button>`,
    },
    {
      id: "button-disabled",
      name: "Disabled",
      description: "Disabled buttons remain legible but cannot be focused or activated.",
      preview: DisabledButtons,
      code: `<Button disabled variant="primary">Primary disabled</Button>
<Button disabled>Default disabled</Button>
<Button disabled href="https://example.com" variant="link">Link disabled</Button>`,
    },
    {
      id: "button-group",
      name: "Multiple buttons",
      description: "Keep the main action visible and move infrequent actions into a dropdown menu.",
      preview: MultipleButtons,
      code: `<Button variant="primary">Primary</Button>
<Button>Secondary</Button>
<DropdownMenu
  trigger={<Button aria-label="More actions" icon={<EllipsisOutlined />} />}
  items={[{ id: "create", label: "Create project" }]}
/>`,
    },
    {
      id: "button-danger",
      name: "Danger buttons",
      description: "Danger styling communicates a destructive or difficult-to-reverse action.",
      preview: DangerButtons,
      code: `<Button danger variant="primary">Primary</Button>
<Button danger>Default</Button>
<Button danger variant="dashed">Dashed</Button>
<Button danger variant="text">Text</Button>
<Button danger variant="link">Link</Button>`,
    },
  ],
  api: [
    {
      name: "variant",
      type: '"default" | "primary" | "solid" | "outlined" | "dashed" | "filled" | "text" | "link"',
      defaultValue: '"default"',
      description: "Sets the visual treatment. Default and primary are common-use shorthands.",
    },
    {
      name: "color",
      type: '"default" | "primary" | "danger" | "pink" | "purple" | "cyan"',
      defaultValue: '"default"',
      description: "Sets the semantic or preset color used by the selected variant.",
    },
    {
      name: "size",
      type: '"small" | "medium" | "large"',
      defaultValue: '"medium"',
      description: "Controls the height, padding, and type size.",
    },
    {
      name: "shape",
      type: '"default" | "round" | "circle"',
      defaultValue: '"default"',
      description: "Controls the outer button shape.",
    },
    {
      name: "icon",
      type: "ReactNode",
      description: "Renders an icon alongside the label or as the only visible content.",
    },
    {
      name: "iconPlacement",
      type: '"start" | "end"',
      defaultValue: '"start"',
      description: "Places the icon before or after the label.",
    },
    {
      name: "loading",
      type: "boolean | { icon?: ReactNode }",
      defaultValue: "false",
      description: "Shows a loading indicator and prevents duplicate activation.",
    },
    {
      name: "block",
      type: "boolean",
      defaultValue: "false",
      description: "Makes the button fill its container width.",
    },
    {
      name: "ghost",
      type: "boolean",
      defaultValue: "false",
      description: "Removes the button fill for use on contrasting surfaces.",
    },
    {
      name: "danger",
      type: "boolean",
      defaultValue: "false",
      description: "Applies the destructive action color.",
    },
    {
      name: "href",
      type: "string",
      description: "Renders the button as a link to the provided destination.",
    },
  ],
  accessibility: [
    "Give icon-only buttons an accessible name and a tooltip when the icon may be unfamiliar.",
    "Do not communicate meaning with color alone; keep action labels explicit.",
    "Loading and disabled buttons prevent activation while retaining their visible label.",
  ],
});

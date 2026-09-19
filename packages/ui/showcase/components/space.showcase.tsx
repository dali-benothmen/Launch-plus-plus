import {
  Button,
  Card,
  Divider,
  Flex,
  Input,
  Select,
  Space,
  type SpaceAlign,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const wrapItems = Array.from({ length: 20 }, (_, index) => `Button ${index + 1}`);
const alignments: ReadonlyArray<SpaceAlign> = ["center", "start", "end", "baseline"];

function BasicSpace() {
  return (
    <Space>
      <Typography.Text>Space</Typography.Text>
      <Button variant="primary">Primary</Button>
      <Button>Upload</Button>
      <Button>Confirm</Button>
    </Space>
  );
}

function VerticalSpace() {
  return (
    <Space className="showcase-space-stack" orientation="vertical" size="medium">
      {["Planning", "In progress", "Completed"].map((title) => (
        <Card className="showcase-space-card" key={title} size="small" title={title}>
          <Typography.Text type="secondary">Project card content</Typography.Text>
        </Card>
      ))}
    </Space>
  );
}

function SpaceSizes() {
  return (
    <Space orientation="vertical" size="large">
      {(["small", "medium", "large", 32] as const).map((size) => (
        <Space key={String(size)} orientation="vertical" size="small">
          <Typography.Text type="secondary">
            {typeof size === "number" ? `Custom ${size}px` : size}
          </Typography.Text>
          <Space size={size}>
            <Button variant="primary">Primary</Button>
            <Button>Default</Button>
            <Button variant="dashed">Dashed</Button>
          </Space>
        </Space>
      ))}
    </Space>
  );
}

function SpaceAlignment() {
  return (
    <Flex align="flex-start" gap="small" wrap>
      {alignments.map((align) => (
        <div className="showcase-space-align-box" key={align}>
          <Space align={align}>
            <Typography.Text>{align}</Typography.Text>
            <Button variant="primary">Primary</Button>
            <span className="showcase-space-mock">Block</span>
          </Space>
        </div>
      ))}
    </Flex>
  );
}

function WrappingSpace() {
  return (
    <Space size={[8, 16]} wrap>
      {wrapItems.map((label) => (
        <Button key={label}>{label}</Button>
      ))}
    </Space>
  );
}

function SeparatorSpace() {
  return (
    <Space separator={<Divider vertical />}>
      <Typography.Link href="#space-separator">Overview</Typography.Link>
      <Typography.Link href="#space-separator">Activity</Typography.Link>
      <Typography.Link href="#space-separator">Settings</Typography.Link>
    </Space>
  );
}

function CompactSpace() {
  return (
    <Space className="showcase-space-compact-examples" orientation="vertical" size="large">
      <Space.Compact>
        <Button>Draft</Button>
        <Button variant="primary">Publish</Button>
      </Space.Compact>

      <Space.Compact block>
        <Space.Addon>https://</Space.Addon>
        <Input aria-label="Project address" placeholder="project.launchpp.dev" />
        <Button variant="primary">Open</Button>
      </Space.Compact>

      <Space.Compact>
        <Select
          ariaLabel="Project visibility"
          defaultValue="team"
          options={[
            { label: "Team", value: "team" },
            { label: "Private", value: "private" },
          ]}
        />
        <Button>Apply</Button>
      </Space.Compact>

      <Space.Compact orientation="vertical">
        <Button>Move up</Button>
        <Button>Move down</Button>
        <Button danger>Remove</Button>
      </Space.Compact>
    </Space>
  );
}

export const spaceShowcase = defineShowcase({
  id: "space",
  name: "Space",
  category: "Layout",
  stage: "prod",
  description: "Adds consistent spacing between inline components and compact control groups.",
  usage: `import { Space } from "@launchpp/ui";`,
  whenToUse: [
    "Use Space when inline elements need consistent horizontal or vertical separation.",
    "Use Flex when children need more direct layout control without wrapper elements.",
    "Use Space.Compact when related controls should visually connect with collapsed borders.",
  ],
  examples: [
    {
      id: "space-basic",
      name: "Basic usage",
      description: "Prevent related inline components from appearing crowded.",
      preview: BasicSpace,
      code: `<Space>
  <Typography.Text>Space</Typography.Text>
  <Button variant="primary">Primary</Button>
  <Button>Upload</Button>
  <Button>Confirm</Button>
</Space>`,
    },
    {
      id: "space-vertical",
      name: "Vertical space",
      description: "Stack components with a consistent vertical interval.",
      preview: VerticalSpace,
      code: `<Space orientation="vertical" size="medium">
  <Card title="Planning">...</Card>
  <Card title="In progress">...</Card>
  <Card title="Completed">...</Card>
</Space>`,
    },
    {
      id: "space-size",
      name: "Space size",
      description:
        "Choose a preset size, a custom number, or separate horizontal and vertical gaps.",
      preview: SpaceSizes,
      code: `<Space size="small">...</Space>
<Space size="medium">...</Space>
<Space size="large">...</Space>
<Space size={32}>...</Space>
<Space size={[8, 16]} wrap>...</Space>`,
    },
    {
      id: "space-align",
      name: "Align",
      description: "Align items to the start, center, end, or text baseline.",
      preview: SpaceAlignment,
      code: `<Space align="center">...</Space>
<Space align="start">...</Space>
<Space align="end">...</Space>
<Space align="baseline">...</Space>`,
    },
    {
      id: "space-wrap",
      name: "Wrap",
      description: "Allow a horizontal group to continue on additional rows.",
      preview: WrappingSpace,
      code: `<Space size={[8, 16]} wrap>
  {actions.map((action) => <Button key={action.id}>{action.label}</Button>)}
</Space>`,
    },
    {
      id: "space-separator",
      name: "Separator",
      description: "Place a custom separator between each pair of items.",
      preview: SeparatorSpace,
      code: `<Space separator={<Divider vertical />}>
  <Typography.Link>Overview</Typography.Link>
  <Typography.Link>Activity</Typography.Link>
  <Typography.Link>Settings</Typography.Link>
</Space>`,
    },
    {
      id: "space-compact",
      name: "Compact controls",
      description:
        "Connect buttons and form controls, and use Space.Addon for custom compact cells.",
      preview: CompactSpace,
      code: `<Space.Compact block>
  <Space.Addon>https://</Space.Addon>
  <Input placeholder="project.launchpp.dev" />
  <Button variant="primary">Open</Button>
</Space.Compact>`,
    },
  ],
  api: [
    {
      name: "align",
      type: '"start" | "end" | "center" | "baseline"',
      description: "Aligns items along the cross axis.",
    },
    {
      name: "orientation",
      type: '"horizontal" | "vertical"',
      defaultValue: '"horizontal"',
      description: "Sets the direction of the spaced items.",
    },
    {
      name: "vertical",
      type: "boolean",
      defaultValue: "false",
      description: "Provides shorthand for vertical orientation; orientation takes precedence.",
    },
    {
      name: "size",
      type: '"small" | "medium" | "large" | number | [Size, Size]',
      defaultValue: '"small"',
      description: "Sets equal or independent horizontal and vertical spacing.",
    },
    {
      name: "separator",
      type: "ReactNode",
      description: "Renders content between adjacent items.",
    },
    {
      name: "wrap",
      type: "boolean",
      defaultValue: "false",
      description: "Allows horizontal items to wrap onto additional lines.",
    },
    {
      name: "classNames",
      type: "{ root?, item?, separator? } | (info) => ClassNames",
      description: "Adds class names to public semantic elements.",
    },
    {
      name: "styles",
      type: "{ root?, item?, separator? } | (info) => Styles",
      description: "Adds inline styles to public semantic elements.",
    },
    {
      name: "Space.Compact",
      type: "{ block?, orientation?, size?, vertical? }",
      description: "Connects compatible controls and collapses their shared borders.",
    },
    {
      name: "Space.Addon",
      type: "{ children: ReactNode }",
      description: "Creates a custom cell inside a compact control group.",
    },
  ],
  accessibility: [
    "Space changes visual spacing only and preserves child reading order.",
    "Separators are decorative and hidden from assistive technology.",
    "Keep compact controls individually labeled when their visible text does not explain the action.",
  ],
});

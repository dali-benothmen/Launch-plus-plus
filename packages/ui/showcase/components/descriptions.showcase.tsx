import { useState } from "react";
import {
  Button,
  Descriptions,
  type DescriptionsItem,
  type DescriptionsSize,
  Segmented,
  Space,
  Tag,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const projectItems: ReadonlyArray<DescriptionsItem> = [
  { key: "name", label: "Project", children: "Launch++" },
  { key: "owner", label: "Owner", children: "Product team" },
  { key: "visibility", label: "Visibility", children: "Team" },
  { key: "status", label: "Status", children: <Tag color="green">Active</Tag> },
  { key: "members", label: "Members", children: "12" },
  {
    key: "description",
    label: "Description",
    children: "A modern project manager with a first-class plugin platform.",
    span: 2,
  },
];

function BasicDescriptions() {
  return <Descriptions items={projectItems} title="Project details" />;
}

function BorderedDescriptions() {
  return <Descriptions bordered items={projectItems} title="Project details" />;
}

function SizedDescriptions() {
  const [size, setSize] = useState<DescriptionsSize>("medium");
  return (
    <Space size="large" vertical>
      <Segmented<DescriptionsSize>
        onChange={setSize}
        options={["large", "medium", "small"]}
        value={size}
      />
      <Descriptions
        bordered
        extra={<Button>Edit</Button>}
        items={projectItems}
        size={size}
        title="Custom size"
      />
    </Space>
  );
}

function VerticalDescriptions() {
  return <Descriptions bordered items={projectItems} layout="vertical" title="Project details" />;
}

function ResponsiveDescriptions() {
  return (
    <Descriptions
      bordered
      column={{ xs: 1, sm: 2, lg: 3 }}
      items={projectItems}
      title="Responsive details"
    />
  );
}

function ComposedDescriptions() {
  return (
    <Descriptions column={2} title="Plugin details">
      <Descriptions.Item label="Name">Sprint planner</Descriptions.Item>
      <Descriptions.Item label="Version">1.2.0</Descriptions.Item>
      <Descriptions.Item label="Publisher">Acme</Descriptions.Item>
      <Descriptions.Item label="Permissions" span="filled">
        Projects, tasks, and members
      </Descriptions.Item>
    </Descriptions>
  );
}

function SemanticDescriptions() {
  return (
    <Descriptions
      classNames={{ root: "plugin-metadata" }}
      items={projectItems.slice(0, 3)}
      styles={{
        content: { color: "var(--launch-ui-primary)" },
        label: { fontWeight: 600 },
      }}
      title="Semantic styling"
    />
  );
}

export const descriptionsShowcase = defineShowcase({
  id: "descriptions",
  name: "Descriptions",
  category: "Data display",
  stage: "prod",
  description: "Displays related read-only fields as a clear, structured group.",
  usage: 'import { Descriptions } from "@launchpp/ui";',
  whenToUse: [
    "Use Descriptions for project, member, plugin, or installation metadata that users need to scan rather than edit.",
    "Use Form controls when the values are editable instead of placing inputs inside Descriptions.",
  ],
  examples: [
    {
      id: "descriptions-basic",
      name: "Basic",
      description: "Group read-only fields with an optional title.",
      preview: BasicDescriptions,
      code: `<Descriptions title="Project details" items={items} />`,
    },
    {
      id: "descriptions-bordered",
      name: "Bordered",
      description: "Use borders when labels and values need stronger tabular separation.",
      preview: BorderedDescriptions,
      code: `<Descriptions bordered title="Project details" items={items} />`,
    },
    {
      id: "descriptions-size",
      name: "Size and action",
      description: "Adjust density and place a related action at the end of the header.",
      preview: SizedDescriptions,
      code: `<Descriptions
  bordered
  title="Project details"
  extra={<Button>Edit</Button>}
  size="small"
  items={items}
/>`,
    },
    {
      id: "descriptions-vertical",
      name: "Vertical",
      description: "Stack each label above its value when content needs more horizontal room.",
      preview: VerticalDescriptions,
      code: `<Descriptions bordered layout="vertical" items={items} />`,
    },
    {
      id: "descriptions-responsive",
      name: "Responsive columns",
      description: "Change the number of fields per row at the shared layout breakpoints.",
      preview: ResponsiveDescriptions,
      code: `<Descriptions
  bordered
  column={{ xs: 1, sm: 2, lg: 3 }}
  items={items}
/>`,
    },
    {
      id: "descriptions-composed",
      name: "Composed items",
      description: "Descriptions.Item remains available for direct JSX composition.",
      preview: ComposedDescriptions,
      code: `<Descriptions column={2} title="Plugin details">
  <Descriptions.Item label="Name">Sprint planner</Descriptions.Item>
  <Descriptions.Item label="Version">1.2.0</Descriptions.Item>
  <Descriptions.Item label="Permissions" span="filled">
    Projects, tasks, and members
  </Descriptions.Item>
</Descriptions>`,
    },
    {
      id: "descriptions-semantic",
      name: "Semantic styling",
      description: "Customize documented regions without targeting private DOM structure.",
      preview: SemanticDescriptions,
      code: `<Descriptions
  classNames={{ root: "plugin-metadata" }}
  items={items}
  styles={{
    label: { fontWeight: 600 },
    content: { color: "var(--launch-ui-primary)" },
  }}
/>`,
    },
  ],
  api: [
    {
      name: "items",
      description: "Defines labels, values, keys, and spans.",
      type: "DescriptionsItem[]",
    },
    { name: "title", description: "Renders the group title.", type: "ReactNode" },
    {
      name: "extra",
      description: "Renders a related action at the end of the header.",
      type: "ReactNode",
    },
    {
      name: "bordered",
      description: "Adds a structured border and label backgrounds.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "column",
      description: "Sets a fixed or responsive number of items per row.",
      type: "number | Record<Breakpoint, number>",
      defaultValue: "3",
    },
    {
      name: "layout",
      description: "Places labels beside or above their values.",
      type: '"horizontal" | "vertical"',
      defaultValue: '"horizontal"',
    },
    {
      name: "size",
      description: "Controls the spacing density.",
      type: '"large" | "medium" | "small"',
      defaultValue: '"large"',
    },
    {
      name: "colon",
      description: "Shows a colon after labels in the unbordered horizontal layout.",
      type: "boolean",
      defaultValue: "true",
    },
    {
      name: "Descriptions.Item",
      description: "Provides the compositional item API.",
      type: "{ label, span, children }",
    },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "DescriptionsClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "DescriptionsStyles | function",
    },
  ],
  accessibility: [
    "Keep labels concise and distinct so each value has clear context.",
    "Do not rely on borders or column position alone to communicate a field's meaning.",
    "Place editing actions in the header and move users to a proper Form for changes.",
  ],
});

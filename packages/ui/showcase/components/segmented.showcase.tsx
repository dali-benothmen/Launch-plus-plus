import { useState } from "react";
import {
  AppstoreOutlined,
  BarsOutlined,
  CalendarOutlined,
  CloudOutlined,
  MoonOutlined,
  RocketOutlined,
  SunOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "../../src/icons.js";
import {
  Avatar,
  Button,
  Flex,
  Segmented,
  type SegmentedProps,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const periods = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"] as const;

function BasicSegmented() {
  const [value, setValue] = useState<string>("Daily");
  return (
    <Flex gap="small" vertical>
      <Segmented options={periods} onChange={setValue} value={value} />
      <Typography.Text type="secondary">Selected: {value}</Typography.Text>
    </Flex>
  );
}

function BlockSegmented() {
  return (
    <Segmented<string | number> block options={[123, 456, "longtext-longtext-longtext-longtext"]} />
  );
}

function DisabledSegmented() {
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Segmented disabled options={["Map", "Transit", "Satellite"]} />
      <Segmented<string>
        options={[
          "Daily",
          { disabled: true, label: "Weekly", value: "Weekly" },
          "Monthly",
          { disabled: true, label: "Quarterly", value: "Quarterly" },
          "Yearly",
        ]}
      />
    </Flex>
  );
}

function CustomSegmented() {
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Segmented
        options={[
          {
            label: (
              <div className="showcase-segmented-user-option">
                <Avatar style={{ backgroundColor: "#1668dc" }}>A</Avatar>
                <div>User 1</div>
              </div>
            ),
            tooltip: "Open User 1",
            value: "user1",
          },
          {
            label: (
              <div className="showcase-segmented-user-option">
                <Avatar style={{ backgroundColor: "#f56a00" }}>K</Avatar>
                <div>User 2</div>
              </div>
            ),
            tooltip: "Open User 2",
            value: "user2",
          },
          {
            label: (
              <div className="showcase-segmented-user-option">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#52a36d" }} />
                <div>User 3</div>
              </div>
            ),
            tooltip: { placement: "top", title: "Open User 3" },
            value: "user3",
          },
        ]}
      />
      <Segmented
        options={[
          { label: <Season name="Spring" range="Jan–Mar" />, value: "spring" },
          { label: <Season name="Summer" range="Apr–Jun" />, value: "summer" },
          { label: <Season name="Autumn" range="Jul–Sept" />, value: "autumn" },
          { label: <Season name="Winter" range="Oct–Dec" />, value: "winter" },
        ]}
      />
    </Flex>
  );
}

function Season({ name, range }: { readonly name: string; readonly range: string }) {
  return (
    <div className="showcase-segmented-season">
      <div>{name}</div>
      <div>{range}</div>
    </div>
  );
}

function SegmentedSizes() {
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Segmented options={periods} size="large" />
      <Segmented options={periods} />
      <Segmented options={periods} size="small" />
    </Flex>
  );
}

function IconSegmented() {
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Segmented
        options={[
          { icon: <BarsOutlined />, value: "List" },
          { icon: <AppstoreOutlined />, value: "Kanban" },
        ]}
      />
      <Segmented
        options={[
          { icon: <BarsOutlined />, label: "List", value: "List" },
          { icon: <AppstoreOutlined />, label: "Kanban", value: "Kanban" },
          { icon: <CalendarOutlined />, label: "Calendar", value: "Calendar" },
        ]}
      />
    </Flex>
  );
}

function VerticalSegmented() {
  return (
    <Space size="large">
      <Segmented
        orientation="vertical"
        options={[
          { icon: <BarsOutlined />, label: "List", value: "List" },
          { icon: <AppstoreOutlined />, label: "Kanban", value: "Kanban" },
          { icon: <CalendarOutlined />, label: "Calendar", value: "Calendar" },
        ]}
      />
      <Segmented orientation="vertical" options={["Overview", "Activity", "Files"]} />
    </Space>
  );
}

type ControlSize = "large" | "medium" | "small";

function RoundSegmented() {
  const [size, setSize] = useState<ControlSize>("medium");
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Segmented<ControlSize>
        onChange={setSize}
        options={["small", "medium", "large"]}
        value={size}
      />
      <Segmented
        options={[
          { icon: <SunOutlined />, value: "light" },
          { icon: <MoonOutlined />, value: "dark" },
        ]}
        shape="round"
        size={size}
      />
    </Flex>
  );
}

function DynamicSegmented() {
  const [options, setOptions] = useState<ReadonlyArray<string>>(["Daily", "Weekly", "Monthly"]);
  const loaded = options.length > 3;
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Segmented options={options} />
      <Button
        disabled={loaded}
        onClick={() => setOptions((current) => [...current, "Quarterly", "Yearly"])}
        variant="primary"
      >
        Load more options
      </Button>
    </Flex>
  );
}

const semanticOptions: NonNullable<SegmentedProps["options"]> = [
  { icon: <RocketOutlined />, label: "Boost", value: "boost" },
  { icon: <ThunderboltOutlined />, label: "Stream", value: "stream" },
  { icon: <CloudOutlined />, label: "Cloud", value: "cloud" },
];

function SemanticSegmented() {
  const verticalStyles: SegmentedProps["styles"] = ({ props }) =>
    props.vertical
      ? {
          icon: { color: "#1668dc" },
          item: { textAlign: "start" },
          root: { border: "1px solid #91caff", padding: 4, width: 120 },
        }
      : {};
  return (
    <Flex gap="medium" vertical>
      <Segmented
        classNames={{ root: "showcase-segmented-semantic" }}
        options={semanticOptions}
        styles={{ root: { padding: 4, width: 280 } }}
      />
      <Segmented options={semanticOptions} styles={verticalStyles} vertical />
    </Flex>
  );
}

export const segmentedShowcase = defineShowcase({
  id: "segmented",
  name: "Segmented",
  category: "Data display",
  stage: "prod",
  description: "Presents a compact set of mutually exclusive views or values.",
  whenToUse: [
    "Use Segmented when users switch between a small number of closely related views or modes.",
    "Keep labels concise and use Select or Radio when choices need more explanation or space.",
  ],
  examples: [
    {
      id: "segmented-basic",
      name: "Basic and controlled",
      description: "Use value and onChange when the selected view is managed by the parent.",
      preview: BasicSegmented,
      code: `const [value, setValue] = useState("Daily");

<Segmented
  options={["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]}
  value={value}
  onChange={setValue}
/>`,
    },
    {
      id: "segmented-block",
      name: "Block",
      description: "Block mode distributes options across the available parent width.",
      preview: BlockSegmented,
      code: `<Segmented options={[123, 456, "Long option"]} block />`,
    },
    {
      id: "segmented-disabled",
      name: "Disabled",
      description: "Disable the complete control or individual options.",
      preview: DisabledSegmented,
      code: `<Segmented options={["Map", "Transit", "Satellite"]} disabled />
<Segmented options={[
  "Daily",
  { label: "Weekly", value: "Weekly", disabled: true },
  "Monthly",
]} />`,
    },
    {
      id: "segmented-custom",
      name: "Custom render",
      description: "Labels accept composed content, and each option can provide a tooltip.",
      preview: CustomSegmented,
      code: `<Segmented options={[
  {
    value: "user1",
    label: <UserOption name="User 1" />,
    tooltip: "Open User 1",
  },
  {
    value: "user2",
    label: <UserOption name="User 2" />,
  },
]} />`,
    },
    {
      id: "segmented-sizes",
      name: "Sizes",
      description: "Large, medium, and small controls are 40px, 32px, and 24px tall.",
      preview: SegmentedSizes,
      code: `<Segmented size="large" options={options} />
<Segmented size="medium" options={options} />
<Segmented size="small" options={options} />`,
    },
    {
      id: "segmented-icons",
      name: "Icons",
      description: "Use icons alone for familiar views, or pair them with labels.",
      preview: IconSegmented,
      code: `<Segmented options={[
  { value: "List", icon: <BarsOutlined /> },
  { value: "Kanban", icon: <AppstoreOutlined /> },
]} />

<Segmented options={[
  { label: "List", value: "List", icon: <BarsOutlined /> },
  { label: "Kanban", value: "Kanban", icon: <AppstoreOutlined /> },
]} />`,
    },
    {
      id: "segmented-vertical",
      name: "Vertical orientation",
      description: "Arrange options vertically when the switcher belongs in a narrow area.",
      preview: VerticalSegmented,
      code: `<Segmented orientation="vertical" options={options} />`,
    },
    {
      id: "segmented-round",
      name: "Round shape",
      description: "Round controls work well for concise icon-based mode switching.",
      preview: RoundSegmented,
      code: `<Segmented
  shape="round"
  size={size}
  options={[
    { value: "light", icon: <SunOutlined /> },
    { value: "dark", icon: <MoonOutlined /> },
  ]}
/>`,
    },
    {
      id: "segmented-dynamic",
      name: "Dynamic options",
      description: "Options can change after the component has mounted.",
      preview: DynamicSegmented,
      code: `<Segmented options={options} />
<Button onClick={() => setOptions([...options, "Quarterly", "Yearly"])}>
  Load more options
</Button>`,
    },
    {
      id: "segmented-semantic",
      name: "Semantic styling",
      description: "Customize the public root, item, icon, and label parts.",
      preview: SemanticSegmented,
      code: `<Segmented
  options={options}
  classNames={{ root: "custom-segmented" }}
  styles={{
    root: { width: 280 },
    icon: { color: "#1668dc" },
    item: { textAlign: "start" },
  }}
/>`,
    },
  ],
  api: [
    {
      name: "options",
      description: "Primitive values or configured segment items.",
      type: "readonly (T | SegmentedOption<T>)[]",
      defaultValue: "[]",
    },
    { name: "value", description: "Controlled selected value.", type: "T" },
    {
      name: "defaultValue",
      description: "Initial uncontrolled value; defaults to the first option.",
      type: "T",
    },
    {
      name: "onChange",
      description: "Runs when the selected value changes.",
      type: "(value: T) => void",
    },
    {
      name: "block",
      description: "Fits the control to its parent width.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "disabled",
      description: "Disables every option.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "orientation",
      description: "Arranges options horizontally or vertically.",
      type: '"horizontal" | "vertical"',
      defaultValue: '"horizontal"',
    },
    {
      name: "vertical",
      description: "Vertical shorthand; orientation takes priority.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "size",
      description: "Controls the overall height.",
      type: '"large" | "medium" | "small"',
      defaultValue: '"medium"',
    },
    {
      name: "shape",
      description: "Uses standard or pill-shaped corners.",
      type: '"default" | "round"',
      defaultValue: '"default"',
    },
    {
      name: "name",
      description: "Shared name for the native radio inputs.",
      type: "string",
      defaultValue: "generated",
    },
    {
      name: "classNames",
      description: "Classes for root, item, icon, and label parts.",
      type: "SegmentedClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for root, item, icon, and label parts.",
      type: "SegmentedStyles | function",
    },
  ],
  accessibility: [
    "The control uses native radio inputs, so arrow keys move selection when options share a name.",
    "Icon-only options derive an accessible label from their value; choose descriptive values.",
    "Disabled options remain visible but cannot be selected with the pointer or keyboard.",
  ],
});

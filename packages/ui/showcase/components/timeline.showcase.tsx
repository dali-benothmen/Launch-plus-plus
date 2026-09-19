import { useState } from "react";
import { CheckCircleOutlined, ClockCircleOutlined } from "../../src/icons.js";
import {
  Button,
  Divider,
  Flex,
  Radio,
  Space,
  Timeline,
  type TimelineItem,
  type TimelineMode,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const basicItems: ReadonlyArray<TimelineItem> = [
  { content: "Create a services site 2015-09-01" },
  { content: "Solve initial network problems 2015-09-01" },
  { content: "Technical testing 2015-09-01" },
  { content: "Network problems being solved 2015-09-01" },
];

function BasicTimeline() {
  return <Timeline items={basicItems} />;
}

function LoadingTimeline() {
  const [reverse, setReverse] = useState(false);
  return (
    <Flex align="flex-start" gap="medium" vertical>
      <Timeline
        items={[
          ...basicItems.slice(0, 3),
          { content: "Recording…", key: "recording", loading: true },
        ]}
        reverse={reverse}
      />
      <Button onClick={() => setReverse((current) => !current)} variant="primary">
        Toggle reverse
      </Button>
    </Flex>
  );
}

const progressItems: ReadonlyArray<TimelineItem> = [
  { content: "Init" },
  { content: "Start", color: "green" },
  { content: "Pending", loading: true },
  { content: "Complete", color: "gray" },
];

function HorizontalTimelines() {
  return (
    <Space size="medium" vertical>
      <Timeline items={progressItems} orientation="horizontal" />
      <Divider />
      <Timeline items={progressItems} mode="end" orientation="horizontal" />
      <Divider />
      <Timeline items={progressItems} mode="alternate" orientation="horizontal" />
    </Space>
  );
}

const titledItems: ReadonlyArray<TimelineItem> = [
  { content: "Create a services", title: "05:10" },
  { content: "Solve initial network problems", title: "09:03" },
  { content: "Technical testing" },
  { content: "Network problems being solved", title: "11:28" },
];

function TimelineModes() {
  const [mode, setMode] = useState<TimelineMode>("start");
  return (
    <Flex gap="medium" vertical>
      <Radio.Group<TimelineMode>
        onChange={(event) => setMode(event.target.value)}
        options={[
          { label: "Start", value: "start" },
          { label: "End", value: "end" },
          { label: "Alternate", value: "alternate" },
        ]}
        optionType="button"
        value={mode}
      />
      <Timeline items={titledItems} mode={mode} titleSpan={72} />
    </Flex>
  );
}

function TimelineVariants() {
  return (
    <Flex gap="large" wrap>
      <Flex flex="1 1 280px" gap="small" vertical>
        <Typography.Text strong>Outlined</Typography.Text>
        <Timeline items={basicItems.slice(0, 3)} />
      </Flex>
      <Flex flex="1 1 280px" gap="small" vertical>
        <Typography.Text strong>Filled</Typography.Text>
        <Timeline items={basicItems.slice(0, 3)} variant="filled" />
      </Flex>
    </Flex>
  );
}

function CustomTimeline() {
  return (
    <Timeline
      items={[
        { color: "green", content: "Create a services site 2015-09-01" },
        { color: "#722ed1", content: "Solve initial network problems 2015-09-01" },
        {
          color: "red",
          content: "Technical testing 2015-09-01",
          icon: <ClockCircleOutlined />,
        },
        {
          color: "green",
          content: "Network problems are solved 2015-09-01",
          icon: <CheckCircleOutlined />,
        },
      ]}
      mode="alternate"
    />
  );
}

function TitleSpacingTimeline() {
  return (
    <Flex gap="large" vertical>
      <div>
        <Typography.Text strong>titleSpan = 100px</Typography.Text>
        <Timeline items={titledItems} titleSpan="100px" />
      </div>
      <div>
        <Typography.Text strong>titleSpan = 25%</Typography.Text>
        <Timeline items={titledItems} titleSpan="25%" />
      </div>
    </Flex>
  );
}

function SemanticTimeline() {
  return (
    <Timeline
      items={[
        { content: "Create a services site 2015-09-01" },
        {
          content: "Solve initial network problems 2015-09-01",
          styles: { rail: { borderStyle: "dashed" }, root: { minHeight: 96 } },
        },
        {
          content: "…for a long time…",
          styles: {
            content: { opacity: 0.45 },
            rail: { borderStyle: "dashed" },
            root: { minHeight: 96 },
          },
        },
        { content: "Technical testing 2015-09-01" },
      ]}
      styles={{ itemIcon: { borderColor: "#722ed1" }, root: { padding: 8 } }}
    />
  );
}

export const timelineShowcase = defineShowcase({
  id: "timeline",
  name: "Timeline",
  category: "Data display",
  stage: "prod",
  description: "Connects ordered events or states along a visual time axis.",
  whenToUse: [
    "Use Timeline when events need to be understood in chronological or process order.",
    "Use titles for timestamps and content for the event description.",
    "Use alternate placement sparingly when comparing events on two sides of the same sequence.",
  ],
  examples: [
    {
      id: "timeline-basic",
      name: "Basic",
      description: "Render an ordered vertical sequence from item definitions.",
      preview: BasicTimeline,
      code: `<Timeline
  items={[
    { content: "Create a services site 2015-09-01" },
    { content: "Solve initial network problems 2015-09-01" },
    { content: "Technical testing 2015-09-01" },
  ]}
/>`,
    },
    {
      id: "timeline-loading-reverse",
      name: "Loading and reversing",
      description:
        "Mark an in-progress item and reverse the visual order without mutating the source data.",
      preview: LoadingTimeline,
      code: `<Timeline
  reverse={reverse}
  items={[
    { content: "Create project" },
    { content: "Technical testing" },
    { content: "Recording…", loading: true },
  ]}
/>`,
    },
    {
      id: "timeline-horizontal",
      name: "Horizontal",
      description: "Horizontal timelines support start, end, and alternating content placement.",
      preview: HorizontalTimelines,
      code: `<Timeline orientation="horizontal" mode="alternate" items={items} />`,
    },
    {
      id: "timeline-modes",
      name: "Placement and titles",
      description:
        "Move content to the start, end, or alternating sides while keeping timestamps separate.",
      preview: TimelineModes,
      code: `<Timeline
  mode="alternate"
  titleSpan={72}
  items={[
    { title: "05:10", content: "Create a services" },
    { title: "09:03", content: "Solve initial network problems" },
  ]}
/>`,
    },
    {
      id: "timeline-variants",
      name: "Variants",
      description:
        "Choose outlined nodes for the default treatment or filled nodes for stronger emphasis.",
      preview: TimelineVariants,
      code: `<Timeline variant="outlined" items={items} />
<Timeline variant="filled" items={items} />`,
    },
    {
      id: "timeline-custom",
      name: "Colors and custom icons",
      description:
        "Preset or custom colors and icons can communicate status without changing the content layout.",
      preview: CustomTimeline,
      code: `<Timeline
  mode="alternate"
  items={[
    { color: "green", content: "Created" },
    { color: "#722ed1", content: "Reviewed" },
    { color: "red", icon: <ClockCircleOutlined />, content: "Testing" },
  ]}
/>`,
    },
    {
      id: "timeline-title-spacing",
      name: "Title spacing",
      description: "titleSpan accepts a number of pixels or any CSS length.",
      preview: TitleSpacingTimeline,
      code: `<Timeline items={items} titleSpan="100px" />
<Timeline items={items} titleSpan="25%" />`,
    },
    {
      id: "timeline-semantic",
      name: "Semantic styling",
      description:
        "Customize documented root, item, rail, icon, title, and content parts globally or per item.",
      preview: SemanticTimeline,
      code: `<Timeline
  styles={{ root: { padding: 8 }, itemIcon: { borderColor: "#722ed1" } }}
  items={[
    { content: "Created" },
    { content: "Waiting", styles: { root: { minHeight: 96 }, rail: { borderStyle: "dashed" } } },
  ]}
/>`,
    },
  ],
  api: [
    {
      name: "items",
      description: "Ordered timeline item definitions.",
      type: "readonly TimelineItem[]",
      defaultValue: "[]",
    },
    {
      name: "mode",
      description: "Places content at the start, end, or alternating sides.",
      type: '"start" | "end" | "alternate"',
      defaultValue: '"start"',
    },
    {
      name: "orientation",
      description: "Direction of the time axis.",
      type: '"vertical" | "horizontal"',
      defaultValue: '"vertical"',
    },
    {
      name: "reverse",
      description: "Displays items in reverse order without mutating them.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "titleSpan",
      description: "Distance reserved for item titles.",
      type: "number | string",
      defaultValue: "12",
    },
    {
      name: "variant",
      description: "Node appearance.",
      type: '"filled" | "outlined"',
      defaultValue: '"outlined"',
    },
    {
      name: "classNames",
      description: "Classes for the public timeline semantic parts.",
      type: "TimelineClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for the public timeline semantic parts.",
      type: "TimelineStyles | function",
    },
    { name: "item.content", description: "Primary event content.", type: "ReactNode" },
    {
      name: "item.title",
      description: "Timestamp or secondary title opposite the content.",
      type: "ReactNode",
    },
    {
      name: "item.color",
      description: "blue, red, green, gray, or a custom CSS color.",
      type: "string",
      defaultValue: '"blue"',
    },
    { name: "item.icon", description: "Custom node icon.", type: "ReactNode" },
    {
      name: "item.loading",
      description: "Displays the shared loading indicator.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "item.placement",
      description: "Overrides the side for one item.",
      type: '"start" | "end"',
    },
    {
      name: "item.styles",
      description: "Styles the item root, rail, icon, title, and content.",
      type: "TimelineItemStyles",
    },
  ],
  accessibility: [
    "Keep the DOM order chronological even when alternate placement changes the visual layout.",
    "Describe status in text as well as color or icons.",
    "Use reverse only when the newest-first ordering is clear from surrounding context.",
  ],
});

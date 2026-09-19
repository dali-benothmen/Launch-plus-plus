import { useState } from "react";
import {
  ClockCircleOutlined,
  MinusOutlined,
  NotificationOutlined,
  PlusOutlined,
  UserOutlined,
} from "../../src/icons.js";
import {
  Avatar,
  Badge,
  type BadgeProps,
  type BadgeRibbonProps,
  Button,
  Card,
  Flex,
  Space,
  Switch,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BadgeTarget() {
  return <Avatar aria-label="User" icon={<UserOutlined />} shape="square" />;
}

function BasicBadges() {
  return (
    <Space align="center" size="large" wrap>
      <Badge count={5}>
        <BadgeTarget />
      </Badge>
      <Badge count={0} showZero>
        <BadgeTarget />
      </Badge>
      <Badge count={<ClockCircleOutlined style={{ color: "#f5222d", fontSize: 18 }} />}>
        <BadgeTarget />
      </Badge>
    </Space>
  );
}

function OverflowBadges() {
  return (
    <Space align="center" size="large" wrap>
      <Badge count={99}>
        <BadgeTarget />
      </Badge>
      <Badge count={100}>
        <BadgeTarget />
      </Badge>
      <Badge count={99} overflowCount={10}>
        <BadgeTarget />
      </Badge>
      <Badge count={1000} overflowCount={999}>
        <BadgeTarget />
      </Badge>
    </Space>
  );
}

function DynamicBadges() {
  const [count, setCount] = useState(5);
  const [showDot, setShowDot] = useState(true);
  return (
    <Flex align="start" gap="large" vertical>
      <Space align="center" size="large" wrap>
        <Badge count={count}>
          <BadgeTarget />
        </Badge>
        <Space.Compact>
          <Button
            aria-label="Decrease count"
            icon={<MinusOutlined />}
            onClick={() => setCount((value) => Math.max(0, value - 1))}
          />
          <Button
            aria-label="Increase count"
            icon={<PlusOutlined />}
            onClick={() => setCount((value) => value + 1)}
          />
        </Space.Compact>
      </Space>
      <Space align="center" size="large">
        <Badge dot={showDot} title="New activity">
          <BadgeTarget />
        </Badge>
        <Switch ariaLabel="Show badge dot" checked={showDot} onChange={setShowDot} />
      </Space>
    </Flex>
  );
}

function OffsetBadge() {
  return (
    <Badge count={5} offset={[10, 10]}>
      <BadgeTarget />
    </Badge>
  );
}

function StatusBadges() {
  return (
    <Flex align="start" gap="medium" vertical>
      <Badge status="success" text="Success" />
      <Badge status="error" text="Error" />
      <Badge status="default" text="Default" />
      <Badge status="processing" text="Processing" />
      <Badge status="warning" text="Warning" />
    </Flex>
  );
}

function RibbonBadges() {
  return (
    <Flex className="showcase-badge-ribbons" gap="large" vertical>
      <Badge.Ribbon text="Planning">
        <Card size="small" title="Project briefing">
          Review the project scope with the team.
        </Card>
      </Badge.Ribbon>
      <Badge.Ribbon color="purple" placement="start" text="Team">
        <Card size="small" title="Weekly sync">
          Share progress, risks, and next actions.
        </Card>
      </Badge.Ribbon>
    </Flex>
  );
}

function StandaloneBadges() {
  const [visible, setVisible] = useState(true);
  return (
    <Space align="center" size="large" wrap>
      <Switch ariaLabel="Show badge counts" checked={visible} onChange={setVisible} />
      <Badge color="#faad14" count={visible ? 11 : 0} />
      <Badge count={visible ? 25 : 0} />
      <Badge count={visible ? 109 : 0} color="green" />
      <Badge dot title="New notification">
        <NotificationOutlined style={{ fontSize: 18 }} />
      </Badge>
      <Badge dot title="New activity">
        <Typography.Link href="#badge-standalone">Link with activity</Typography.Link>
      </Badge>
    </Space>
  );
}

const colors = [
  "pink",
  "red",
  "orange",
  "cyan",
  "green",
  "blue",
  "purple",
  "geekblue",
  "gold",
  "lime",
] as const;

function SizeAndColorBadges() {
  return (
    <Flex align="start" gap="large" vertical>
      <Space align="center" size="large">
        <Badge count={5}>
          <BadgeTarget />
        </Badge>
        <Badge count={5} size="small">
          <BadgeTarget />
        </Badge>
      </Space>
      <Space align="center" size="large" wrap>
        {colors.map((color) => (
          <Badge color={color} key={color} status="default" text={color} />
        ))}
        <Badge color="#696fc7" status="default" text="custom" />
      </Space>
    </Flex>
  );
}

function SemanticBadges() {
  const badgeStyles: BadgeProps["styles"] = ({ props }) => ({
    indicator: {
      backgroundColor: props.size === "small" ? "#1668dc" : "#696fc7",
      fontWeight: 600,
    },
  });
  const ribbonStyles: BadgeRibbonProps["styles"] = {
    content: { fontWeight: 600 },
    indicator: { boxShadow: "0 2px 4px rgba(0, 0, 0, 0.14)" },
  };

  return (
    <Flex align="start" gap="large" vertical>
      <Space size="large">
        <Badge classNames={{ indicator: "showcase-badge-indicator" }} count={5} size="small">
          <BadgeTarget />
        </Badge>
        <Badge count={5} styles={badgeStyles}>
          <BadgeTarget />
        </Badge>
      </Space>
      <Badge.Ribbon
        classNames={{ root: "showcase-badge-ribbon-root" }}
        color="#696fc7"
        styles={ribbonStyles}
        text="Custom ribbon"
      >
        <Card size="small" title="Card with custom ribbon">
          Semantic classes and styles customize public component parts.
        </Card>
      </Badge.Ribbon>
    </Flex>
  );
}

export const badgeShowcase = defineShowcase({
  id: "badge",
  name: "Badge",
  category: "Data display",
  stage: "prod",
  description: "Adds a compact count, status, or short descriptor to another UI element.",
  whenToUse: [
    "Use Badge for unread counts, notifications, presence, or another small status near its subject.",
    "Keep badge content short and provide text elsewhere when the meaning is not obvious.",
  ],
  examples: [
    {
      id: "badge-basic",
      name: "Basic",
      description: "Counts hide at zero by default; showZero keeps zero visible.",
      preview: BasicBadges,
      code: `<Badge count={5}><Avatar shape="square" /></Badge>
<Badge count={0} showZero><Avatar shape="square" /></Badge>
<Badge count={<ClockCircleOutlined />}><Avatar shape="square" /></Badge>`,
    },
    {
      id: "badge-overflow",
      name: "Overflow count",
      description: "Large counts collapse behind the configured maximum.",
      preview: OverflowBadges,
      code: `<Badge count={99}><Avatar shape="square" /></Badge>
<Badge count={100}><Avatar shape="square" /></Badge>
<Badge count={99} overflowCount={10}><Avatar shape="square" /></Badge>
<Badge count={1000} overflowCount={999}><Avatar shape="square" /></Badge>`,
    },
    {
      id: "badge-dynamic",
      name: "Dynamic",
      description: "Count and dot indicators animate as their values change.",
      preview: DynamicBadges,
      code: `<Badge count={count}><Avatar shape="square" /></Badge>
<Badge dot={showDot} title="New activity"><Avatar shape="square" /></Badge>`,
    },
    {
      id: "badge-offset",
      name: "Offset",
      description: "Move the indicator horizontally and vertically from its default position.",
      preview: OffsetBadge,
      code: `<Badge count={5} offset={[10, 10]}>
  <Avatar shape="square" />
</Badge>`,
    },
    {
      id: "badge-status",
      name: "Status",
      description: "Standalone status dots combine semantic color with a readable label.",
      preview: StatusBadges,
      code: `<Badge status="success" text="Success" />
<Badge status="error" text="Error" />
<Badge status="default" text="Default" />
<Badge status="processing" text="Processing" />
<Badge status="warning" text="Warning" />`,
    },
    {
      id: "badge-ribbon",
      name: "Ribbon",
      description: "Ribbons attach a short category or status to the edge of a surface.",
      preview: RibbonBadges,
      code: `<Badge.Ribbon text="Planning">
  <Card title="Project briefing">Review the project scope.</Card>
</Badge.Ribbon>
<Badge.Ribbon text="Team" color="purple" placement="start">
  <Card title="Weekly sync">Share progress and risks.</Card>
</Badge.Ribbon>`,
    },
    {
      id: "badge-standalone",
      name: "Standalone and dot",
      description: "Badges can stand alone or mark text and icons with a simple dot.",
      preview: StandaloneBadges,
      code: `<Badge count={11} color="#faad14" />
<Badge count={109} color="green" />
<Badge dot title="New notification"><NotificationOutlined /></Badge>`,
    },
    {
      id: "badge-size-color",
      name: "Sizes and colors",
      description: "Choose between two count sizes and preset or custom colors.",
      preview: SizeAndColorBadges,
      code: `<Badge count={5} />
<Badge count={5} size="small" />
<Badge status="default" color="purple" text="purple" />
<Badge status="default" color="#696fc7" text="custom" />`,
    },
    {
      id: "badge-semantic",
      name: "Semantic styling",
      description: "Customize public root, indicator, and ribbon content parts.",
      preview: SemanticBadges,
      code: `<Badge
  count={5}
  classNames={{ indicator: "custom-indicator" }}
  styles={{ indicator: { backgroundColor: "#696fc7" } }}
>
  <Avatar shape="square" />
</Badge>

<Badge.Ribbon
  text="Custom ribbon"
  color="#696fc7"
  styles={{ content: { fontWeight: 600 } }}
>
  <Card>Content</Card>
</Badge.Ribbon>`,
    },
  ],
  api: [
    {
      name: "count",
      description: "Count or custom content shown in the indicator.",
      type: "ReactNode",
    },
    { name: "color", description: "Preset or custom indicator color.", type: "string" },
    {
      name: "dot",
      description: "Shows a dot instead of count content.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "offset",
      description: "Moves the indicator from its default position.",
      type: "readonly [number, number]",
    },
    {
      name: "overflowCount",
      description: "Largest number shown before adding a plus sign.",
      type: "number",
      defaultValue: "99",
    },
    {
      name: "showZero",
      description: "Keeps a numeric zero visible.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "size",
      description: "Controls the numeric indicator size.",
      type: '"medium" | "small"',
      defaultValue: '"medium"',
    },
    {
      name: "status",
      description: "Displays a semantic standalone status dot.",
      type: '"success" | "processing" | "default" | "error" | "warning"',
    },
    { name: "text", description: "Label displayed beside a status dot.", type: "ReactNode" },
    {
      name: "title",
      description: "Native tooltip for the indicator; false or null disables it.",
      type: "string | false | null",
    },
    {
      name: "classNames",
      description: "Classes for the public semantic parts.",
      type: "BadgeClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for the public semantic parts.",
      type: "BadgeStyles | function",
    },
    {
      name: "Badge.Ribbon",
      description: "Places a short ribbon on a child surface.",
      type: "{ text, color, placement, classNames, styles }",
    },
  ],
  accessibility: [
    "A dot alone should have a title or nearby text that explains its meaning.",
    "Do not rely only on status color; use the text prop when the status is important.",
  ],
});

import { useState } from "react";
import { TeamOutlined, UserOutlined } from "../../src/icons.js";
import { Avatar, Button, Flex, Space, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function avatarImage(label: string, background: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${background}"/><circle cx="40" cy="31" r="15" fill="white" fill-opacity=".88"/><path d="M15 76c3-17 13-26 25-26s22 9 25 26" fill="white" fill-opacity=".88"/><text x="40" y="74" text-anchor="middle" font-family="Arial" font-size="8" fill="${background}">${label}</text></svg>`,
  )}`;
}

const userImages = [
  avatarImage("ALEX", "#1668dc"),
  avatarImage("MAYA", "#52a36d"),
  avatarImage("SAM", "#d48806"),
  avatarImage("JUNE", "#722ed1"),
];

function BasicAvatars() {
  return (
    <Flex align="start" gap="large" vertical>
      <Space align="center" size="large" wrap>
        <Avatar aria-label="User" icon={<UserOutlined />} size={64} />
        <Avatar aria-label="User" icon={<UserOutlined />} size="large" />
        <Avatar aria-label="User" icon={<UserOutlined />} />
        <Avatar aria-label="User" icon={<UserOutlined />} size="small" />
        <Avatar aria-label="User" icon={<UserOutlined />} size={14} />
      </Space>
      <Space align="center" size="large" wrap>
        <Avatar aria-label="User" icon={<UserOutlined />} shape="square" size={64} />
        <Avatar aria-label="User" icon={<UserOutlined />} shape="square" size="large" />
        <Avatar aria-label="User" icon={<UserOutlined />} shape="square" />
        <Avatar aria-label="User" icon={<UserOutlined />} shape="square" size="small" />
        <Avatar aria-label="User" icon={<UserOutlined />} shape="square" size={14} />
      </Space>
    </Flex>
  );
}

const names = ["U", "Lucy", "Tom", "Edward"];
const colors = ["#f56a00", "#7265e6", "#d48806", "#008c95"];
const gaps = [4, 3, 2, 1];

function AutoSizedAvatar() {
  const [nameIndex, setNameIndex] = useState(0);
  const [gapIndex, setGapIndex] = useState(0);
  return (
    <Space align="center" size="large" wrap>
      <Avatar
        gap={gaps[gapIndex] ?? 4}
        size="large"
        style={{ backgroundColor: colors[nameIndex] ?? "#f56a00" }}
      >
        {names[nameIndex] ?? "U"}
      </Avatar>
      <Button onClick={() => setNameIndex((index) => (index + 1) % names.length)} size="small">
        Change user
      </Button>
      <Button onClick={() => setGapIndex((index) => (index + 1) % gaps.length)} size="small">
        Change gap
      </Button>
      <Typography.Text type="secondary">Gap: {gaps[gapIndex] ?? 4}px</Typography.Text>
    </Space>
  );
}

function AvatarTypes() {
  return (
    <Space align="center" size="large" wrap>
      <Avatar aria-label="User" icon={<UserOutlined />} />
      <Avatar>U</Avatar>
      <Avatar size={40}>USER</Avatar>
      <Avatar alt="Alex Morgan" src={userImages[0]} />
      <Avatar src={<img alt="Maya Chen" draggable={false} src={userImages[1]} />} />
      <Avatar style={{ backgroundColor: "#fde3cf", color: "#d4380d" }}>U</Avatar>
      <Avatar aria-label="Team" icon={<TeamOutlined />} style={{ backgroundColor: "#52a36d" }} />
      <Avatar aria-label="Fallback user" icon={<UserOutlined />} src="/missing-avatar-image.png" />
    </Space>
  );
}

function AvatarGroups() {
  return (
    <Space size="large" vertical>
      <Avatar.Group>
        {userImages.map((image, index) => (
          <Avatar alt={`Team member ${index + 1}`} key={image} src={image} />
        ))}
      </Avatar.Group>
      <Avatar.Group
        max={{
          count: 2,
          style: { backgroundColor: "#e6f4ff", color: "#1668dc" },
        }}
      >
        {userImages.map((image, index) => (
          <Avatar alt={`Team member ${index + 1}`} key={image} src={image} />
        ))}
      </Avatar.Group>
      <Avatar.Group max={{ count: 2, popover: { trigger: "click" } }} shape="square" size="large">
        {userImages.map((image, index) => (
          <Avatar alt={`Team member ${index + 1}`} key={image} src={image} />
        ))}
      </Avatar.Group>
    </Space>
  );
}

function ResponsiveAvatar() {
  return (
    <Space align="center" size="large">
      <Avatar
        aria-label="Responsive team avatar"
        icon={<TeamOutlined />}
        size={{ lg: 64, md: 48, sm: 40, xl: 80, xs: 24, xxl: 96 }}
        style={{ backgroundColor: "#1668dc" }}
      />
      <Typography.Text type="secondary">
        Resize the viewport to see the avatar follow the breakpoints.
      </Typography.Text>
    </Space>
  );
}

function BadgedAvatars() {
  return (
    <Flex align="center" gap="large">
      <span className="showcase-avatar-badge">
        <Avatar aria-label="User with one notification" icon={<UserOutlined />} shape="square" />
        <span className="showcase-avatar-badge-count">1</span>
      </span>
      <span className="showcase-avatar-badge">
        <Avatar alt="Maya Chen, online" shape="square" src={userImages[1]} />
        <span className="showcase-avatar-badge-dot">
          <span className="showcase-visually-hidden">Online</span>
        </span>
      </span>
    </Flex>
  );
}

export const avatarShowcase = defineShowcase({
  id: "avatar",
  name: "Avatar",
  category: "Data display",
  stage: "prod",
  description: "Represents a person, team, or object with an image, icon, or short label.",
  whenToUse: [
    "Use an avatar to make people and owned objects easier to identify at a glance.",
    "Prefer an image when one exists, and provide initials or an icon as a fallback.",
  ],
  examples: [
    {
      id: "avatar-basic",
      name: "Sizes and shapes",
      description: "Use named or numeric sizes with circular and square shapes.",
      preview: BasicAvatars,
      code: `<Avatar size={64} icon={<UserOutlined />} />
<Avatar size="large" icon={<UserOutlined />} />
<Avatar icon={<UserOutlined />} />
<Avatar size="small" icon={<UserOutlined />} />
<Avatar shape="square" icon={<UserOutlined />} />`,
    },
    {
      id: "avatar-auto-size",
      name: "Automatic text sizing",
      description: "Long labels scale to remain inside the avatar. Gap controls inner spacing.",
      preview: AutoSizedAvatar,
      code: `<Avatar gap={4} size="large" style={{ backgroundColor: "#1668dc" }}>
  Edward
</Avatar>`,
    },
    {
      id: "avatar-types",
      name: "Image, icon, and text",
      description: "If an image fails, the icon is used first, followed by the text fallback.",
      preview: AvatarTypes,
      code: `<Avatar icon={<UserOutlined />} />
<Avatar>U</Avatar>
<Avatar size={40}>USER</Avatar>
<Avatar alt="Alex Morgan" src="/alex.jpg" />
<Avatar icon={<UserOutlined />} src="/missing.jpg" />`,
    },
    {
      id: "avatar-group",
      name: "Avatar group",
      description:
        "Groups overlap consistently and can collect remaining members behind an overflow avatar.",
      preview: AvatarGroups,
      code: `<Avatar.Group
  max={{
    count: 2,
    style: { backgroundColor: "#e6f4ff", color: "#1668dc" },
    popover: { trigger: "click" },
  }}
>
  {members.map((member) => (
    <Avatar key={member.id} src={member.avatar} alt={member.name} />
  ))}
</Avatar.Group>`,
    },
    {
      id: "avatar-responsive",
      name: "Responsive size",
      description: "Map viewport breakpoints to numeric avatar sizes.",
      preview: ResponsiveAvatar,
      code: `<Avatar
  size={{ xs: 24, sm: 40, md: 48, lg: 64, xl: 80, xxl: 96 }}
  icon={<TeamOutlined />}
/>`,
    },
    {
      id: "avatar-badge",
      name: "With a badge",
      description: "Compose Avatar with a badge to communicate notifications or presence.",
      preview: BadgedAvatars,
      code: `<Badge count={1}>
  <Avatar shape="square" icon={<UserOutlined />} />
</Badge>
<Badge dot>
  <Avatar shape="square" src="/maya.jpg" alt="Maya Chen" />
</Badge>`,
    },
  ],
  api: [
    { name: "alt", description: "Alternative text for an image avatar.", type: "string" },
    {
      name: "gap",
      description: "Minimum horizontal space around a text label.",
      type: "number",
      defaultValue: "4",
    },
    { name: "icon", description: "Fallback or primary icon content.", type: "ReactNode" },
    {
      name: "shape",
      description: "Controls the avatar silhouette.",
      type: '"circle" | "square"',
      defaultValue: '"circle"',
    },
    {
      name: "size",
      description: "Uses a named, numeric, or responsive size.",
      type: 'number | "large" | "medium" | "small" | AvatarResponsiveSize',
      defaultValue: '"medium"',
    },
    { name: "src", description: "Image URL or custom image node.", type: "ReactNode" },
    { name: "srcSet", description: "Provides responsive image sources.", type: "string" },
    {
      name: "onError",
      description: "Handles image errors; return false to keep the broken image visible.",
      type: "() => boolean | undefined",
    },
    {
      name: "Avatar.Group max",
      description: "Limits visible members and configures the overflow avatar.",
      type: "{ count, style, popover }",
    },
  ],
  accessibility: [
    "Give image avatars meaningful alt text when the person's identity is not already written nearby.",
    "Icon-only avatars need an accessible label, and presence badges should not rely on color alone.",
  ],
});

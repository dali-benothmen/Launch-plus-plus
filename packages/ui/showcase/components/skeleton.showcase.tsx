import { useState } from "react";
import { DotChartOutlined } from "../../src/icons.js";
import {
  Avatar,
  Button,
  Divider,
  Flex,
  List,
  Segmented,
  Skeleton,
  type SkeletonAvatarShape,
  type SkeletonButtonShape,
  type SkeletonProps,
  type SkeletonSize,
  Space,
  Switch,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicSkeleton() {
  return <Skeleton />;
}

function ComplexSkeleton() {
  return (
    <Flex gap="large" vertical>
      <Skeleton avatar paragraph={{ rows: 4 }} />
      <Skeleton active avatar paragraph={{ rows: 4 }} round />
    </Flex>
  );
}

function SkeletonElements() {
  const [active, setActive] = useState(false);
  const [block, setBlock] = useState(false);
  const [size, setSize] = useState<SkeletonSize>("medium");
  const [buttonShape, setButtonShape] = useState<SkeletonButtonShape>("default");
  const [avatarShape, setAvatarShape] = useState<SkeletonAvatarShape>("circle");

  return (
    <Flex gap="medium" vertical>
      <Space wrap>
        <Skeleton.Button active={active} shape={buttonShape} size={size} />
        <Skeleton.Avatar active={active} shape={avatarShape} size={size} />
        <Skeleton.Input active={active} size={size} />
      </Space>
      <Skeleton.Button active={active} block={block} shape={buttonShape} size={size} />
      <Skeleton.Input active={active} block={block} size={size} />
      <Space wrap>
        <Skeleton.Image active={active} />
        <Skeleton.Node active={active} style={{ width: 160 }} />
        <Skeleton.Node active={active}>
          <DotChartOutlined style={{ color: "#bfbfbf", fontSize: 40 }} />
        </Skeleton.Node>
      </Space>
      <Divider />
      <Flex gap="medium" wrap>
        <Space>
          <Typography.Text>Active</Typography.Text>
          <Switch checked={active} onChange={setActive} />
        </Space>
        <Space>
          <Typography.Text>Block</Typography.Text>
          <Switch checked={block} onChange={setBlock} />
        </Space>
      </Flex>
      <Flex gap="small" vertical>
        <Typography.Text>Size</Typography.Text>
        <Segmented<SkeletonSize>
          onChange={setSize}
          options={["large", "medium", "small"]}
          value={size}
        />
      </Flex>
      <Flex gap="small" vertical>
        <Typography.Text>Button shape</Typography.Text>
        <Segmented<SkeletonButtonShape>
          onChange={setButtonShape}
          options={["default", "square", "round", "circle"]}
          value={buttonShape}
        />
      </Flex>
      <Flex gap="small" vertical>
        <Typography.Text>Avatar shape</Typography.Text>
        <Segmented<SkeletonAvatarShape>
          onChange={setAvatarShape}
          options={["square", "circle"]}
          value={avatarShape}
        />
      </Flex>
    </Flex>
  );
}

function LoadingContentSkeleton() {
  const [loading, setLoading] = useState(false);
  const showSkeleton = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1500);
  };
  return (
    <Flex align="flex-start" gap="medium" vertical>
      <Skeleton active loading={loading}>
        <Flex gap="small" vertical>
          <Typography.Title level={5}>Launch++ component library</Typography.Title>
          <Typography.Paragraph>
            Shared components give the application and plugins one predictable visual language.
          </Typography.Paragraph>
        </Flex>
      </Skeleton>
      <Button disabled={loading} onClick={showSkeleton}>
        Show skeleton
      </Button>
    </Flex>
  );
}

interface ActivityItem {
  readonly id: number;
  readonly name: string;
  readonly summary: string;
}

const activityItems: ReadonlyArray<ActivityItem> = [
  { id: 1, name: "Maya", summary: "Updated the project brief" },
  { id: 2, name: "Sam", summary: "Moved three tasks to review" },
  { id: 3, name: "Noah", summary: "Invited the product team" },
];

function ListSkeleton() {
  const [loading, setLoading] = useState(true);
  return (
    <Flex gap="medium" vertical>
      <Space>
        <Typography.Text>Content loaded</Typography.Text>
        <Switch checked={!loading} onChange={(checked) => setLoading(!checked)} />
      </Space>
      <List
        height={250}
        itemRender={(item) => (
          <Skeleton active avatar loading={loading} paragraph={{ rows: 2 }}>
            <Flex align="center" gap="medium">
              <Avatar>{item.name[0]}</Avatar>
              <Flex gap={2} vertical>
                <Typography.Text strong>{item.name}</Typography.Text>
                <Typography.Text type="secondary">{item.summary}</Typography.Text>
              </Flex>
            </Flex>
          </Skeleton>
        )}
        items={activityItems}
        rowKey="id"
      />
    </Flex>
  );
}

function SemanticSkeleton() {
  const styles: SkeletonProps["styles"] = ({ props }) => ({
    avatar: { border: "1px solid var(--launch-ui-primary-border)" },
    root: {
      ...(props.active
        ? {
            border: "1px solid var(--launch-ui-primary-border)",
            borderRadius: 8,
            padding: 12,
          }
        : {}),
    },
    title: { backgroundColor: "var(--launch-ui-primary-bg)", height: 20 },
  });
  return (
    <Flex gap="medium" wrap>
      <Skeleton
        avatar
        classNames={{ root: "showcase-skeleton-semantic" }}
        paragraph={false}
        styles={styles}
      />
      <Skeleton active styles={styles} />
    </Flex>
  );
}

export const skeletonShowcase = defineShowcase({
  id: "skeleton",
  name: "Skeleton",
  category: "Feedback",
  stage: "prod",
  description: "Provides a structural placeholder while content is loading for the first time.",
  usage: 'import { Skeleton } from "@launchpp/ui";',
  whenToUse: [
    "Use Skeleton for first-load content whose layout is already known, especially lists and information-dense surfaces.",
    "Use a spinner for short actions or repeated updates where replacing existing content would be disruptive.",
  ],
  examples: [
    {
      id: "skeleton-basic",
      name: "Basic",
      description: "The default skeleton renders a title and three paragraph rows.",
      preview: BasicSkeleton,
      code: `<Skeleton />`,
    },
    {
      id: "skeleton-complex",
      name: "Complex and active",
      description: "Add an avatar, choose paragraph rows, round the blocks, and enable animation.",
      preview: ComplexSkeleton,
      code: `<Skeleton avatar paragraph={{ rows: 4 }} />
<Skeleton active avatar paragraph={{ rows: 4 }} round />`,
    },
    {
      id: "skeleton-elements",
      name: "Button, Avatar, Input, Image, and Node",
      description: "Use compound placeholders when an exact control or media shape is needed.",
      preview: SkeletonElements,
      code: `<Skeleton.Button active size="medium" shape="round" />
<Skeleton.Avatar active size="medium" shape="circle" />
<Skeleton.Input active block />
<Skeleton.Image active />
<Skeleton.Node active><DotChartOutlined /></Skeleton.Node>`,
    },
    {
      id: "skeleton-content",
      name: "Reveal content",
      description: "When loading is false, Skeleton returns its children without an extra wrapper.",
      preview: LoadingContentSkeleton,
      code: `<Skeleton active loading={loading}>
  <ProjectSummary />
</Skeleton>`,
    },
    {
      id: "skeleton-list",
      name: "List",
      description: "Reuse the content skeleton inside List while the first page is loading.",
      preview: ListSkeleton,
      code: `<List
  items={items}
  rowKey="id"
  itemRender={(item) => (
    <Skeleton active avatar loading={loading} paragraph={{ rows: 2 }}>
      <ActivityItem item={item} />
    </Skeleton>
  )}
/>`,
    },
    {
      id: "skeleton-semantic",
      name: "Semantic styling",
      description: "Customize documented regions without targeting private DOM structure.",
      preview: SemanticSkeleton,
      code: `<Skeleton
  active
  classNames={{ root: "loading-card" }}
  styles={{
    title: { backgroundColor: "var(--launch-ui-primary-bg)" },
    avatar: { border: "1px solid var(--launch-ui-primary-border)" },
  }}
/>`,
    },
  ],
  api: [
    {
      name: "active",
      description: "Enables the loading gradient animation.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "loading",
      description: "Shows the skeleton when true and children when false.",
      type: "boolean",
    },
    {
      name: "avatar",
      description: "Shows and configures the avatar placeholder.",
      type: "boolean | SkeletonAvatarConfig",
      defaultValue: "false",
    },
    {
      name: "title",
      description: "Shows and configures the title placeholder.",
      type: "boolean | { width?: number | string }",
      defaultValue: "true",
    },
    {
      name: "paragraph",
      description: "Shows and configures paragraph rows and widths.",
      type: "boolean | SkeletonParagraphProps",
      defaultValue: "true",
    },
    {
      name: "round",
      description: "Uses pill radii for title and paragraph blocks.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "SkeletonClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "SkeletonStyles | function",
    },
    {
      name: "Skeleton.Avatar",
      description: "Standalone avatar placeholder.",
      type: "{ active?, shape?, size? }",
    },
    {
      name: "Skeleton.Button",
      description: "Standalone button placeholder.",
      type: "{ active?, block?, shape?, size? }",
    },
    {
      name: "Skeleton.Input",
      description: "Standalone input placeholder.",
      type: "{ active?, block?, size? }",
    },
    {
      name: "Skeleton.Image",
      description: "Standalone image placeholder with a default icon.",
      type: "SkeletonImageProps",
    },
    {
      name: "Skeleton.Node",
      description: "Generic placeholder that can contain a custom node.",
      type: "SkeletonNodeProps",
    },
  ],
  accessibility: [
    "Skeleton visuals are hidden from assistive technology because they do not convey content themselves.",
    "Mark the surrounding content region as busy when loading state must be announced.",
    "Avoid replacing previously loaded content with a skeleton during routine refreshes.",
  ],
});

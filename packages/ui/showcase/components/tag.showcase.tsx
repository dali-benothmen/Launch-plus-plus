import { type ReactNode, useRef, useState } from "react";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FacebookOutlined,
  LinkedinOutlined,
  PlusOutlined,
  SyncOutlined,
  TwitterOutlined,
  YoutubeOutlined,
} from "../../src/icons.js";
import {
  Divider,
  Flex,
  Input,
  Space,
  Tag,
  type TagPresetColor,
  type TagProps,
  type TagVariant,
  Tooltip,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicTags() {
  return (
    <Flex align="center" gap="small" wrap>
      <Tag>Tag 1</Tag>
      <Tag href="#tag">Link</Tag>
      <Tag closeIcon onClose={(event) => event.preventDefault()}>
        Prevent default
      </Tag>
      <Tag closeIcon={<CloseCircleOutlined />}>Tag 2</Tag>
      <Tag closable={{ "aria-label": "Remove Tag 3", closeIcon: <DeleteOutlined /> }}>Tag 3</Tag>
      <Tag disabled closeIcon>
        Disabled
      </Tag>
    </Flex>
  );
}

function DynamicTags() {
  const [tags, setTags] = useState(["Unremovable", "Planning", "Product discovery"]);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const showInput = () => {
    setInputVisible(true);
    window.setTimeout(() => inputRef.current?.focus());
  };
  const confirmInput = () => {
    const nextTag = inputValue.trim();
    if (nextTag && !tags.includes(nextTag)) setTags((current) => [...current, nextTag]);
    setInputValue("");
    setInputVisible(false);
  };

  return (
    <Flex align="center" gap="small" wrap>
      {tags.map((tag, index) => {
        const tagNode = (
          <Tag
            closable={index !== 0}
            key={tag}
            onClose={() => setTags((current) => current.filter((item) => item !== tag))}
          >
            {tag.length > 18 ? `${tag.slice(0, 18)}…` : tag}
          </Tag>
        );
        return tag.length > 18 ? (
          <Tooltip key={tag} title={tag}>
            {tagNode}
          </Tooltip>
        ) : (
          tagNode
        );
      })}
      {inputVisible ? (
        <Input
          onBlur={confirmInput}
          onChange={(event) => setInputValue(event.target.value)}
          onPressEnter={confirmInput}
          ref={inputRef}
          size="small"
          style={{ width: 112 }}
          value={inputValue}
        />
      ) : (
        <Tag
          icon={<PlusOutlined />}
          onClick={showInput}
          style={{ borderStyle: "dashed" }}
          variant="outlined"
        >
          New tag
        </Tag>
      )}
    </Flex>
  );
}

const statusTags: ReadonlyArray<{
  readonly color: TagPresetColor;
  readonly icon: ReactNode;
}> = [
  { color: "success", icon: <CheckCircleOutlined /> },
  { color: "processing", icon: <SyncOutlined spin /> },
  { color: "warning", icon: <ExclamationCircleOutlined /> },
  { color: "error", icon: <CloseCircleOutlined /> },
  { color: "default", icon: <ClockCircleOutlined /> },
];
const tagVariants: ReadonlyArray<TagVariant> = ["filled", "solid", "outlined"];

function StatusTags() {
  return (
    <Space size="medium" vertical>
      {tagVariants.map((variant) => (
        <div key={variant}>
          <Divider plain titlePlacement="start">
            Status ({variant})
          </Divider>
          <Flex align="center" gap="small" wrap>
            {statusTags.map(({ color, icon }) => (
              <Tag color={color} icon={icon} key={color} variant={variant}>
                {color}
              </Tag>
            ))}
          </Flex>
        </div>
      ))}
    </Space>
  );
}

const presetColors: ReadonlyArray<TagPresetColor> = [
  "magenta",
  "red",
  "volcano",
  "orange",
  "gold",
  "lime",
  "green",
  "cyan",
  "blue",
  "geekblue",
  "purple",
];
const customColors = ["#f50", "#2db7f5", "#87d068", "#108ee9"] as const;

function ColorfulTags() {
  return (
    <Space size="medium" vertical>
      {tagVariants.map((variant) => (
        <div key={variant}>
          <Divider plain titlePlacement="start">
            Presets ({variant})
          </Divider>
          <Flex align="center" gap="small" wrap>
            {presetColors.map((color) => (
              <Tag color={color} key={color} variant={variant}>
                {color}
              </Tag>
            ))}
          </Flex>
        </div>
      ))}
      <div>
        <Divider plain titlePlacement="start">
          Custom colors
        </Divider>
        <Flex align="center" gap="small" wrap>
          {customColors.map((color) => (
            <Tag color={color} key={color}>
              {color}
            </Tag>
          ))}
        </Flex>
      </div>
    </Space>
  );
}

const categoryOptions = ["Movies", "Books", "Music", "Sports"] as const;

function CheckableTags() {
  const [checked, setChecked] = useState(true);
  const [single, setSingle] = useState<string | null>("Books");
  const [multiple, setMultiple] = useState<string[]>(["Movies", "Music"]);
  return (
    <Flex gap="medium" vertical>
      <Flex align="center" gap="medium">
        <Typography.Text style={{ width: 64 }}>Checkable</Typography.Text>
        <Tag.CheckableTag checked={checked} onChange={setChecked}>
          Yes
        </Tag.CheckableTag>
      </Flex>
      <Flex align="center" gap="medium">
        <Typography.Text style={{ width: 64 }}>Single</Typography.Text>
        <Tag.CheckableTagGroup<string>
          onChange={setSingle}
          options={categoryOptions}
          value={single}
        />
      </Flex>
      <Flex align="center" gap="medium">
        <Typography.Text style={{ width: 64 }}>Multiple</Typography.Text>
        <Tag.CheckableTagGroup<string>
          multiple
          onChange={setMultiple}
          options={categoryOptions}
          value={multiple}
        />
      </Flex>
    </Flex>
  );
}

const socialTags = [
  { color: "#55acee", icon: <TwitterOutlined />, label: "Twitter" },
  { color: "#cd201f", icon: <YoutubeOutlined />, label: "Youtube" },
  { color: "#3b5999", icon: <FacebookOutlined />, label: "Facebook" },
  { color: "#0a66c2", icon: <LinkedinOutlined />, label: "LinkedIn" },
] as const;

function IconTags() {
  const [selected, setSelected] = useState("Twitter");
  return (
    <Space size="medium" vertical>
      <div>
        <Divider plain titlePlacement="start">
          Tag with icon
        </Divider>
        <Flex align="center" gap="small" wrap>
          {socialTags.map((tag) => (
            <Tag color={tag.color} icon={tag.icon} key={tag.label} variant="solid">
              {tag.label}
            </Tag>
          ))}
        </Flex>
      </div>
      <div>
        <Divider plain titlePlacement="start">
          Checkable tag with icon
        </Divider>
        <Flex align="center" gap="small" wrap>
          {socialTags.map((tag) => (
            <Tag.CheckableTag
              checked={selected === tag.label}
              icon={tag.icon}
              key={tag.label}
              onChange={() => setSelected(tag.label)}
            >
              {tag.label}
            </Tag.CheckableTag>
          ))}
        </Flex>
      </div>
    </Space>
  );
}

const semanticStyles: NonNullable<TagProps["styles"]> = ({ props }) => ({
  content: { fontWeight: 600 },
  icon: { color: props.variant === "solid" ? "currentColor" : "#389e0d" },
  root: { paddingInline: 10 },
});

function SemanticTags() {
  return (
    <Flex align="center" gap="small" wrap>
      <Tag icon={<CheckCircleOutlined />} styles={semanticStyles}>
        Object
      </Tag>
      <Tag color="purple" icon={<SyncOutlined />} styles={semanticStyles} variant="solid">
        Function
      </Tag>
      <Tag.CheckableTagGroup
        defaultValue="React"
        options={["React", "Vue", "Angular"]}
        styles={{ root: { gap: 12 }, item: { border: "1px solid #91caff" } }}
      />
    </Flex>
  );
}

export const tagShowcase = defineShowcase({
  id: "tag",
  name: "Tag",
  category: "Data display",
  stage: "prod",
  description: "Marks and categorizes compact attributes, statuses, and selectable labels.",
  whenToUse: [
    "Use Tag for short categorical values, statuses, or attributes attached to another record.",
    "Use CheckableTag when a compact label also acts as a filter or selection.",
    "Keep tag text concise and do not rely on color alone to communicate meaning.",
  ],
  examples: [
    {
      id: "tag-basic",
      name: "Basic and closable",
      description:
        "Tags may link, close with a default or custom icon, prevent closing, or be disabled.",
      preview: BasicTags,
      code: `<Tag>Tag 1</Tag>
<Tag href="/projects">Link</Tag>
<Tag closeIcon onClose={(event) => event.preventDefault()}>Prevent default</Tag>
<Tag closeIcon={<CloseCircleOutlined />}>Tag 2</Tag>
<Tag closable={{ closeIcon: <DeleteOutlined />, "aria-label": "Remove tag" }}>Tag 3</Tag>`,
    },
    {
      id: "tag-dynamic",
      name: "Add and remove dynamically",
      description:
        "Compose Tag with the existing Input and Tooltip components to manage a changing collection.",
      preview: DynamicTags,
      code: `{tags.map((tag, index) => (
  <Tag closable={index !== 0} onClose={() => removeTag(tag)} key={tag}>
    {tag}
  </Tag>
))}
{inputVisible ? <Input size="small" onPressEnter={confirmInput} /> : (
  <Tag icon={<PlusOutlined />} onClick={showInput} variant="outlined">New tag</Tag>
)}`,
    },
    {
      id: "tag-status",
      name: "Status tags",
      description:
        "Semantic status colors work consistently across filled, solid, and outlined variants.",
      preview: StatusTags,
      code: `<Tag color="success" icon={<CheckCircleOutlined />}>success</Tag>
<Tag color="processing" icon={<SyncOutlined spin />} variant="solid">processing</Tag>
<Tag color="warning" icon={<ExclamationCircleOutlined />} variant="outlined">warning</Tag>`,
    },
    {
      id: "tag-colors",
      name: "Preset and custom colors",
      description:
        "Use a preset name for consistent color semantics or a CSS color for a specific integration.",
      preview: ColorfulTags,
      code: `<Tag color="magenta">magenta</Tag>
<Tag color="geekblue" variant="solid">geekblue</Tag>
<Tag color="#2db7f5">Custom color</Tag>`,
    },
    {
      id: "tag-checkable",
      name: "Checkable",
      description:
        "CheckableTag is controlled; CheckableTagGroup supports controlled single and multiple selection.",
      preview: CheckableTags,
      code: `<Tag.CheckableTag checked={checked} onChange={setChecked}>Yes</Tag.CheckableTag>

<Tag.CheckableTagGroup
  options={["Movies", "Books", "Music", "Sports"]}
  value={category}
  onChange={setCategory}
/>

<Tag.CheckableTagGroup multiple options={options} value={categories} onChange={setCategories} />`,
    },
    {
      id: "tag-icons",
      name: "Icons",
      description: "Icons stay aligned in regular, solid, closable, and checkable tags.",
      preview: IconTags,
      code: `<Tag icon={<TwitterOutlined />} color="#55acee" variant="solid">Twitter</Tag>
<Tag.CheckableTag icon={<TwitterOutlined />} checked={checked} onChange={setChecked}>
  Twitter
</Tag.CheckableTag>`,
    },
    {
      id: "tag-semantic",
      name: "Semantic styling",
      description: "Style documented semantic parts without targeting private markup.",
      preview: SemanticTags,
      code: `<Tag
  icon={<CheckCircleOutlined />}
  styles={{ root: { paddingInline: 10 }, content: { fontWeight: 600 } }}
>
  Object
</Tag>`,
    },
  ],
  api: [
    {
      name: "color",
      description: "Preset status/palette name or custom CSS color.",
      type: "TagColor",
      defaultValue: '"default"',
    },
    {
      name: "variant",
      description: "Visual treatment of the tag.",
      type: '"filled" | "solid" | "outlined"',
      defaultValue: '"filled"',
    },
    { name: "icon", description: "Icon rendered before the content.", type: "ReactNode" },
    {
      name: "closable / closeIcon",
      description: "Shows the default or a custom close control.",
      type: "boolean | ReactNode | TagClosableConfig",
      defaultValue: "false",
    },
    {
      name: "onClose",
      description: "Runs before closing; preventDefault keeps the tag visible.",
      type: "(event: MouseEvent<HTMLElement>) => void",
    },
    { name: "href / target", description: "Renders a navigable tag.", type: "string" },
    {
      name: "disabled",
      description: "Disables link, close, and interactive behavior.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "classNames",
      description: "Classes for root, icon, content, and closeIcon semantic parts.",
      type: "TagClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for root, icon, content, and closeIcon semantic parts.",
      type: "TagStyles | function",
    },
    { name: "CheckableTag.checked", description: "Controlled checked state.", type: "boolean" },
    {
      name: "CheckableTag.onChange",
      description: "Reports the next checked state.",
      type: "(checked: boolean) => void",
    },
    {
      name: "CheckableTagGroup.options",
      description: "Values or option objects rendered by the group.",
      type: "readonly (TagValue | TagCheckableOption)[]",
    },
    {
      name: "CheckableTagGroup.multiple",
      description: "Allows more than one selected value.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "CheckableTagGroup.value",
      description: "Controlled single or multiple selection.",
      type: "TagValue | readonly TagValue[] | null",
    },
  ],
  accessibility: [
    "Use text or an icon alongside color for semantic statuses.",
    "Give custom close controls a clear aria-label.",
    "Checkable tags expose pressed state and remain keyboard operable.",
  ],
});

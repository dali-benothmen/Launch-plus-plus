import { useEffect, useRef, useState } from "react";
import { CloseCircleFilled, UserOutlined } from "../../src/icons.js";
import {
  Button,
  Flex,
  Form,
  Mentions,
  type MentionsOption,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const people: ReadonlyArray<MentionsOption> = [
  { value: "avery", label: "Avery Stone" },
  { value: "maya", label: "Maya Chen" },
  { value: "noah", label: "Noah Williams" },
  { value: "olivia", label: "Olivia Taylor", disabled: true },
];

function BasicMentions() {
  const [value, setValue] = useState("Hello @");
  const [message, setMessage] = useState("Select a teammate from the suggestions.");
  return (
    <Space className="showcase-mentions-stack" size="medium" vertical>
      <Mentions
        onChange={setValue}
        onSelect={(option) => setMessage(`Mentioned ${option.label ?? option.value}`)}
        options={people}
        placeholder="Type @ to mention someone"
        value={value}
      />
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function VariantMentions() {
  return (
    <Flex className="showcase-mentions-stack" gap="medium" vertical>
      <Mentions options={people} placeholder="Outlined" />
      <Mentions options={people} placeholder="Filled" variant="filled" />
      <Mentions options={people} placeholder="Borderless" variant="borderless" />
      <Mentions options={people} placeholder="Underlined" variant="underlined" />
    </Flex>
  );
}

const mentionColors = [
  { label: "Blue", value: "#e6f4ff" },
  { label: "Gray", value: "var(--launch-ui-fill-secondary)" },
  { label: "Green", value: "#f6ffed" },
  { label: "Pink", value: "#fff0f6" },
] as const;

function MentionColors() {
  const [color, setColor] = useState<string>(mentionColors[0].value);
  return (
    <Space className="showcase-mentions-stack" size="medium" vertical>
      <Flex gap="small" wrap="wrap">
        {mentionColors.map((option) => (
          <Button
            aria-pressed={color === option.value}
            key={option.label}
            onClick={() => setColor(option.value)}
            variant={color === option.value ? "primary" : "default"}
          >
            {option.label}
          </Button>
        ))}
      </Flex>
      <Mentions
        defaultValue="Review this with @avery and @maya"
        mentionColor={color}
        options={people}
      />
    </Space>
  );
}

interface MentionFields {
  collaborators?: string;
}

function MentionsForm() {
  const [result, setResult] = useState("Mention at least two teammates.");
  return (
    <Space className="showcase-mentions-stack" size="medium" vertical>
      <Form<MentionFields>
        layout="vertical"
        onFinish={(values) => {
          const count = Mentions.getMentions(values.collaborators ?? "").length;
          setResult(`Saved ${count} mentions.`);
        }}
      >
        <Form.Item<MentionFields>
          label="Collaborators"
          name="collaborators"
          rules={[
            {
              message: "Mention at least two teammates",
              required: true,
              validator: (value) =>
                Mentions.getMentions(String(value ?? "")).length >= 2
                  ? undefined
                  : "Mention at least two teammates",
            },
          ]}
        >
          <Mentions autoSize={{ minRows: 2, maxRows: 4 }} options={people} />
        </Form.Item>
        <Form.Item>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </Form.Item>
      </Form>
      <Typography.Text type="secondary">{result}</Typography.Text>
    </Space>
  );
}

function StateMentions() {
  return (
    <Flex className="showcase-mentions-stack" gap="medium" vertical>
      <Mentions defaultValue="@avery cannot be edited" disabled options={people} />
      <Mentions defaultValue="@maya is read only" options={people} readOnly />
    </Flex>
  );
}

function PopupMentions() {
  return (
    <Mentions
      className="showcase-mentions-stack"
      defaultValue="Assign this to @"
      options={people}
      popupRender={(menu) => (
        <div>
          <div className="showcase-mentions-popup-heading">
            <UserOutlined /> Team members
          </div>
          {menu}
        </div>
      )}
    />
  );
}

function AutoSizeMentions() {
  return (
    <Flex className="showcase-mentions-stack" gap="medium" vertical>
      <Mentions autoSize options={people} placeholder="Grows with its content" />
      <Mentions
        autoSize={{ minRows: 2, maxRows: 4 }}
        options={people}
        placeholder="Between two and four rows"
      />
    </Flex>
  );
}

function SizeMentions() {
  return (
    <Flex className="showcase-mentions-stack" gap="medium" vertical>
      <Mentions options={people} placeholder="Large" size="large" />
      <Mentions options={people} placeholder="Medium" />
      <Mentions options={people} placeholder="Small" size="small" />
    </Flex>
  );
}

function AsyncMentions() {
  const [options, setOptions] = useState<ReadonlyArray<MentionsOption>>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Mentions
      className="showcase-mentions-stack"
      loading={loading}
      notFoundContent="No matching teammates"
      onSearch={(query) => {
        window.clearTimeout(timer.current);
        setLoading(true);
        timer.current = window.setTimeout(() => {
          setOptions(
            people.filter((option) =>
              option.value.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            ),
          );
          setLoading(false);
        }, 500);
      }}
      options={options}
      placeholder="Type @ to search"
    />
  );
}

const topics: ReadonlyArray<MentionsOption> = [
  { value: "design-system", label: "Design system" },
  { value: "plugin-sdk", label: "Plugin SDK" },
  { value: "release", label: "Release" },
];

function PrefixMentions() {
  const [activePrefix, setActivePrefix] = useState("@");
  return (
    <Space className="showcase-mentions-stack" size="medium" vertical>
      <Mentions
        onSearch={(_, prefix) => setActivePrefix(prefix)}
        options={activePrefix === "#" ? topics : people}
        placeholder="Use @ for people and # for topics"
        prefix={["@", "#"]}
      />
      <Typography.Text type="secondary">
        Active suggestions: {activePrefix === "#" ? "topics" : "people"}
      </Typography.Text>
    </Space>
  );
}

function PlacementMentions() {
  return (
    <div className="showcase-mentions-placement">
      <Mentions defaultValue="Open above @" options={people} placement="top" />
    </div>
  );
}

function ClearMentions() {
  return (
    <Flex className="showcase-mentions-stack" gap="medium" vertical>
      <Mentions allowClear defaultValue="Hello @avery" options={people} />
      <Mentions
        allowClear={{ clearIcon: <CloseCircleFilled /> }}
        defaultValue="Custom clear icon"
        options={people}
      />
    </Flex>
  );
}

function StatusMentions() {
  return (
    <Flex className="showcase-mentions-stack" gap="medium" vertical>
      <Mentions options={people} placeholder="Error" status="error" />
      <Mentions options={people} placeholder="Warning" status="warning" />
      <Mentions options={people} placeholder="Validating" status="validating" />
      <Mentions options={people} placeholder="Success" status="success" />
    </Flex>
  );
}

function SemanticMentions() {
  return (
    <Mentions
      className="showcase-mentions-stack"
      classNames={{ option: "showcase-mentions-option" }}
      defaultValue="Styled @avery suggestions @"
      options={people}
      styles={({ props }) => ({
        mention: { background: "#e6f4ff", color: "#0958d9" },
        popup: { border: `1px solid var(--launch-ui-primary)`, minWidth: "280px" },
        textarea: { fontWeight: props.value ? 600 : 400 },
      })}
    />
  );
}

export const mentionsShowcase = defineShowcase({
  id: "mentions",
  name: "Mentions",
  category: "Data entry",
  stage: "prod",
  description: "Lets users mention people, topics, or other entities inside free-form text.",
  usage: `import { Mentions } from "@launchpp/ui";`,
  whenToUse: [
    "Use Mentions in comments, descriptions, and messages where users need to reference known entities.",
    "Use Select when the entire field must resolve to one or more fixed values.",
  ],
  examples: [
    {
      id: "mentions-basic",
      name: "Basic",
      description:
        "Type a trigger and filter the available options, then select with mouse or keyboard.",
      preview: BasicMentions,
      code: `<Mentions
  options={people}
  value={value}
  onChange={setValue}
  onSelect={(option) => console.log(option.value)}
/>`,
    },
    {
      id: "mentions-variants",
      name: "Variants",
      description: "Choose the same four surface treatments available across data-entry controls.",
      preview: VariantMentions,
      code: `<Mentions variant="outlined" />
<Mentions variant="filled" />
<Mentions variant="borderless" />
<Mentions variant="underlined" />`,
    },
    {
      id: "mentions-colors",
      name: "Mention colors",
      description:
        "Mentions use a light-blue tag by default. Set mentionColor to match the surrounding context.",
      preview: MentionColors,
      code: `<Mentions
  defaultValue="Review this with @avery and @maya"
  mentionColor="#e6f4ff"
  options={people}
/>`,
    },
    {
      id: "mentions-form",
      name: "With Form",
      description:
        "Collect text through Form and validate parsed mentions with Mentions.getMentions.",
      preview: MentionsForm,
      code: `<Form onFinish={save}>
  <Form.Item
    label="Collaborators"
    name="collaborators"
    rules={[{
      validator: (value) =>
        Mentions.getMentions(value ?? "").length >= 2
          ? undefined
          : "Mention at least two teammates",
    }]}
  >
    <Mentions options={people} />
  </Form.Item>
  <Button type="submit">Save</Button>
</Form>`,
    },
    {
      id: "mentions-states",
      name: "Disabled and read only",
      description: "Disabled content is unavailable, while read-only content remains readable.",
      preview: StateMentions,
      code: `<Mentions disabled defaultValue="@avery cannot be edited" />
<Mentions readOnly defaultValue="@maya is read only" />`,
    },
    {
      id: "mentions-popup",
      name: "Custom popup",
      description: "Wrap the standard option menu with additional context through popupRender.",
      preview: PopupMentions,
      code: `<Mentions
  options={people}
  popupRender={(menu) => <div><header>Team members</header>{menu}</div>}
/>`,
    },
    {
      id: "mentions-autosize",
      name: "Automatic size",
      description: "Grow with content freely or within a minimum and maximum number of rows.",
      preview: AutoSizeMentions,
      code: `<Mentions autoSize />
<Mentions autoSize={{ minRows: 2, maxRows: 4 }} />`,
    },
    {
      id: "mentions-sizes",
      name: "Sizes",
      description: "Large, medium, and small sizes align with the shared control system.",
      preview: SizeMentions,
      code: `<Mentions size="large" />
<Mentions size="medium" />
<Mentions size="small" />`,
    },
    {
      id: "mentions-async",
      name: "Asynchronous suggestions",
      description: "Show loading feedback while resolving suggestions from an external source.",
      preview: AsyncMentions,
      code: `<Mentions
  loading={loading}
  options={options}
  onSearch={(query) => loadPeople(query)}
/>`,
    },
    {
      id: "mentions-prefixes",
      name: "Multiple triggers",
      description: "Provide different entity sets for people and topics.",
      preview: PrefixMentions,
      code: `<Mentions
  prefix={["@", "#"]}
  options={activePrefix === "#" ? topics : people}
  onSearch={(_, prefix) => setActivePrefix(prefix)}
/>`,
    },
    {
      id: "mentions-placement",
      name: "Placement",
      description: "Place suggestions above the field when space below is limited.",
      preview: PlacementMentions,
      code: `<Mentions placement="top" options={people} />`,
    },
    {
      id: "mentions-clear",
      name: "Clear control",
      description: "Show the default clear action or provide a custom clear icon.",
      preview: ClearMentions,
      code: `<Mentions allowClear defaultValue="Hello @avery" />
<Mentions allowClear={{ clearIcon: <CloseCircleFilled /> }} defaultValue="Hello" />`,
    },
    {
      id: "mentions-status",
      name: "Status",
      description: "Communicate validation, warning, progress, and success states.",
      preview: StatusMentions,
      code: `<Mentions status="error" />
<Mentions status="warning" />
<Mentions status="validating" />
<Mentions status="success" />`,
    },
    {
      id: "mentions-semantic",
      name: "Custom semantic styling",
      description: "Customize documented semantic elements with class and style maps.",
      preview: SemanticMentions,
      code: `<Mentions
  classNames={{ option: "project-mention-option" }}
  styles={{ popup: { minWidth: 280 } }}
/>`,
    },
  ],
  api: [
    {
      name: "options",
      description: "Defines selectable mention values, labels, and disabled states.",
      type: "MentionsOption[]",
    },
    {
      name: "value / defaultValue",
      description: "Controls or initializes the complete text value.",
      type: "string",
    },
    {
      name: "prefix",
      description: "Defines one or more characters that open mention suggestions.",
      type: "string | string[]",
      defaultValue: '"@"',
    },
    {
      name: "mentionColor",
      description: "Sets the background color used by rendered mention tags.",
      type: "string",
      defaultValue: '"light blue"',
    },
    {
      name: "split",
      description: "Appends a separator after a selected mention.",
      type: "string",
      defaultValue: '" "',
    },
    {
      name: "filterOption",
      description: "Customizes local matching or disables built-in filtering.",
      type: "false | (input, option) => boolean",
    },
    {
      name: "autoSize",
      description: "Grows the field with content, optionally between row limits.",
      type: "boolean | { minRows, maxRows }",
      defaultValue: "false",
    },
    {
      name: "placement",
      description: "Places the suggestion popup above or below the field.",
      type: '"top" | "bottom"',
      defaultValue: '"bottom"',
    },
    {
      name: "allowClear",
      description: "Shows a clear action and optionally replaces its icon.",
      type: "boolean | { clearIcon, disabled }",
      defaultValue: "false",
    },
    {
      name: "onChange",
      description: "Runs with the complete text value after editing or selection.",
      type: "(value: string) => void",
    },
    {
      name: "onSearch / onSelect",
      description: "Runs while querying suggestions and after choosing an option.",
      type: "functions",
    },
    {
      name: "Mentions.getMentions",
      description: "Extracts mention values and prefixes from a text string.",
      type: "(value, config?) => MentionValue[]",
    },
  ],
  accessibility: [
    "The text area exposes combobox state and references the active listbox option.",
    "Arrow keys move through suggestions, Enter or Tab selects, and Escape dismisses the popup.",
    "Disabled options remain visible but cannot be selected by pointer or keyboard.",
  ],
});

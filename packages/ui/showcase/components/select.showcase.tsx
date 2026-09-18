import { useState } from "react";
import { PlusOutlined, UserOutlined } from "../../src/icons.js";
import {
  Button,
  Divider,
  Select,
  type SelectChangeValue,
  type SelectOption,
  type SelectOptionEntry,
  Space,
  Tag,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const languageOptions = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { disabled: true, label: "Ruby", value: "ruby" },
] as const;

function BasicSelect() {
  return (
    <Space size="medium" wrap>
      <Select
        ariaLabel="Language"
        options={languageOptions}
        placeholder="Select a language"
        style={{ width: 210 }}
      />
      <Select
        allowClear
        ariaLabel="Clearable language"
        defaultValue="typescript"
        options={languageOptions}
        style={{ width: 210 }}
      />
      <Select
        ariaLabel="Loading language"
        loading
        options={languageOptions}
        style={{ width: 210 }}
      />
      <Select
        ariaLabel="Disabled language"
        disabled
        options={languageOptions}
        style={{ width: 210 }}
      />
    </Space>
  );
}

function SearchSelect() {
  const [query, setQuery] = useState("");
  return (
    <Space orientation="vertical">
      <Select
        allowClear
        ariaLabel="Search languages"
        options={languageOptions}
        placeholder="Search languages"
        showSearch={{
          filterOption: (input, option) =>
            String(option.label).toLocaleLowerCase().includes(input.toLocaleLowerCase()),
          onSearch: setQuery,
        }}
        style={{ width: 280 }}
      />
      <Typography.Text type="secondary">Search value: {query || "None"}</Typography.Text>
    </Space>
  );
}

function MultipleSelect() {
  return (
    <Select
      allowClear
      ariaLabel="Project technologies"
      defaultValue={["typescript", "python"]}
      mode="multiple"
      options={languageOptions}
      placeholder="Choose technologies"
      style={{ width: 420 }}
    />
  );
}

function TagsSelect() {
  return (
    <Select
      ariaLabel="Project tags"
      defaultValue={["launch"]}
      mode="tags"
      options={[
        { label: "Launch", value: "launch" },
        { label: "Plugin", value: "plugin" },
        { label: "Design system", value: "design-system" },
      ]}
      placeholder="Type or paste tags"
      style={{ width: 420 }}
      tagRender={({ label, onClose }) => (
        <Tag color="blue">
          {label}
          <button aria-label={`Remove ${String(label)}`} onClick={onClose} type="button">
            ×
          </button>
        </Tag>
      )}
      tokenSeparators={[",", " "]}
    />
  );
}

const people = [
  { email: "alex@launchpp.dev", label: "Alex Morgan", value: "alex" },
  { email: "jamie@launchpp.dev", label: "Jamie Chen", value: "jamie" },
  { email: "sam@launchpp.dev", label: "Sam Rivera", value: "sam" },
] as const;

function CustomOptionsSelect() {
  return (
    <Select
      ariaLabel="Assignee"
      optionRender={(option) => {
        const person = option as SelectOption & { readonly email: string };
        return (
          <span className="showcase-select-person">
            <UserOutlined />
            <span>
              <strong>{person.label}</strong>
              <small>{person.email}</small>
            </span>
          </span>
        );
      }}
      options={people}
      placeholder="Choose an assignee"
      showSearch={{ optionFilterProp: ["label", "email"] }}
      style={{ width: 300 }}
    />
  );
}

const groupedOptions: ReadonlyArray<SelectOptionEntry> = [
  {
    label: "Core team",
    options: [
      { label: "Alex Morgan", value: "alex" },
      { label: "Jamie Chen", value: "jamie" },
    ],
  },
  {
    label: "Contributors",
    options: [
      { label: "Sam Rivera", value: "sam" },
      { label: "Taylor Kim", value: "taylor" },
    ],
  },
];

function GroupedSelect() {
  return (
    <Select
      ariaLabel="Project member"
      options={groupedOptions}
      placeholder="Select a member"
      style={{ width: 280 }}
    />
  );
}

function PopupSelect() {
  return (
    <Select
      ariaLabel="Workspace"
      options={[
        { label: "Launch++", value: "launchpp" },
        { label: "Sandbox", value: "sandbox" },
      ]}
      placeholder="Select workspace"
      popupRender={(menu) => (
        <div>
          {menu}
          <Divider style={{ margin: 0 }} />
          <div className="showcase-select-popup-action">
            <Button block icon={<PlusOutlined />} variant="text">
              Create workspace
            </Button>
          </div>
        </div>
      )}
      style={{ width: 280 }}
    />
  );
}

function VariantSelect() {
  return (
    <Space size="medium" wrap>
      {(["outlined", "filled", "borderless", "underlined"] as const).map((variant) => (
        <Select
          ariaLabel={`${variant} select`}
          key={variant}
          options={languageOptions}
          placeholder={variant[0]?.toUpperCase() + variant.slice(1)}
          style={{ width: 190 }}
          variant={variant}
        />
      ))}
    </Space>
  );
}

function SizeSelect() {
  return (
    <Space align="center" size="medium" wrap>
      <Select
        ariaLabel="Large select"
        options={languageOptions}
        placeholder="Large"
        size="large"
        style={{ width: 180 }}
      />
      <Select
        ariaLabel="Medium select"
        options={languageOptions}
        placeholder="Medium"
        style={{ width: 180 }}
      />
      <Select
        ariaLabel="Small select"
        options={languageOptions}
        placeholder="Small"
        size="small"
        style={{ width: 180 }}
      />
    </Space>
  );
}

function PlacementSelect() {
  return (
    <Space size="medium" wrap>
      {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map((placement) => (
        <Select
          ariaLabel={`${placement} placement`}
          key={placement}
          options={languageOptions}
          placement={placement}
          placeholder={placement}
          popupMatchSelectWidth={180}
          style={{ width: 180 }}
        />
      ))}
    </Space>
  );
}

function LabelSelect() {
  return (
    <Select
      ariaLabel="Restored user"
      defaultValue="archived-user"
      labelRender={({ label, value }) => label ?? `Restored: ${value}`}
      options={people}
      style={{ width: 280 }}
    />
  );
}

function ControlledSelect() {
  const [value, setValue] = useState<SelectChangeValue>("typescript");
  return (
    <Space orientation="vertical">
      <Select
        allowClear
        ariaLabel="Controlled language"
        onChange={setValue}
        options={languageOptions}
        style={{ width: 240 }}
        value={value}
      />
      <Typography.Text type="secondary">
        Selected: {value === undefined ? "None" : String(value)}
      </Typography.Text>
    </Space>
  );
}

export const selectShowcase = defineShowcase({
  id: "select",
  name: "Select",
  category: "Data entry",
  stage: "prod",
  description: "A dropdown control for choosing one or more values from a known set.",
  whenToUse: [
    "Use Select when choices are known in advance and the available space is limited.",
    "Use multiple mode for a bounded set of choices and tags mode when people may add new values.",
  ],
  examples: [
    {
      id: "select-basic",
      name: "Basic and states",
      description: "Default, clearable, loading, and disabled states.",
      preview: BasicSelect,
      code: `<Select options={options} placeholder="Select a language" />\n<Select allowClear defaultValue="typescript" options={options} />\n<Select loading options={options} />\n<Select disabled options={options} />`,
    },
    {
      id: "select-search",
      name: "Search",
      description: "Filter options and observe the search value as it changes.",
      preview: SearchSelect,
      code: `<Select\n  options={options}\n  showSearch={{\n    filterOption: (input, option) =>\n      String(option.label).toLowerCase().includes(input.toLowerCase()),\n    onSearch: setQuery,\n  }}\n/>`,
    },
    {
      id: "select-multiple",
      name: "Multiple selection",
      description: "Select several known values and remove them from the selector.",
      preview: MultipleSelect,
      code: `<Select\n  allowClear\n  mode="multiple"\n  defaultValue={["typescript", "python"]}\n  options={options}\n/>`,
    },
    {
      id: "select-tags",
      name: "Tags and token separators",
      description:
        "Create values by pressing Enter or by typing and pasting comma- or space-separated text.",
      preview: TagsSelect,
      code: `<Select\n  mode="tags"\n  options={options}\n  tokenSeparators={[",", " "]}\n  tagRender={({ label, onClose }) => (\n    <Tag color="blue">{label} <button onClick={onClose}>×</button></Tag>\n  )}\n/>`,
    },
    {
      id: "select-custom-option",
      name: "Custom option content",
      description: "Render richer menu rows while filtering across more than one field.",
      preview: CustomOptionsSelect,
      code: `<Select\n  options={people}\n  optionRender={(option) => <PersonOption option={option} />}\n  showSearch={{ optionFilterProp: ["label", "email"] }}\n/>`,
    },
    {
      id: "select-groups",
      name: "Option groups",
      description: "Organize related choices under visible labels.",
      preview: GroupedSelect,
      code: `<Select options={[\n  { label: "Core team", options: coreTeam },\n  { label: "Contributors", options: contributors },\n]} />`,
    },
    {
      id: "select-popup",
      name: "Custom popup",
      description: "Add a compact action around the standard option list.",
      preview: PopupSelect,
      code: `<Select\n  options={workspaces}\n  popupRender={(menu) => (\n    <div>{menu}<Divider /><Button>Create workspace</Button></div>\n  )}\n/>`,
    },
    {
      id: "select-variants",
      name: "Variants",
      preview: VariantSelect,
      code: `<Select variant="outlined" options={options} />\n<Select variant="filled" options={options} />\n<Select variant="borderless" options={options} />\n<Select variant="underlined" options={options} />`,
    },
    {
      id: "select-sizes",
      name: "Sizes",
      preview: SizeSelect,
      code: `<Select size="large" options={options} />\n<Select size="medium" options={options} />\n<Select size="small" options={options} />`,
    },
    {
      id: "select-placement",
      name: "Placement",
      description: "Position the popup above or below and align either edge.",
      preview: PlacementSelect,
      code: `<Select placement="topLeft" options={options} />\n<Select placement="topRight" options={options} />\n<Select placement="bottomLeft" options={options} />\n<Select placement="bottomRight" options={options} />`,
    },
    {
      id: "select-label-render",
      name: "Missing option label",
      description: "Keep a useful label when a stored value no longer exists in the option list.",
      preview: LabelSelect,
      code: `<Select\n  defaultValue="archived-user"\n  labelRender={({ label, value }) => label ?? \`Restored: \${value}\`}\n  options={people}\n/>`,
    },
    {
      id: "select-controlled",
      name: "Controlled value",
      preview: ControlledSelect,
      code: `<Select allowClear value={value} onChange={setValue} options={options} />`,
    },
  ],
  api: [
    {
      name: "options",
      description: "Flat options or labeled option groups.",
      type: "SelectOptionEntry[]",
    },
    {
      name: "value",
      description: "Controlled selected value or values.",
      type: "SelectValue | SelectValue[]",
    },
    {
      name: "mode",
      description: "Enables multiple or free-form tag selection.",
      type: '"multiple" | "tags"',
    },
    {
      name: "showSearch",
      description: "Enables search and configures filtering and search callbacks.",
      type: "boolean | SelectSearchConfig",
      defaultValue: "false",
    },
    {
      name: "allowClear",
      description: "Shows a control that clears the current selection.",
      type: "boolean | SelectClearConfig",
      defaultValue: "false",
    },
    {
      name: "variant",
      description: "Changes the selector surface treatment.",
      type: '"outlined" | "filled" | "borderless" | "underlined"',
      defaultValue: '"outlined"',
    },
    {
      name: "onChange",
      description: "Runs when the selected value changes.",
      type: "(value, option) => void",
    },
    {
      name: "optionRender",
      description: "Customizes each option row.",
      type: "(option, info) => ReactNode",
    },
    {
      name: "popupRender",
      description: "Wraps or extends the standard option list.",
      type: "(menu) => ReactNode",
    },
  ],
  accessibility: [
    "Give the control a specific ariaLabel when a visible label is not associated through Form.Item.",
    "The selector supports Arrow keys, Enter, Escape, and Backspace in multiple modes.",
  ],
});

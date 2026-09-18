import { useState } from "react";
import { CloseSquareFilled, SearchOutlined, UserOutlined } from "../../src/icons.js";
import {
  AutoComplete,
  type AutoCompleteOption,
  type AutoCompleteOptionEntry,
  Flex,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function suggestions(value: string): ReadonlyArray<AutoCompleteOption> {
  return value.length === 0
    ? []
    : [{ value }, { value: value.repeat(2) }, { value: value.repeat(3) }];
}

function BasicAutoComplete() {
  const [options, setOptions] = useState<ReadonlyArray<AutoCompleteOption>>([]);
  const [controlledOptions, setControlledOptions] = useState<ReadonlyArray<AutoCompleteOption>>([]);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("Type to see suggestions");

  return (
    <div className="showcase-autocomplete-stack">
      <AutoComplete
        onSelect={(selected) => setMessage(`Selected: ${selected}`)}
        options={options}
        placeholder="Input here"
        showSearch={{ onSearch: (query) => setOptions(suggestions(query)) }}
        style={{ width: 240 }}
      />
      <AutoComplete
        onChange={setValue}
        onSelect={(selected) => setMessage(`Selected: ${selected}`)}
        options={controlledOptions}
        placeholder="Controlled mode"
        showSearch={{ onSearch: (query) => setControlledOptions(suggestions(query)) }}
        style={{ width: 240 }}
        value={value}
      />
      <Typography.Text type="secondary">{message}</Typography.Text>
    </div>
  );
}

function CustomInputAutoComplete() {
  const [options, setOptions] = useState<ReadonlyArray<AutoCompleteOption>>([]);
  return (
    <AutoComplete
      options={options}
      showSearch={{ onSearch: (query) => setOptions(suggestions(query)) }}
      style={{ width: 280 }}
    >
      <textarea className="showcase-autocomplete-textarea" placeholder="Write a short note" />
    </AutoComplete>
  );
}

function GroupTitle({ title }: { readonly title: string }) {
  return (
    <div className="showcase-autocomplete-group-title">
      <span>{title}</span>
      <Typography.Link href="#autocomplete-grouped">More</Typography.Link>
    </div>
  );
}

function GroupOption({ count, title }: { readonly count: number; readonly title: string }) {
  return (
    <div className="showcase-autocomplete-group-option">
      <span>{title}</span>
      <span className="showcase-autocomplete-count">
        <UserOutlined /> {count.toLocaleString()}
      </span>
    </div>
  );
}

const groupedOptions: ReadonlyArray<AutoCompleteOptionEntry> = [
  {
    label: <GroupTitle title="Libraries" />,
    options: [
      { value: "Launch++ UI", label: <GroupOption count={10_000} title="Launch++ UI" /> },
      { value: "Launch++ SDK", label: <GroupOption count={8_600} title="Launch++ SDK" /> },
    ],
  },
  {
    label: <GroupTitle title="Resources" />,
    options: [
      { value: "Plugin guide", label: <GroupOption count={6_100} title="Plugin guide" /> },
      { value: "API reference", label: <GroupOption count={3_010} title="API reference" /> },
    ],
  },
];

function GroupedAutoComplete() {
  return (
    <AutoComplete
      allowClear
      options={groupedOptions}
      placeholder="Search resources"
      popupMatchSelectWidth={420}
      style={{ width: 280 }}
    />
  );
}

function StatusAutoComplete() {
  return (
    <div className="showcase-autocomplete-stack">
      <AutoComplete placeholder="Error" status="error" style={{ width: 240 }} />
      <AutoComplete placeholder="Warning" status="warning" style={{ width: 240 }} />
      <AutoComplete disabled placeholder="Disabled" style={{ width: 240 }} />
    </div>
  );
}

function ClearAutoComplete() {
  return (
    <div className="showcase-autocomplete-stack">
      <AutoComplete allowClear={false} defaultValue="Unclearable value" style={{ width: 240 }} />
      <AutoComplete
        allowClear={{ clearIcon: <CloseSquareFilled /> }}
        defaultValue="Custom clear icon"
        style={{ width: 240 }}
      />
    </div>
  );
}

function EmailAutoComplete() {
  const [options, setOptions] = useState<ReadonlyArray<AutoCompleteOption>>([]);
  return (
    <AutoComplete
      allowClear
      options={options}
      placeholder="Enter an email"
      showSearch={{
        onSearch: (query) => {
          setOptions(
            !query || query.includes("@")
              ? []
              : ["launchpp.dev", "example.com", "team.dev"].map((domain) => ({
                  label: `${query}@${domain}`,
                  value: `${query}@${domain}`,
                })),
          );
        },
      }}
      style={{ width: 280 }}
    />
  );
}

const addressOptions: ReadonlyArray<AutoCompleteOption> = [
  { value: "Burns Bay Road" },
  { value: "Downing Street" },
  { value: "Wall Street" },
];

function FilterAutoComplete() {
  return (
    <AutoComplete
      options={addressOptions}
      placeholder="Try typing b"
      showSearch={{
        filterOption: (inputValue, option) =>
          option.value.toLocaleLowerCase().includes(inputValue.toLocaleLowerCase()),
      }}
      style={{ width: 240 }}
    />
  );
}

function VariantAutoComplete() {
  return (
    <div className="showcase-autocomplete-stack">
      <AutoComplete options={addressOptions} placeholder="Outlined" style={{ width: 240 }} />
      <AutoComplete
        options={addressOptions}
        placeholder="Filled"
        style={{ width: 240 }}
        variant="filled"
      />
      <AutoComplete
        options={addressOptions}
        placeholder="Borderless"
        style={{ width: 240 }}
        variant="borderless"
      />
      <AutoComplete
        options={addressOptions}
        placeholder="Underlined"
        style={{ width: 240 }}
        variant="underlined"
      />
    </div>
  );
}

function SizeAutoComplete() {
  return (
    <Flex align="start" gap="medium" wrap="wrap">
      <AutoComplete
        options={addressOptions}
        placeholder="Large"
        size="large"
        style={{ width: 220 }}
      />
      <AutoComplete options={addressOptions} placeholder="Medium" style={{ width: 220 }} />
      <AutoComplete
        options={addressOptions}
        placeholder="Small"
        size="small"
        style={{ width: 220 }}
      />
    </Flex>
  );
}

function PopupAutoComplete() {
  return (
    <AutoComplete
      notFoundContent="No matching locations"
      open
      options={[]}
      placeholder="Custom popup"
      popupRender={(list) => (
        <div>
          <div className="showcase-autocomplete-popup-heading">
            <SearchOutlined /> Location search
          </div>
          {list}
        </div>
      )}
      style={{ width: 260 }}
    />
  );
}

function SemanticAutoComplete() {
  return (
    <Space size="large" vertical>
      <AutoComplete
        classNames={{ root: "showcase-autocomplete-semantic-root" }}
        defaultOpen
        options={addressOptions}
        placeholder="Object styles"
        style={{ width: 240 }}
        styles={{
          popup: {
            listItem: { borderRadius: 999 },
            root: { border: "1px solid var(--launch-ui-primary)" },
          },
        }}
      />
    </Space>
  );
}

export const autoCompleteShowcase = defineShowcase({
  id: "auto-complete",
  name: "AutoComplete",
  category: "Data entry",
  stage: "prod",
  description: "Lets users type freely while offering relevant suggestions and helping text.",
  usage: `import { AutoComplete } from "@launchpp/ui";`,
  whenToUse: [
    "Use AutoComplete when the user may enter any value but suggestions can make entry faster or safer.",
    "Use Select when the value must come from a fixed set of options.",
  ],
  examples: [
    {
      id: "autocomplete-basic",
      name: "Basic usage",
      description: "Generate suggestions from input in uncontrolled or controlled mode.",
      preview: BasicAutoComplete,
      code: `<AutoComplete
  options={options}
  placeholder="Input here"
  showSearch={{ onSearch: (value) => setOptions(getSuggestions(value)) }}
  onSelect={(value) => choose(value)}
/>

<AutoComplete value={value} onChange={setValue} options={options} />`,
    },
    {
      id: "autocomplete-custom-input",
      name: "Custom input",
      description:
        "Provide an input-like child when suggestions should enhance a specialized field.",
      preview: CustomInputAutoComplete,
      code: `<AutoComplete options={options} showSearch={{ onSearch: handleSearch }}>
  <textarea placeholder="Write a short note" />
</AutoComplete>`,
    },
    {
      id: "autocomplete-grouped",
      name: "Grouped suggestions",
      description: "Organize lookup results into labeled categories with custom option content.",
      preview: GroupedAutoComplete,
      code: `<AutoComplete
  options={groupedOptions}
  placeholder="Search resources"
  popupMatchSelectWidth={420}
/>`,
    },
    {
      id: "autocomplete-status",
      name: "Status and disabled",
      description: "Communicate validation state or make the field unavailable.",
      preview: StatusAutoComplete,
      code: `<AutoComplete status="error" placeholder="Error" />
<AutoComplete status="warning" placeholder="Warning" />
<AutoComplete disabled placeholder="Disabled" />`,
    },
    {
      id: "autocomplete-clear",
      name: "Clear control",
      description: "Enable clearing and optionally replace its icon.",
      preview: ClearAutoComplete,
      code: `<AutoComplete allowClear={false} defaultValue="Unclearable value" />
<AutoComplete
  allowClear={{ clearIcon: <CloseSquareFilled /> }}
  defaultValue="Custom clear icon"
/>`,
    },
    {
      id: "autocomplete-custom-option",
      name: "Custom option labels",
      description: "Display richer labels while committing the option value to the input.",
      preview: EmailAutoComplete,
      code: `<AutoComplete
  options={options}
  showSearch={{ onSearch: createEmailSuggestions }}
  placeholder="Enter an email"
/>`,
    },
    {
      id: "autocomplete-filter",
      name: "Case-insensitive filtering",
      description: "Use a custom filter when matching rules differ from the default value match.",
      preview: FilterAutoComplete,
      code: `<AutoComplete
  options={options}
  showSearch={{
    filterOption: (input, option) =>
      option.value.toLowerCase().includes(input.toLowerCase()),
  }}
/>`,
    },
    {
      id: "autocomplete-variants",
      name: "Variants",
      description: "Match the field treatment to the surrounding form surface.",
      preview: VariantAutoComplete,
      code: `<AutoComplete variant="outlined" options={options} />
<AutoComplete variant="filled" options={options} />
<AutoComplete variant="borderless" options={options} />
<AutoComplete variant="underlined" options={options} />`,
    },
    {
      id: "autocomplete-sizes",
      name: "Sizes",
      description: "Use large, medium, or small control density.",
      preview: SizeAutoComplete,
      code: `<AutoComplete size="large" options={options} />
<AutoComplete size="medium" options={options} />
<AutoComplete size="small" options={options} />`,
    },
    {
      id: "autocomplete-popup",
      name: "Custom popup",
      description: "Wrap the suggestion list or provide explicit empty content.",
      preview: PopupAutoComplete,
      code: `<AutoComplete
  notFoundContent="No matching locations"
  popupRender={(list) => <SearchPanel>{list}</SearchPanel>}
/>`,
    },
    {
      id: "autocomplete-semantic",
      name: "Semantic styling",
      description: "Customize documented input and popup slots with classes or style objects.",
      preview: SemanticAutoComplete,
      code: `<AutoComplete
  classNames={{ root: "project-autocomplete" }}
  styles={{ popup: { listItem: { borderRadius: 999 } } }}
  options={options}
/>`,
    },
  ],
  api: [
    {
      name: "options",
      type: "AutoCompleteOptionEntry[]",
      defaultValue: "[]",
      description: "Provides flat or grouped suggestions.",
    },
    {
      name: "value / defaultValue",
      type: "string",
      description: "Controls or initializes the input value.",
    },
    {
      name: "showSearch",
      type: "boolean | { filterOption?; onSearch? }",
      defaultValue: "true",
      description: "Configures filtering and search notifications.",
    },
    {
      name: "allowClear",
      type: "boolean | { clearIcon? }",
      defaultValue: "false",
      description: "Adds a clear control when the input has a value.",
    },
    {
      name: "backfill",
      type: "boolean",
      defaultValue: "false",
      description: "Previews the keyboard-highlighted option in the input.",
    },
    {
      name: "open / defaultOpen",
      type: "boolean",
      description: "Controls or initializes popup visibility.",
    },
    {
      name: "defaultActiveFirstOption",
      type: "boolean",
      defaultValue: "true",
      description: "Highlights the first enabled suggestion when opening.",
    },
    {
      name: "popupMatchSelectWidth",
      type: "boolean | number",
      defaultValue: "true",
      description: "Matches or explicitly sizes the suggestion popup.",
    },
    {
      name: "popupRender",
      type: "(list) => ReactNode",
      description: "Wraps or replaces popup content.",
    },
    {
      name: "notFoundContent",
      type: "ReactNode",
      description: "Displays explicit content when no suggestion matches.",
    },
    {
      name: "getPopupContainer",
      type: "(triggerNode) => HTMLElement",
      defaultValue: "document.body",
      description: "Chooses the portal container.",
    },
    {
      name: "size",
      type: '"large" | "medium" | "small"',
      defaultValue: '"medium"',
      description: "Sets input density.",
    },
    {
      name: "status",
      type: '"error" | "warning"',
      description: "Applies validation status styling.",
    },
    {
      name: "variant",
      type: '"outlined" | "filled" | "borderless" | "underlined"',
      defaultValue: '"outlined"',
      description: "Sets the input treatment.",
    },
    {
      name: "onChange",
      type: "(value) => void",
      description: "Reports typed and selected values.",
    },
    {
      name: "onSearch",
      type: "(value) => void",
      description: "Reports user searches without firing for option selection.",
    },
    {
      name: "onSelect",
      type: "(value, option) => void",
      description: "Reports committed suggestion selection.",
    },
    {
      name: "onOpenChange",
      type: "(open) => void",
      description: "Reports popup visibility changes.",
    },
    { name: "onClear", type: "() => void", description: "Reports use of the clear control." },
    {
      name: "classNames / styles",
      type: "AutoCompleteSlots | (info) => AutoCompleteSlots",
      description: "Customizes documented root, input, clear, and popup slots.",
    },
  ],
  accessibility: [
    "The field uses the ARIA combobox pattern and keeps DOM focus in the input while navigating suggestions.",
    "Arrow keys change the active suggestion, Enter selects it, and Escape closes the popup.",
    "The active option is exposed through aria-activedescendant, while unavailable options expose aria-disabled.",
  ],
});

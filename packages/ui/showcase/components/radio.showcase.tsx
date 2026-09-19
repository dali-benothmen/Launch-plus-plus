import { useState } from "react";
import {
  BarChartOutlined,
  DotChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
} from "../../src/icons.js";
import {
  Button,
  Flex,
  Form,
  Input,
  Radio,
  type RadioChangeEvent,
  type RadioOption,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const fruitOptions = ["Apple", "Pear", "Orange"] as const;

function BasicRadio() {
  const [message, setMessage] = useState("Not selected");
  return (
    <Space size="medium" vertical>
      <Radio value="radio" onChange={(event) => setMessage(`Selected: ${event.target.checked}`)}>
        Radio
      </Radio>
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

const chartOptions: ReadonlyArray<RadioOption<number>> = [
  {
    value: 1,
    label: (
      <span className="showcase-radio-option-label">
        <LineChartOutlined /> Line chart
      </span>
    ),
  },
  {
    value: 2,
    label: (
      <span className="showcase-radio-option-label">
        <DotChartOutlined /> Dot chart
      </span>
    ),
  },
  {
    value: 3,
    label: (
      <span className="showcase-radio-option-label">
        <BarChartOutlined /> Bar chart
      </span>
    ),
  },
  {
    value: 4,
    label: (
      <span className="showcase-radio-option-label">
        <PieChartOutlined /> Pie chart
      </span>
    ),
  },
];

function ControlledGroup() {
  const [value, setValue] = useState(1);
  return (
    <Space size="medium" vertical>
      <Radio.Group
        onChange={(event) => setValue(event.target.value)}
        options={chartOptions}
        value={value}
      />
      <Typography.Text type="secondary">Selected chart: {value}</Typography.Text>
    </Space>
  );
}

function OptionGroups() {
  return (
    <Flex className="showcase-radio-stack" gap="medium" vertical>
      <Radio.Group defaultValue="Apple" options={fruitOptions} />
      <Radio.Group defaultValue="Pear" optionType="button" options={fruitOptions} />
      <Radio.Group
        buttonStyle="solid"
        defaultValue="Orange"
        optionType="button"
        options={fruitOptions}
      />
    </Flex>
  );
}

function BlockGroups() {
  return (
    <Flex className="showcase-radio-stack" gap="medium" vertical>
      <Radio.Group block defaultValue="Apple" options={fruitOptions} />
      <Radio.Group
        block
        buttonStyle="solid"
        defaultValue="Apple"
        optionType="button"
        options={fruitOptions}
      />
      <Radio.Group block defaultValue="Pear" optionType="button" options={fruitOptions} />
    </Flex>
  );
}

function RadioButtons() {
  return (
    <Flex gap="medium" vertical>
      <Radio.Group defaultValue="design">
        <Radio.Button value="design">Design</Radio.Button>
        <Radio.Button value="engineering">Engineering</Radio.Button>
        <Radio.Button value="product">Product</Radio.Button>
      </Radio.Group>
      <Radio.Group defaultValue="design">
        <Radio.Button value="design">Design</Radio.Button>
        <Radio.Button disabled value="engineering">
          Engineering
        </Radio.Button>
        <Radio.Button value="product">Product</Radio.Button>
      </Radio.Group>
      <Radio.Group defaultValue="design" disabled>
        <Radio.Button value="design">Design</Radio.Button>
        <Radio.Button value="engineering">Engineering</Radio.Button>
        <Radio.Button value="product">Product</Radio.Button>
      </Radio.Group>
    </Flex>
  );
}

function SizedButtons() {
  return (
    <Flex gap="medium" vertical>
      <Radio.Group
        defaultValue="board"
        optionType="button"
        options={["Board", "List"]}
        size="large"
      />
      <Radio.Group defaultValue="board" optionType="button" options={["Board", "List"]} />
      <Radio.Group
        defaultValue="board"
        optionType="button"
        options={["Board", "List"]}
        size="small"
      />
    </Flex>
  );
}

function DisabledRadios() {
  const [disabled, setDisabled] = useState(true);
  return (
    <Space size="medium" vertical>
      <Space>
        <Radio disabled={disabled}>Unchecked</Radio>
        <Radio defaultChecked disabled={disabled}>
          Checked
        </Radio>
      </Space>
      <Button onClick={() => setDisabled((current) => !current)} variant="primary">
        {disabled ? "Enable radios" : "Disable radios"}
      </Button>
    </Space>
  );
}

function VerticalGroups() {
  const [value, setValue] = useState<number>(1);
  const options: ReadonlyArray<RadioOption<number>> = [
    { label: "Option A", value: 1 },
    { label: "Option B", value: 2 },
    { label: "Option C", value: 3 },
    {
      label: (
        <Space>
          More
          {value === 4 ? <Input placeholder="Describe it" size="small" /> : null}
        </Space>
      ),
      value: 4,
    },
  ];
  return (
    <Flex align="start" gap="large" wrap="wrap">
      <Radio.Group
        onChange={(event) => setValue(event.target.value)}
        options={options}
        value={value}
        vertical
      />
      <Radio.Group defaultValue="Apple" optionType="button" options={fruitOptions} vertical />
    </Flex>
  );
}

interface VisibilityFields {
  visibility?: string;
}

function RadioForm() {
  const [message, setMessage] = useState("Choose who can see the project.");
  return (
    <Space className="showcase-radio-form" size="medium" vertical>
      <Form<VisibilityFields>
        initialValues={{ visibility: "team" }}
        layout="vertical"
        onFinish={(values) => setMessage(`Visibility: ${values.visibility}`)}
      >
        <Form.Item<VisibilityFields>
          label="Project visibility"
          name="visibility"
          rules={[{ required: true }]}
        >
          <Radio.Group
            options={[
              { label: "Private", value: "private" },
              { label: "Team", value: "team" },
              { label: "Public", value: "public" },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </Form.Item>
      </Form>
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function NamedGroup() {
  return (
    <Radio.Group
      defaultValue={1}
      name="release-channel"
      options={[
        { label: "Stable", value: 1 },
        { label: "Preview", value: 2 },
        { label: "Nightly", value: 3 },
      ]}
    />
  );
}

function SemanticRadios() {
  const [value, setValue] = useState<"object" | "function">("object");
  const handleChange = (event: RadioChangeEvent) => {
    setValue(event.target.value as "object" | "function");
  };

  return (
    <Flex gap="medium" vertical>
      <Radio
        checked={value === "object"}
        name="radio-semantic"
        onChange={handleChange}
        styles={{ icon: { borderColor: "var(--launch-ui-warning)" }, label: { color: "#0958d9" } }}
        value="object"
      >
        Object styles
      </Radio>
      <Radio
        checked={value === "function"}
        classNames={({ props }) => ({
          icon: "showcase-radio-function-icon",
          ...(props.checked ? { label: "showcase-radio-function-label" } : {}),
        })}
        name="radio-semantic"
        onChange={handleChange}
        value="function"
      >
        Function class names
      </Radio>
    </Flex>
  );
}

export const radioShowcase = defineShowcase({
  id: "radio",
  name: "Radio",
  category: "Data entry",
  stage: "prod",
  description: "Selects exactly one visible choice from a small set of alternatives.",
  usage: `import { Radio } from "@launchpp/ui";`,
  whenToUse: [
    "Use Radio when users must choose one option and benefit from comparing every choice at once.",
    "Use Select when the option set is long or does not need to remain visible.",
  ],
  examples: [
    {
      id: "radio-basic",
      name: "Basic",
      description: "A standalone radio reports its checked state through a change event.",
      preview: BasicRadio,
      code: `<Radio value="radio" onChange={(event) => console.log(event.target.checked)}>
  Radio
</Radio>`,
    },
    {
      id: "radio-group",
      name: "Radio group",
      description: "A controlled group guarantees that only one option is selected.",
      preview: ControlledGroup,
      code: `<Radio.Group
  options={chartOptions}
  value={value}
  onChange={(event) => setValue(event.target.value)}
/>`,
    },
    {
      id: "radio-options",
      name: "Options",
      description:
        "Generate default, outlined button, or solid button choices from one options array.",
      preview: OptionGroups,
      code: `<Radio.Group options={options} defaultValue="Apple" />
<Radio.Group options={options} optionType="button" defaultValue="Pear" />
<Radio.Group options={options} optionType="button" buttonStyle="solid" defaultValue="Orange" />`,
    },
    {
      id: "radio-block",
      name: "Block group",
      description: "Distribute options across the full width of their container.",
      preview: BlockGroups,
      code: `<Radio.Group block options={options} defaultValue="Apple" />
<Radio.Group block options={options} optionType="button" buttonStyle="solid" />`,
    },
    {
      id: "radio-buttons",
      name: "Radio buttons",
      description:
        "Compose explicit Radio.Button children and disable an option or the whole group.",
      preview: RadioButtons,
      code: `<Radio.Group defaultValue="design">
  <Radio.Button value="design">Design</Radio.Button>
  <Radio.Button value="engineering" disabled>Engineering</Radio.Button>
  <Radio.Button value="product">Product</Radio.Button>
</Radio.Group>`,
    },
    {
      id: "radio-sizes",
      name: "Sizes",
      description: "Button-style groups align with large, medium, and small controls.",
      preview: SizedButtons,
      code: `<Radio.Group size="large" optionType="button" options={options} />
<Radio.Group size="medium" optionType="button" options={options} />
<Radio.Group size="small" optionType="button" options={options} />`,
    },
    {
      id: "radio-disabled",
      name: "Disabled",
      description: "Disabled radios preserve their selected state while preventing interaction.",
      preview: DisabledRadios,
      code: `<Radio disabled={disabled}>Unchecked</Radio>
<Radio defaultChecked disabled={disabled}>Checked</Radio>`,
    },
    {
      id: "radio-vertical",
      name: "Vertical group",
      description: "Stack default or button choices and compose richer option labels.",
      preview: VerticalGroups,
      code: `<Radio.Group vertical options={options} value={value} onChange={onChange} />
<Radio.Group vertical optionType="button" options={buttonOptions} />`,
    },
    {
      id: "radio-form",
      name: "With Form",
      description: "Radio.Group exposes its typed value directly to the Form field contract.",
      preview: RadioForm,
      code: `<Form initialValues={{ visibility: "team" }} onFinish={save}>
  <Form.Item label="Project visibility" name="visibility" rules={[{ required: true }]}>
    <Radio.Group options={visibilityOptions} />
  </Form.Item>
  <Button type="submit">Save</Button>
</Form>`,
    },
    {
      id: "radio-name",
      name: "Native group name",
      description: "A shared name preserves native browser grouping and arrow-key navigation.",
      preview: NamedGroup,
      code: `<Radio.Group name="release-channel" defaultValue={1} options={options} />`,
    },
    {
      id: "radio-semantic",
      name: "Custom semantic styling",
      description: "Customize documented root, input, icon, and label elements.",
      preview: SemanticRadios,
      code: `<Radio styles={{ icon: { borderColor: "orange" }, label: { color: "blue" } }}>
  Object styles
</Radio>`,
    },
  ],
  api: [
    {
      name: "checked",
      description: "Controls a standalone radio selection.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "defaultChecked",
      description: "Sets the initial uncontrolled selection.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "disabled",
      description: "Disables a radio option or the complete group.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "value / defaultValue",
      description: "Controls or initializes the selected group value.",
      type: "RadioValue",
    },
    {
      name: "options",
      description: "Generates group choices from primitive values or option objects.",
      type: "Array<RadioValue | RadioOption>",
    },
    {
      name: "optionType",
      description: "Renders options as default radios or connected buttons.",
      type: '"default" | "button"',
      defaultValue: '"default"',
    },
    {
      name: "buttonStyle",
      description: "Uses an outline or solid treatment for selected buttons.",
      type: '"outline" | "solid"',
      defaultValue: '"outline"',
    },
    {
      name: "orientation / vertical",
      description: "Arranges group options horizontally or vertically.",
      type: '"horizontal" | "vertical" | boolean',
      defaultValue: '"horizontal"',
    },
    {
      name: "block",
      description: "Makes the group fill its parent width.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "size",
      description: "Sets button-style control height.",
      type: '"large" | "medium" | "small"',
      defaultValue: '"medium"',
    },
    {
      name: "onChange",
      description: "Runs with the checked state and typed selected value.",
      type: "(event: RadioChangeEvent) => void",
    },
  ],
  accessibility: [
    "Every option uses a native radio input, preserving Space and arrow-key interaction.",
    "Radio.Group supplies a shared name automatically and exposes the radiogroup role.",
    "Use visible label content for every option unless another accessible name is provided.",
  ],
});

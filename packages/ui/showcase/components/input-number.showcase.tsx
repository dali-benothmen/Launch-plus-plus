import { useRef, useState } from "react";
import { ClockCircleOutlined, UserOutlined } from "../../src/icons.js";
import {
  Button,
  Checkbox,
  Flex,
  InputNumber,
  type InputNumberProps,
  type InputNumberRef,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicInputNumber() {
  const [value, setValue] = useState<number | null>(3);
  return (
    <Space>
      <InputNumber max={10} min={1} onChange={setValue} value={value} />
      <Typography.Text type="secondary">Value: {value ?? "empty"}</Typography.Text>
    </Space>
  );
}

function DisabledInputNumber() {
  const [disabled, setDisabled] = useState(true);
  return (
    <Space size="medium" vertical>
      <InputNumber defaultValue={3} disabled={disabled} max={10} min={1} />
      <Button onClick={() => setDisabled((current) => !current)} variant="primary">
        Toggle disabled
      </Button>
    </Space>
  );
}

function FormattedInputNumbers() {
  const currencyFormatter: InputNumberProps<number>["formatter"] = (value) => {
    const [integer = "", fraction] = String(value ?? "").split(".");
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `$ ${fraction === undefined ? grouped : `${grouped}.${fraction}`}`;
  };
  return (
    <Space wrap>
      <InputNumber
        defaultValue={1000}
        formatter={currencyFormatter}
        parser={(display) => Number(display.replace(/\$\s?|,/g, ""))}
      />
      <InputNumber
        defaultValue={100}
        formatter={(value) => `${value ?? ""}%`}
        max={100}
        min={0}
        parser={(display) => Number(display.replace("%", ""))}
      />
    </Space>
  );
}

function WheelInputNumber() {
  const [message, setMessage] = useState("Use the mouse wheel while the input is focused.");
  return (
    <Space size="medium" vertical>
      <InputNumber
        changeOnWheel
        defaultValue={3}
        max={10}
        min={1}
        onStep={(value, info) => setMessage(`${info.emitter}: ${value}`)}
      />
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function SpinnerInputNumbers() {
  return (
    <Space wrap>
      <InputNumber defaultValue={3} max={10} min={1} />
      <InputNumber defaultValue={3} max={10} min={1} mode="spinner" />
    </Space>
  );
}

function AffixInputNumbers() {
  return (
    <Flex className="showcase-input-number-stack" gap="medium" vertical>
      <InputNumber prefix="￥" style={{ width: "100%" }} />
      <Space.Compact block>
        <Space.Addon>
          <UserOutlined />
        </Space.Addon>
        <InputNumber prefix="￥" style={{ width: "100%" }} />
      </Space.Compact>
      <InputNumber disabled prefix="￥" style={{ width: "100%" }} />
      <InputNumber style={{ width: "100%" }} suffix="RMB" />
    </Flex>
  );
}

function FocusInputNumber() {
  const ref = useRef<InputNumberRef>(null);
  return (
    <Space className="showcase-input-number-stack" size="medium" vertical>
      <Space wrap>
        <Button onClick={() => ref.current?.focus({ cursor: "start" })}>Focus at first</Button>
        <Button onClick={() => ref.current?.focus({ cursor: "end" })}>Focus at last</Button>
        <Button onClick={() => ref.current?.focus({ cursor: "all" })}>Select all</Button>
      </Space>
      <InputNumber defaultValue={999} ref={ref} style={{ width: "100%" }} />
    </Space>
  );
}

function SizedInputNumbers() {
  return (
    <Space align="center" wrap>
      <InputNumber defaultValue={3} max={100000} min={1} size="large" />
      <InputNumber defaultValue={3} max={100000} min={1} />
      <InputNumber defaultValue={3} max={100000} min={1} size="small" />
    </Space>
  );
}

function PreciseInputNumber() {
  const [value, setValue] = useState("1");
  return (
    <Space size="medium" vertical>
      <InputNumber<string>
        max="10"
        min="0"
        onChange={(nextValue) => setValue(nextValue ?? "")}
        step="0.00000000000001"
        stringMode
        value={value}
      />
      <Typography.Text code>{value || "empty"}</Typography.Text>
    </Space>
  );
}

function KeyboardInputNumber() {
  const [keyboard, setKeyboard] = useState(true);
  return (
    <Space>
      <InputNumber defaultValue={3} keyboard={keyboard} max={10} min={1} />
      <Checkbox checked={keyboard} onChange={(event) => setKeyboard(event.target.checked)}>
        Arrow key stepping
      </Checkbox>
    </Space>
  );
}

function VariantInputNumbers() {
  return (
    <Flex className="showcase-input-number-stack" gap="medium" vertical>
      <InputNumber defaultValue={3} placeholder="Outlined" style={{ width: "100%" }} />
      <InputNumber
        defaultValue={3}
        placeholder="Filled"
        style={{ width: "100%" }}
        variant="filled"
      />
      <InputNumber
        defaultValue={3}
        placeholder="Borderless"
        style={{ width: "100%" }}
        variant="borderless"
      />
      <InputNumber
        defaultValue={3}
        placeholder="Underlined"
        style={{ width: "100%" }}
        variant="underlined"
      />
    </Flex>
  );
}

function RangeInputNumber() {
  const [value, setValue] = useState<number | null>(99);
  return (
    <Space>
      <InputNumber max={10} min={1} onChange={setValue} value={value} />
      <Button onClick={() => setValue(99)} variant="primary">
        Reset out of range
      </Button>
    </Space>
  );
}

function StatusInputNumbers() {
  return (
    <Flex className="showcase-input-number-stack" gap="medium" vertical>
      <InputNumber placeholder="Error" status="error" style={{ width: "100%" }} />
      <InputNumber placeholder="Warning" status="warning" style={{ width: "100%" }} />
      <InputNumber
        placeholder="Error with prefix"
        prefix={<ClockCircleOutlined />}
        status="error"
        style={{ width: "100%" }}
      />
    </Flex>
  );
}

function SemanticInputNumbers() {
  return (
    <Flex className="showcase-input-number-stack" gap="medium" vertical>
      <InputNumber
        classNames={{ input: "showcase-input-number-custom-input" }}
        placeholder="Object styles"
        styles={{ root: { borderColor: "var(--launch-ui-primary)" } }}
      />
      <InputNumber
        placeholder="Function styles"
        size="large"
        styles={({ props }) => ({
          input: { fontWeight: 600 },
          root: props.size === "large" ? { background: "var(--launch-ui-fill-tertiary)" } : {},
        })}
      />
    </Flex>
  );
}

export const inputNumberShowcase = defineShowcase({
  id: "input-number",
  name: "InputNumber",
  category: "Data entry",
  stage: "prod",
  description: "Collects a number within optional range, precision, and stepping constraints.",
  usage: `import { InputNumber } from "@launchpp/ui";`,
  whenToUse: [
    "Use InputNumber when a field must produce a numeric value rather than arbitrary text.",
    "Add min, max, and step when the domain has clear boundaries or increments.",
  ],
  examples: [
    {
      id: "input-number-basic",
      name: "Basic",
      description: "A controlled numeric field with minimum and maximum values.",
      preview: BasicInputNumber,
      code: `<InputNumber min={1} max={10} value={value} onChange={setValue} />`,
    },
    {
      id: "input-number-disabled",
      name: "Disabled",
      description: "Disable the field and its step controls together.",
      preview: DisabledInputNumber,
      code: `<InputNumber min={1} max={10} defaultValue={3} disabled={disabled} />`,
    },
    {
      id: "input-number-formatter",
      name: "Formatter and parser",
      description: "Format currency or percentages while preserving numeric output values.",
      preview: FormattedInputNumbers,
      code: `<InputNumber
  defaultValue={1000}
  formatter={(value) => \`$ \${value}\`}
  parser={(display) => Number(display.replace(/\\$\\s?|,/g, ""))}
/>

<InputNumber
  defaultValue={100}
  formatter={(value) => \`\${value}%\`}
  parser={(display) => Number(display.replace("%", ""))}
/>`,
    },
    {
      id: "input-number-wheel",
      name: "Mouse wheel",
      description: "Opt into wheel stepping and inspect the step source through onStep.",
      preview: WheelInputNumber,
      code: `<InputNumber changeOnWheel min={1} max={10} defaultValue={3} onStep={handleStep} />`,
    },
    {
      id: "input-number-spinner",
      name: "Spinner",
      description: "Spinner mode places minus and plus controls on opposite sides of the value.",
      preview: SpinnerInputNumbers,
      code: `<InputNumber defaultValue={3} />
<InputNumber defaultValue={3} mode="spinner" />`,
    },
    {
      id: "input-number-affixes",
      name: "Prefix and suffix",
      description: "Add compact context inside the field or compose it with Space.Compact.",
      preview: AffixInputNumbers,
      code: `<InputNumber prefix="￥" />
<InputNumber suffix="RMB" />`,
    },
    {
      id: "input-number-focus",
      name: "Focus",
      description: "Use the component ref to focus or select a specific part of the value.",
      preview: FocusInputNumber,
      code: `const ref = useRef<InputNumberRef>(null);

<Button onClick={() => ref.current?.focus({ cursor: "all" })}>Select all</Button>
<InputNumber ref={ref} defaultValue={999} />`,
    },
    {
      id: "input-number-sizes",
      name: "Sizes",
      description: "Large, medium, and small sizes align with the rest of the control system.",
      preview: SizedInputNumbers,
      code: `<InputNumber size="large" defaultValue={3} />
<InputNumber defaultValue={3} />
<InputNumber size="small" defaultValue={3} />`,
    },
    {
      id: "input-number-precision",
      name: "High precision decimals",
      description: "String mode preserves decimal precision without floating-point rounding loss.",
      preview: PreciseInputNumber,
      code: `<InputNumber<string>
  value={value}
  min="0"
  max="10"
  step="0.00000000000001"
  stringMode
  onChange={setValue}
/>`,
    },
    {
      id: "input-number-keyboard",
      name: "Keyboard",
      description: "Enable or disable Arrow Up and Arrow Down stepping.",
      preview: KeyboardInputNumber,
      code: `<InputNumber min={1} max={10} defaultValue={3} keyboard={keyboard} />`,
    },
    {
      id: "input-number-variants",
      name: "Variants",
      description: "Use the same four surface treatments as Input.",
      preview: VariantInputNumbers,
      code: `<InputNumber variant="outlined" />
<InputNumber variant="filled" />
<InputNumber variant="borderless" />
<InputNumber variant="underlined" />`,
    },
    {
      id: "input-number-range",
      name: "Out of range",
      description: "Controlled values outside min and max remain visible with warning styling.",
      preview: RangeInputNumber,
      code: `<InputNumber min={1} max={10} value={99} />`,
    },
    {
      id: "input-number-status",
      name: "Status",
      description: "Communicate validation state with error and warning treatments.",
      preview: StatusInputNumbers,
      code: `<InputNumber status="error" />
<InputNumber status="warning" />
<InputNumber status="error" prefix={<ClockCircleOutlined />} />`,
    },
    {
      id: "input-number-semantic",
      name: "Custom semantic styling",
      description: "Customize documented semantic elements with object or function values.",
      preview: SemanticInputNumbers,
      code: `<InputNumber
  classNames={{ input: "project-budget-input" }}
  styles={{ root: { borderColor: "var(--launch-ui-primary)" } }}
/>`,
    },
  ],
  api: [
    {
      name: "value",
      description: "Controls the current numeric value.",
      type: "number | string | null",
    },
    {
      name: "defaultValue",
      description: "Sets the initial uncontrolled value.",
      type: "number | string",
    },
    {
      name: "min / max",
      description: "Defines the allowed range and disables unavailable step controls.",
      type: "number | string",
    },
    {
      name: "step",
      description: "Sets the increment used by controls, keyboard, and wheel interactions.",
      type: "number | string",
      defaultValue: "1",
    },
    {
      name: "precision",
      description: "Rounds and displays values with a fixed number of decimal places.",
      type: "number",
    },
    {
      name: "formatter / parser",
      description: "Maps between the displayed text and the emitted numeric value.",
      type: "functions",
    },
    {
      name: "controls",
      description: "Shows step controls and optionally replaces their icons.",
      type: "boolean | { upIcon, downIcon }",
      defaultValue: "true",
    },
    {
      name: "mode",
      description: "Chooses compact input controls or a side-by-side spinner.",
      type: '"input" | "spinner"',
      defaultValue: '"input"',
    },
    {
      name: "keyboard / changeOnWheel",
      description: "Controls Arrow key and mouse-wheel stepping.",
      type: "boolean",
    },
    {
      name: "stringMode",
      description: "Returns strings to preserve high-precision decimals.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "onChange",
      description: "Runs with the parsed value or null when cleared.",
      type: "(value) => void",
    },
    {
      name: "onStep",
      description: "Runs after handler, keyboard, or wheel stepping.",
      type: "(value, info) => void",
    },
  ],
  accessibility: [
    "The editable field exposes the native spinbutton role and range attributes.",
    "Arrow Up and Arrow Down step the value unless keyboard behavior is disabled.",
    "Increase and decrease controls have explicit accessible names and are removed from tab order.",
  ],
});

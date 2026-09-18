import { useRef, useState } from "react";
import {
  AudioOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  LockOutlined,
  SearchOutlined,
  UserOutlined,
} from "../../src/icons.js";
import { Button, Flex, Input, Select, Space, Tooltip, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicInput() {
  return <Input aria-label="Basic input" placeholder="Basic usage" />;
}

function InputVariants() {
  return (
    <Flex gap="small" vertical>
      <Input aria-label="Outlined input" placeholder="Outlined" />
      <Input aria-label="Filled input" placeholder="Filled" variant="filled" />
      <Input aria-label="Borderless input" placeholder="Borderless" variant="borderless" />
      <Input aria-label="Underlined input" placeholder="Underlined" variant="underlined" />
      <Input aria-label="Rounded input" placeholder="Rounded search" shape="round" />
      <Input.Search aria-label="Filled search" placeholder="Filled search" variant="filled" />
    </Flex>
  );
}

function SearchInputs() {
  const [message, setMessage] = useState("Search has not run");
  return (
    <Space size="medium" vertical>
      <Input.Search
        aria-label="Search projects"
        onSearch={(value, _event, info) => setMessage(`${info.source}: ${value || "empty"}`)}
        placeholder="Search projects"
      />
      <Input.Search allowClear aria-label="Clearable search" placeholder="Clearable search" />
      <Space.Compact>
        <Space.Addon>https://</Space.Addon>
        <Input.Search allowClear aria-label="Website search" placeholder="Search a website" />
      </Space.Compact>
      <Input.Search aria-label="Search with button" enterButton placeholder="Search with button" />
      <Input.Search
        allowClear
        aria-label="Large search"
        enterButton="Search"
        placeholder="Large search"
        size="large"
      />
      <Input.Search
        aria-label="Voice search"
        enterButton="Search"
        placeholder="Search with suffix"
        size="large"
        suffix={<AudioOutlined />}
      />
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function TextAreas() {
  return (
    <Flex gap="medium" vertical>
      <Input.TextArea aria-label="Project description" placeholder="Project description" rows={4} />
      <Input.TextArea
        aria-label="Short note"
        maxLength={60}
        placeholder="Limited to 60 characters"
        rows={4}
      />
    </Flex>
  );
}

function OTPInputs() {
  return (
    <Flex align="start" gap="medium" vertical>
      <Typography.Text strong>Uppercase formatter</Typography.Text>
      <Input.OTP formatter={(value) => value.toUpperCase()} />
      <Typography.Text strong>Disabled</Typography.Text>
      <Input.OTP defaultValue="123" disabled />
      <Typography.Text strong>Eight characters</Typography.Text>
      <Input.OTP length={8} />
      <Typography.Text strong>Filled variant</Typography.Text>
      <Input.OTP variant="filled" />
      <Typography.Text strong>Masked</Typography.Text>
      <Input.OTP defaultValue="123456" mask="🔒" />
      <Typography.Text strong>Custom separators</Typography.Text>
      <Input.OTP separator={(index) => <span>{index % 2 ? "—" : "/"}</span>} />
    </Flex>
  );
}

function AffixInputs() {
  return (
    <Flex gap="medium" vertical>
      <Input
        aria-label="Username"
        placeholder="Enter your username"
        prefix={<UserOutlined />}
        suffix={
          <Tooltip title="This name is visible to your team">
            <InfoCircleOutlined />
          </Tooltip>
        }
      />
      <Input aria-label="Price" prefix="$" suffix="USD" />
      <Input aria-label="Disabled price" disabled prefix="$" suffix="USD" />
      <Input.Password
        aria-label="Password with suffix"
        placeholder="Password with suffix"
        suffix={<LockOutlined />}
      />
    </Flex>
  );
}

function ClearInputs() {
  return (
    <Flex gap="medium" vertical>
      <Input allowClear aria-label="Clearable input" defaultValue="Clear this value" />
      <Input.TextArea
        allowClear
        aria-label="Clearable text area"
        defaultValue="Clear this longer value"
        rows={3}
      />
    </Flex>
  );
}

function CountInputs() {
  return (
    <Flex gap="large" vertical>
      <Input count={{ max: 10, show: true }} defaultValue="Hello, Launch++!" />
      <Input count={{ show: true }} defaultValue="🔥🔥🔥" />
      <Input
        count={{
          exceedFormatter: (value, { max }) => Array.from(value).slice(0, max).join(""),
          max: 6,
          show: true,
        }}
        defaultValue="Launch"
      />
      <Input.TextArea maxLength={100} placeholder="Counted text area" rows={4} showCount />
    </Flex>
  );
}

function FocusInput() {
  const ref = useRef<HTMLInputElement>(null);
  const focus = (cursor: "all" | "end" | "start") => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    const position = cursor === "start" ? 0 : input.value.length;
    input.setSelectionRange(cursor === "all" ? 0 : position, input.value.length);
  };
  return (
    <Space size="medium" vertical>
      <Space wrap>
        <Button onClick={() => focus("start")}>Focus at first</Button>
        <Button onClick={() => focus("end")}>Focus at last</Button>
        <Button onClick={() => focus("all")}>Select all</Button>
      </Space>
      <Input defaultValue="Launch++ makes plugins approachable" ref={ref} />
    </Space>
  );
}

function SizedInputs() {
  return (
    <Flex gap="medium" vertical>
      <Input placeholder="Large size" prefix={<UserOutlined />} size="large" />
      <Input placeholder="Medium size" prefix={<UserOutlined />} />
      <Input placeholder="Small size" prefix={<UserOutlined />} size="small" />
    </Flex>
  );
}

function CompactInputs() {
  return (
    <Space size="medium" vertical>
      <Space.Compact>
        <Input defaultValue="0571" style={{ width: "25%" }} />
        <Input defaultValue="26888888" style={{ width: "75%" }} />
      </Space.Compact>
      <Space.Compact>
        <Space.Addon>https://</Space.Addon>
        <Input.Search allowClear placeholder="Search a website" />
      </Space.Compact>
      <Space.Compact block>
        <Input defaultValue="Create plugin package" />
        <Button variant="primary">Submit</Button>
      </Space.Compact>
      <Space.Compact>
        <Select
          ariaLabel="Region"
          defaultValue="europe"
          options={[
            { label: "Europe", value: "europe" },
            { label: "Americas", value: "americas" },
          ]}
        />
        <Input defaultValue="Berlin" />
      </Space.Compact>
      <Space.Compact size="large">
        <Space.Addon>
          <SearchOutlined />
        </Space.Addon>
        <Input placeholder="Large size" />
        <Input placeholder="Another input" />
      </Space.Compact>
    </Space>
  );
}

function LoadingSearchInputs() {
  return (
    <Flex gap="medium" vertical>
      <Input.Search aria-label="Loading search" loading placeholder="Searching" />
      <Input.Search
        aria-label="Loading button search"
        enterButton
        loading
        placeholder="Searching"
      />
      <Input.Search
        aria-label="Large loading search"
        enterButton="Search"
        loading
        placeholder="Searching"
        size="large"
      />
    </Flex>
  );
}

function AutoSizeTextAreas() {
  const [value, setValue] = useState("");
  return (
    <Flex gap="large" vertical>
      <Input.TextArea autoSize placeholder="Grows with its content" />
      <Input.TextArea
        autoSize={{ maxRows: 6, minRows: 2 }}
        placeholder="Between two and six rows"
      />
      <Input.TextArea
        autoSize={{ maxRows: 5, minRows: 3 }}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Controlled autosize"
        value={value}
      />
    </Flex>
  );
}

function PasswordInputs() {
  const [visible, setVisible] = useState(false);
  return (
    <Space size="medium" vertical>
      <Input.Password placeholder="Input password" />
      <Input.Password
        iconRender={(isVisible) => (isVisible ? "Hide" : "Show")}
        placeholder="Custom toggle"
      />
      <Space>
        <Input.Password
          placeholder="Controlled visibility"
          visibilityToggle={{ onVisibleChange: setVisible, visible }}
        />
        <Button onClick={() => setVisible((current) => !current)}>
          {visible ? "Hide" : "Show"}
        </Button>
      </Space>
      <Input.Password disabled placeholder="Disabled password" />
    </Space>
  );
}

function StatusInputs() {
  return (
    <Flex gap="small" vertical>
      <Input placeholder="Error" status="error" />
      <Input placeholder="Warning" status="warning" />
      <Input placeholder="Error with prefix" prefix={<ClockCircleOutlined />} status="error" />
      <Input placeholder="Warning with prefix" prefix={<ClockCircleOutlined />} status="warning" />
    </Flex>
  );
}

function SemanticInputs() {
  return (
    <Flex gap="medium" vertical>
      <Input
        classNames={{ prefix: "showcase-input-custom-affix" }}
        placeholder="Object customization"
        prefix={<UserOutlined />}
        styles={{ root: { borderColor: "var(--launch-ui-primary)" } }}
      />
      <Input.TextArea
        placeholder="Function customization"
        showCount
        styles={({ props }) => ({
          count: { color: "var(--launch-ui-success)" },
          root: { borderColor: props.showCount ? "var(--launch-ui-success)" : undefined },
          textarea: { resize: "none" },
        })}
      />
      <Input.OTP
        classNames={{ root: "showcase-input-custom-otp" }}
        styles={{ input: { borderColor: "var(--launch-ui-primary)", width: 36 } }}
      />
    </Flex>
  );
}

export const inputShowcase = defineShowcase({
  id: "input",
  name: "Input",
  category: "Data entry",
  stage: "prod",
  description:
    "Collects text, search queries, passwords, multi-line content, and verification codes.",
  usage: `import { Input } from "@launchpp/ui";

const { OTP, Password, Search, TextArea } = Input;`,
  whenToUse: [
    "Use Input for short free-form values and Search when submitting a query is a distinct action.",
    "Use TextArea for multi-line content, Password for secrets, and OTP for fixed-length verification codes.",
  ],
  examples: [
    {
      id: "input-basic",
      name: "Basic usage",
      description: "The standard single-line input.",
      preview: BasicInput,
      code: `<Input placeholder="Basic usage" />`,
    },
    {
      id: "input-variants",
      name: "Variants and shape",
      description:
        "Four surface treatments plus the rounded shape used by search-heavy interfaces.",
      preview: InputVariants,
      code: `<Input placeholder="Outlined" />
<Input variant="filled" placeholder="Filled" />
<Input variant="borderless" placeholder="Borderless" />
<Input variant="underlined" placeholder="Underlined" />
<Input shape="round" placeholder="Rounded" />`,
    },
    {
      id: "input-search",
      name: "Search box",
      description: "Submit from Enter, a compact icon, or a dedicated action button.",
      preview: SearchInputs,
      code: `<Input.Search placeholder="Search projects" onSearch={handleSearch} />
<Input.Search allowClear placeholder="Clearable search" />
<Input.Search enterButton placeholder="Search with button" />
<Input.Search enterButton="Search" size="large" />`,
    },
    {
      id: "input-textarea",
      name: "TextArea",
      description: "Use a native multi-line control for longer content.",
      preview: TextAreas,
      code: `<Input.TextArea rows={4} />
<Input.TextArea rows={4} maxLength={60} />`,
    },
    {
      id: "input-otp",
      name: "OTP",
      description: "Collect fixed-length codes with formatting, masking, and separators.",
      preview: OTPInputs,
      code: `<Input.OTP formatter={(value) => value.toUpperCase()} />
<Input.OTP length={8} />
<Input.OTP mask="🔒" />
<Input.OTP separator={(index) => index % 2 ? "—" : "/"} />`,
    },
    {
      id: "input-affixes",
      name: "Prefix and suffix",
      description: "Add contextual text, icons, or actions inside the field.",
      preview: AffixInputs,
      code: `<Input prefix={<UserOutlined />} suffix={<InfoCircleOutlined />} />
<Input prefix="$" suffix="USD" />
<Input.Password suffix={<LockOutlined />} />`,
    },
    {
      id: "input-clear",
      name: "Clear control",
      description: "Clear single-line and multi-line content without selecting it first.",
      preview: ClearInputs,
      code: `<Input allowClear defaultValue="Clear this value" />
<Input.TextArea allowClear defaultValue="Clear this longer value" />`,
    },
    {
      id: "input-count",
      name: "Character counting",
      description: "Display native limits or apply custom count and clipping logic.",
      preview: CountInputs,
      code: `<Input count={{ show: true, max: 10 }} />
<Input count={{ show: true }} defaultValue="🔥🔥🔥" />
<Input.TextArea showCount maxLength={100} />`,
    },
    {
      id: "input-focus",
      name: "Focus",
      description: "Native refs support programmatic focus and text selection.",
      preview: FocusInput,
      code: `const ref = useRef<HTMLInputElement>(null);

<Button onClick={() => ref.current?.focus()}>Focus</Button>
<Input ref={ref} />`,
    },
    {
      id: "input-sizes",
      name: "Three sizes",
      description: "Large, medium, and small inputs align with the shared control scale.",
      preview: SizedInputs,
      code: `<Input size="large" prefix={<UserOutlined />} />
<Input size="medium" prefix={<UserOutlined />} />
<Input size="small" prefix={<UserOutlined />} />`,
    },
    {
      id: "input-compact",
      name: "Compact composition",
      description: "Combine inputs, buttons, selects, and addons with Space.Compact.",
      preview: CompactInputs,
      code: `<Space.Compact>
  <Space.Addon>https://</Space.Addon>
  <Input.Search allowClear />
</Space.Compact>

<Space.Compact block>
  <Input defaultValue="Create plugin package" />
  <Button variant="primary">Submit</Button>
</Space.Compact>`,
    },
    {
      id: "input-search-loading",
      name: "Search loading",
      description: "Communicate an active search without changing the field layout.",
      preview: LoadingSearchInputs,
      code: `<Input.Search loading />
<Input.Search loading enterButton />
<Input.Search loading enterButton="Search" size="large" />`,
    },
    {
      id: "input-autosize",
      name: "Autosizing TextArea",
      description: "Grow with content or constrain automatic height to a row range.",
      preview: AutoSizeTextAreas,
      code: `<Input.TextArea autoSize />
<Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />`,
    },
    {
      id: "input-password",
      name: "Password",
      description: "Reveal or mask secrets with uncontrolled or controlled visibility.",
      preview: PasswordInputs,
      code: `<Input.Password placeholder="Input password" />
<Input.Password iconRender={(visible) => visible ? "Hide" : "Show"} />
<Input.Password visibilityToggle={{ visible, onVisibleChange: setVisible }} />`,
    },
    {
      id: "input-status",
      name: "Status",
      description: "Communicate error and warning validation states.",
      preview: StatusInputs,
      code: `<Input status="error" placeholder="Error" />
<Input status="warning" prefix={<ClockCircleOutlined />} />`,
    },
    {
      id: "input-semantics",
      name: "Custom semantic styling",
      description: "Customize public root, input, affix, count, and OTP elements.",
      preview: SemanticInputs,
      code: `<Input
  classNames={{ prefix: "custom-prefix" }}
  styles={{ root: { borderColor: "blue" } }}
/>
<Input.TextArea styles={({ props }) => ({ count: { color: "green" } })} />`,
    },
  ],
  api: [
    {
      name: "allowClear",
      type: "boolean | InputClearConfig",
      defaultValue: "false",
      description: "Shows a control that clears the current value.",
    },
    {
      name: "prefix / suffix",
      type: "ReactNode",
      description: "Adds contextual content inside an input.",
    },
    {
      name: "size",
      type: '"large" | "medium" | "small"',
      defaultValue: '"medium"',
      description: "Controls the field height.",
    },
    {
      name: "variant",
      type: '"outlined" | "filled" | "borderless" | "underlined"',
      defaultValue: '"outlined"',
      description: "Controls the field surface and border treatment.",
    },
    {
      name: "shape",
      type: '"default" | "round"',
      defaultValue: '"default"',
      description: "Controls the corner shape of single-line inputs.",
    },
    {
      name: "showCount / count",
      type: "boolean | InputCountConfig",
      description: "Displays and customizes character counting.",
    },
    {
      name: "autoSize",
      type: "boolean | { minRows?: number; maxRows?: number }",
      defaultValue: "false",
      description: "Automatically sizes Input.TextArea to its content.",
    },
    {
      name: "enterButton",
      type: "boolean | ReactNode",
      defaultValue: "false",
      description: "Adds a dedicated action to Input.Search.",
    },
    {
      name: "visibilityToggle",
      type: "boolean | PasswordVisibilityConfig",
      defaultValue: "true",
      description: "Controls the Input.Password reveal action.",
    },
    {
      name: "length",
      type: "number",
      defaultValue: "6",
      description: "Sets the number of Input.OTP fields.",
    },
  ],
  accessibility: [
    "Every field needs a visible label or accessible name.",
    "Search, clear, and password controls expose explicit accessible names.",
    "OTP fields announce their position in the complete code.",
  ],
});

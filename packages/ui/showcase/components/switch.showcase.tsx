import { useState } from "react";
import { CheckOutlined, CloseOutlined, FrownOutlined, SmileOutlined } from "../../src/icons.js";
import { Button, Flex, Space, Switch, type SwitchProps, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicSwitch() {
  const [message, setMessage] = useState("Enabled");
  return (
    <Space size="medium" vertical>
      <Switch
        ariaLabel="Enable notifications"
        defaultChecked
        onChange={(checked) => setMessage(checked ? "Enabled" : "Disabled")}
      />
      <Typography.Text type="secondary">Notifications: {message}</Typography.Text>
    </Space>
  );
}

function ContentSwitches() {
  return (
    <Flex align="start" gap="medium" vertical>
      <Switch ariaLabel="Text state" checkedChildren="On" defaultChecked unCheckedChildren="Off" />
      <Switch ariaLabel="Numeric state" checkedChildren={1} defaultChecked unCheckedChildren={0} />
      <Switch
        ariaLabel="Icon state"
        checkedChildren={<CheckOutlined />}
        defaultChecked
        unCheckedChildren={<CloseOutlined />}
      />
      <Switch
        ariaLabel="Mood"
        checkedChildren={
          <span className="showcase-switch-content">
            <SmileOutlined /> Happy
          </span>
        }
        defaultChecked
        unCheckedChildren={
          <span className="showcase-switch-content">
            <FrownOutlined /> Sad
          </span>
        }
      />
    </Flex>
  );
}

function LoadingSwitches() {
  return (
    <Space align="center" size="large">
      <Switch ariaLabel="Saving enabled setting" defaultChecked loading />
      <Switch ariaLabel="Saving disabled setting" loading size="small" />
    </Space>
  );
}

function DisabledSwitch() {
  const [disabled, setDisabled] = useState(true);
  return (
    <Space size="medium" vertical>
      <Switch ariaLabel="Feature availability" defaultChecked disabled={disabled} />
      <Button onClick={() => setDisabled((current) => !current)} size="small" variant="primary">
        {disabled ? "Enable switch" : "Disable switch"}
      </Button>
    </Space>
  );
}

function SwitchSizes() {
  return (
    <Space align="center" size="large">
      <Switch ariaLabel="Medium switch" defaultChecked />
      <Switch ariaLabel="Small switch" defaultChecked size="small" />
    </Space>
  );
}

function ControlledSwitch() {
  const [checked, setChecked] = useState(true);
  return (
    <Space size="medium" vertical>
      <Switch
        ariaLabel="Controlled setting"
        checked={checked}
        checkedChildren="On"
        onChange={setChecked}
        unCheckedChildren="Off"
      />
      <Button onClick={() => setChecked((current) => !current)} size="small">
        Toggle externally
      </Button>
    </Space>
  );
}

function SemanticSwitches() {
  const functionClassNames: SwitchProps["classNames"] = ({ props }) => ({
    ...(props.size === "small" ? { indicator: "showcase-switch-function-indicator is-small" } : {}),
    root: "showcase-switch-function-root",
  });

  return (
    <Flex align="start" gap="medium" vertical>
      <Switch
        ariaLabel="Object styling"
        checkedChildren="On"
        defaultChecked
        styles={{ indicator: { backgroundColor: "#fff" }, root: { backgroundColor: "#52c41a" } }}
        unCheckedChildren="Off"
      />
      <Switch
        ariaLabel="Function styling"
        checkedChildren="On"
        classNames={functionClassNames}
        defaultChecked
        size="small"
        styles={({ props }) => ({
          root: { backgroundColor: props.size === "small" ? "#722ed1" : "#1668dc" },
        })}
        unCheckedChildren="Off"
      />
    </Flex>
  );
}

export const switchShowcase = defineShowcase({
  id: "switch",
  name: "Switch",
  category: "Data entry",
  stage: "prod",
  description: "Toggles a setting between two states and applies the change immediately.",
  whenToUse: [
    "Use Switch for settings that take effect as soon as they are changed.",
    "Use Checkbox instead when a choice should wait for a form submission.",
  ],
  examples: [
    {
      id: "switch-basic",
      name: "Basic",
      description: "The change callback receives the next checked state.",
      preview: BasicSwitch,
      code: `<Switch\n  ariaLabel="Enable notifications"\n  defaultChecked\n  onChange={(checked) => console.log(checked)}\n/>`,
    },
    {
      id: "switch-content",
      name: "Text and icons",
      description: "Show concise text, numbers, icons, or a small combination inside the track.",
      preview: ContentSwitches,
      code: `<Switch checkedChildren="On" unCheckedChildren="Off" defaultChecked />\n<Switch checkedChildren={1} unCheckedChildren={0} defaultChecked />\n<Switch\n  checkedChildren={<CheckOutlined />}\n  unCheckedChildren={<CloseOutlined />}\n  defaultChecked\n/>`,
    },
    {
      id: "switch-loading",
      name: "Loading",
      description: "Loading communicates that a requested state change is still being saved.",
      preview: LoadingSwitches,
      code: `<Switch loading defaultChecked />\n<Switch loading size="small" />`,
    },
    {
      id: "switch-disabled",
      name: "Disabled",
      description: "A disabled switch remains readable but cannot be changed.",
      preview: DisabledSwitch,
      code: `<Switch disabled={disabled} defaultChecked />\n<Button onClick={() => setDisabled(!disabled)}>Toggle disabled</Button>`,
    },
    {
      id: "switch-sizes",
      name: "Two sizes",
      preview: SwitchSizes,
      code: `<Switch defaultChecked />\n<Switch defaultChecked size="small" />`,
    },
    {
      id: "switch-controlled",
      name: "Controlled state",
      description: "Use checked and onChange when application state owns the value.",
      preview: ControlledSwitch,
      code: `<Switch checked={checked} onChange={setChecked} />`,
    },
    {
      id: "switch-semantic-styles",
      name: "Semantic styling",
      description:
        "Apply public classes or styles to the root and indicator without targeting internals.",
      preview: SemanticSwitches,
      code: `<Switch\n  classNames={{ root: "custom-root", indicator: "custom-indicator" }}\n  styles={{ root: { backgroundColor: "#52c41a" } }}\n/>`,
    },
  ],
  api: [
    {
      name: "checked",
      description: "Controls whether the switch is on.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "defaultChecked",
      description: "Sets the initial uncontrolled state.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "checkedChildren",
      description: "Content shown while the switch is on.",
      type: "ReactNode",
    },
    {
      name: "unCheckedChildren",
      description: "Content shown while the switch is off.",
      type: "ReactNode",
    },
    {
      name: "loading",
      description: "Shows progress and temporarily prevents interaction.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "disabled",
      description: "Prevents interaction.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "size",
      description: "Changes the control dimensions.",
      type: '"medium" | "small"',
      defaultValue: '"medium"',
    },
    {
      name: "onChange",
      description: "Runs after the checked state changes.",
      type: "(checked, event) => void",
    },
    {
      name: "onClick",
      description: "Runs when an enabled switch is clicked, before onChange.",
      type: "(checked, event) => void",
    },
    {
      name: "classNames",
      description: "Custom classes for the root and indicator.",
      type: "SwitchClassNames | function",
    },
    {
      name: "styles",
      description: "Custom styles for the root and indicator.",
      type: "SwitchStyles | function",
    },
  ],
  accessibility: [
    "Provide ariaLabel when the switch is not associated with a visible label.",
    "Native button behavior supports Enter and Space, and loading or disabled states are not focusable.",
  ],
});

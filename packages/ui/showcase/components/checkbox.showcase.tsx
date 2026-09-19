import { useState } from "react";
import {
  Button,
  Checkbox,
  type CheckboxProps,
  Col,
  Divider,
  Flex,
  Row,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const fruitOptions = ["Apple", "Pear", "Orange"] as const;

function BasicCheckbox() {
  const [message, setMessage] = useState("Not selected");
  return (
    <Space size="medium" vertical>
      <Checkbox onChange={(event) => setMessage(`Checked: ${event.target.checked}`)}>
        Checkbox
      </Checkbox>
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function ControlledCheckbox() {
  const [checked, setChecked] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const label = `${checked ? "Checked" : "Unchecked"}-${disabled ? "Disabled" : "Enabled"}`;

  return (
    <Space size="medium" vertical>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(event) => setChecked(event.target.checked)}
      >
        {label}
      </Checkbox>
      <Space>
        <Button onClick={() => setChecked((current) => !current)} size="small" variant="primary">
          {checked ? "Uncheck" : "Check"}
        </Button>
        <Button onClick={() => setDisabled((current) => !current)} size="small" variant="primary">
          {disabled ? "Enable" : "Disable"}
        </Button>
      </Space>
    </Space>
  );
}

function CheckAllCheckbox() {
  const [checkedList, setCheckedList] = useState<ReadonlyArray<string>>(["Apple", "Orange"]);
  const checkAll = checkedList.length === fruitOptions.length;
  const indeterminate = checkedList.length > 0 && !checkAll;

  return (
    <div className="showcase-checkbox-check-all">
      <Checkbox
        checked={checkAll}
        indeterminate={indeterminate}
        onChange={(event) => setCheckedList(event.target.checked ? [...fruitOptions] : [])}
      >
        Check all
      </Checkbox>
      <Divider />
      <Checkbox.Group onChange={setCheckedList} options={fruitOptions} value={checkedList} />
    </div>
  );
}

function SemanticCheckbox() {
  const [functionChecked, setFunctionChecked] = useState(true);
  const classNames: CheckboxProps["classNames"] = ({ props }) => ({
    icon: "showcase-checkbox-function-icon",
    label: props.checked ? "showcase-checkbox-function-label is-checked" : undefined,
    root: "showcase-checkbox-function-root",
  });

  return (
    <Flex gap="medium" vertical>
      <Checkbox
        styles={{ icon: { borderRadius: 6 }, label: { color: "var(--launch-ui-primary)" } }}
      >
        Object styles
      </Checkbox>
      <Checkbox
        checked={functionChecked}
        classNames={classNames}
        onChange={(event) => setFunctionChecked(event.target.checked)}
      >
        Function class names
      </Checkbox>
    </Flex>
  );
}

function DisabledCheckboxes() {
  return (
    <Flex gap="medium" vertical>
      <Checkbox disabled>Unchecked</Checkbox>
      <Checkbox disabled indeterminate>
        Indeterminate
      </Checkbox>
      <Checkbox defaultChecked disabled>
        Checked
      </Checkbox>
    </Flex>
  );
}

function CheckboxGroups() {
  const objectOptions = fruitOptions.map((fruit) => ({ label: fruit, value: fruit }));
  return (
    <Space size="large" vertical>
      <Checkbox.Group defaultValue={["Apple"]} options={fruitOptions} />
      <Checkbox.Group defaultValue={["Pear"]} options={objectOptions} />
      <Checkbox.Group defaultValue={["Apple"]} disabled options={objectOptions} />
    </Space>
  );
}

function GridCheckboxes() {
  return (
    <Checkbox.Group className="showcase-checkbox-grid">
      <Row gutter={[16, 16]}>
        {["A", "B", "C", "D", "E"].map((value) => (
          <Col key={value} span={8}>
            <Checkbox value={value}>{value}</Checkbox>
          </Col>
        ))}
      </Row>
    </Checkbox.Group>
  );
}

export const checkboxShowcase = defineShowcase({
  id: "checkbox",
  name: "Checkbox",
  category: "Data entry",
  stage: "prod",
  description: "Collects one or more selections from a set of available choices.",
  usage: `import { Checkbox } from "@launchpp/ui";`,
  whenToUse: [
    "Use checkboxes when people may select multiple values from a set of options.",
    "For one setting that takes effect immediately, use Switch instead.",
  ],
  examples: [
    {
      id: "checkbox-basic",
      name: "Basic",
      description: "A single checkbox reports its selected state through the native change event.",
      preview: BasicCheckbox,
      code: `<Checkbox onChange={(event) => console.log(event.target.checked)}>
  Checkbox
</Checkbox>`,
    },
    {
      id: "checkbox-controlled",
      name: "Controlled checkbox",
      description: "Control checked and disabled state from other components.",
      preview: ControlledCheckbox,
      code: `<Checkbox
  checked={checked}
  disabled={disabled}
  onChange={(event) => setChecked(event.target.checked)}
>
  {label}
</Checkbox>`,
    },
    {
      id: "checkbox-check-all",
      name: "Check all",
      description: "Use the indeterminate state when only part of a group is selected.",
      preview: CheckAllCheckbox,
      code: `<Checkbox checked={checkAll} indeterminate={indeterminate} onChange={onCheckAllChange}>
  Check all
</Checkbox>
<Divider />
<Checkbox.Group options={options} value={checkedList} onChange={setCheckedList} />`,
    },
    {
      id: "checkbox-semantic-styles",
      name: "Custom semantic styling",
      description: "Customize the public root, input, icon, and label semantic elements.",
      preview: SemanticCheckbox,
      code: `<Checkbox styles={{ icon: { borderRadius: 6 }, label: { color: "blue" } }}>
  Object styles
</Checkbox>

<Checkbox checked classNames={({ props }) => ({
  label: props.checked ? "checked-label" : undefined,
})}>
  Function class names
</Checkbox>`,
    },
    {
      id: "checkbox-disabled",
      name: "Disabled",
      description: "Disabled checkboxes retain their checked or indeterminate state.",
      preview: DisabledCheckboxes,
      code: `<Checkbox disabled>Unchecked</Checkbox>
<Checkbox indeterminate disabled>Indeterminate</Checkbox>
<Checkbox defaultChecked disabled>Checked</Checkbox>`,
    },
    {
      id: "checkbox-group",
      name: "Checkbox group",
      description: "Generate a coordinated group from primitive values or option objects.",
      preview: CheckboxGroups,
      code: `<Checkbox.Group options={["Apple", "Pear", "Orange"]} defaultValue={["Apple"]} />
<Checkbox.Group options={options} defaultValue={["Pear"]} />
<Checkbox.Group options={options} defaultValue={["Apple"]} disabled />`,
    },
    {
      id: "checkbox-grid",
      name: "Use with Grid",
      description: "Compose a checkbox group with Grid for more complex option layouts.",
      preview: GridCheckboxes,
      code: `<Checkbox.Group>
  <Row>
    <Col span={8}><Checkbox value="A">A</Checkbox></Col>
    <Col span={8}><Checkbox value="B">B</Checkbox></Col>
    <Col span={8}><Checkbox value="C">C</Checkbox></Col>
  </Row>
</Checkbox.Group>`,
    },
  ],
  api: [
    {
      name: "checked",
      description: "Controls whether the checkbox is selected.",
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
      description: "Prevents interaction with the checkbox or group.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "indeterminate",
      description: "Displays a partially selected state.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "onChange",
      description: "Runs when the checkbox state changes.",
      type: "ChangeEventHandler<HTMLInputElement>",
    },
    {
      name: "options",
      description: "Creates the choices in Checkbox.Group.",
      type: "Array<CheckboxValue | CheckboxOption>",
    },
    {
      name: "value",
      description: "Identifies a checkbox or controls the selected group values.",
      type: "CheckboxValue | CheckboxValue[]",
    },
  ],
  accessibility: [
    "Checkbox uses a native input and supports keyboard toggling with Space.",
    "Provide visible label content unless an accessible name is supplied explicitly.",
    "Indeterminate checkboxes expose aria-checked as mixed.",
  ],
});

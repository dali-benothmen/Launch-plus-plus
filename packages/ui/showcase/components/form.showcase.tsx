import { useState } from "react";
import {
  Button,
  Checkbox,
  Form,
  type FormLayout,
  Input,
  Select,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

interface AccountFields {
  email?: string;
  password?: string;
  remember?: boolean;
}

function BasicForm() {
  const [result, setResult] = useState("Submit the form to see its values.");
  return (
    <Space className="showcase-form-example" size="medium" vertical>
      <Form<AccountFields>
        initialValues={{ remember: true }}
        onFinish={(values) => setResult(`Signed in as ${values.email}`)}
      >
        <Form.Item<AccountFields>
          label="Email"
          name="email"
          rules={[{ required: true, type: "email" }]}
        >
          <Input placeholder="name@company.com" type="email" />
        </Form.Item>
        <Form.Item<AccountFields>
          label="Password"
          name="password"
          rules={[{ min: 8, required: true }]}
        >
          <Input.Password placeholder="At least 8 characters" />
        </Form.Item>
        <Form.Item<AccountFields> name="remember" valuePropName="checked">
          <Checkbox>Remember me</Checkbox>
        </Form.Item>
        <Form.Item>
          <Button type="submit" variant="primary">
            Sign in
          </Button>
        </Form.Item>
      </Form>
      <Typography.Text type="secondary">{result}</Typography.Text>
    </Space>
  );
}

interface ProjectFields {
  name?: string;
  owner?: string;
}

function FormMethods() {
  const [form] = Form.useForm<ProjectFields>();
  const [result, setResult] = useState("No project saved yet.");
  return (
    <Space className="showcase-form-example" size="medium" vertical>
      <Form<ProjectFields>
        form={form}
        initialValues={{ owner: "me" }}
        layout="vertical"
        onFinish={(values) => setResult(`Saved ${values.name ?? "untitled project"}`)}
      >
        <Form.Item<ProjectFields> label="Project name" name="name" rules={[{ required: true }]}>
          <Input placeholder="Plugin marketplace" />
        </Form.Item>
        <Form.Item<ProjectFields> label="Owner" name="owner" trigger="onValueChange">
          <Select
            ariaLabel="Project owner"
            options={[
              { label: "Me", value: "me" },
              { label: "Design team", value: "design" },
              { label: "Engineering team", value: "engineering" },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Space wrap>
            <Button type="submit" variant="primary">
              Save
            </Button>
            <Button onClick={() => form.resetFields()}>Reset</Button>
            <Button
              onClick={() => form.setFieldsValue({ name: "Launch++ website", owner: "design" })}
              variant="link"
            >
              Fill form
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <Typography.Text type="secondary">{result}</Typography.Text>
    </Space>
  );
}

interface PluginFields {
  slug?: string;
  website?: string;
}

function ValidationForm() {
  return (
    <Form<PluginFields> className="showcase-form-example" layout="vertical">
      <Form.Item<PluginFields>
        extra="Lowercase letters, numbers, and hyphens only."
        label="Plugin ID"
        name="slug"
        rules={[
          { message: "Choose a plugin ID", required: true },
          { message: "Use lowercase letters, numbers, and hyphens", pattern: /^[a-z0-9-]+$/ },
          {
            validator: (value) => (value === "launchpp" ? "This plugin ID is reserved" : undefined),
          },
        ]}
        validateTrigger={["onBlur", "onChange"]}
      >
        <Input placeholder="acme-sprint-planner" />
      </Form.Item>
      <Form.Item<PluginFields>
        label="Website"
        name="website"
        rules={[{ message: "Enter a complete URL", type: "url" }]}
        validateTrigger="onBlur"
      >
        <Input placeholder="https://example.com" />
      </Form.Item>
      <Form.Item>
        <Button type="submit" variant="primary">
          Validate
        </Button>
      </Form.Item>
    </Form>
  );
}

function FormLayouts() {
  const [layout, setLayout] = useState<FormLayout>("horizontal");
  return (
    <Space className="showcase-form-layouts" size="large" vertical>
      <Space wrap>
        {(["horizontal", "vertical", "inline"] as const).map((option) => (
          <Button
            key={option}
            onClick={() => setLayout(option)}
            variant={layout === option ? "primary" : "default"}
          >
            {option[0]?.toUpperCase()}
            {option.slice(1)}
          </Button>
        ))}
      </Space>
      <Form layout={layout}>
        <Form.Item label="Project" name="project">
          <Input placeholder="Project name" />
        </Form.Item>
        <Form.Item label="Member" name="member">
          <Input placeholder="Member name" />
        </Form.Item>
        <Form.Item>
          <Button type="submit" variant="primary">
            Create
          </Button>
        </Form.Item>
      </Form>
    </Space>
  );
}

function SupportingText() {
  return (
    <Form
      className="showcase-form-example"
      initialValues={{ displayName: "Sprint planner", packageName: "sprint-planner" }}
      layout="vertical"
      requiredMark="optional"
    >
      <Form.Item
        extra="Shown on your public plugin page."
        label="Display name"
        name="displayName"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        help="This identifier is already in use."
        label="Package name"
        name="packageName"
        validateStatus="error"
      >
        <Input />
      </Form.Item>
      <Form.Item help="The manifest is valid." label="Manifest" validateStatus="success">
        <Input readOnly value="manifest.json" />
      </Form.Item>
    </Form>
  );
}

function DisabledForm() {
  return (
    <Form
      className="showcase-form-example"
      disabled
      initialValues={{ email: "owner@launchpp.dev", updates: true }}
      layout="vertical"
    >
      <Form.Item label="Email" name="email">
        <Input />
      </Form.Item>
      <Form.Item name="updates" valuePropName="checked">
        <Checkbox>Product updates</Checkbox>
      </Form.Item>
      <Form.Item>
        <Button variant="primary">Save</Button>
      </Form.Item>
    </Form>
  );
}

export const formShowcase = defineShowcase({
  id: "form",
  name: "Form",
  category: "Data entry",
  stage: "prod",
  description: "Collects, validates, and submits related field values as one data object.",
  usage: `import { Button, Checkbox, Form, Input } from "@launchpp/ui";`,
  whenToUse: [
    "Use Form when several fields belong to one submission or need coordinated validation.",
    "Use Form.Item to connect a field to the form store, label it, and define validation rules.",
  ],
  examples: [
    {
      id: "form-basic",
      name: "Basic usage",
      description: "Initial values, validation, checkbox binding, and submission in one form.",
      preview: BasicForm,
      code: `<Form
  initialValues={{ remember: true }}
  onFinish={(values) => console.log(values)}
>
  <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
    <Input />
  </Form.Item>
  <Form.Item label="Password" name="password" rules={[{ required: true, min: 8 }]}>
    <Input.Password />
  </Form.Item>
  <Form.Item name="remember" valuePropName="checked">
    <Checkbox>Remember me</Checkbox>
  </Form.Item>
  <Form.Item>
    <Button type="submit" variant="primary">Sign in</Button>
  </Form.Item>
</Form>`,
    },
    {
      id: "form-methods",
      name: "Form methods",
      description:
        "Use Form.useForm to fill, reset, validate, or submit a form from another control.",
      preview: FormMethods,
      code: `const [form] = Form.useForm();

<Form form={form} initialValues={{ owner: "me" }} onFinish={saveProject}>
  <Form.Item label="Project name" name="name" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  <Form.Item label="Owner" name="owner" trigger="onValueChange">
    <Select ariaLabel="Owner" options={owners} />
  </Form.Item>
  <Button onClick={() => form.resetFields()}>Reset</Button>
  <Button onClick={() => form.setFieldsValue({ name: "Launch++" })}>Fill form</Button>
</Form>`,
    },
    {
      id: "form-validation",
      name: "Validation rules",
      description: "Compose built-in rules with a custom synchronous or asynchronous validator.",
      preview: ValidationForm,
      code: `<Form.Item
  label="Plugin ID"
  name="slug"
  rules={[
    { required: true, message: "Choose a plugin ID" },
    { pattern: /^[a-z0-9-]+$/, message: "Use lowercase letters, numbers, and hyphens" },
    { validator: async (value) => isReserved(value) ? "This plugin ID is reserved" : undefined },
  ]}
>
  <Input />
</Form.Item>`,
    },
    {
      id: "form-layouts",
      name: "Layouts",
      description:
        "Choose horizontal, vertical, or inline composition without changing field markup.",
      preview: FormLayouts,
      code: `<Form layout="horizontal">...</Form>
<Form layout="vertical">...</Form>
<Form layout="inline">...</Form>`,
    },
    {
      id: "form-supporting-text",
      name: "Status and supporting text",
      description: "Add persistent guidance or display a controlled validation state.",
      preview: SupportingText,
      code: `<Form layout="vertical" requiredMark="optional">
  <Form.Item label="Display name" name="displayName" extra="Shown publicly.">
    <Input />
  </Form.Item>
  <Form.Item label="Package name" validateStatus="error" help="Already in use.">
    <Input />
  </Form.Item>
</Form>`,
    },
    {
      id: "form-disabled",
      name: "Disabled form",
      description: "Disable all connected controls from the Form root.",
      preview: DisabledForm,
      code: `<Form disabled initialValues={{ email: "owner@launchpp.dev" }}>
  <Form.Item label="Email" name="email"><Input /></Form.Item>
</Form>`,
    },
  ],
  api: [
    {
      name: "form",
      description: "Connects an instance created by Form.useForm.",
      type: "FormInstance<TValues>",
    },
    {
      name: "initialValues",
      description: "Sets field values when the form first mounts and when it is reset.",
      type: "Partial<TValues>",
    },
    {
      name: "layout",
      description: "Controls label and field arrangement.",
      type: '"horizontal" | "vertical" | "inline"',
      defaultValue: '"horizontal"',
    },
    {
      name: "onFinish",
      description: "Runs after every registered field passes validation.",
      type: "(values: TValues) => void | Promise<void>",
    },
    {
      name: "onFinishFailed",
      description: "Runs with current values and validation errors after an invalid submission.",
      type: "(info: FormFinishFailedInfo<TValues>) => void",
    },
    {
      name: "onValuesChange",
      description: "Runs when a connected field or form method changes values.",
      type: "(changedValues, values) => void",
    },
    {
      name: "requiredMark",
      description: "Shows required or optional markers beside labels.",
      type: 'boolean | "optional"',
      defaultValue: "true",
    },
    {
      name: "Form.Item name",
      description: "Connects the child control to a key in the form values.",
      type: "keyof TValues | string",
    },
    {
      name: "Form.Item rules",
      description: "Validates required, length, pattern, type, or custom constraints.",
      type: "FormRule<TValues>[]",
    },
    {
      name: "Form.Item valuePropName",
      description: "Changes the controlled value property, such as checked for Checkbox.",
      type: "string",
      defaultValue: '"value"',
    },
    {
      name: "Form.Item trigger",
      description: "Changes the child callback used to collect values, such as onValueChange.",
      type: "string",
      defaultValue: '"onChange"',
    },
  ],
  accessibility: [
    "Form.Item associates visible text labels with their controls through native label and id attributes.",
    "Validation errors use role=alert and are referenced by the field through aria-describedby.",
    "Submission uses a native form event, so Enter and submit buttons keep their expected browser behavior.",
  ],
});

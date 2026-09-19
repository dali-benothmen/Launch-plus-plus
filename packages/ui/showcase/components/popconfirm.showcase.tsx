import { useState } from "react";
import { QuestionCircleOutlined } from "../../src/icons.js";
import {
  Button,
  Flex,
  message,
  Popconfirm,
  type PopconfirmProps,
  Space,
  Switch,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicPopconfirm() {
  const [messageApi, contextHolder] = message.useMessage();
  return (
    <>
      {contextHolder}
      <Popconfirm
        cancelText="No"
        description="Are you sure you want to delete this task?"
        okText="Yes"
        onCancel={() => messageApi.info("Deletion cancelled")}
        onConfirm={() => messageApi.success("Task deleted")}
        title="Delete the task"
      >
        <Button danger>Delete</Button>
      </Popconfirm>
    </>
  );
}

function PlacementPopconfirm({
  children,
  placement,
}: {
  readonly children: string;
  readonly placement: NonNullable<PopconfirmProps["placement"]>;
}) {
  return (
    <Popconfirm placement={placement} title="Are you sure?">
      <Button className="showcase-popover-placement-button">{children}</Button>
    </Popconfirm>
  );
}

function PopconfirmPlacements() {
  return (
    <Flex align="center" className="showcase-popover-placements" gap="small" vertical>
      <Space wrap>
        <PlacementPopconfirm placement="topLeft">TL</PlacementPopconfirm>
        <PlacementPopconfirm placement="top">Top</PlacementPopconfirm>
        <PlacementPopconfirm placement="topRight">TR</PlacementPopconfirm>
      </Space>
      <Flex className="showcase-popover-placement-middle" justify="space-between">
        <Flex gap="small" vertical>
          <PlacementPopconfirm placement="leftTop">LT</PlacementPopconfirm>
          <PlacementPopconfirm placement="left">Left</PlacementPopconfirm>
          <PlacementPopconfirm placement="leftBottom">LB</PlacementPopconfirm>
        </Flex>
        <Flex gap="small" vertical>
          <PlacementPopconfirm placement="rightTop">RT</PlacementPopconfirm>
          <PlacementPopconfirm placement="right">Right</PlacementPopconfirm>
          <PlacementPopconfirm placement="rightBottom">RB</PlacementPopconfirm>
        </Flex>
      </Flex>
      <Space wrap>
        <PlacementPopconfirm placement="bottomLeft">BL</PlacementPopconfirm>
        <PlacementPopconfirm placement="bottom">Bottom</PlacementPopconfirm>
        <PlacementPopconfirm placement="bottomRight">BR</PlacementPopconfirm>
      </Space>
    </Flex>
  );
}

function ConditionalPopconfirm() {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [executeDirectly, setExecuteDirectly] = useState(true);
  const confirm = () => {
    setOpen(false);
    messageApi.success("Action completed");
  };
  return (
    <>
      {contextHolder}
      <Space vertical>
        <Popconfirm
          description="The action requires confirmation."
          onConfirm={confirm}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setOpen(false);
            else if (executeDirectly) confirm();
            else setOpen(true);
          }}
          open={open}
          title="Apply this change?"
        >
          <Button>Perform action</Button>
        </Popconfirm>
        <Space>
          <Typography.Text>Execute directly</Typography.Text>
          <Switch checked={executeDirectly} onChange={setExecuteDirectly} />
        </Space>
      </Space>
    </>
  );
}

function ControlledAsyncPopconfirm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const confirm = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setOpen(false);
    }, 1500);
  };
  return (
    <Popconfirm
      description="The dialog remains open while the project is archived."
      okButtonProps={{ loading }}
      onCancel={() => setOpen(false)}
      onConfirm={confirm}
      open={open}
      title="Archive project"
    >
      <Button onClick={() => setOpen(true)}>Open controlled confirmation</Button>
    </Popconfirm>
  );
}

function PromisePopconfirm() {
  return (
    <Popconfirm
      description="The confirm button loads until the Promise resolves."
      onConfirm={() => new Promise((resolve) => window.setTimeout(resolve, 1500))}
      title="Publish changes"
    >
      <Button variant="primary">Publish</Button>
    </Popconfirm>
  );
}

function CustomizedPopconfirm() {
  return (
    <Space wrap>
      <Popconfirm
        cancelText="Keep"
        description="This cannot be undone."
        okText="Delete"
        title="Delete permanently?"
      >
        <Button danger>Custom labels</Button>
      </Popconfirm>
      <Popconfirm
        description="This confirmation uses a custom icon."
        icon={<QuestionCircleOutlined style={{ color: "var(--launch-ui-error)" }} />}
        title="Continue?"
      >
        <Button>Custom icon</Button>
      </Popconfirm>
      <Popconfirm showCancel={false} title="Acknowledge this update?">
        <Button>Confirm only</Button>
      </Popconfirm>
    </Space>
  );
}

function SemanticPopconfirm() {
  const styles: PopconfirmProps["styles"] = ({ props }) => ({
    container: {
      background:
        props.arrow === false ? "var(--launch-ui-primary-bg)" : "var(--launch-ui-surface)",
    },
    content: { color: "var(--launch-ui-text-secondary)" },
    title: { color: "var(--launch-ui-primary)", fontWeight: 600 },
  });
  return (
    <Popconfirm
      arrow={false}
      classNames={{ container: "showcase-popover-semantic" }}
      description="Semantic slots avoid relying on private markup."
      styles={styles}
      title="Styled confirmation"
    >
      <Button>Semantic styles</Button>
    </Popconfirm>
  );
}

export const popconfirmShowcase = defineShowcase({
  id: "popconfirm",
  name: "Popconfirm",
  category: "Feedback",
  stage: "prod",
  description: "Asks for a lightweight confirmation next to the action that triggered it.",
  usage: 'import { Popconfirm } from "@launchpp/ui";',
  whenToUse: [
    "Use Popconfirm for a simple, potentially destructive action that can be confirmed without additional context.",
    "Use Modal instead when the decision needs detailed content, form fields, or multiple steps.",
  ],
  examples: [
    {
      id: "popconfirm-basic",
      name: "Basic",
      description: "Confirm or cancel an action from a compact anchored popup.",
      preview: BasicPopconfirm,
      code: `<Popconfirm
  title="Delete the task"
  description="Are you sure you want to delete this task?"
  onConfirm={confirm}
  onCancel={cancel}
  okText="Yes"
  cancelText="No"
>
  <Button danger>Delete</Button>
</Popconfirm>`,
    },
    {
      id: "popconfirm-placement",
      name: "Placement",
      description: "Choose from twelve placements; overflow is adjusted automatically by default.",
      preview: PopconfirmPlacements,
      code: `<Popconfirm placement="topLeft" title="Are you sure?">
  <Button>TL</Button>
</Popconfirm>

<Popconfirm placement="rightBottom" title="Are you sure?">
  <Button>RB</Button>
</Popconfirm>`,
    },
    {
      id: "popconfirm-conditional",
      name: "Conditional trigger",
      description: "Control visibility when an action only needs confirmation in some states.",
      preview: ConditionalPopconfirm,
      code: `<Popconfirm
  title="Apply this change?"
  open={open}
  onOpenChange={(nextOpen) => {
    if (nextOpen && canExecuteDirectly) confirm();
    else setOpen(nextOpen);
  }}
  onConfirm={confirm}
>
  <Button>Perform action</Button>
</Popconfirm>`,
    },
    {
      id: "popconfirm-controlled-async",
      name: "Controlled asynchronous close",
      description: "Manage visibility and button loading directly for a controlled workflow.",
      preview: ControlledAsyncPopconfirm,
      code: `<Popconfirm
  title="Archive project"
  open={open}
  okButtonProps={{ loading }}
  onConfirm={handleConfirm}
  onCancel={() => setOpen(false)}
>
  <Button onClick={() => setOpen(true)}>Open confirmation</Button>
</Popconfirm>`,
    },
    {
      id: "popconfirm-promise",
      name: "Close on Promise",
      description: "Return a Promise to add loading and close automatically after it resolves.",
      preview: PromisePopconfirm,
      code: `<Popconfirm
  title="Publish changes"
  onConfirm={() => saveChanges()}
>
  <Button variant="primary">Publish</Button>
</Popconfirm>`,
    },
    {
      id: "popconfirm-custom",
      name: "Labels, icon, and actions",
      description: "Customize action labels and the leading icon, or hide the cancel action.",
      preview: CustomizedPopconfirm,
      code: `<Popconfirm
  title="Delete permanently?"
  icon={<QuestionCircleOutlined />}
  okText="Delete"
  cancelText="Keep"
>
  <Button danger>Delete</Button>
</Popconfirm>`,
    },
    {
      id: "popconfirm-semantic",
      name: "Semantic styling",
      description: "Style documented regions without targeting private DOM structure.",
      preview: SemanticPopconfirm,
      code: `<Popconfirm
  title="Styled confirmation"
  description="Semantic slots avoid private markup."
  classNames={{ container: "confirmation" }}
  styles={{ title: { color: "var(--launch-ui-primary)" } }}
>
  <Button>Semantic styles</Button>
</Popconfirm>`,
    },
  ],
  api: [
    { name: "title", description: "Primary confirmation message.", type: "ReactNode | function" },
    {
      name: "description",
      description: "Optional supporting detail below the title.",
      type: "ReactNode | function",
    },
    {
      name: "onConfirm",
      description: "Runs on confirmation; a returned Promise enables loading until it settles.",
      type: "(event) => unknown | Promise<unknown>",
    },
    {
      name: "onCancel",
      description: "Runs when the cancel action is selected.",
      type: "(event) => void",
    },
    {
      name: "okText",
      description: "Confirmation action label.",
      type: "ReactNode",
      defaultValue: "OK",
    },
    {
      name: "cancelText",
      description: "Cancel action label.",
      type: "ReactNode",
      defaultValue: "Cancel",
    },
    {
      name: "okType",
      description: "Confirmation button variant.",
      type: "ButtonVariant",
      defaultValue: "primary",
    },
    {
      name: "okButtonProps",
      description: "Props passed to the confirmation Button.",
      type: "ButtonProps",
    },
    {
      name: "cancelButtonProps",
      description: "Props passed to the cancel Button.",
      type: "ButtonProps",
    },
    {
      name: "showCancel",
      description: "Shows the cancel action.",
      type: "boolean",
      defaultValue: "true",
    },
    {
      name: "icon",
      description: "Leading confirmation icon; use null to hide it.",
      type: "ReactNode",
    },
    {
      name: "disabled",
      description: "Prevents the confirmation from opening.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "placement",
      description: "Popup placement relative to its trigger.",
      type: "PopoverPlacement",
      defaultValue: "top",
    },
    { name: "open", description: "Controlled visibility state.", type: "boolean" },
    {
      name: "defaultOpen",
      description: "Initial uncontrolled visibility.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "onOpenChange",
      description: "Runs when visibility is requested to change.",
      type: "(open) => void",
    },
    {
      name: "arrow",
      description: "Controls the popup arrow.",
      type: "boolean | { pointAtCenter: boolean }",
      defaultValue: "true",
    },
    {
      name: "trigger",
      description: "Interaction that opens the popup.",
      type: "PopoverTrigger | PopoverTrigger[]",
      defaultValue: "click",
    },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "PopconfirmClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "PopconfirmStyles | function",
    },
  ],
  accessibility: [
    "The trigger exposes its expanded state and relationship to the confirmation popup.",
    "Keep action labels explicit; destructive confirmation buttons should describe the committed action.",
  ],
});

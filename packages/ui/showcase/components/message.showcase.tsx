import { useRef, useState } from "react";
import { SmileOutlined } from "../../src/icons.js";
import {
  Button,
  Divider,
  Flex,
  InputNumber,
  type MessageArgsProps,
  message,
  Space,
  Switch,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicMessage() {
  const [messageApi, contextHolder] = message.useMessage();
  return (
    <>
      {contextHolder}
      <Button
        onClick={() => messageApi.info("Your project changes have been saved.")}
        variant="primary"
      >
        Display message
      </Button>
    </>
  );
}

function MessageTypes() {
  const [messageApi, contextHolder] = message.useMessage();
  return (
    <>
      {contextHolder}
      <Space wrap>
        <Button onClick={() => messageApi.success("Project created successfully.")}>Success</Button>
        <Button onClick={() => messageApi.info("A new version is available.")}>Info</Button>
        <Button onClick={() => messageApi.warning("Review the project permissions.")}>
          Warning
        </Button>
        <Button onClick={() => messageApi.error("The project could not be archived.")}>
          Error
        </Button>
      </Space>
    </>
  );
}

function DurationMessage() {
  const [messageApi, contextHolder] = message.useMessage();
  return (
    <>
      {contextHolder}
      <Button
        onClick={() =>
          messageApi.open({
            content: "This message remains visible for five seconds.",
            duration: 5,
            type: "success",
          })
        }
      >
        Custom duration
      </Button>
    </>
  );
}

function LoadingMessage() {
  const [messageApi, contextHolder] = message.useMessage();
  const show = () => {
    const close = messageApi.loading({ content: "Saving project…", duration: 0 });
    window.setTimeout(close, 2200);
  };
  return (
    <>
      {contextHolder}
      <Button onClick={show}>Display loading message</Button>
    </>
  );
}

function UpdateMessage() {
  const [messageApi, contextHolder] = message.useMessage();
  const show = () => {
    messageApi.open({ content: "Saving project…", duration: 0, key: "save", type: "loading" });
    window.setTimeout(() => {
      messageApi.open({ content: "Project saved.", duration: 2, key: "save", type: "success" });
    }, 1200);
  };
  return (
    <>
      {contextHolder}
      <Button onClick={show} variant="primary">
        Update keyed message
      </Button>
    </>
  );
}

function SequenceMessage() {
  const [messageApi, contextHolder] = message.useMessage();
  const show = async () => {
    await messageApi.loading("Syncing project…", 1.2);
    await messageApi.success("Project synchronized.", 1.5);
    messageApi.info("Everyone now has the latest changes.", 2);
  };
  return (
    <>
      {contextHolder}
      <Button onClick={show}>Display sequential messages</Button>
    </>
  );
}

function StackMessage() {
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(3);
  const counter = useRef(0);
  const [messageApi, contextHolder] = message.useMessage({
    stack: enabled ? { threshold } : false,
  });
  const show = () => {
    counter.current += 1;
    messageApi.info({
      content: `Message ${counter.current}: A project activity update arrived.`,
      duration: 0,
    });
  };
  return (
    <>
      {contextHolder}
      <Flex align="flex-start" gap="middle" vertical>
        <Space wrap>
          <Typography.Text>Enabled</Typography.Text>
          <Switch aria-label="Enable message stack" checked={enabled} onChange={setEnabled} />
          <Typography.Text>Threshold</Typography.Text>
          <InputNumber<number>
            aria-label="Stack threshold"
            disabled={!enabled}
            max={6}
            min={1}
            onChange={(value) => setThreshold(value ?? 1)}
            value={threshold}
          />
        </Space>
        <Divider />
        <Space wrap>
          <Button onClick={show} variant="primary">
            Add message
          </Button>
          <Button onClick={() => messageApi.destroy()}>Destroy all</Button>
        </Space>
      </Flex>
    </>
  );
}

function CustomMessage() {
  const [messageApi, contextHolder] = message.useMessage();
  return (
    <>
      {contextHolder}
      <Space wrap>
        <Button
          onClick={() =>
            messageApi.open({
              content: "A friendly custom message.",
              icon: <SmileOutlined />,
            })
          }
        >
          Custom icon
        </Button>
        <Button
          onClick={() =>
            messageApi.open({
              content: "Click this message to dismiss it.",
              duration: 0,
              key: "clickable",
              onClick: () => messageApi.destroy("clickable"),
            })
          }
        >
          Clickable message
        </Button>
      </Space>
    </>
  );
}

function SemanticMessage() {
  const [messageApi, contextHolder] = message.useMessage();
  const styles: MessageArgsProps["styles"] = ({ props }) => ({
    icon: { color: props.type === "error" ? "#cf1322" : "#237804" },
    root: {
      background: props.type === "error" ? "#fff2f0" : "#f6ffed",
      border: `1px solid ${props.type === "error" ? "#ffccc7" : "#b7eb8f"}`,
    },
    title: { fontWeight: 500 },
  });
  return (
    <>
      {contextHolder}
      <Space wrap>
        <Button
          onClick={() =>
            messageApi.open({ content: "Object styles applied.", styles, type: "success" })
          }
        >
          Success style
        </Button>
        <Button
          onClick={() =>
            messageApi.open({ content: "Function styles applied.", styles, type: "error" })
          }
        >
          Error style
        </Button>
      </Space>
    </>
  );
}

export const messageShowcase = defineShowcase({
  id: "message",
  name: "Message",
  category: "Feedback",
  stage: "prod",
  description: "Displays lightweight global feedback in response to a user operation.",
  whenToUse: [
    "Use Message for brief success, information, warning, or error feedback after an operation.",
    "Use Alert when feedback must remain visible in the page and Notification when it needs richer content.",
    "Prefer message.useMessage so the message holder can consume the surrounding React context.",
  ],
  examples: [
    {
      id: "message-basic",
      name: "Hooks usage",
      description: "Render the context holder once, then call the scoped message API from events.",
      preview: BasicMessage,
      code: `const [messageApi, contextHolder] = message.useMessage();

return (
  <>
    {contextHolder}
    <Button onClick={() => messageApi.info("Project changes saved.")}>
      Display message
    </Button>
  </>
);`,
    },
    {
      id: "message-types",
      name: "Types",
      description: "Choose a semantic type that matches the operation result.",
      preview: MessageTypes,
      code: `messageApi.success("Project created successfully.");
messageApi.info("A new version is available.");
messageApi.warning("Review project permissions.");
messageApi.error("The project could not be archived.");`,
    },
    {
      id: "message-duration",
      name: "Custom duration",
      description: "Set duration in seconds, or use zero to keep a message open until destroyed.",
      preview: DurationMessage,
      code: `messageApi.open({
  type: "success",
  content: "This message remains visible for five seconds.",
  duration: 5,
});`,
    },
    {
      id: "message-loading",
      name: "Loading indicator",
      description: "Show progress for a short asynchronous operation and dismiss it manually.",
      preview: LoadingMessage,
      code: `const close = messageApi.loading({ content: "Saving project…", duration: 0 });
setTimeout(close, 2200);`,
    },
    {
      id: "message-update",
      name: "Update content",
      description: "Reuse a key to replace a message without adding another item to the queue.",
      preview: UpdateMessage,
      code: `messageApi.open({ key: "save", type: "loading", content: "Saving…", duration: 0 });
messageApi.open({ key: "save", type: "success", content: "Saved!", duration: 2 });`,
    },
    {
      id: "message-promise",
      name: "Promise interface",
      description: "Await message dismissal to present a sequence of lightweight updates.",
      preview: SequenceMessage,
      code: `await messageApi.loading("Syncing project…", 1.2);
await messageApi.success("Project synchronized.", 1.5);
messageApi.info("Everyone has the latest changes.");`,
    },
    {
      id: "message-stack",
      name: "Stack",
      description: "Collapse a busy queue into a compact stack after the configured threshold.",
      preview: StackMessage,
      code: `const [messageApi, contextHolder] = message.useMessage({
  stack: { threshold: 3 },
});`,
    },
    {
      id: "message-custom",
      name: "Custom icon and interaction",
      description: "Provide a specific icon or make a persistent message actionable.",
      preview: CustomMessage,
      code: `messageApi.open({
  content: "A friendly custom message.",
  icon: <SmileOutlined />,
});`,
    },
    {
      id: "message-semantic",
      name: "Semantic styling",
      description: "Style the public root, icon, and title regions through their documented API.",
      preview: SemanticMessage,
      code: `messageApi.open({
  type: "success",
  content: "Custom semantic styles.",
  styles: { root: { background: "#f6ffed" }, icon: { color: "#237804" } },
});`,
    },
  ],
  api: [
    {
      name: "message.useMessage",
      description: "Creates a scoped API and React context holder.",
      type: "(config?) => [api, contextHolder]",
    },
    {
      name: "open",
      description: "Opens or updates a message from a configuration object.",
      type: "(config) => MessageType",
    },
    {
      name: "success / info / warning / error / loading",
      description: "Opens a semantic message using content or configuration.",
      type: "(content, duration?, onClose?) => MessageType",
    },
    {
      name: "destroy",
      description: "Closes one keyed message or all messages.",
      type: "(key?) => void",
    },
    { name: "content", description: "Message content.", type: "ReactNode" },
    {
      name: "duration",
      description: "Seconds before dismissal; zero disables automatic dismissal.",
      type: "number",
      defaultValue: "3",
    },
    {
      name: "key",
      description: "Identifier used to update or close a message.",
      type: "string | number",
    },
    { name: "icon", description: "Custom icon replacing the semantic default.", type: "ReactNode" },
    {
      name: "pauseOnHover",
      description: "Pauses automatic dismissal while hovered.",
      type: "boolean",
      defaultValue: "true",
    },
    { name: "onClick", description: "Runs when the message is activated.", type: "function" },
    { name: "onClose", description: "Runs after the exit animation completes.", type: "function" },
    {
      name: "classNames",
      description: "Classes for the root, icon, and title regions.",
      type: "MessageClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for the root, icon, and title regions.",
      type: "MessageStyles | function",
    },
  ],
  accessibility: [
    "Messages use a polite live region; error messages use alert semantics for greater urgency.",
    "Clickable messages support Enter and Space, but a visible Button is preferable for important actions.",
    "Do not rely on message color alone—the icon and wording should communicate the result.",
  ],
});

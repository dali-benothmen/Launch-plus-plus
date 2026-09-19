import { useRef, useState } from "react";
import { SmileOutlined } from "../../src/icons.js";
import {
  Button,
  Divider,
  Flex,
  InputNumber,
  type NotificationArgsProps,
  type NotificationPlacement,
  notification,
  Space,
  Switch,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const description =
  "The project import has finished. Review the imported tasks before inviting your team.";

function BasicNotification() {
  const [api, contextHolder] = notification.useNotification();
  return (
    <>
      {contextHolder}
      <Button
        onClick={() =>
          api.open({
            description,
            title: "Project import complete",
          })
        }
        variant="primary"
      >
        Open notification
      </Button>
    </>
  );
}

function NotificationTypes() {
  const [api, contextHolder] = notification.useNotification();
  const open = (type: "error" | "info" | "success" | "warning") => {
    api[type]({ description, title: `${type[0]?.toUpperCase()}${type.slice(1)} notification` });
  };
  return (
    <>
      {contextHolder}
      <Space wrap>
        <Button onClick={() => open("success")}>Success</Button>
        <Button onClick={() => open("info")}>Info</Button>
        <Button onClick={() => open("warning")}>Warning</Button>
        <Button danger onClick={() => open("error")}>
          Error
        </Button>
      </Space>
    </>
  );
}

function PlacementNotification() {
  const [api, contextHolder] = notification.useNotification();
  const open = (placement: NotificationPlacement) => {
    api.info({ description, placement, title: `Notification ${placement}` });
  };
  return (
    <>
      {contextHolder}
      <Flex gap="small" vertical>
        <Space wrap>
          <Button onClick={() => open("topLeft")}>topLeft</Button>
          <Button onClick={() => open("top")}>top</Button>
          <Button onClick={() => open("topRight")}>topRight</Button>
        </Space>
        <Space wrap>
          <Button onClick={() => open("bottomLeft")}>bottomLeft</Button>
          <Button onClick={() => open("bottom")}>bottom</Button>
          <Button onClick={() => open("bottomRight")}>bottomRight</Button>
        </Space>
      </Flex>
    </>
  );
}

function UpdateNotification() {
  const [api, contextHolder] = notification.useNotification();
  const open = () => {
    api.open({
      description: "Preparing the project archive…",
      duration: 0,
      key: "archive",
      title: "Archiving project",
    });
    window.setTimeout(() => {
      api.success({
        description: "The archive is ready to download.",
        key: "archive",
        title: "Project archived",
      });
    }, 1200);
  };
  return (
    <>
      {contextHolder}
      <Button onClick={open}>Open and update</Button>
    </>
  );
}

function ProgressNotification() {
  const [api, contextHolder] = notification.useNotification();
  const open = (pauseOnHover: boolean) => {
    api.open({
      description: "This notification displays the time remaining before it closes.",
      duration: 6,
      pauseOnHover,
      showProgress: true,
      title: pauseOnHover ? "Pause on hover" : "Continuous progress",
    });
  };
  return (
    <>
      {contextHolder}
      <Space wrap>
        <Button onClick={() => open(true)}>Pause on hover</Button>
        <Button onClick={() => open(false)}>Do not pause</Button>
      </Space>
    </>
  );
}

function ActionsNotification() {
  const [api, contextHolder] = notification.useNotification();
  const key = "member-request";
  const open = () => {
    api.info({
      actions: (
        <Space>
          <Button onClick={() => api.destroy(key)} size="small" variant="text">
            Dismiss
          </Button>
          <Button onClick={() => api.destroy(key)} size="small" variant="primary">
            Review request
          </Button>
        </Space>
      ),
      description: "Alex requested access to the Launch++ workspace.",
      duration: false,
      key,
      title: "New membership request",
    });
  };
  return (
    <>
      {contextHolder}
      <Button onClick={open}>Open persistent notification</Button>
    </>
  );
}

function StackNotification() {
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(3);
  const counter = useRef(0);
  const [api, contextHolder] = notification.useNotification({
    stack: enabled ? { threshold } : false,
  });
  const open = () => {
    counter.current += 1;
    api.open({
      description: `Activity update ${counter.current} is waiting for review.`,
      duration: false,
      title: `Project activity ${counter.current}`,
    });
  };
  return (
    <>
      {contextHolder}
      <Flex align="flex-start" gap="middle" vertical>
        <Space wrap>
          <Typography.Text>Enabled</Typography.Text>
          <Switch aria-label="Enable notification stack" checked={enabled} onChange={setEnabled} />
          <Typography.Text>Threshold</Typography.Text>
          <InputNumber<number>
            aria-label="Notification stack threshold"
            disabled={!enabled}
            max={6}
            min={1}
            onChange={(value) => setThreshold(value ?? 1)}
            value={threshold}
          />
        </Space>
        <Divider />
        <Space wrap>
          <Button onClick={open} variant="primary">
            Add notification
          </Button>
          <Button onClick={() => api.destroy()}>Destroy all</Button>
        </Space>
      </Flex>
    </>
  );
}

function CustomNotification() {
  const [api, contextHolder] = notification.useNotification();
  const styles: NotificationArgsProps["styles"] = ({ props }) => ({
    icon: { color: props.type === "error" ? "#cf1322" : "#1668dc" },
    root: {
      background: props.type === "error" ? "#fff2f0" : "#e6f4ff",
      border: `1px solid ${props.type === "error" ? "#ffccc7" : "#91caff"}`,
    },
  });
  return (
    <>
      {contextHolder}
      <Space wrap>
        <Button
          onClick={() =>
            api.open({
              description: "A custom icon can reinforce the notification context.",
              icon: <SmileOutlined />,
              title: "Custom icon",
            })
          }
        >
          Custom icon
        </Button>
        <Button
          onClick={() =>
            api.info({
              description: "Semantic slots allow controlled visual customization.",
              styles,
              title: "Semantic styling",
            })
          }
        >
          Semantic styles
        </Button>
      </Space>
    </>
  );
}

export const notificationShowcase = defineShowcase({
  id: "notification",
  name: "Notification",
  category: "Feedback",
  stage: "prod",
  description: "Displays rich global feedback with a title, description, and optional actions.",
  usage: 'import { notification } from "@launchpp/ui";',
  whenToUse: [
    "Use Notification for asynchronous updates or pushed information that needs more detail than Message can provide.",
    "Add actions only when the user can respond directly without opening a complex workflow.",
    "Use the hook API so notification content can consume the surrounding React context.",
  ],
  examples: [
    {
      id: "notification-basic",
      name: "Hooks usage",
      description:
        "Render the context holder once and call the scoped notification API from events.",
      preview: BasicNotification,
      code: `const [api, contextHolder] = notification.useNotification();

return (
  <>
    {contextHolder}
    <Button onClick={() => api.open({
      title: "Project import complete",
      description: "Review the imported tasks before inviting your team.",
    })}>
      Open notification
    </Button>
  </>
);`,
    },
    {
      id: "notification-types",
      name: "Notification with icon",
      description: "Semantic methods add an icon and color appropriate to the feedback type.",
      preview: NotificationTypes,
      code: `api.success({ title: "Import complete", description });
api.info({ title: "Update available", description });
api.warning({ title: "Review permissions", description });
api.error({ title: "Import failed", description });`,
    },
    {
      id: "notification-placement",
      name: "Placement",
      description:
        "Place notification queues at any corner or centered along the top or bottom edge.",
      preview: PlacementNotification,
      code: `api.info({
  title: "Notification bottomLeft",
  description,
  placement: "bottomLeft",
});`,
    },
    {
      id: "notification-update",
      name: "Update content",
      description: "Reuse a key to update a notification without creating another queue item.",
      preview: UpdateNotification,
      code: `api.open({ key: "archive", title: "Archiving project", description, duration: 0 });
api.success({ key: "archive", title: "Project archived", description: "Ready." });`,
    },
    {
      id: "notification-progress",
      name: "Progress and hover pause",
      description:
        "Show the remaining duration and optionally pause both timer and progress on hover.",
      preview: ProgressNotification,
      code: `api.open({
  title: "Import complete",
  description,
  duration: 6,
  showProgress: true,
  pauseOnHover: true,
});`,
    },
    {
      id: "notification-actions",
      name: "Actions and persistent duration",
      description:
        "Use duration false for a notification that must remain until explicitly dismissed.",
      preview: ActionsNotification,
      code: `api.info({
  key: "member-request",
  title: "New membership request",
  description,
  duration: false,
  actions: <Button onClick={() => api.destroy("member-request")}>Review</Button>,
});`,
    },
    {
      id: "notification-stack",
      name: "Stack",
      description: "Collapse busy queues after a configurable threshold to protect the workspace.",
      preview: StackNotification,
      code: `const [api, contextHolder] = notification.useNotification({
  stack: { threshold: 3 },
});`,
    },
    {
      id: "notification-custom",
      name: "Custom icon and semantic styling",
      description: "Customize documented regions without targeting private DOM structure.",
      preview: CustomNotification,
      code: `api.open({ title: "Custom icon", description, icon: <SmileOutlined /> });
api.info({ title: "Styled", description, styles: { root: { background: "#e6f4ff" } } });`,
    },
  ],
  api: [
    {
      name: "notification.useNotification",
      description: "Creates a scoped API and context holder.",
      type: "(config?) => [api, contextHolder]",
    },
    { name: "open", description: "Opens or updates a notification.", type: "(config) => void" },
    {
      name: "success / info / warning / error",
      description: "Opens a semantic notification with a matching icon.",
      type: "(config) => void",
    },
    {
      name: "destroy",
      description: "Closes one keyed notification or all notifications.",
      type: "(key?) => void",
    },
    { name: "title", description: "Primary notification heading.", type: "ReactNode" },
    { name: "description", description: "Detailed notification content.", type: "ReactNode" },
    {
      name: "actions",
      description: "Optional action group below the description.",
      type: "ReactNode",
    },
    {
      name: "placement",
      description: "Viewport position for the notification queue.",
      type: "NotificationPlacement",
      defaultValue: "topRight",
    },
    {
      name: "duration",
      description: "Seconds before closing; zero or false keeps it open.",
      type: "number | false",
      defaultValue: "4.5",
    },
    {
      name: "showProgress",
      description: "Displays remaining auto-close time.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "pauseOnHover",
      description: "Pauses auto-close and progress while hovered.",
      type: "boolean",
      defaultValue: "true",
    },
    {
      name: "key",
      description: "Identifier used to update or close a notification.",
      type: "string | number",
    },
    {
      name: "closable",
      description: "Controls or configures the close button.",
      type: "boolean | NotificationClosableConfig",
      defaultValue: "true",
    },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "NotificationClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "NotificationStyles | function",
    },
  ],
  accessibility: [
    "Notifications default to alert semantics; use role status for non-urgent background updates.",
    "Do not auto-dismiss content before users have enough time to read and act on it.",
    "Keep action labels explicit and preserve a separate close control when dismissal is allowed.",
  ],
});

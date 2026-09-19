import { useState } from "react";
import { SmileOutlined } from "../../src/icons.js";
import {
  Alert,
  type AlertProps,
  Button,
  Flex,
  Space,
  Switch,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicAlert() {
  return <Alert title="Success Text" type="success" />;
}

function FilledAlert() {
  return <Alert title="Info Text" type="info" variant="filled" />;
}

function DescriptionAlerts() {
  return (
    <Flex gap="middle" vertical>
      <Alert
        description="Success description with additional information about the completed action."
        title="Success Text"
        type="success"
      />
      <Alert
        description="Information description with supporting context for the user."
        title="Info Text"
        type="info"
      />
      <Alert
        description="Warning description explaining what should be reviewed before continuing."
        title="Warning Text"
        type="warning"
      />
      <Alert
        description="Error description explaining why the operation could not be completed."
        title="Error Text"
        type="error"
      />
    </Flex>
  );
}

function AlertTypes() {
  return (
    <Flex gap="middle" vertical>
      <Alert title="Success Text" type="success" />
      <Alert title="Info Text" type="info" />
      <Alert title="Warning Text" type="warning" />
      <Alert title="Error Text" type="error" />
    </Flex>
  );
}

function IconAlerts() {
  return (
    <Flex gap="middle" vertical>
      <Alert showIcon title="Success Tips" type="success" />
      <Alert showIcon title="Informational Notes" type="info" />
      <Alert closable showIcon title="Warning" type="warning" />
      <Alert showIcon title="Error" type="error" />
      <Alert
        description="Detailed description and advice about the successful action."
        showIcon
        title="Success Tips"
        type="success"
      />
      <Alert
        description="Use a custom icon when the default status symbol is not specific enough."
        icon={<SmileOutlined />}
        showIcon
        title="Custom icon"
        type="info"
      />
    </Flex>
  );
}

function BannerAlerts() {
  return (
    <Flex gap="middle" vertical>
      <Alert banner title="Warning text" />
      <Alert banner closable title="A longer warning banner that can be dismissed." />
      <Alert banner showIcon={false} title="Warning text without icon" />
      <Alert banner title="Error text" type="error" />
    </Flex>
  );
}

function ClosableAlert() {
  const [visible, setVisible] = useState(true);
  return (
    <Flex align="flex-start" gap="small" vertical>
      {visible ? (
        <Alert
          closable={{ afterClose: () => setVisible(false), "aria-label": "Close success alert" }}
          showIcon
          title="Alert Message Text"
          type="success"
        />
      ) : null}
      <Typography.Text type="secondary">Close the alert to see the smooth unmount.</Typography.Text>
      <Space>
        <Switch
          aria-label="Alert visibility"
          checked={visible}
          disabled={visible}
          onChange={setVisible}
        />
        <Typography.Text>Visible</Typography.Text>
      </Space>
    </Flex>
  );
}

function ActionAlerts() {
  return (
    <Flex gap="middle" vertical>
      <Alert
        action={
          <Button size="small" variant="text">
            Undo
          </Button>
        }
        closable
        showIcon
        title="Success Tips"
        type="success"
      />
      <Alert
        action={
          <Button danger size="small">
            Details
          </Button>
        }
        description="The project could not be archived because one task is still active."
        showIcon
        title="Archive failed"
        type="error"
      />
      <Alert
        action={
          <Flex gap="small" vertical>
            <Button block size="small" variant="primary">
              Accept
            </Button>
            <Button block danger ghost size="small">
              Decline
            </Button>
          </Flex>
        }
        closable
        description="A teammate invited you to collaborate on the Launch++ project."
        showIcon
        title="Project invitation"
        type="info"
      />
    </Flex>
  );
}

function SemanticAlerts() {
  const functionStyles: AlertProps["styles"] = ({ props }) =>
    props.type === "success"
      ? {
          icon: { color: "#52c41a" },
          root: { background: "rgba(82, 196, 26, 0.1)", borderColor: "#b7eb8f" },
        }
      : {};
  return (
    <Flex gap="middle" vertical>
      <Alert
        action={<Button size="small">Action</Button>}
        classNames={{ root: "showcase-alert-semantic" }}
        showIcon
        styles={{ icon: { fontSize: 18 }, section: { fontWeight: 500 } }}
        title="Object styles"
        type="info"
      />
      <Alert showIcon styles={functionStyles} title="Function styles" type="success" />
    </Flex>
  );
}

function BrokenContent({
  crash,
  onCrash,
}: {
  readonly crash: boolean;
  readonly onCrash: () => void;
}) {
  if (crash) throw new Error("An uncaught project error");
  return (
    <Button danger onClick={onCrash}>
      Throw an error
    </Button>
  );
}

function ErrorBoundaryAlert() {
  const [crash, setCrash] = useState(false);
  const [version, setVersion] = useState(0);
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Alert.ErrorBoundary
        description="The component failed to render. Reset it and try the action again."
        key={version}
        title="Something went wrong"
      >
        <BrokenContent crash={crash} onCrash={() => setCrash(true)} />
      </Alert.ErrorBoundary>
      {crash ? (
        <Button
          onClick={() => {
            setCrash(false);
            setVersion((current) => current + 1);
          }}
          size="small"
        >
          Reset example
        </Button>
      ) : null}
    </Flex>
  );
}

function LongTitleAlert() {
  const firstLineStyles: AlertProps["styles"] = {
    actions: { marginBlockStart: 0 },
    close: { marginBlockStart: 5 },
    icon: { marginBlockStart: 4 },
    root: { alignItems: "flex-start" },
  };
  return (
    <Flex className="showcase-alert-narrow" gap="middle" vertical>
      <Alert
        closable
        showIcon
        styles={firstLineStyles}
        title="Long alert titles wrap to multiple lines when the available container becomes narrow."
        type="info"
      />
      <Alert
        action={
          <Button size="small" variant="text">
            Action
          </Button>
        }
        closable
        showIcon
        styles={firstLineStyles}
        title="Long alert titles can align their icon and actions with the first line."
        type="success"
      />
    </Flex>
  );
}

export const alertShowcase = defineShowcase({
  id: "alert",
  name: "Alert",
  category: "Feedback",
  stage: "prod",
  description: "Displays persistent feedback that requires the user's attention.",
  whenToUse: [
    "Use Alert for important feedback that should remain visible in the current context.",
    "Use a closable alert when users may safely dismiss the message after reading it.",
    "Use an error alert only for failures that require immediate attention or recovery.",
  ],
  examples: [
    {
      id: "alert-basic",
      name: "Basic",
      description: "The simplest alert displays a short message without an icon.",
      preview: BasicAlert,
      code: `<Alert title="Success Text" type="success" />`,
    },
    {
      id: "alert-filled",
      name: "Filled",
      description: "The filled variant removes the visible border.",
      preview: FilledAlert,
      code: `<Alert title="Info Text" type="info" variant="filled" />`,
    },
    {
      id: "alert-description",
      name: "Description",
      description: "Add supporting copy when the message needs more explanation.",
      preview: DescriptionAlerts,
      code: `<Alert
  title="Success Text"
  description="Additional information about the completed action."
  type="success"
/>`,
    },
    {
      id: "alert-types",
      name: "Types",
      description: "Use success, info, warning, or error according to the feedback severity.",
      preview: AlertTypes,
      code: `<Alert title="Success Text" type="success" />
<Alert title="Info Text" type="info" />
<Alert title="Warning Text" type="warning" />
<Alert title="Error Text" type="error" />`,
    },
    {
      id: "alert-icons",
      name: "Icons",
      description: "Show the matching status icon or provide a custom icon.",
      preview: IconAlerts,
      code: `<Alert showIcon title="Success Tips" type="success" />
<Alert showIcon icon={<SmileOutlined />} title="Custom icon" type="info" />`,
    },
    {
      id: "alert-banner",
      name: "Banner",
      description: "Banner alerts are flush surfaces and show a warning icon by default.",
      preview: BannerAlerts,
      code: `<Alert banner title="Warning text" />
<Alert banner closable title="Dismissible warning" />
<Alert banner showIcon={false} title="Warning without icon" />`,
    },
    {
      id: "alert-closable",
      name: "Smoothly unmount",
      description: "Closable alerts animate out before the afterClose callback runs.",
      preview: ClosableAlert,
      code: `<Alert
  closable={{
    onClose: handleClose,
    afterClose: () => setVisible(false),
    "aria-label": "Close success alert",
  }}
  showIcon
  title="Alert Message Text"
  type="success"
/>`,
    },
    {
      id: "alert-actions",
      name: "Custom actions",
      description: "Place one concise action or a compact action group beside the message.",
      preview: ActionAlerts,
      code: `<Alert
  title="Success Tips"
  type="success"
  showIcon
  closable
  action={<Button size="small" variant="text">Undo</Button>}
/>`,
    },
    {
      id: "alert-semantic",
      name: "Semantic styling",
      description: "Customize the public root, icon, section, text, action, and close parts.",
      preview: SemanticAlerts,
      code: `<Alert
  classNames={{ root: "custom-alert" }}
  styles={{ icon: { fontSize: 18 }, section: { fontWeight: 500 } }}
  showIcon
  title="Object styles"
  type="info"
/>`,
    },
    {
      id: "alert-title-alignment",
      name: "Wrapped title alignment",
      description: "Semantic styles can align controls with the first line of a wrapping title.",
      preview: LongTitleAlert,
      code: `<Alert
  showIcon
  closable
  title={longTitle}
  styles={{
    root: { alignItems: "flex-start" },
    icon: { marginBlockStart: 4 },
    close: { marginBlockStart: 5 },
  }}
/>`,
    },
    {
      id: "alert-error-boundary",
      name: "Error boundary",
      description: "Render an error alert when a descendant throws during rendering.",
      preview: ErrorBoundaryAlert,
      code: `<Alert.ErrorBoundary
  title="Something went wrong"
  description="The component failed to render."
>
  <ProjectPanel />
</Alert.ErrorBoundary>`,
    },
  ],
  api: [
    { name: "title", description: "Primary alert message.", type: "ReactNode" },
    { name: "description", description: "Additional supporting content.", type: "ReactNode" },
    {
      name: "type",
      description: "Semantic feedback type.",
      type: '"success" | "info" | "warning" | "error"',
      defaultValue: '"info"',
    },
    {
      name: "variant",
      description: "Bordered or borderless presentation.",
      type: '"outlined" | "filled"',
      defaultValue: '"outlined"',
    },
    {
      name: "showIcon",
      description: "Displays a status or custom icon.",
      type: "boolean",
      defaultValue: "false",
    },
    { name: "icon", description: "Custom icon used when showIcon is enabled.", type: "ReactNode" },
    {
      name: "action",
      description: "Action content displayed beside the message.",
      type: "ReactNode",
    },
    {
      name: "banner",
      description: "Displays a flush banner with a warning icon by default.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "closable",
      description: "Enables animated dismissal and optional callbacks.",
      type: "boolean | AlertClosableConfig",
      defaultValue: "false",
    },
    {
      name: "classNames",
      description: "Classes for the public semantic parts.",
      type: "AlertClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for the public semantic parts.",
      type: "AlertStyles | function",
    },
    { name: "status", description: "Deprecated compatibility alias for type.", type: "AlertType" },
  ],
  accessibility: [
    "Error alerts use the alert role; other types use status so announcements match urgency.",
    "Closable alerts provide a default accessible label that can be customized through closable.",
    "Actions must remain concise, keyboard-accessible, and understandable without relying on color.",
  ],
});

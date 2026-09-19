import { useEffect, useState } from "react";
import { LoadingOutlined } from "../../src/icons.js";
import {
  Alert,
  Button,
  Flex,
  Space,
  Spin,
  type SpinProps,
  Switch,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicSpin() {
  return <Spin />;
}

function SpinSizes() {
  return (
    <Space size="large">
      <Spin size="small" />
      <Spin />
      <Spin size="large" />
    </Space>
  );
}

function EmbeddedSpin() {
  const [loading, setLoading] = useState(true);
  return (
    <Flex gap="medium" vertical>
      <Space>
        <Typography.Text>Loading</Typography.Text>
        <Switch checked={loading} onChange={setLoading} />
      </Space>
      <Spin description="Loading project" spinning={loading}>
        <Alert
          description="Members, activity, and the latest project details are ready here."
          showIcon
          title="Launch++ workspace"
          type="info"
        />
      </Spin>
    </Flex>
  );
}

function DelayedSpin() {
  const [loading, setLoading] = useState(false);
  return (
    <Flex gap="medium" vertical>
      <Space>
        <Typography.Text>Loading after 500 ms</Typography.Text>
        <Switch checked={loading} onChange={setLoading} />
      </Space>
      <Spin delay={500} spinning={loading}>
        <Alert
          description="Short operations finish without flashing a loading indicator."
          title="Delayed feedback"
        />
      </Spin>
    </Flex>
  );
}

function ProgressSpin() {
  const [automatic, setAutomatic] = useState(true);
  return (
    <Flex gap="large" vertical>
      <Space align="center" size="large" wrap>
        <Spin description="25%" percent={25} size="small" />
        <Spin description="60%" percent={60} />
        <Spin description="85%" percent={85} size="large" />
      </Space>
      <Space>
        <Switch checked={automatic} onChange={setAutomatic} />
        <Typography.Text>Automatic progress</Typography.Text>
        <Spin percent="auto" spinning={automatic} />
      </Space>
    </Flex>
  );
}

function FullscreenSpin() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), 1800);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary">
        Show fullscreen loader
      </Button>
      <Spin description="Preparing workspace" fullscreen percent="auto" spinning={open} />
    </>
  );
}

function CustomSpin() {
  return (
    <Space align="center" size="large" wrap>
      <Spin description="Syncing" indicator={<LoadingOutlined spin />} />
      <Spin
        description="Publishing"
        indicator={<LoadingOutlined spin style={{ color: "var(--launch-ui-success)" }} />}
        size="large"
      />
    </Space>
  );
}

function SemanticSpin() {
  const styles: SpinProps["styles"] = {
    description: { color: "var(--launch-ui-text)" },
    indicator: { color: "var(--launch-ui-success)" },
    root: {
      border: "1px solid var(--launch-ui-border-soft)",
      borderRadius: 8,
      padding: 16,
    },
  };
  return (
    <Spin
      classNames={{ root: "project-sync-spinner" }}
      description="Project synchronized"
      styles={styles}
    />
  );
}

export const spinShowcase = defineShowcase({
  id: "spin",
  name: "Spin",
  category: "Feedback",
  stage: "prod",
  description: "Communicates the loading state of an action, content block, or entire page.",
  usage: 'import { Spin } from "@launchpp/ui";',
  whenToUse: [
    "Use Spin for short operations and repeated updates where existing content should remain in place.",
    "Use Skeleton instead when the structure of first-load content is known and replacing it improves perceived speed.",
    "Add a delay when an operation commonly completes quickly so the interface does not flash.",
  ],
  examples: [
    {
      id: "spin-basic",
      name: "Basic",
      description: "The default indicator represents an indeterminate loading state.",
      preview: BasicSpin,
      code: `<Spin />`,
    },
    {
      id: "spin-sizes",
      name: "Sizes",
      description: "Choose a size that matches the surrounding control or content density.",
      preview: SpinSizes,
      code: `<Spin size="small" />
<Spin />
<Spin size="large" />`,
    },
    {
      id: "spin-embedded",
      name: "Embedded",
      description: "Wrap content to dim it and prevent interaction while an update is running.",
      preview: EmbeddedSpin,
      code: `<Spin description="Loading project" spinning={loading}>
  <ProjectSummary />
</Spin>`,
    },
    {
      id: "spin-delay",
      name: "Delay",
      description: "Delay the indicator to avoid flashing during brief operations.",
      preview: DelayedSpin,
      code: `<Spin delay={500} spinning={loading}>
  <ProjectSummary />
</Spin>`,
    },
    {
      id: "spin-progress",
      name: "Progress",
      description: "Show known progress as a number or estimate it automatically for ongoing work.",
      preview: ProgressSpin,
      code: `<Spin percent={60} />
<Spin percent="auto" />`,
    },
    {
      id: "spin-fullscreen",
      name: "Fullscreen",
      description: "Portal the same loader into a page-level backdrop for blocking transitions.",
      preview: FullscreenSpin,
      code: `<Spin
  description="Preparing workspace"
  fullscreen
  percent="auto"
  spinning={loading}
/>`,
    },
    {
      id: "spin-custom",
      name: "Custom indicator",
      description: "Replace the default dots with an icon or another compact visual.",
      preview: CustomSpin,
      code: `<Spin
  description="Syncing"
  indicator={<LoadingOutlined spin />}
/>`,
    },
    {
      id: "spin-semantic",
      name: "Semantic styling",
      description: "Customize documented regions without targeting private DOM structure.",
      preview: SemanticSpin,
      code: `<Spin
  classNames={{ root: "project-sync-spinner" }}
  description="Project synchronized"
  styles={{
    indicator: { color: "var(--launch-ui-success)" },
    description: { color: "var(--launch-ui-text)" },
  }}
/>`,
    },
  ],
  api: [
    {
      name: "spinning",
      description: "Controls whether the loading indicator is visible.",
      type: "boolean",
      defaultValue: "true",
    },
    {
      name: "size",
      description: "Sets the indicator size.",
      type: '"small" | "medium" | "large"',
      defaultValue: '"medium"',
    },
    {
      name: "delay",
      description: "Waits this many milliseconds before showing the indicator.",
      type: "number",
      defaultValue: "0",
    },
    {
      name: "description",
      description: "Adds concise loading context below the indicator.",
      type: "ReactNode",
    },
    {
      name: "indicator",
      description: "Replaces the default loading indicator.",
      type: "ReactNode",
    },
    {
      name: "percent",
      description: "Displays determinate or automatically estimated progress.",
      type: 'number | "auto"',
    },
    {
      name: "fullscreen",
      description: "Displays the loader in a fixed page-level backdrop.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "SpinClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "SpinStyles | function",
    },
  ],
  accessibility: [
    "The root reports its busy state and announces description changes politely.",
    "Use a short description when the surrounding context does not explain what is loading.",
    "Do not leave a fullscreen loader active without a timeout, completion path, or error state.",
    "Motion is minimized when the operating system requests reduced motion.",
  ],
});

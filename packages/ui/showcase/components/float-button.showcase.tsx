import {
  CommentOutlined,
  FileTextOutlined,
  QuestionOutlined,
  ReloadOutlined,
  VerticalAlignTopOutlined,
} from "@ant-design/icons";
import { useCallback, useRef } from "react";
import { FloatButton } from "../../src/components/float-button/index.js";
import { defineShowcase } from "../showcase-definition.js";

function FloatButtonShapes() {
  return (
    <div className="showcase-float-surface">
      <FloatButton
        aria-label="Help"
        icon={<QuestionOutlined />}
        shape="circle"
        style={{ bottom: 28, insetInlineEnd: 164, position: "absolute" }}
        tooltip="Help"
      />
      <FloatButton
        aria-label="Documents"
        icon={<FileTextOutlined />}
        shape="square"
        style={{ bottom: 28, insetInlineEnd: 96, position: "absolute" }}
        tooltip="Documents"
        type="primary"
      />
      <FloatButton
        aria-label="Unread comments"
        badge={{ count: 12 }}
        icon={<CommentOutlined />}
        style={{ bottom: 28, insetInlineEnd: 28, position: "absolute" }}
        tooltip="Unread comments"
      />
    </div>
  );
}

function FloatButtonGroups() {
  return (
    <div className="showcase-float-surface is-tall">
      <FloatButton.Group
        placement="top"
        shape="square"
        style={{ bottom: 28, insetInlineEnd: 124, position: "absolute" }}
      >
        <FloatButton aria-label="Help" icon={<QuestionOutlined />} tooltip="Help" />
        <FloatButton aria-label="Documents" icon={<FileTextOutlined />} tooltip="Documents" />
        <FloatButton aria-label="Refresh" icon={<ReloadOutlined />} tooltip="Refresh" />
        <FloatButton
          aria-label="Back to top"
          icon={<VerticalAlignTopOutlined />}
          tooltip="Back to top"
        />
      </FloatButton.Group>

      <FloatButton.Group
        icon={<CommentOutlined />}
        placement="top"
        style={{ bottom: 28, insetInlineEnd: 28, position: "absolute" }}
        trigger="click"
        triggerLabel="Open support actions"
      >
        <FloatButton aria-label="Help" icon={<QuestionOutlined />} tooltip="Help" />
        <FloatButton aria-label="Documents" icon={<FileTextOutlined />} tooltip="Documents" />
        <FloatButton
          aria-label="Contact support"
          icon={<CommentOutlined />}
          tooltip="Contact support"
        />
      </FloatButton.Group>
    </div>
  );
}

function BackTopExample() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const getTarget = useCallback(() => scrollRef.current ?? window, []);

  return (
    <div className="showcase-float-surface is-tall">
      <div className="showcase-float-scroll" ref={scrollRef}>
        <div className="showcase-float-scroll-content">
          <strong>Scroll this panel</strong>
          <span>The back-to-top button appears after 80 pixels.</span>
          <span>Keep scrolling to try the interaction.</span>
        </div>
      </div>
      <FloatButton.BackTop
        style={{ bottom: 28, insetInlineEnd: 28, position: "absolute" }}
        target={getTarget}
        visibilityHeight={80}
      />
    </div>
  );
}

export const floatButtonShowcase = defineShowcase({
  id: "float-button",
  name: "Float button",
  category: "General",
  stage: "dev",
  description: "Keeps a global or frequently used action available above the page content.",
  whenToUse: [
    "Use a float button for an important global action that should remain available while scrolling.",
    "Use a group when several closely related floating actions share one location.",
  ],
  examples: [
    {
      id: "float-button-shapes",
      name: "Shapes, type, tooltip, and badge",
      description: "Floating buttons support circle and square shapes with optional supporting UI.",
      preview: FloatButtonShapes,
      code: `<FloatButton\n  shape="circle"\n  icon={<QuestionOutlined />}\n  tooltip="Help"\n/>\n<FloatButton\n  shape="square"\n  type="primary"\n  icon={<FileTextOutlined />}\n/>\n<FloatButton badge={{ count: 12 }} icon={<CommentOutlined />} />`,
    },
    {
      id: "float-button-groups",
      name: "Static and triggered groups",
      description: "The menu trigger opens upward by default. Click the round trigger to try it.",
      preview: FloatButtonGroups,
      code: `<FloatButton.Group shape="square">\n  <FloatButton icon={<QuestionOutlined />} />\n  <FloatButton icon={<FileTextOutlined />} />\n</FloatButton.Group>\n\n<FloatButton.Group trigger="click" icon={<CommentOutlined />}>\n  <FloatButton icon={<QuestionOutlined />} />\n  <FloatButton icon={<FileTextOutlined />} />\n</FloatButton.Group>`,
    },
    {
      id: "float-button-back-top",
      name: "Back to top",
      description: "BackTop watches either the window or a provided scroll container.",
      preview: BackTopExample,
      code: `<FloatButton.BackTop\n  target={() => scrollContainer}\n  visibilityHeight={80}\n/>`,
    },
  ],
  api: [
    {
      name: "shape",
      type: '"circle" | "square"',
      defaultValue: '"circle"',
      description: "Controls the outer shape of the floating button.",
    },
    {
      name: "type",
      type: '"default" | "primary"',
      defaultValue: '"default"',
      description: "Sets the action emphasis.",
    },
    {
      name: "tooltip",
      type: "ReactNode",
      description: "Shows supporting text on hover or keyboard focus.",
    },
    {
      name: "badge",
      type: "{ count?, dot?, overflowCount? }",
      description: "Displays a count or notification dot.",
    },
    {
      name: "Group.trigger",
      type: '"click" | "hover"',
      description: "Turns a static group into an expandable action menu.",
    },
    {
      name: "Group.placement",
      type: '"top" | "right" | "bottom" | "left"',
      defaultValue: '"top"',
      description: "Sets the direction in which grouped actions expand.",
    },
  ],
  accessibility: [
    "Provide an aria-label when an icon is the only visible content.",
    "Keep the primary floating action consistent across related pages.",
    "Do not use floating buttons for actions that belong to a specific form field or card.",
  ],
});

import { useState } from "react";
import { Button, Flex, Popover, type PopoverProps, Space } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function PopoverContent() {
  return (
    <div className="showcase-popover-copy">
      <p>Content</p>
      <p>Content</p>
    </div>
  );
}

function BasicPopover() {
  return (
    <Popover content={<PopoverContent />} title="Title">
      <Button variant="primary">Hover me</Button>
    </Popover>
  );
}

function PlacementPopover({
  children,
  placement,
}: {
  readonly children: string;
  readonly placement: NonNullable<PopoverProps["placement"]>;
}) {
  return (
    <Popover content={<PopoverContent />} placement={placement} title="Title">
      <Button className="showcase-popover-placement-button">{children}</Button>
    </Popover>
  );
}

function PopoverPlacements() {
  return (
    <Flex align="center" className="showcase-popover-placements" gap={4} vertical>
      <Flex gap={4}>
        <PlacementPopover placement="topLeft">TL</PlacementPopover>
        <PlacementPopover placement="top">Top</PlacementPopover>
        <PlacementPopover placement="topRight">TR</PlacementPopover>
      </Flex>
      <Flex className="showcase-popover-placement-middle" justify="space-between">
        <Flex gap={4} vertical>
          <PlacementPopover placement="leftTop">LT</PlacementPopover>
          <PlacementPopover placement="left">Left</PlacementPopover>
          <PlacementPopover placement="leftBottom">LB</PlacementPopover>
        </Flex>
        <Flex gap={4} vertical>
          <PlacementPopover placement="rightTop">RT</PlacementPopover>
          <PlacementPopover placement="right">Right</PlacementPopover>
          <PlacementPopover placement="rightBottom">RB</PlacementPopover>
        </Flex>
      </Flex>
      <Flex gap={4}>
        <PlacementPopover placement="bottomLeft">BL</PlacementPopover>
        <PlacementPopover placement="bottom">Bottom</PlacementPopover>
        <PlacementPopover placement="bottomRight">BR</PlacementPopover>
      </Flex>
    </Flex>
  );
}

function TriggerPopovers() {
  return (
    <Space wrap>
      <Popover content={<PopoverContent />} title="Title" trigger="hover">
        <Button>Hover me</Button>
      </Popover>
      <Popover content={<PopoverContent />} title="Title" trigger="focus">
        <Button>Focus me</Button>
      </Popover>
      <Popover content={<PopoverContent />} title="Title" trigger="click">
        <Button>Click me</Button>
      </Popover>
      <Popover content="Opened by hover or click" trigger={["hover", "click"]}>
        <Button>Hover or click</Button>
      </Popover>
    </Space>
  );
}

type ArrowMode = "center" | "hidden" | "visible";

function ArrowPopover() {
  const [mode, setMode] = useState<ArrowMode>("visible");
  const arrow = mode === "hidden" ? false : mode === "center" ? { pointAtCenter: true } : true;
  return (
    <Flex gap="large" vertical>
      <Space.Compact>
        <Button
          onClick={() => setMode("visible")}
          variant={mode === "visible" ? "primary" : "default"}
        >
          Show
        </Button>
        <Button
          onClick={() => setMode("hidden")}
          variant={mode === "hidden" ? "primary" : "default"}
        >
          Hide
        </Button>
        <Button
          onClick={() => setMode("center")}
          variant={mode === "center" ? "primary" : "default"}
        >
          Center
        </Button>
      </Space.Compact>
      <Space wrap>
        <Popover arrow={arrow} content={<PopoverContent />} placement="topLeft" title="Title">
          <Button>Top left</Button>
        </Popover>
        <Popover arrow={arrow} content={<PopoverContent />} placement="top" title="Title">
          <Button>Top</Button>
        </Popover>
        <Popover arrow={arrow} content={<PopoverContent />} placement="topRight" title="Title">
          <Button>Top right</Button>
        </Popover>
      </Space>
    </Flex>
  );
}

function ControlledPopover() {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      content={
        <Button onClick={() => setOpen(false)} size="small" variant="link">
          Close
        </Button>
      }
      onOpenChange={setOpen}
      open={open}
      title="Controlled popover"
      trigger="click"
    >
      <Button variant="primary">Click me</Button>
    </Popover>
  );
}

function SemanticPopover() {
  const styles: PopoverProps["styles"] = ({ props }) => ({
    container: {
      background: props.arrow === false ? "#e6f4ff" : "#fff",
      border: "1px solid #91caff",
    },
    content: { color: "#0958d9" },
  });
  return (
    <Space wrap>
      <Popover
        arrow={false}
        classNames={{ container: "showcase-popover-semantic" }}
        content="Object text"
        styles={{ container: { background: "#f5f5f5" }, content: { color: "#262626" } }}
      >
        <Button>Object style</Button>
      </Popover>
      <Popover arrow={false} content="Function text" styles={styles}>
        <Button variant="primary">Function style</Button>
      </Popover>
    </Space>
  );
}

export const popoverShowcase = defineShowcase({
  id: "popover",
  name: "Popover",
  category: "Data display",
  stage: "prod",
  description: "Displays a floating card with supporting information or lightweight actions.",
  whenToUse: [
    "Use Popover when a trigger needs richer information or actions than a tooltip can hold.",
    "Keep the content short and use a dialog when the interaction requires a longer workflow.",
  ],
  examples: [
    {
      id: "popover-basic",
      name: "Basic",
      description: "The floating card sizes itself to its title and content.",
      preview: BasicPopover,
      code: `<Popover content={<Content />} title="Title">
  <Button variant="primary">Hover me</Button>
</Popover>`,
    },
    {
      id: "popover-placement",
      name: "Placement",
      description:
        "Choose from twelve placements. The popup shifts automatically near viewport edges.",
      preview: PopoverPlacements,
      code: `<Popover placement="topLeft" title="Title" content={<Content />}>
  <Button>Top left</Button>
</Popover>

<Popover placement="rightBottom" title="Title" content={<Content />}>
  <Button>Right bottom</Button>
</Popover>`,
    },
    {
      id: "popover-triggers",
      name: "Trigger modes",
      description: "Open from hover, keyboard focus, click, or more than one interaction.",
      preview: TriggerPopovers,
      code: `<Popover content={content} trigger="hover"><Button>Hover me</Button></Popover>
<Popover content={content} trigger="focus"><Button>Focus me</Button></Popover>
<Popover content={content} trigger="click"><Button>Click me</Button></Popover>
<Popover content={content} trigger={["hover", "click"]}>
  <Button>Hover or click</Button>
</Popover>`,
    },
    {
      id: "popover-arrow",
      name: "Arrow",
      description: "Show, hide, or explicitly center the arrow on the trigger.",
      preview: ArrowPopover,
      code: `<Popover arrow content={content}><Button>Show</Button></Popover>
<Popover arrow={false} content={content}><Button>Hide</Button></Popover>
<Popover arrow={{ pointAtCenter: true }} content={content}>
  <Button>Center</Button>
</Popover>`,
    },
    {
      id: "popover-controlled",
      name: "Controlled visibility",
      description: "Control the open state when content needs to close the card directly.",
      preview: ControlledPopover,
      code: `<Popover
  open={open}
  onOpenChange={setOpen}
  trigger="click"
  title="Controlled popover"
  content={<Button onClick={() => setOpen(false)}>Close</Button>}
>
  <Button variant="primary">Click me</Button>
</Popover>`,
    },
    {
      id: "popover-semantic",
      name: "Semantic styling",
      description: "Customize the public container, title, content, and arrow parts.",
      preview: SemanticPopover,
      code: `<Popover
  arrow={false}
  content="Custom content"
  classNames={{ container: "custom-popover" }}
  styles={{
    container: { background: "#f5f5f5" },
    content: { color: "#262626" },
  }}
>
  <Button>Open</Button>
</Popover>`,
    },
  ],
  api: [
    {
      name: "content",
      description: "Content displayed inside the card.",
      type: "ReactNode | () => ReactNode",
    },
    {
      name: "title",
      description: "Optional title displayed above the content.",
      type: "ReactNode | () => ReactNode",
    },
    {
      name: "trigger",
      description: "Interactions that open the popover.",
      type: "PopoverTrigger | PopoverTrigger[]",
      defaultValue: '"hover"',
    },
    {
      name: "placement",
      description: "Preferred popup position around the trigger.",
      type: "PopoverPlacement",
      defaultValue: '"top"',
    },
    {
      name: "arrow",
      description: "Shows the arrow and optionally centers it on the trigger.",
      type: "boolean | { pointAtCenter?: boolean }",
      defaultValue: "true",
    },
    { name: "open", description: "Controlled visibility state.", type: "boolean" },
    {
      name: "defaultOpen",
      description: "Initial uncontrolled visibility state.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "onOpenChange",
      description: "Runs when visibility changes.",
      type: "(open: boolean) => void",
    },
    {
      name: "autoAdjustOverflow",
      description: "Shifts or flips the popup to remain on screen.",
      type: "boolean",
      defaultValue: "true",
    },
    {
      name: "mouseEnterDelay",
      description: "Hover opening delay in seconds.",
      type: "number",
      defaultValue: "0.1",
    },
    {
      name: "mouseLeaveDelay",
      description: "Hover closing delay in seconds.",
      type: "number",
      defaultValue: "0.1",
    },
    { name: "color", description: "Custom card and arrow background color.", type: "string" },
    {
      name: "destroyOnHidden",
      description: "Unmounts popup content after it closes.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "getPopupContainer",
      description: "Returns the element that receives the popup portal.",
      type: "(triggerNode: HTMLElement) => HTMLElement",
    },
    {
      name: "classNames",
      description: "Classes for container, title, content, and arrow parts.",
      type: "PopoverClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for container, title, content, and arrow parts.",
      type: "PopoverStyles | function",
    },
  ],
  accessibility: [
    "Use a focusable trigger and ensure every action inside the popover has a clear label.",
    "Do not place essential information only behind a hover interaction; support focus or click as needed.",
    "Escape and outside interaction close the popover without trapping keyboard focus.",
  ],
});

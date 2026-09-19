import { forwardRef, type HTMLAttributes, useState } from "react";
import {
  Button,
  Divider,
  Flex,
  Segmented,
  Space,
  Tooltip,
  type TooltipPlacement,
  type TooltipProps,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicTooltip() {
  return (
    <Tooltip title="Prompt text">
      <Typography.Link href="#tooltip-basic" onClick={(event) => event.preventDefault()}>
        Tooltip will show on mouse enter.
      </Typography.Link>
    </Tooltip>
  );
}

function PlacementTooltip({
  children,
  placement,
}: {
  readonly children: string;
  readonly placement: TooltipPlacement;
}) {
  return (
    <Tooltip placement={placement} title="Prompt text">
      <Button className="showcase-tooltip-placement-button">{children}</Button>
    </Tooltip>
  );
}

function TooltipPlacements() {
  return (
    <Flex align="center" className="showcase-tooltip-placements" gap={4} vertical>
      <Flex gap={4}>
        <PlacementTooltip placement="topLeft">TL</PlacementTooltip>
        <PlacementTooltip placement="top">Top</PlacementTooltip>
        <PlacementTooltip placement="topRight">TR</PlacementTooltip>
      </Flex>
      <Flex className="showcase-tooltip-placement-middle" justify="space-between">
        <Flex gap={4} vertical>
          <PlacementTooltip placement="leftTop">LT</PlacementTooltip>
          <PlacementTooltip placement="left">Left</PlacementTooltip>
          <PlacementTooltip placement="leftBottom">LB</PlacementTooltip>
        </Flex>
        <Flex gap={4} vertical>
          <PlacementTooltip placement="rightTop">RT</PlacementTooltip>
          <PlacementTooltip placement="right">Right</PlacementTooltip>
          <PlacementTooltip placement="rightBottom">RB</PlacementTooltip>
        </Flex>
      </Flex>
      <Flex gap={4}>
        <PlacementTooltip placement="bottomLeft">BL</PlacementTooltip>
        <PlacementTooltip placement="bottom">Bottom</PlacementTooltip>
        <PlacementTooltip placement="bottomRight">BR</PlacementTooltip>
      </Flex>
    </Flex>
  );
}

function TriggerTooltips() {
  return (
    <Space wrap>
      <Tooltip title="Opened by hover" trigger="hover">
        <Button>Hover me</Button>
      </Tooltip>
      <Tooltip title="Opened by keyboard focus" trigger="focus">
        <Button>Focus me</Button>
      </Tooltip>
      <Tooltip title="Opened by click" trigger="click">
        <Button>Click me</Button>
      </Tooltip>
      <Tooltip title="Opened from the context menu" trigger="contextMenu">
        <Button>Right-click me</Button>
      </Tooltip>
    </Space>
  );
}

function DisabledTooltip() {
  const [enabled, setEnabled] = useState(true);
  return (
    <Space>
      <Tooltip title={enabled ? "Prompt text" : null}>
        <Button>Hover me</Button>
      </Tooltip>
      <Button onClick={() => setEnabled((current) => !current)}>
        {enabled ? "Disable" : "Enable"}
      </Button>
    </Space>
  );
}

type ArrowMode = "center" | "hidden" | "visible";

function ArrowTooltip() {
  const [mode, setMode] = useState<ArrowMode>("visible");
  const arrow = mode === "hidden" ? false : mode === "center" ? { pointAtCenter: true } : true;
  return (
    <Flex gap="large" vertical>
      <Segmented<ArrowMode>
        onChange={setMode}
        options={[
          { label: "Show", value: "visible" },
          { label: "Hide", value: "hidden" },
          { label: "Center", value: "center" },
        ]}
        value={mode}
      />
      <Space wrap>
        <Tooltip arrow={arrow} placement="topLeft" title="Prompt text">
          <Button>Top left</Button>
        </Tooltip>
        <Tooltip arrow={arrow} placement="top" title="Prompt text">
          <Button>Top</Button>
        </Tooltip>
        <Tooltip arrow={arrow} placement="topRight" title="Prompt text">
          <Button>Top right</Button>
        </Tooltip>
      </Space>
    </Flex>
  );
}

const presetColors = [
  "pink",
  "red",
  "yellow",
  "orange",
  "cyan",
  "green",
  "blue",
  "purple",
  "geekblue",
  "magenta",
  "volcano",
  "gold",
  "lime",
] as const;

function ColoredTooltips() {
  return (
    <Flex vertical>
      <Divider titlePlacement="start">Presets</Divider>
      <Space wrap>
        {presetColors.map((color) => (
          <Tooltip color={color} key={color} title="Prompt text">
            <Button>{color}</Button>
          </Tooltip>
        ))}
      </Space>
      <Divider titlePlacement="start">Custom</Divider>
      <Space wrap>
        <Tooltip color="#2db7f5" title="Prompt text">
          <Button>Custom blue</Button>
        </Tooltip>
        <Tooltip color="#87d068" title="Prompt text">
          <Button>Custom green</Button>
        </Tooltip>
      </Space>
    </Flex>
  );
}

function SemanticTooltip() {
  const styles: TooltipProps["styles"] = ({ props }) => ({
    container: {
      background: props.arrow === false ? "#e6f4ff" : "#fff",
      border: "1px solid #91caff",
      color: "#0958d9",
    },
  });
  return (
    <Space wrap>
      <Tooltip
        classNames={{ container: "showcase-tooltip-semantic" }}
        styles={{
          arrow: { fill: "#f5f5f5" },
          container: { background: "#f5f5f5", color: "rgba(0, 0, 0, 0.88)" },
        }}
        title="Object style"
      >
        <Button>Object style</Button>
      </Tooltip>
      <Tooltip arrow={false} styles={styles} title="Function style">
        <Button variant="primary">Function style</Button>
      </Tooltip>
    </Space>
  );
}

const CustomTrigger = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CustomTrigger(props, ref) {
    return <div {...props} className="showcase-tooltip-custom-trigger" ref={ref} />;
  },
);

function CustomComponentTooltip() {
  return (
    <Tooltip title="The custom component forwards its ref and events.">
      <CustomTrigger tabIndex={0}>Custom component</CustomTrigger>
    </Tooltip>
  );
}

export const tooltipShowcase = defineShowcase({
  id: "tooltip",
  name: "Tooltip",
  category: "Data display",
  stage: "prod",
  description: "Displays a short text explanation near a hovered or focused element.",
  whenToUse: [
    "Use Tooltip to explain an unfamiliar icon, label, or compact control.",
    "Use Popover instead when the floating content contains actions or structured information.",
  ],
  examples: [
    {
      id: "tooltip-basic",
      name: "Basic",
      description: "The tooltip opens on hover and keyboard focus.",
      preview: BasicTooltip,
      code: `<Tooltip title="Prompt text">
  <Typography.Link>Tooltip will show on mouse enter.</Typography.Link>
</Tooltip>`,
    },
    {
      id: "tooltip-placement",
      name: "Placement",
      description:
        "Choose from twelve placements. The popup shifts near viewport edges by default.",
      preview: TooltipPlacements,
      code: `<Tooltip placement="topLeft" title="Prompt text">
  <Button>Top left</Button>
</Tooltip>

<Tooltip placement="rightBottom" title="Prompt text">
  <Button>Right bottom</Button>
</Tooltip>`,
    },
    {
      id: "tooltip-triggers",
      name: "Trigger modes",
      description: "Open the tooltip from hover, keyboard focus, click, or the context menu.",
      preview: TriggerTooltips,
      code: `<Tooltip title="Prompt text" trigger="hover"><Button>Hover me</Button></Tooltip>
<Tooltip title="Prompt text" trigger="focus"><Button>Focus me</Button></Tooltip>
<Tooltip title="Prompt text" trigger="click"><Button>Click me</Button></Tooltip>
<Tooltip title="Prompt text" trigger="contextMenu"><Button>Right-click me</Button></Tooltip>`,
    },
    {
      id: "tooltip-disabled",
      name: "Disabled",
      description: "A null or empty title disables the tooltip while leaving its child untouched.",
      preview: DisabledTooltip,
      code: `<Tooltip title={enabled ? "Prompt text" : null}>
  <Button>Hover me</Button>
</Tooltip>`,
    },
    {
      id: "tooltip-arrow",
      name: "Arrow",
      description: "Show, hide, or explicitly center the arrow on the trigger.",
      preview: ArrowTooltip,
      code: `<Tooltip arrow title="Prompt text"><Button>Show</Button></Tooltip>
<Tooltip arrow={false} title="Prompt text"><Button>Hide</Button></Tooltip>
<Tooltip arrow={{ pointAtCenter: true }} title="Prompt text">
  <Button>Center</Button>
</Tooltip>`,
    },
    {
      id: "tooltip-colors",
      name: "Colors",
      description: "Use a preset color name or any valid CSS color.",
      preview: ColoredTooltips,
      code: `<Tooltip color="blue" title="Prompt text"><Button>Blue</Button></Tooltip>
<Tooltip color="#87d068" title="Prompt text"><Button>Custom</Button></Tooltip>`,
    },
    {
      id: "tooltip-semantic",
      name: "Semantic styling",
      description: "Customize the public container and arrow parts with objects or functions.",
      preview: SemanticTooltip,
      code: `<Tooltip
  classNames={{ container: "custom-tooltip" }}
  styles={{ container: { background: "#f5f5f5", color: "#262626" } }}
  title="Prompt text"
>
  <Button>Object style</Button>
</Tooltip>`,
    },
    {
      id: "tooltip-custom-component",
      name: "Custom component",
      description: "Custom triggers must forward their ref and event props to a DOM element.",
      preview: CustomComponentTooltip,
      code: `const CustomTrigger = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div {...props} ref={ref} />,
);

<Tooltip title="Prompt text">
  <CustomTrigger tabIndex={0}>Custom component</CustomTrigger>
</Tooltip>`,
    },
  ],
  api: [
    {
      name: "title",
      description: "Text content displayed in the tooltip.",
      type: "ReactNode | () => ReactNode",
    },
    {
      name: "placement",
      description: "Preferred position around the trigger.",
      type: "TooltipPlacement",
      defaultValue: '"top"',
    },
    {
      name: "trigger",
      description: "Interactions that open the tooltip.",
      type: "TooltipTrigger | TooltipTrigger[]",
      defaultValue: '"hover"',
    },
    {
      name: "arrow",
      description: "Shows the arrow and optionally centers it on the trigger.",
      type: "boolean | { pointAtCenter?: boolean }",
      defaultValue: "true",
    },
    {
      name: "color",
      description: "Preset name or CSS background color for the popup and arrow.",
      type: "string",
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
      description: "Shifts or flips the popup to keep it on screen.",
      type: "boolean",
      defaultValue: "true",
    },
    {
      name: "mouseEnterDelay",
      description: "Opening delay in seconds.",
      type: "number",
      defaultValue: "0.1",
    },
    {
      name: "mouseLeaveDelay",
      description: "Closing delay in seconds.",
      type: "number",
      defaultValue: "0.1",
    },
    {
      name: "destroyOnHidden",
      description: "Unmounts popup content after it closes.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "fresh",
      description: "Re-evaluates the title while the tooltip is closed.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "getPopupContainer",
      description: "Returns the element that receives the popup portal.",
      type: "(triggerNode: HTMLElement) => HTMLElement",
    },
    { name: "zIndex", description: "Overrides the popup stacking level.", type: "number" },
    {
      name: "classNames",
      description: "Classes for the container and arrow parts.",
      type: "TooltipClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for the container and arrow parts.",
      type: "TooltipStyles | function",
    },
  ],
  accessibility: [
    "Use a focusable trigger so keyboard users can reveal the same explanation as pointer users.",
    "Do not place essential instructions or interactive content exclusively inside a tooltip.",
    "Escape closes an open tooltip without moving focus.",
  ],
});

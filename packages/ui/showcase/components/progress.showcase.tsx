import { useState } from "react";
import { MinusOutlined, PlusOutlined } from "../../src/icons.js";
import {
  Button,
  Flex,
  Progress,
  type ProgressGapPlacement,
  type ProgressProps,
  Segmented,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function LineProgress() {
  return (
    <Flex gap="small" vertical>
      <Progress percent={30} />
      <Progress percent={50} status="active" />
      <Progress percent={70} status="exception" />
      <Progress percent={100} />
      <Progress percent={50} showInfo={false} />
    </Flex>
  );
}

function CircleProgress() {
  return (
    <Space size="medium" wrap>
      <Progress percent={75} type="circle" />
      <Progress percent={70} status="exception" type="circle" />
      <Progress percent={100} type="circle" />
      <Progress percent={30} size={80} type="circle" />
      <Progress percent={60} size={14} strokeWidth={20} type="circle" />
    </Space>
  );
}

function FormatAndSuccessProgress() {
  return (
    <Flex gap="medium" vertical>
      <Progress percent={60} success={{ percent: 30 }} />
      <Space size="medium" wrap>
        <Progress percent={60} success={{ percent: 30 }} type="circle" />
        <Progress percent={60} success={{ percent: 30 }} type="dashboard" />
        <Progress format={(value) => `${value} days`} percent={75} type="circle" />
        <Progress format={() => "Done"} percent={100} type="circle" />
      </Space>
    </Flex>
  );
}

const lineGradient = { from: "#108ee9", to: "#87d068" } as const;
const circleGradient = {
  "0%": "#87d068",
  "50%": "#ffe58f",
  "100%": "#ffccc7",
} as const;

function GradientProgress() {
  return (
    <Flex gap="medium" vertical>
      <Progress percent={99.9} strokeColor={lineGradient} />
      <Progress percent={50} status="active" strokeColor={lineGradient} />
      <Space size="medium" wrap>
        <Progress percent={90} strokeColor={lineGradient} type="circle" />
        <Progress percent={93} strokeColor={circleGradient} type="circle" />
        <Progress percent={93} strokeColor={circleGradient} type="dashboard" />
      </Space>
    </Flex>
  );
}

function PositionedProgress() {
  return (
    <Flex gap="small" vertical>
      <Progress
        percent={10}
        percentPosition={{ align: "center", type: "inner" }}
        size={[300, 20]}
      />
      <Progress
        percent={50}
        percentPosition={{ align: "start", type: "inner" }}
        size={[300, 20]}
        strokeColor="#b7eb8f"
      />
      <Progress
        percent={60}
        percentPosition={{ align: "end", type: "inner" }}
        size={[300, 20]}
        strokeColor="#001342"
      />
      <Progress percent={60} percentPosition={{ align: "start", type: "outer" }} />
      <Progress percent={60} percentPosition={{ align: "center", type: "outer" }} />
    </Flex>
  );
}

function DynamicProgress() {
  const [percent, setPercent] = useState(30);
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Progress percent={percent} />
      <Progress percent={percent} type="circle" />
      <Space.Compact>
        <Button
          aria-label="Decrease progress"
          icon={<MinusOutlined />}
          onClick={() => setPercent((current) => Math.max(0, current - 10))}
        />
        <Button
          aria-label="Increase progress"
          icon={<PlusOutlined />}
          onClick={() => setPercent((current) => Math.min(100, current + 10))}
        />
      </Space.Compact>
    </Flex>
  );
}

function DashboardProgress() {
  const [gapDegree, setGapDegree] = useState(75);
  const [gapPlacement, setGapPlacement] = useState<ProgressGapPlacement>("bottom");
  return (
    <Flex align="flex-start" gap="medium" vertical>
      <Flex align="flex-start" gap="small" vertical>
        <Typography.Text>Gap degree</Typography.Text>
        <Segmented<number>
          onChange={setGapDegree}
          options={[
            { label: "50°", value: 50 },
            { label: "75°", value: 75 },
            { label: "100°", value: 100 },
          ]}
          value={gapDegree}
        />
      </Flex>
      <Flex align="flex-start" gap="small" vertical>
        <Typography.Text>Gap placement</Typography.Text>
        <Segmented<ProgressGapPlacement>
          onChange={setGapPlacement}
          options={["start", "end", "top", "bottom"]}
          value={gapPlacement}
        />
      </Flex>
      <Progress gapDegree={gapDegree} gapPlacement={gapPlacement} percent={30} type="dashboard" />
    </Flex>
  );
}

function StepsAndSizesProgress() {
  return (
    <Flex gap="medium" vertical>
      <Flex gap="small" vertical>
        <Progress percent={50} steps={3} />
        <Progress percent={30} steps={5} />
        <Progress percent={100} size="small" steps={5} />
        <Progress percent={60} steps={5} strokeColor={["#52c41a", "#52c41a", "#ff4d4f"]} />
      </Flex>
      <Space size="medium" wrap>
        <Progress percent={50} size="small" type="circle" />
        <Progress percent={50} size={80} type="circle" />
        <Progress percent={50} size="small" type="dashboard" />
        <Progress percent={50} size={80} type="dashboard" />
        <Progress percent={50} steps={{ count: 8, gap: 4 }} strokeWidth={12} type="circle" />
      </Space>
    </Flex>
  );
}

function LineCapProgress() {
  return (
    <Flex gap="medium" vertical>
      <Progress percent={75} strokeLinecap="butt" />
      <Space size="medium" wrap>
        <Progress percent={75} strokeLinecap="butt" type="circle" />
        <Progress percent={75} strokeLinecap="butt" type="dashboard" />
      </Space>
    </Flex>
  );
}

function SemanticProgress() {
  const styles: ProgressProps["styles"] = ({ props }) => {
    const hue = 200 - (200 * (props.percent ?? 0)) / 100;
    return {
      rail: { background: "rgba(0, 0, 0, 0.1)" },
      track: {
        background: `linear-gradient(to right, hsl(${hue} 85% 65%), hsl(${hue + 30} 90% 55%))`,
      },
    };
  };
  return (
    <Flex gap="small" vertical>
      {[10, 30, 50, 70, 90].map((percent) => (
        <Progress key={percent} percent={percent} styles={styles} />
      ))}
    </Flex>
  );
}

export const progressShowcase = defineShowcase({
  id: "progress",
  name: "Progress",
  category: "Feedback",
  stage: "prod",
  description: "Displays the completion state of a long-running or background operation.",
  usage: 'import { Progress } from "@launchpp/ui";',
  whenToUse: [
    "Use Progress when an operation takes more than a moment and users benefit from seeing its completion state.",
    "Prefer a line for workflows, a circle for compact summaries, and a dashboard when the incomplete gap is meaningful.",
  ],
  examples: [
    {
      id: "progress-line",
      name: "Progress bar",
      description:
        "A standard line supports normal, active, exception, success, and hidden-info states.",
      preview: LineProgress,
      code: `<Progress percent={30} />
<Progress percent={50} status="active" />
<Progress percent={70} status="exception" />
<Progress percent={100} />
<Progress percent={50} showInfo={false} />`,
    },
    {
      id: "progress-circle",
      name: "Circular progress",
      description:
        "Circular progress supports status icons, preset sizes, and tiny responsive indicators.",
      preview: CircleProgress,
      code: `<Progress type="circle" percent={75} />
<Progress type="circle" percent={70} status="exception" />
<Progress type="circle" percent={100} />
<Progress type="circle" percent={30} size={80} />`,
    },
    {
      id: "progress-format-success",
      name: "Success segment and custom text",
      description:
        "Show completed work separately or replace the percentage with domain-specific text.",
      preview: FormatAndSuccessProgress,
      code: `<Progress percent={60} success={{ percent: 30 }} />
<Progress type="circle" percent={75} format={(value) => \`\${value} days\`} />
<Progress type="circle" percent={100} format={() => "Done"} />`,
    },
    {
      id: "progress-gradient",
      name: "Gradient",
      description: "Use from/to colors or percentage stops for line, circle, and dashboard tracks.",
      preview: GradientProgress,
      code: `const gradient = { from: "#108ee9", to: "#87d068" };

<Progress percent={99.9} strokeColor={gradient} />
<Progress type="circle" percent={90} strokeColor={gradient} />`,
    },
    {
      id: "progress-position",
      name: "Value position",
      description: "Place the value inside the track or before, after, or below it.",
      preview: PositionedProgress,
      code: `<Progress
  percent={50}
  size={[300, 20]}
  percentPosition={{ align: "start", type: "inner" }}
/>
<Progress percent={60} percentPosition={{ align: "center", type: "outer" }} />`,
    },
    {
      id: "progress-dynamic",
      name: "Dynamic",
      description: "Progress transitions smoothly when its controlled percentage changes.",
      preview: DynamicProgress,
      code: `<Progress percent={percent} />
<Progress type="circle" percent={percent} />
<Button onClick={() => setPercent((value) => Math.min(100, value + 10))}>Increase</Button>`,
    },
    {
      id: "progress-dashboard",
      name: "Dashboard",
      description: "Configure the dashboard gap degree and placement.",
      preview: DashboardProgress,
      code: `<Progress
  type="dashboard"
  percent={30}
  gapDegree={75}
  gapPlacement="bottom"
/>`,
    },
    {
      id: "progress-steps-sizes",
      name: "Steps and sizes",
      description: "Render discrete line or circle segments and adapt them to compact surfaces.",
      preview: StepsAndSizesProgress,
      code: `<Progress percent={50} steps={3} />
<Progress percent={60} steps={5} strokeColor={["#52c41a", "#52c41a", "#ff4d4f"]} />
<Progress type="circle" percent={50} steps={{ count: 8, gap: 4 }} />`,
    },
    {
      id: "progress-linecap",
      name: "Stroke linecap",
      description: "Choose rounded, square, or flat track endings.",
      preview: LineCapProgress,
      code: `<Progress percent={75} strokeLinecap="butt" />
<Progress type="circle" percent={75} strokeLinecap="butt" />`,
    },
    {
      id: "progress-semantic",
      name: "Semantic styling",
      description: "Customize documented regions without targeting private DOM structure.",
      preview: SemanticProgress,
      code: `<Progress
  percent={60}
  classNames={{ root: "project-progress" }}
  styles={{
    rail: { background: "rgba(0, 0, 0, 0.1)" },
    track: { background: "linear-gradient(to right, #69b1ff, #52c41a)" },
  }}
/>`,
    },
  ],
  api: [
    {
      name: "percent",
      description: "Completion percentage, clamped from 0 to 100.",
      type: "number",
      defaultValue: "0",
    },
    {
      name: "type",
      description: "Progress shape.",
      type: '"line" | "circle" | "dashboard"',
      defaultValue: "line",
    },
    {
      name: "status",
      description: "Semantic progress state.",
      type: '"normal" | "active" | "exception" | "success"',
    },
    {
      name: "showInfo",
      description: "Displays the value or status icon.",
      type: "boolean",
      defaultValue: "true",
    },
    {
      name: "format",
      description: "Formats the displayed progress value.",
      type: "(percent, successPercent) => ReactNode",
    },
    {
      name: "success",
      description: "Configures a completed segment within total progress.",
      type: "{ percent?: number; strokeColor?: string }",
    },
    {
      name: "strokeColor",
      description: "Track color, color list, or gradient definition.",
      type: "string | string[] | ProgressGradient",
    },
    { name: "railColor", description: "Color of the unfilled track.", type: "string" },
    {
      name: "strokeLinecap",
      description: "Shape of track endings.",
      type: '"round" | "butt" | "square"',
      defaultValue: "round",
    },
    {
      name: "strokeWidth",
      description: "Line height or circular stroke width percentage.",
      type: "number",
    },
    {
      name: "size",
      description: "Preset or explicit progress dimensions.",
      type: "ProgressSize",
      defaultValue: "medium",
    },
    {
      name: "steps",
      description: "Renders progress as discrete segments.",
      type: "number | { count: number; gap: number }",
    },
    {
      name: "rounding",
      description: "Controls how completed line steps are rounded.",
      type: "(step) => number",
      defaultValue: "Math.round",
    },
    {
      name: "percentPosition",
      description: "Line value alignment and inner or outer position.",
      type: "{ align?: start | center | end; type?: inner | outer }",
    },
    {
      name: "gapDegree",
      description: "Dashboard gap angle from 0 through 295.",
      type: "number",
      defaultValue: "75",
    },
    {
      name: "gapPlacement",
      description: "Dashboard gap side.",
      type: '"top" | "bottom" | "start" | "end"',
      defaultValue: "bottom",
    },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "ProgressClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "ProgressStyles | function",
    },
  ],
  accessibility: [
    "Progress exposes progressbar semantics with minimum, maximum, and current values.",
    "Provide aria-label or aria-labelledby when surrounding content does not clearly name the operation.",
    "Do not rely on color alone when exception or success states affect the next user action.",
  ],
});

import { useState } from "react";
import { Button, Card, Flex, type FlexGap, Select, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

type DemoOrientation = "horizontal" | "vertical";
const basicBlockIds = ["first", "second", "third", "fourth"] as const;
const wrapButtonIds = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
] as const;

function BasicFlex() {
  const [orientation, setOrientation] = useState<DemoOrientation>("horizontal");

  return (
    <Flex gap="medium" vertical>
      <Flex gap="small">
        <Button
          onClick={() => setOrientation("horizontal")}
          variant={orientation === "horizontal" ? "primary" : "default"}
        >
          Horizontal
        </Button>
        <Button
          onClick={() => setOrientation("vertical")}
          variant={orientation === "vertical" ? "primary" : "default"}
        >
          Vertical
        </Button>
      </Flex>
      <Flex className="showcase-flex-blocks" orientation={orientation}>
        {basicBlockIds.map((id) => (
          <div
            className="showcase-flex-block"
            key={id}
            style={{ width: orientation === "vertical" ? "100%" : "25%" }}
          />
        ))}
      </Flex>
    </Flex>
  );
}

const justifyOptions = [
  { label: "Flex start", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "Flex end", value: "flex-end" },
  { label: "Space between", value: "space-between" },
  { label: "Space around", value: "space-around" },
  { label: "Space evenly", value: "space-evenly" },
] as const;

const alignOptions = [
  { label: "Flex start", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "Flex end", value: "flex-end" },
] as const;

type JustifyValue = (typeof justifyOptions)[number]["value"];
type AlignValue = (typeof alignOptions)[number]["value"];

function FlexAlignment() {
  const [justify, setJustify] = useState<JustifyValue>("flex-start");
  const [align, setAlign] = useState<AlignValue>("flex-start");

  return (
    <Flex gap="medium" vertical>
      <Flex gap="medium" wrap>
        <div className="showcase-flex-control">
          <Typography.Text>Justify</Typography.Text>
          <Select
            ariaLabel="Justify content"
            onValueChange={(value) => setJustify(value as JustifyValue)}
            options={justifyOptions}
            value={justify}
          />
        </div>
        <div className="showcase-flex-control">
          <Typography.Text>Align</Typography.Text>
          <Select
            ariaLabel="Align items"
            onValueChange={(value) => setAlign(value as AlignValue)}
            options={alignOptions}
            value={align}
          />
        </div>
      </Flex>
      <Flex align={align} className="showcase-flex-alignment-box" gap="small" justify={justify}>
        <Button variant="primary">One</Button>
        <Button variant="primary">Two</Button>
        <Button variant="primary">Three</Button>
        <Button variant="primary">Four</Button>
      </Flex>
    </Flex>
  );
}

const gapExamples: ReadonlyArray<{ gap: FlexGap; label: string }> = [
  { gap: "small", label: "Small" },
  { gap: "medium", label: "Medium" },
  { gap: "large", label: "Large" },
  { gap: 20, label: "Custom 20px" },
];

function FlexGaps() {
  return (
    <Flex gap="large" vertical>
      {gapExamples.map((example) => (
        <Flex gap="medium" key={example.label} vertical>
          <Typography.Text type="secondary">{example.label}</Typography.Text>
          <Flex gap={example.gap} wrap>
            <Button variant="primary">Primary</Button>
            <Button>Default</Button>
            <Button variant="dashed">Dashed</Button>
            <Button variant="link">Link</Button>
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}

function FlexWrap() {
  return (
    <Flex gap="small" wrap>
      {wrapButtonIds.map((id) => (
        <Button key={id} variant="primary">
          Button
        </Button>
      ))}
    </Flex>
  );
}

function NestedFlex() {
  return (
    <Card className="showcase-flex-card" title="Project launch">
      <Flex align="center" gap="large" wrap>
        <div aria-hidden="true" className="showcase-flex-avatar">
          L+
        </div>
        <Flex align="flex-start" flex="1 1 260px" gap="medium" vertical>
          <Flex gap="small" vertical>
            <Typography.Text strong>Launch++ workspace</Typography.Text>
            <Typography.Text type="secondary">
              Plan projects, collaborate with your team, and extend the workspace with plugins.
            </Typography.Text>
          </Flex>
          <Button variant="primary">Open project</Button>
        </Flex>
      </Flex>
    </Card>
  );
}

export const flexShowcase = defineShowcase({
  id: "flex",
  name: "Flex",
  category: "Layout",
  stage: "prod",
  description: "Arranges block-level children along a horizontal or vertical axis.",
  usage: `import { Flex } from "@launchpp/ui";`,
  whenToUse: [
    "Use Flex to align, distribute, wrap, or reorder block-level children without adding wrappers.",
    "Use Space when you only need consistent spacing between inline elements; use Flex when the layout also needs directional or alignment control.",
  ],
  examples: [
    {
      id: "flex-basic",
      name: "Basic direction",
      description:
        "Switch between horizontal and vertical arrangement without changing the children.",
      preview: BasicFlex,
      code: `<Flex orientation="horizontal">
  <div />
  <div />
</Flex>

<Flex vertical>
  <div />
  <div />
</Flex>`,
    },
    {
      id: "flex-alignment",
      name: "Alignment",
      description: "Control distribution on the main axis and alignment on the cross axis.",
      preview: FlexAlignment,
      code: `<Flex justify="space-between" align="center" gap="small">
  <Button>One</Button>
  <Button>Two</Button>
  <Button>Three</Button>
</Flex>`,
    },
    {
      id: "flex-gap",
      name: "Gap",
      description: "Use a preset gap or provide a custom CSS length or pixel number.",
      preview: FlexGaps,
      code: `<Flex gap="small">...</Flex>
<Flex gap="medium">...</Flex>
<Flex gap="large">...</Flex>
<Flex gap={20}>...</Flex>`,
    },
    {
      id: "flex-wrap",
      name: "Wrap",
      description: "Allow children to continue onto additional rows when space runs out.",
      preview: FlexWrap,
      code: `<Flex wrap gap="small">
  {buttons.map((button) => button)}
</Flex>`,
    },
    {
      id: "flex-nesting",
      name: "Nested layout",
      description: "Nest horizontal and vertical Flex containers to compose richer layouts.",
      preview: NestedFlex,
      code: `<Flex align="center" gap="large" wrap>
  <Avatar />
  <Flex vertical gap="medium" flex="1 1 260px">
    <ProjectSummary />
    <Button variant="primary">Open project</Button>
  </Flex>
</Flex>`,
    },
  ],
  api: [
    {
      name: "orientation",
      type: '"horizontal" | "vertical"',
      defaultValue: '"horizontal"',
      description: "Sets the main layout direction.",
    },
    {
      name: "vertical",
      type: "boolean",
      defaultValue: "false",
      description: "Provides shorthand for vertical orientation; orientation takes precedence.",
    },
    {
      name: "wrap",
      type: 'boolean | "nowrap" | "wrap" | "wrap-reverse"',
      defaultValue: "false",
      description: "Controls whether children remain on one line or wrap onto additional lines.",
    },
    {
      name: "justify",
      type: "CSSProperties['justifyContent']",
      description: "Controls distribution along the main axis.",
    },
    {
      name: "align",
      type: "CSSProperties['alignItems']",
      description: "Controls alignment along the cross axis.",
    },
    {
      name: "gap",
      type: '"small" | "medium" | "large" | number | string',
      description: "Sets a preset or custom gap between children.",
    },
    {
      name: "flex",
      type: "CSSProperties['flex']",
      description: "Sets the CSS flex shorthand when this container is itself a flex child.",
    },
    {
      name: "component",
      type: "ElementType",
      defaultValue: '"div"',
      description: "Changes the rendered root element or component.",
    },
  ],
  accessibility: [
    "Flex changes visual layout only; choose a semantic component prop when the group has structural meaning.",
    "Do not use visual ordering to create a reading order that differs from the DOM order.",
    "Ensure wrapped controls retain a predictable keyboard and reading sequence.",
  ],
});

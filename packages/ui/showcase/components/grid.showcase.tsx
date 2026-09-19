import type { ReactNode } from "react";
import {
  Col,
  Divider,
  Grid,
  type GridBreakpoint,
  Row,
  type RowAlign,
  type RowJustify,
  Tag,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

interface GridCellProps {
  readonly children: ReactNode;
  readonly height?: "medium" | "short" | "tall";
  readonly muted?: boolean;
}

function GridCell({ children, height, muted = false }: GridCellProps) {
  return (
    <div
      className={`showcase-grid-cell${muted ? " is-muted" : ""}${height ? ` is-${height}` : ""}`}
    >
      {children}
    </div>
  );
}

function GridConcept() {
  return (
    <div className="showcase-grid-concept">
      <Row>
        <Col span={24}>
          <GridCell>100%</GridCell>
        </Col>
      </Row>
      <Row>
        <Col span={6}>
          <GridCell>25%</GridCell>
        </Col>
        <Col span={6}>
          <GridCell muted>25%</GridCell>
        </Col>
        <Col span={6}>
          <GridCell>25%</GridCell>
        </Col>
        <Col span={6}>
          <GridCell muted>25%</GridCell>
        </Col>
      </Row>
      <Row>
        <Col span={8}>
          <GridCell>33.33%</GridCell>
        </Col>
        <Col span={8}>
          <GridCell muted>33.33%</GridCell>
        </Col>
        <Col span={8}>
          <GridCell>33.33%</GridCell>
        </Col>
      </Row>
      <Row>
        <Col span={12}>
          <GridCell>50%</GridCell>
        </Col>
        <Col span={12}>
          <GridCell muted>50%</GridCell>
        </Col>
      </Row>
      <Row>
        <Col span={16}>
          <GridCell>66.66%</GridCell>
        </Col>
        <Col span={8}>
          <GridCell muted>33.33%</GridCell>
        </Col>
      </Row>
    </div>
  );
}

function BasicGrid() {
  return (
    <div className="showcase-grid-stack">
      <Row>
        <Col span={24}>
          <GridCell>col-24</GridCell>
        </Col>
      </Row>
      <Row>
        <Col span={12}>
          <GridCell>col-12</GridCell>
        </Col>
        <Col span={12}>
          <GridCell muted>col-12</GridCell>
        </Col>
      </Row>
      <Row>
        <Col span={8}>
          <GridCell>col-8</GridCell>
        </Col>
        <Col span={8}>
          <GridCell muted>col-8</GridCell>
        </Col>
        <Col span={8}>
          <GridCell>col-8</GridCell>
        </Col>
      </Row>
      <Row>
        <Col span={6}>
          <GridCell>col-6</GridCell>
        </Col>
        <Col span={6}>
          <GridCell muted>col-6</GridCell>
        </Col>
        <Col span={6}>
          <GridCell>col-6</GridCell>
        </Col>
        <Col span={6}>
          <GridCell muted>col-6</GridCell>
        </Col>
      </Row>
    </div>
  );
}

function FourColumns({ muted = false }: { readonly muted?: boolean }) {
  return (
    <>
      <Col span={6}>
        <GridCell muted={muted}>col-6</GridCell>
      </Col>
      <Col span={6}>
        <GridCell muted={!muted}>col-6</GridCell>
      </Col>
      <Col span={6}>
        <GridCell muted={muted}>col-6</GridCell>
      </Col>
      <Col span={6}>
        <GridCell muted={!muted}>col-6</GridCell>
      </Col>
    </>
  );
}

function GridGutters() {
  return (
    <div className="showcase-grid-section-stack">
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Horizontal
      </Divider>
      <Row gutter={16}>
        <FourColumns />
      </Row>
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Responsive
      </Divider>
      <Row gutter={{ lg: 32, md: 24, sm: 16, xs: 8 }}>
        <FourColumns muted />
      </Row>
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Horizontal and vertical
      </Divider>
      <Row gutter={[16, 16]}>
        <FourColumns />
        <FourColumns muted />
      </Row>
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        CSS length
      </Divider>
      <Row gutter="1rem">
        <FourColumns muted />
      </Row>
    </div>
  );
}

function GridPositioning() {
  return (
    <div className="showcase-grid-section-stack">
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Offset
      </Divider>
      <Row>
        <Col span={8}>
          <GridCell>col-8</GridCell>
        </Col>
        <Col offset={8} span={8}>
          <GridCell muted>col-8 offset-8</GridCell>
        </Col>
      </Row>
      <Row>
        <Col offset={6} span={12}>
          <GridCell>col-12 offset-6</GridCell>
        </Col>
      </Row>
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Push and pull
      </Divider>
      <Row>
        <Col push={6} span={18}>
          <GridCell>col-18 push-6</GridCell>
        </Col>
        <Col pull={18} span={6}>
          <GridCell muted>col-6 pull-18</GridCell>
        </Col>
      </Row>
    </div>
  );
}

const justifyExamples: ReadonlyArray<{ label: string; value: RowJustify }> = [
  { label: "Start", value: "start" },
  { label: "Center", value: "center" },
  { label: "End", value: "end" },
  { label: "Space between", value: "space-between" },
  { label: "Space around", value: "space-around" },
  { label: "Space evenly", value: "space-evenly" },
];

function GridTypesetting() {
  return (
    <div className="showcase-grid-section-stack">
      {justifyExamples.map((example) => (
        <div key={example.value}>
          <Typography.Text type="secondary">{example.label}</Typography.Text>
          <Row className="showcase-grid-row-surface" justify={example.value}>
            <Col span={4}>
              <GridCell>col-4</GridCell>
            </Col>
            <Col span={4}>
              <GridCell muted>col-4</GridCell>
            </Col>
            <Col span={4}>
              <GridCell>col-4</GridCell>
            </Col>
            <Col span={4}>
              <GridCell muted>col-4</GridCell>
            </Col>
          </Row>
        </div>
      ))}
    </div>
  );
}

const alignExamples: ReadonlyArray<{ label: string; value: RowAlign }> = [
  { label: "Top", value: "top" },
  { label: "Middle", value: "middle" },
  { label: "Bottom", value: "bottom" },
];

function GridAlignment() {
  return (
    <div className="showcase-grid-section-stack">
      {alignExamples.map((example) => (
        <div key={example.value}>
          <Typography.Text type="secondary">Align {example.label}</Typography.Text>
          <Row align={example.value} className="showcase-grid-row-surface" justify="space-around">
            <Col span={4}>
              <GridCell height="medium">col-4</GridCell>
            </Col>
            <Col span={4}>
              <GridCell height="short" muted>
                col-4
              </GridCell>
            </Col>
            <Col span={4}>
              <GridCell height="tall">col-4</GridCell>
            </Col>
            <Col span={4}>
              <GridCell muted>col-4</GridCell>
            </Col>
          </Row>
        </div>
      ))}
    </div>
  );
}

function GridOrder() {
  return (
    <div className="showcase-grid-section-stack">
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Fixed order
      </Divider>
      <Row>
        <Col order={4} span={6}>
          <GridCell>1 order-4</GridCell>
        </Col>
        <Col order={3} span={6}>
          <GridCell muted>2 order-3</GridCell>
        </Col>
        <Col order={2} span={6}>
          <GridCell>3 order-2</GridCell>
        </Col>
        <Col order={1} span={6}>
          <GridCell muted>4 order-1</GridCell>
        </Col>
      </Row>
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Responsive order
      </Divider>
      <Row>
        <Col lg={{ order: 4 }} md={{ order: 3 }} sm={{ order: 2 }} span={6} xs={{ order: 1 }}>
          <GridCell>Item 1</GridCell>
        </Col>
        <Col lg={{ order: 3 }} md={{ order: 4 }} sm={{ order: 1 }} span={6} xs={{ order: 2 }}>
          <GridCell muted>Item 2</GridCell>
        </Col>
        <Col lg={{ order: 2 }} md={{ order: 1 }} sm={{ order: 4 }} span={6} xs={{ order: 3 }}>
          <GridCell>Item 3</GridCell>
        </Col>
        <Col lg={{ order: 1 }} md={{ order: 2 }} sm={{ order: 3 }} span={6} xs={{ order: 4 }}>
          <GridCell muted>Item 4</GridCell>
        </Col>
      </Row>
    </div>
  );
}

function GridFlex() {
  return (
    <div className="showcase-grid-section-stack">
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Proportional columns
      </Divider>
      <Row>
        <Col flex={2}>
          <GridCell>2 / 5</GridCell>
        </Col>
        <Col flex={3}>
          <GridCell muted>3 / 5</GridCell>
        </Col>
      </Row>
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Fixed and flexible
      </Divider>
      <Row>
        <Col flex="120px">
          <GridCell>120px</GridCell>
        </Col>
        <Col flex="auto">
          <GridCell muted>Fill remaining space</GridCell>
        </Col>
      </Row>
      <Divider className="showcase-grid-section-divider" plain titlePlacement="start">
        Raw flex values
      </Divider>
      <Row>
        <Col flex="1 1 200px">
          <GridCell>1 1 200px</GridCell>
        </Col>
        <Col flex="0 1 300px">
          <GridCell muted>0 1 300px</GridCell>
        </Col>
      </Row>
    </div>
  );
}

function ResponsiveGrid() {
  return (
    <div className="showcase-grid-section-stack">
      <Row gutter={[16, 16]}>
        <Col lg={8} sm={12} xs={24}>
          <GridCell>Project overview</GridCell>
        </Col>
        <Col lg={8} sm={12} xs={24}>
          <GridCell muted>Recent activity</GridCell>
        </Col>
        <Col lg={8} sm={24} xs={24}>
          <GridCell>Team members</GridCell>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col lg={{ offset: 2, span: 6 }} xs={{ offset: 1, span: 22 }}>
          <GridCell>Responsive offset</GridCell>
        </Col>
        <Col lg={{ offset: 2, span: 6 }} xs={{ offset: 1, span: 22 }}>
          <GridCell muted>Responsive offset</GridCell>
        </Col>
        <Col lg={{ offset: 2, span: 6 }} xs={{ offset: 1, span: 22 }}>
          <GridCell>Responsive offset</GridCell>
        </Col>
      </Row>
    </div>
  );
}

function BreakpointExample() {
  const screens = Grid.useBreakpoint();
  const activeScreens = (Object.entries(screens) as Array<[GridBreakpoint, boolean]>).filter(
    ([, active]) => active,
  );

  return (
    <div className="showcase-grid-breakpoints">
      <Typography.Text>Current breakpoints:</Typography.Text>
      {activeScreens.map(([breakpoint]) => (
        <Tag color="blue" key={breakpoint} variant="filled">
          {breakpoint}
        </Tag>
      ))}
    </div>
  );
}

export const gridShowcase = defineShowcase({
  id: "grid",
  name: "Grid",
  category: "Layout",
  stage: "prod",
  description: "Provides a responsive 24-column system for stable page and content layouts.",
  usage: `import { Col, Grid, Row } from "@launchpp/ui";`,
  whenToUse: [
    "Use Row and Col when content must align to a shared responsive column structure.",
    "Place content inside Col, and place Col directly inside Row. A row wraps when its column spans exceed 24.",
    "Prefer one to four major content regions per row to preserve a comfortable information hierarchy.",
  ],
  examples: [
    {
      id: "grid-concept",
      name: "24-column design concept",
      description: "Column spans express proportions of a shared 24-unit row.",
      preview: GridConcept,
      code: `<Row>
  <Col span={6}>25%</Col>
  <Col span={6}>25%</Col>
  <Col span={6}>25%</Col>
  <Col span={6}>25%</Col>
</Row>`,
    },
    {
      id: "grid-basic",
      name: "Basic grid",
      description: "Combine column spans whose total equals 24 to create equal-width layouts.",
      preview: BasicGrid,
      code: `<Row>
  <Col span={12}>col-12</Col>
  <Col span={12}>col-12</Col>
</Row>
<Row>
  <Col span={8}>col-8</Col>
  <Col span={8}>col-8</Col>
  <Col span={8}>col-8</Col>
</Row>`,
    },
    {
      id: "grid-gutter",
      name: "Grid gutter",
      description: "Set horizontal, vertical, responsive, or CSS-length spacing between columns.",
      preview: GridGutters,
      code: `<Row gutter={16}>...</Row>
<Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>...</Row>
<Row gutter={[16, 24]}>...</Row>
<Row gutter="1rem">...</Row>`,
    },
    {
      id: "grid-positioning",
      name: "Offset, push, and pull",
      description: "Offset adds leading space, while push and pull shift columns visually.",
      preview: GridPositioning,
      code: `<Row>
  <Col span={8}>col-8</Col>
  <Col span={8} offset={8}>col-8 offset-8</Col>
</Row>
<Row>
  <Col span={18} push={6}>col-18 push-6</Col>
  <Col span={6} pull={18}>col-6 pull-18</Col>
</Row>`,
    },
    {
      id: "grid-typesetting",
      name: "Horizontal arrangement",
      description: "Use justify to distribute columns along the row's main axis.",
      preview: GridTypesetting,
      code: `<Row justify="space-between">
  <Col span={4}>...</Col>
  <Col span={4}>...</Col>
</Row>`,
    },
    {
      id: "grid-alignment",
      name: "Vertical alignment",
      description: "Align columns to the top, middle, bottom, or stretch them across the row.",
      preview: GridAlignment,
      code: `<Row align="middle" justify="space-around">
  <Col span={4}>...</Col>
  <Col span={4}>...</Col>
</Row>`,
    },
    {
      id: "grid-order",
      name: "Column order",
      description: "Set a fixed order or change it responsively without moving DOM nodes.",
      preview: GridOrder,
      code: `<Col span={6} order={4}>Item 1</Col>
<Col span={6} xs={{ order: 1 }} md={{ order: 3 }} lg={{ order: 4 }}>
  Responsive item
</Col>`,
    },
    {
      id: "grid-flex",
      name: "Flexible columns",
      description: "Use flex values when columns should grow rather than follow fixed spans.",
      preview: GridFlex,
      code: `<Row>
  <Col flex={2}>2 / 5</Col>
  <Col flex={3}>3 / 5</Col>
</Row>
<Row>
  <Col flex="120px">120px</Col>
  <Col flex="auto">Fill remaining space</Col>
</Row>`,
    },
    {
      id: "grid-responsive",
      name: "Responsive columns",
      description: "Change spans and offsets at the xs, sm, md, lg, xl, xxl, and xxxl breakpoints.",
      preview: ResponsiveGrid,
      code: `<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} lg={8}>Project overview</Col>
  <Col xs={24} sm={12} lg={8}>Recent activity</Col>
  <Col xs={24} sm={24} lg={8}>Team members</Col>
</Row>`,
    },
    {
      id: "grid-breakpoints",
      name: "Breakpoint hook",
      description:
        "Read the active responsive breakpoints when behavior cannot be expressed in CSS.",
      preview: BreakpointExample,
      code: `const screens = Grid.useBreakpoint();

return screens.lg ? <DesktopActions /> : <MobileActions />;`,
    },
  ],
  api: [
    {
      name: "Row.gutter",
      type: "number | string | ResponsiveValue | [horizontal, vertical]",
      defaultValue: "0",
      description: "Sets horizontal and optional vertical spacing between columns.",
    },
    {
      name: "Row.justify",
      type: '"start" | "center" | "end" | "space-between" | "space-around" | "space-evenly" | ResponsiveValue',
      defaultValue: '"start"',
      description: "Distributes columns along the horizontal axis.",
    },
    {
      name: "Row.align",
      type: '"top" | "middle" | "bottom" | "stretch" | ResponsiveValue',
      defaultValue: '"top"',
      description: "Aligns columns along the vertical axis.",
    },
    {
      name: "Row.wrap",
      type: "boolean",
      defaultValue: "true",
      description: "Controls whether overflowing columns move to another line.",
    },
    {
      name: "Col.span",
      type: "number",
      description: "Sets the number of occupied cells from 0 through 24; zero hides the column.",
    },
    {
      name: "Col.offset",
      type: "number",
      defaultValue: "0",
      description: "Adds leading space measured in grid cells.",
    },
    {
      name: "Col.order",
      type: "number",
      defaultValue: "0",
      description: "Controls visual order within the row.",
    },
    {
      name: "Col.push / Col.pull",
      type: "number",
      defaultValue: "0",
      description: "Moves a column right or left by a number of cells.",
    },
    {
      name: "Col.flex",
      type: "number | string",
      description: "Sets a proportional, fixed, automatic, or raw CSS flex value.",
    },
    {
      name: "Col.xs … Col.xxxl",
      type: "number | { span?, offset?, order?, push?, pull?, flex? }",
      description: "Overrides column settings at a responsive breakpoint.",
    },
    {
      name: "Grid.useBreakpoint",
      type: "() => GridScreens",
      description: "Returns a boolean map of currently active breakpoints.",
    },
  ],
  accessibility: [
    "Grid controls visual layout only and preserves the DOM reading order.",
    "Do not use order, push, or pull to create a visual sequence that conflicts with keyboard or screen-reader order.",
    "Use semantic elements inside columns for headings, navigation, lists, and regions.",
  ],
});

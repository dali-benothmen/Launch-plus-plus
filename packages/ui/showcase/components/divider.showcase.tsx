import {
  Divider,
  type DividerSemanticClassNames,
  type DividerSemanticInfo,
  type DividerSemanticStyles,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const exampleCopy =
  "Launch++ keeps related project information together while preserving a clear visual hierarchy.";

function Copy() {
  return <p>{exampleCopy}</p>;
}

function HorizontalDividers() {
  return (
    <div className="showcase-divider-copy">
      <Copy />
      <Divider />
      <Copy />
      <Divider dashed />
      <Copy />
    </div>
  );
}

function DividerSpacing() {
  return (
    <div className="showcase-divider-copy">
      <Copy />
      <Divider size="small" />
      <Copy />
      <Divider size="medium" />
      <Copy />
      <Divider size="large" />
      <Copy />
    </div>
  );
}

function VerticalDividers() {
  return (
    <div className="showcase-divider-inline">
      <Typography.Text>Text</Typography.Text>
      <Divider orientation="vertical" />
      <Typography.Link href="#divider-vertical">Project</Typography.Link>
      <Divider vertical />
      <Typography.Link href="#divider-vertical">Team</Typography.Link>
    </div>
  );
}

const classNamesObject: DividerSemanticClassNames = {
  content: "showcase-divider-custom-content",
  rail: "showcase-divider-custom-rail",
  root: "showcase-divider-custom-root",
};

function classNamesFunction({ props }: DividerSemanticInfo): DividerSemanticClassNames {
  return {
    root:
      props.titlePlacement === "start"
        ? "showcase-divider-custom-start"
        : "showcase-divider-custom-default",
  };
}

const stylesObject: DividerSemanticStyles = {
  content: { fontStyle: "italic" },
  rail: { opacity: 0.85 },
  root: { borderStyle: "dashed", borderWidth: 2 },
};

function stylesFunction({ props }: DividerSemanticInfo): DividerSemanticStyles {
  return props.size === "small"
    ? { root: { cursor: "default", opacity: 0.6 } }
    : { root: { backgroundColor: "var(--launch-ui-surface-subtle)" } };
}

function SemanticStyling() {
  return (
    <div className="showcase-divider-copy">
      <Divider classNames={classNamesObject}>Class names object</Divider>
      <Divider classNames={classNamesFunction} titlePlacement="start">
        Class names function
      </Divider>
      <Divider styles={stylesObject}>Styles object</Divider>
      <Divider size="small" styles={stylesFunction}>
        Styles function
      </Divider>
    </div>
  );
}

function TitledDividers() {
  return (
    <div className="showcase-divider-copy">
      <Copy />
      <Divider>Centered title</Divider>
      <Copy />
      <Divider titlePlacement="start">Start title</Divider>
      <Copy />
      <Divider titlePlacement="end">End title</Divider>
      <Copy />
      <Divider styles={{ content: { margin: 0 } }} titlePlacement="start">
        Start title without margin
      </Divider>
      <Copy />
      <Divider styles={{ content: { margin: "0 50px" } }} titlePlacement="end">
        End title with custom margin
      </Divider>
      <Copy />
    </div>
  );
}

function PlainTitles() {
  return (
    <div className="showcase-divider-copy">
      <Copy />
      <Divider plain>Centered text</Divider>
      <Copy />
      <Divider plain titlePlacement="start">
        Start text
      </Divider>
      <Copy />
      <Divider plain titlePlacement="end">
        End text
      </Divider>
      <Copy />
    </div>
  );
}

function DividerVariants() {
  const lineStyle = { borderColor: "var(--launch-ui-primary)" };

  return (
    <div className="showcase-divider-copy">
      <Copy />
      <Divider style={lineStyle}>Solid</Divider>
      <Copy />
      <Divider style={lineStyle} variant="dotted">
        Dotted
      </Divider>
      <Copy />
      <Divider style={lineStyle} variant="dashed">
        Dashed
      </Divider>
      <Copy />
    </div>
  );
}

export const dividerShowcase = defineShowcase({
  id: "divider",
  name: "Divider",
  category: "Layout",
  stage: "prod",
  description: "Separates content into clear visual groups with a horizontal or vertical line.",
  usage: `import { Divider } from "@launchpp/ui";`,
  whenToUse: [
    "Use a horizontal divider to separate sections of related page content.",
    "Use a vertical divider to separate short inline labels, links, or actions.",
  ],
  examples: [
    {
      id: "divider-horizontal",
      name: "Horizontal",
      description: "A divider is horizontal by default and can use a solid or dashed line.",
      preview: HorizontalDividers,
      code: `<p>First section</p>
<Divider />
<p>Second section</p>
<Divider dashed />
<p>Third section</p>`,
    },
    {
      id: "divider-spacing",
      name: "Spacing size",
      description: "Size controls the vertical space around a horizontal divider.",
      preview: DividerSpacing,
      code: `<Divider size="small" />
<Divider size="medium" />
<Divider size="large" />`,
    },
    {
      id: "divider-vertical",
      name: "Vertical",
      description: "Use a vertical divider between compact inline content.",
      preview: VerticalDividers,
      code: `<span>Text</span>
<Divider orientation="vertical" />
<a href="#project">Project</a>
<Divider vertical />
<a href="#team">Team</a>`,
    },
    {
      id: "divider-semantic-styling",
      name: "Semantic styling",
      description: "Public root, content, and rail slots accept class names or inline styles.",
      preview: SemanticStyling,
      code: `const classNames = {
  root: "custom-root",
  content: "custom-content",
  rail: "custom-rail",
};

const styles = {
  root: { borderWidth: 2, borderStyle: "dashed" },
  content: { fontStyle: "italic" },
  rail: { opacity: 0.85 },
};

<Divider classNames={classNames}>Class names</Divider>
<Divider styles={styles}>Styles</Divider>`,
    },
    {
      id: "divider-title",
      name: "Divider with title",
      description: "Place an optional title at the start, center, or end of the line.",
      preview: TitledDividers,
      code: `<Divider>Centered title</Divider>
<Divider titlePlacement="start">Start title</Divider>
<Divider titlePlacement="end">End title</Divider>
<Divider titlePlacement="start" styles={{ content: { margin: 0 } }}>
  Start title without margin
</Divider>`,
    },
    {
      id: "divider-plain",
      name: "Plain title",
      description: "Plain removes the heading emphasis from divider text.",
      preview: PlainTitles,
      code: `<Divider plain>Centered text</Divider>
<Divider plain titlePlacement="start">Start text</Divider>
<Divider plain titlePlacement="end">End text</Divider>`,
    },
    {
      id: "divider-variant",
      name: "Line variants",
      description: "Choose a solid, dotted, or dashed line style.",
      preview: DividerVariants,
      code: `<Divider>Solid</Divider>
<Divider variant="dotted">Dotted</Divider>
<Divider variant="dashed">Dashed</Divider>`,
    },
  ],
  api: [
    {
      name: "children",
      type: "ReactNode",
      description: "Renders an optional title inside a horizontal divider.",
    },
    {
      name: "orientation",
      type: '"horizontal" | "vertical"',
      defaultValue: '"horizontal"',
      description: "Sets the direction of the divider.",
    },
    {
      name: "vertical",
      type: "boolean",
      defaultValue: "false",
      description: "Provides shorthand for vertical orientation; orientation takes precedence.",
    },
    {
      name: "size",
      type: '"small" | "medium" | "large"',
      description: "Controls spacing around a horizontal divider.",
    },
    {
      name: "titlePlacement",
      type: '"start" | "center" | "end"',
      defaultValue: '"center"',
      description: "Aligns the title within a horizontal divider.",
    },
    {
      name: "variant",
      type: '"solid" | "dotted" | "dashed"',
      defaultValue: '"solid"',
      description: "Sets the line style.",
    },
    {
      name: "dashed",
      type: "boolean",
      defaultValue: "false",
      description: "Provides shorthand for the dashed variant.",
    },
    {
      name: "plain",
      type: "boolean",
      defaultValue: "false",
      description: "Uses regular body styling for the title.",
    },
    {
      name: "classNames",
      type: "SemanticClassNames | (info) => SemanticClassNames",
      description: "Adds classes to the public root, content, and rail slots.",
    },
    {
      name: "styles",
      type: "SemanticStyles | (info) => SemanticStyles",
      description: "Adds inline styles to the public root, content, and rail slots.",
    },
  ],
  accessibility: [
    "Divider exposes separator semantics and its horizontal or vertical orientation.",
    "Do not use a divider as the only indication of a section heading or content relationship.",
    "Keep vertical dividers between short inline items rather than long text blocks.",
  ],
});

import { useState } from "react";
import { Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function DocumentExample() {
  return (
    <Typography>
      <Typography.Title>Building focused products</Typography.Title>
      <Typography.Paragraph>
        Product teams work best when design and engineering share a clear language. A consistent
        system reduces repeated decisions and keeps attention on the user’s work.
      </Typography.Paragraph>
      <Typography.Paragraph>
        Launch++ uses <Typography.Text strong>stable interaction patterns</Typography.Text> and a
        compact visual rhythm so teams can extend the product without losing consistency.
      </Typography.Paragraph>

      <Typography.Title level={2}>Guidelines and resources</Typography.Title>
      <Typography.Paragraph>
        Use <Typography.Text code>design.md</Typography.Text> as the visual source of truth and
        press
        <Typography.Text keyboard>Esc</Typography.Text> to close temporary overlays.
      </Typography.Paragraph>
      <ul>
        <li>
          <Typography.Link href="#typography-principles">Design principles</Typography.Link>
        </li>
        <li>
          <Typography.Link href="#typography-patterns">Interaction patterns</Typography.Link>
        </li>
        <li>
          <Typography.Link href="#typography-resources">Developer resources</Typography.Link>
        </li>
      </ul>
      <blockquote>
        Clear interfaces make complex work feel predictable without removing capability.
      </blockquote>
    </Typography>
  );
}

function TitleLevels() {
  return (
    <div className="showcase-typography-stack">
      <Typography.Title level={1}>h1. Launch++</Typography.Title>
      <Typography.Title level={2}>h2. Launch++</Typography.Title>
      <Typography.Title level={3}>h3. Launch++</Typography.Title>
      <Typography.Title level={4}>h4. Launch++</Typography.Title>
      <Typography.Title level={5}>h5. Launch++</Typography.Title>
    </div>
  );
}

function TextStyles() {
  return (
    <div className="showcase-typography-stack">
      <Typography.Text>Launch++ default text</Typography.Text>
      <Typography.Text type="secondary">Launch++ secondary text</Typography.Text>
      <Typography.Text type="success">Launch++ success text</Typography.Text>
      <Typography.Text type="warning">Launch++ warning text</Typography.Text>
      <Typography.Text type="danger">Launch++ danger text</Typography.Text>
      <Typography.Text disabled>Launch++ disabled text</Typography.Text>
      <Typography.Text mark>Launch++ marked text</Typography.Text>
      <Typography.Text code>pnpm ui:showcase</Typography.Text>
      <Typography.Text keyboard>Command K</Typography.Text>
      <Typography.Text underline>Launch++ underlined text</Typography.Text>
      <Typography.Text delete={true}>Launch++ deleted text</Typography.Text>
      <Typography.Text strong>Launch++ strong text</Typography.Text>
      <Typography.Text italic>Launch++ italic text</Typography.Text>
      <Typography.Link href="https://github.com" rel="noreferrer" target="_blank">
        Launch++ link
      </Typography.Link>
    </div>
  );
}

function EditableText() {
  const [text, setText] = useState("This project description is editable.");
  const [clickableText, setClickableText] = useState("Click this sentence to edit it.");

  return (
    <div className="showcase-typography-stack">
      <Typography.Paragraph editable={{ onChange: setText }}>{text}</Typography.Paragraph>
      <Typography.Paragraph
        editable={{
          autoSize: { maxRows: 4, minRows: 2 },
          maxLength: 120,
          onChange: setClickableText,
          tooltip: "Edit description",
          triggerType: ["icon", "text"],
        }}
      >
        {clickableText}
      </Typography.Paragraph>
      <Typography.Title editable level={4}>
        Editable project title
      </Typography.Title>
    </div>
  );
}

function CopyableText() {
  return (
    <div className="showcase-typography-stack">
      <Typography.Paragraph copyable>Copy this project identifier.</Typography.Paragraph>
      <Typography.Paragraph copyable={{ text: "launchpp-project-2048" }}>
        Copy a different underlying value.
      </Typography.Paragraph>
      <Typography.Paragraph copyable={{ tooltips: false }}>
        Copy without a tooltip.
      </Typography.Paragraph>
      <Typography.Paragraph actions={{ placement: "start" }} copyable>
        Place the copy action before the text.
      </Typography.Paragraph>
    </div>
  );
}

const longDescription =
  "Launch++ gives teams a focused place to organize projects, coordinate responsibilities, and extend workflows through plugins. The interface stays intentionally compact so important project information remains visible while teams move between planning, delivery, and review.";

function EllipsisText() {
  return (
    <div className="showcase-typography-stack">
      <Typography.Paragraph ellipsis>{longDescription}</Typography.Paragraph>
      <Typography.Paragraph
        ellipsis={{
          expandable: "collapsible",
          rows: 2,
          symbol: (expanded) => (expanded ? "less" : "more"),
        }}
      >
        {longDescription}
      </Typography.Paragraph>
      <Typography.Text ellipsis={{ tooltip: longDescription }} style={{ width: 260 }}>
        {longDescription}
      </Typography.Text>
      <Typography.Paragraph
        ellipsis={{ expandable: true, rows: 2, suffix: "— Launch++ product team" }}
      >
        {longDescription}
      </Typography.Paragraph>
    </div>
  );
}

function TypographyTable() {
  return (
    <Typography>
      <Typography.Title level={4}>Workspace plans</Typography.Title>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>Projects</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Community</td>
            <td>Free</td>
            <td>Unlimited personal projects</td>
          </tr>
          <tr>
            <td>Team</td>
            <td>$9 per member</td>
            <td>Shared projects and permissions</td>
          </tr>
          <tr>
            <td>Enterprise</td>
            <td>Contact us</td>
            <td>Advanced controls and support</td>
          </tr>
        </tbody>
      </table>
    </Typography>
  );
}

export const typographyShowcase = defineShowcase({
  id: "typography",
  name: "Typography",
  category: "General",
  stage: "prod",
  description: "Formats headings, body content, links, and interactive text behaviors.",
  whenToUse: [
    "Use Typography for articles, descriptions, notes, and other structured written content.",
    "Use copyable, editable, or ellipsis behavior only when the text genuinely needs that interaction.",
  ],
  examples: [
    {
      id: "typography-document",
      name: "Document",
      description: "The root component provides consistent styling for structured written content.",
      preview: DocumentExample,
      code: `<Typography>\n  <Typography.Title>Building focused products</Typography.Title>\n  <Typography.Paragraph>\n    Product teams work best when design and engineering share a clear language.\n  </Typography.Paragraph>\n  <Typography.Title level={2}>Guidelines and resources</Typography.Title>\n  <ul>\n    <li><Typography.Link href="#">Design principles</Typography.Link></li>\n  </ul>\n</Typography>`,
    },
    {
      id: "typography-titles",
      name: "Title levels",
      preview: TitleLevels,
      code: `<Typography.Title level={1}>h1. Launch++</Typography.Title>\n<Typography.Title level={2}>h2. Launch++</Typography.Title>\n<Typography.Title level={3}>h3. Launch++</Typography.Title>\n<Typography.Title level={4}>h4. Launch++</Typography.Title>\n<Typography.Title level={5}>h5. Launch++</Typography.Title>`,
    },
    {
      id: "typography-text-styles",
      name: "Text and link styles",
      preview: TextStyles,
      code: `<Typography.Text type="secondary">Secondary text</Typography.Text>\n<Typography.Text type="success">Success text</Typography.Text>\n<Typography.Text mark>Marked text</Typography.Text>\n<Typography.Text code>pnpm ui:showcase</Typography.Text>\n<Typography.Text keyboard>Command K</Typography.Text>\n<Typography.Text strong>Strong text</Typography.Text>\n<Typography.Link href="https://example.com">Link</Typography.Link>`,
    },
    {
      id: "typography-editable",
      name: "Editable",
      description: "Press Enter to save or Escape to cancel an edit.",
      preview: EditableText,
      code: `const [text, setText] = useState("This project description is editable.");\n\n<Typography.Paragraph editable={{ onChange: setText }}>\n  {text}\n</Typography.Paragraph>`,
    },
    {
      id: "typography-copyable",
      name: "Copyable",
      preview: CopyableText,
      code: `<Typography.Paragraph copyable>Copy this value.</Typography.Paragraph>\n<Typography.Paragraph copyable={{ text: "launchpp-project-2048" }}>\n  Copy a different underlying value.\n</Typography.Paragraph>`,
    },
    {
      id: "typography-ellipsis",
      name: "Ellipsis",
      preview: EllipsisText,
      code: `<Typography.Paragraph ellipsis>Long content...</Typography.Paragraph>\n<Typography.Paragraph ellipsis={{ rows: 2, expandable: "collapsible" }}>\n  Long content...\n</Typography.Paragraph>\n<Typography.Text ellipsis={{ tooltip: "Full content" }} style={{ width: 260 }}>\n  Long inline content...\n</Typography.Text>`,
    },
    {
      id: "typography-table",
      name: "Native table",
      description: "The root component styles native tables used inside document content.",
      preview: TypographyTable,
      code: `<Typography>\n  <Typography.Title level={4}>Workspace plans</Typography.Title>\n  <table>\n    <thead>...</thead>\n    <tbody>...</tbody>\n  </table>\n</Typography>`,
    },
  ],
  api: [
    {
      name: "type",
      type: '"secondary" | "success" | "warning" | "danger"',
      defaultValue: '"default"',
      description: "Applies a semantic text color.",
    },
    {
      name: "editable",
      type: "boolean | EditableConfig",
      defaultValue: "false",
      description: "Allows the text to be edited in place.",
    },
    {
      name: "copyable",
      type: "boolean | CopyableConfig",
      defaultValue: "false",
      description: "Adds a clipboard action with copied feedback.",
    },
    {
      name: "ellipsis",
      type: "boolean | EllipsisConfig",
      defaultValue: "false",
      description: "Truncates long content and can provide expansion or a tooltip.",
    },
  ],
  accessibility: [
    "Choose heading levels according to document structure rather than visual size.",
    "Links must describe their destination without relying on surrounding text.",
    "Do not hide essential information permanently behind ellipsis.",
  ],
});

import { Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function TypographyScale() {
  return (
    <div className="showcase-preview-stack">
      <Typography.Title level={1}>Heading 1</Typography.Title>
      <Typography.Title level={2}>Heading 2</Typography.Title>
      <Typography.Title level={3}>Heading 3</Typography.Title>
      <Typography.Title level={4}>Heading 4</Typography.Title>
      <Typography.Title level={5}>Heading 5</Typography.Title>
      <Typography.Text>Default text</Typography.Text>
      <Typography.Text type="secondary">Secondary text</Typography.Text>
    </div>
  );
}

export const typographyShowcase = defineShowcase({
  id: "typography",
  name: "Typography",
  category: "General",
  stage: "prod",
  description: "Provides the shared heading and body-text hierarchy.",
  whenToUse: ["Use semantic heading levels that match the document structure."],
  examples: [
    {
      id: "typography-scale",
      name: "Type scale",
      preview: TypographyScale,
      code: `<Typography.Title level={1}>Heading 1</Typography.Title>\n<Typography.Title level={2}>Heading 2</Typography.Title>\n<Typography.Text>Default text</Typography.Text>\n<Typography.Text type="secondary">Secondary text</Typography.Text>`,
    },
  ],
  accessibility: [
    "Do not choose a heading level for its size alone.",
    "Keep heading levels in a logical sequence.",
  ],
});

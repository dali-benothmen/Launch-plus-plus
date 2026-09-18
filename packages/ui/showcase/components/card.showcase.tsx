import { Card, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicCard() {
  return (
    <Card>
      <Typography.Title level={5}>Project summary</Typography.Title>
      <Typography.Text type="secondary">A simple container for related content.</Typography.Text>
    </Card>
  );
}

export const cardShowcase = defineShowcase({
  id: "card",
  name: "Card",
  category: "Data display",
  stage: "prod",
  description: "Groups related information and actions in a bounded surface.",
  whenToUse: ["Use a card when a group needs visual separation from nearby content."],
  examples: [
    {
      id: "card-basic",
      name: "Basic card",
      preview: BasicCard,
      code: `<Card>\n  <Typography.Title level={5}>Project summary</Typography.Title>\n  <Typography.Text type="secondary">\n    A simple container for related content.\n  </Typography.Text>\n</Card>`,
    },
  ],
  accessibility: ["Use a meaningful heading when the card represents a distinct section."],
});

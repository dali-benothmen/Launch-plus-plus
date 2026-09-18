import { Card, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function CardContent() {
  return (
    <div className="showcase-card-content">
      <Typography.Text>Card content</Typography.Text>
      <Typography.Text>Card content</Typography.Text>
      <Typography.Text>Card content</Typography.Text>
    </div>
  );
}

function BasicCards() {
  return (
    <div className="showcase-preview-stack">
      <Card
        extra={<Typography.Link href="#card-basic">More</Typography.Link>}
        style={{ width: 300 }}
        title="Default size card"
      >
        <CardContent />
      </Card>
      <Card
        extra={<Typography.Link href="#card-basic">More</Typography.Link>}
        size="small"
        style={{ width: 300 }}
        title="Small size card"
      >
        <CardContent />
      </Card>
    </div>
  );
}

function BorderlessCard() {
  return (
    <div className="showcase-card-surface">
      <Card style={{ width: 300 }} title="Card title" variant="borderless">
        <CardContent />
      </Card>
    </div>
  );
}

function SimpleCard() {
  return (
    <Card style={{ width: 300 }}>
      <CardContent />
    </Card>
  );
}

function CustomizedCard() {
  return (
    <Card
      cover={
        <img
          alt="A European street with colorful buildings"
          draggable={false}
          src="https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png"
        />
      }
      hoverable
      style={{ width: 240 }}
      variant="borderless"
    >
      <Card.Meta description="www.instagram.com" title="Europe Street beat" />
    </Card>
  );
}

export const cardShowcase = defineShowcase({
  id: "card",
  name: "Card",
  category: "Data display",
  stage: "prod",
  description: "Groups related information and actions in a bounded surface.",
  whenToUse: [
    "Use a card when a group needs visual separation from nearby content.",
    "Use the small size only where a denser presentation is useful.",
  ],
  examples: [
    {
      id: "card-basic",
      name: "Basic card",
      description:
        "A card with a title, content, and an extra action. It supports medium and small sizes.",
      preview: BasicCards,
      code: `<div style={{ display: "grid", gap: 16 }}>
  <Card title="Default size card" extra={<Typography.Link href="#">More</Typography.Link>}>
    <p>Card content</p>
    <p>Card content</p>
    <p>Card content</p>
  </Card>

  <Card size="small" title="Small size card" extra={<Typography.Link href="#">More</Typography.Link>}>
    <p>Card content</p>
    <p>Card content</p>
    <p>Card content</p>
  </Card>
</div>`,
    },
    {
      id: "card-borderless",
      name: "No border",
      description: "A borderless card on a gray background.",
      preview: BorderlessCard,
      code: `<Card title="Card title" variant="borderless" style={{ width: 300 }}>
  <p>Card content</p>
  <p>Card content</p>
  <p>Card content</p>
</Card>`,
    },
    {
      id: "card-simple",
      name: "Simple card",
      description: "A simple card containing only a content area.",
      preview: SimpleCard,
      code: `<Card style={{ width: 300 }}>
  <p>Card content</p>
  <p>Card content</p>
  <p>Card content</p>
</Card>`,
    },
    {
      id: "card-customized",
      name: "Customized content",
      description: "Use Card.Meta with a cover to create flexible content layouts.",
      preview: CustomizedCard,
      code: `<Card
  hoverable
  variant="borderless"
  style={{ width: 240 }}
  cover={<img draggable={false} alt="A European street" src="/street.jpg" />}
>
  <Card.Meta title="Europe Street beat" description="www.instagram.com" />
</Card>`,
    },
  ],
  api: [
    {
      name: "title",
      type: "ReactNode",
      description: "Renders the card header title.",
    },
    {
      name: "extra",
      type: "ReactNode",
      description: "Renders an action at the end of the card header.",
    },
    {
      name: "size",
      type: '"medium" | "small"',
      defaultValue: '"medium"',
      description: "Controls header and body density.",
    },
    {
      name: "variant",
      type: '"outlined" | "borderless"',
      defaultValue: '"outlined"',
      description: "Controls whether the card uses its default border.",
    },
    {
      name: "cover",
      type: "ReactNode",
      description: "Renders media between the header and body.",
    },
    {
      name: "hoverable",
      type: "boolean",
      defaultValue: "false",
      description: "Adds hover affordance for interactive cards.",
    },
  ],
  accessibility: [
    "Use a meaningful heading when the card represents a distinct section.",
    "Use an explicit link or button for card actions; hover elevation alone is not an interaction.",
    "Cover images need useful alternative text unless they are decorative.",
  ],
});

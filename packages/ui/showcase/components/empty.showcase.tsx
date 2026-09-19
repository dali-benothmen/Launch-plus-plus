import { FolderOpenOutlined } from "../../src/icons.js";
import { Button, Empty, Flex, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicEmpty() {
  return <Empty />;
}

function SimpleEmpty() {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
}

function CustomEmpty() {
  return (
    <Empty
      description={
        <Typography.Text type="secondary">
          Create a project to start organizing your work.
        </Typography.Text>
      }
      image={<FolderOpenOutlined />}
      styles={{ image: { color: "var(--launch-ui-primary)", fontSize: 48, height: 48 } }}
    >
      <Button variant="primary">Create project</Button>
    </Empty>
  );
}

function EmptyVariants() {
  return (
    <Flex gap="large" vertical>
      <Empty description={false} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      <Empty description="No matching tasks" image={null} />
    </Flex>
  );
}

function SemanticEmpty() {
  return (
    <Empty
      classNames={{ root: "project-empty-state" }}
      description="No archived projects"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      styles={{
        description: { color: "var(--launch-ui-text)" },
        root: { border: "1px solid var(--launch-ui-border-soft)", borderRadius: 8, padding: 24 },
      }}
    />
  );
}

export const emptyShowcase = defineShowcase({
  id: "empty",
  name: "Empty",
  category: "Data display",
  stage: "prod",
  description: "Explains why a content region has no data and can offer a relevant next action.",
  usage: 'import { Empty } from "@launchpp/ui";',
  whenToUse: [
    "Use Empty when a list, board, search, or project area has no content to display.",
    "Explain the reason for the empty state and offer one useful next action when possible.",
  ],
  examples: [
    {
      id: "empty-basic",
      name: "Basic",
      description: "The default illustration and description provide a neutral empty state.",
      preview: BasicEmpty,
      code: `<Empty />`,
    },
    {
      id: "empty-simple",
      name: "Simple image",
      description: "Use the compact built-in illustration in smaller content areas.",
      preview: SimpleEmpty,
      code: `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />`,
    },
    {
      id: "empty-custom",
      name: "Custom content",
      description:
        "Customize the image and description, then compose an existing Button as the action.",
      preview: CustomEmpty,
      code: `<Empty
  image={<FolderOpenOutlined />}
  description="Create a project to start organizing your work."
>
  <Button variant="primary">Create project</Button>
</Empty>`,
    },
    {
      id: "empty-variants",
      name: "Without image or description",
      description:
        "Hide optional regions when the surrounding interface already provides enough context.",
      preview: EmptyVariants,
      code: `<Empty description={false} image={Empty.PRESENTED_IMAGE_SIMPLE} />
<Empty description="No matching tasks" image={null} />`,
    },
    {
      id: "empty-semantic",
      name: "Semantic styling",
      description: "Customize documented regions without targeting private DOM structure.",
      preview: SemanticEmpty,
      code: `<Empty
  classNames={{ root: "project-empty-state" }}
  description="No archived projects"
  image={Empty.PRESENTED_IMAGE_SIMPLE}
  styles={{ description: { color: "var(--launch-ui-text)" } }}
/>`,
    },
  ],
  api: [
    {
      name: "description",
      description: "Sets or hides the empty-state description.",
      type: "ReactNode | false",
      defaultValue: '"No data"',
    },
    {
      name: "image",
      description: "Sets a custom image, image URL, or one of the built-in illustrations.",
      type: "ReactNode | string",
      defaultValue: "Empty.PRESENTED_IMAGE_DEFAULT",
    },
    {
      name: "children",
      description: "Renders actions or supporting content in the footer.",
      type: "ReactNode",
    },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "EmptyClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "EmptyStyles | function",
    },
  ],
  accessibility: [
    "Built-in illustrations are decorative and hidden from assistive technology.",
    "Custom image URLs use the description as alternative text when it is a string.",
    "Use a real Button or link for actions rather than making the entire empty state clickable.",
  ],
});

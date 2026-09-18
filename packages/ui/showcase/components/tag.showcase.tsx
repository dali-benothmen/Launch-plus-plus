import { Tag } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function TagColors() {
  return (
    <div className="showcase-preview-row">
      <Tag>Neutral</Tag>
      <Tag color="blue">Blue</Tag>
      <Tag color="green">Green</Tag>
      <Tag color="purple">Purple</Tag>
      <Tag color="blue" variant="filled">
        Filled
      </Tag>
      <Tag color="green" variant="solid">
        Solid
      </Tag>
    </div>
  );
}

export const tagShowcase = defineShowcase({
  id: "tag",
  name: "Tag",
  category: "Data display",
  stage: "prod",
  description: "Labels a record with compact categorical information.",
  whenToUse: ["Use tags for short statuses, categories, or attributes."],
  examples: [
    {
      id: "tag-colors",
      name: "Colors and variants",
      preview: TagColors,
      code: `<Tag>Neutral</Tag>\n<Tag color="blue">Blue</Tag>\n<Tag color="green">Green</Tag>\n<Tag color="purple">Purple</Tag>\n<Tag color="blue" variant="filled">Filled</Tag>`,
    },
  ],
  accessibility: ["Do not rely on tag color alone to communicate meaning."],
});

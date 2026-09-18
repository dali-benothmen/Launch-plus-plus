import { Input } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function InputVariants() {
  return (
    <div className="showcase-preview-stack showcase-preview-constrained">
      <Input aria-label="Outlined input" placeholder="Outlined" />
      <Input aria-label="Filled input" placeholder="Filled" variant="filled" />
      <Input aria-label="Borderless input" placeholder="Borderless" variant="borderless" />
      <Input aria-label="Underlined input" placeholder="Underlined" variant="underlined" />
      <Input aria-label="Rounded input" placeholder="Rounded search" shape="round" type="search" />
    </div>
  );
}

export const inputShowcase = defineShowcase({
  id: "input",
  name: "Input",
  category: "Data entry",
  stage: "prod",
  description: "Collects short text values from a user.",
  whenToUse: ["Use an input for a single line of text, search, email, or another short value."],
  examples: [
    {
      id: "input-variants",
      name: "Variants and shape",
      preview: InputVariants,
      code: `<Input placeholder="Outlined" />\n<Input variant="filled" placeholder="Filled" />\n<Input variant="borderless" placeholder="Borderless" />\n<Input variant="underlined" placeholder="Underlined" />\n<Input shape="round" type="search" placeholder="Rounded search" />`,
    },
  ],
  api: [
    {
      name: "shape",
      type: '"default" | "round"',
      defaultValue: '"default"',
      description: "Controls the input corner shape.",
    },
    {
      name: "variant",
      type: '"outlined" | "filled" | "borderless" | "underlined"',
      defaultValue: '"outlined"',
      description: "Controls the input surface and border treatment.",
    },
  ],
  accessibility: ["Every input must have a visible label or an accessible name."],
});

import { Button } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function ButtonVariants() {
  return (
    <div className="showcase-preview-row">
      <Button variant="primary">Primary</Button>
      <Button>Default</Button>
      <Button variant="dashed">Dashed</Button>
      <Button variant="filled">Filled</Button>
      <Button variant="text">Text</Button>
      <Button variant="link">Link</Button>
    </div>
  );
}

export const buttonShowcase = defineShowcase({
  id: "button",
  name: "Button",
  category: "General",
  stage: "prod",
  description: "Triggers an action or submits a form.",
  whenToUse: [
    "Use a primary button for the most important action in a section.",
    "Use default or text variants for supporting actions.",
  ],
  examples: [
    {
      id: "button-variants",
      name: "Variants",
      description: "Use visual priority to communicate the importance of an action.",
      preview: ButtonVariants,
      code: `<Button variant="primary">Primary</Button>\n<Button>Default</Button>\n<Button variant="dashed">Dashed</Button>\n<Button variant="filled">Filled</Button>\n<Button variant="text">Text</Button>\n<Button variant="link">Link</Button>`,
    },
  ],
  api: [
    {
      name: "variant",
      type: '"primary" | "default" | "dashed" | "filled" | "text" | "link"',
      defaultValue: '"default"',
      description: "Sets the visual priority of the button.",
    },
    {
      name: "size",
      type: '"small" | "medium" | "large"',
      defaultValue: '"medium"',
      description: "Sets the control height and horizontal padding.",
    },
  ],
  accessibility: [
    "Use a concise action label.",
    "Provide an aria-label when the button contains only an icon.",
  ],
});

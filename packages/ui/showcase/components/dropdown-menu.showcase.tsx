import { Button, DropdownMenu } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicDropdownMenu() {
  return (
    <DropdownMenu
      align="start"
      items={[
        { id: "edit", label: "Edit details" },
        { id: "duplicate", label: "Make a copy" },
        { danger: true, id: "archive", label: "Archive item", separatorBefore: true },
      ]}
      trigger={<Button>Open menu</Button>}
    />
  );
}

export const dropdownMenuShowcase = defineShowcase({
  id: "dropdown-menu",
  name: "Dropdown menu",
  category: "Overlays",
  stage: "prod",
  description: "Presents a compact list of contextual actions.",
  whenToUse: ["Use a dropdown when secondary actions do not need to remain visible."],
  examples: [
    {
      id: "dropdown-menu-basic",
      name: "Action menu",
      preview: BasicDropdownMenu,
      code: `<DropdownMenu\n  trigger={<Button>Open menu</Button>}\n  items={[\n    { id: "edit", label: "Edit details" },\n    { id: "duplicate", label: "Make a copy" },\n    { id: "archive", label: "Archive item", danger: true, separatorBefore: true },\n  ]}\n/>`,
    },
  ],
  accessibility: ["Use action-oriented labels that describe what selecting each item will do."],
});

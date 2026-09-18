import { Select } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const teamOptions = [
  { label: "Design team", value: "design" },
  { label: "Engineering", value: "engineering" },
  { label: "Marketing", value: "marketing" },
] as const;

function BasicSelect() {
  return (
    <div className="showcase-preview-constrained">
      <Select
        ariaLabel="Team"
        defaultValue="design"
        options={teamOptions}
        placeholder="Select a team"
      />
    </div>
  );
}

export const selectShowcase = defineShowcase({
  id: "select",
  name: "Select",
  category: "Data entry",
  stage: "prod",
  description: "Lets a user choose one value from a predefined list.",
  whenToUse: ["Use a select when the available choices are known and only one can be selected."],
  examples: [
    {
      id: "select-basic",
      name: "Basic select",
      preview: BasicSelect,
      code: `<Select\n  ariaLabel="Team"\n  defaultValue="design"\n  options={teamOptions}\n  placeholder="Select a team"\n/>`,
    },
  ],
  accessibility: ["Provide a specific ariaLabel describing the value being selected."],
});

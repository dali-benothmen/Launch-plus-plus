import { Button, Dialog, DialogClose, Input, Select } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const roleOptions = [
  { label: "Member", value: "member" },
  { label: "Administrator", value: "administrator" },
] as const;

function BasicDialog() {
  return (
    <Dialog
      description="They will receive access to the selected workspace."
      footer={
        <>
          <DialogClose asChild>
            <Button>Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="primary">Send invitation</Button>
          </DialogClose>
        </>
      }
      title="Invite a teammate"
      trigger={<Button variant="primary">Open dialog</Button>}
    >
      <div className="showcase-preview-stack">
        <Input aria-label="Email address" placeholder="name@company.com" type="email" />
        <Select
          ariaLabel="Role"
          defaultValue="member"
          options={roleOptions}
          placeholder="Select a role"
        />
      </div>
    </Dialog>
  );
}

export const dialogShowcase = defineShowcase({
  id: "dialog",
  name: "Dialog",
  category: "Overlays",
  stage: "prod",
  description: "Focuses attention on a task that must be completed or dismissed.",
  whenToUse: ["Use a dialog for short, focused workflows that should interrupt the current page."],
  examples: [
    {
      id: "dialog-basic",
      name: "Form dialog",
      preview: BasicDialog,
      code: `<Dialog\n  title="Invite a teammate"\n  description="They will receive access to the selected workspace."\n  trigger={<Button variant="primary">Open dialog</Button>}\n  footer={<>...</>}\n>\n  <Input placeholder="name@company.com" />\n  <Select ariaLabel="Role" options={roleOptions} />\n</Dialog>`,
    },
  ],
  accessibility: [
    "Give every dialog a concise title and use the description for supporting context.",
  ],
});

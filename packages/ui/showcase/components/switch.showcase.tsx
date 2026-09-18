import { Switch, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function SwitchSizes() {
  return (
    <div className="showcase-preview-stack">
      <div className="showcase-control-label">
        <Switch ariaLabel="Enable notifications" defaultChecked />
        <Typography.Text>Notifications</Typography.Text>
      </div>
      <div className="showcase-control-label">
        <Switch ariaLabel="Enable compact mode" size="small" />
        <Typography.Text>Compact mode</Typography.Text>
      </div>
    </div>
  );
}

export const switchShowcase = defineShowcase({
  id: "switch",
  name: "Switch",
  category: "Data entry",
  stage: "prod",
  description: "Toggles a setting between enabled and disabled states.",
  whenToUse: ["Use a switch when a setting takes effect immediately."],
  examples: [
    {
      id: "switch-sizes",
      name: "Sizes",
      preview: SwitchSizes,
      code: `<Switch ariaLabel="Enable notifications" defaultChecked />\n<Switch ariaLabel="Enable compact mode" size="small" />`,
    },
  ],
  accessibility: ["Pair the switch with a clear label that describes the setting."],
});

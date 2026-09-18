import { Tabs, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicTabs() {
  return (
    <Tabs
      ariaLabel="Project details"
      defaultValue="overview"
      items={[
        {
          content: <Typography.Text>Project overview content</Typography.Text>,
          label: "Overview",
          value: "overview",
        },
        {
          content: <Typography.Text>Recent project activity</Typography.Text>,
          label: "Activity",
          value: "activity",
        },
        {
          content: <Typography.Text>Project settings</Typography.Text>,
          label: "Settings",
          value: "settings",
        },
      ]}
    />
  );
}

export const tabsShowcase = defineShowcase({
  id: "tabs",
  name: "Tabs",
  category: "Navigation",
  stage: "prod",
  description: "Switches between related views within the same context.",
  whenToUse: ["Use tabs for a small set of peer views that share the same page context."],
  examples: [
    {
      id: "tabs-basic",
      name: "Basic tabs",
      preview: BasicTabs,
      code: `<Tabs\n  ariaLabel="Project details"\n  defaultValue="overview"\n  items={[\n    { label: "Overview", value: "overview", content: <>...</> },\n    { label: "Activity", value: "activity", content: <>...</> },\n  ]}\n/>`,
    },
  ],
  accessibility: ["Give the tab list an ariaLabel that describes the views it controls."],
});

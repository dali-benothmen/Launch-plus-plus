import { Alert } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function AlertStatuses() {
  return (
    <div className="showcase-preview-stack">
      <Alert description="The project was created successfully." status="success" title="Success" />
      <Alert description="There is additional information to review." title="Information" />
      <Alert description="Check this value before continuing." status="warning" title="Warning" />
      <Alert description="The operation could not be completed." status="error" title="Error" />
    </div>
  );
}

export const alertShowcase = defineShowcase({
  id: "alert",
  name: "Alert",
  category: "Feedback",
  stage: "prod",
  description: "Communicates an important status, warning, or outcome.",
  whenToUse: ["Use alerts for information that should remain visible until it is addressed."],
  examples: [
    {
      id: "alert-statuses",
      name: "Statuses",
      preview: AlertStatuses,
      code: `<Alert status="success" title="Success" description="The project was created successfully." />\n<Alert title="Information" description="There is additional information to review." />\n<Alert status="warning" title="Warning" description="Check this value before continuing." />\n<Alert status="error" title="Error" description="The operation could not be completed." />`,
    },
  ],
  accessibility: ["Use the error status only for failures that require immediate attention."],
});

import { useState } from "react";
import { CloseCircleFilled, SmileOutlined } from "../../src/icons.js";
import {
  Button,
  Flex,
  Result,
  type ResultStatus,
  Segmented,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

type OutcomeStatus = Extract<ResultStatus, "error" | "info" | "warning">;
type ExceptionStatus = Extract<ResultStatus, "403" | "404" | "500">;

function SuccessResult() {
  return (
    <Result
      extra={
        <>
          <Button variant="primary">Open project</Button>
          <Button>Create another</Button>
        </>
      }
      status="success"
      subTitle="Your project is ready and the team can start adding tasks."
      title="Project created successfully"
    />
  );
}

function StatusResults() {
  const [status, setStatus] = useState<OutcomeStatus>("info");
  const content = {
    info: ["Plugin installed", "The plugin is ready to configure."],
    warning: ["Review required", "Some requested permissions need approval."],
    error: ["Installation failed", "The plugin package could not be verified."],
  } as const;
  const [title, subTitle] = content[status];

  return (
    <Flex gap="medium" vertical>
      <Segmented<OutcomeStatus>
        onChange={setStatus}
        options={["info", "warning", "error"]}
        value={status}
      />
      <Result
        extra={<Button variant="primary">Continue</Button>}
        status={status}
        subTitle={subTitle}
        title={title}
      />
    </Flex>
  );
}

function ExceptionResults() {
  const [status, setStatus] = useState<ExceptionStatus>("404");
  const content = {
    "403": ["403", "You do not have permission to view this project."],
    "404": ["404", "The project or page could not be found."],
    "500": ["500", "Something went wrong while loading this page."],
  } as const;
  const [title, subTitle] = content[status];

  return (
    <Flex gap="medium" vertical>
      <Segmented<ExceptionStatus>
        onChange={setStatus}
        options={["403", "404", "500"]}
        value={status}
      />
      <Result
        extra={<Button variant="primary">Back home</Button>}
        status={status}
        subTitle={subTitle}
        title={title}
      />
    </Flex>
  );
}

function DetailedErrorResult() {
  return (
    <Result
      extra={
        <>
          <Button variant="primary">Try again</Button>
          <Button>Cancel</Button>
        </>
      }
      status="error"
      subTitle="Review the following issues before trying again."
      title="Plugin installation failed"
    >
      <Space size="small" vertical>
        <Typography.Text strong>The package could not be installed:</Typography.Text>
        <Typography.Text>
          <CloseCircleFilled style={{ color: "var(--launch-ui-error)" }} /> The manifest is missing
          a required plugin identifier.
        </Typography.Text>
        <Typography.Text>
          <CloseCircleFilled style={{ color: "var(--launch-ui-error)" }} /> The requested SDK
          version is not available.
        </Typography.Text>
      </Space>
    </Result>
  );
}

function CustomResult() {
  return (
    <Result
      extra={<Button variant="primary">Next</Button>}
      icon={<SmileOutlined />}
      subTitle="All requested actions have finished."
      title="Everything is ready"
    />
  );
}

function SemanticResult() {
  return (
    <Result
      classNames={{ root: "plugin-result" }}
      extra={<Button>Done</Button>}
      status="success"
      styles={{
        icon: { fontSize: 56 },
        title: { color: "var(--launch-ui-primary)" },
      }}
      subTitle="The component regions can be styled through the public contract."
      title="Semantic styling"
    />
  );
}

export const resultShowcase = defineShowcase({
  id: "result",
  name: "Result",
  category: "Feedback",
  stage: "prod",
  description: "Presents the outcome of an important operation and the user's next actions.",
  usage: 'import { Result } from "@launchpp/ui";',
  whenToUse: [
    "Use Result when an important operation needs richer feedback than a Message or Notification can provide.",
    "Keep the title decisive, explain useful context in the subtitle, and provide only the next relevant actions.",
  ],
  examples: [
    {
      id: "result-success",
      name: "Success",
      description: "Confirm completion and offer the most relevant next actions.",
      preview: SuccessResult,
      code: `<Result
  status="success"
  title="Project created successfully"
  subTitle="Your project is ready and the team can start adding tasks."
  extra={
    <>
      <Button variant="primary">Open project</Button>
      <Button>Create another</Button>
    </>
  }
/>`,
    },
    {
      id: "result-statuses",
      name: "Information, warning, and error",
      description: "Choose a status that accurately reflects the operation outcome.",
      preview: StatusResults,
      code: `<Result
  status="warning"
  title="Review required"
  subTitle="Some requested permissions need approval."
  extra={<Button variant="primary">Continue</Button>}
/>`,
    },
    {
      id: "result-exceptions",
      name: "Exception pages",
      description: "Use the 403, 404, and 500 states for full-page access and system failures.",
      preview: ExceptionResults,
      code: `<Result
  status="404"
  title="404"
  subTitle="The project or page could not be found."
  extra={<Button variant="primary">Back home</Button>}
/>`,
    },
    {
      id: "result-error",
      name: "Detailed error",
      description: "Place actionable supporting details in the content region.",
      preview: DetailedErrorResult,
      code: `<Result
  status="error"
  title="Plugin installation failed"
  subTitle="Review the following issues before trying again."
  extra={<Button variant="primary">Try again</Button>}
>
  <ErrorDetails />
</Result>`,
    },
    {
      id: "result-custom",
      name: "Custom icon",
      description:
        "Replace the status icon when a product-specific outcome needs different imagery.",
      preview: CustomResult,
      code: `<Result
  icon={<SmileOutlined />}
  title="Everything is ready"
  subTitle="All requested actions have finished."
  extra={<Button variant="primary">Next</Button>}
/>`,
    },
    {
      id: "result-semantic",
      name: "Semantic styling",
      description: "Customize documented regions without targeting private DOM structure.",
      preview: SemanticResult,
      code: `<Result
  classNames={{ root: "plugin-result" }}
  status="success"
  title="Semantic styling"
  styles={{
    icon: { fontSize: 56 },
    title: { color: "var(--launch-ui-primary)" },
  }}
/>`,
    },
  ],
  api: [
    {
      name: "status",
      description: "Sets the outcome type and default icon.",
      type: '"success" | "error" | "info" | "warning" | "403" | "404" | "500"',
      defaultValue: '"info"',
    },
    { name: "title", description: "Displays the primary outcome message.", type: "ReactNode" },
    {
      name: "subTitle",
      description: "Displays supporting context below the title.",
      type: "ReactNode",
    },
    { name: "icon", description: "Replaces the default status icon.", type: "ReactNode" },
    { name: "extra", description: "Renders the action area.", type: "ReactNode" },
    { name: "children", description: "Renders detailed supporting content.", type: "ReactNode" },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "ResultClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "ResultStyles | function",
    },
  ],
  accessibility: [
    "Error and exception results use an alert role; other outcomes use a status role.",
    "The title must state the outcome in text because status icons are decorative.",
    "Order actions by importance and use the primary Button only for the recommended next step.",
  ],
});

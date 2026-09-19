import { useEffect, useState } from "react";
import {
  Button,
  Flex,
  Input,
  Modal,
  type ModalProps,
  Select,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function ModalContent() {
  return (
    <Flex gap="small" vertical>
      <Typography.Paragraph>Review the project details before continuing.</Typography.Paragraph>
      <Typography.Paragraph>
        The modal keeps this decision in context without navigating away from the page.
      </Typography.Paragraph>
    </Flex>
  );
}

function BasicModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary">
        Open modal
      </Button>
      <Modal
        closable={{ "aria-label": "Close project modal" }}
        onCancel={() => setOpen(false)}
        onOk={() => setOpen(false)}
        open={open}
        title="Basic modal"
      >
        <ModalContent />
      </Modal>
    </>
  );
}

function FormModal() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Invite a teammate</Button>
      <Modal
        onCancel={close}
        onOk={close}
        okText="Send invitation"
        open={open}
        title="Invite a teammate"
      >
        <Flex gap="middle" vertical>
          <Input aria-label="Email address" placeholder="name@company.com" type="email" />
          <Select
            ariaLabel="Role"
            defaultValue="member"
            options={[
              { label: "Member", value: "member" },
              { label: "Administrator", value: "administrator" },
            ]}
            placeholder="Select a role"
          />
        </Flex>
      </Modal>
    </>
  );
}

function FooterModal() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open custom footer</Button>
      <Modal
        footer={(_origin, { CancelBtn, OkBtn }) => (
          <>
            <Button variant="text">Save draft</Button>
            <CancelBtn />
            <OkBtn />
          </>
        )}
        onCancel={close}
        onOk={close}
        okText="Publish"
        open={open}
        title="Publish project"
      >
        <ModalContent />
      </Modal>
    </>
  );
}

function LoadingModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open || !loading) return;
    const timeout = window.setTimeout(() => setLoading(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [loading, open]);
  const show = () => {
    setLoading(true);
    setOpen(true);
  };
  return (
    <>
      <Button onClick={show}>Open loading modal</Button>
      <Modal loading={loading} onCancel={() => setOpen(false)} open={open} title="Project details">
        <ModalContent />
      </Modal>
    </>
  );
}

function AsyncModal() {
  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const handleOk = () => {
    setConfirmLoading(true);
    window.setTimeout(() => {
      setConfirmLoading(false);
      setOpen(false);
    }, 1600);
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Submit asynchronously</Button>
      <Modal
        confirmLoading={confirmLoading}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        open={open}
        title="Archive project"
      >
        <Typography.Paragraph>
          The project will be archived after the server confirms the operation.
        </Typography.Paragraph>
      </Modal>
    </>
  );
}

function PositionModal() {
  const [mode, setMode] = useState<"centered" | "wide">();
  return (
    <>
      <Space wrap>
        <Button onClick={() => setMode("wide")}>Wide modal</Button>
        <Button onClick={() => setMode("centered")}>Centered modal</Button>
      </Space>
      <Modal
        centered={mode === "centered"}
        onCancel={() => setMode(undefined)}
        onOk={() => setMode(undefined)}
        open={mode !== undefined}
        title={mode === "centered" ? "Centered modal" : "720px modal"}
        width={mode === "wide" ? 720 : 520}
      >
        <ModalContent />
      </Modal>
    </>
  );
}

type MaskMode = "blur" | "dimmed" | "none";

function MaskModal() {
  const [mode, setMode] = useState<MaskMode>();
  const mask =
    mode === "blur" ? { blur: true } : mode === "none" ? { closable: false, enabled: false } : true;
  return (
    <>
      <Space wrap>
        <Button onClick={() => setMode("blur")}>Blur mask</Button>
        <Button onClick={() => setMode("dimmed")}>Dimmed mask</Button>
        <Button onClick={() => setMode("none")}>No mask</Button>
      </Space>
      <Modal
        mask={mask}
        onCancel={() => setMode(undefined)}
        onOk={() => setMode(undefined)}
        open={mode !== undefined}
        title={`${mode ?? "Dimmed"} mask`}
      >
        <ModalContent />
      </Modal>
    </>
  );
}

function SemanticModal() {
  const [open, setOpen] = useState(false);
  const styles: ModalProps["styles"] = ({ props }) => ({
    body: { paddingBlock: 8 },
    title: { color: props.open ? "#1668dc" : undefined },
  });
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open styled modal</Button>
      <Modal
        classNames={{ body: "showcase-modal-body" }}
        onCancel={() => setOpen(false)}
        onOk={() => setOpen(false)}
        open={open}
        styles={styles}
        title="Semantic styling"
      >
        <ModalContent />
      </Modal>
    </>
  );
}

export const modalShowcase = defineShowcase({
  id: "modal",
  name: "Modal",
  category: "Feedback",
  stage: "prod",
  description: "Presents a focused decision or workflow in a layer above the current page.",
  usage: 'import { Modal } from "@launchpp/ui";',
  whenToUse: [
    "Use Modal when a user must review information, make a decision, or complete a short task without leaving the page.",
    "Use Drawer when the task benefits from more room or preserving visible page context.",
    "Avoid stacking modals; move complex multi-step work to a dedicated page.",
  ],
  examples: [
    {
      id: "modal-basic",
      name: "Basic",
      description:
        "Control visibility from the parent and close through OK, Cancel, the mask, or Escape.",
      preview: BasicModal,
      code: `<Button onClick={() => setOpen(true)}>Open modal</Button>
<Modal
  title="Basic modal"
  open={open}
  onOk={() => setOpen(false)}
  onCancel={() => setOpen(false)}
>
  Review the project details before continuing.
</Modal>`,
    },
    {
      id: "modal-form",
      name: "Form workflow",
      description:
        "Compose existing fields inside the content area and give the primary action a specific label.",
      preview: FormModal,
      code: `<Modal title="Invite a teammate" open={open} okText="Send invitation" onOk={close} onCancel={close}>
  <Input placeholder="name@company.com" />
  <Select options={roleOptions} />
</Modal>`,
    },
    {
      id: "modal-footer",
      name: "Customized footer",
      description:
        "Replace the footer or extend the standard Cancel and OK actions with a render function.",
      preview: FooterModal,
      code: `<Modal
  footer={(_, { CancelBtn, OkBtn }) => (
    <><Button variant="text">Save draft</Button><CancelBtn /><OkBtn /></>
  )}
/>`,
    },
    {
      id: "modal-loading",
      name: "Loading content",
      description: "Keep the modal structure stable while its content is loading.",
      preview: LoadingModal,
      code: `<Modal title="Project details" open={open} loading={loading} onCancel={close}>
  <ProjectDetails />
</Modal>`,
    },
    {
      id: "modal-async",
      name: "Asynchronous confirmation",
      description:
        "Use confirmLoading while the primary action is waiting for an operation to finish.",
      preview: AsyncModal,
      code: `<Modal
  title="Archive project"
  open={open}
  confirmLoading={confirmLoading}
  onOk={archiveProject}
  onCancel={close}
/>`,
    },
    {
      id: "modal-position",
      name: "Width and position",
      description:
        "Set a specific width and opt into vertical centering when the content benefits from it.",
      preview: PositionModal,
      code: `<Modal width={720} open={open} title="Wide modal" />
<Modal centered open={centeredOpen} title="Centered modal" />`,
    },
    {
      id: "modal-mask",
      name: "Mask",
      description: "Use a dimmed, blurred, or disabled mask to match the interruption level.",
      preview: MaskModal,
      code: `<Modal mask={{ blur: true }} open={open} />
<Modal mask={false} open={openWithoutMask} />`,
    },
    {
      id: "modal-semantic",
      name: "Semantic styling",
      description:
        "Target documented slots with classNames and styles without relying on internal DOM selectors.",
      preview: SemanticModal,
      code: `<Modal
  classNames={{ body: "project-modal-body" }}
  styles={{ body: { paddingBlock: 8 } }}
/>`,
    },
  ],
  api: [
    {
      name: "open",
      description: "Controls whether the modal is visible.",
      type: "boolean",
      defaultValue: "false",
    },
    { name: "title", description: "Content rendered in the modal header.", type: "ReactNode" },
    {
      name: "onOk",
      description: "Runs when the primary action is selected.",
      type: "(event) => unknown",
    },
    {
      name: "onCancel",
      description: "Runs after Cancel, close, mask, or Escape requests dismissal.",
      type: "(event) => void",
    },
    {
      name: "footer",
      description: "Replaces or extends the standard action row; use null to hide it.",
      type: "ReactNode | render function",
    },
    {
      name: "confirmLoading",
      description: "Shows a loading state on the OK button.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "loading",
      description: "Shows a skeleton in place of body content.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "mask",
      description: "Configures mask visibility, blur, and click-to-close behavior.",
      type: "boolean | ModalMaskConfig",
      defaultValue: "true",
    },
    {
      name: "centered",
      description: "Vertically centers the modal in the viewport.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "width",
      description: "Sets the modal width while preserving viewport gutters.",
      type: "number | string",
      defaultValue: "520",
    },
    {
      name: "classNames",
      description: "Adds classes to documented semantic slots.",
      type: "ModalClassNames | function",
    },
    {
      name: "styles",
      description: "Adds inline styles to documented semantic slots.",
      type: "ModalStyles | function",
    },
  ],
  accessibility: [
    "Give every modal a concise title that identifies the decision or task.",
    "Keep Escape and mask dismissal disabled when closing would silently discard important work.",
    "Focus is trapped while a masked modal is open and returns to the previous control after closing.",
  ],
});

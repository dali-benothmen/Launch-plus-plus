import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  type DrawerPlacement,
  type DrawerProps,
  Flex,
  Form,
  Input,
  Segmented,
  Select,
  Space,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function DrawerCopy() {
  return (
    <Flex gap="small" vertical>
      <Typography.Paragraph>
        Keep related work in context without leaving the page.
      </Typography.Paragraph>
      <Typography.Paragraph>
        Drawers work well for details, compact forms, and secondary workflows.
      </Typography.Paragraph>
      <Typography.Paragraph>
        Press Escape or use the close button when finished.
      </Typography.Paragraph>
    </Flex>
  );
}

function BasicDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary">
        Open drawer
      </Button>
      <Drawer onClose={() => setOpen(false)} open={open} title="Basic Drawer">
        <DrawerCopy />
      </Drawer>
    </>
  );
}

function PlacementDrawer() {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<DrawerPlacement>("right");
  return (
    <Flex align="flex-start" gap="middle" vertical>
      <Segmented<DrawerPlacement>
        onChange={setPlacement}
        options={["top", "right", "bottom", "left"]}
        value={placement}
      />
      <Button onClick={() => setOpen(true)} variant="primary">
        Open {placement} drawer
      </Button>
      <Drawer
        key={placement}
        onClose={() => setOpen(false)}
        open={open}
        placement={placement}
        title={`${placement[0]?.toUpperCase()}${placement.slice(1)} Drawer`}
      >
        <DrawerCopy />
      </Drawer>
    </Flex>
  );
}

function ActionsDrawer() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer with actions</Button>
      <Drawer
        extra={
          <Space>
            <Button onClick={close} size="small">
              Cancel
            </Button>
            <Button onClick={close} size="small" variant="primary">
              Save
            </Button>
          </Space>
        }
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button onClick={close} variant="primary">
              Save changes
            </Button>
          </>
        }
        onClose={close}
        open={open}
        size={500}
        title="Edit project"
      >
        <DrawerCopy />
      </Drawer>
    </>
  );
}

function FormDrawer() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary">
        Create project
      </Button>
      <Drawer
        extra={
          <Space>
            <Button onClick={close}>Cancel</Button>
            <Button onClick={close} variant="primary">
              Create
            </Button>
          </Space>
        }
        onClose={close}
        open={open}
        size={520}
        title="Create a new project"
      >
        <Form layout="vertical" requiredMark={false}>
          <Form.Item label="Project name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Launch mobile app" />
          </Form.Item>
          <Form.Item label="Visibility" name="visibility">
            <Select
              options={[
                { label: "Private", value: "private" },
                { label: "Workspace", value: "workspace" },
              ]}
              placeholder="Choose visibility"
            />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea placeholder="Describe the project" rows={4} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}

function SizeDrawer() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<"default" | "large">("default");
  return (
    <Flex align="flex-start" gap="middle" vertical>
      <Segmented<"default" | "large">
        onChange={setSize}
        options={[
          { label: "Default (378px)", value: "default" },
          { label: "Large (736px)", value: "large" },
        ]}
        value={size}
      />
      <Button onClick={() => setOpen(true)}>Open sized drawer</Button>
      <Drawer
        onClose={() => setOpen(false)}
        open={open}
        size={size}
        title={`${size === "large" ? "Large" : "Default"} Drawer`}
      >
        <DrawerCopy />
      </Drawer>
    </Flex>
  );
}

function ResizableDrawer() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(378);
  return (
    <Flex align="flex-start" gap="small" vertical>
      <Typography.Text>Current size: {Math.round(size)}px</Typography.Text>
      <Button onClick={() => setOpen(true)}>Open resizable drawer</Button>
      <Drawer
        maxSize={720}
        onClose={() => setOpen(false)}
        open={open}
        resizable={{ onResize: setSize }}
        size={size}
        title="Resizable Drawer"
      >
        <Typography.Paragraph>
          Drag the left edge to adjust this drawer between 180px and 720px.
        </Typography.Paragraph>
      </Drawer>
    </Flex>
  );
}

type MaskMode = "blur" | "dimmed" | "none";

function MaskDrawer() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MaskMode>("dimmed");
  const mask =
    mode === "blur" ? { blur: true } : mode === "none" ? { closable: false, enabled: false } : true;
  const show = (nextMode: MaskMode) => {
    setMode(nextMode);
    setOpen(true);
  };
  return (
    <>
      <Space wrap>
        <Button onClick={() => show("blur")}>Blur mask</Button>
        <Button onClick={() => show("dimmed")}>Dimmed mask</Button>
        <Button onClick={() => show("none")}>No mask</Button>
      </Space>
      <Drawer mask={mask} onClose={() => setOpen(false)} open={open} title={`${mode} drawer`}>
        <DrawerCopy />
      </Drawer>
    </>
  );
}

function LoadingDrawer() {
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
      <Button onClick={show}>Open loading drawer</Button>
      <Drawer loading={loading} onClose={() => setOpen(false)} open={open} title="Project details">
        <DrawerCopy />
      </Drawer>
    </>
  );
}

function NestedDrawer() {
  const [open, setOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const closeParent = () => {
    setChildOpen(false);
    setOpen(false);
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open nested workflow</Button>
      <Drawer onClose={closeParent} open={open} size={520} title="Project settings">
        <Flex align="flex-start" gap="middle" vertical>
          <Typography.Paragraph>
            Keep the parent task available while opening a related subtask.
          </Typography.Paragraph>
          <Button onClick={() => setChildOpen(true)} variant="primary">
            Configure permissions
          </Button>
        </Flex>
        <Drawer onClose={() => setChildOpen(false)} open={childOpen} size={320} title="Permissions">
          <Typography.Paragraph>Choose who can view and edit this project.</Typography.Paragraph>
        </Drawer>
      </Drawer>
    </>
  );
}

function ClosePlacementDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open with end close button</Button>
      <Drawer
        closable={{ placement: "end" }}
        onClose={() => setOpen(false)}
        open={open}
        title="Close button placement"
      >
        <DrawerCopy />
      </Drawer>
    </>
  );
}

function SemanticDrawer() {
  const [open, setOpen] = useState(false);
  const styles: DrawerProps["styles"] = ({ props }) => ({
    body: { padding: 20 },
    header: { borderBottomColor: props.open ? "#91caff" : undefined },
  });
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open styled drawer</Button>
      <Drawer
        classNames={{ body: "showcase-drawer-body" }}
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
        onClose={() => setOpen(false)}
        open={open}
        styles={styles}
        title="Semantic styling"
      >
        <DrawerCopy />
      </Drawer>
    </>
  );
}

export const drawerShowcase = defineShowcase({
  id: "drawer",
  name: "Drawer",
  category: "Feedback",
  stage: "prod",
  description: "Slides a focused panel from an edge while preserving the current page context.",
  whenToUse: [
    "Use Drawer for details, forms, or secondary tasks that should not replace the current page.",
    "Use a Modal instead when the task is short, blocking, and requires immediate attention.",
    "Keep drawer workflows focused; use a full page when the content needs substantial navigation.",
  ],
  examples: [
    {
      id: "drawer-basic",
      name: "Basic",
      description: "A right-side drawer with a title, close button, mask, and focus handling.",
      preview: BasicDrawer,
      code: `<Button onClick={() => setOpen(true)}>Open drawer</Button>
<Drawer title="Basic Drawer" open={open} onClose={() => setOpen(false)}>
  <p>Drawer content</p>
</Drawer>`,
    },
    {
      id: "drawer-placement",
      name: "Placement",
      description: "Drawers can enter from any edge of the viewport.",
      preview: PlacementDrawer,
      code: `<Drawer placement="left" title="Left Drawer" open={open} onClose={close}>
  Drawer content
</Drawer>`,
    },
    {
      id: "drawer-actions",
      name: "Extra actions and footer",
      description: "Place contextual actions in the header and workflow actions in the footer.",
      preview: ActionsDrawer,
      code: `<Drawer
  title="Edit project"
  open={open}
  onClose={close}
  extra={<Space><Button>Cancel</Button><Button variant="primary">Save</Button></Space>}
  footer={<><Button>Cancel</Button><Button variant="primary">Save changes</Button></>}
>
  Drawer content
</Drawer>`,
    },
    {
      id: "drawer-form",
      name: "Form in drawer",
      description: "Reuse the Form and field components for contextual create or edit workflows.",
      preview: FormDrawer,
      code: `<Drawer title="Create a new project" size={520} open={open} onClose={close}>
  <Form layout="vertical">
    <Form.Item label="Project name" name="name"><Input /></Form.Item>
  </Form>
</Drawer>`,
    },
    {
      id: "drawer-size",
      name: "Preset size",
      description: "Use the 378px default, 736px large preset, or a custom CSS length.",
      preview: SizeDrawer,
      code: `<Drawer size="large" title="Large Drawer" open={open} onClose={close} />`,
    },
    {
      id: "drawer-resizable",
      name: "Resizable",
      description: "Allow edge dragging when the content benefits from adjustable space.",
      preview: ResizableDrawer,
      code: `<Drawer
  resizable={{ onResize: setSize }}
  size={size}
  maxSize={720}
  open={open}
  onClose={close}
/>`,
    },
    {
      id: "drawer-mask",
      name: "Mask",
      description: "Choose a dimmed mask, blurred mask, or a surface without a mask.",
      preview: MaskDrawer,
      code: `<Drawer mask={{ blur: true }} open={open} onClose={close} />
<Drawer mask={false} open={open} onClose={close} />`,
    },
    {
      id: "drawer-loading",
      name: "Loading",
      description: "Replace body content with a skeleton while drawer data is loading.",
      preview: LoadingDrawer,
      code: `<Drawer loading={loading} title="Project details" open={open} onClose={close} />`,
    },
    {
      id: "drawer-nested",
      name: "Nested drawer",
      description: "Open a second drawer for a related subtask while retaining parent context.",
      preview: NestedDrawer,
      code: `<Drawer title="Project settings" open={open} onClose={close}>
  <Drawer title="Permissions" open={childOpen} onClose={closeChild}>
    Permission settings
  </Drawer>
</Drawer>`,
    },
    {
      id: "drawer-close-placement",
      name: "Close placement",
      description: "Move the close button to the end of the header when needed.",
      preview: ClosePlacementDrawer,
      code: `<Drawer closable={{ placement: "end" }} title="Drawer" open={open} onClose={close} />`,
    },
    {
      id: "drawer-semantic",
      name: "Semantic styling",
      description: "Customize documented regions without targeting private DOM structure.",
      preview: SemanticDrawer,
      code: `<Drawer
  classNames={{ body: "project-drawer-body" }}
  styles={{ body: { padding: 20 } }}
  open={open}
  onClose={close}
/>`,
    },
  ],
  api: [
    {
      name: "open",
      description: "Controls whether the drawer is visible.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "onClose",
      description: "Runs when close, mask, or Escape dismissal is requested.",
      type: "(event) => void",
    },
    { name: "title", description: "Header title content.", type: "ReactNode" },
    {
      name: "placement",
      description: "Viewport edge used by the drawer.",
      type: '"top" | "right" | "bottom" | "left"',
      defaultValue: '"right"',
    },
    {
      name: "size",
      description: "Preset or custom width/height according to placement.",
      type: '"default" | "large" | number | string',
      defaultValue: '"default"',
    },
    {
      name: "closable",
      description: "Configures the close button and placement.",
      type: "boolean | DrawerClosableConfig",
      defaultValue: "true",
    },
    {
      name: "mask",
      description: "Configures mask visibility, blur, and dismissal.",
      type: "boolean | DrawerMaskConfig",
      defaultValue: "true",
    },
    {
      name: "keyboard",
      description: "Allows Escape to request closing.",
      type: "boolean",
      defaultValue: "true",
    },
    { name: "extra", description: "Extra actions rendered in the header.", type: "ReactNode" },
    { name: "footer", description: "Persistent footer content.", type: "ReactNode" },
    {
      name: "loading",
      description: "Shows a body skeleton while content loads.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "resizable",
      description: "Enables edge dragging and resize callbacks.",
      type: "boolean | DrawerResizableConfig",
      defaultValue: "false",
    },
    {
      name: "maxSize",
      description: "Maximum resizable width or height in pixels.",
      type: "number",
    },
    {
      name: "destroyOnHidden",
      description: "Unmounts drawer content after closing.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "getContainer",
      description: "Selects the portal container or disables portalling.",
      type: "HTMLElement | function | string | false",
      defaultValue: "document.body",
    },
    {
      name: "classNames",
      description: "Classes for documented semantic regions.",
      type: "DrawerClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for documented semantic regions.",
      type: "DrawerStyles | function",
    },
  ],
  accessibility: [
    "The drawer traps focus while its mask is active and restores focus to the trigger by default.",
    "Escape and mask-click dismissal can be disabled for workflows that must be completed.",
    "Provide a concise title and an accessible label for any custom close icon.",
  ],
});

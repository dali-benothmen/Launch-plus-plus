import { useState } from "react";
import { DeleteOutlined, InboxOutlined, PlusOutlined, UploadOutlined } from "../../src/icons.js";
import {
  Button,
  Flex,
  Space,
  Typography,
  Upload,
  type UploadFile,
  type UploadProps,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const initialFiles: ReadonlyArray<UploadFile> = [
  { uid: "default-1", name: "project-brief.pdf", status: "done" },
  { uid: "default-2", name: "research-notes.txt", status: "done" },
  { uid: "default-3", name: "large-export.zip", percent: 68, status: "uploading" },
];

function imageData(label: string, color: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="12" fill="${color}"/><circle cx="60" cy="46" r="19" fill="white" fill-opacity=".8"/><path d="M21 101 49 69l18 19 13-13 20 26" fill="white" fill-opacity=".8"/><text x="60" y="114" text-anchor="middle" font-family="Arial" font-size="10" fill="white">${label}</text></svg>`,
  )}`;
}

const pictureFiles: ReadonlyArray<UploadFile> = [
  {
    uid: "picture-1",
    name: "workspace.png",
    status: "done",
    thumbUrl: imageData("Workspace", "#1668dc"),
    type: "image/png",
  },
  {
    uid: "picture-2",
    name: "planning.png",
    status: "done",
    thumbUrl: imageData("Planning", "#52c41a"),
    type: "image/png",
  },
];

function BasicUpload() {
  return (
    <Upload>
      <Button icon={<UploadOutlined />}>Click to upload</Button>
    </Upload>
  );
}

function DefaultFilesUpload() {
  return (
    <Upload
      defaultFileList={initialFiles}
      showUploadList={{
        extra: (file) =>
          file.status === "uploading" ? `${Math.round(file.percent ?? 0)}%` : undefined,
      }}
    >
      <Button icon={<UploadOutlined />}>Add file</Button>
    </Upload>
  );
}

function DragUpload() {
  return (
    <Upload.Dragger multiple>
      <div className="showcase-upload-drag-icon">
        <InboxOutlined />
      </div>
      <Typography.Title level={4}>Click or drag files to this area</Typography.Title>
      <Typography.Text type="secondary">
        Select one or several files. This example keeps them in the browser.
      </Typography.Text>
    </Upload.Dragger>
  );
}

function ValidatedUpload() {
  const [message, setMessage] = useState("Only PNG files are accepted.");
  return (
    <Space size="medium" vertical>
      <Upload
        accept="image/png"
        beforeUpload={(file) => {
          const valid = file.type === "image/png";
          setMessage(valid ? `${file.name} is ready.` : `${file.name} is not a PNG file.`);
          return valid || Upload.LIST_IGNORE;
        }}
      >
        <Button icon={<UploadOutlined />}>Select PNG</Button>
      </Upload>
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function ControlledUpload() {
  const [files, setFiles] = useState<ReadonlyArray<UploadFile>>([
    { uid: "controlled-1", name: "requirements.md", status: "done" },
  ]);
  return (
    <Space size="medium" vertical>
      <Upload fileList={files} onChange={({ fileList }) => setFiles(fileList)} multiple>
        <Button icon={<UploadOutlined />}>Select files</Button>
      </Upload>
      <Button disabled={files.length === 0} onClick={() => setFiles([])} size="small">
        Clear list
      </Button>
    </Space>
  );
}

function SimulatedUpload() {
  const request: UploadProps["customRequest"] = ({ file, onProgress, onSuccess }) => {
    let percent = 0;
    const timer = window.setInterval(() => {
      percent += 20;
      onProgress({ percent });
      if (percent >= 100) {
        window.clearInterval(timer);
        onSuccess({ stored: file.name });
      }
    }, 220);
  };

  return (
    <Upload action="/uploads" customRequest={request}>
      <Button icon={<UploadOutlined />}>Simulate upload</Button>
    </Upload>
  );
}

function PictureUploads() {
  return (
    <Flex align="start" gap="large" wrap="wrap">
      <Space size="small" vertical>
        <Typography.Text strong>Picture card</Typography.Text>
        <Upload defaultFileList={pictureFiles} listType="picture-card" maxCount={3} />
      </Space>
      <Space size="small" vertical>
        <Typography.Text strong>Picture circle</Typography.Text>
        <Upload defaultFileList={pictureFiles.slice(0, 1)} listType="picture-circle" maxCount={2} />
      </Space>
    </Flex>
  );
}

function DirectoryAndPasteUpload() {
  return (
    <Flex align="start" gap="large" wrap="wrap">
      <Upload directory>
        <Button icon={<UploadOutlined />}>Select directory</Button>
      </Upload>
      <Upload pastable>
        <div className="showcase-upload-paste" tabIndex={-1}>
          Paste a file here
        </div>
      </Upload>
    </Flex>
  );
}

function CustomListUpload() {
  return (
    <Upload
      defaultFileList={initialFiles.slice(0, 2)}
      showUploadList={{
        extra: (file) => `${((file.size ?? 245_000) / 1_000).toFixed(0)} KB`,
        removeIcon: <DeleteOutlined />,
        showPreviewIcon: false,
      }}
    >
      <Button icon={<PlusOutlined />}>Add attachment</Button>
    </Upload>
  );
}

export const uploadShowcase = defineShowcase({
  id: "upload",
  name: "Upload",
  category: "Data entry",
  stage: "prod",
  description:
    "Selects files, presents upload progress, and supports click or drag-and-drop input.",
  whenToUse: [
    "Use Upload when people need to attach one or more files to a record or send them to a server.",
    "Use Dragger when dropping several files is a primary part of the workflow.",
  ],
  examples: [
    {
      id: "upload-basic",
      name: "Upload by clicking",
      description: "The classic trigger opens the browser file picker.",
      preview: BasicUpload,
      code: `<Upload>\n  <Button icon={<UploadOutlined />}>Click to upload</Button>\n</Upload>`,
    },
    {
      id: "upload-default-files",
      name: "Default files",
      description: "Seed the list with existing, uploading, or failed files.",
      preview: DefaultFilesUpload,
      code: `<Upload defaultFileList={[\n  { uid: "1", name: "project-brief.pdf", status: "done" },\n  { uid: "2", name: "large-export.zip", status: "uploading", percent: 68 },\n]}>\n  <Button icon={<UploadOutlined />}>Add file</Button>\n</Upload>`,
    },
    {
      id: "upload-drag",
      name: "Drag and drop",
      description: "Dragger accepts clicking, keyboard activation, and dropped files.",
      preview: DragUpload,
      code: `<Upload.Dragger multiple>\n  <InboxOutlined />\n  <Typography.Title level={4}>Click or drag files to this area</Typography.Title>\n  <Typography.Text type="secondary">Select one or several files.</Typography.Text>\n</Upload.Dragger>`,
    },
    {
      id: "upload-validation",
      name: "Validate before upload",
      description: "Reject a file or keep it out of the list with Upload.LIST_IGNORE.",
      preview: ValidatedUpload,
      code: `<Upload\n  accept="image/png"\n  beforeUpload={(file) =>\n    file.type === "image/png" || Upload.LIST_IGNORE\n  }\n>\n  <Button icon={<UploadOutlined />}>Select PNG</Button>\n</Upload>`,
    },
    {
      id: "upload-controlled",
      name: "Controlled file list",
      description: "Application state can own the complete list and update it through onChange.",
      preview: ControlledUpload,
      code: `<Upload\n  fileList={files}\n  onChange={({ fileList }) => setFiles(fileList)}\n  multiple\n>\n  <Button icon={<UploadOutlined />}>Select files</Button>\n</Upload>`,
    },
    {
      id: "upload-progress",
      name: "Upload progress",
      description: "Use customRequest to connect any storage client and report its progress.",
      preview: SimulatedUpload,
      code: `<Upload\n  action="/uploads"\n  customRequest={({ file, onProgress, onSuccess }) => {\n    storage.upload(file, { onProgress }).then(onSuccess);\n  }}\n>\n  <Button icon={<UploadOutlined />}>Upload file</Button>\n</Upload>`,
    },
    {
      id: "upload-pictures",
      name: "Picture styles",
      description:
        "Picture card and circle variants expose previews and hide the trigger at maxCount.",
      preview: PictureUploads,
      code: `<Upload\n  defaultFileList={pictures}\n  listType="picture-card"\n  maxCount={3}\n/>\n<Upload listType="picture-circle" maxCount={2} />`,
    },
    {
      id: "upload-directory-paste",
      name: "Directory and paste",
      description:
        "Select a folder or focus the paste surface and paste a file from the clipboard.",
      preview: DirectoryAndPasteUpload,
      code: `<Upload directory>\n  <Button icon={<UploadOutlined />}>Select directory</Button>\n</Upload>\n\n<Upload pastable>\n  <div>Paste a file here</div>\n</Upload>`,
    },
    {
      id: "upload-custom-list",
      name: "Custom list actions",
      description: "Choose visible actions, icons, and supplementary file information.",
      preview: CustomListUpload,
      code: `<Upload\n  showUploadList={{\n    extra: (file) => formatSize(file.size),\n    removeIcon: <DeleteOutlined />,\n    showPreviewIcon: false,\n  }}\n>\n  <Button icon={<PlusOutlined />}>Add attachment</Button>\n</Upload>`,
    },
  ],
  api: [
    { name: "accept", description: "Limits selectable file types.", type: "string | { format }" },
    {
      name: "action",
      description: "Upload endpoint or a function that resolves one.",
      type: "string | (file) => string | Promise<string>",
    },
    {
      name: "beforeUpload",
      description: "Validates or transforms a file before a request starts.",
      type: "(file, files) => boolean | File | Blob | Promise | Upload.LIST_IGNORE",
    },
    {
      name: "customRequest",
      description: "Replaces the built-in XMLHttpRequest transport.",
      type: "(options) => void",
    },
    {
      name: "defaultFileList",
      description: "Sets the initial uncontrolled list.",
      type: "UploadFile[]",
      defaultValue: "[]",
    },
    { name: "fileList", description: "Controls the displayed file list.", type: "UploadFile[]" },
    {
      name: "directory",
      description: "Allows directory selection where the browser supports it.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "listType",
      description: "Selects the built-in list presentation.",
      type: '"text" | "picture" | "picture-card" | "picture-circle"',
      defaultValue: '"text"',
    },
    {
      name: "maxCount",
      description: "Limits the list; one replaces the current file.",
      type: "number",
    },
    {
      name: "multiple",
      description: "Allows selecting more than one file.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "pastable",
      description: "Accepts clipboard files while the root is focused.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "showUploadList",
      description: "Shows the list and configures its actions.",
      type: "boolean | UploadListConfig",
      defaultValue: "true",
    },
    {
      name: "onChange",
      description: "Runs whenever a file or its upload status changes.",
      type: "(info) => void",
    },
    {
      name: "onRemove",
      description: "Runs before removal; returning false keeps the file.",
      type: "(file) => boolean | Promise<boolean>",
    },
  ],
  accessibility: [
    "Use a visible action label that describes what will be attached; icon-only triggers need an accessible name.",
    "Dragger supports Enter and Space in addition to pointer-based dropping.",
  ],
});

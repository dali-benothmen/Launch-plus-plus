import { useState } from "react";
import { Pagination, Space, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicPagination() {
  return <Pagination defaultCurrent={1} total={50} />;
}

function AlignedPagination() {
  return (
    <div className="showcase-pagination-stack">
      <div>
        <Typography.Text type="secondary">Start</Typography.Text>
        <Pagination align="start" defaultCurrent={1} total={50} />
      </div>
      <div>
        <Typography.Text type="secondary">Center</Typography.Text>
        <Pagination align="center" defaultCurrent={1} total={50} />
      </div>
      <div>
        <Typography.Text type="secondary">End</Typography.Text>
        <Pagination align="end" defaultCurrent={1} total={50} />
      </div>
    </div>
  );
}

function MorePagesPagination() {
  return <Pagination defaultCurrent={6} total={500} />;
}

function SizeChangerPagination() {
  const [message, setMessage] = useState("Change the page size");
  return (
    <Space size="large" vertical>
      <Pagination
        defaultCurrent={3}
        onShowSizeChange={(current, pageSize) =>
          setMessage(`Page ${current}, ${pageSize} items per page`)
        }
        showSizeChanger
        total={500}
      />
      <Pagination defaultCurrent={3} disabled showSizeChanger total={500} />
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function QuickJumperPagination() {
  const [message, setMessage] = useState("Enter a page and press Enter");
  return (
    <Space size="large" vertical>
      <Pagination
        defaultCurrent={2}
        onChange={(page) => setMessage(`Page ${page}`)}
        showQuickJumper
        total={500}
      />
      <Pagination defaultCurrent={2} disabled showQuickJumper total={500} />
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Space>
  );
}

function TotalPagination() {
  return (
    <Pagination
      defaultCurrent={2}
      showTotal={(total, [start, end]) => `${start}-${end} of ${total} items`}
      total={85}
    />
  );
}

function SimplePagination() {
  return (
    <Space size="large" vertical>
      <Pagination defaultCurrent={4} simple total={120} />
      <Pagination defaultCurrent={4} simple={{ readOnly: true }} total={120} />
    </Space>
  );
}

function PaginationSizes() {
  return (
    <Space size="large" vertical>
      <Pagination defaultCurrent={3} size="large" total={70} />
      <Pagination defaultCurrent={3} total={70} />
      <Pagination defaultCurrent={3} size="small" total={70} />
    </Space>
  );
}

function CustomItemPagination() {
  return (
    <Pagination
      defaultCurrent={2}
      itemRender={(_page, type, originalElement) => {
        if (type === "prev") return "Previous";
        if (type === "next") return "Next";
        return originalElement;
      }}
      showSizeChanger={false}
      total={80}
    />
  );
}

function SemanticPagination() {
  return (
    <Pagination
      classNames={{ root: "showcase-pagination-semantic-root" }}
      defaultCurrent={3}
      styles={{ item: { borderRadius: 999 }, root: { padding: 8 } }}
      total={80}
    />
  );
}

export const paginationShowcase = defineShowcase({
  id: "pagination",
  name: "Pagination",
  category: "Navigation",
  stage: "prod",
  description: "Divides large collections into navigable pages that load one range at a time.",
  usage: `import { Pagination } from "@launchpp/ui";`,
  whenToUse: [
    "Use Pagination when rendering or loading the full collection would be slow or overwhelming.",
    "Keep the current page controlled when it must stay synchronized with a URL or remote query.",
  ],
  examples: [
    {
      id: "pagination-basic",
      name: "Basic",
      description: "A basic pagination control with five pages.",
      preview: BasicPagination,
      code: `<Pagination defaultCurrent={1} total={50} />`,
    },
    {
      id: "pagination-align",
      name: "Align",
      description: "Align the complete control at the start, center, or end of its container.",
      preview: AlignedPagination,
      code: `<Pagination align="start" defaultCurrent={1} total={50} />
<Pagination align="center" defaultCurrent={1} total={50} />
<Pagination align="end" defaultCurrent={1} total={50} />`,
    },
    {
      id: "pagination-more",
      name: "More pages",
      description: "Long ranges collapse into interactive jump controls.",
      preview: MorePagesPagination,
      code: `<Pagination defaultCurrent={6} total={500} />`,
    },
    {
      id: "pagination-changer",
      name: "Changer",
      description: "Allow users to change how many items appear on each page.",
      preview: SizeChangerPagination,
      code: `<Pagination
  showSizeChanger
  defaultCurrent={3}
  total={500}
  onShowSizeChange={(current, pageSize) => loadPage(current, pageSize)}
/>`,
    },
    {
      id: "pagination-jumper",
      name: "Jumper",
      description: "Jump directly to a known page number.",
      preview: QuickJumperPagination,
      code: `<Pagination
  showQuickJumper
  defaultCurrent={2}
  total={500}
  onChange={(page) => loadPage(page)}
/>`,
    },
    {
      id: "pagination-total",
      name: "Total and range",
      description: "Describe the visible range in the context of the full result set.",
      preview: TotalPagination,
      code: `<Pagination
  total={85}
  showTotal={(total, [start, end]) => start + "-" + end + " of " + total + " items"}
/>`,
    },
    {
      id: "pagination-simple",
      name: "Simple mode",
      description: "Use a compact editable or read-only current-page indicator.",
      preview: SimplePagination,
      code: `<Pagination simple total={120} />
<Pagination simple={{ readOnly: true }} total={120} />`,
    },
    {
      id: "pagination-sizes",
      name: "Sizes",
      description: "Match the control density to its surrounding layout.",
      preview: PaginationSizes,
      code: `<Pagination size="large" total={70} />
<Pagination size="medium" total={70} />
<Pagination size="small" total={70} />`,
    },
    {
      id: "pagination-item-render",
      name: "Custom item rendering",
      description: "Replace previous, next, or page content while retaining navigation behavior.",
      preview: CustomItemPagination,
      code: `<Pagination
  total={80}
  itemRender={(_page, type, original) => {
    if (type === "prev") return "Previous";
    if (type === "next") return "Next";
    return original;
  }}
/>`,
    },
    {
      id: "pagination-semantic-styles",
      name: "Semantic styling",
      description: "Customize documented slots with classes or prop-aware style objects.",
      preview: SemanticPagination,
      code: `<Pagination
  classNames={{ root: "project-pagination" }}
  styles={{ root: { padding: 8 }, item: { borderRadius: 999 } }}
  total={80}
/>`,
    },
  ],
  api: [
    {
      name: "total",
      type: "number",
      defaultValue: "0",
      description: "Sets the total number of data items.",
    },
    {
      name: "current / defaultCurrent",
      type: "number",
      defaultValue: "1",
      description: "Controls or initializes the current page.",
    },
    {
      name: "pageSize / defaultPageSize",
      type: "number",
      defaultValue: "10",
      description: "Controls or initializes the number of items per page.",
    },
    {
      name: "align",
      type: '"start" | "center" | "end"',
      defaultValue: '"start"',
      description: "Aligns the full pagination control within its container.",
    },
    {
      name: "showSizeChanger",
      type: "boolean | PaginationSizeChangerConfig",
      description: "Shows the page-size selector; enabled automatically above the total boundary.",
    },
    {
      name: "pageSizeOptions",
      type: "number[]",
      defaultValue: "[10, 20, 50, 100]",
      description: "Defines the values available in the page-size selector.",
    },
    {
      name: "showQuickJumper",
      type: "boolean | { goButton: ReactNode }",
      defaultValue: "false",
      description: "Adds an input for navigating directly to a page.",
    },
    {
      name: "showTotal",
      type: "(total, range) => ReactNode",
      description: "Renders total and current-range information.",
    },
    {
      name: "simple",
      type: "boolean | { readOnly?: boolean }",
      defaultValue: "false",
      description: "Uses a compact current-page presentation.",
    },
    {
      name: "showLessItems",
      type: "boolean",
      defaultValue: "false",
      description: "Uses a smaller page window around the current page.",
    },
    {
      name: "hideOnSinglePage",
      type: "boolean",
      defaultValue: "false",
      description: "Hides the component when all items fit on one page.",
    },
    {
      name: "size",
      type: '"large" | "medium" | "small"',
      defaultValue: '"medium"',
      description: "Sets the control density.",
    },
    {
      name: "responsive",
      type: "boolean",
      defaultValue: "false",
      description: "Uses the compact size and range on narrow viewports when size is omitted.",
    },
    {
      name: "disabled",
      type: "boolean",
      defaultValue: "false",
      description: "Disables every pagination interaction.",
    },
    {
      name: "itemRender",
      type: "(page, type, originalElement) => ReactNode",
      description: "Customizes page, previous, and next content.",
    },
    {
      name: "components.sizeChanger",
      type: "ComponentType<PaginationSizeChangerProps>",
      description: "Replaces the default page-size selector.",
    },
    {
      name: "onChange",
      type: "(page, pageSize) => void",
      description: "Reports page or page-size changes.",
    },
    {
      name: "onShowSizeChange",
      type: "(current, pageSize) => void",
      description: "Reports page-size changes separately.",
    },
    {
      name: "classNames / styles",
      type: "PaginationSlots | (info) => PaginationSlots",
      description: "Customizes documented semantic elements.",
    },
  ],
  accessibility: [
    "Pagination renders a named navigation landmark with accessible page and direction labels.",
    "The active page uses aria-current, and unavailable controls use native disabled states.",
    "Quick-jump and simple inputs support Enter submission and expose explicit labels.",
  ],
});

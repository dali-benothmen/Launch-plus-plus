import { type Key, useState } from "react";
import {
  Button,
  Flex,
  Segmented,
  Space,
  Table,
  type TableColumn,
  type TableSize,
  Tag,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

interface Person {
  readonly address: string;
  readonly age: number;
  readonly key: number;
  readonly name: string;
  readonly status: "Active" | "Away" | "Offline";
  readonly tags: ReadonlyArray<string>;
}

const people: ReadonlyArray<Person> = [
  {
    address: "New York No. 1 Lake Park",
    age: 32,
    key: 1,
    name: "John Brown",
    status: "Active",
    tags: ["Developer", "Mentor"],
  },
  {
    address: "London No. 1 Lake Park",
    age: 42,
    key: 2,
    name: "Jim Green",
    status: "Away",
    tags: ["Designer"],
  },
  {
    address: "Sydney No. 1 Lake Park",
    age: 32,
    key: 3,
    name: "Joe Black",
    status: "Offline",
    tags: ["Developer"],
  },
  {
    address: "Paris No. 2 Lake Park",
    age: 28,
    key: 4,
    name: "Anna White",
    status: "Active",
    tags: ["Product", "Mentor"],
  },
  {
    address: "Berlin No. 4 Lake Park",
    age: 36,
    key: 5,
    name: "Maya Stone",
    status: "Away",
    tags: ["Research"],
  },
];

const basicColumns: ReadonlyArray<TableColumn<Person>> = [
  {
    dataIndex: "name",
    key: "name",
    render: (value) => <Typography.Link href="#table">{String(value)}</Typography.Link>,
    title: "Name",
  },
  { dataIndex: "age", key: "age", title: "Age" },
  { dataIndex: "address", key: "address", title: "Address" },
  {
    dataIndex: "tags",
    key: "tags",
    render: (_value, record) => (
      <Space size="small" wrap>
        {record.tags.map((tag) => (
          <Tag color={tag === "Developer" ? "blue" : "neutral"} key={tag}>
            {tag}
          </Tag>
        ))}
      </Space>
    ),
    title: "Tags",
  },
  {
    key: "action",
    render: (_value, record) => (
      <Space size="small">
        <Typography.Link href="#table">Invite {record.name.split(" ")[0]}</Typography.Link>
        <Typography.Link href="#table">Delete</Typography.Link>
      </Space>
    ),
    title: "Action",
  },
];

function BasicTable() {
  return <Table columns={basicColumns} dataSource={people.slice(0, 3)} pagination={false} />;
}

function GroupedColumnsTable() {
  return (
    <Table<Person> dataSource={people.slice(0, 3)} pagination={false}>
      <Table.ColumnGroup<Person> title="Name">
        <Table.Column<Person> dataIndex="name" key="name" title="Full name" />
        <Table.Column<Person>
          key="first-name"
          render={(_value, record) => record.name.split(" ")[0]}
          title="First name"
        />
      </Table.ColumnGroup>
      <Table.Column<Person> dataIndex="age" key="age" title="Age" />
      <Table.Column<Person> dataIndex="address" key="address" title="Address" />
    </Table>
  );
}

function SelectableTable() {
  const [selectionType, setSelectionType] = useState<"checkbox" | "radio">("checkbox");
  const [selectedKeys, setSelectedKeys] = useState<ReadonlyArray<Key>>([]);
  return (
    <Flex gap="medium" vertical>
      <Segmented
        onChange={setSelectionType}
        options={["checkbox", "radio"]}
        value={selectionType}
      />
      <Typography.Text type="secondary">
        Selected rows: {selectedKeys.length > 0 ? selectedKeys.join(", ") : "None"}
      </Typography.Text>
      <Table
        columns={basicColumns.slice(0, 3)}
        dataSource={people}
        pagination={false}
        rowSelection={{
          getCheckboxProps: (record) => ({
            disabled: record.name === "Jim Green",
            ...(record.name === "Jim Green" ? { title: "This row cannot be selected" } : {}),
          }),
          onChange: setSelectedKeys,
          selectedRowKeys: selectedKeys,
          type: selectionType,
        }}
      />
    </Flex>
  );
}

const filterColumns: ReadonlyArray<TableColumn<Person>> = [
  {
    dataIndex: "name",
    filters: [
      { text: "John Brown", value: "John Brown" },
      { text: "Jim Green", value: "Jim Green" },
      { text: "Joe Black", value: "Joe Black" },
    ],
    key: "name",
    onFilter: (value, record) => record.name.startsWith(String(value)),
    sorter: (first, second) => first.name.localeCompare(second.name),
    title: "Name",
  },
  { dataIndex: "age", key: "age", sorter: (first, second) => first.age - second.age, title: "Age" },
  {
    dataIndex: "status",
    filterMultiple: false,
    filters: [
      { text: "Active", value: "Active" },
      { text: "Away", value: "Away" },
      { text: "Offline", value: "Offline" },
    ],
    key: "status",
    onFilter: (value, record) => record.status === value,
    render: (value) => <Tag color={value === "Active" ? "green" : "neutral"}>{String(value)}</Tag>,
    title: "Status",
  },
  { dataIndex: "address", key: "address", title: "Address" },
];

function FilterAndSortTable() {
  const [lastAction, setLastAction] = useState("None");
  return (
    <Flex gap="medium" vertical>
      <Typography.Text type="secondary">Last change: {lastAction}</Typography.Text>
      <Table
        columns={filterColumns}
        dataSource={people}
        onChange={(_pagination, _filters, _sorter, extra) => setLastAction(extra.action)}
        pagination={false}
      />
    </Flex>
  );
}

const pagedPeople: ReadonlyArray<Person> = Array.from({ length: 36 }, (_, index) => {
  const source = people[index % people.length] ?? people[0];
  if (!source) throw new Error("The table showcase requires sample records.");
  return { ...source, key: index + 1, name: `${source.name} ${index + 1}` };
});

function PaginationTable() {
  return (
    <Table
      columns={basicColumns.slice(0, 3)}
      dataSource={pagedPeople}
      pagination={{
        defaultPageSize: 5,
        pageSizeOptions: [5, 10, 20],
        showQuickJumper: true,
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} items`,
      }}
    />
  );
}

function TableStates() {
  const [size, setSize] = useState<TableSize>("medium");
  const [loading, setLoading] = useState(false);
  return (
    <Flex gap="medium" vertical>
      <Flex gap="small" justify="space-between" wrap>
        <Segmented<TableSize>
          onChange={setSize}
          options={["small", "medium", "large"]}
          value={size}
        />
        <Button onClick={() => setLoading((current) => !current)}>
          {loading ? "Stop loading" : "Show loading"}
        </Button>
      </Flex>
      <Table
        bordered
        columns={basicColumns.slice(0, 3)}
        dataSource={people.slice(0, 3)}
        footer={() => "Updated a moment ago"}
        loading={loading}
        pagination={false}
        size={size}
        title={() => "Team members"}
      />
      <Table columns={basicColumns.slice(0, 3)} dataSource={[]} pagination={false} />
    </Flex>
  );
}

export const tableShowcase = defineShowcase({
  id: "table",
  name: "Table",
  category: "Data display",
  stage: "prod",
  description:
    "Displays structured records with configurable columns, selection, sorting, filtering, and pagination.",
  whenToUse: [
    "Use Table when users need to scan, compare, sort, or act on records across consistent columns.",
    "Keep the most important columns first and move secondary actions to the final column.",
    "Use List instead when the content is primarily vertical and column comparison is unimportant.",
  ],
  examples: [
    {
      id: "table-basic",
      name: "Basic",
      description:
        "Define columns from data and compose existing Typography, Tag, and Space components in custom cells.",
      preview: BasicTable,
      code: `const columns = [
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Age", dataIndex: "age", key: "age" },
  {
    title: "Tags",
    key: "tags",
    render: (_, record) => (
      <Space>{record.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space>
    ),
  },
];

<Table columns={columns} dataSource={people} pagination={false} />`,
    },
    {
      id: "table-jsx-columns",
      name: "JSX columns",
      description: "Column and ColumnGroup support grouped headers and a declarative JSX style.",
      preview: GroupedColumnsTable,
      code: `<Table<Person> dataSource={people} pagination={false}>
  <Table.ColumnGroup<Person> title="Name">
    <Table.Column<Person> title="Full name" dataIndex="name" />
    <Table.Column<Person> title="First name" render={(_, row) => row.name.split(" ")[0]} />
  </Table.ColumnGroup>
  <Table.Column<Person> title="Age" dataIndex="age" />
</Table>`,
    },
    {
      id: "table-selection",
      name: "Row selection",
      description:
        "Checkbox and radio selection reuse the shared input controls and support disabled rows.",
      preview: SelectableTable,
      code: `<Table
  columns={columns}
  dataSource={people}
  rowSelection={{
    type: "checkbox",
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({ disabled: record.locked }),
  }}
/>`,
    },
    {
      id: "table-filter-sort",
      name: "Filter and sort",
      description:
        "Columns can expose reusable dropdown filters and cycle through ascending, descending, and unsorted states.",
      preview: FilterAndSortTable,
      code: `const columns = [
  {
    title: "Name",
    dataIndex: "name",
    sorter: (a, b) => a.name.localeCompare(b.name),
    filters: names.map((name) => ({ text: name, value: name })),
    onFilter: (value, record) => record.name.startsWith(String(value)),
  },
];

<Table columns={columns} dataSource={people} />`,
    },
    {
      id: "table-pagination",
      name: "Pagination",
      description:
        "Pagination reuses the shared Pagination component with size selection and direct page jumping.",
      preview: PaginationTable,
      code: `<Table
  columns={columns}
  dataSource={people}
  pagination={{ defaultPageSize: 5, showSizeChanger: true, showQuickJumper: true }}
/>`,
    },
    {
      id: "table-states",
      name: "Sizes and states",
      description:
        "Use size, bordered, loading, title, footer, and empty-state options without replacing shared controls.",
      preview: TableStates,
      code: `<Table
  bordered
  size="small"
  loading={loading}
  title={() => "Team members"}
  footer={() => "Updated a moment ago"}
  columns={columns}
  dataSource={people}
/>

<Table columns={columns} dataSource={[]} locale={{ emptyText: "No members" }} />`,
    },
  ],
  api: [
    {
      name: "columns",
      description: "Column definitions for headers and cells.",
      type: "readonly TableColumn<T>[]",
    },
    {
      name: "dataSource",
      description: "Records rendered by the table.",
      type: "readonly T[]",
      defaultValue: "[]",
    },
    {
      name: "rowKey",
      description: "Unique record field or key getter.",
      type: "keyof T | (record: T) => Key",
      defaultValue: "record.key",
    },
    {
      name: "rowSelection",
      description: "Checkbox or radio row-selection configuration.",
      type: "TableRowSelection<T>",
    },
    {
      name: "pagination",
      description: "Pagination configuration, or false to hide it.",
      type: "TablePaginationConfig | false",
      defaultValue: "{}",
    },
    {
      name: "size",
      description: "Table cell density.",
      type: '"small" | "medium" | "large"',
      defaultValue: '"medium"',
    },
    {
      name: "bordered",
      description: "Adds vertical borders between cells.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "loading",
      description: "Displays a loading layer over the table.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "scroll",
      description: "Constrains horizontal or vertical table overflow.",
      type: "{ x?: number | string | true; y?: number }",
    },
    {
      name: "title / footer",
      description: "Renders content above or below the table.",
      type: "(currentPageData: readonly T[]) => ReactNode",
    },
    {
      name: "onChange",
      description: "Reports pagination, filter, and sort changes.",
      type: "(pagination, filters, sorter, extra) => void",
    },
    {
      name: "classNames",
      description: "Classes for the public table semantic parts.",
      type: "TableClassNames | function",
    },
    {
      name: "styles",
      description: "Inline styles for the public table semantic parts.",
      type: "TableStyles | function",
    },
  ],
  accessibility: [
    "Use short, descriptive column headings and retain visible labels for row actions.",
    "Provide a stable rowKey so selection and focus remain attached to the correct record.",
    "Do not rely on color alone to communicate status, filters, or selection.",
  ],
});

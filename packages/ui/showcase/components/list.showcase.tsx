import { type UIEventHandler, useRef, useState } from "react";
import { Avatar, Button, Flex, List, type ListRef, Space, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

interface ListItem {
  readonly content: string;
  readonly id: number;
}

const makeItems = (length: number, offset = 0): ReadonlyArray<ListItem> =>
  Array.from({ length }, (_, index) => ({
    content: `Item ${offset + index}`,
    id: offset + index,
  }));

const basicItems = makeItems(20);
const virtualItems = makeItems(10_000);

function BasicList() {
  return <List height={280} itemRender={(item) => item.content} items={basicItems} rowKey="id" />;
}

function VirtualList() {
  const listRef = useRef<ListRef>(null);
  return (
    <Flex gap="small" vertical>
      <Space wrap>
        <Button onClick={() => listRef.current?.scrollTo({ key: 0 })} size="small">
          First
        </Button>
        <Button
          onClick={() => listRef.current?.scrollTo({ align: "top", key: 5_000 })}
          size="small"
        >
          Item 5000
        </Button>
        <Button
          onClick={() => listRef.current?.scrollTo({ align: "bottom", key: 9_999 })}
          size="small"
        >
          Last
        </Button>
      </Space>
      <List
        height={280}
        itemRender={(item) => item.content}
        items={virtualItems}
        ref={listRef}
        rowKey="id"
        virtual
      />
    </Flex>
  );
}

interface Contact {
  readonly id: number;
  readonly name: string;
}

const contactNames = [
  "Aaron Baker",
  "Alice Adams",
  "Bella Carter",
  "Brian Diaz",
  "Chloe Evans",
  "Colin Foster",
  "Daisy Garcia",
  "David Hayes",
  "Elena Ingram",
  "Eric Jensen",
  "Fiona Kim",
  "Frank Lopez",
  "Grace Miller",
  "Gavin Nguyen",
  "Hannah Ortiz",
  "Henry Parker",
  "Iris Quincy",
  "Ivan Reed",
  "Jack Smith",
  "Julia Turner",
] as const;

const contacts = contactNames.map<Contact>((name, id) => ({ id, name }));
const avatarColors = ["#f56a00", "#7265e6", "#d48806", "#008c95", "#52a36d"];

function colorForName(name: string) {
  return avatarColors[(name.charCodeAt(0) - 65) % avatarColors.length];
}

function GroupedList() {
  return (
    <List<Contact, string>
      group={{
        key: (contact) => contact.name[0] ?? "",
        title: (letter) => letter,
      }}
      height={280}
      itemRender={(contact) => (
        <Flex align="center" gap="small">
          <Avatar size="small" style={{ backgroundColor: colorForName(contact.name) }}>
            {contact.name[0]}
          </Avatar>
          {contact.name}
        </Flex>
      )}
      items={contacts}
      rowKey="id"
      sticky
    />
  );
}

interface Notification {
  readonly id: number;
  readonly message: string;
  readonly time: string;
  readonly user: string;
}

const notificationMessages = [
  "commented on your project update",
  "invited you to the quarterly planning review. Please confirm your availability before Friday.",
  "mentioned you in the design review thread",
  "assigned you a task that is due next Monday.",
] as const;
const notificationUsers = ["Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan"] as const;
const notifications = Array.from(
  { length: 12 },
  (_, index): Notification => ({
    id: index,
    message: notificationMessages[index % notificationMessages.length] ?? "Updated the project",
    time: `${String(8 + index).padStart(2, "0")}:${String((index * 17) % 60).padStart(2, "0")}`,
    user: notificationUsers[index % notificationUsers.length] ?? "User",
  }),
);

function RichList() {
  return (
    <List
      height={280}
      itemRender={(item) => (
        <Flex align="flex-start" gap="medium">
          <Avatar style={{ backgroundColor: colorForName(item.user), flex: "none" }}>
            {item.user[0]}
          </Avatar>
          <Flex className="showcase-list-rich-content" flex="auto" gap={2} vertical>
            <Flex gap="small" justify="space-between">
              <Typography.Text strong>{item.user}</Typography.Text>
              <Typography.Text type="secondary">{item.time}</Typography.Text>
            </Flex>
            <Typography.Text type="secondary">{item.message}</Typography.Text>
          </Flex>
        </Flex>
      )}
      items={notifications}
      rowKey="id"
    />
  );
}

function InfiniteList() {
  const [items, setItems] = useState<ReadonlyArray<ListItem>>(() => makeItems(50));
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const handleScroll: UIEventHandler<HTMLUListElement> = (event) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight > 160 || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    window.setTimeout(() => {
      setItems((current) => [...current, ...makeItems(50, current.length)]);
      loadingRef.current = false;
      setLoading(false);
    }, 500);
  };

  return (
    <Flex gap="small" vertical>
      <List
        height={280}
        itemRender={(item) => item.content}
        items={items}
        onScroll={handleScroll}
        rowKey="id"
        virtual
      />
      <Flex justify="center">
        <Typography.Text type="secondary">
          {loading ? "Loading more…" : `${items.length} items loaded`}
        </Typography.Text>
      </Flex>
    </Flex>
  );
}

interface TeamMember {
  readonly id: number;
  readonly name: string;
  readonly team: string;
}

const teamMembers: ReadonlyArray<TeamMember> = [
  { id: 0, name: "Olivia", team: "Design" },
  { id: 1, name: "Liam", team: "Design" },
  { id: 2, name: "Emma", team: "Design" },
  { id: 3, name: "Noah", team: "Engineering" },
  { id: 4, name: "Ava", team: "Engineering" },
  { id: 5, name: "Ethan", team: "Engineering" },
  { id: 6, name: "Sophia", team: "Marketing" },
  { id: 7, name: "Lucas", team: "Marketing" },
];

function SemanticList() {
  return (
    <List<TeamMember, string>
      classNames={{
        groupHeader: "showcase-list-semantic-header",
        root: "showcase-list-semantic-root",
      }}
      group={{ key: (item) => item.team, title: (team) => team }}
      height={260}
      itemRender={(item) => item.name}
      items={teamMembers}
      rowKey="id"
      sticky
      styles={{ item: { fontStyle: "italic" } }}
    />
  );
}

export const listShowcase = defineShowcase({
  id: "list",
  name: "List",
  category: "Data display",
  stage: "prod",
  description:
    "Renders ordered data with grouping, sticky headers, and efficient long-list scrolling.",
  whenToUse: [
    "Use List for vertically ordered records that do not need a table's column structure.",
    "Enable virtual with a fixed height when a long data set would be expensive to render at once.",
    "Use groups and sticky headers when items need clear sections inside a scrolling list.",
  ],
  examples: [
    {
      id: "list-basic",
      name: "Basic",
      description: "Render a data source with a stable key and an item renderer.",
      preview: BasicList,
      code: `<List
  items={items}
  rowKey="id"
  height={280}
  itemRender={(item) => item.content}
/>`,
    },
    {
      id: "list-virtual",
      name: "Virtual scrolling",
      description:
        "Only visible rows are mounted, even with 10,000 items. The ref can jump to any item.",
      preview: VirtualList,
      code: `const listRef = useRef<ListRef>(null);

<List
  ref={listRef}
  virtual
  items={items}
  rowKey="id"
  height={280}
  itemRender={(item) => item.content}
/>

listRef.current?.scrollTo({ key: 5000, align: "top" });`,
    },
    {
      id: "list-grouped",
      name: "Grouping and sticky headers",
      description: "Derive a group from each item and keep its heading visible while scrolling.",
      preview: GroupedList,
      code: `<List
  items={contacts}
  rowKey="id"
  height={280}
  sticky
  group={{
    key: (contact) => contact.name[0],
    title: (letter) => letter,
  }}
  itemRender={(contact) => <ContactRow contact={contact} />}
/>`,
    },
    {
      id: "list-rich",
      name: "Rich content",
      description:
        "Rows can contain composed UI and use different heights when virtualization is off.",
      preview: RichList,
      code: `<List
  items={notifications}
  rowKey="id"
  height={280}
  itemRender={(notification) => (
    <Flex gap="medium">
      <Avatar>{notification.user[0]}</Avatar>
      <NotificationDetails notification={notification} />
    </Flex>
  )}
/>`,
    },
    {
      id: "list-infinite",
      name: "Infinite loading",
      description: "Use the native scroll event to append another page near the bottom.",
      preview: InfiniteList,
      code: `<List
  virtual
  items={items}
  rowKey="id"
  height={280}
  itemRender={(item) => item.content}
  onScroll={handleScroll}
/>`,
    },
    {
      id: "list-semantic",
      name: "Semantic styling",
      description:
        "Style the public root, item, and group header parts without targeting internals.",
      preview: SemanticList,
      code: `<List
  classNames={{ root: "custom-list", groupHeader: "custom-header" }}
  styles={{ item: { fontStyle: "italic" } }}
  group={{ key: (item) => item.team, title: (team) => team }}
  items={members}
  itemRender={(item) => item.name}
/>`,
    },
  ],
  api: [
    {
      name: "items",
      description: "Data source rendered by the list.",
      type: "readonly T[]",
      defaultValue: "[]",
    },
    {
      name: "itemRender",
      description: "Renders a single row.",
      type: "(item: T, index: number) => ReactNode",
    },
    {
      name: "rowKey",
      description: "Unique item field or key getter.",
      type: "keyof T | (item: T) => Key",
    },
    { name: "height", description: "Height of the scroll container in pixels.", type: "number" },
    {
      name: "virtual",
      description: "Renders only visible fixed-height rows; requires height.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "group",
      description: "Derives group keys and renders group titles.",
      type: "ListGroup<T, K>",
    },
    {
      name: "sticky",
      description: "Keeps group headers at the top while scrolling.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "onScroll",
      description: "Receives the native container scroll event.",
      type: "UIEventHandler<HTMLUListElement>",
    },
    {
      name: "classNames",
      description: "Classes for root, item, and groupHeader semantic parts.",
      type: "ListClassNames | function",
    },
    {
      name: "styles",
      description: "Styles for root, item, and groupHeader semantic parts.",
      type: "ListStyles | function",
    },
    {
      name: "ref.scrollTo",
      description: "Scrolls to pixels, an item key, or a group key.",
      type: "(config?: ListScrollToConfig) => void",
    },
  ],
  accessibility: [
    "Give interactive content inside each row its own visible label and keyboard behavior.",
    "Use stable row keys so focus and item identity remain predictable as data changes.",
  ],
});

import { useState } from "react";
import { Button, Card, Flex, Masonry, type MasonryItem } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const basicHeights = [150, 50, 90, 70, 110, 150, 130, 80, 50, 90, 100, 150, 60, 50, 80];
const responsiveHeights = [120, 55, 85, 160, 95, 140, 75, 110, 65, 130, 90, 145];

function numberedItems(heights: ReadonlyArray<number>): ReadonlyArray<MasonryItem<number>> {
  return heights.map((height, index) => ({ data: height, key: `item-${index}` }));
}

function NumberedCard({ height, number }: { readonly height: number; readonly number: number }) {
  return (
    <Card size="small" style={{ height }}>
      {number}
    </Card>
  );
}

function BasicMasonry() {
  const items = numberedItems(basicHeights).map((item, index) =>
    index === 4
      ? {
          ...item,
          children: (
            <Card size="small" style={{ height: item.data }} title="Project note">
              Custom item content
            </Card>
          ),
        }
      : item,
  );

  return (
    <Masonry
      columns={4}
      gutter={16}
      itemRender={({ data, index }) => <NumberedCard height={data} number={index + 1} />}
      items={items}
    />
  );
}

function ResponsiveMasonry() {
  return (
    <Masonry
      columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
      gutter={{ xs: 8, sm: 12, md: 16 }}
      itemRender={({ data, index }) => <NumberedCard height={data} number={index + 1} />}
      items={numberedItems(responsiveHeights)}
    />
  );
}

interface DynamicItem {
  readonly column?: number;
  readonly data: number;
  readonly key: number;
}

const initialDynamicItems: ReadonlyArray<DynamicItem> = basicHeights
  .slice(0, 10)
  .map((height, index) => ({ column: index % 4, data: height, key: index }));

function DynamicMasonry() {
  const [items, setItems] = useState(initialDynamicItems);

  const addItem = () => {
    setItems((current) => {
      const key = current.reduce((highest, item) => Math.max(highest, item.key), -1) + 1;
      return [...current, { data: 60 + ((key * 37) % 100), key }];
    });
  };

  const removeItem = () => setItems((current) => current.slice(0, -1));

  return (
    <Flex gap="medium" vertical>
      <Masonry
        columns={4}
        fresh
        gutter={16}
        itemRender={({ data, index }) => <NumberedCard height={data} number={index + 1} />}
        items={items}
        onLayoutChange={(layout) => {
          setItems((current) =>
            current.map((item) => {
              const placement = layout.find(({ key }) => key === item.key);
              return placement ? { ...item, column: placement.column } : item;
            }),
          );
        }}
      />
      <Flex gap="small">
        <Button onClick={addItem} variant="primary">
          Add item
        </Button>
        <Button disabled={items.length === 0} onClick={removeItem}>
          Remove last
        </Button>
      </Flex>
    </Flex>
  );
}

function SemanticMasonry() {
  return (
    <Masonry
      classNames={{ item: "showcase-masonry-semantic-item" }}
      columns={3}
      gutter={[12, 16]}
      itemRender={({ data, index }) => <NumberedCard height={data} number={index + 1} />}
      items={numberedItems([80, 120, 60, 100, 140, 70])}
      styles={{ root: { padding: 16 } }}
    />
  );
}

export const masonryShowcase = defineShowcase({
  id: "masonry",
  name: "Masonry",
  category: "Layout",
  stage: "prod",
  description: "Distributes variable-height content across balanced responsive columns.",
  usage: `import { Masonry } from "@launchpp/ui";`,
  whenToUse: [
    "Use Masonry for cards, images, or project items with irregular heights.",
    "Use responsive columns when the same content must adapt from narrow panels to wide workspaces.",
    "Set item.column when an item's column must remain stable during dynamic updates, such as a Kanban workflow.",
  ],
  examples: [
    {
      id: "masonry-basic",
      name: "Basic",
      description:
        "Set a column count and gutter. An item's children take precedence over itemRender.",
      preview: BasicMasonry,
      code: `const items = heights.map((height, index) => ({
  key: \`item-\${index}\`,
  data: height,
}));

<Masonry
  columns={4}
  gutter={16}
  items={items}
  itemRender={({ data, index }) => (
    <Card size="small" style={{ height: data }}>
      {index + 1}
    </Card>
  )}
/>`,
    },
    {
      id: "masonry-responsive",
      name: "Responsive",
      description: "Adapt columns and spacing to the available width with breakpoint values.",
      preview: ResponsiveMasonry,
      code: `<Masonry
  columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
  gutter={{ xs: 8, sm: 12, md: 16 }}
  items={items}
  itemRender={renderItem}
/>`,
    },
    {
      id: "masonry-dynamic",
      name: "Dynamic items",
      description:
        "Add or remove content while preserving resolved columns through onLayoutChange.",
      preview: DynamicMasonry,
      code: `<Masonry
  columns={4}
  gutter={16}
  fresh
  items={items}
  itemRender={renderItem}
  onLayoutChange={(layout) => {
    setItems((current) => current.map((item) => ({
      ...item,
      column: layout.find(({ key }) => key === item.key)?.column,
    })));
  }}
/>`,
    },
    {
      id: "masonry-semantic-styles",
      name: "Semantic styling",
      description: "Apply public class names and styles to the root and item semantic elements.",
      preview: SemanticMasonry,
      code: `<Masonry
  classNames={{ item: "project-card" }}
  styles={{ root: { padding: 16 } }}
  columns={3}
  gutter={[12, 16]}
  items={items}
  itemRender={renderItem}
/>`,
    },
  ],
  api: [
    {
      name: "columns",
      type: "number | Partial<Record<Breakpoint, number>>",
      defaultValue: "3",
      description: "Sets the fixed or responsive number of columns.",
    },
    {
      name: "gutter",
      type: "Gap | [horizontal: Gap, vertical: Gap]",
      defaultValue: "0",
      description: "Sets fixed or responsive spacing between items.",
    },
    {
      name: "items",
      type: "MasonryItem<T>[]",
      defaultValue: "[]",
      description: "Provides keyed data, optional content, and optional fixed column placement.",
    },
    {
      name: "itemRender",
      type: "(item: MasonryRenderItem<T>) => ReactNode",
      description: "Renders items that do not provide children directly.",
    },
    {
      name: "fresh",
      type: "boolean",
      defaultValue: "false",
      description: "Keeps item measurements current when their content changes size.",
    },
    {
      name: "onLayoutChange",
      type: "(items: { key: Key; column: number }[]) => void",
      description: "Reports resolved item columns after the layout changes.",
    },
    {
      name: "classNames",
      type: "{ root?, item? } | (info) => { root?, item? }",
      description: "Adds class names to public semantic elements.",
    },
    {
      name: "styles",
      type: "{ root?, item? } | (info) => { root?, item? }",
      description: "Adds inline styles to public semantic elements.",
    },
  ],
  accessibility: [
    "Masonry preserves each item's identity while its visual column changes.",
    "Keep important task ordering in application data instead of relying only on visual position.",
    "Provide accessible names for interactive controls and meaningful alternative text for images.",
  ],
});

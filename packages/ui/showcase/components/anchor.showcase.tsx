import { useCallback, useRef } from "react";
import { Anchor, type AnchorItem, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const basicItems: ReadonlyArray<AnchorItem> = [
  { href: "#anchor-basic-overview", key: "overview", title: "Overview" },
  { href: "#anchor-basic-workflow", key: "workflow", title: "Workflow" },
  {
    children: [
      { href: "#anchor-basic-permissions", key: "permissions", title: "Permissions" },
      { href: "#anchor-basic-events", key: "events", title: "Events" },
    ],
    href: "#anchor-basic-api",
    key: "api",
    title: "Plugin API",
  },
];

const horizontalItems: ReadonlyArray<AnchorItem> = [
  { href: "#anchor-horizontal-summary", key: "summary", title: "Summary" },
  { href: "#anchor-horizontal-activity", key: "activity", title: "Activity" },
  { href: "#anchor-horizontal-members", key: "members", title: "Members" },
];

function DemoSection({ id, title }: { readonly id: string; readonly title: string }) {
  return (
    <section className="showcase-anchor-section" id={id}>
      <Typography.Title level={4}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">
        Scroll this contained example or select a navigation link to move between sections.
      </Typography.Paragraph>
    </section>
  );
}

function BasicAnchor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const getContainer = useCallback(() => containerRef.current as HTMLDivElement, []);

  return (
    <div className="showcase-anchor-layout">
      <div className="showcase-anchor-scroll" ref={containerRef}>
        <DemoSection id="anchor-basic-overview" title="Overview" />
        <DemoSection id="anchor-basic-workflow" title="Workflow" />
        <DemoSection id="anchor-basic-api" title="Plugin API" />
        <DemoSection id="anchor-basic-permissions" title="Permissions" />
        <DemoSection id="anchor-basic-events" title="Events" />
      </div>
      <Anchor affix={false} getContainer={getContainer} items={basicItems} showInkInFixed />
    </div>
  );
}

function HorizontalAnchor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const getContainer = useCallback(() => containerRef.current as HTMLDivElement, []);

  return (
    <div className="showcase-anchor-horizontal-demo">
      <Anchor
        affix={false}
        direction="horizontal"
        getContainer={getContainer}
        items={horizontalItems}
      />
      <div className="showcase-anchor-scroll" ref={containerRef}>
        <DemoSection id="anchor-horizontal-summary" title="Summary" />
        <DemoSection id="anchor-horizontal-activity" title="Activity" />
        <DemoSection id="anchor-horizontal-members" title="Members" />
      </div>
    </div>
  );
}

const staticItems: ReadonlyArray<AnchorItem> = [
  { href: "#anchor-static-overview", key: "overview", title: "Overview" },
  { href: "#anchor-static-settings", key: "settings", title: "Settings" },
  { href: "#anchor-static-api", key: "api", title: "API" },
];

function CustomHighlightAnchor() {
  return (
    <Anchor
      affix={false}
      getCurrentAnchor={() => "#anchor-static-settings"}
      items={staticItems}
      onClick={(event) => event.preventDefault()}
      showInkInFixed
    />
  );
}

const offsetItems: ReadonlyArray<AnchorItem> = [
  { href: "#anchor-offset-first", key: "first", title: "First section" },
  {
    href: "#anchor-offset-second",
    key: "second",
    targetOffset: 48,
    title: "Second section",
  },
  { href: "#anchor-offset-third", key: "third", title: "Third section" },
];

function OffsetAnchor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const getContainer = useCallback(() => containerRef.current as HTMLDivElement, []);

  return (
    <div className="showcase-anchor-layout">
      <div className="showcase-anchor-scroll" ref={containerRef}>
        <DemoSection id="anchor-offset-first" title="First section" />
        <DemoSection id="anchor-offset-second" title="Second section with a custom offset" />
        <DemoSection id="anchor-offset-third" title="Third section" />
      </div>
      <Anchor
        affix={false}
        getContainer={getContainer}
        items={offsetItems}
        replace
        showInkInFixed
        targetOffset={16}
      />
    </div>
  );
}

function SemanticAnchor() {
  return (
    <Anchor
      affix={false}
      classNames={{ root: "showcase-anchor-semantic-root" }}
      getCurrentAnchor={() => "#anchor-semantic-two"}
      items={[
        { href: "#anchor-semantic-one", key: "one", title: "Project details" },
        { href: "#anchor-semantic-two", key: "two", title: "Team access" },
        { href: "#anchor-semantic-three", key: "three", title: "Plugin settings" },
      ]}
      onClick={(event) => event.preventDefault()}
      showInkInFixed
      styles={{ root: { padding: 12 } }}
    />
  );
}

export const anchorShowcase = defineShowcase({
  id: "anchor",
  name: "Anchor",
  category: "Navigation",
  stage: "prod",
  description: "Navigates between sections and tracks the active location on a long page.",
  usage: `import { Anchor } from "@launchpp/ui";`,
  whenToUse: [
    "Use Anchor for long pages whose sections benefit from a persistent table of contents.",
    "Use nested items only in vertical orientation and keep the hierarchy shallow.",
    "Use Tabs for switching peer views; use Anchor when all destinations remain on the same scrollable page.",
  ],
  examples: [
    {
      id: "anchor-basic",
      name: "Basic",
      description:
        "Track sections in a custom scroll container and organize links into a hierarchy.",
      preview: BasicAnchor,
      code: `<Anchor
  affix={false}
  getContainer={() => scrollContainer}
  showInkInFixed
  items={[
    { key: "overview", href: "#overview", title: "Overview" },
    {
      key: "api",
      href: "#api",
      title: "API",
      children: [
        { key: "permissions", href: "#permissions", title: "Permissions" },
      ],
    },
  ]}
/>`,
    },
    {
      id: "anchor-horizontal",
      name: "Horizontal anchor",
      description: "Display a flat set of section links in a horizontal navigation row.",
      preview: HorizontalAnchor,
      code: `<Anchor
  direction="horizontal"
  getContainer={() => scrollContainer}
  items={items}
/>`,
    },
    {
      id: "anchor-custom-highlight",
      name: "Custom highlight and click",
      description:
        "Control the highlighted link and prevent default navigation through the click handler.",
      preview: CustomHighlightAnchor,
      code: `<Anchor
  affix={false}
  getCurrentAnchor={() => "#settings"}
  onClick={(event, item) => {
    event.preventDefault();
    openSection(item.href);
  }}
  items={items}
/>`,
    },
    {
      id: "anchor-offset",
      name: "Scroll offsets and history",
      description:
        "Set a shared or item-specific scroll offset and replace the current history entry.",
      preview: OffsetAnchor,
      code: `<Anchor
  getContainer={() => scrollContainer}
  targetOffset={16}
  replace
  items={[
    { key: "first", href: "#first", title: "First section" },
    { key: "second", href: "#second", title: "Second", targetOffset: 48 },
  ]}
/>`,
    },
    {
      id: "anchor-semantic-styles",
      name: "Semantic styling",
      description: "Customize the root, item, title, and active indicator through public slots.",
      preview: SemanticAnchor,
      code: `<Anchor
  classNames={{ root: "project-anchor" }}
  styles={{ root: { padding: 12 } }}
  items={items}
/>`,
    },
  ],
  api: [
    {
      name: "items",
      type: "AnchorItem[]",
      defaultValue: "[]",
      description: "Defines links and optional nested links.",
    },
    {
      name: "direction",
      type: '"vertical" | "horizontal"',
      defaultValue: '"vertical"',
      description: "Sets the navigation direction; nesting is supported vertically.",
    },
    {
      name: "affix",
      type: "boolean | { offsetBottom?: number }",
      defaultValue: "true",
      description: "Keeps the anchor sticky or renders it in normal document flow.",
    },
    {
      name: "getContainer",
      type: "() => HTMLElement | Window",
      defaultValue: "() => window",
      description: "Returns the element whose scroll position should be tracked.",
    },
    {
      name: "bounds",
      type: "number",
      defaultValue: "5",
      description: "Sets the active-section boundary in pixels.",
    },
    {
      name: "offsetTop",
      type: "number",
      defaultValue: "0",
      description: "Offsets sticky placement and active-section calculation from the top.",
    },
    {
      name: "targetOffset",
      type: "number",
      defaultValue: "offsetTop",
      description: "Offsets the destination after a link is selected.",
    },
    {
      name: "getCurrentAnchor",
      type: "(activeLink: string) => string",
      description: "Overrides the link selected by automatic scroll tracking.",
    },
    {
      name: "onChange",
      type: "(currentActiveLink: string) => void",
      description: "Runs when the active link changes.",
    },
    {
      name: "onClick",
      type: "(event, item: AnchorItem) => void",
      description: "Runs before the default anchor scrolling behavior.",
    },
    {
      name: "replace",
      type: "boolean",
      defaultValue: "false",
      description: "Replaces rather than pushes the selected hash in browser history.",
    },
    {
      name: "showInkInFixed",
      type: "boolean",
      defaultValue: "false",
      description: "Shows the active indicator when affix is disabled.",
    },
    {
      name: "classNames / styles",
      type: "{ root?, item?, itemTitle?, indicator? } | (info) => Slots",
      description: "Customizes public semantic elements.",
    },
  ],
  accessibility: [
    "Anchor renders a labeled navigation landmark and marks the active link with aria-current.",
    "Use meaningful section titles and ensure every local href points to a unique element id.",
    "Do not rely on the active indicator alone; active links also use primary text color.",
  ],
});

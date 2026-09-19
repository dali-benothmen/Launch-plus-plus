import {
  Breadcrumb,
  type BreadcrumbItem,
  type BreadcrumbRouteItem,
  Flex,
  HomeIcon,
  MembersIcon,
  Typography,
} from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const basicItems: ReadonlyArray<BreadcrumbItem> = [
  { key: "home", title: "Home" },
  { href: "#breadcrumb-basic", key: "projects", title: "Projects" },
  { href: "#breadcrumb-basic", key: "launch", title: "Launch++" },
  { key: "board", title: "Board" },
];

function BasicBreadcrumb() {
  return <Breadcrumb items={basicItems} />;
}

function ParamsBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { key: "projects", title: "Projects" },
        { href: "#breadcrumb-params", key: "project", title: ":projectId" },
      ]}
      params={{ projectId: 42 }}
    />
  );
}

function DropdownBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { key: "launch", title: "Launch++" },
        { href: "#breadcrumb-dropdown", key: "components", title: "Components" },
        {
          href: "#breadcrumb-dropdown",
          key: "navigation",
          menu: {
            items: [
              {
                key: "general",
                label: <Typography.Link href="#breadcrumb-dropdown">General</Typography.Link>,
              },
              {
                key: "layout",
                label: <Typography.Link href="#breadcrumb-dropdown">Layout</Typography.Link>,
              },
              {
                key: "navigation",
                label: <Typography.Link href="#breadcrumb-dropdown">Navigation</Typography.Link>,
              },
            ],
          },
          title: "Navigation",
        },
        { key: "breadcrumb", title: "Breadcrumb" },
      ]}
    />
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 3 3 5-6" />
    </svg>
  );
}

function IconBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        {
          href: "#breadcrumb-icons",
          key: "home",
          title: (
            <>
              <HomeIcon />
              <span className="showcase-visually-hidden">Home</span>
            </>
          ),
        },
        {
          href: "#breadcrumb-icons",
          key: "team",
          title: (
            <>
              <MembersIcon />
              <span>Team projects</span>
            </>
          ),
        },
        {
          href: "#breadcrumb-icons",
          key: "dashboard",
          title: (
            <>
              <ChartIcon />
              <span>Dashboard</span>
            </>
          ),
        },
        { key: "project", title: "Launch++" },
      ]}
    />
  );
}

function SeparatorBreadcrumbs() {
  return (
    <Flex gap="large" vertical>
      <Breadcrumb items={basicItems} separator=">" />
      <Breadcrumb
        items={[
          { key: "location", title: "Location" },
          { key: "colon", separator: ":", type: "separator" },
          { href: "#breadcrumb-separators", key: "projects", title: "Projects" },
          { key: "slash-one", type: "separator" },
          { href: "#breadcrumb-separators", key: "launch", title: "Launch++" },
          { key: "slash-two", type: "separator" },
          { key: "settings", title: "Settings" },
        ]}
        separator=""
      />
    </Flex>
  );
}

const routeItems: ReadonlyArray<BreadcrumbRouteItem> = [
  { key: "projects", path: "projects", title: "Projects" },
  { key: "project", path: ":projectId", title: "Project :projectId" },
  { key: "settings", path: "settings", title: "Settings" },
];

function RouterBreadcrumb() {
  return (
    <Breadcrumb
      itemRender={(route, _params, routes, paths) => {
        const isLast = route === routes.at(-1);
        return isLast ? (
          <span>{route.title}</span>
        ) : (
          <Typography.Link href={`#${paths.join("-")}`}>{route.title}</Typography.Link>
        );
      }}
      params={{ projectId: 42 }}
      routes={routeItems}
    />
  );
}

function SemanticBreadcrumb() {
  return (
    <Breadcrumb
      classNames={{ root: "showcase-breadcrumb-semantic-root" }}
      items={basicItems.slice(0, 3)}
      styles={{ root: { padding: 8 }, separator: { color: "var(--launch-ui-primary)" } }}
    />
  );
}

export const breadcrumbShowcase = defineShowcase({
  id: "breadcrumb",
  name: "Breadcrumb",
  category: "Navigation",
  stage: "prod",
  description: "Shows the current location in a hierarchy and links back to parent levels.",
  usage: `import { Breadcrumb } from "@launchpp/ui";`,
  whenToUse: [
    "Use Breadcrumb when a view sits more than two levels deep in a meaningful hierarchy.",
    "Keep labels concise and make parent levels navigable when users can return to them.",
    "Do not use Breadcrumb as the primary navigation or for a flat group of peer pages.",
  ],
  examples: [
    {
      id: "breadcrumb-basic",
      name: "Basic usage",
      description: "Display the current page after its navigable parent levels.",
      preview: BasicBreadcrumb,
      code: `<Breadcrumb
  items={[
    { key: "home", title: "Home" },
    { key: "projects", href: "/projects", title: "Projects" },
    { key: "project", title: "Launch++" },
  ]}
/>`,
    },
    {
      id: "breadcrumb-params",
      name: "Route parameters",
      description: "Replace named parameters in text, href values, and connected paths.",
      preview: ParamsBreadcrumb,
      code: `<Breadcrumb
  params={{ projectId: 42 }}
  items={[
    { key: "projects", title: "Projects" },
    { key: "project", href: "/projects/:projectId", title: ":projectId" },
  ]}
/>`,
    },
    {
      id: "breadcrumb-dropdown",
      name: "Dropdown menu",
      description: "Offer sibling destinations from a breadcrumb level.",
      preview: DropdownBreadcrumb,
      code: `<Breadcrumb
  items={[
    { key: "components", href: "/components", title: "Components" },
    {
      key: "navigation",
      title: "Navigation",
      menu: { items: navigationItems },
    },
  ]}
/>`,
    },
    {
      id: "breadcrumb-icons",
      name: "With icons",
      description: "Place library or custom SVG icons before breadcrumb text.",
      preview: IconBreadcrumb,
      code: `<Breadcrumb
  items={[
    { key: "home", href: "/", title: <HomeIcon /> },
    { key: "projects", href: "/projects", title: <><ProjectsIcon /><span>Projects</span></> },
    { key: "current", title: "Launch++" },
  ]}
/>`,
    },
    {
      id: "breadcrumb-separators",
      name: "Custom separators",
      description: "Set one separator globally or insert separator items independently.",
      preview: SeparatorBreadcrumbs,
      code: `<Breadcrumb separator=">" items={items} />

<Breadcrumb
  separator=""
  items={[
    { key: "location", title: "Location" },
    { key: "colon", type: "separator", separator: ":" },
    { key: "project", title: "Project" },
  ]}
/>`,
    },
    {
      id: "breadcrumb-router",
      name: "Router integration",
      description: "Accumulate path segments and render framework-specific links with itemRender.",
      preview: RouterBreadcrumb,
      code: `<Breadcrumb
  routes={routes}
  params={{ projectId: 42 }}
  itemRender={(route, params, routes, paths) => (
    route === routes.at(-1)
      ? <span>{route.title}</span>
      : <RouterLink to={\`/\${paths.join("/")}\`}>{route.title}</RouterLink>
  )}
/>`,
    },
    {
      id: "breadcrumb-semantic-styles",
      name: "Semantic styling",
      description: "Customize the root, items, and separators through public semantic slots.",
      preview: SemanticBreadcrumb,
      code: `<Breadcrumb
  classNames={{ root: "project-breadcrumb" }}
  styles={{ root: { padding: 8 }, separator: { color: "var(--launch-ui-primary)" } }}
  items={items}
/>`,
    },
  ],
  api: [
    {
      name: "items",
      type: "BreadcrumbItem[]",
      defaultValue: "[]",
      description: "Defines route items and explicit separator items.",
    },
    {
      name: "routes",
      type: "BreadcrumbRouteItem[]",
      description: "Provides a route-oriented alias when integrating with a router.",
    },
    {
      name: "params",
      type: "Record<string, string | number>",
      defaultValue: "{}",
      description: "Replaces named parameters in string titles, href values, and paths.",
    },
    {
      name: "separator",
      type: "ReactNode",
      defaultValue: '"/"',
      description: "Sets the separator inserted between normal items.",
    },
    {
      name: "dropdownIcon",
      type: "ReactNode",
      defaultValue: "ChevronDownIcon",
      description: "Replaces the icon used to open an item's sibling menu.",
    },
    {
      name: "itemRender",
      type: "(route, params, routes, paths) => ReactNode",
      description: "Renders route items with an application router or custom link component.",
    },
    {
      name: "classNames / styles",
      type: "{ root?, item?, separator? } | (info) => Slots",
      description: "Customizes public semantic elements.",
    },
    {
      name: "RouteItem.href / path",
      type: "string",
      description: "Sets a direct destination or a path joined with preceding route paths.",
    },
    {
      name: "RouteItem.menu",
      type: "{ items: BreadcrumbMenuItem[] }",
      description: "Adds a dropdown of sibling destinations to a level.",
    },
    {
      name: "RouteItem.children",
      type: "BreadcrumbRouteItem[]",
      description: "Uses child routes as sibling destinations in the level's dropdown menu.",
    },
    {
      name: "SeparatorItem.separator",
      type: "ReactNode",
      defaultValue: '"/"',
      description: "Sets the content of an explicit separator item.",
    },
  ],
  accessibility: [
    "Breadcrumb renders a named navigation landmark containing an ordered list.",
    "The final route is marked with aria-current=page.",
    "Dropdown menus use a separately labeled trigger so breadcrumb links remain valid controls.",
  ],
});

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import * as icons from "../../src/icons.js";
import { Input } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

type IconComponent = ComponentType<{
  readonly "aria-hidden"?: boolean;
  readonly className?: string;
}>;

const iconNamePattern = /(Filled|Outlined|TwoTone)$/;

const iconEntries = Object.entries(icons)
  .filter(([name]) => iconNamePattern.test(name))
  .map(([name, Icon]) => ({ Icon: Icon as IconComponent, name }))
  .sort((first, second) => first.name.localeCompare(second.name));

function IconGallery() {
  const [query, setQuery] = useState("");
  const [copiedIcon, setCopiedIcon] = useState<string>();

  const visibleIcons = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return iconEntries;
    return iconEntries.filter(({ name }) => name.toLocaleLowerCase().includes(normalizedQuery));
  }, [query]);

  async function copyImport(name: string) {
    await navigator.clipboard.writeText(`import { ${name} } from "@launchpp/ui/icons";`);
    setCopiedIcon(name);
    window.setTimeout(() => setCopiedIcon(undefined), 1_500);
  }

  return (
    <div className="showcase-icon-browser">
      <div className="showcase-icon-toolbar">
        <label htmlFor="icon-search">
          <span className="showcase-visually-hidden">Search icons</span>
          <Input
            id="icon-search"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search icons"
            shape="round"
            type="search"
            value={query}
          />
        </label>
        <span aria-live="polite" className="showcase-icon-count">
          {visibleIcons.length} {visibleIcons.length === 1 ? "icon" : "icons"}
        </span>
      </div>

      {visibleIcons.length > 0 ? (
        <div className="showcase-icon-grid">
          {visibleIcons.map(({ Icon, name }) => (
            <button
              aria-label={`Copy import for ${name}`}
              className="showcase-icon-tile"
              key={name}
              onClick={() => void copyImport(name)}
              title={`Copy import for ${name}`}
              type="button"
            >
              <Icon aria-hidden={true} className="showcase-icon-preview" />
              <span className="showcase-icon-name">{copiedIcon === name ? "Copied" : name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="showcase-icon-empty">No icons match “{query}”.</p>
      )}
    </div>
  );
}

export const iconsShowcase = defineShowcase({
  id: "icons",
  name: "Icons",
  category: "General",
  stage: "prod",
  description: "A consistent collection of interface icons for Launch++ and its plugins.",
  usage: `import { PlusOutlined, SettingOutlined } from "@launchpp/ui/icons";
import { Button } from "@launchpp/ui";

<PlusOutlined aria-hidden />

<Button
  aria-label="Add project"
  icon={<PlusOutlined />}
  iconOnly
/>`,
  whenToUse: [
    "Use icons to clarify actions, navigation, and status without replacing necessary labels.",
    "Select icons from this public entry point so core features and plugins use the same visual language.",
  ],
  examples: [
    {
      id: "icon-gallery",
      name: "Icon gallery",
      description: "Search the collection and select an icon to copy its import statement.",
      preview: IconGallery,
      code: `import { PlusOutlined } from "@launchpp/ui/icons";

<PlusOutlined aria-hidden />`,
    },
  ],
  accessibility: [
    "Hide decorative icons from assistive technology with aria-hidden.",
    "Give icon-only controls a concise accessible label on the control itself.",
    "Do not communicate status or meaning through an icon alone when a text label is needed.",
  ],
});

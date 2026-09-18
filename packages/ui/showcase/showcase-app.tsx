import { useMemo, useState } from "react";
import { Input, LaunchProvider } from "../src/index.js";
import { CodeBlock } from "./code-block.js";
import {
  componentRegistry,
  showcaseStages,
  type ComponentShowcase,
  type ShowcaseStage,
} from "./registry.js";

type StageFilter = "all" | ShowcaseStage;

const stageDescriptions: Record<ShowcaseStage, string> = {
  dev: "Actively being built and available only in this showcase.",
  test: "Ready for manual review but not part of the public package API.",
  prod: "Approved and exported from the public @launchpp/ui package API.",
};

function StageBadge({ stage }: { readonly stage: ShowcaseStage }) {
  return <span className={`showcase-stage is-${stage}`}>{stage}</span>;
}

function ComponentDetails({ entry }: { readonly entry: ComponentShowcase }) {
  return (
    <article className="showcase-component">
      <header className="showcase-component-header">
        <div>
          <div className="showcase-component-labels">
            <span>{entry.category}</span>
            <StageBadge stage={entry.stage} />
          </div>
          <h1>{entry.name}</h1>
          <p>{entry.description}</p>
        </div>
      </header>

      {entry.usage ? (
        <section className="showcase-section showcase-usage">
          <h2>Usage</h2>
          <CodeBlock code={entry.usage} />
        </section>
      ) : null}

      {entry.whenToUse && entry.whenToUse.length > 0 ? (
        <section className="showcase-guidance">
          <h2>When to use</h2>
          <ul>
            {entry.whenToUse.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="showcase-section">
        <h2>Examples</h2>
        <div className="showcase-examples">
          {entry.examples.map((example) => {
            const Preview = example.preview;
            return (
              <section className="showcase-example" key={example.id}>
                <header>
                  <h3>{example.name}</h3>
                  {example.description ? <p>{example.description}</p> : null}
                </header>
                <div className="showcase-preview">
                  <Preview />
                </div>
                <CodeBlock code={example.code} />
              </section>
            );
          })}
        </div>
      </section>

      {entry.api && entry.api.length > 0 ? (
        <section className="showcase-section">
          <h2>Essential API</h2>
          <div className="showcase-api-wrap">
            <table className="showcase-api">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {entry.api.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <code>{item.name}</code>
                    </td>
                    <td>{item.description}</td>
                    <td>
                      <code>{item.type}</code>
                    </td>
                    <td>{item.defaultValue ? <code>{item.defaultValue}</code> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {entry.accessibility && entry.accessibility.length > 0 ? (
        <section className="showcase-guidance">
          <h2>Accessibility</h2>
          <ul>
            {entry.accessibility.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export function ShowcaseApp() {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<StageFilter>("all");
  const [selectedId, setSelectedId] = useState<string | undefined>(componentRegistry[0]?.id);

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return componentRegistry.filter((entry) => {
      const matchesStage = stage === "all" || entry.stage === stage;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        entry.name.toLocaleLowerCase().includes(normalizedQuery) ||
        entry.description.toLocaleLowerCase().includes(normalizedQuery) ||
        entry.category.toLocaleLowerCase().includes(normalizedQuery);
      return matchesStage && matchesQuery;
    });
  }, [query, stage]);

  const selectedEntry =
    visibleEntries.find((entry) => entry.id === selectedId) ?? visibleEntries[0];
  const categories = Array.from(new Set(visibleEntries.map((entry) => entry.category)));

  return (
    <LaunchProvider mode="light">
      <div className="showcase-shell">
        <header className="showcase-header">
          <div className="showcase-brand">
            <span className="showcase-brand-mark">L+</span>
            <div>
              <strong>Launch++ UI</strong>
              <span>Component showcase</span>
            </div>
          </div>

          <label className="showcase-search" htmlFor="showcase-search-input">
            <span className="showcase-visually-hidden">Search components</span>
            <Input
              id="showcase-search-input"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search components"
              shape="round"
              type="search"
              value={query}
            />
          </label>
        </header>

        <aside className="showcase-sidebar">
          <fieldset className="showcase-filters">
            <legend className="showcase-visually-hidden">Filter by lifecycle stage</legend>
            {(["all", ...showcaseStages] as const).map((filter) => (
              <button
                className={stage === filter ? "is-active" : undefined}
                key={filter}
                onClick={() => setStage(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </fieldset>

          <nav aria-label="Components" className="showcase-navigation">
            {categories.map((category) => (
              <section key={category}>
                <h2>{category}</h2>
                {visibleEntries
                  .filter((entry) => entry.category === category)
                  .map((entry) => (
                    <button
                      className={selectedEntry?.id === entry.id ? "is-active" : undefined}
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      type="button"
                    >
                      <span>{entry.name}</span>
                      <StageBadge stage={entry.stage} />
                    </button>
                  ))}
              </section>
            ))}
          </nav>

          <details className="showcase-stage-help">
            <summary>Lifecycle stages</summary>
            {showcaseStages.map((item) => (
              <p key={item}>
                <StageBadge stage={item} />
                <span>{stageDescriptions[item]}</span>
              </p>
            ))}
          </details>
        </aside>

        <main className="showcase-main">
          {selectedEntry ? (
            <ComponentDetails entry={selectedEntry} />
          ) : (
            <div className="showcase-empty">
              <h1>No matching components</h1>
              <p className="showcase-empty-copy">
                Change the search or lifecycle filter to see registered components.
              </p>
            </div>
          )}
        </main>
      </div>
    </LaunchProvider>
  );
}

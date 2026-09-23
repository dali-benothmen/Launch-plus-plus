# Launch++ architecture documentation

Status: target architecture with the core-alpha implementation in progress.

Launch++ is a minimal, open-source project manager that grows through plugins and themes. The architecture is designed around a small domain core, a stable extension platform, a clean React client, and a single self-hostable server that works on a laptop or VPS.

## Reading order

| Document | Purpose |
| --- | --- |
| [Product scope](./product-scope.md) | Product principles, users, core features, workflows, and explicit non-goals |
| [UI information architecture](./ui-information-architecture.md) | Application shell, page inventory, navigation hierarchy, project tree, settings scopes, and plugin placements |
| [System architecture](./system-architecture.md) | System context, module boundaries, technology stack, runtime topology, and major request flows |
| [Data and API architecture](./data-and-api-architecture.md) | Domain model, persistence, HTTP API, real-time invalidation, events, search, migrations, and portability |
| [Plugin system](./plugin-system-design.md) | Browser-standard runtime contract, React/vanilla SDK tooling, contributions, permissions, isolation, packages, events, jobs, and marketplace readiness |
| [Plugin UI system](./plugin-ui-system.md) | Supported authoring stacks, Ant Design integration, public UI packages, theming, packaging, and compatibility policy |
| [Plugin storage](./plugin-storage-design.md) | `data/schema.ts`, typed collections, generated clients, automatic safe schema evolution, and data lifecycle |
| [Plugin CLI](./plugin-cli-design.md) | Scaffolding, disposable/connected live development, build adapters, generation, validation, tests, normalized packaging, inspection, and SDK upgrades |
| [Theme system](./theme-system-design.md) | Semantic tokens, JSON format, runtime resolution, installation, accessibility, and plugin integration |
| [Security and operations](./security-and-operations.md) | Trust boundaries, authentication, authorization, secrets, deployment, backups, observability, and recovery |
| [Local operations](./local-operations.md) | Implemented local/container startup, migration, backup, verification, restore, and shutdown commands |
| [Development and delivery](./development-and-delivery.md) | Proposed monorepo, dependency rules, developer workflow, testing, CI, releases, and implementation phases |
| [Package boundaries](./package-boundaries.md) | Active workspace ownership, visibility, and allowed dependency directions |
| [Implementation roadmap](./implementation-roadmap.md) | Ordered phases, task IDs, dependencies, release boundaries, verification, and exit gates |

## Architecture baseline

The following decisions are the baseline for v1:

- A **modular monolith**, not microservices.
- **TypeScript** across the server, web client, SDK, CLI, and first-party plugins.
- **Node.js 24 LTS** as the supported production runtime.
- **Fastify** for the HTTP server and JSON Schema-based request/response contracts.
- **React 19** with **Vite 8** for the client-side application.
- **SQLite in WAL mode** as the initial database for both local and small-team VPS deployments.
- **Drizzle ORM**, pinned to a tested stable release, for schema definitions, typed queries, and migrations; SQL remains visible and reviewable.
- **Better Auth** for authentication and session management, behind a Launch++ identity adapter.
- **REST-style JSON APIs**, an OpenAPI document, and generated TypeScript clients; no private frontend-to-database path.
- **Server-Sent Events** for invalidations and notifications; ordinary HTTP for reads and writes.
- A **database-backed outbox and job runner**; no mandatory Redis, message broker, or external queue.
- **Browser-standard sandboxed plugin UI**, with React/TypeScript and vanilla as the only supported v1 authoring paths, plus a brokered capability-based server runtime.
- **Ant Design** behind `@launchpp/ui` for the application and React plugins, with `@launchpp/ui-tokens` for custom React and vanilla surfaces.
- **Host-managed plugin collections** generated from `data/schema.ts`; plugin authors write no SQL or migration files.
- **Declarative JSON themes** translated into semantic CSS custom properties.
- **pnpm workspaces** for the monorepo, **Vitest** for unit/integration tests, and **Playwright** for browser flows.
- One production image containing the server, static web assets, migrations, plugin runtime, and job runner.

Dependency versions will be pinned in the lockfile when implementation starts. Major versions above record the currently selected compatibility line, not an instruction to float to whatever is latest.

## Decision status

| Decision | Status | Notes |
| --- | --- | --- |
| Modular monolith | Accepted | Best fit for a small product and simple self-hosting |
| Node.js + Fastify | Accepted | Shared TypeScript ecosystem and schema-first transport |
| React SPA + Vite | Accepted | One client architecture for local, hosted, and future desktop shells |
| SQLite-first | Accepted | One-file ownership and simple operations; measure before adding PostgreSQL |
| REST + SSE | Accepted | Stable, language-neutral API without a WebSocket requirement |
| JSON themes | Accepted | Declarative and non-executable |
| UI information architecture | Accepted for iteration | Global icon rail, organization navigation, shared project views, route-backed task detail, and scoped Settings |
| Plugin public contract | Accepted | Manifest, capabilities, slots, commands, events, and owned storage |
| Plugin authoring stacks | Accepted | React/TypeScript is recommended and vanilla HTML/CSS/JavaScript or TypeScript is supported; Vue, Svelte, and Angular are outside the planned v1 scope |
| Plugin UI component system | Accepted | Ant Design powers the host and `@launchpp/ui`; public Launch++ tokens remain the custom-style contract |
| Connected plugin Developer Mode | Accepted with security prototype | Operator-enabled, short-lived, author-scoped live sessions use production sandbox and permission boundaries |
| Plugin data evolution | Accepted | Safe schema diffs are automatic; destructive/ambiguous changes are rejected |
| Project-local plugin CLI | Accepted | Scaffold, develop, generate, validate, test, package, inspect, and upgrade |
| QuickJS/WASM server plugin runtime | Prototype required | Do not claim untrusted-code safety until adversarial tests pass |
| Sandboxed iframe plugin UI | Prototype required | Network egress and navigation confinement must be validated |
| Better Auth integration | Accepted with adapter | Launch++ authorization remains application-owned |
| PostgreSQL support | Deferred | Add only when measured SQLite limits or hosted requirements justify it |
| Bun production runtime | Deferred | Node 24 LTS is the sole supported production runtime for v1 |
| Go components | Deferred | A future installer, updater, or supervisor may use Go |
| Marketplace and billing | Deferred | Package identity and signing are designed now; commerce follows a stable SDK |

## Documentation authority

The system architecture owns cross-cutting boundaries and deployment topology. The plugin system owns extension capabilities and runtime lifecycle; the plugin UI system owns supported authoring stacks and the public component boundary; the theme document owns visual tokens. The data/API document owns wire and persistence conventions. The security/operations document owns production controls.

If two documents conflict, resolve the conflict before implementation rather than silently choosing one. A meaningful change to an accepted decision should be recorded in the decision table and reflected in every affected document.

## Current repository state

The repository contains the implemented Phase 0 foundation and an in-progress core alpha. The implementation roadmap and package guides identify what is operational today; later-phase commands and structures in design documents remain proposals until implemented. Nothing is an explicitly supported public release yet.

## External technical references

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [Fastify JSON Schema and TypeScript support](https://fastify.dev/docs/latest/Reference/Type-Providers/)
- [React versions](https://react.dev/versions)
- [Vite release policy](https://vite.dev/releases)
- [Ant Design for React](https://ant.design/docs/react/introduce/)
- [Ant Design theme customization](https://ant.design/docs/react/customize-theme/)
- [pnpm workspaces](https://pnpm.io/workspaces)
- [Drizzle with SQLite](https://orm.drizzle.team/docs/get-started/sqlite-new)
- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify)
- [SQLite write-ahead logging](https://www.sqlite.org/wal.html)

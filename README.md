# Launch++

Launch++ is an open-source, modern, minimalist project management tool that grows through plugins and themes.

> Adapt it to your work, not the other way around.

The architecture and technical-foundation phase is complete. A runnable server/web shell and feasibility implementations now prove the persistence, identity, plugin protocol, browser isolation, constrained server runtime, deterministic package intake, CI, and measurement boundaries. This is not yet a supported product release, public SDK, or installer.

## Product direction

Launch++ starts with a focused core:

- Workspaces and projects
- Tasks, subtasks, statuses, assignees, and labels
- Comments and activity
- Board and list views
- Search and basic team permissions
- Backup, export, and import

Workflow-specific features such as sprints, story points, time tracking, integrations, automations, advanced calendars, and reporting belong in plugins whenever practical. Themes change supported visual tokens without changing behavior.

The same application should run locally with SQLite and later move to a small VPS without changing the product architecture or plugin format.

## Architecture at a glance

- TypeScript modular monolith
- Node.js 24 LTS and Fastify backend
- React 19 and Vite 8 web client
- SQLite, Drizzle, transactional outbox, and database-backed jobs
- REST-style JSON API, OpenAPI, and Server-Sent Events
- Browser-standard plugin runtime with first-class React/TypeScript and vanilla authoring, Ant Design-powered React UI, and declarative contribution points
- Typed plugin collections generated from `data/schema.ts`, with no author-written SQL or migration files
- Sandboxed plugin UI and capability-brokered server execution
- JSON theme tokens resolved to semantic CSS variables
- pnpm workspaces, Vitest, and Playwright
- One self-hostable production image with no mandatory Redis or external database

## Documentation

Start with the [architecture documentation](./docs/README.md).

The documentation set covers:

- Product scope and explicit non-goals
- Complete system and module architecture
- Frontend, backend, API, and data design
- Plugin and theme authoring/runtime architecture
- Authentication, authorization, sandboxing, and supply-chain security
- Local/VPS operations, backups, upgrades, observability, and recovery
- Proposed monorepo, engineering conventions, testing, CI, and delivery phases

All commands and directory structures described in the design documents remain proposals until implementation begins.

## Development foundation

Phase 0 implementation uses the exact Node.js version in `.node-version` / `.nvmrc` and the pnpm version declared in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm start:server
pnpm dev:server
pnpm dev:web
```

Use `pnpm dev:server` while changing backend code. It incrementally rebuilds the server and its workspace dependencies, then restarts Fastify automatically after each successful emit.

The root checks cover formatting, linting, TypeScript project references, unit and contract tests, migrations, and workspace architecture boundaries. Browser isolation tests are available through `pnpm test:browser`; the focused abuse suite uses `pnpm test:adversarial`, and the reproducible foundation budgets use `pnpm measure:foundation -- --check`.

The server defaults to `http://127.0.0.1:3000`; see the [server workspace guide](./apps/server/README.md) for configuration and health endpoints.

The [web workspace guide](./apps/web/README.md) describes the React shell, Vite proxy, and public UI/token boundaries.

# Launch++ development and delivery guide

Status: proposed repository, engineering rules, quality strategy, and implementation sequence. Commands and directories described here do not exist yet unless already present in the repository.

The enforced pull-request checks and supply-chain rules are documented in the [continuous integration and supply-chain baseline](./ci-security-baseline.md).

## Engineering goals

- Make the correct module boundary the easy path.
- Keep local development close to the production topology without requiring infrastructure services.
- Prove public plugin and theme contracts outside the monorepo.
- Detect authorization, migration, portability, and isolation failures before release.
- Keep public SDK evolution separate from internal refactoring.
- Make releases restorable, attributable, and understandable to self-hosters.

## Proposed monorepo

```text
launchplusplus/
├── apps/
│   ├── web/                       React SPA and extension UI host
│   ├── server/                    Fastify composition root and static serving
│   ├── admin-cli/                 Backup, restore, doctor, migration, and recovery CLI
│   └── plugin-playground/         Disposable author preview host
├── packages/
│   ├── api-contracts/             HTTP schemas, errors, pagination, generated client inputs
│   ├── api-client/                Generated/handwritten thin client used by web and future clients
│   ├── core/                      Domain and application modules
│   ├── authorization/             Product policy engine and test matrix
│   ├── database/                  Drizzle schema, repositories, transactions, migrations
│   ├── auth-adapter/              Better Auth integration and actor mapping
│   ├── jobs/                      Outbox dispatcher, scheduler, leases, retry policy
│   ├── search/                    FTS projection and permission-filtered query adapter
│   ├── storage/                   Package, asset, backup, and secret-vault ports/adapters
│   ├── config/                    Typed environment/config parsing
│   ├── observability/             Logging, metrics, tracing, and redaction
│   ├── ui/                        Public React `@launchpp/ui`, powered by Ant Design
│   ├── ui-tokens/                 Browser-standard CSS variables, icons, and base styles
│   ├── plugin-protocol/           Manifests, RPC, permissions, contributions, public schemas
│   ├── plugin-runtime/            Isolated server runtime and supervisor
│   ├── plugin-platform/           Registry, broker, package/lifecycle services
│   ├── plugin-data/               Public `@launchpp/data` schema DSL and generators
│   ├── plugin-sdk/                Public browser/server SDK
│   ├── plugin-cli/                Create, dev, check, test, and pack tooling
│   ├── plugin-testkit/            Fixtures, mock host, protocol and isolation tests
│   ├── theme-schema/              Theme tokens, metadata schemas, and validators
│   └── theme-runtime/             Resolution, fallbacks, and CSS-variable mapping
├── examples/
│   ├── story-points/
│   ├── checklist-importer/
│   ├── time-tracking/
│   ├── due-date-calendar/
│   └── themes/
│       └── midnight/
├── migrations/                    Reviewed ordered core/auth SQL migrations
├── tests/
│   ├── e2e/                       Playwright product journeys
│   ├── contracts/                 API/plugin/theme compatibility fixtures
│   ├── adversarial/               Sandbox, archive, schema, SSRF, and auth abuse fixtures
│   ├── migration/                 Upgrade/downgrade/restore datasets
│   └── performance/               Reproducible reference workloads
├── infra/
│   ├── container/                 Production image files
│   ├── compose/                   Supported simple VPS example
│   └── caddy/                     Optional TLS proxy example
├── docs/
├── scripts/                       Small repository/release automation only
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
└── biome.json
```

Create these directories incrementally. The tree is a target ownership map, not a reason to generate empty packages.

## Package responsibilities

### `packages/core`

Contains domain and application modules under clear subdirectories:

```text
core/src/
├── identity/
├── workspaces/
├── projects/
├── tasks/
├── comments/
├── activity/
├── notifications/
└── shared/
```

Each module may contain domain types, use cases, service interfaces, repository ports, events, and tests. It cannot import Fastify, Drizzle, Better Auth, React, or plugin implementation packages.

Start with one `core` package to avoid package-per-entity overhead. Split a module only when it has a real independent public/release boundary or build-cost problem.

### `packages/database`

Owns physical schema, SQL migrations, transaction implementation, and repository adapters. It maps database rows to domain/application models. Drizzle query objects do not escape this package.

Raw SQL is allowed when it improves correctness or query quality, but it must be parameterized, tested, and located beside the repository/migration it supports. Production migrations are reviewed SQL artifacts rather than unreviewed runtime schema synchronization.

### `packages/api-contracts` and `api-client`

Contracts contain transport-facing TypeBox/JSON schemas and TypeScript types. They may reuse small stable value schemas but should not serialize domain classes. The client translates HTTP, problem details, cursors, cancellation, and retry metadata into an ergonomic internal API.

OpenAPI is generated and diffed in CI. The web app consumes the client package, not direct ad hoc `fetch` calls spread across components.

### `packages/plugin-*`

Public packages are deliberately separate from application internals. `plugin-protocol` has no React/Fastify/database dependency. `plugin-data` provides the constrained `@launchpp/data` schema DSL without a database driver. `plugin-sdk` exposes a framework-neutral core plus `@launchpp/sdk/react`. `ui` is the React component contract powered by a pinned Ant Design line; `ui-tokens` is the browser-standard CSS/icon contract for custom React and vanilla UI. `plugin-platform` is trusted host implementation; external authors never import it. `plugin-cli` implements the React/TypeScript and vanilla workflows specified in [plugin-cli-design.md](./plugin-cli-design.md), including compilation of the [plugin storage schema](./plugin-storage-design.md) into static declarations and generated clients.

### Theme packages

`theme-schema` stays runtime-neutral so the server, CLI, editor tooling, and web client use identical validation. `theme-runtime` accepts validated input and returns a complete resolved token set without reading a database or browser globals.

## Dependency policy

Allowed direction:

```text
contracts/value schemas
        ↑
core domain/application ← authorization
        ↑
host platform services
        ↑
infrastructure adapters
        ↑
application composition roots
```

Public SDK direction:

```text
plugin-protocol ← plugin-data ─┐
                ← plugin-sdk  ├─ external plugin
                ← ui          │
                ← ui-tokens   ┘
theme-schema    ← theme authoring tools
theme tokens    ← @launchpp/ui and custom React/vanilla surfaces
```

Rules enforced by a dependency-boundary test:

- `core` imports no `apps/*`, infrastructure, ORM, web, or plugin implementation.
- `database` implements core/platform ports but core never imports it.
- `web` does not import database, server, auth internals, or plugin runtime.
- `plugin-sdk`, `ui`, and `ui-tokens` do not import application packages; the React binding depends on the core SDK, never the reverse.
- Examples import only published public packages and ordinary third-party browser dependencies.
- No application code imports from another package's `src/` path.
- No circular workspace dependency is allowed.
- Package entry points explicitly export supported APIs; internal folders remain private.

Use pnpm's `workspace:` protocol for local package dependencies. CI performs at least one packed-install test so symlinks do not hide missing exports or dependencies.

## Source conventions

### TypeScript

- Enable strict mode, `noUncheckedIndexedAccess`, and ESM-compatible resolution.
- Avoid `any`; boundary code starts from `unknown` and validates/narrows it.
- Prefer named exports internally. Default exports are reserved for conventions such as plugin UI entry modules.
- Use discriminated unions for state machines, results, and versioned message families.
- IDs use branded/opaque types inside application code to prevent accidental cross-entity mixing.
- Inject clock and ID generation into domain/application tests.
- Do not call `Date.now()`, random ID helpers, environment access, or global network functions deep inside domain modules.
- Keep generated files in explicit generated directories and never edit them manually.

### Errors

Expected application failures use stable typed error values such as `TaskNotFound`, `PermissionDenied`, `RevisionConflict`, or `PluginPaused`. The transport layer maps them to documented problem responses. Infrastructure failures retain a cause for logs but expose a safe stable error.

Assertions and thrown exceptions represent programming errors or unexpected infrastructure failure, not ordinary validation or permission branches. Every top-level request/job/invocation boundary has one error mapper and correlation context.

### Schemas

- Application-owned wire schemas are code-reviewed and versioned.
- Set `additionalProperties: false` unless extensibility is intentional and documented.
- Put bounds on strings, arrays, objects, recursion, and numeric ranges.
- Validate responses in test/development; production serialization follows trusted response schemas.
- Never execute or compile an uploaded schema in the primary request path without restricted validation.
- Generate examples and API docs from schema fixtures where practical.

### Database

- Every table and index name is stable snake_case.
- Every workspace-owned table includes or derives an authoritative workspace relation.
- Foreign keys and unique/check constraints protect invariants where SQLite can express them.
- Repository functions take an explicit transaction/context rather than starting hidden nested transactions.
- Avoid N+1 reads in list/projector paths; tests include query-count or plan assertions for important screens.
- Do not put external calls or plugin execution inside a transaction.

### React

- Route components orchestrate data and composition; reusable presentation belongs in feature/UI components.
- Server state stays in TanStack Query, not copied into a global store.
- URL-addressable filters and selections use router state.
- Effects are for synchronization with external systems, not routine data derivation.
- Every asynchronous surface defines pending, empty, error, forbidden, and stale/conflict behavior.
- Components use semantic theme variables and `@launchpp/ui`; core screens do not bypass accessibility primitives casually.
- React plugins consume Ant Design through `@launchpp/ui`; direct application imports, `.ant-*` selector dependencies, and assumptions about Ant DOM structure are unsupported.
- New interaction patterns include keyboard behavior and Playwright coverage.

### Plugin browser surfaces

- Author source uses React/TypeScript or vanilla browser code in v1. Other component frameworks are out of scope.
- `@launchpp/sdk` remains framework-neutral; React hooks and lifecycle bindings live in `@launchpp/sdk/react`.
- Each custom contribution compiles to one normalized HTML document plus archive-local CSS, JavaScript and assets.
- Source `launchpp.plugin.json` entries never appear unchanged in the installed contract; `pack` writes a generated `manifest.json` whose surface references are framework-independent.
- Framework build processes run only on the author machine or CI. Launch++ installation and startup never execute them.
- Framework HMR is an authoring feature, not a runtime dependency. Safe iframe reload is the compatibility fallback.

### Naming

- Package names: `@launchpp/<name>` for public packages and `@launchpp-internal/<name>` or `private: true` for non-public packages.
- File names: lower kebab-case except conventional React components if the team chooses PascalCase consistently.
- Domain events: past tense, for example `task.updated`.
- Commands/use cases: imperative intent, for example `moveTask`.
- Permission IDs: resource/action, for example `tasks:read`.
- Plugin capabilities: publisher/plugin plus stable local ID.

## Proposed developer workflow

### Prerequisites

- Node.js 24 LTS
- Corepack-enabled pinned pnpm version
- A supported modern browser for Playwright
- No external database, Redis, or queue for ordinary development
- Docker only for production-image and deployment tests

### Target commands

```text
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm package
```

These commands are architectural targets, not currently implemented scripts.

`pnpm dev` should start Fastify, Vite, the dispatcher, and a seeded local database with coordinated logs and graceful shutdown. It should not require the developer to launch five infrastructure containers.

`pnpm check` should run formatting verification, linting, TypeScript, schema generation/diff, plugin data compatibility, architecture boundaries, and documentation checks.

### Local state

Development uses an explicit repository-local ignored data path or a temporary directory selected by the developer config. Tests use unique temporary directories and never reuse a developer's database.

Seed scenarios include:

- Solo workspace with an empty project
- Small team with board/list activity
- Archived and recoverably deleted records
- Permission edge cases
- Plugin enabled/disabled/unhealthy states
- Large representative board/search dataset
- Light/dark/high-contrast themes

Seed credentials are development-only and the server refuses them in production mode.

## Testing strategy

### Test layers

| Layer | Scope | Tools/approach |
| --- | --- | --- |
| Domain unit | Invariants, policies, ordering, state machines | Vitest, fake clock/IDs, no I/O |
| Schema/contract | Requests, responses, events, manifests, themes | Fixtures plus positive/negative/property tests |
| Repository integration | SQL constraints, transactions, queries, migrations | Real temporary SQLite files |
| Service integration | Authorization, outbox, idempotency, plugin broker | Real repositories and controlled adapters |
| HTTP integration | Routing, auth context, headers, problem mapping | Fastify injection and real SQLite |
| Component | Design system and complex feature interactions | Testing Library in browser-like runtime |
| End-to-end | Critical user and operator journeys | Playwright against packaged-like app |
| Adversarial | Sandboxes, packages, uploads, SSRF, schemas, auth | Purpose-built malicious fixtures |
| Migration/recovery | Old datasets, failed upgrade, backup restore | Versioned database and package fixtures |
| Performance | Reference query/UI/runtime budgets | Repeatable workloads outside normal unit suite |

SQLite integration tests use real files for WAL, locking, backup, and migration behavior. In-memory tests are acceptable for narrow query logic but cannot qualify production persistence behavior.

### Core journey suite

- First setup, owner creation, login/logout, and recovery boundaries
- Workspace/project creation and membership invitation
- Create/edit/move/archive/restore task in board and list
- Assignment, labels, comments, activity, search, and concurrent edit conflict
- Keyboard-only navigation through primary flows
- Theme import, preview, activate, fallback, and removal
- Plugin upload, review, enable, action, custom page, disable, and retained data
- Laptop-style workspace export and clean-server import
- Backup, upgrade migration, failed migration, and restore

### Plugin qualification suite

Run each official reference plugin as a packed external artifact, not a workspace source import:

- Story Points validates declarative fields across edit/list/filter/export.
- Checklist Importer validates action inputs, preview, confirmation, atomic mutation, and replay.
- Time Tracking validates typed collections, actor ownership, jobs, one-active-timer constraint, and retry safety.
- Due-date Calendar validates custom browser routes, theme propagation, accessibility, query invalidation, and surface-local failure. A small vanilla compatibility fixture proves that normalized surfaces do not depend on React.

Adversarial fixtures cover infinite loops, allocation, deep/large payloads, protocol forgery, filesystem/native imports, package traversal, browser egress/navigation, SSRF redirects/rebinding, output/log floods, revoked grants, and cross-workspace IDs.

### Contract compatibility

Keep fixtures from supported API/plugin/theme versions. A compatibility test runs current readers/runtimes against old valid artifacts and ensures unsupported future versions fail at install/handshake with a clear error.

OpenAPI, plugin protocol schemas, theme schema, and generated SDK snapshots are reviewed diffs. A type-check-only test project installs packed public packages to catch missing files, exports, peer dependencies, and accidental monorepo aliases.

## Continuous integration

### Pull request gates

1. Lockfile and dependency policy verification
2. Formatting and linting
3. TypeScript build/type checks
4. Architecture/import boundary tests
5. Unit and schema/contract tests
6. Repository/service/HTTP integration tests
7. Production web/server/public-package builds
8. OpenAPI and generated-artifact drift check
9. Focused Playwright smoke journeys
10. Package archive and external example install test when extension code changes
11. Migration up test from the oldest supported fixture when persistence changes
12. Markdown links, Mermaid syntax, and documentation index checks

### Scheduled/nightly gates

- Full browser matrix and accessibility scans
- Adversarial plugin/browser/runtime suite
- Large-dataset query plans and performance trends
- Dependency and container vulnerability scans
- Backup/restore and workspace export/import round trips
- Plugin runtime leak, repeated timeout, and worker-replacement tests
- Long-running outbox/job retry and process-restart tests

### Release gates

- All supported-platform builds and tests
- Clean installation and first setup
- Upgrade from each supported release path
- Verified pre-upgrade backup and restore drill
- Packed reference plugins against the release artifact
- SBOM, checksums, signatures/provenance, release notes, and migration notes
- Known security issues triaged
- Performance results compared to the reference baseline
- Documentation matches actual commands, configuration, and limits

## Build and packaging

### Web

Vite produces fingerprinted static assets and a manifest. The server distribution embeds or copies those assets into a known read-only directory. A build fails if required runtime configuration is accidentally baked into public JavaScript as a secret.

### Server

Compile/bundle server ESM with source maps retained separately or protected according to release policy. Native `better-sqlite3` binaries are built or selected for each supported platform and exercised in CI. The artifact contains migration files and verifies their checksums at startup.

### Container

Use a multi-stage build with a minimal supported Node 24 runtime. Run as a fixed non-root user, expose only the HTTP port, declare the data volume, include a healthcheck compatible with the public liveness endpoint, and make the root filesystem read-only in the supported compose example.

Do not install dependencies, compile plugins, or download runtime code during container startup.

### Plugin package reproducibility

`plugin-cli pack` should:

1. Validate the source manifest and lockfile policy.
2. Resolve allowed entry points.
3. Invoke the selected local build adapter and normalize each browser contribution into an HTML document plus local assets; bundle server code separately with deterministic options.
4. Reject prohibited imports and unexpected dynamic loading.
5. Compile `data/schema.ts` into normalized static schema JSON and verify compatible evolution from the release baseline.
6. Emit the generated distribution manifest and clients required by the bundles.
7. Confirm that no SQL, database driver, migration file, environment file, or package lifecycle script enters the archive.
8. Sort archive paths, normalize timestamps/permissions, and exclude development files.
9. Compute per-file and archive digests.
10. Optionally sign the final canonical digest.
11. Run install-time validation against the output.

The same source and locked toolchain should produce the same unsigned `.launch-plugin` ZIP-compatible archive bytes. A raw framework `dist/` directory is never the upload contract. Signature metadata must not introduce nondeterministic content into the signed payload.

## Versioning

Launch++ has several independent version axes:

| Version | Meaning |
| --- | --- |
| Application SemVer | Server/web distribution and operational compatibility |
| Core database schema | Ordered installation migrations |
| HTTP API major | External/future-client wire compatibility |
| Plugin API version | Host capabilities and protocol contract |
| Plugin package SemVer | Individual plugin release/dependencies |
| Plugin data schema | Platform format version plus per-workspace canonical installed-schema digest |
| Theme schema version | Token vocabulary and semantics |
| Public npm package SemVer | SDK, UI, CLI, protocol, and theme tooling releases |

Do not derive one version mechanically from another. A patch application release may add a migration; an SDK package may release without a server release; a plugin package version does not change its public command contract version automatically.

### Release channels

- **Preview:** APIs and data may reset; used for architecture validation.
- **Beta:** migration path exists; plugin API changes require notes but may still break.
- **Stable:** documented compatibility window, verified backups/restores, supported upgrade paths, and security response policy.

The plugin API stays preview until external packed examples, isolation gates, automatic schema-evolution/rejection behavior, and independent author testing pass.

## Documentation practice

- Every public capability has schema reference, permissions, examples, error behavior, limits, and compatibility status.
- Every configuration value has default, security impact, mutability, and deployment examples.
- Every migration-affecting release has backup and rollback/restore notes.
- Architecture-changing pull requests update the relevant docs in the same change.
- Small consequential decisions receive an ADR or an entry in the documentation decision table.
- Examples compile and run in CI; avoid untested illustrative APIs in reference documentation.
- Clearly label proposals and future commands until they exist.

## Review and contribution workflow

1. Open an issue/design note describing user outcome, affected boundary, data/API changes, permissions, failure modes, and migration impact.
2. For public contracts, add or change schema fixtures before implementation.
3. Implement the smallest vertical slice through UI, API, domain, persistence, and tests.
4. Add authorization and failure-path tests alongside the happy path.
5. Update public docs/examples and generated snapshots.
6. Review query plans, logging/redaction, accessibility, and upgrade behavior when relevant.
7. Use a changeset for publishable package changes.
8. Merge only after CI and human review of security/data boundaries.

Large feature flags must have owner, removal condition, and migration behavior. Dead experimental paths should be removed rather than becoming permanent dual architectures.

## Implementation roadmap

The phase summary below defines delivery intent. The complete task breakdown, dependencies, release boundaries, and exit gates live in the [implementation roadmap](./implementation-roadmap.md), which is the delivery-level source of truth.

### Phase 0 — foundation and feasibility

Deliver:

- pnpm/TypeScript workspace, quality commands, and dependency rules
- Fastify health/config skeleton and React/Vite shell
- SQLite/Drizzle connection, migration runner, transaction/outbox proof
- QuickJS/WASM broker prototype and iframe confinement prototype
- Theme schema/resolver proof
- Packaged external plugin build proof

Exit gates:

- Architecture tests enforce core boundaries.
- Production-like process starts/stops safely with SQLite.
- Untrusted plugin claims are explicitly enabled or deferred based on adversarial results.
- One external read-only React plugin page and one minimal vanilla surface run without monorepo imports and package to the same normalized browser contract.

### Phase 1 — minimal solo vertical slice

Deliver:

- First setup, authentication, profile, workspace, and owner membership
- Projects, ordered statuses, tasks, subtasks, labels, board, list
- Revisions, activity, search, SSE invalidation
- Built-in light/dark/high-contrast themes
- Docker/local packaging and basic backup/restore

Exit gates:

- A solo user completes daily task work without plugins.
- Board/list consistency, concurrency conflict, search rebuild, and restore tests pass.
- Common interactions meet measured reference budgets.

### Phase 2 — plugin author preview

Deliver:

- Manifest schema, package validator, extension registry, permission review
- Framework-neutral public SDK, React bindings, Ant Design-powered `@launchpp/ui`, `@launchpp/ui-tokens`, React/vanilla CLI create/dev/check/pack, and operator-controlled connected Developer Mode
- Native field contributions and sandboxed custom project page
- Story Points and read-only Sprint Planner examples
- Inspector, scoped logs, theme bridge, safe-start mode

Exit gates:

- An external developer reaches a live React or vanilla page within the target onboarding time.
- A CLI session pairs with a local/VPS development instance, remains author-scoped, and expires without leaving contributions or grants behind.
- Story Points works across edit/list/filter/export with no plugin database migration.
- A broken plugin surface cannot break core navigation.

### Phase 3 — collaboration and durable behavior

Deliver:

- Invitations, admin/member roles, session revocation, notifications
- Declarative actions and native input/preview UI
- Plugin typed collections, atomic batches, commands, outbox subscriptions, jobs
- Checklist Importer and Time Tracking examples
- Workspace export/import with dormant plugin data

Exit gates:

- Authorization matrix and forged-context tests pass.
- Duplicate/restarted Time Tracking delivery creates one effect.
- A real workspace migrates from laptop to a clean VPS installation.

### Phase 4 — supported extension platform

Deliver:

- Plugin update/automatic-schema-evolution/disable/uninstall/purge lifecycle
- Due-date Calendar custom view
- Package provenance/signing policy and private distribution
- Full adversarial runtime/browser/package suite
- Theme import/editor preview and packaged theme families
- Stable SDK/API documentation and external author feedback

Exit gates:

- Isolation gates pass or executable third-party scope is formally reduced.
- Failed plugin update preserves a safe, documented state.
- SDK support policy and compatibility fixtures are published.

### Phase 5 — ecosystem and scale only when justified

Possible work:

- Marketplace discovery, billing, entitlements, and signed update channels
- Publisher-managed commercial plugins
- Hosted Launch++ control plane
- PostgreSQL/object storage/multi-process adapters
- Native installer/updater, potentially implemented in Go
- Desktop client consuming the same API

Entry requires evidence from real installations. None of these items should delay a strong minimal core and reliable extension SDK.

## Definition of done

A feature is complete only when applicable items are satisfied:

- User outcome and non-goals are clear.
- Domain ownership and invariants are explicit.
- API/event/plugin/theme schemas are versioned and documented.
- Authorization is tested for allowed and denied actors.
- Database constraints, indexes, query plans, migration, and rollback/restore impact are reviewed.
- UI includes keyboard, focus, responsive, loading, empty, error, stale, and permission states.
- Logs/metrics are useful and redact sensitive content.
- Retries, idempotency, cancellation, and partial failure are defined.
- Unit, integration, end-to-end, and adversarial tests match the risk.
- Public packages/examples work when packed outside the monorepo.
- Operator documentation covers configuration, upgrade, backup, and recovery changes.
- No undocumented private API became a dependency of a plugin or client.

## First implementation milestone

The first coding milestone should not attempt the complete project manager. Build a thin but real path:

```text
first-owner setup
  → create workspace
  → create project with default statuses
  → create/read/move one task
  → commit activity + outbox
  → invalidate the React query through SSE
  → render in board and list
  → back up and restore the database
```

In parallel, keep the plugin feasibility spike isolated from core delivery. Once the broker/runtime boundary is proven, add one read-only external React page, one minimal vanilla surface against the same protocol, and one declarative numeric task field. This sequence tests the architectural spine before multiplying features.

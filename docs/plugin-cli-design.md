# Launch++ plugin CLI and project workflow

Status: proposed developer tooling contract. No CLI package, scaffolder, templates, or development host has been implemented.

This document owns plugin project creation, local development, validation, code generation, testing, packaging, and SDK upgrades. It complements the [plugin system](./plugin-system-design.md) and [plugin storage design](./plugin-storage-design.md).

## Product goal

A browser developer should create a working plugin, see it inside a disposable or connected Launch++ development session, add typed data, and produce an uploadable package without learning Launch++ internals, SQL, framework-specific distribution layouts, RPC, iframe messaging, or database administration. React/TypeScript is the recommended template; vanilla HTML/CSS/JavaScript or TypeScript is an equally valid v1 runtime target.

The shortest path is:

```text
pnpm create launchpp-plugin
cd my-plugin
pnpm install
pnpm dev
```

The generated repository remains an understandable project in the selected authoring stack. The CLI automates platform-specific work but does not hide identity, permissions, entry points, or data declarations in undocumented magic.

## Tool packages

### `create-launchpp-plugin`

A small scaffolding package invoked through the package manager:

```text
pnpm create launchpp-plugin
npx create-launchpp-plugin@latest
```

It selects a template, writes source files, installs nothing without confirmation, and leaves `@launchpp/cli` pinned in the generated project.

### `@launchpp/cli`

A project-local development dependency providing the `launchpp` binary:

```json
{
  "scripts": {
    "dev": "launchpp dev",
    "check": "launchpp check",
    "test": "launchpp test",
    "pack": "launchpp pack"
  },
  "devDependencies": {
    "@launchpp/cli": "^1.0.0"
  }
}
```

Project-local installation makes builds reproducible and keeps different plugin projects on compatible CLI/SDK lines. A global CLI may delegate to the local version but is never required.

## Scaffolding flow

The default interactive flow asks only decisions needed to generate code:

```text
Create a Launch++ plugin

Plugin name: Sprint Planner
Plugin ID: acme.sprint-planner

Choose starting capabilities:
  ◉ Project page
  ◉ Plugin data
  ◉ Task action
  ○ Task panel
  ○ Settings
  ○ Background events/jobs
  ○ External API access

Framework:
  ◉ React + TypeScript (recommended)
  ○ Vanilla HTML + TypeScript
  ○ Vanilla HTML + JavaScript

UI:
  ◉ @launchpp/ui
  ○ Custom React components + @launchpp/ui-tokens

Package manager:
  ◉ pnpm

Create example tests? Yes
```

Prompts explain impact. `@launchpp/ui` is the recommended React choice and supplies Launch++-configured Ant Design components; custom React and vanilla templates receive `@launchpp/ui-tokens` or may use fully custom scoped CSS. Selecting external API access asks for destinations and adds the corresponding manifest permission; selecting no capability generates the minimal valid package.

Non-interactive flags support automation:

```text
pnpm create launchpp-plugin sprint-planner \
  --id acme.sprint-planner \
  --template page \
  --data \
  --package-manager pnpm \
  --yes
```

The command validates destination path, package/plugin IDs, framework/adapter compatibility, and existing files before writing. It never overwrites a non-empty directory unless the caller gives an explicit supported merge option and reviews the plan.

## Generated project

For the recommended React page/action/data plugin:

```text
sprint-planner/
├── launchpp.plugin.json
├── data/
│   └── schema.ts
├── src/
│   ├── actions/
│   │   └── createSprint.ts
│   ├── components/
│   │   └── SprintCard.tsx
│   ├── pages/
│   │   └── SprintsPage.tsx
│   ├── generated/
│   │   └── data.ts
│   └── styles.css
├── .launchpp/
│   └── released-schema.json
├── tests/
│   ├── actions.test.ts
│   └── plugin.test.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .gitignore
└── README.md
```

Generated code must run immediately. The README explains the exact selected capabilities rather than including a generic wall of documentation.

A vanilla page template replaces React components and React tests with `src/pages/sprints/index.html`, `src/pages/sprints/main.ts`, scoped CSS, and DOM-level tests. Both templates use the same root manifest, framework-neutral SDK, permissions, server-handler format, storage model and normalized distribution package.

`launchpp.plugin.json` remains authoritative. It records an allowlisted authoring adapter such as `react-vite` or `vanilla-typescript-vite`; `pack` removes that author-only field from the distribution manifest. Files and component names are conventions for humans; the CLI writes explicit manifest entries. Renaming a file without updating the manifest produces a precise `check` error.

## Templates

Initial templates should be composable capabilities with a separately selected framework adapter:

| Template | Generated surface |
| --- | --- |
| `minimal` | Manifest, scripts, test harness |
| `page` | Custom project page in the selected framework |
| `task-field` | Declaration and optional data schema, no custom UI required |
| `task-action` | Native input form plus server handler |
| `task-panel` | Custom task panel in the selected framework |
| `integration` | Settings, brokered HTTP handler, secret reference |
| `background` | Event/job handler and retry-safe example |
| `full-feature` | Page, action, data, settings, and representative tests |
| `theme` | `launchpp.theme.json` and theme preview workflow |

A template adds only the permissions it actually needs. The `full-feature` template is for learning and qualification, not the default recommendation. V1 ships official `react-typescript`, `vanilla-typescript` and `vanilla-javascript` adapters. Vue, Svelte, Angular and other component-framework templates are outside the planned v1 scope and are not shown as experimental choices.

## Command surface

```text
launchpp dev
launchpp add <capability>
launchpp generate
launchpp check
launchpp data check
launchpp data baseline <released-archive>
launchpp test
launchpp pack
launchpp inspect <archive>
launchpp upgrade
```

Marketplace authentication and `publish` are deliberately deferred. The first ecosystem works through file packages and private distribution.

## `launchpp dev` and Developer Mode

By default, `launchpp dev` starts a disposable development host and watches source files:

```text
Sprint Planner development host

✓ Manifest valid
✓ Data schema generated: 2 collections
✓ Browser entry built
✓ Server handlers built
✓ Fixture organization ready

Open: http://localhost:4173/dev/acme.sprint-planner
Watching for changes…
```

The host provides:

- Framework HMR when supported, with safe iframe reload as the fallback
- Seeded users, organizations, projects, and tasks
- Temporary isolated plugin collections
- Light, dark, and high-contrast preview
- Organization role and permission simulation
- Registered contribution/slot inspector
- Browser bridge and server invocation trace
- Scoped structured logs
- Data collection viewer and reset action
- Event/job delivery inspector
- Network destination inspector with fake credential references
- Disable, error, timeout, and revoked-permission simulation

Development uses the production protocol, capability checks, sandbox flags, and runtime limits. The dev host may improve source maps and diagnostics but must not grant filesystem/database access that disappears after packaging.

By default, plugin data lives in an isolated disposable profile under the project's ignored `.launchpp/dev/` directory. `--fresh` resets it after an explicit scoped confirmation. A named profile lets authors retain fixtures across restarts without touching a real Launch++ organization.

### Connecting to an existing installation

An installation operator can enable **Settings → Developer → Developer Mode**, which is disabled by default and displays a persistent warning while active. The author then runs:

```text
pnpm dev --connect https://launch.example
```

The CLI requests a short-lived one-time pairing code and opens the installation in a browser for confirmation. After the user confirms the plugin ID, requested permissions and development organization, the CLI opens an outbound authenticated TLS/WebSocket session. For a remote VPS, it streams compiled incremental browser/server artifacts; the server never reads the developer's filesystem or connects to localhost. A local installation may use an exact loopback dev origin when its content policy and mixed-content rules permit it.

The host registers the session as `dev:<session-id>:<plugin-id>` rather than replacing the installed package. It is visible only to the paired developer by default, is scoped to a dedicated development organization, expires automatically and may be revoked from either the CLI or Settings. Allowing selected test users is a later, explicit option; production-wide preview is not a v1 default.

The connection uses the same sandbox, broker, permissions, data boundaries, runtime quotas and network allowlists as a packaged plugin. Initial grants require approval and a manifest permission change pauses the session for another review. Developer Mode is an unsigned, temporary delivery channel—not a trusted mode and not a security bypass.

On disconnect, expiry or disabling Developer Mode, Launch++ removes ephemeral contributions and assets, revokes the session token, stops development handlers, and deletes or retains isolated dev data according to the selected profile. The CLI and plugin inspector show the same session identity and teardown result so stale development code is easy to detect.

## Hot reload behavior

- Browser changes use the framework adapter's HMR when available; otherwise the affected iframe reloads without resetting plugin records.
- Manifest contribution changes re-register the development plugin and show placement conflicts.
- Compatible data-schema changes update the dev catalog automatically and regenerate types.
- Incompatible schema changes keep the prior dev schema active and show repair guidance; only disposable dev storage may offer an explicit reset.
- Server-handler changes replace the next isolated invocation context.
- Permission changes require an explicit development grant review instead of silently escalating.

Hot reload never weakens production compatibility checks. Errors appear in the CLI, a browser-surface overlay and the plugin inspector.

### Build adapter contract

`dev` and `pack` use a versioned build-adapter contract. An adapter resolves source entries from `launchpp.plugin.json`, starts or invokes the author's local build tool, reports diagnostics and emits one self-contained HTML document plus local assets for each custom surface. It may provide native HMR; otherwise the CLI requests an iframe reload. Build commands execute only on the author's machine or CI, never during installation.

The first-party v1 adapters use Vite for React and vanilla projects and are selected by the static `authoring.adapter` field in `launchpp.plugin.json`. The adapter allowlist contains only supported stacks; producing browser-compatible output is not sufficient to claim unsupported framework tooling. Advanced options may live in static, allowlisted `launchpp.build.json`; executable configuration is neither part of the installed package nor required by the host.

## `launchpp add`

Adds a capability to an existing plugin:

```text
launchpp add page
launchpp add collection
launchpp add action
launchpp add task-panel
launchpp add settings
launchpp add event-handler
launchpp add external-api
```

Example:

```text
$ pnpm launchpp add collection

Collection ID: sprints
Scope: project
Generate sample fields? Yes

Planned changes
  create data/schema.ts
  generate src/generated/data.ts
  update launchpp.plugin.json
  create tests/data.test.ts

Apply? Yes
```

The CLI parses and validates existing files, displays a plan, and writes atomically. It does not use fragile string replacement. If custom structure prevents a safe edit, it creates a patch file/instructions instead of guessing or overwriting code.

## `launchpp generate`

Reads author-owned declarations and produces CLI-owned artifacts:

- Typed data clients and optional framework bindings such as React hooks
- Manifest-derived context types
- Command/event capability clients
- Static canonical data schema for inspection
- Optional native contribution helper types

Generated files contain the CLI and protocol versions and a content hash of their inputs. `check` fails when generated artifacts are stale. Generation is deterministic for the same source, versions, and configuration.

The installer never relies on source-generated TypeScript; `pack` regenerates and independently validates static outputs.

## `launchpp check`

Runs fast, non-mutating validation suitable for an editor or CI:

```text
Manifest
  ✓ Identity and version valid
  ✓ API range supported
  ✓ Entry points exist

Permissions
  ✓ SDK calls covered by declared grants
  ! tasks:write declared but unused

Data
  ✓ 2 collections and 4 indexes
  ✓ Compatible with released schema
  ✓ No data deletion or author migration

Browser
  ✓ Imports browser-compatible
  ✓ No forbidden network/process modules

Server
  ✓ Handler exports match manifest
  ✓ Runtime bundle uses supported APIs

Package
  ✓ Generated artifacts current
  ✓ Size within supported limits
```

Checks include:

- Manifest schema, IDs, versions, slots, dependencies, and contribution collisions
- Entry paths/exports and duplicate IDs
- Data schema IDs, relations, indexes, limits, and compatibility
- Declared versus statically discoverable SDK capabilities where analysis is reliable
- Browser/server dependency separation and prohibited imports
- Direct `antd` imports, `.ant-*` selector dependencies, and application-private UI imports; official React projects consume `@launchpp/ui`
- Theme/token use warnings for custom UI
- Generated artifact freshness
- Package/file/asset size projections
- Required tests/metadata for the chosen release channel

Warnings do not silently become errors in a patch CLI release. CI can opt into `--warnings-as-errors`.

## `launchpp data check`

Provides the detailed storage report:

```text
Data schema: compatible

Changes from released 1.0.0
  + sprints.goal              optional string
  + sprints.status.cancelled  enum option
  + index sprints.by_status

Automatic host work
  build 1 non-unique index
  no record rewrite
  no deleted data

Manual SQL                 never required
Migration files            none
```

When connected to a development host, it can scan fixture data to test uniqueness, tightened limits, or a requested built-in conversion. The actual installation repeats compatibility checks against its own installed schema and records.

`launchpp data check --against <archive>` compares against a specific previously distributed package. If a marketplace version exists later, the CLI may fetch that signed baseline explicitly rather than guessing.

### Released schema baseline

The CLI never assumes that running `pack` means a package was published. After distributing a release, the author records the exact released artifact:

```text
launchpp data baseline ./dist/acme.sprint-planner-1.0.0.launch-plugin
```

The command verifies plugin identity, version and archive digest, extracts its canonical static data schema, displays the change, and writes `.launchpp/released-schema.json`. It cannot accept loose `schema.ts` as a released baseline. This makes later local checks useful without making the snapshot a security authority; every Launch++ installation still compares against its actually installed package and data.

## `launchpp test`

Runs ordinary Vitest tests plus platform fixtures selected by capabilities:

- Package installs and registers outside the Launch++ monorepo.
- Collection data is isolated by organization/plugin/scope.
- Disabled/revoked plugins cannot read or write.
- Generated hooks and handlers agree with schema types.
- Commands validate input/output and preserve idempotency.
- Event handlers tolerate duplicate delivery.
- Browser surfaces render in supported themes and keyboard flows.
- Declared network access uses the broker and rejects other destinations.

Authors write tests with `@launchpp/plugin-testkit`:

```ts
import { createPluginTestHost } from "@launchpp/plugin-testkit";

test("creates a project-scoped sprint", async () => {
  const host = await createPluginTestHost({ plugin: import.meta.dirname });
  const project = await host.fixtures.project();

  const result = await host.commands.invoke("createSprint", {
    projectId: project.id,
    name: "Launch",
  });

  expect(result.name).toBe("Launch");
  expect(await host.data.sprints.count({ projectId: project.id })).toBe(1);
});
```

The testkit is a protocol-compatible host, not a mock that exposes private application services.

## `launchpp pack`

Packaging is deterministic and never runs on the user's Launch++ server:

1. Run generation and all static checks.
2. Compile the source manifest into a distribution manifest.
3. Compile `data/schema.ts` into canonical `data/schema.json`.
4. Ask the selected local build adapter to compile every browser entry and eligible browser dependencies into a normalized HTML surface and local assets.
5. Tree-shake React and Ant Design-backed UI imports, enforce surface/package size limits, and record SDK/UI build versions.
6. Bundle eligible server dependencies for the isolated runtime.
7. Normalize asset paths, timestamps, permissions, and ordering.
8. Emit integrity metadata and optional publisher signature.
9. Reopen the archive and run install-time validation against it.

Output:

```text
dist/
└── acme.sprint-planner-1.1.0.launch-plugin
```

Archive contents:

```text
manifest.json
data/schema.json
browser/surfaces/sprints/index.html
browser/surfaces/task-panel/index.html
browser/assets/*.js
browser/assets/*.css
server/handlers.js
schemas/commands/*.json
schemas/events/*.json
assets/*
integrity.json
license.txt
```

`.launch-plugin` is a deterministic ZIP-compatible archive. Authors do not upload a raw Vite or other tool-specific `dist/` folder: those layouts and assumptions differ. `pack` is the normalization boundary. The source `launchpp.plugin.json` may point at supported `.tsx`, `.html`, `.ts`, `.js`, CSS and asset entries; the generated `manifest.json` points only to packaged HTML documents and bundles.

It does not contain:

- `node_modules`
- `.env` files or credentials
- Database drivers, SQL, or migration files
- Package-manager lifecycle scripts
- Development host data/logs
- Source maps containing local paths unless the selected distribution policy handles them safely
- Source TypeScript unless the publisher intentionally includes it as licensed auxiliary content

`pack` produces a permission/contribution/data summary suitable for attaching to review or release notes.

## `launchpp inspect`

Opens an archive without executing it and displays:

- Identity, publisher/provenance/signature, digest, and versions
- Contributions and placements
- Requested permissions and network destinations
- Data collections, scope, fields, indexes, and schema digest
- Browser/server entry points and sizes
- Bundled dependency inventory
- Integrity results and compatibility
- Differences from another archive when `--compare` is supplied

This command is useful to authors, administrators, CI, and marketplace review.

## `launchpp upgrade`

Updates the project's CLI, SDK, UI, protocol, and schema DSL within a selected compatibility line:

1. Inspect current manifest and dependency versions.
2. Fetch or use a supplied target compatibility guide.
3. Show source/generated/configuration changes.
4. Apply only known structured transformations after confirmation.
5. Regenerate clients/snapshots.
6. Run checks and tests.
7. Leave unresolved breaking changes as actionable diagnostics.

It never overwrites author-owned components/handlers merely to complete an upgrade. A failed upgrade leaves original files or a recoverable patch/stash according to the implemented safe-edit mechanism.

## Source ownership

| Path | Owner | CLI behavior |
| --- | --- | --- |
| `launchpp.plugin.json` | Shared author/CLI | Structured edits with preview |
| `data/schema.ts` | Author | Scaffold/add can insert only when safely parsed |
| `src/pages`, `actions`, `components` | Author | Create once; never overwrite automatically |
| `src/generated/*` | CLI | Regenerate atomically |
| `.launchpp/released-schema.json` | CLI/release state | Update only through `launchpp data baseline` using a released archive |
| Build configs | Shared | Update only recognized generated sections |
| `dist/` | CLI | Replace as build output |
| `.launchpp/dev/` | CLI local state | Ignored; reset only by scoped command |

Generated-file headers and Git attributes make ownership obvious. The CLI writes temporary siblings and renames them after successful validation so interruption does not leave half-written output.

## Configuration philosophy

The plugin manifest is the public configuration. Avoid a required executable `launchpp.config.ts`; it would make package inspection and reproducibility harder.

Advanced build options, if needed, live in a small static `launchpp.build.json` whose keys are allowlisted and versioned. Authors may customize their framework tooling only within the supported plugin build constraints. The CLI reports when customization makes a build non-portable. The installable archive never includes executable build configuration as an installation requirement.

## Diagnostics and UX

Every error includes:

- Stable code
- File and source location when available
- What Launch++ expected
- Why it matters at runtime/install time
- One or more concrete fixes
- Documentation link tied to the CLI major version

Example:

```text
LP_DATA_FIELD_TYPE_CHANGED

data/schema.ts:18:3
The persisted field sprints.storyPoints changed from string to number.

Launch++ does not reinterpret stored values automatically.
Add a new nullable numeric field and deprecate storyPoints.

https://launchpp.dev/docs/plugins/data/field-type-change
```

Human output is readable and colored when supported. `--json` provides a stable machine format for editors and CI. Secrets and full user record values are redacted from diagnostics.

## Privacy and telemetry

The CLI does not upload source, manifests, schemas, package contents, dependency lists, or usage telemetry by default. Crash/usage telemetry, if ever introduced, is opt-in and documents exact fields and destination.

Registry/marketplace commands naturally transmit packages and identity only after explicit invocation and preview. `dev` binds to loopback by default and never exposes the development host publicly without a clear opt-in warning and authentication.

## Compatibility

- The generated project pins a supported Node engine and package-manager version.
- CLI, SDK, UI, schema DSL, testkit, and plugin API compatibility are checked together.
- A newer CLI may inspect an older project but does not silently rewrite it.
- `pack` records tool/protocol versions and fails when the target host range is incompatible.
- The server trusts only the compiled static package and repeats all security/compatibility validation.
- Template updates do not mutate already-created plugins; `upgrade` handles explicit transitions.

## Acceptance criteria

- [ ] A developer reaches a live plugin surface from the React or vanilla scaffold within 15 minutes.
- [ ] The generated project runs without Launch++ monorepo source or unpublished aliases.
- [ ] Adding a collection requires no SQL, ORM configuration, or migration file.
- [ ] `dev` uses production protocol, permissions, and isolation while providing useful source diagnostics.
- [ ] Connected Developer Mode pairs with a local or VPS installation through a short-lived session, remains author-scoped, and tears down all ephemeral code and grants on disconnect or expiry.
- [ ] `check` catches manifest, data, permission, environment, and entry-point errors before upload.
- [ ] Generated files are deterministic, clearly owned, and never mistaken for author source.
- [ ] `add` and `upgrade` preview changes and do not overwrite custom code.
- [ ] `pack` produces a deterministic archive containing static schemas and compiled bundles only.
- [ ] `inspect` can explain an archive's identity, permissions, data, code surfaces, and integrity without executing it.
- [ ] A packaged reference plugin passes installation tests outside the monorepo.
- [ ] CLI diagnostics expose no credentials or real organization content.

## Decisions captured

- Scaffolding uses `create-launchpp-plugin`; ongoing commands use project-local `@launchpp/cli`.
- pnpm is the recommended generated package manager, while the scaffolder remains invokable from npm-compatible tooling.
- The manifest remains authoritative; file naming is convention, not registration.
- Templates are small composable capability starters.
- Development includes a disposable sandbox, fixtures, inspection, and hot reload.
- An operator-controlled Developer Mode can pair an existing installation with the CLI through a temporary authenticated channel; it never replaces an installed release or disables security boundaries.
- Data generation and compatibility checks are first-class CLI responsibilities.
- Plugins contain no SQL or author-maintained migrations.
- Packaging occurs on the author's machine/CI and produces a static uploadable archive.
- Plugin runtime output is browser-standard HTML/CSS/JavaScript. React/TypeScript and vanilla adapters are the supported v1 authoring choices; additional component frameworks are out of scope.
- The first distribution workflow is file upload; marketplace publishing is deferred.
- CLI automation remains inspectable, deterministic, non-destructive, and usable in CI.

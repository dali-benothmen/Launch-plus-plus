# Launch++ plugin author preview

Status: implemented preview contract for repository-based evaluation. The manifest and package
format are `1-preview`, the plugin API major is `1`, and the public packages currently use the
workspace version `0.0.0`. They are not yet published as a stable registry release.

This is the operational guide for creating, developing, checking, packaging, inspecting, uploading,
and enabling a Launch++ plugin. The architecture documents explain the longer-term design; this
guide describes what the current repository actually supports.

## Preview at a glance

| Area | Current status |
| --- | --- |
| Authoring paths | React with TypeScript (recommended), vanilla TypeScript, and vanilla JavaScript |
| Source contract | `launchpp.plugin.json` validated by the `1-preview` JSON Schema |
| Native contributions | Navigation, action placements, standard settings controls, and text/number task fields |
| Custom surfaces | React and vanilla surfaces run in the disposable development host; installed and connected custom-surface artifact delivery is not complete |
| Data access | Brokered project, task, and comment capabilities with explicit permissions |
| Development | Disposable local host or short-lived connected Developer Mode |
| Distribution | Deterministic `.launch-plugin` archive, non-executing inspection, manual upload, organization enablement, and project enablement |
| Trust | Uploaded packages are labeled unsigned local packages; integrity proves bytes, not publisher identity |
| Compatibility | Preview-only; no stable source or runtime compatibility promise yet |

The best complete example today is [Story Points](../examples/story-points/README.md). It declares a
host-managed numeric task field and needs no browser code, private import, SQL, or plugin-authored
migration.

## Prerequisites

- Node.js 24
- pnpm
- A Launch++ checkout with dependencies installed
- An organization-owner account for upload, enablement, and connected development

The author packages are currently workspace packages rather than public registry releases. Build the
tooling once from the repository root:

```bash
pnpm exec tsc -b \
  packages/plugin-protocol \
  packages/plugin-sdk \
  packages/ui-tokens \
  packages/ui \
  packages/plugin-cli \
  packages/create-launchpp-plugin \
  --pretty false
```

## Create a plugin

Until the packages are published, run the built scaffolder from the repository root and create the
project beneath `examples/` so pnpm links the workspace packages:

```bash
node packages/create-launchpp-plugin/dist/cli.js examples/my-plugin \
  --name "My Plugin" \
  --id "com.example.my-plugin" \
  --framework react-typescript \
  --capabilities project-page,task-field \
  --yes

pnpm install
pnpm --dir examples/my-plugin dev
```

The intended registry command, once the author packages are published, is:

```bash
pnpm create launchpp-plugin
```

Supported framework values are:

- `react-typescript`
- `vanilla-typescript`
- `vanilla-javascript`

Supported starting capabilities are:

- `project-page`
- `task-panel`
- `task-action`
- `settings`
- `task-field`

The scaffolder refuses to overwrite a non-empty directory and does not install dependencies. A
generated project contains:

```text
my-plugin/
├── launchpp.plugin.json
├── package.json
├── src/
│   ├── generated/launchpp.ts
│   └── ...selected source entries
├── tests/manifest.test.ts       # unless --no-tests was selected
├── tsconfig.json
├── vite.config.ts               # when a browser surface exists
└── README.md
```

`launchpp.plugin.json` is authoritative. `src/generated/launchpp.ts` is CLI-owned and must be
regenerated after changing the manifest.

## Source manifest

The source manifest identifies the plugin, selects a supported build adapter, requests permissions,
declares browser/server entries, and registers contributions. All objects are closed: misspelled or
unknown properties fail validation instead of being ignored.

A declaration-only task-field plugin can be this small:

```json
{
  "$schema": "./node_modules/@launchpp/plugin-protocol/schemas/plugin-source-v1-preview.json",
  "manifestVersion": "1-preview",
  "id": "com.example.story-points",
  "name": "Story Points",
  "description": "Estimate task effort.",
  "version": "1.0.0",
  "apiVersion": {
    "minimum": "1",
    "maximumExclusive": "2"
  },
  "authoring": {
    "adapter": "react-vite"
  },
  "permissions": [],
  "contributes": {
    "taskFields": [
      {
        "id": "story-points",
        "label": "Story points",
        "description": "Relative task effort.",
        "type": "number",
        "placements": [
          "task.details.fields",
          "task.card.badges",
          "task.list.columns"
        ]
      }
    ]
  }
}
```

The important top-level fields are:

| Field | Meaning |
| --- | --- |
| `$schema` | Editor completion and validation for the author-maintained manifest |
| `manifestVersion` | Preview manifest contract; currently `1-preview` |
| `id` | Stable, globally unique plugin identity; do not change it between releases |
| `version` | Package version; increase it when uploading different bytes under the same plugin ID |
| `apiVersion` | Half-open compatible host API range; preview plugins use `>=1 <2` |
| `authoring.adapter` | One of `react-vite`, `vanilla-typescript-vite`, or `vanilla-javascript-vite` |
| `permissions` | Exact capability grants requested from the organization owner |
| `browser.surfaces` | Source entries for custom pages, panels, or custom settings |
| `server.handlers` | Source entries and exports for declared actions |
| `contributes` | Pages, panels, actions, settings, and task fields registered with the host |

Contribution IDs must be unique across the entire plugin. Page, panel, and custom-settings surface
references must resolve to `browser.surfaces`; action handler references must resolve to
`server.handlers`.

The checked-in completion schemas are exported by `@launchpp/plugin-protocol`:

- `schemas/plugin-source-v1-preview.json`
- `schemas/plugin-package-manifest-v1-preview.json`
- `schemas/plugin-package-integrity-v1-preview.json`

## Contributions

| Contribution | Current author contract |
| --- | --- |
| Page | Organization- or project-scoped route and optional navigation entry backed by a custom surface |
| Panel | Custom surface placed in task details or the Board sidebar |
| Action | Host-rendered item in a project/task/Board/command slot backed by a declared handler |
| Settings | User, organization, or project settings using native fields or a custom surface |
| Task field | Host-managed `text` or `number` value rendered in task details, Board badges, and List columns |

Task-field values are stored by Launch++, survive project-level plugin disablement, and return when
the plugin is re-enabled. List placement includes native filtering, sorting, and CSV export. Authors
do not create a database table or migration.

The current installed application renders action placements but does not yet dispatch their declared
handlers. Native settings controls are a preview of the declared form and do not yet persist values.
See [Preview limitations](#preview-limitations) before choosing either contract.

## React authoring

React with TypeScript is the recommended path. Custom surfaces import hooks from
`@launchpp/sdk/react` and components from `@launchpp/ui`:

```tsx
import { PluginAsyncState, PluginPageLayout, Typography } from "@launchpp/ui";
import { useProjects } from "@launchpp/sdk/react";

export default function PluginSurface() {
  const projects = useProjects();

  return (
    <PluginPageLayout title="My Plugin">
      <PluginAsyncState loading={projects.loading} error={projects.error}>
        <Typography.Text>Visible projects: {projects.data?.length ?? 0}</Typography.Text>
      </PluginAsyncState>
    </PluginPageLayout>
  );
}
```

The supported surface compositions are `PluginPageLayout`, `PluginPanelLayout`,
`PluginSettingsLayout`, and `PluginSurfaceSection`. `PluginAsyncState` and its loading, empty, error,
forbidden, and unavailable variants provide consistent states. The adapter supplies the SDK/theme
bootstrap; do not create a private host transport or application provider.

Use public exports from `@launchpp/ui`. Do not import application source, import `antd` directly,
target `.ant-*` or generated class names, or depend on component DOM internals. `launchpp check`
diagnoses those unsupported boundaries.

## Vanilla authoring

Vanilla TypeScript and JavaScript use the same manifest, SDK bridge, permissions, theme, development
hosts, and package format. They do not receive React hooks or React components.

```ts
import { createClient } from "@launchpp/sdk";
import "@launchpp/ui-tokens/styles.css";

const client = await createClient();
const projects = await client.projects.list();

document.querySelector("#root")?.replaceChildren(
  Object.assign(document.createElement("p"), {
    textContent: `Visible projects: ${projects.length}`,
  }),
);
```

Use semantic variables such as `--launch-color-surface`, `--launch-color-text-primary`,
`--launch-color-border`, and `--launch-color-accent`. The typed variable names are available as
`semanticThemeTokens` from `@launchpp/ui-tokens`. Vanilla authors own keyboard behavior, focus,
accessible names/states, responsiveness, and reduced-motion behavior for custom controls.

## SDK and permissions

The SDK derives actor, installation, organization, project, granted permissions, locale, and theme
from the host handshake. A plugin must never accept those authority values from its own UI.

| SDK operation | Required manifest permission | Scope |
| --- | --- | --- |
| `client.projects.list()` / `useProjects()` | `projects:read` | Organization |
| `client.projects.create()` | `projects:write` | Organization; current user must also be an owner |
| `client.projects.update()` | `projects:write` | Project; current user must also be an owner |
| `client.tasks.list()` / `useTasks()` | `tasks:read` | Project |
| `client.tasks.get()` / `useTask()` | `tasks:read` | Project |
| `client.tasks.create()` | `tasks:write` | Project |
| `client.tasks.update()` | `tasks:write` | Project |
| `client.comments.list()` | `comments:read` | Project |
| `client.comments.create()` | `comments:write` | Project |
| `client.navigation.open()` / `.back()` | None | Current surface |
| Context and current theme | None | Current surface |

`members:read` is accepted by the preview manifest vocabulary, but the current public SDK does not
expose a member client. Do not request it unless a later preview adds the matching capability.

Calls are JSON-schema validated, permission checked, organization/project scoped, size limited,
time limited, cancellable, and returned as structured `LaunchppError` values. React queries cancel
their in-flight request when unmounted. Request only permissions your source actually uses;
`launchpp check` reports missing and unused grants.

## Add and generate

Add a supported contribution to an existing project:

```bash
pnpm launchpp add page
pnpm launchpp add task-panel
pnpm launchpp add action
pnpm launchpp add settings
pnpm launchpp add task-field
```

The command shows an exact file plan, validates the existing manifest, refuses to overwrite source,
and applies the manifest/file changes atomically after confirmation.

Regenerate manifest-derived types and fixtures after editing the manifest manually:

```bash
pnpm launchpp generate
```

The generated file records the CLI/protocol versions and manifest hash. `launchpp check` fails if it
is absent or stale.

## Validate

```bash
pnpm check
pnpm test
```

`check` is non-mutating and validates:

- manifest structure, API compatibility, IDs, routes, references, and entry files;
- declared versus discoverable permission use;
- handler exports and browser/server import boundaries;
- forbidden application-private imports;
- Node imports in browser entries and browser UI imports in server handlers;
- direct Ant Design imports and `.ant-*` selectors; and
- generated artifact freshness.

Use `pnpm launchpp check --warnings-as-errors` in stricter CI. `test` runs the same checks and then
the plugin project's local Vitest suite. Launch++ does not execute tests during package installation.

## Disposable development

From the plugin directory:

```bash
pnpm dev
```

The disposable host validates the manifest, prepares fixture organization/project/task data, starts
an inspector and isolated plugin origin, watches changes, and supports React HMR or vanilla iframe
reload. It stores ignored profile data under `.launchpp/dev/default`.

Useful options:

```bash
pnpm dev --profile retained
pnpm dev --fresh
pnpm dev --fresh --yes
pnpm dev --port 4300 --surface-port 4301
```

A fresh reset affects only the selected `.launchpp/dev/<profile>` directory.

## Connected Developer Mode

Connected mode registers a temporary unsigned development manifest in a running Launch++
installation. It does not replace an installed package or bypass permissions.

1. Start Launch++.
2. Open global **Settings** from the narrow blue rail.
3. Enable **Connected plugin development**.
4. From the plugin directory run:

   ```bash
   pnpm dev --connect http://localhost:5173
   ```

5. Open the printed approval URL, review the plugin identity, requested permissions, and project,
   then approve the pairing as the organization owner.

The pairing request lasts five minutes. An approved session lasts 30 minutes, is visible only to the
paired author, and is removed on `Ctrl+C`, revocation, expiry, server restart, or disabling Developer
Mode. A manifest permission change pauses registration until it is approved again.

Remote targets must use HTTPS. Loopback `http://localhost` and `http://127.0.0.1` are accepted for
local development. Connected mode currently refreshes host-rendered manifest contributions; it does
not stream compiled custom-surface or server-handler artifacts.

## Package and inspect

Create an installable archive:

```bash
pnpm run pack
```

The default result is:

```text
dist/<plugin-id>-<version>.launch-plugin
```

`pack` regenerates CLI-owned files, runs fast checks, compiles declared React/vanilla entries,
normalizes allowed files, records SHA-256 integrity metadata, writes deterministic ZIP bytes, and
reopens the result with the same non-executing intake validator used by the server. It does not copy
an arbitrary framework `dist/` directory or include source TypeScript, package scripts,
`node_modules`, source maps, or local development state.

Inspect without executing code:

```bash
pnpm launchpp inspect dist/com.example.my-plugin-0.1.0.launch-plugin
pnpm launchpp inspect dist/new.launch-plugin --compare dist/previous.launch-plugin
pnpm launchpp inspect dist/new.launch-plugin --json
```

Inspection reports identity, compatibility, provenance, permissions, contributions, entries, sizes,
dependencies, integrity, and—in compare mode—release changes.

## Upload and enable

1. Open **Plugins** in the narrow application rail.
2. Select the target organization.
3. Drop or select the generated `.launch-plugin` file.
4. Review identity, version, archive hash, compatibility, permissions, contributions, and
   diagnostics.
5. Enable the staged package for the organization.
6. Enable it for each project where project-scoped contributions should appear.

Upload inspects and stages the archive without executing it. The current UI accepts packages up to
10 MB. Different bytes cannot reuse the same plugin ID and version: increase `version`, pack again,
and upload the new archive.

Project disablement removes project UI and behavior while retaining host-managed task-field values.
Plugin safe mode in global Settings suppresses optional plugin contributions for the current browser
session while keeping plugin management available.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| `launchpp: not found` | Run `pnpm install` from the Launch++ workspace root for repository examples; confirm the generated project is under `examples/` |
| `ERR_PNPM_NO_OFFLINE_META` for `@launchpp/*@0.0.0` | The preview packages are not on the public registry. Use workspace linking and do not use `--offline` for a fresh external project |
| Generated artifacts are missing or stale | Run `pnpm launchpp generate`, then `pnpm check` |
| Pairing code or approval URL is `undefined` | Rebuild `packages/plugin-cli` and restart both Launch++ and the plugin command |
| Pairing expires | Enable Developer Mode, rerun the command, and approve within five minutes |
| Permission change pauses a connected session | Review and approve the changed permission set in organization settings |
| Package identity conflict | Increase the manifest version, pack again, and upload the new archive |
| Contribution is absent | Confirm organization enablement, project enablement, the declared slot/scope, and that plugin safe mode is off |
| Capability returns `FORBIDDEN` | Confirm the permission is declared and approved, project scope is enabled, and the signed-in actor has domain access |
| Capability returns `CONFLICT` | Reload the current resource and retry with its latest revision |
| A plugin disrupts the UI | Use global Settings to restart in plugin safe mode, then inspect or disable the package for the project |
| Custom page only shows a registered placeholder | Installed custom-surface delivery is not implemented in this preview; use the disposable host for the surface itself |

Error reports include a correlation identifier where available. Preserve it when reporting a broker
or server failure; do not include session tokens, pairing credentials, uploaded data, or secrets.

## Compatibility status

The supported preview boundaries are:

- `manifestVersion: "1-preview"` and plugin API range `>=1 <2`;
- the checked-in manifest/package/integrity schemas;
- public imports from `@launchpp/sdk`, `@launchpp/sdk/react`, `@launchpp/ui`, and
  `@launchpp/ui-tokens`;
- React 19 for the React adapter;
- the three built-in Vite adapters;
- normalized `.launch-plugin` archives produced by the matching preview CLI; and
- host-rendered contributions that the current application explicitly supports.

This is not a stable v1 release. Source manifests, SDK types, UI component contracts, generated
artifacts, package metadata, and accepted packages may change together during the preview. Rebuild
and repack plugins with the repository revision used by the target Launch++ installation.

External compatibility fixtures were intentionally skipped for this preview. Therefore no claim is
made yet that a plugin built solely from published npm packages outside this monorepo remains
compatible across independent Launch++ revisions.

## Preview limitations

- The author packages remain workspace version `0.0.0` and are not a supported public registry
  release.
- Installed and connected custom browser surfaces are registered, but the production application
  still shows a placeholder; use disposable development to run React or vanilla surfaces.
- Connected Developer Mode refreshes manifests and host-rendered contributions only; it does not
  deliver compiled browser or server artifacts.
- Action and command placements render, but application-side handler dispatch is not connected yet.
- Native settings fields render for review but do not persist values yet.
- Host-managed text/number task fields are the only durable plugin data in this phase.
- Plugin-owned collections, schema evolution, events, background jobs, webhooks, secrets, and
  brokered external network access are deferred.
- Organization-level disable/uninstall, package update/rollback UX, dependency resolution,
  signatures, publisher provenance, marketplace discovery, and billing are not implemented.
- `members:read` has no current SDK capability.
- Server-handler isolation is not a general guarantee for untrusted third-party code. Do not upload
  executable packages from authors you do not trust.

## Further reading

- [Plugin protocol](../packages/plugin-protocol/README.md)
- [Plugin CLI](../packages/plugin-cli/README.md)
- [Plugin UI system](./plugin-ui-system.md)
- [Plugin package and intake boundary](./plugin-package-proof.md)
- [Plugin system design](./plugin-system-design.md)
- [Security and operations](./security-and-operations.md)
- [Story Points reference plugin](../examples/story-points/README.md)

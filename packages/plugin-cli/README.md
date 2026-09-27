# `@launchpp/cli`

The project-local CLI for Launch++ plugin authors.

See the [Launch++ plugin author preview](../../docs/plugin-author-preview.md) for the complete
end-to-end workflow and current compatibility limits.

## Commands

```bash
pnpm launchpp dev
pnpm launchpp dev --fresh
pnpm launchpp dev --profile retained
pnpm launchpp dev --connect https://launch.example

pnpm launchpp add page
pnpm launchpp add task-panel
pnpm launchpp add action
pnpm launchpp add settings
pnpm launchpp add task-field
pnpm launchpp generate
pnpm launchpp check
pnpm launchpp check --warnings-as-errors
pnpm launchpp test
```

`add` validates the current manifest, shows an exact file plan, refuses to overwrite source files,
and updates the manifest atomically. The preview only generates contribution kinds supported by the
v1-preview protocol; collections, events, and external network declarations remain later APIs.

`generate` writes `src/generated/launchpp.ts`. The deterministic file contains its CLI/protocol
versions and manifest hash, manifest-scoped SDK client types, contribution ID unions, and a
protocol-compatible context/project/task fixture. New scaffolds include the current artifact.

`check` is non-mutating. It validates the source manifest and entry points, confirms handler exports,
compares discoverable SDK usage with declared permissions, rejects Node modules in browser entries,
browser UI dependencies in server handlers, direct Ant Design imports and `.ant-*` selectors, and
application-private imports. It also fails when generated output is missing or stale. Unused
permissions are warnings unless `--warnings-as-errors` is used.

`test` runs the same checks first and then invokes the plugin project's local Vitest suite. Arguments
after `--` are passed to Vitest.

## Development hosts

Disposable development binds two loopback-only origins: the fixture host and inspector, and an
isolated Vite plugin surface. No real Launch++ organization or installation is modified.

Connected mode creates a five-minute browser pairing request. An organization owner reviews the
plugin identity, requested permissions, and optional project scope before a 30-minute,
author-scoped session starts. Manifest changes re-register host-rendered contributions; permission
changes pause the session until the owner approves them again. `Ctrl+C`, server-side revocation,
expiry, or a server restart removes the ephemeral session. Loopback HTTP is accepted for local
development; remote installations require HTTPS.

## Packaging and inspection

```bash
pnpm launchpp pack
pnpm launchpp pack --output dist/custom-name.launch-plugin
pnpm launchpp inspect dist/com.example.plugin-0.1.0.launch-plugin
pnpm launchpp inspect dist/new.launch-plugin --compare dist/previous.launch-plugin
pnpm launchpp inspect dist/new.launch-plugin --json
```

`pack` regenerates CLI-owned artifacts, runs the fast checks, compiles each React or vanilla browser
surface with its supported Vite adapter, bundles eligible server-handler dependencies, normalizes
action schemas and package paths, and records deterministic build metadata. It then emits the
integrity-covered ZIP-compatible archive and reopens it through the production preview intake
validator before atomically writing the output file. Source maps, package scripts, source
TypeScript, development state, and arbitrary framework output are not included.

`inspect` never executes package code. It applies archive size/path/integrity limits and reports
identity, compatibility, unsigned-local provenance, permissions, contributions, browser/server
entries and sizes, and the bundled dependency inventory. `--compare` reports permission,
contribution, and file differences against an earlier archive; `--json` provides stable CI output.

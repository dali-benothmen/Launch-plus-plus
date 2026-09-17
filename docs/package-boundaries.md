# Package ownership and dependency boundaries

Status: active foundation contract.

Launch++ keeps application composition, product policy, infrastructure, public extension contracts, and UI contracts in separate workspaces. This makes forbidden dependencies fail in local checks and CI instead of becoming review conventions.

## Initial ownership map

| Workspace | Owner | Visibility | Responsibility |
| --- | --- | --- | --- |
| `apps/web` | Web | Internal | React application composition and sandboxed browser-surface host |
| `apps/server` | Server | Internal | Fastify composition root and process lifecycle |
| `packages/core` | Core | Internal | Framework-free domain and application contracts |
| `packages/database` | Persistence | Internal | SQLite/Drizzle schema, transactions, migrations, and repository adapters |
| `packages/api-contracts` | API | Internal | Versioned HTTP schemas and transport types |
| `packages/api-client` | API | Internal | Typed HTTP client used by browser consumers |
| `packages/authorization` | Core | Internal | Product policy evaluation, independent of identity providers |
| `packages/auth-adapter` | Identity | Internal | Better Auth integration, session resolution, and transport adapter |
| `packages/ui` | Design system | Public | Supported React component contract for core and plugin UI |
| `packages/ui-tokens` | Design system | Public | Framework-neutral tokens, CSS variables, icons, and base styles |
| `packages/plugin-protocol` | Plugin platform | Public | Versioned manifests, messages, permissions, and contribution schemas |
| `packages/plugin-runtime` | Plugin platform | Internal | Isolated server execution and supervision |
| `packages/plugin-testkit` | Plugin platform | Internal | Protocol, broker, isolation, and adversarial fixtures |

The machine-readable source of truth is [`config/architecture-boundaries.json`](../config/architecture-boundaries.json). A package must be registered there with one owner, visibility, canonical path, and explicit workspace dependency allowlist before it can enter the repository.

## Boundary rules

- Composition roots may connect packages, but domain packages cannot import composition roots.
- `core` is independent of databases, web frameworks, UI frameworks, and plugin implementation packages.
- Infrastructure packages implement inward-facing contracts; those contracts never import infrastructure adapters.
- Public browser and plugin packages cannot import product internals.
- Workspace dependencies use `workspace:*`, and source imports use only declared package exports.
- Imports from another package's `src/` directory and relative imports crossing a package boundary are forbidden.
- Runtime workspace dependency cycles are forbidden.
- Internal packages remain private; public package intent is explicit even before the first preview release.

Run `pnpm test:arch` locally. The dedicated boundary workflow runs the same command for every pull request and push to the default branch.

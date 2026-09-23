# Launch++ server

This organization is the trusted HTTP composition root. It owns process startup/shutdown and transport concerns; domain rules remain in `@launchpp/core`, authorization remains in `@launchpp/authorization`, and persistence remains in `@launchpp/database`.

## Run locally

```bash
pnpm build
pnpm start:server
```

For backend development, run the repository-level watcher instead:

```bash
pnpm dev:server
```

It watches the server and referenced backend organizations, recompiles changed TypeScript, and automatically restarts Fastify. Stop both watcher processes with `Ctrl+C`.

For the packaged-like local path, `pnpm local:start` builds the application and serves the compiled web client and API from `http://127.0.0.1:3000` in one process. The [local operations guide](../../docs/local-operations.md) covers the container and backup/restore workflows.

The local default listens on `127.0.0.1:3000` and stores state in `data/launchpp.sqlite`. Liveness is available at `/health/live`; readiness is available at `/health/ready`. Readiness becomes true only after the listener and migrated SQLite composition are available, and becomes false before graceful shutdown begins. Closing the server releases the Better Auth and application database connections after in-flight work.

On an empty database, local loopback access authorizes the setup browser automatically with a short-lived `HttpOnly` cookie. Startup also logs a one-time setup URL for remote/VPS operators; its fragment is exchanged for the same cookie and removed from the browser address before account creation. Both methods expire after 30 minutes, raw secrets are released after use, and only hashes remain in server memory. Until setup succeeds, non-setup API routes return `setup_required`; public account registration remains disabled after setup as well.

First-owner setup atomically creates the installation, Launch++ profile, default organization, active owner membership, audit facts, and outbox facts after Better Auth creates the identity. Existing development databases from the earlier authentication slice are repaired lazily on the first authenticated organization read by creating the missing profile and owner organization.

The authenticated organization endpoints currently support listing accessible organizations, creating and renaming an owned organization, and selecting the current organization. Reads are membership-filtered, selection requires an active matching membership, and organization-management authorization is owner-only. These are intentionally internal unversioned routes until the versioned HTTP contract task; invitations and additional role workflows remain unavailable.

The internal project endpoints expose the current project catalog, project and one-level folder lifecycle operations, ordering, archive/restore, and per-user favorite/recent state. Mutations use the same owner-only organization management policy in the solo slice; catalog reads and personal preferences require active membership. Project creation writes the project, three default statuses, audit entry, and outbox fact atomically. These routes remain internal until the versioned HTTP contract milestone.

## Configuration

Configuration is parsed once before the server is constructed. Unknown `LAUNCHPP_*` variables, malformed values, and insecure production origins stop startup before a listener opens.

| Variable | Default | Constraint |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `LAUNCHPP_AUTH_SECRET` | Development-only value | At least 32 characters and required explicitly in production |
| `LAUNCHPP_BASE_URL` | `http://localhost:5173` in development | Canonical browser-visible origin; required and HTTPS in production, with no path/query/hash |
| `LAUNCHPP_BIND_ADDRESS` | `127.0.0.1` | Explicit interface or hostname |
| `LAUNCHPP_DATABASE_PATH` | `data/launchpp.sqlite` | File-backed SQLite path; in-memory persistence is rejected |
| `LAUNCHPP_PORT` | `3000` | Integer from 1 through 65535 |
| `LAUNCHPP_LOG_LEVEL` | `info` | Pino severity or `silent` |
| `LAUNCHPP_TRUSTED_PROXIES` | Empty | Comma-separated exact addresses or CIDR ranges understood by Fastify |
| `LAUNCHPP_WEB_ROOT` | Unset | Optional compiled Vite output containing `index.html`; when set, Fastify serves the SPA and API from one origin |
| `LAUNCHPP_RATE_LIMIT_MAX` | `300` | Requests per client in the configured window |
| `LAUNCHPP_RATE_LIMIT_WINDOW_MS` | `60000` | 1000 through 3600000 milliseconds |
| `LAUNCHPP_SHUTDOWN_GRACE_MS` | `10000` | 100 through 120000 milliseconds |

State-changing browser requests require an `Origin` matching `LAUNCHPP_BASE_URL`. Better Auth is mounted at `/api/auth/*` behind the identity adapter; product authorization remains in application services rather than the authentication library. Email recovery is intentionally unavailable until an email provider is configured, so the recovery screen directs users to the installation operator.

Logs are structured JSON. Authorization, cookie, and CSRF headers are redacted. Public error and health responses never include stack traces, filesystem paths, or dependency details.

The server owns an adjacent `<database>.lock` while its persistence resources are open. A second server, explicit migration, or restore fails instead of becoming another unsupported writer. On shutdown, readiness is disabled first, outbox dispatch stops, SSE clients receive a reconnect event, in-flight work receives the configured grace period, and all database handles close before the lock is released.

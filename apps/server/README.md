# Launch++ server

This workspace is the trusted HTTP composition root. It owns process startup/shutdown and transport concerns; domain rules remain in `@launchpp/core`, authorization remains in `@launchpp/authorization`, and persistence remains in `@launchpp/database`.

## Run locally

```bash
pnpm build
pnpm start:server
```

The local default listens on `127.0.0.1:3000` and stores state in `data/launchpp.sqlite`. Liveness is available at `/health/live`; readiness is available at `/health/ready`. Readiness becomes true only after the listener and migrated SQLite composition are available, and becomes false before graceful shutdown begins. Closing the server releases the Better Auth and application database connections after in-flight work.

## Configuration

Configuration is parsed once before the server is constructed. Unknown `LAUNCHPP_*` variables, malformed values, and insecure production origins stop startup before a listener opens.

| Variable | Default | Constraint |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `LAUNCHPP_AUTH_SECRET` | Development-only value | At least 32 characters and required explicitly in production |
| `LAUNCHPP_BASE_URL` | Local bind origin | Required and HTTPS in production; origin only, with no path/query/hash |
| `LAUNCHPP_BIND_ADDRESS` | `127.0.0.1` | Explicit interface or hostname |
| `LAUNCHPP_DATABASE_PATH` | `data/launchpp.sqlite` | File-backed SQLite path; in-memory persistence is rejected |
| `LAUNCHPP_PORT` | `3000` | Integer from 1 through 65535 |
| `LAUNCHPP_LOG_LEVEL` | `info` | Pino severity or `silent` |
| `LAUNCHPP_TRUSTED_PROXIES` | Empty | Comma-separated exact addresses or CIDR ranges understood by Fastify |
| `LAUNCHPP_RATE_LIMIT_MAX` | `300` | Requests per client in the configured window |
| `LAUNCHPP_RATE_LIMIT_WINDOW_MS` | `60000` | 1000 through 3600000 milliseconds |
| `LAUNCHPP_SHUTDOWN_GRACE_MS` | `10000` | 100 through 120000 milliseconds |

State-changing browser requests require an `Origin` matching `LAUNCHPP_BASE_URL`. Better Auth is mounted at `/api/auth/*` behind the identity adapter; product authorization remains in application services rather than the authentication library.

Logs are structured JSON. Authorization, cookie, and CSRF headers are redacted. Public error and health responses never include stack traces, filesystem paths, or dependency details.

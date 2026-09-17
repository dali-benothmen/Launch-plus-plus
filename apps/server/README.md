# Launch++ server

This workspace is the trusted HTTP composition root. It owns process startup/shutdown and transport concerns; domain rules remain in `@launchpp/core`, authorization remains in `@launchpp/authorization`, and persistence remains in `@launchpp/database`.

## Run locally

```bash
pnpm build
pnpm start:server
```

The local default listens on `127.0.0.1:3000`. Liveness is available at `/health/live`; readiness is available at `/health/ready`. Readiness becomes true only after the listener starts and becomes false before graceful shutdown begins.

## Configuration

Configuration is parsed once before the server is constructed. Unknown `LAUNCHPP_*` variables, malformed values, and insecure production origins stop startup before a listener opens.

| Variable | Default | Constraint |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `LAUNCHPP_BASE_URL` | Local bind origin | Required and HTTPS in production; origin only, with no path/query/hash |
| `LAUNCHPP_BIND_ADDRESS` | `127.0.0.1` | Explicit interface or hostname |
| `LAUNCHPP_PORT` | `3000` | Integer from 1 through 65535 |
| `LAUNCHPP_LOG_LEVEL` | `info` | Pino severity or `silent` |
| `LAUNCHPP_TRUSTED_PROXIES` | Empty | Comma-separated exact addresses or CIDR ranges understood by Fastify |
| `LAUNCHPP_RATE_LIMIT_MAX` | `300` | Requests per client in the configured window |
| `LAUNCHPP_RATE_LIMIT_WINDOW_MS` | `60000` | 1000 through 3600000 milliseconds |
| `LAUNCHPP_SHUTDOWN_GRACE_MS` | `10000` | 100 through 120000 milliseconds |

State-changing browser requests currently require an `Origin` matching `LAUNCHPP_BASE_URL`. Authentication will layer CSRF tokens and narrowly scoped non-browser credentials onto this same-origin baseline.

Logs are structured JSON. Authorization, cookie, and CSRF headers are redacted. Public error and health responses never include stack traces, filesystem paths, or dependency details.

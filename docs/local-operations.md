# Launch++ local operations

Status: first local and container operating path for the core alpha.

Launch++ stores all currently implemented durable product state in one SQLite database. The supported operations command creates consistent online backups, verifies their checksum and database integrity, and restores them while the application is stopped. Future package and asset stores will be added to the same installation-backup contract when those stores become operational.

## Local distribution

Use Node.js 24 and the pinned pnpm version. The following command builds the web client and server, serves both from one local process, runs pending migrations, and stores data under `data/`:

```bash
pnpm local:start
```

Open `http://127.0.0.1:3000`. Stop the process with `Ctrl+C`. Launch++ first marks readiness unavailable, stops outbox work, asks SSE clients to reconnect, drains requests within the configured grace period, closes database connections, and releases the installation lock.

Development remains `pnpm dev`; `local:start` is the packaged-like single-process path.

## Operations CLI

Run the CLI from the repository root. `--database` defaults to `LAUNCHPP_DATABASE_PATH`, then `data/launchpp.sqlite`.

```bash
pnpm ops migrate --database data/launchpp.sqlite
pnpm ops backup --database data/launchpp.sqlite
pnpm ops verify --from data/backups/launchpp-backup-<timestamp>.sqlite
pnpm ops restore --from data/backups/launchpp-backup-<timestamp>.sqlite --confirm
```

`backup` may run while Launch++ is online because it uses SQLite's online backup API. It writes a database snapshot and adjacent `.json` manifest containing the byte size, migration count, and SHA-256 checksum. It reports success only after SQLite integrity and foreign-key verification pass.

Stop Launch++ before `migrate` or `restore`. Those operations acquire the same database lock as the server and fail with a direct message if another Launch++ process owns it. Restore requires `--confirm`, verifies the source before changing anything, migrates and verifies a temporary copy, and creates a timestamped `before-restore` recovery backup of the current database before atomically replacing it.

Keep each `.sqlite` backup together with its `.sqlite.json` manifest. Store copies outside the Launch++ host. Backups do not contain `LAUNCHPP_AUTH_SECRET` or reverse-proxy configuration; preserve those separately in the operator's secret/configuration backup.

## Container distribution

The root `Dockerfile` builds one Node 24 image containing the Fastify server, compiled web client, migrations, and runtime dependencies. It runs as a non-root user and writes only to `/data`. The Compose example keeps the root filesystem read-only, mounts a named data volume, includes a readiness healthcheck, and gives shutdown a 20-second grace period.

Production requires an HTTPS public origin and an authentication secret of at least 32 characters:

```bash
export LAUNCHPP_BASE_URL=https://launch.example.com
export LAUNCHPP_AUTH_SECRET='replace-with-a-long-random-secret'
docker compose up --build -d
```

Terminate TLS with a reverse proxy and forward to port 3000. The example publishes only on `127.0.0.1` by default. If a reverse proxy is used, set `LAUNCHPP_TRUSTED_PROXIES` to its exact address or supported CIDR.

Container backup:

```bash
docker compose exec launchpp node apps/server/dist/operations-cli.js backup
```

Container restore:

```bash
docker compose stop launchpp
docker compose run --rm launchpp node apps/server/dist/operations-cli.js restore --from /data/backups/<backup>.sqlite --confirm
docker compose up -d launchpp
```

After a restore, confirm `/health/ready`, sign in, and inspect representative organizations, projects, tasks, comments, search results, and activity. Keep the automatically generated pre-restore backup until the restored installation has been reviewed.

## Failure handling

- A malformed configuration fails before the listener opens and identifies the invalid setting.
- A missing web build identifies `LAUNCHPP_WEB_ROOT` and never reports readiness.
- Migration or database-open failures name the affected database and leave the HTTP listener closed.
- A second server, migration, or restore is rejected by the installation lock. A lock whose recorded process no longer exists is recovered automatically.
- Backup and restore never overwrite a requested backup path.
- A missing, corrupted, mismatched, or foreign-key-invalid backup is rejected before restore.
- If graceful shutdown exceeds `LAUNCHPP_SHUTDOWN_GRACE_MS`, remaining connections are closed and the process reports a failure.

Do not place the SQLite database on NFS or another network filesystem. The database, WAL files, backups, and installation lock require durable local storage.

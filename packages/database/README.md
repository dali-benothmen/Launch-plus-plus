# Launch++ persistence adapter

This package owns the physical SQLite schema, reviewed Drizzle migrations, connection policy, transaction implementation, and repository adapters. Domain and application code depend on ports from `@launchpp/core`; it never imports Drizzle, `better-sqlite3`, or database rows.

## Runtime guarantees

- The database must be file-backed and successfully enter WAL mode.
- Every writer and reader enables foreign keys and a bounded busy timeout.
- A dedicated read-only connection can serve the last committed snapshot while a write is in progress.
- Writes pass through one in-process queue and use `BEGIN IMMEDIATE`, so application writes are serialized deliberately.
- A write callback is synchronous by contract. Returning a promise fails and rolls the transaction back, preventing network calls or asynchronous plugin execution from holding the writer lock.
- Repository mutations require an explicit `WriteContext`; reads require a `ReadContext`.
- Domain state and its outbox fact share one transaction.
- Shutdown stops accepting work, drains already-queued writes, then closes reader and writer handles.

## Migrations

The schema source is `src/schema.ts`. Ordered SQL in `migrations/` is the runtime artifact and must be reviewed like application code.

The identity tables are physically owned here even though Better Auth is isolated in `@launchpp/auth-adapter`. This keeps all production schema changes in one reviewed migration chain; the auth library does not mutate the production schema at request time.

Workspace persistence keeps product identity separate from authentication. `user_profiles` links an auth user to Launch++ preferences and their current workspace, `workspaces` owns the durable workspace record, and `workspace_members` is the authorization boundary. A new workspace and its active owner membership are written in the same transaction. Security-relevant setup and workspace creation facts are appended to `audit_entries`; post-commit work is represented separately in the transactional outbox.

Workspace names and URL slugs are unique within an installation. Name comparison is case-insensitive, so names such as `Acme` and `acme` cannot create two indistinguishable entries.

Project persistence keeps navigation folders organizational and one level deep. Composite foreign keys prevent folders, projects, and statuses from crossing workspace boundaries. Active folder/project/status positions are database-constrained; archived projects leave active ordering without losing their stored position. Per-user project preferences hold favorite and last-opened state separately from shared project records. Creating a project and its ordered To do, In progress, and Done statuses is one transaction.

Task persistence stores tasks and one-level subtasks over the same project statuses used by Board and List. Project-local task numbers are allocated transactionally and never reused. Composite keys keep statuses, assignments, and labels within their workspace/project scope; task revisions protect collaborative mutations from silent last-write-wins updates. Assignees reference workspace memberships, due dates remain calendar dates, and task/label changes are committed with their audit and outbox facts.

Only owner membership is created or managed in the current solo slice. The schema reserves the documented admin and member values, but invitation, role-change, suspension, removal, and ownership-transfer flows are not exposed until the team phase.

```bash
pnpm --filter @launchpp/database db:generate --name <descriptive-name>
pnpm test:migrations
```

Runtime startup uses Drizzle's synchronous migrator. All pending migration statements run inside one SQLite transaction. If any statement fails, the set rolls back; startup closes the connection and remains unavailable. Fix or restore the migration input, then retry against the unchanged pre-migration schema. Never edit a migration that has shipped—add a new ordered migration.

The migration metadata table can exist after an initial failure because Drizzle creates it before the migration transaction; it contains no applied entry for the rolled-back set. Backups and installation-level recovery are added with the supported local operations milestone.

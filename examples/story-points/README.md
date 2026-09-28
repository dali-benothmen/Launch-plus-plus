# Story Points

See the [Launch++ plugin author preview](../../docs/plugin-author-preview.md) for installation,
development modes, packaging, upload, compatibility, and troubleshooting.

Story Points is the declaration-only Launch++ reference plugin. Its manifest contributes one
host-managed numeric task field without a browser surface, server handler, private import, plugin
database schema, or migration.

When activated, Launch++ renders and persists the same field in every project's task details,
Board badges, List columns, List filters and sorting, and CSV export. Deactivating the plugin hides
those contributions while retaining values; reactivating it restores them. All controls use the
active Launch++ theme.

From this directory, after installing and building the monorepo tools:

```bash
pnpm check
pnpm pack
```

To connect the development plugin to a running local Launch++ app, enable Developer Mode on the
**Plugins** page and run:

```bash
pnpm dev --connect http://localhost:5173
```

Upload the generated `.launch-plugin` archive from **Plugins**, then activate it for the app.

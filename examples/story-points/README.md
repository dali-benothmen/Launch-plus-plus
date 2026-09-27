# Story Points

Story Points is the declaration-only Launch++ reference plugin. Its manifest contributes one
host-managed numeric task field without a browser surface, server handler, private import, plugin
database schema, or migration.

When enabled for a project, Launch++ renders and persists the same field in task details, Board
badges, List columns, List filters and sorting, and CSV export. Disabling the plugin hides those
contributions while retaining values; re-enabling it restores them. All controls use the active
Launch++ theme.

From this directory, after building the monorepo tools:

```bash
node ../../packages/plugin-cli/dist/cli.js check
node ../../packages/plugin-cli/dist/cli.js pack
```

Upload the generated `.launch-plugin` archive from **Plugins**, enable it for the organization, then
enable it for a project.

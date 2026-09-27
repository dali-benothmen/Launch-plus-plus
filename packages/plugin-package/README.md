# `@launchpp/plugin-package`

The shared Launch++ package boundary for deterministic `.launch-plugin` archive creation and
strict, non-executing inspection.

This low-level package is used by `@launchpp/cli`, server-side staging, and repository proof tools.
Plugin authors normally use `launchpp pack` and `launchpp inspect` instead of calling it directly.

# `@launchpp/sdk`

The public, browser-standard SDK for Launch++ plugins. The core entry point has
no React dependency; React providers and hooks are available from
`@launchpp/sdk/react` and use the same client and message contract.

```ts
import { createClient } from "@launchpp/sdk";

const launch = await createClient();
const tasks = await launch.tasks.list();

await launch.tasks.create({ title: "Review plugin capability" });
await launch.navigation.open({ projectId: launch.context.project?.id ?? "", type: "project" });
```

React surfaces receive the connected client from their generated bootstrap:

```tsx
import { useCurrentProject, useTasks } from "@launchpp/sdk/react";

export function ProjectTasks() {
  const project = useCurrentProject();
  const tasks = useTasks();

  if (tasks.loading) return <p>Loading {project.id}…</p>;
  if (tasks.error) return <p>{tasks.error.message}</p>;
  return <p>{tasks.data?.length ?? 0} tasks</p>;
}
```

Every call is sent through the authenticated host bridge. Plugins never receive
session cookies, database handles, or authority to choose their actor,
organization, package, or project scope. `AbortSignal` cancellation is supported
by every method. Failures reject with `LaunchppError`, which exposes a stable
`code`, `retryable` flag, and optional structured `details`.

The preview includes context and theme data; project/task reads and allowed
mutations; task comments; typed navigation requests; command invocation; and a
generic `invoke` method for generated capabilities. Navigation and command
requests require matching host capabilities in the surface where they run.

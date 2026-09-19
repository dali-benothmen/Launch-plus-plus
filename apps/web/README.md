# Launch++ web shell

This workspace is the React composition root. It owns routing, global providers, responsive shell layout, and browser integration. Network calls enter through `@launchpp/api-client`; application code does not scatter ad hoc `fetch` calls. Server state belongs to TanStack Query, while route state belongs to React Router.

## Run locally

Start the API on its default port, then run the Vite client:

```bash
pnpm start:server
pnpm dev:web
```

Vite proxies `/health` and `/api` to `http://127.0.0.1:3000`. A production client build is included in the root `pnpm build` command.

## UI boundaries

- `@launchpp/ui` is the supported React component contract. It wraps the pinned Ant Design line and owns its configuration.
- `@launchpp/ui-tokens` is the browser-standard contract. Its semantic CSS variables work for core UI, custom React components, and future vanilla plugin surfaces.
- Core web code imports neither Ant Design nor Ant class names directly.
- `LaunchProvider` maps light/dark semantic values into Ant Design and places `data-launch-theme` on the root document.
- The narrow-screen shell keeps the global rail and collapses the empty project pane; the complete mobile drawer behavior belongs to the authenticated-shell milestone.

The root route resolves installation and session state before choosing the first-owner setup, sign-in, or authenticated application route. Successful setup continues directly toward first-project creation; there is no questionnaire onboarding or Calendar route. My Work, Members, and Settings remain intentional placeholders for their delivery slices.

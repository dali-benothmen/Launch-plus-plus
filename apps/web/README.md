# Launch++ web shell

This organization is the React composition root. It owns routing, global providers, responsive shell layout, and browser integration. Network calls enter through `@launchpp/api-client`; application code does not scatter ad hoc `fetch` calls. Server state belongs to TanStack Query, while route state belongs to React Router.

## Run locally

Use the repository development launcher and keep Backend and Web selected:

```bash
pnpm dev
```

Vite proxies `/health` and `/api` to `http://127.0.0.1:3000`. Development defaults the server's canonical browser origin to `http://localhost:5173` so authentication and other mutations pass the origin guard. `LAUNCHPP_BASE_URL` can override it when Vite is exposed through another origin. A production client build is included in the root `pnpm build` command.

## UI boundaries

- `@launchpp/ui` is the supported React component contract. It wraps the pinned Ant Design line and owns its configuration.
- `@launchpp/ui-tokens` is the browser-standard contract. Its semantic CSS variables work for core UI, custom React components, and future vanilla plugin surfaces.
- Core web code imports neither Ant Design nor Ant class names directly.
- `LaunchProvider` resolves the Light, Dark, or High Contrast theme into the stable CSS-variable contract and the matching Ant Design configuration.
- The narrow-screen shell keeps the global rail and collapses the empty project pane; the complete mobile drawer behavior belongs to the authenticated-shell milestone.

The root route resolves installation and session state before choosing the first-owner setup, sign-in, or authenticated application route. Local first-run authorization happens automatically; remote operators open the one-time setup URL without copying a token into the form. Successful setup lands on the protected first-project creation entry route. The authenticated shell represents organizations as the directory roots, with active projects directly beneath them and Favorites and Archived as virtual sections. Context menus expose the implemented lifecycle and ordering actions without introducing Board or List before their roadmap slices. There is no questionnaire onboarding or Calendar route. Members and Settings remain intentional placeholders for their delivery slices.

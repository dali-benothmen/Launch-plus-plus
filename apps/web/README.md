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

The root route resolves installation and session state before choosing secure first-owner setup, the authenticated application, the temporary no-membership organization setup, or the anonymous organization locator. Local first-run authorization happens automatically; remote operators open the one-time setup URL without copying a token into the form. Anonymous entry resolves `/o/:organizationSlug` into organization-scoped sign-in, offers deliberate creation at `/organizations/new` only for an unknown slug, and keeps recovery in the same organization context. Public creation provisions the owner, organization, default project, and session before entering its Board. Legacy `/sign-in` and `/recover` routes flow through the locator, and safe `/app/...` destinations survive authentication. The authenticated shell provides Home, organization navigation, Board/List project views, route-backed task detail, search, settings, and the currently implemented member placeholders. There is no generic account-signup page or questionnaire onboarding.

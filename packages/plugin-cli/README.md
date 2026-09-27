# `@launchpp/cli`

The project-local CLI for Launch++ plugin authors.

The preview provides disposable development and an owner-enabled connected workflow:

```bash
pnpm launchpp dev
pnpm launchpp dev --fresh
pnpm launchpp dev --profile retained
pnpm launchpp dev --connect https://launch.example
```

It binds two loopback-only origins: the fixture host and inspector, and an
isolated Vite plugin surface. No real Launch++ organization or installation is
modified.

Connected mode creates a five-minute browser pairing request. An organization owner reviews the
plugin identity, requested permissions, and optional project scope before a 30-minute,
author-scoped session starts. Manifest changes re-register host-rendered contributions; permission
changes pause the session until the owner approves them again. `Ctrl+C`, server-side revocation,
expiry, or a server restart removes the ephemeral session. Loopback HTTP is accepted for local
development; remote installations require HTTPS.

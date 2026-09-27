# `@launchpp/cli`

The project-local CLI for Launch++ plugin authors.

The preview currently provides the disposable development workflow:

```bash
pnpm launchpp dev
pnpm launchpp dev --fresh
pnpm launchpp dev --profile retained
```

It binds two loopback-only origins: the fixture host and inspector, and an
isolated Vite plugin surface. No real Launch++ organization or installation is
modified.

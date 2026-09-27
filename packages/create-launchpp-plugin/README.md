# `create-launchpp-plugin`

Scaffold one of the supported Launch++ plugin authoring projects:

```bash
pnpm create launchpp-plugin
```

React with TypeScript is recommended. Vanilla TypeScript and vanilla JavaScript
produce the same manifest and runtime contract without React.

For non-interactive use:

```bash
pnpm create launchpp-plugin my-plugin \
  --name "My plugin" \
  --id com.example.my-plugin \
  --framework react-typescript \
  --capabilities project-page,task-panel \
  --yes
```

The command refuses to overwrite a non-empty directory and never installs
dependencies automatically. It also creates `src/generated/launchpp.ts` with the current
manifest-derived client types and protocol-compatible fixtures.

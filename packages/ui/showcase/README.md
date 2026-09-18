# UI showcase workflow

Run the local showcase from the repository root:

```bash
pnpm ui:showcase
```

Each component has a colocated `*.showcase.tsx` reference containing its description, category,
lifecycle stage, examples, essential API, and accessibility notes. Import that reference in
`registry.ts` and add it to `componentRegistry` to make it visible.

## Lifecycle stages

- `dev`: actively being built and visible only in the showcase.
- `test`: ready for manual review and still excluded from the public API.
- `prod`: approved and explicitly exported from `packages/ui/src/index.ts`.

Changing a showcase entry to `prod` does not publish it automatically. Add its public export to
`packages/ui/src/index.ts` only after approval. This keeps unfinished components out of application
and plugin imports.

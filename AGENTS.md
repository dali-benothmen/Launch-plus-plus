# Launch++ Working Rules

These instructions apply to the entire repository.

## Product and engineering scope

- Launch++ is an MVP. Prefer the smallest clean solution that satisfies the current requirement.
- Do not introduce speculative abstractions, infrastructure, compatibility layers, or features for hypothetical future needs.
- Keep architecture and code straightforward, readable, and easy to replace as the product evolves.
- The plugin system is the central product capability. Changes must preserve its simple developer experience and public boundaries.
- Do not expand the scope of a task without explicit approval.

## UI implementation

- Use components exported by `@launchpp/ui` as provided. Compose them; do not recreate, restyle, wrap, or override their internal appearance unless the user explicitly requests that change.
- Do not target component-library internals, generated class names, or private DOM structure.
- Do not add custom shadows, radii, gradients, backgrounds, colors, control sizes, or typography to shared components unless explicitly requested.
- Use the default shared theme for now. The only intentional brand override is the primary color documented in `design.md`.
- Treat `design.md` as the visual-system source of truth. Update it when an approved design decision changes.
- Application packages own routing and page composition. `packages/ui` owns reusable components and their public styling contract.
- Keep application pages minimal. Do not add dashboards, navigation, sidebars, cards, empty states, or decorative surfaces unless they are part of the agreed page plan.
- Discuss material UI direction with the user before implementing it. The user performs final visual review.
- Do not create a component showcase or design-system route unless explicitly requested.

## Theme policy

- Default surfaces, typography, spacing, control sizing, borders, and elevation come from the shared UI theme.
- Do not invent page-specific themes or color palettes.
- Do not use purple as the default accent or background.
- Keep the default light theme unless a task explicitly concerns another theme. Existing theme support may remain, but new UI must not depend on custom dark-mode styling unless requested.
- Prefer component props and public theme tokens over custom CSS overrides.

## Testing and verification

- Do not add automated UI tests unless the user asks for them.
- The user handles visual UI testing and will report visual issues.
- Run lightweight compilation, formatting, or type checks when useful, but do not expand a UI task into a testing project.

## Git workflow

- Commit after each completed, coherent task before starting the next task.
- Use concise, meaningful, professional commit messages that describe the outcome.
- Never include phase identifiers or task codes such as `P0-01` in commit messages, source code, or project documentation.
- Keep unrelated changes out of the commit and preserve user-owned work already present in the worktree.
- Do not rewrite published history or use destructive Git commands unless the user explicitly requests it.

## Documentation

- Keep documentation proportional to the MVP and synchronized with implemented decisions.
- Use Launch++ terminology in project-owned documentation.
- Record decisions in the most relevant existing document rather than creating overlapping documents.

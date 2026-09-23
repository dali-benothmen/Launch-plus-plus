# Core alpha qualification

Status: passed on the local reference environment.

The solo path is qualified as one coherent journey rather than as isolated pages. The browser run starts from an empty database, uses the ordinary production web build with no plugin proof or plugin runtime enabled, and covers first-owner setup, project creation, Board and List, task detail, assignee and description changes, subtasks, comments, activity, global search, and revision conflict recovery.

## Run the gates

Use Node.js 24 and run these commands from the repository root:

```bash
pnpm test:solo
pnpm exec vitest run packages/database/src/qualification.test.ts
pnpm measure:core-alpha
```

`test:solo` owns a disposable database under `.cache/solo-qualification` and serves the built application on `127.0.0.1:4180`. It checks accessible names, field labelling, duplicate IDs, image alternatives, landmarks, a real keyboard-operated primary path, consistent task state across surfaces, search, activity, and the structured `409` response for two writes against one task revision.

The database qualification builds two committed historical fixtures: the foundation schema and the last project schema before tasks existed. Each is upgraded through the current migration set, checked for preserved rows, backed up with its checksum manifest, restored into a clean database, and compared at the organization/project level.

The performance command builds production artifacts and evaluates the budgets in `tests/performance/core-alpha-budgets.json`. Its workload contains 250 tasks, 250 indexed task-page reads, five fresh migrations, five online backups, twenty verifications, and five clean restores. The first retained reference result is `tests/performance/baselines/core-alpha-local-2026-09-20.json`.

## Exit-gate evidence

| Gate | Evidence |
| --- | --- |
| Fresh install reaches Board | The Playwright journey begins at `/`, completes automatic local setup and project creation, then observes the Board. |
| Board, List, detail, search, and activity agree | One task is created and changed through these surfaces in the same browser journey. |
| Keyboard primary journey | Setup/project submission, task creation, tab switching, and opening task detail are activated from keyboard focus. |
| Concurrent edits are recoverable | Two updates with the same expected revision produce exactly one success and one structured revision conflict; the authoritative task remains readable. |
| Backup/restore reproduces the organization | Both historical fixtures migrate, back up, verify, restore, and retain installation/project/status counts. |
| Core works without plugins | The qualification server builds without the plugin proof flag and the entire journey completes without plugin frames or plugin services. |

## Current boundary

The automated browser reference is desktop Chromium. The DOM checks catch common structural regressions but are not a substitute for a manual screen-reader and visual review. Multi-browser, mobile, real reverse-proxy/TLS, and the future small-team dataset remain release-level qualification work; they are not core-alpha claims.

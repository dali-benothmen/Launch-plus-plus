# Reference environments, datasets, limits, and budgets

Status: foundation baseline. These are engineering gates, not capacity or marketing claims.

This document defines where Launch++ is expected to run, what data shapes qualify it, which resource limits are part of the current contracts, and how performance is measured. A number becomes a supported-product claim only after the matching end-to-end workload passes on the named reference tier.

## Browser support policy

The current automated reference is the Playwright-bundled desktop Chromium. `pnpm test:browser` proves the iframe protocol and containment behavior, while `pnpm test:solo` qualifies the core solo application journey. It does not qualify the complete application in every target browser.

The v1 support target is:

| Browser family | Versions targeted | Qualification expectation |
| --- | --- | --- |
| Chrome desktop | Current and previous stable major | Full core and plugin journeys |
| Edge desktop | Current and previous stable major | Full core and plugin journeys |
| Firefox desktop | Current and previous stable major | Full core and plugin journeys |
| Safari on macOS | Current and previous major | Full core and plugin journeys |
| Safari on iOS | Current major | Responsive primary core journeys; plugin surfaces must remain contained and usable |
| Chrome on Android | Current stable major | Responsive primary core journeys; plugin surfaces must remain contained and usable |

“Current” is evaluated at each supported Launch++ release rather than frozen in this document. Internet Explorer, embedded webviews, beta/nightly browsers, and browsers outside the table are not supported. A browser is not promoted from target to supported until its release matrix passes keyboard, theme, core workflow, bridge, navigation-confinement, and failure-containment tests.

## Runtime reference tiers

Launch++ remains a single-node application with local SQLite for v1. Hardware descriptions are minimum reproducible tiers, not promises about simultaneous users.

| Tier | CPU | Memory | Storage | OS/runtime | Purpose |
| --- | --- | --- | --- | --- | --- |
| Developer laptop | 4 logical modern x64/arm64 cores | 8 GiB | Local SSD with 10 GiB free | Supported desktop OS, Node.js 24 | Development, unit/browser tests, small personal organization |
| Small-team VPS | 2 vCPU | 4 GiB | 40 GiB SSD/NVMe with durable volume and backups | 64-bit Linux, Node.js 24 | Initial deployment and restore qualification |
| Baseline capture host | 12-thread Intel i7-9750H | 16 GiB | Local SSD | x64 Linux 6.8, Node.js 24.14.1 | First foundation measurements only |

The capture host is more capable than the minimum VPS and therefore cannot prove the VPS tier by itself. Before v1, the same workload plus the complete small-team dataset must pass on an actual 2-vCPU/4-GiB reference instance. SQLite data, package storage, backups, and temporary upload space must reside on durable local storage; network filesystems are outside the initial support contract.

## Canonical datasets

Dataset generators will use a fixed seed, stable timestamps, realistic text-size distributions, and explicit tenant ownership. Counts include archived records where stated so filters and indexes cannot appear fast only because the dataset is sparse.

| Dataset | Shape | Use |
| --- | --- | --- |
| Foundation | Empty migrated database; 200 installation-plus-outbox transactions; 500 indexed reads; one 983-byte normalized plugin fixture; 15 fresh isolated handler invocations; 250 readiness injections | Current repeatable architecture baseline |
| Core alpha | 250 tasks in one solo project; 250 indexed task-page reads; five fresh migrations; five backups and restores; twenty backup verifications | Current solo operations and artifact baseline |
| Small team | 25 members, 20 projects, 10,000 active tasks, 2,000 archived tasks, 50,000 comments, 250,000 activity/outbox facts, 20 installed plugins, 100,000 plugin-owned records, five concurrent custom surfaces | v1 supported local/VPS qualification target |
| Stress | 100 members, 100 projects, 100,000 active tasks, 25,000 archived tasks, 500,000 comments, 2,000,000 activity/outbox facts, 50 installed plugins, 1,000,000 plugin-owned records, 20 concurrent custom surfaces | Find degradation and safety limits; not a supported capacity claim |

The Foundation dataset exists now in `scripts/measure-foundation.mjs`. The Small team and Stress generators are specifications for later domain and plugin-data phases; their absence is explicit and must not be replaced with hand-built databases that cannot be reproduced.

## Enforced payload and isolation limits

These limits are defaults already enforced by the foundation implementation and covered by abuse tests.

### Plugin archive intake

| Resource | Limit |
| --- | ---: |
| Compressed archive | 10 MiB |
| Total expanded content | 20 MiB |
| One expanded entry | 5 MiB |
| Entries | 500 |
| Compression ratio per entry | 100:1 |
| Archive path length | 240 characters |

Paths are normalized and restricted to known roots. Absolute paths, traversal, backslashes, directory entries, links, devices, duplicates, case-only collisions, undeclared files, and integrity mismatches are rejected before immutable staging. The future upload route must stream to quarantine with a route-specific allowance for the 10-MiB package plus protocol overhead; it must not raise the generic JSON body limit.

### Browser and HTTP messages

| Resource | Limit |
| --- | ---: |
| Generic Fastify request body | 1 MiB |
| Serialized browser bridge message | 64 KiB |
| Permissions per plugin/context | 100 |
| Contributions of each declared kind | 100 |
| Protocol error message | 500 characters |

Bridge size is checked before schema dispatch. Capability-specific schemas may impose smaller bounds. Bulk transfer, upload, download, and export will use explicit streaming or cursor contracts rather than increasing the bridge ceiling.

### Executable handler feasibility runtime

| Resource | Limit |
| --- | ---: |
| Serialized input | 64 KiB |
| Serialized output | 64 KiB |
| Normalized handler source | 512 KiB |
| QuickJS memory | 8 MiB |
| QuickJS stack | 512 KiB |
| CPU interruption budget | 100 ms |
| Wall time | 2 seconds |
| Supervisor worker heap | 64 MiB |
| Supervisor worker stack | 4 MiB |

These are containment-test parameters, not approval for public untrusted server plugins. The current no-ship decision still requires an OS-process or container boundary before that capability can be supported.

## Foundation measurement gates

The executable gates live in `tests/performance/foundation-budgets.json`. On the baseline capture host, `pnpm measure:foundation -- --check` builds production artifacts, runs the fixed workload, prints a machine-readable report, and exits non-zero when any maximum is exceeded.

| Metric | Observed | Maximum gate |
| --- | ---: | ---: |
| Server compose and ready, p95 | 70.066 ms | 150 ms |
| Readiness request through Fastify injection, p95 | 0.320 ms | 2 ms |
| SQLite open and migrate, p95 | 87.278 ms | 100 ms |
| Installation plus outbox transaction, p95 | 0.340 ms | 3 ms |
| Indexed installation read, p95 | 0.069 ms | 1 ms |
| Deterministic package build, p95 | 12.118 ms | 40 ms |
| Package inspection and integrity validation, p95 | 0.605 ms | 5 ms |
| Fresh worker plus QuickJS invocation, p95 | 72.626 ms | 150 ms |
| Measurement-process peak RSS | 290.9 MiB | 384 MiB |
| Web production distribution, raw | 609.5 KiB | 800 KiB |
| Web production distribution, per-file gzip sum | 196.7 KiB | 256 KiB |

The immutable observation is stored at `tests/performance/baselines/foundation-local-2026-09-18.json`. The startup samples are intentionally cold and their five-sample p95 is the maximum; the wider gates preserve the cold-start signal without pretending sub-millisecond steady-state readings describe startup.

## Measurement method

- Use the pinned Node.js version and a clean production build.
- Record CPU model/count, memory, architecture, OS kernel, timestamp, workload counts, and artifact sizes with every baseline.
- Run on an otherwise idle reference machine using local durable storage and normal production SQLite pragmas.
- Report p50, p95, maximum, mean, and sample count. Do not average away cold starts, timeouts, or failed operations.
- Measure startup, steady-state latency, and memory separately. RSS is sampled for the whole harness today; future server, browser, and plugin-process measurements require separate processes and their own peaks.
- Fastify `inject` removes network, proxy, TLS, and browser time. It is a framework regression signal only. Phase 1 must add loopback HTTP and UI interaction timings; VPS qualification must add TLS through the supported proxy example.
- The gzip figure is the sum of independently compressed distribution files. It is a deterministic transfer-size proxy, not a page-load timing.
- Run the qualifying workload at least three times after a clean build and retain the median run. Investigate high variance rather than selecting the best run.
- A gate may tighten after repeatable improvement. Relaxing one requires a documented cause, a new baseline on the same tier, and review of user-visible and resource impact.

Performance work is prioritized when a gate fails, an operation approaches 80% of its gate in repeated captures, or a real workload exposes a metric absent from this document. Passing these foundation gates does not imply the future Small team dataset will pass.

## Core alpha measurement gates

The executable gates live in `tests/performance/core-alpha-budgets.json`. `pnpm measure:core-alpha` builds production artifacts, runs the fixed solo workload, prints a machine-readable report, and exits non-zero when a maximum is exceeded.

| Metric | Observed | Maximum gate |
| --- | ---: | ---: |
| Fresh database migration, p95 | 95.018 ms | 1000 ms |
| Indexed 50-task page read, p95 | 0.141 ms | 25 ms |
| Online backup, p95 | 38.821 ms | 1000 ms |
| Backup verification, p95 | 7.285 ms | 500 ms |
| Restore into a clean installation, p95 | 19.598 ms | 1000 ms |
| Web production distribution, per-file gzip sum | 237.5 KiB | 312.5 KiB |

The retained observation is `tests/performance/baselines/core-alpha-local-2026-09-20.json`. These deliberately broad alpha gates detect severe regressions on developer hardware; they are not user-facing latency promises or a substitute for the future small-team reference tier.

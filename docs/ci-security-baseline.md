# Continuous integration and supply-chain baseline

Status: enforced foundation baseline.

This baseline makes repository correctness and the completed plugin feasibility proofs visible as independent pull-request checks. It is intentionally small enough to run on every change and strict enough that future work cannot silently bypass the architecture, migration, package, or isolation contracts.

## Required checks

Protect the default branch and require these checks before merge:

| Check | What it proves |
| --- | --- |
| `Repository quality` | The pinned runtime installs the lockfile; formatting, lint, types, unit/contract tests, architecture boundaries, migrations, adversarial fixtures, production build, and normalized plugin package proof pass. |
| `Browser isolation` | The packed React and vanilla surfaces pass the Chromium bridge and containment journey after the repository quality gate. |
| `Secret scan` | Complete reachable Git history contains no verified or unverified credential candidate accepted by the scanner. |
| `Dependency review` | A pull request does not introduce a dependency with a known vulnerability of moderate severity or higher. |

`Dependency review` is available to public GitHub repositories and private repositories with the applicable GitHub security feature. If a private deployment cannot provide that API, it must replace the check with an equivalent lockfile-diff review; it must not silently make the check optional.

## Workflow boundaries

`.github/workflows/ci.yml` owns source and behavioral validation. The quality job runs the following explicit commands so a failure is attributable in the GitHub interface:

```text
pnpm runtime:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:arch
pnpm test:migrations
pnpm test:adversarial
pnpm build
pnpm plugin:pack packages/plugin-testkit/fixtures/normalized <temporary-output>
```

The adversarial selection deliberately repeats the highest-risk tests from the complete unit suite: browser bridge forgery and size enforcement, bounded server-handler abuse, and malicious archive intake. Duplication is accepted here because it creates a stable, named security signal as the ordinary unit suite grows.

The browser job installs only Chromium and runs `pnpm test:browser`. Chromium is the initial automation reference, not a declaration that other supported browsers are irrelevant; the browser support policy and expansion gates live in the reference-environment document.

`.github/workflows/security.yml` owns repository-history secret scanning and pull-request dependency review. It also scans the default branch weekly so newly added detector rules can find older material. Dependabot separately proposes weekly lockfile and GitHub Action updates; every proposal still passes the same checks.

## Supply-chain rules

- Every external GitHub Action is pinned to a full commit SHA. A trailing version comment records the reviewed release without making the tag executable.
- Workflow permissions default to `contents: read`. Neither workflow can write repository content, issues, pull-request comments, packages, or releases.
- Dependency installation uses the committed pnpm lockfile with `--frozen-lockfile`.
- Node.js and pnpm versions come from `.node-version` and the root `packageManager` declaration.
- Secret scanning receives no project secret and does not need a write-capable token.
- Uploaded or fixture plugin packages are never executed during package validation.
- Action upgrades are reviewed like application dependencies: inspect release notes, update the immutable SHA and version comment together, then let CI validate the change.

## Local equivalence

Before pushing, run:

```bash
pnpm check
pnpm test:adversarial
pnpm build
pnpm test:browser
pnpm plugin:pack packages/plugin-testkit/fixtures/normalized /tmp/package-proof.launch-plugin
```

The hosted dependency and secret scanners are intentionally not reimplemented in repository scripts. Contributors may run their upstream CLIs locally, but the protected-branch checks are authoritative because they use the reviewed versions pinned in the workflows.

## Failure policy

- Do not merge around a failing required check.
- A detected credential is treated as exposed even if a later commit removes it: revoke or rotate it before cleaning history.
- A vulnerable dependency is upgraded, removed, or explicitly reviewed under a future time-bounded exception policy. This foundation has no allowlist.
- A flaky browser or adversarial test is fixed or reverted. It is not disabled to unblock unrelated work.
- If an external scanner is unavailable, record the incident and rerun it. Availability failure does not become a successful security result.


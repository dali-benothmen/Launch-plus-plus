# Foundation exit verification

Status: passed.

The technical foundation is complete only because its end-to-end gates have executable evidence. This page maps each gate to that evidence without turning a feasibility result into a broader product claim.

| Gate | Evidence | Boundary |
| --- | --- | --- |
| Production-like lifecycle with SQLite | `application-server.test.ts` constructs the production configuration, migrates a file-backed database, reaches readiness, closes all application and Better Auth connections, and safely reopens the same database. | It does not yet qualify containers, TLS, backup, or upgrade operations. |
| Authenticated HTTP → service → repository → outbox | The same integration suite signs up through the mounted Better Auth route, resolves the secure session through `IdentityProvider`, calls `CreateInstallationService`, and verifies the installation and outbox fact committed atomically. The unauthenticated request is denied without a write. | The proof route exists only inside the test; first-owner setup and its public contract belong to the next product phase. |
| Browser surface isolation | `plugin-surfaces.spec.ts` loads packed React and vanilla artifacts in sandboxed frames and exercises the validated bridge. Unit tests cover origin/source mismatch, schema rejection, size bounds, cancellation, and failure confinement. | Chromium is the current automated reference; the v1 browser matrix remains a release qualification target. |
| Server handler decision | `server-plugin-runtime-decision.md` records a no-ship decision for untrusted same-process execution while retaining the worker/QuickJS harness for operator-trusted feasibility. | Public untrusted server code still requires a supervised process/container boundary. |
| Malicious archive rejection | `package-intake.test.ts` covers traversal, case collisions, oversized/over-compressed entries, integrity tampering, undeclared content, and immutable staging without package execution. | Signing, provenance, upload UI, and lifecycle management are later phases. |
| Enforced architecture boundaries | The `Repository quality` CI check runs the architecture test alongside types, lint, tests, migrations, production build, adversarial fixtures, and package proof. | GitHub branch protection must require the documented checks in the repository settings. |

The phase also has a reproducible performance and resource baseline in [reference environments and budgets](./reference-environments-and-budgets.md). These results authorize work on the next phase; they do not imply that the incomplete product is ready for users.

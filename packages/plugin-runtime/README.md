# `@launchpp/plugin-runtime`

Internal feasibility harness for normalized server-plugin JavaScript. It runs
one JSON-only synchronous function in a fresh QuickJS/WASM runtime inside a
fresh Node worker, with guest and supervisor limits.

The execution harness in this package is **not approved as the sole production
boundary for untrusted plugins** and is not wired into the HTTP server. The
non-executing v1-preview archive inspector and atomic staging primitive are
wired into authenticated package upload; inspection never invokes a handler or
loads a browser surface. See the accepted
[runtime decision](../../docs/server-plugin-runtime-decision.md). Do not add
Node globals, filesystem/network access, a permissive module loader, or direct
application/database imports. Future capabilities must cross a validated
broker protocol from a stronger process-level sandbox.

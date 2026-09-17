# Server plugin runtime feasibility decision

Status: accepted Phase 0 decision, 2026-09-18.

## Decision

**No-ship for untrusted executable server plugins inside the Launch++ server
process.** QuickJS/WASM in a fresh Node worker is a useful language sandbox and
test harness, but it is not a sufficient production security boundary for code
from an untrusted publisher.

The prototype remains in `@launchpp/plugin-runtime` for controlled development
and continued evaluation. Until a process-level supervisor passes the same
adversarial suite, production installation supports declaration-only and
browser-only third-party plugins. Executable server bundles are limited to an
explicitly labeled operator-trusted preview; connected development must use a
disposable environment rather than production team data.

This reduces executable scope instead of giving plugin code Node APIs or
bypassing the capability broker.

## Prototype evaluated

Each invocation creates a new Node worker with no inherited execution flags.
That worker initializes QuickJS/WASM and evaluates one normalized function
expression in a fresh runtime. Inputs and outputs are JSON-only. The prototype
layers:

- source and input size checks before worker creation;
- a QuickJS heap limit, stack limit, and interrupt deadline;
- a parent-owned wall deadline that terminates the worker;
- Node worker heap and stack limits as defense in depth;
- bounded output before `postMessage`;
- cancellation by worker termination;
- no module loader and no exposed `process`, `require`, filesystem, network, or
  WebAssembly globals; and
- a fresh worker/runtime so globals cannot survive between invocations.

The executable fixtures cover normal JSON execution, infinite loops, a long
native array-to-string operation, heap growth, oversized output, dynamic
imports, process/filesystem/network probes, cancellation, non-JSON input, and
cross-invocation global state.

## Why the result is not a production security claim

The wrapper exposes the right prototype controls—runtime memory/stack limits,
interrupt handlers, and an optional module loader—but its project states that
it is pre-1.0 and has not been security audited. It also has an open report of
long native operations delaying interrupt callbacks. The parent wall timer
addresses availability for the tested case, but not every memory failure mode.
[QuickJS wrapper documentation](https://github.com/justjake/quickjs-emscripten),
[interrupt blind-spot report](https://github.com/justjake/quickjs-emscripten/issues/219)

More importantly, Node documents that worker `resourceLimits` constrain the
JavaScript engine but not external data such as `ArrayBuffer`s, and that a
global out-of-memory condition may still abort the whole process. WASM linear
memory therefore cannot be treated as safely contained by a worker heap limit.
[Node worker documentation](https://nodejs.org/api/worker_threads.html)

The current spike also intentionally rejects asynchronous handlers. A useful
server plugin needs an asynchronous, cancellation-aware capability bridge.
Adding host callbacks before establishing a stronger outer boundary would
increase attack surface without resolving the shared-process risk.

## Required gate for executable team plugins

Before executable server plugins enter the team beta, replace the worker-only
outer boundary with a supervised OS process or equivalent container boundary:

1. Run under a dedicated unprivileged identity with a minimal read-only
   filesystem view and no inherited secrets.
2. Deny network by default outside the broker and apply platform-supported
   syscall/process restrictions.
3. Enforce RSS/CPU/process limits outside the guest and kill the complete
   process group on timeout, cancellation, protocol failure, or uncertain
   state.
4. Keep QuickJS inside that process as the language boundary; never import a
   plugin bundle into Node.
5. Expose only framed, schema-validated, size-bounded broker IPC with
   correlation, grants, idempotency, cancellation, and redaction.
6. Re-run release and debug runtime variants against the abuse corpus, async
   capability fixtures, repeated OOM/restart soak tests, and supported Linux
   deployment environments.

Only evidence from that gate can change this decision. A faster runtime or a
broader Node compatibility layer is not a substitute for isolation.

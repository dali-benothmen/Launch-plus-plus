# Browser plugin sandbox proof

Status: Phase 0 feasibility contract. This proves the browser boundary; it is
not yet the author-facing SDK, package installer, or production asset server.

## Boundary

Custom plugin UI is a built HTML document with local JavaScript and CSS. React
and vanilla authoring both compile to this same browser-standard artifact. The
Launch++ shell never mounts plugin React code into its own tree and never gives
a surface access to application context, cookies, query caches, or internal
modules.

The host renders each document in an iframe with:

- a plugin asset origin different from the shell origin;
- `sandbox="allow-scripts allow-same-origin"`, without top-navigation, popup,
  form, download, or parent-DOM privileges;
- `referrerpolicy="no-referrer"`;
- a restrictive plugin-document CSP; and
- no direct capability other than the validated message bridge.

`allow-same-origin` is safe only because `PluginSurface` rejects shell-origin
URLs. It lets the host authenticate the exact plugin asset origin instead of
accepting the opaque `null` origin. The production asset service must preserve
that origin separation and deliver CSP as an HTTP header. The loopback proof
uses `127.0.0.1` for the shell and `localhost` for artifacts solely to exercise
the cross-origin behavior in Chromium.

## Bridge lifecycle

1. The host registers a listener tied to one `contentWindow` and one origin.
2. On iframe load, it sends host-created context with a fresh nonce and
   protocol version.
3. The surface validates the parent window and host origin, applies theme
   tokens, and echoes the nonce in `launchpp.ready`.
4. Only a ready session can send requests. Every message passes the shared v0
   schema and a 64 KiB serialized-size gate.
5. Capability calls receive an `AbortSignal`; `launchpp.cancel` aborts only the
   matching in-flight request. Responses use the shared structured errors.
6. Unmounting stops the listener and aborts every in-flight request.

Messages from sibling frames are ignored by a session. Messages from the
session's expected window but a different origin are rejected and fail only
that surface. A crash or protocol failure cannot replace the shell or another
plugin frame.

## Executable evidence

The proof build contains independent React and vanilla manifest/artifact
fixtures. Chromium tests verify both handshake and theme initialization,
request/response, cancellation, iframe flags, CSP network denial, blocked top
navigation, and continued host/sibling operation after a plugin exception.
Unit tests cover wrong source/origin handling, nonce binding, protocol
direction, and oversized messages.

## Deferred deliberately

Package extraction and immutable asset serving belong to the packaging proof.
Permission-aware capability implementations belong to the broker. Per-plugin
asset hostnames, CSP response headers, quotas, diagnostics, and supported SDK
ergonomics are hardened before the author preview; the proof does not claim
those production guarantees yet.

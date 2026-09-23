# `@launchpp/plugin-protocol`

Framework-neutral schemas and validators for installed plugin packages and the
sandbox bridge. This package is the protocol source of truth shared by the web
host, server, SDK, CLI, and compatibility tests. It must not depend on React,
Fastify, a database, or application internals.

## Experimental v0 contract

- `apiVersion: "0"` identifies the installed-manifest contract.
- `protocolVersion: "0.1"` identifies every browser-bridge message.
- Versions are exact during the feasibility phase. A host rejects forward
  versions before processing their payload rather than guessing compatibility.
- JSON objects are closed: undeclared properties are rejected.
- Contribution IDs are unique across a package, and every custom UI
  contribution references a declared browser surface.
- Archive paths are relative, remain inside the package, and reject traversal.
- `integrity.json` v0 uses SHA-256 and covers every archive file except itself;
  package intake additionally requires an exact path set and matching digests.
- Context is created by the host. Plugins cannot add actor, organization, project,
  installation, or grant fields to a request.
- Unknown request inputs, successful outputs, error details, and theme values
  are allowed by the envelope. Capability-specific schemas and bridge size
  limits validate and bound them at the broker boundary.

The JSON fixtures in `fixtures/` are executable compatibility examples. Valid,
invalid, and forward-version cases must be updated deliberately whenever this
experimental contract changes.

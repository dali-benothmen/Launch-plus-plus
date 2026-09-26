# `@launchpp/plugin-protocol`

Framework-neutral schemas and validators for Launch++ plugin authoring, normalized
packages, and the sandbox bridge. This package is the protocol source of truth
shared by the web host, server, SDK, CLI, package intake, and compatibility
fixtures. It does not depend on React, Fastify, a database, or application
internals.

## v1-preview manifests

The author-maintained `launchpp.plugin.json` and generated package
`manifest.json` are separate contracts:

- `PluginSourceManifestSchema` describes source entries and requires one of the
  supported `authoring.adapter` values.
- `PluginPackageManifestSchema` describes normalized HTML documents and
  isolated-runtime JavaScript modules. It never contains authoring configuration
  or source entry points.
- Both manifests share identity, release version, a half-open plugin API major
  range, optional host/SDK/UI version evidence, requested permissions,
  dependencies, and contributions.
- `manifestVersion: "1-preview"` identifies this evolving preview contract.
  It is not a stable v1 compatibility promise.

A minimal source manifest is:

```json
{
  "$schema": "./node_modules/@launchpp/plugin-protocol/schemas/plugin-source-v1-preview.json",
  "manifestVersion": "1-preview",
  "id": "acme.sprint-planner",
  "name": "Sprint Planner",
  "description": "Plan project work in named sprints.",
  "version": "1.0.0",
  "apiVersion": {
    "minimum": "1",
    "maximumExclusive": "2"
  },
  "authoring": {
    "adapter": "react-vite"
  },
  "permissions": ["projects:read", "tasks:read"],
  "browser": {
    "surfaces": {
      "sprints": {
        "entry": "./src/pages/SprintsPage.tsx"
      }
    }
  },
  "server": {
    "handlers": {
      "add-to-sprint": {
        "entry": "./src/actions/addToSprint.ts",
        "export": "addToSprint"
      }
    }
  },
  "contributes": {
    "pages": [
      {
        "id": "sprints",
        "scope": "project",
        "path": "sprints",
        "title": "Sprints",
        "surface": "sprints",
        "navigation": {
          "slot": "project.navigation",
          "label": "Sprints",
          "icon": "cycles"
        }
      }
    ],
    "actions": [
      {
        "id": "add-to-sprint",
        "slot": "task.actions",
        "title": "Add to sprint",
        "handler": "add-to-sprint"
      }
    ]
  }
}
```

The packer compiles that into a package manifest with the same contribution
references:

```json
{
  "manifestVersion": "1-preview",
  "id": "acme.sprint-planner",
  "name": "Sprint Planner",
  "description": "Plan project work in named sprints.",
  "version": "1.0.0",
  "apiVersion": {
    "minimum": "1",
    "maximumExclusive": "2"
  },
  "permissions": ["projects:read", "tasks:read"],
  "browser": {
    "surfaces": {
      "sprints": {
        "document": "./browser/surfaces/sprints/index.html"
      }
    }
  },
  "server": {
    "handlers": {
      "add-to-sprint": {
        "module": "./server/handlers.js",
        "export": "addToSprint"
      }
    }
  },
  "contributes": {
    "pages": [
      {
        "id": "sprints",
        "scope": "project",
        "path": "sprints",
        "title": "Sprints",
        "surface": "sprints"
      }
    ],
    "actions": [
      {
        "id": "add-to-sprint",
        "slot": "task.actions",
        "title": "Add to sprint",
        "handler": "add-to-sprint"
      }
    ]
  }
}
```

### Preview contribution vocabulary

The contract includes custom pages and panels, host-rendered actions, standard
or custom settings, and host-managed task text/number fields. A task field may
opt into task detail, Board badge, and List column placements. Contribution IDs
are unique across the entire package. Every custom surface and server handler
reference must resolve to its corresponding top-level declaration.

Required and optional package dependencies use bounded semantic-version ranges.
A plugin cannot depend on itself or declare the same package as both required
and optional. Dependencies describe enablement compatibility only; they do not
grant source, handler, storage, or permission access.

### Completion schemas

Checked-in JSON Schema documents are exported at:

- `@launchpp/plugin-protocol/schemas/plugin-source-v1-preview.json`
- `@launchpp/plugin-protocol/schemas/plugin-package-manifest-v1-preview.json`
- `@launchpp/plugin-protocol/schemas/plugin-package-integrity-v1-preview.json`

They contain descriptions, examples, required properties, enums, path patterns,
and closed-object rules for editor completion. The TypeBox definitions remain
the source of truth. After compiling this package, maintainers regenerate the
documents with:

```bash
pnpm --filter @launchpp/plugin-protocol schemas:write
```

## Package integrity v1-preview

`PluginPackageIntegritySchema` records SHA-256 and expanded byte size for every
package file except `integrity.json` itself. `manifest.json` is mandatory.
Archive intake remains responsible for comparing this exact set to archive
entries, enforcing global resource limits, and matching digests before staging.
Integrity proves byte consistency, not publisher trust.

## Validation diagnostics

The preview validators return structured issues with a JSON Pointer `path`, a
stable `keyword`, and an actionable `message`:

- `validatePluginSourceManifest`
- `validatePluginPackageManifest`
- `validatePluginPackageIntegrity`

Beyond JSON Schema structure, they diagnose incompatible or inverted API ranges,
duplicate contribution IDs/routes/settings/options, missing surface or handler
references, invalid field defaults, dependency overlap/self-dependency, and
incomplete or self-referential integrity metadata.

## Experimental v0 bridge and intake contract

The Phase 0 `apiVersion: "0"` installed manifest, `integrity.json` v0, and
`protocolVersion: "0.1"` browser messages remain exported for the existing
sandbox and deterministic-package proofs. P2-01 does not silently reinterpret
those fixtures. Upload, staged installation, registry resolution, and packer
migration to v1-preview belong to later Phase 2 tasks.

All JSON objects are closed. Context is created by the host, and plugins cannot
supply actor, organization, project, installation, or grant fields. Unknown
capability inputs, successful outputs, error details, and theme values remain
allowed only at the protocol envelope; capability-specific schemas and broker
limits validate them at the authorization boundary.

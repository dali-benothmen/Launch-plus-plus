# Launch++ theme system

Status: base theme contract and runtime implemented. JSON import, server persistence, preview tooling, and the authoring CLI remain later delivery work.

This subsystem design is part of the [Launch++ architecture documentation](./README.md). The [system architecture](./system-architecture.md) defines the application host; this document owns theme authoring, validation, resolution, and distribution.

Launch++ themes should be easy to create, inspect, share, and remove. A basic theme is one JSON file containing metadata and semantic design tokens. Launch++ validates that file, resolves any missing optional values from the base theme, and exposes the result as CSS custom properties to the application and plugin UI.

Themes change presentation, not application behavior. They cannot execute JavaScript, register features, read organization data, alter permissions, or inject unrestricted CSS.

## Product principles

1. **One file is enough.** A designer should be able to duplicate a JSON file, change colors, import it in Settings, and immediately preview the result.
2. **Use semantic tokens.** Authors describe concepts such as `surface`, `textPrimary`, and `danger`, rather than individual components such as `taskCardBackground`.
3. **Safe by construction.** Theme values are validated and converted to a fixed set of CSS variables. Themes cannot target arbitrary selectors or alter the DOM.
4. **Core and plugins look coherent.** Ant Design-backed `@launchpp/ui` components and browser-standard `@launchpp/ui-tokens` consume the same resolved theme as the application. Every custom plugin browser surface receives the resolved variables automatically.
5. **Accessibility is visible.** The editor and installer report contrast and legibility problems before activation.
6. **Appearance is personal by default.** An organization may recommend or provide themes, but each user chooses their active appearance unless an administrator explicitly enforces one.
7. **The format can evolve.** Theme schema versions are separate from Launch++ application versions and plugin package versions.

## Authoring model

The smallest theme consists of one root file:

```text
midnight/
└── launchpp.theme.json
```

An initial theme file could look like this:

```json
{
  "$schema": "https://launchpp.dev/schemas/theme-v1.json",
  "schemaVersion": "1",
  "id": "acme.midnight",
  "name": "Midnight",
  "version": "1.0.0",
  "author": {
    "name": "Acme"
  },
  "appearance": "dark",
  "tokens": {
    "color": {
      "canvas": "#09090b",
      "surface": "#18181b",
      "surfaceRaised": "#202023",
      "surfaceHover": "#27272a",
      "border": "#3f3f46",
      "borderStrong": "#52525b",
      "textPrimary": "#fafafa",
      "textSecondary": "#a1a1aa",
      "textMuted": "#71717a",
      "accent": "#8b5cf6",
      "accentHover": "#7c3aed",
      "onAccent": "#ffffff",
      "success": "#22c55e",
      "warning": "#f59e0b",
      "danger": "#ef4444",
      "focus": "#a78bfa"
    },
    "radius": {
      "small": "6px",
      "medium": "10px",
      "large": "14px"
    },
    "shadow": {
      "panel": "0 8px 30px rgba(0, 0, 0, 0.25)"
    }
  }
}
```

The published JSON Schema is the source of truth. It provides editor completion, documents accepted formats, rejects unknown keys by default, and allows the CLI and server to use the same validation rules.

### Semantic token groups

Theme v1 should expose a deliberately small contract:

| Group | Purpose | Examples |
| --- | --- | --- |
| Color | Backgrounds, content, borders, interaction, and status | `canvas`, `surface`, `textPrimary`, `accent`, `danger` |
| Radius | Shape at a few controlled levels | `small`, `medium`, `large` |
| Shadow | Elevation for host-defined surfaces | `panel`, `dialog`, `menu` |
| Typography | An approved font stack and limited display choices | `fontFamily`, `monoFontFamily` |

Layout density, spacing, component dimensions, navigation placement, and responsive breakpoints are not theme tokens in v1. Allowing them would make themes responsible for product layout and would make plugin compatibility difficult to guarantee.

Most tokens are required so a theme has predictable coverage. A small set of optional tokens may fall back to a documented Launch++ base theme. The resolver records fallback use so the preview can show incomplete areas.

### Light and dark variants

A single theme file represents one appearance variant: `light`, `dark`, or `high-contrast`. This keeps the file and validation model simple.

Authors who want matching light and dark appearances can distribute multiple theme files in one package. Each variant has its own ID and can declare a family relationship:

```json
{
  "id": "acme.ocean-dark",
  "name": "Ocean Dark",
  "family": "acme.ocean",
  "appearance": "dark"
}
```

Launch++ can then switch between family variants when a user selects “follow system.” A missing matching variant falls back to the user's explicitly selected theme or to the built-in Launch++ theme; the runtime must not attempt to algorithmically invert colors.

## Runtime resolution

The server validates and stores immutable theme source files. The web application resolves the selected theme to a complete token set and maps it to a fixed CSS-variable contract:

```css
[data-launch-theme="acme.midnight"] {
  --launch-color-canvas: #09090b;
  --launch-color-surface: #18181b;
  --launch-color-surface-hover: #27272a;
  --launch-color-border: #3f3f46;
  --launch-color-text-primary: #fafafa;
  --launch-color-text-secondary: #a1a1aa;
  --launch-color-accent: #8b5cf6;
  --launch-color-on-accent: #ffffff;
  --launch-radius-medium: 10px;
  --launch-shadow-panel: 0 8px 30px rgba(0, 0, 0, 0.25);
}
```

Resolution follows a deterministic order:

1. Load the versioned Launch++ base tokens for the declared appearance.
2. Apply the validated theme values.
3. Derive only documented state tokens where allowed.
4. Produce a complete, immutable resolved token object.
5. Apply the corresponding custom properties at the application root.
6. Map the resolved values into the host's Ant Design theme configuration.
7. Forward the same resolved object and variables into sandboxed plugin surfaces.

The application should set `color-scheme` consistently with the resolved appearance so browser-native controls match the theme. Switching themes updates the root attributes and variables without reloading the page.

The public contract is the semantic token name, not Launch++'s internal CSS selector or React implementation. Removed or renamed tokens require a schema-version migration rather than silent reinterpretation.

## Application and plugin integration

Components from `@launchpp/ui` consume theme variables automatically:

```tsx
import { Button, Card, Text } from "@launchpp/ui";

export function SprintSummary() {
  return (
    <Card>
      <Text>Seven tasks remain</Text>
      <Button>Open sprint</Button>
    </Card>
  );
}
```

Plugins using custom components may consume the same public variables:

```css
.sprint-card {
  color: var(--launch-color-text-primary);
  background: var(--launch-color-surface);
  border: 1px solid var(--launch-color-border);
  border-radius: var(--launch-radius-medium);
}
```

Sandboxed plugin frames receive the active resolved variables from the host during initialization and whenever the selection changes. The SDK exposes the appearance and resolved tokens for cases such as charts or canvas rendering:

```tsx
import { useTheme } from "@launchpp/sdk/react";

export function ProgressChart() {
  const theme = useTheme();

  return (
    <Chart
      foreground={theme.tokens.color.accent}
      labelColor={theme.tokens.color.textSecondary}
    />
  );
}
```

Plugins must not assume a fixed light or dark palette. A custom plugin may use its own local styles, but those styles remain scoped to its isolated surface and cannot modify the Launch++ shell. The plugin inspector should show whether a custom surface uses public tokens and allow authors to preview every built-in appearance.

For React surfaces, the Launch++ provider also supplies the resolved Ant Design configuration. Plugin authors do not create their own `ConfigProvider` for the host theme. Ant's generated variables, class names and component-token names remain implementation details; the stable author contract is the Launch++ theme schema and documented `--launch-*` variables. Vanilla plugins receive the variables and SDK theme data, not React or Ant components.

## Installation and distribution

### Direct JSON import

Settings → Appearance provides an **Import theme** action. Users can select or drag in `launchpp.theme.json`. Launch++ then:

1. Parses the file without executing anything.
2. Validates its schema, identity, version, token values, and size limits.
3. Runs accessibility checks and displays warnings.
4. Opens a temporary preview without changing the saved selection.
5. Installs and activates it only after confirmation.

An imported JSON file is normalized into an immutable internal theme record. Re-importing the same ID and version with different content is treated as a replacement requiring confirmation, not as an invisible update.

### Packaged and marketplace themes

Themes needing multiple variants, preview images, bundled fonts, signing, licensing, or marketplace distribution use the existing `.launch-plugin` container. The package is declarative and has no executable entries:

```json
{
  "$schema": "https://launchpp.dev/schemas/plugin-v1.json",
  "id": "acme.ocean",
  "name": "Ocean Theme Family",
  "version": "1.0.0",
  "type": "theme",
  "apiVersion": "1",
  "permissions": [],
  "contributes": {
    "themes": [
      {
        "id": "ocean-light",
        "source": "./themes/ocean-light.json"
      },
      {
        "id": "ocean-dark",
        "source": "./themes/ocean-dark.json"
      }
    ]
  }
}
```

This preserves one installation, integrity, signature, update, and entitlement system. A theme package cannot add handlers, events, jobs, data permissions, or network permissions. If a product needs both functional extensions and themes, it should publish a normal plugin and a separate theme package so users can evaluate each independently.

### Assets and fonts

Theme v1 should not allow remote asset URLs. They create privacy, availability, tracking, and content-security concerns.

Marketplace packages may later include size-limited, integrity-checked font files under an explicit asset policy. Until that policy is implemented, themes select from safe system font stacks supplied by Launch++. Logos, background images, cursor replacements, and arbitrary SVG are outside the initial theme contract.

## Selection and scope

Launch++ ships with at least three non-removable themes:

- Launch++ Light
- Launch++ Dark
- Launch++ High Contrast

The active selection is a user preference synchronized with that user's account. Supported modes are:

- A specific installed theme
- Follow system, using matching light and dark variants when available
- Organization default, while still allowing a personal override

An organization administrator may install themes and select an organization default. Enforced organization branding can be considered later, but should not remove the high-contrast escape hatch or override individual accessibility needs.

If an active custom theme is removed, incompatible, or unavailable, Launch++ immediately falls back to the corresponding built-in theme and informs the user. Removing a theme never deletes unrelated organization or plugin data.

## Validation and accessibility

Validation occurs in the editor, CLI, upload API, and server activation path. Server-side validation remains authoritative.

The validator checks:

- Schema and supported schema version
- Stable ID and semantic version format
- Required token coverage
- Allowed color, length, shadow, and font formats
- Unknown or prohibited properties
- File, asset, and expanded package size limits
- Unsafe URLs and external references
- Readability of primary and secondary text on expected surfaces
- Accent and status content against their expected backgrounds
- Focus visibility and differentiation of interactive states
- Availability of a valid fallback appearance

Blocking errors cover malformed or unsafe themes and combinations that make essential controls unreadable. Non-blocking warnings cover less severe contrast issues and visually indistinguishable states. The preview must show each warning in context rather than presenting only a numeric score.

Color cannot be the only carrier of meaning in Launch++ components. Success, warning, error, selection, focus, and task state retain icons, text, borders, or other host-controlled cues regardless of theme values.

## Theme editor experience

The initial authoring workflow can remain file-based:

```text
npx @launchpp/theme-cli create midnight
npx @launchpp/theme-cli dev
npx @launchpp/theme-cli check
npx @launchpp/theme-cli pack
```

These are proposed commands, not implemented tools. `dev` opens a preview gallery containing navigation, lists, boards, task details, forms, dialogs, menus, empty states, loading states, status colors, and sample plugin surfaces.

A visual theme editor can be added later on top of the same schema. It should export ordinary `launchpp.theme.json`, ensuring visual-editor users and code-editor users participate in the same ecosystem.

The built-in editor should support:

- Immediate token editing and preview
- Light, dark, and high-contrast preview backgrounds
- Interaction states such as hover, active, disabled, selected, and focus
- Contrast warnings linked to affected components
- Side-by-side core and plugin component previews
- Resetting individual values to their base token
- Exporting the final JSON file

## Security boundaries

Theme installation is substantially safer than plugin installation because it has no executable surface. The following remain prohibited:

- JavaScript, WebAssembly, or server handlers
- Arbitrary HTML or React components
- Arbitrary CSS selectors or stylesheets
- `url()` values and remote resources
- CSS functions outside an explicit allowlist
- Values that escape into declarations or selectors
- Theme-defined permissions, commands, events, or storage

Launch++ parses token values into typed internal representations and serializes the resulting CSS variables itself. It must not concatenate untrusted JSON values into a raw stylesheet.

## Versioning and compatibility

Three versions remain distinct:

- `schemaVersion` controls the shape and meaning of theme tokens.
- Theme `version` describes a release of a specific theme.
- The containing package `version`, when present, controls package updates and marketplace distribution.

The theme schema evolves additively where possible. A new optional token can use a base fallback. A breaking semantic change requires a new schema version and an explicit migration tool. Launch++ should retain the original source alongside normalized data so authors can export and migrate their theme without losing information.

Built-in tokens and public CSS variables follow the same compatibility policy as `@launchpp/ui`. Plugin developers can rely on a supported token for the lifetime of its schema version.

## Proposed implementation boundaries

The following modules are proposed when implementation begins:

```text
packages/
├── theme-schema/       JSON Schema, token types, and validators
├── theme-runtime/      Resolution, fallbacks, and CSS variable mapping
├── theme-cli/          Create, preview, check, and pack commands
└── ui/                 Components consuming public semantic tokens

apps/
├── web/                Selection UI, live preview, and root application
└── server/             Import, storage, package verification, and policy
```

`theme-schema` must not depend on React or application internals. `theme-runtime` receives validated data and returns a complete resolved token object; it does not read user settings or the database. The web and server applications own selection and persistence.

## Initial delivery plan

1. Define the minimal v1 token vocabulary using the existing Launch++ component inventory.
2. Build Light, Dark, and High Contrast as ordinary theme documents using that schema.
3. Implement deterministic resolution and CSS-variable generation.
4. Map resolved tokens into both stable `--launch-*` variables and the Ant Design configuration used by `@launchpp/ui`.
5. Propagate resolved variables to all sandboxed React and vanilla plugin browser views.
6. Add JSON import, validation, temporary preview, activation, fallback, and removal.
7. Add the component gallery and accessibility diagnostics.
8. Add packaged theme families only after the standalone JSON workflow is stable.

Using the same public contract for built-in and external themes is an architectural test: if Launch++ needs private styling hooks for its own themes, the public theme API is incomplete.

## Acceptance criteria for theme v1

- [ ] A designer can create and import a usable theme by editing one JSON file.
- [ ] Invalid or unsafe token values never reach generated CSS.
- [ ] Theme switching is immediate and does not reload the application.
- [ ] Built-in UI and `@launchpp/ui` plugin components update together.
- [ ] Custom plugin UI can consume documented variables and receive change notifications.
- [ ] Every theme can be previewed before it becomes the saved selection.
- [ ] Essential text, controls, focus, and status states receive actionable accessibility checks.
- [ ] Removing or losing a theme safely restores a built-in appearance.
- [ ] A theme cannot execute code, access data, contact a network service, or modify application layout.
- [ ] Built-in themes use the same schema and resolver as imported themes.

## Decisions captured

- A simple theme is an inspectable `launchpp.theme.json` file.
- Themes contain semantic tokens rather than component-specific overrides.
- Themes have no executable code or unrestricted CSS.
- Direct JSON upload is the primary installation experience.
- Advanced distribution reuses the signed `.launch-plugin` container with `type: "theme"`.
- Light, dark, and high-contrast variants are explicit rather than algorithmically generated.
- User preference wins by default; organization themes provide availability and defaults.
- Core React components, Ant Design-backed `@launchpp/ui`, `@launchpp/ui-tokens`, and custom plugin surfaces share one stable CSS-variable contract.
- Theme v1 controls visual identity, not layout, spacing, component structure, or behavior.

The result is a theme system that is approachable like editing a configuration file, safe enough for one-click import, and stable enough for a plugin marketplace. It remains intentionally smaller than the plugin platform: plugins extend what Launch++ does, while themes only change how supported surfaces look.

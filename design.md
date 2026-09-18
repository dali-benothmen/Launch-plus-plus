---
name: Ant Design
sourceVersion: 6.6.4
capturedAt: 2026-09-18
scope: Default light theme and component behavior
purpose: Reference for recreating the visual language with Radix primitives and CSS
sources:
  - https://ant.design/docs/spec/introduce/
  - https://ant.design/docs/spec/values/
  - https://ant.design/docs/spec/colors/
  - https://ant.design/docs/spec/font/
  - https://ant.design/docs/spec/layout/
  - https://ant.design/docs/react/customize-theme/
  - https://ant.design/docs/react/migration-v6/
  - https://ant.design/components/overview/
tokens:
  color:
    primary: "#1677ff"
    primaryHover: "#4096ff"
    primaryActive: "#0958d9"
    primaryBg: "#e6f4ff"
    primaryBgHover: "#bae0ff"
    primaryBorder: "#91caff"
    primaryBorderHover: "#69b1ff"
    success: "#52c41a"
    successBg: "#f6ffed"
    successBorder: "#b7eb8f"
    warning: "#faad14"
    warningBg: "#fffbe6"
    warningBorder: "#ffe58f"
    error: "#ff4d4f"
    errorBg: "#fff2f0"
    errorBorder: "#ffccc7"
    info: "#1677ff"
    infoBg: "#e6f4ff"
    infoBorder: "#91caff"
    text: "rgba(0, 0, 0, 0.88)"
    textSecondary: "rgba(0, 0, 0, 0.65)"
    textTertiary: "rgba(0, 0, 0, 0.45)"
    textQuaternary: "rgba(0, 0, 0, 0.25)"
    textDisabled: "rgba(0, 0, 0, 0.25)"
    textPlaceholder: "rgba(0, 0, 0, 0.25)"
    bgBase: "#ffffff"
    bgLayout: "#f5f5f5"
    bgContainer: "#ffffff"
    bgElevated: "#ffffff"
    bgSpotlight: "rgba(0, 0, 0, 0.85)"
    fill: "rgba(0, 0, 0, 0.15)"
    fillSecondary: "rgba(0, 0, 0, 0.06)"
    fillTertiary: "rgba(0, 0, 0, 0.04)"
    fillQuaternary: "rgba(0, 0, 0, 0.02)"
    border: "#d9d9d9"
    borderSecondary: "#f0f0f0"
    split: "rgba(5, 5, 5, 0.06)"
  typography:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
    fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace"
    fontSizeSm: 12px
    fontSize: 14px
    fontSizeLg: 16px
    fontSizeXl: 20px
    heading1: 38px/46px
    heading2: 30px/38px
    heading3: 24px/32px
    heading4: 20px/28px
    heading5: 16px/24px
    lineHeight: 22px
    fontWeightRegular: 400
    fontWeightStrong: 600
  size:
    unit: 4px
    controlXs: 16px
    controlSm: 24px
    control: 32px
    controlLg: 40px
    spaceXxs: 4px
    spaceXs: 8px
    spaceSm: 12px
    space: 16px
    spaceMd: 20px
    spaceLg: 24px
    spaceXl: 32px
    spaceXxl: 48px
  radius:
    xs: 2px
    sm: 4px
    base: 6px
    lg: 8px
    outer: 4px
    round: 9999px
  motion:
    fast: 0.1s
    mid: 0.2s
    slow: 0.3s
    easeInOut: "cubic-bezier(0.645, 0.045, 0.355, 1)"
    easeOut: "cubic-bezier(0.215, 0.61, 0.355, 1)"
    easeOutBack: "cubic-bezier(0.12, 0.4, 0.29, 1.46)"
  elevation:
    raised: "0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px rgba(0, 0, 0, 0.03)"
    popup: "0 6px 16px rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)"
  breakpoint:
    xs: 480px
    sm: 576px
    md: 768px
    lg: 992px
    xl: 1200px
    xxl: 1600px
---

# Ant Design 6.6.4 visual system

This is a practical extraction of Ant Design's current default light theme for the Launch++ UI experiment. It is meant to guide a visually faithful implementation with Radix primitives and plain CSS; it is not a copy of Ant Design's source code or a replacement for its component documentation.

The values in the front matter were resolved from the installed `antd@6.6.4` package with `theme.getDesignToken()` and checked against the live official documentation on the capture date. Component measurements below come from the live v6 component-token tables. When this document makes a product recommendation rather than reporting an Ant token, it says so explicitly.

## The important v6 finding

Ant Design 6 is primarily a technical evolution, not a visual reset. Ant's own migration guide says most component APIs remain compatible. The default blue, 14 px type, 32 px controls, 6 px radius, surface hierarchy, and many component measurements intentionally retain continuity with v5.

The parts that should make our recreation specifically v6-aware are:

- CSS variables are the default delivery mechanism and modern browsers are the baseline.
- Components expose stable semantic slots through `classNames` and `styles`; consumers should not target internal DOM structure.
- Component APIs increasingly use consistent concepts such as `variant`, `placement`, `orientation`, `open`, `destroyOnHidden`, `title`, and `content`.
- Inputs and containers use named variants rather than a simple `bordered` boolean.
- Tags distinguish filled and solid variants; Card distinguishes outlined and borderless variants.
- Zero-runtime static CSS is officially supported from v6.
- Focus visibility is a first-class seed setting through `focusOutline`.

In other words, a faithful v6 page may still look recognizably like v5. What changes is the consistency and extensibility beneath the pixels. We should not invent exaggerated visual changes just to make the experiment look “more v6.”

## Product philosophy

Ant Design exists for complex enterprise products where people repeatedly complete real work. It reduces repeated design decisions by turning stable patterns into reusable components and pages.

Its four values translate into concrete UI rules:

- **Natural:** match user expectations, reduce cognitive effort, and organize actions around the user's task.
- **Certain:** show state clearly, reuse consistent interaction patterns, and prefer modular rules over subjective styling.
- **Meaningful:** give every interaction a clear purpose and immediate feedback; decoration must not compete with the work.
- **Growing:** make capabilities discoverable and allow the system to expand without losing consistency.

For Launch++, this means the interface should feel calm, precise, information-dense, and predictable. “Modern” comes from polish, rhythm, feedback, and restraint—not oversized type, excessive glass effects, or ornamental gradients.

## Visual character

The default language is flat-first. Hierarchy comes from whitespace, typography, pale neutral fills, thin borders, and selective blue—not from constant shadow. White is the main work surface, `#f5f5f5` is the layout canvas, and `#fafafa` or subtle black-alpha fills separate table headers and secondary regions.

Use color sparingly:

- Blue identifies the principal action, selected navigation, links, focus, and information.
- Green, amber, and red communicate semantic outcomes, never decoration.
- Preset palette colors belong to categorical labels, charts, and visualization.
- Primary text uses 88% black; secondary information uses 65%; hints use 45%; disabled and placeholder content use 25%.
- Prefer alpha-based neutrals over fixed gray hex values so they blend correctly on tinted surfaces.

One section or decision group should normally have one visually dominant action. Several solid-blue buttons side by side destroy hierarchy.

## Foundations

### Typography

The system font stack makes controls feel native on each platform. The base is deliberately compact: 14 px type on a 22 px line height.

| Role | Size | Line height | Weight |
| --- | ---: | ---: | ---: |
| Heading 1 | 38 px | 46 px | 600 |
| Heading 2 | 30 px | 38 px | 600 |
| Heading 3 | 24 px | 32 px | 600 |
| Heading 4 | 20 px | 28 px | 600 |
| Heading 5 / large title | 16 px | 24 px | 600 |
| Body / control | 14 px | 22 px | 400 |
| Small / metadata | 12 px | 20 px | 400 |

Use 400 for normal product UI and 600 for titles or strong emphasis. Selected controls normally gain emphasis through color or shape, not a sudden font-weight change. Keep labels short and use sentence case.

### Spacing and density

The base spatial unit is 4 px. The practical scale is 4, 8, 12, 16, 20, 24, 32, and 48 px. Component-specific optical measurements such as an input's 11 px horizontal padding are valid where Ant's official component tokens specify them; do not spread those exceptions into general layout.

Control heights are:

- Small: 24 px
- Medium/default: 32 px
- Large: 40 px

The 32 px default is important to Ant's enterprise density. Use 40 px where touch comfort or a focused form calls for it, not as the automatic default for every screen.

### Radius

- 2 px: tiny internal details.
- 4 px: small tags and compact inner shapes.
- 6 px: normal controls.
- 8 px: cards, alerts, modals, and larger surfaces.
- Full circle/pill: avatars, badges, status dots, round controls, and intentionally pill-shaped tags only.

Avoid mixing arbitrary radii. A 16 px “SaaS card” radius is not part of the default Ant 6 language.

### Borders and separators

Use a 1 px solid `#d9d9d9` border for interactive controls and `#f0f0f0` or `rgba(5, 5, 5, 0.06)` for internal separation. Borders should carry most low-level structure. A borderless element must still have enough fill, spacing, or context to remain understandable.

### Elevation

Use the raised shadow for subtly lifted cards and the popup shadow for dropdowns, popovers, modals, and other detached layers. Do not put a popup shadow on every card. Overlay masks use `rgba(0, 0, 0, 0.45)`.

Default popup z-index begins at 1000. Component layers then use small, intentional offsets; for example dropdowns and tab overflow menus commonly use 1050, while tooltips use 1070.

### Motion

- 100 ms: hover, focus, pressed, and color changes.
- 200 ms: fades and component-level open/close transitions.
- 300 ms: larger surface entrance, exit, and movement.

Use the provided easing curves. Motion should confirm cause and effect, never delay routine work. Respect `prefers-reduced-motion`; remove spatial movement and reduce nonessential animation when requested.

## Interaction contract

Every interactive component needs the same complete state model:

1. Resting
2. Hovered
3. Focus-visible
4. Pressed or active
5. Selected or checked, when applicable
6. Loading, when applicable
7. Disabled
8. Error or warning, when applicable

Keyboard focus must remain visible. Do not remove the outline unless an equally visible focus ring replaces it. Pointer hover and keyboard focus are separate states and should not be conflated.

Disabled controls use 25% text, subdued fill, and no interactive cursor. Loading actions retain their width, block duplicate activation, and replace or accompany the leading icon with a spinner. Destructive actions use error styling only when the consequence is genuinely destructive.

Validation appears close to its field and combines color with text or iconography. Never make color the only carrier of meaning.

## Component specifications

### Button

Ant 6 treats button appearance as a combination of semantic color and visual variant. The important variants are solid, outlined, dashed, filled, text, and link. The familiar types map onto those concepts: primary is a solid primary button, default is neutral outlined, dashed is neutral dashed, and text/link are low-chrome actions.

Default geometry:

- Height: 32 px; large 40 px; small 24 px.
- Font: 14 px / 22 px, weight 400; large font 16 px.
- Radius: 6 px.
- Horizontal padding: 15 px; small 7 px.
- Icon-to-label gap: 8 px.
- Default border: `#d9d9d9`; default background: white.
- Default hover text and border: `#4096ff`; active: `#0958d9`.
- Primary background: `#1677ff`; hover: `#4096ff`; active: `#0958d9`; text: white.
- Default shadow: `0 2px 0 rgba(0, 0, 0, 0.02)`.
- Primary shadow: `0 2px 0 rgba(5, 145, 255, 0.10)`.

Use one primary button per action group. Icon-only buttons require an accessible name and normally a tooltip. A danger button communicates consequence, not priority.

### Input, textarea, and input-like controls

Ant 6 uses outlined, filled, borderless, and underlined variants across the input family. Related controls should use the same variant within a form.

Default outlined input:

- Height: 32 px; large 40 px; small 24 px.
- Horizontal padding: 11 px; small 7 px.
- Vertical padding: 4 px; large 7 px; small 0.
- Radius: 6 px; border: `#d9d9d9`; background: white.
- Hover border: `#4096ff`.
- Focus border: `#1677ff` with `0 0 0 2px rgba(5, 145, 255, 0.10)`.
- Placeholder: 25% black.
- Add-on background: `rgba(0, 0, 0, 0.02)`.
- Error focus ring: `0 0 0 2px rgba(255, 38, 5, 0.06)`.
- Warning focus ring: `0 0 0 2px rgba(255, 215, 5, 0.10)`.

Labels live above controls in most forms. Help and validation text sit below. Prefixes, suffixes, clear controls, and password toggles share the field's vertical alignment and must not make typed text jump.

### Select and combobox

The closed trigger follows the same height, radius, border, hover, and focus treatment as Input. The menu is an elevated white surface.

- Option height: 32 px.
- Option padding: 5 px 12 px.
- Active option background: `rgba(0, 0, 0, 0.04)`.
- Selected option uses the primary-tinted surface and primary emphasis.
- Multiple-value chip background: `rgba(0, 0, 0, 0.06)`.
- Multiple chip height: 24 px; large 32 px; small 16 px.

Typing, selection, keyboard navigation, clear, loading, empty, and invalid states must all be represented. The visible label and stored value are distinct concepts.

### Checkbox, radio, and switch

These controls use primary blue for checked state and a neutral border when unchecked. Preserve a generous click target even though the visible indicator is compact.

Switch defaults:

- Track: 44 × 22 px; small 28 × 16 px.
- Inner padding: 2 px.
- Handle: 18 px; small 12 px.
- Handle color: white.
- Handle shadow: `0 2px 4px rgba(0, 35, 11, 0.20)`.

Use Switch for immediate settings and Checkbox for selection or acknowledgement. If changing a switch requires a separate Save action, a checkbox is usually clearer.

### Card

Cards are white 8 px-radius containers. Default cards may use a subtle border; raised cards use the light raised shadow. In v6, treat outlined and borderless as explicit variants rather than a `bordered` toggle.

Typical body padding is 24 px. Separate header, body, cover, action, and tab regions semantically so plugins can style supported slots without reaching into internal markup.

### Tabs

Tabs use text and a primary ink bar rather than a filled background in their standard form.

- Font: 14 px; large 16 px.
- Horizontal gap: 32 px.
- Vertical tab padding: 12 px; large 16 px; small 8 px.
- Content gap below navigation: 16 px.
- Resting text: 88% black.
- Hover: `#4096ff`; selected: `#1677ff`; active: `#0958d9`.

Use tabs for peer views of the same context, not for a full application hierarchy. Keep the active view stable on refresh where the product expects deep linking.

### Menu and navigation

Navigation selection uses `#e6f4ff` with primary-blue text in the light theme. Hover uses a very pale neutral or blue tint. Icons and labels align consistently; collapsed navigation must expose labels through accessible tooltips.

Only one item is selected within a navigation level. Use hierarchy and indentation conservatively—deep nested menus make enterprise software harder to scan.

### Table

Tables are information-dense, not decorative. Headers use a `#fafafa` fill and 88% text. Rows are white until an interaction or status requires otherwise.

- Default cell padding: 16 px horizontally and 16 px vertically.
- Middle density: 8 px horizontal, 12 px vertical.
- Small density: 8 px horizontal and vertical.
- Header radius: 8 px at the outer top corners.
- Header divider: `#f0f0f0`.
- Hover/expanded-row surface: `#fafafa` or a 2–4% black fill.
- Sorted header: `#f0f0f0`.
- Selected row: `#e6f4ff`; selected hover: `#bae0ff`.

Align numbers to the right, labels to the left, and actions consistently. Avoid zebra striping by default. Loading, empty, error, pagination, sorting, selection, expansion, and horizontal overflow need deliberate states.

### Tag and badge

Default tags use `#f5f5f5`, 88% text, a 4 px radius, and optional `#d9d9d9` border. In v6, use filled for a borderless tint and solid for white text on a semantic/preset color.

Tags classify. Badges count or show compact status. Do not use a tag as the only explanation of a critical error.

### Alert

Alerts use an 8 px radius and 8 px × 12 px padding in the compact form. Description-style alerts use more space, typically 20 px × 24 px, with a 24 px status icon.

| Status | Accent | Background | Border |
| --- | --- | --- | --- |
| Info | `#1677ff` | `#e6f4ff` | `#91caff` |
| Success | `#52c41a` | `#f6ffed` | `#b7eb8f` |
| Warning | `#faad14` | `#fffbe6` | `#ffe58f` |
| Error | `#ff4d4f` | `#fff2f0` | `#ffccc7` |

Keep the title actionable and the description concise. A closable alert needs a properly labelled close button.

### Modal and drawer

Modal content is white with an 8 px radius and the popup shadow. The mask is `rgba(0, 0, 0, 0.45)`. Titles are 16 px / 24 px at weight 600. Header and footer backgrounds remain transparent so the modal reads as one surface.

Focus moves into the dialog, is trapped while open, and returns to the trigger on close. Escape and mask-close behavior must be intentional for destructive or incomplete workflows. Use a drawer for contextual work that benefits from preserving the underlying page; use a modal for a bounded decision.

### Dropdown, popover, and tooltip

All three are elevated, transient layers, but they serve different purposes:

- Dropdown: actions or selection; white surface, 5 px vertical menu padding, 1050 z-index.
- Popover: richer interactive or explanatory content.
- Tooltip: short, noninteractive clarification; maximum width 250 px, `rgba(0, 0, 0, 0.85)` background, white text, 1070 z-index.

Use collision-aware positioning and preserve an 8 px relationship to the trigger where geometry allows. Tooltips must never contain essential information unavailable elsewhere.

### Empty, loading, result, message, and notification

Feedback should answer three questions: what happened, what it means, and what the user can do next. Use:

- Skeleton for content whose shape is known and expected soon.
- Spinner for indeterminate work in a bounded area.
- Empty for a valid zero-data state, with a next action when useful.
- Result for a significant completed outcome.
- Message for brief global confirmation.
- Notification for richer asynchronous information that may include an action.

Do not stack several feedback mechanisms for one event.

## Semantic component anatomy

Our Radix/CSS recreation should copy Ant 6's principle of stable semantic slots, not its internal class names. Each Launch++ component should expose a small, documented anatomy such as:

```text
Dialog
├── root
├── mask
├── wrapper
├── section
│   ├── header
│   │   ├── title
│   │   └── close
│   ├── body
│   └── footer
```

The public styling surface should target these roles. DOM changes underneath must not break plugin styling. Prefer component props and tokens over descendant selectors.

## CSS reference

This subset is enough to establish the default visual language in plain CSS:

```css
:root {
  --ant-color-primary: #1677ff;
  --ant-color-primary-hover: #4096ff;
  --ant-color-primary-active: #0958d9;
  --ant-color-primary-bg: #e6f4ff;

  --ant-color-success: #52c41a;
  --ant-color-warning: #faad14;
  --ant-color-error: #ff4d4f;

  --ant-color-text: rgba(0, 0, 0, 0.88);
  --ant-color-text-secondary: rgba(0, 0, 0, 0.65);
  --ant-color-text-tertiary: rgba(0, 0, 0, 0.45);
  --ant-color-text-disabled: rgba(0, 0, 0, 0.25);
  --ant-color-border: #d9d9d9;
  --ant-color-border-secondary: #f0f0f0;
  --ant-color-bg-layout: #f5f5f5;
  --ant-color-bg-container: #ffffff;

  --ant-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --ant-font-size: 14px;
  --ant-line-height: 1.5714285714;

  --ant-control-height: 32px;
  --ant-control-height-sm: 24px;
  --ant-control-height-lg: 40px;
  --ant-radius-sm: 4px;
  --ant-radius: 6px;
  --ant-radius-lg: 8px;

  --ant-motion-fast: 100ms;
  --ant-motion-mid: 200ms;
  --ant-motion-slow: 300ms;
  --ant-ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
  --ant-ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
}
```

The `--ant-` prefix above records provenance for this experiment. Launch++ production tokens should use our own public namespace and semantic names rather than pretending to be Ant Design tokens.

## Component coverage map

The current Ant component catalog is broad: General, Layout, Navigation, Data Entry, Data Display, Feedback, and Other. Recreating every component would be a product in itself, so Launch++ should borrow the system's coherence while implementing only what the MVP needs.

Recommended MVP order:

1. Button, icon button, typography, link, divider, space.
2. Input, textarea, select/combobox, checkbox, radio, switch, form field.
3. Card, avatar, tag, badge, empty, skeleton, spinner.
4. Menu, dropdown, tooltip, popover, tabs, breadcrumb.
5. Dialog, drawer, alert, message, notification, confirm.
6. Table and pagination.

Date pickers, tree controls, transfer lists, cascaders, carousels, tours, color pickers, QR codes, and advanced layout helpers should wait until a real Launch++ or plugin use case needs them.

## Accessibility and quality bar

- Use semantic HTML first; Radix supplies behavior where native elements are insufficient.
- Every control is keyboard operable and has a visible focus state.
- Icon-only controls have accessible names.
- Dialogs, popovers, menus, and comboboxes follow their expected ARIA patterns.
- Error, success, and selection never rely on color alone.
- Touch targets may exceed the visible 24–32 px control through padding or a larger hit area.
- Text and control contrast must be checked in our final Launch++ theme. Matching a source token does not waive our accessibility target.
- Motion respects reduced-motion preferences.
- Layout and labels survive zoom, long translations, and narrow widths.

## Theming model to preserve

Ant's official model has three derived layers:

1. **Seed tokens** express design intent, such as primary color, base radius, base font size, and control height.
2. **Map tokens** are algorithmically derived scales and gradients.
3. **Alias tokens** assign those values to semantic roles used across components.

Components then add narrowly scoped component tokens. Launch++ should preserve the same direction: a small set of theme inputs, derived semantic tokens, and documented component overrides. Plugins should consume public CSS custom properties and UI components; they should not hard-code the captured hex values or depend on internal markup.

## Source boundary

This document records the official Ant Design site and runtime defaults as of Ant Design 6.6.4. The most relevant primary sources are:

- [Introduction and design philosophy](https://ant.design/docs/spec/introduce/)
- [Design values](https://ant.design/docs/spec/values/)
- [Color system](https://ant.design/docs/spec/colors/)
- [Typography](https://ant.design/docs/spec/font/)
- [Layout](https://ant.design/docs/spec/layout/)
- [Theme architecture and tokens](https://ant.design/docs/react/customize-theme/)
- [v5 to v6 migration guide](https://ant.design/docs/react/migration-v6/)
- [Component overview](https://ant.design/components/overview/)

Individual component values were checked against the official Button, Input, Select, Switch, Card, Tabs, Table, Tag, Alert, Modal, Dropdown, and Tooltip documentation. If a future Ant release changes those values, update `sourceVersion` and re-extract rather than silently mixing versions.

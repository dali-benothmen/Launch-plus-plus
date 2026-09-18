---
name: Launch++ Design System
version: 0.1.0
updatedAt: 2026-09-18
scope: Default light theme and component behavior
purpose: Source of truth for implementing the Launch++ visual language with Radix primitives and CSS
referenceRuntime:
  fontFamily: "AlibabaSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
  fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace"
  presetColors:
    blue: "#1677ff"
    purple: "#722ed1"
    cyan: "#13c2c2"
    green: "#52c41a"
    magenta: "#eb2f96"
    pink: "#eb2f96"
    red: "#f5222d"
    orange: "#fa8c16"
    yellow: "#fadb14"
    volcano: "#fa541c"
    geekblue: "#2f54eb"
    gold: "#faad14"
    lime: "#a0d911"
  blueScale:
    blue1: "#e6f4ff"
    blue2: "#bae0ff"
    blue3: "#91caff"
    blue4: "#69b1ff"
    blue5: "#4096ff"
    blue6: "#1677ff"
    blue7: "#0958d9"
    blue8: "#003eb3"
  primitives:
    lineWidth: 1px
    lineType: solid
    sizeUnit: 4px
    sizeStep: 4px
    sizePopupArrow: 16px
    controlHeight: 32px
    zIndexBase: 0
    zIndexPopupBase: 1000
    opacityImage: 1
brand:
  colorPrimary: "#1668dc"
  colorPrimaryHover: "#3c8ae8"
  colorPrimaryActive: "#094bb5"
  colorPrimaryBg: "#e6f4ff"
  colorPrimaryBgHover: "#bde1ff"
  colorPrimaryBorder: "#94cbff"
  colorPrimaryBorderHover: "#67abf5"
  colorBlack: "#000000"
  borderRadius: 6px
componentTokens:
  button:
    contentFontSize: 14px
    controlHeight: 32px
    paddingInline: 12px
    iconGap: 8px
    fontWeight: 400
    borderRadius: 6px
  floatButton:
    size: 40px
    viewportInset: 24px
    groupGap: 12px
    squareRadius: 8px
  input:
    transitionDuration: 200ms
    transitionProperties: border-color, background-color, box-shadow
    shapeRound: 9999px
  dialog:
    enterDuration: 200ms
    exitDuration: 200ms
    exitDistance: 6px
tokens:
  color:
    primary: "#1668dc"
    primaryHover: "#3c8ae8"
    primaryActive: "#094bb5"
    primaryBg: "#e6f4ff"
    primaryBgHover: "#bde1ff"
    primaryBorder: "#94cbff"
    primaryBorderHover: "#67abf5"
    black: "#000000"
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
    easeOutCirc: "cubic-bezier(0.08, 0.82, 0.17, 1)"
    easeInOutCirc: "cubic-bezier(0.78, 0.14, 0.15, 0.86)"
    easeOutBack: "cubic-bezier(0.12, 0.4, 0.29, 1.46)"
    easeInBack: "cubic-bezier(0.71, -0.46, 0.88, 0.6)"
    easeInQuint: "cubic-bezier(0.755, 0.05, 0.855, 0.06)"
    easeOutQuint: "cubic-bezier(0.23, 1, 0.32, 1)"
  elevation:
    raised: "0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px rgba(0, 0, 0, 0.03)"
    popup: "0 6px 16px rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)"
    drawerDownDark: "0 -6px 16px rgba(255, 255, 255, 0.016), 0 -3px 6px -4px rgba(255, 255, 255, 0.024), 0 -9px 28px 8px rgba(255, 255, 255, 0.01)"
  breakpoint:
    xs: 480px
    sm: 576px
    md: 768px
    lg: 992px
    xl: 1200px
    xxl: 1600px
---

# Launch++ design system

This document is the source of truth for the Launch++ visual language. It defines the default light theme, interaction model, component measurements, and public styling direction for the core product and its plugins.

## Runtime foundations

The system uses an `AlibabaSans`-first component font stack with native system fallbacks, a 4 px size unit, 32 px default control height, 6 px base radius, and 1000 popup z-index. The `referenceRuntime` block records the complete supporting palette and primitive values. The `brand` block contains Launch++ product decisions.

Context matters when applying shadows. The `drawerDownDark` token uses very low-opacity white layers and belongs only on dark or inverse surfaces. Light surfaces use black-alpha elevation tokens.

Launch++ uses `#1668dc` as its primary color. Black remains available as an independent palette token for text, high-contrast surfaces, and future product needs; it is not the primary interaction color.

The page-level font aliases are:

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji",
    "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  --default-font-family: var(--font-sans);
  --default-mono-font-family: var(--font-mono);
}
```

The component scope prepends `AlibabaSans` to this sans-serif token. If the font is unavailable, the browser naturally falls back to the system stack above.

## System direction

The visual system is compact, stable, and extensible. Its implementation rules are:

- CSS variables are the default delivery mechanism and modern browsers are the baseline.
- Components expose stable semantic slots through `classNames` and `styles`; consumers should not target internal DOM structure.
- Component APIs increasingly use consistent concepts such as `variant`, `placement`, `orientation`, `open`, `destroyOnHidden`, `title`, and `content`.
- Inputs and containers use named variants rather than a simple `bordered` boolean.
- Inputs support a `round` shape for search and other compact discovery controls.
- Tags distinguish filled and solid variants; Card distinguishes outlined and borderless variants.
- Static CSS output must remain possible for plugin packaging and predictable runtime performance.
- Focus visibility is a first-class seed setting through `focusOutline`.

## Product philosophy

Launch++ supports complex team workflows where people repeatedly complete real work. It reduces repeated design decisions by turning stable patterns into reusable components and pages.

Its four values translate into concrete UI rules:

- **Natural:** match user expectations, reduce cognitive effort, and organize actions around the user's task.
- **Certain:** show state clearly, reuse consistent interaction patterns, and prefer modular rules over subjective styling.
- **Meaningful:** give every interaction a clear purpose and immediate feedback; decoration must not compete with the work.
- **Growing:** make capabilities discoverable and allow the system to expand without losing consistency.

For Launch++, this means the interface should feel calm, precise, information-dense, and predictable. “Modern” comes from polish, rhythm, feedback, and restraint—not oversized type, excessive glass effects, or ornamental gradients.

## Visual character

The default language is flat-first. Hierarchy comes from whitespace, typography, pale neutral fills, thin borders, and selective accent color—not from constant shadow. White is the main work surface, `#f5f5f5` is the layout canvas, and `#fafafa` or subtle black-alpha fills separate table headers and secondary regions.

Use color sparingly:

- Primary blue identifies the principal action, selected navigation, links, and focus.
- Black is a neutral palette color rather than a brand or interaction state.
- Green, amber, and red communicate semantic outcomes, never decoration.
- Preset palette colors belong to categorical labels, charts, and visualization.
- Primary text uses 88% black; secondary information uses 65%; hints use 45%; disabled and placeholder content use 25%.
- Prefer alpha-based neutrals over fixed gray hex values so they blend correctly on tinted surfaces.

One section or decision group should normally have one visually dominant action. Several solid-primary buttons side by side destroy hierarchy.

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

The base spatial unit is 4 px. The practical scale is 4, 8, 12, 16, 20, 24, 32, and 48 px. Component-specific optical measurements such as an input's 11 px horizontal padding are valid where a component token specifies them; do not spread those exceptions into general layout.

Control heights are:

- Small: 24 px
- Medium/default: 32 px
- Large: 40 px

The 32 px default preserves the product's compact working density. Use 40 px where touch comfort or a focused form calls for it, not as the automatic default for every screen.

### Radius

- 2 px: tiny internal details.
- 4 px: small tags and compact inner shapes.
- 6 px: normal controls.
- 8 px: cards, alerts, modals, and larger surfaces.
- Full circle/pill: avatars, badges, status dots, round controls, and intentionally pill-shaped tags only.

Avoid mixing arbitrary radii. A 16 px “SaaS card” radius is not part of the default Launch++ language.

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

Launch++ treats button appearance as a combination of semantic color and visual variant. The important variants are solid, outlined, dashed, filled, text, and link. Primary is a solid brand button, default is neutral outlined, dashed is neutral dashed, and text/link are low-chrome actions.

Default geometry:

- Height: 32 px; large 40 px; small 24 px.
- Font: 14 px / 22 px, weight 400; large font 16 px.
- Radius: 6 px.
- Horizontal padding: 12 px; small 7 px. The 12 px default is a Launch++ compact override.
- Icon-to-label gap: 8 px.
- Default border: `#d9d9d9`; default background: white.
- Default hover text and border: `#3c8ae8`; active: `#094bb5`.
- Primary background: `#1668dc`; hover: `#3c8ae8`; active: `#094bb5`; text: white.
- Default shadow: `0 2px 0 rgba(0, 0, 0, 0.02)`.
- Primary shadow: `0 2px 0 rgba(22, 104, 220, 0.14)`.

The base button is `position: relative` and `display: inline-flex`, centers its content on both axes, prevents wrapping and text selection, uses `touch-action: manipulation`, has no background image or native outline, and transitions with the medium duration and standard ease-in-out curve. Focus-visible styling supplies the accessible outline.

Use one primary button per action group. Icon-only buttons require an accessible name and normally a tooltip. A danger button communicates consequence, not priority.

### Input, textarea, and input-like controls

Launch++ uses outlined, filled, borderless, and underlined variants across the input family. Related controls should use the same variant within a form.

Default outlined input:

- Height: 32 px; large 40 px; small 24 px.
- Horizontal padding: 11 px; small 7 px.
- Vertical padding: 4 px; large 7 px; small 0.
- Radius: 6 px; border: `#d9d9d9`; background: white.
- Hover border: `#3c8ae8`.
- Focus border: `#1668dc` with `0 0 0 2px rgba(22, 104, 220, 0.12)`.
- Placeholder: 25% black.
- Add-on background: `rgba(0, 0, 0, 0.02)`.
- Error focus ring: `0 0 0 2px rgba(255, 38, 5, 0.06)`.
- Warning focus ring: `0 0 0 2px rgba(255, 215, 5, 0.10)`.
- Border, background, and focus-ring changes transition over 200 ms with the standard ease-in-out curve.

Labels live above controls in most forms. Help and validation text sit below. Prefixes, suffixes, clear controls, and password toggles share the field's vertical alignment and must not make typed text jump.

### Select and combobox

The closed trigger follows the same height, radius, border, hover, focus, and transition treatment as Input. The menu is an elevated white surface. Always use the shared Select component in product forms and dialogs rather than a browser-native select so keyboard behavior, popup layering, theming, and visual states remain consistent.

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

Cards are white 8 px-radius containers. Default cards may use a subtle border; raised cards use the light raised shadow. Treat outlined and borderless as explicit variants rather than a `bordered` toggle.

Typical body padding is 24 px. Separate header, body, cover, action, and tab regions semantically so plugins can style supported slots without reaching into internal markup.

### Tabs

Tabs use text and a primary ink bar rather than a filled background in their standard form.

- Font: 14 px; large 16 px.
- Horizontal gap: 32 px.
- Vertical tab padding: 12 px; large 16 px; small 8 px.
- Content gap below navigation: 16 px.
- Resting text: 88% black.
- Hover: `#3c8ae8`; selected: `#1668dc`; active: `#094bb5`.

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
- Selected row: `#e6f4ff`; selected hover: `#bde1ff`.

Align numbers to the right, labels to the left, and actions consistently. Avoid zebra striping by default. Loading, empty, error, pagination, sorting, selection, expansion, and horizontal overflow need deliberate states.

### Tag and badge

Default tags use `#f5f5f5`, 88% text, a 6 px radius, and optional `#d9d9d9` border. Use filled for a borderless tint and solid for white text on a semantic or preset color.

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

Open and close are symmetrical 200 ms transitions. The mask fades in and out; the surface fades and moves no more than 6 px while scaling subtly. The dialog remains mounted until its exit animation completes, preventing an abrupt disappearance.

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

Our Radix/CSS components use stable semantic slots rather than exposing internal class names. Each component should provide a small, documented anatomy such as:

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
  --launch-color-primary: #1668dc;
  --launch-color-primary-hover: #3c8ae8;
  --launch-color-primary-active: #094bb5;
  --launch-color-primary-bg: #e6f4ff;
  --launch-color-black: #000000;

  --launch-color-success: #52c41a;
  --launch-color-warning: #faad14;
  --launch-color-error: #ff4d4f;

  --launch-color-text: rgba(0, 0, 0, 0.88);
  --launch-color-text-secondary: rgba(0, 0, 0, 0.65);
  --launch-color-text-tertiary: rgba(0, 0, 0, 0.45);
  --launch-color-text-disabled: rgba(0, 0, 0, 0.25);
  --launch-color-border: #d9d9d9;
  --launch-color-border-secondary: #f0f0f0;
  --launch-color-bg-layout: #f5f5f5;
  --launch-color-bg-container: #ffffff;

  --launch-font-family: AlibabaSans, -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --launch-font-size: 14px;
  --launch-line-height: 1.5714285714;

  --launch-control-height: 32px;
  --launch-control-height-sm: 24px;
  --launch-control-height-lg: 40px;
  --launch-radius-sm: 4px;
  --launch-radius: 6px;
  --launch-radius-lg: 8px;

  --launch-motion-fast: 100ms;
  --launch-motion-mid: 200ms;
  --launch-motion-slow: 300ms;
  --launch-ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
  --launch-ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
}
```

## Component coverage map

The full component space is broad: General, Layout, Navigation, Data Entry, Data Display, Feedback, and Other. Building every possible component would be a product in itself, so Launch++ implements only what the product and plugin MVP need.

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

## Theming model

The Launch++ theme has three derived layers:

1. **Seed tokens** express design intent, such as primary color, base radius, base font size, and control height.
2. **Map tokens** are algorithmically derived scales and gradients.
3. **Alias tokens** assign those values to semantic roles used across components.

Components then add narrowly scoped component tokens. Keep the public theme centered on a small set of inputs, derived semantic tokens, and documented component overrides. Plugins consume public CSS custom properties and UI components; they must not hard-code internal values or depend on private markup.

## Change management

Treat this file as the canonical visual contract. When a token or component rule changes, update this document and the shared implementation together. Never mix old and new token generations silently; record intentional changes in version control and verify affected components as one coherent set.

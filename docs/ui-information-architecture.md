# Launch++ UI information architecture

Status: accepted initial product direction for iteration. This document defines pages, navigation, page responsibilities, and extension placement. It does not define visual styling, final component design, or implementation details.

This document is part of the [Launch++ architecture documentation](./README.md). The [product scope](./product-scope.md) owns the minimal feature boundary, while the [plugin system](./plugin-system-design.md) owns executable extension contracts.

## Product objective

Launch++ should feel small when first installed and remain understandable as projects, team members, and plugins are added. The interface therefore uses:

- One stable application shell.
- A narrow global icon rail for product areas.
- Separate Home and Projects pages with distinct responsibilities.
- A single project page whose core and plugin views share the same header.
- Route-backed task details that preserve project context.
- One settings system divided by personal, organization, project, and installation authority.
- Host-controlled plugin placements instead of plugin-owned navigation shells.

Core work remains complete when every optional plugin is disabled.

## Application shell

Authenticated desktop layouts have two stable columns:

```text
┌─────────────┬──────────────────────────────────────────────────────┐
│ Global rail │ Main content                                         │
│ Icon-only   │ Home, Projects, selected project, settings, or plugin │
│ navigation  │                                                      │
└─────────────┴──────────────────────────────────────────────────────┘
```

The global rail remains visually narrow. Project discovery lives on a dedicated Projects page rather than consuming permanent horizontal space. On narrower layouts, task-detail panels become full pages. The information hierarchy and route identity remain the same; responsive behavior must not create a second mobile-only product model.

### Global icon rail

The rail contains icons with accessible names and visible tooltips:

1. Home.
2. Projects.
3. Global search.
4. Calendar when the official Calendar plugin is enabled.
5. Members.
6. Approved plugin-contributed organization pages.
7. Settings near the bottom.
8. User/avatar menu at the bottom.

Global search and notifications belong in application chrome rather than taking permanent rail positions. Board and List never appear in the global rail because they are views of a selected project.

The host controls icon order, active state, overflow, accessibility, permissions, and whether a plugin contribution is visible. Plugins cannot create an additional global rail.

## Home

Home is the default authenticated page. It contains an adaptive welcome banner, recent projects in Quick access, and pinned projects when any exist. A first-time owner sees one clear action to create the first project and enter its Board.

Home is not the project organizer and does not contain folders or the complete project table.

## Projects

Projects is a dedicated rail destination and behaves like a small file explorer. Folders appear at the top of the page and the project table appears below them.

- Users create projects and optional folders from this page.
- Folders are one level deep and contain projects only.
- Projects can be moved into and out of folders by context menu or drag and drop.
- Folder and project actions are available through right-click menus.
- A table shows project name, owner, last activity, and sharing state.

Drag and drop is an accelerator, not the only way to move a project. Folder-based permissions, workflows, and plugin inheritance remain outside the MVP.

## Public and authentication pages

Authentication pages use a shared split-page shell on large screens:

```text
┌────────────────────────────┬────────────────────────────┐
│ Form                       │ Product presentation       │
│                            │                            │
│ Account action             │ Calm board/calendar       │
│ Inputs                     │ preview, illustration, or  │
│ Primary action             │ product principle         │
│ Recovery/invitation links  │                            │
└────────────────────────────┴────────────────────────────┘
```

The right side should reinforce the product rather than contain unrelated decoration. Suitable content includes a simplified Launch++ organization preview, a Board-to-Calendar example, a restrained illustration, or one short product principle. It must not expose real organization data. On narrow screens, the presentation side disappears and the form becomes the full page.

| Page | Responsibility | Required content |
| --- | --- | --- |
| Sign in | Authenticate an existing account | Email, password, configured provider options, recovery link, validation, loading and failure states |
| Sign up / create account | Create an account when installation policy permits it | Identity and credential fields, policy message, terms where applicable, invitation awareness |
| Account recovery | Restore access | Recovery request, token completion, expiry, success and invalid-token states |
| Accept invitation | Join the intended organization | Organization/inviter identity, sign-in or account creation, accept/decline result |
| First installation setup | Create the first owner securely | Setup-token validation and owner account |
| Organization setup | Establish the first working context | Organization name and completion state |

The sign-up surface supports open registration, invitation-required registration, and registration-disabled policies. An invite link should never send an authenticated user through unrelated organization creation.

## Light onboarding

Onboarding is a short path to useful work, not a product questionnaire.

### First installation owner

1. Create the owner account.
2. Name the first organization.
3. Name the first project and accept a small default status workflow.
4. Enter the project Board.

### Invited member

1. Create or confirm the account.
2. Accept the organization invitation.
3. Enter the invited organization or project.

### User creating an additional organization

1. Name the organization.
2. Create the first project.
3. Enter the project.

Company size, industry, job title, feature interests, integrations, and plugin recommendations are excluded from initial onboarding. Optional education appears contextually on the page where an action is performed.

## First-run Home

After organization setup, Home asks the owner to create the first project. Creating it opens the Board immediately. The ordinary Home replaces that first-run prompt with recent and organizational content; it does not become a configurable analytics dashboard.

## Project page

Selecting a project opens one project page. Board, List, and plugin views share the page shell and the same underlying task access rules.

### Header row one

Left side:

- Optional folder breadcrumb.
- Project name.
- Favorite control.
- Project overflow menu.

Right side:

- Visible member avatars.
- Add member action when permitted.
- Additional project-level actions through overflow when needed.

### Header row two

Left side:

- Board.
- List.
- Enabled plugin project views such as Sprints or Calendar.
- Overflow for views that do not fit.

Right side:

- Project search.
- Filters.
- Sort or grouping controls appropriate to the active view.
- New task.

The active view fills the remaining page. Board and List are permanent core entries and cannot be removed or replaced by a plugin. The host controls plugin-view labels, routes, ordering, active state, permission visibility, and overflow.

The project URL preserves the selected project and view. Filters and grouping may be encoded in the URL when doing so makes a view meaningfully shareable.

## Board and List

Board and List are projections over the same task model.

Board includes:

- Columns based on the project's ordered statuses.
- Task cards with a small configurable set of metadata.
- Inline task creation where practical.
- Keyboard-accessible movement in addition to drag and drop.
- Configurable plugin fields or badges only when their placement is enabled.

List includes:

- Dense task rows.
- Column selection.
- Sorting, filtering, and pagination or incremental loading.
- The same task-detail destination as Board.
- Plugin fields only through supported host-rendered columns.

Neither view creates a separate task representation or persistence model.

## Task detail

Selecting a task opens a route-backed panel on desktop while preserving the underlying project view. On narrow screens it becomes a full page. Closing it returns focus to the task that opened it. Direct links open the correct project context and task.

The surface has four ordered regions:

1. **Identity and state:** title, status, project, assignees, due date, and labels.
2. **Work content:** description and subtasks.
3. **Collaboration:** comments and activity.
4. **Extensions:** declarative plugin fields integrated into supported property positions and substantial plugin panels in a bounded Extensions region.

The action menu combines core and labeled plugin actions. Destructive actions remain separated and use proportional confirmation. A plugin panel failure is confined to that panel and cannot prevent editing core task data.

## Calendar

Calendar appears as a first-class rail icon but is delivered as an official bundled plugin. This validates that a plugin can feel native without becoming part of the minimal domain core.

The Calendar page provides:

- Month and other initially supported time views.
- Tasks positioned by due date.
- Project visibility filters in the contextual sidebar.
- Task creation or due-date assignment in supported interactions.
- The same route-backed task detail used by Board and List.
- Empty, loading, restricted, and plugin-failure states.

When the Calendar plugin is disabled, its icon and contribution disappear while task due dates remain core data.

## Members

Members is a core organization page and a rail destination. Ordinary members may view the directory according to organization policy; authorized owners and administrators receive management controls.

The contextual sidebar contains:

- All members.
- Pending invitations.
- Owners and administrators.
- Members.
- Deactivated users when that lifecycle exists.

The main page contains:

- Member directory.
- Search.
- Invite member action.
- Role and invitation status.
- Joined date or other minimal administrative context.
- Role changes, invitation cancellation/resend, and removal for authorized actors.
- Project-access management only after restricted project membership is introduced.

Member analytics, productivity scores, and presence monitoring are not part of this page.

## Search, commands, and notifications

These are primarily transient surfaces rather than permanent rail pages:

| Surface | Form | Responsibility |
| --- | --- | --- |
| Global search | Overlay with a deep-linkable results state when needed | Find tasks and projects and navigate with the keyboard |
| Project search | Project-header control | Search within the active project/view |
| Command palette | Overlay | Create, navigate, and run eligible core or plugin commands |
| Notifications preview | Header popover | Show recent unread notifications and link to longer history |
| Notifications history | Focused page reached from the popover | Review read/unread items and navigate to affected entities |

Create task, create project, filters, sorting, confirmation, and simple plugin commands use inline controls, popovers, panels, or dialogs rather than permanent pages.

## Settings

Settings uses the global rail plus the contextual sidebar. The contextual navigation is grouped by authority and only shows sections the current actor can use.

### Personal

- **Profile:** name, avatar, locale and time zone when supported.
- **Appearance:** theme selection, light/dark/system behavior, imported theme preview.
- **Notifications:** personal delivery preferences as channels are introduced.
- **Sessions:** active sessions and revocation.

### Organization

- **General:** organization name and defaults.
- **Members:** the administrative view of invitations, roles, and removal; it links to the main Members directory rather than duplicating it.
- **Extensions:** enable operator-installed packages, review grants, choose project scopes, configure organization plugin settings, and inspect health.
- **Data and export:** organization export/import entry points, retention explanations, and authorized deletion.

### Current project

- **General:** name, folder placement, archive/restore, and deletion.
- **Workflow:** ordered statuses and project defaults.
- **Extensions:** enable approved plugins, configure project-scoped settings, and control supported field/view placements.

### Installation operator

- **Packages:** upload a `.launch-plugin`, validate it, review identity/provenance/permissions, install versions, and remove unused artifacts.
- **Developer Mode:** enable the temporary channel, approve pairing, choose a development organization, show connected developer/session/expiry, and revoke access.
- **System:** canonical URL, mail/integration configuration summaries, application version, and update readiness.
- **Backups:** backup status and create, verify, and restore entry points with strong confirmation.
- **Diagnostics:** health, storage use, failed jobs/plugins, safe-start controls, and redacted diagnostic export.

Organization ownership does not automatically grant installation-operator access on a shared or hosted deployment. The UI communicates this through absent groups and clear authority descriptions rather than a screen full of disabled controls.

## Plugin management journey

Package installation and organization enablement remain separate:

1. An installation operator opens **Settings → Installation → Packages** and uploads an archive.
2. Launch++ validates it before any executable code runs.
3. The operator reviews publisher/provenance, contents, compatibility, permissions, and size, then adds it to the installation package pool.
4. An organization administrator opens **Settings → Organization → Extensions**, reviews organization grants and project scopes, and enables it.
5. Project administrators configure project enablement and placements where allowed.
6. Disabling removes contributions and execution while retaining data. Removing a package and purging plugin data are distinct, more privileged actions.

A future marketplace changes discovery, purchase, and acquisition. It does not replace the permission review, organization enablement, or project-placement surfaces.

## Plugin contribution placement

| Contribution | Product placement | Host responsibility |
| --- | --- | --- |
| Organization page | Global rail as an approved plugin icon, with overflow when required | Icon, tooltip, order, route, active state, visibility, permissions |
| Project page | Project view rail after Board and List | Label, route, project context, ordering, overflow, failure boundary |
| Task field | Supported task properties and configured Board/List placements | Native input, validation, visibility, theme, authorization |
| Task panel | Task detail Extensions region | Boundary, loading/error state, theme bridge, lifecycle |
| Task/card action | Existing host action menu | Native item, plugin identity, permission state, confirmation |
| Board action | Board toolbar or overflow | Placement, density, responsive overflow, permission state |
| Settings contribution | Personal, organization, or project settings scope | Scope, navigation, save/error behavior, authorization |
| Command | Command palette and declared contextual menu | Discovery, shortcut policy, inputs, results, plugin identity |
| Custom dialog | Host-owned dialog containing a sandboxed surface | Focus, close behavior, size limits, theme, error isolation |

Plugins cannot add another global sidebar, replace the application shell, or create a competing settings system. Contribution IDs and manifest declarations—not filenames or component names—control placement.

## Required states and interaction standards

Every page or substantial surface defines:

- Initial empty state with one clear next action.
- Loading state.
- Permission-denied or unavailable state.
- Recoverable error with retry.
- Stale or revision-conflict state for editable data.
- Archived, disabled, or dormant state where relevant.
- Plugin-local failure state.
- Narrow-screen behavior.
- Keyboard entry, visible focus, and predictable return focus.

All primary operations work without drag and drop. URLs identify organization, project, view, and selected task where appropriate. Safe-start mode uses the same core pages while omitting optional plugin contributions.

## Initial page inventory

### Public and account entry

- First installation setup.
- Sign in.
- Sign up/create account when allowed.
- Account recovery.
- Invitation acceptance.
- Light onboarding.

### Authenticated core

- Home.
- Projects explorer.
- Project page with Board and List.
- Route-backed task detail.
- Members.
- Search results when an overlay is insufficient.
- Notification history.
- Settings with personal, organization, project, and installation scopes.

### Official and third-party extensions

- Official Calendar plugin page.
- Organization plugin pages represented by approved rail icons.
- Project plugin pages represented in the project view rail.
- Plugin settings embedded in the appropriate Settings scope.

## Explicitly deferred

- Nested project folders.
- Folder-based permissions, workflows, or plugin inheritance.
- Customizable Home/dashboard widgets.
- Core reporting, roadmaps, Gantt, CRM, billing, or automation pages.
- Marketplace storefront and checkout.
- Guest/client portals.
- User-created arbitrary global navigation groups.
- A universal page builder.
- A separate mobile information architecture.

These may be introduced later or through plugins without changing the stable shell, project page, task-detail surface, or settings scopes.

## Decisions captured

- Desktop uses a narrow global icon rail and a flexible main-content region.
- Projects owns project discovery and organization instead of a permanent project sidebar.
- Organizations contain projects and optional one-level folders.
- Authentication uses a split form/presentation layout on wide screens.
- Onboarding is path-aware and ends at useful project work quickly.
- Board, List, and plugin project views share one project page and header.
- Task detail is a route-backed side panel on desktop and a page on narrow screens.
- Calendar is a first-class experience delivered by an official bundled plugin.
- Members is a core organization page.
- Settings is one scoped system, and package upload remains an installation-operator responsibility.
- Plugins extend host-owned navigation and surfaces but do not create parallel shells.

## Validation questions for later iterations

The first usability review should verify:

- Whether the icon-only rail remains understandable with tooltips and keyboard focus.
- Whether Quick access and pinned projects make reopening work fast enough.
- Whether folders and the project table remain clear for realistic project sets.
- Whether the two-row project header remains calm after several plugin views are enabled.
- Whether the route-backed task panel preserves enough Board/List context at common laptop widths.
- Whether package installation versus organization enablement is understandable to self-hosted administrators.

# Launch++ product scope

Status: product and architectural baseline for the minimal release. No application behavior has been implemented.

## Product statement

Launch++ is a modern, minimalist, open-source project management tool that grows with the user.

> Adapt it to your work, not the other way around.

A solo founder, developer, freelancer, or small team can begin locally with almost no operational work. When the team grows, the same organization can move to a VPS. Plugins add workflow-specific capabilities; themes change appearance; the core remains understandable.

## Target users

### Primary users

- A solo founder tracking product and business work.
- A freelancer or consultant managing a small set of projects.
- A small product or engineering team that wants a focused board and task system.
- A self-hoster who values data ownership and low operational complexity.
- A plugin developer building workflow extensions for individuals or teams.

### Later users

- Agencies needing client-specific workflow plugins.
- Larger teams needing centralized identity, audit, and stronger deployment topology.
- Marketplace publishers selling supported plugins or themes.
- Hosted Launch++ customers who prefer a managed service.

The first release does not optimize for complex enterprise portfolio management, hundreds of built-in features, or highly customized no-code database applications.

## Product principles

1. **Minimal by default.** A new organization has only broadly useful concepts.
2. **Extensible by design.** Workflow-specific features belong in plugins whenever the public API can support them safely.
3. **Fast and calm.** Common actions are immediate, keyboard-friendly, predictable, and visually quiet.
4. **User-owned.** Organizations can be backed up, exported, restored, and moved without a proprietary hosted dependency.
5. **Easy to operate.** Local and VPS installations share one architecture and do not require a database server, queue, or cache service in v1.
6. **Safe customization.** Plugins and themes use stable public contracts instead of application internals.
7. **Progressive complexity.** Advanced settings appear only when a user installs or enables the capability that needs them.

## Minimal core

The following capabilities belong in the core because nearly every useful project workflow needs them or because they establish security and data ownership.

| Area | Core capability | v1 boundary |
| --- | --- | --- |
| Identity | Account, session, profile | Email/password first; provider login can follow |
| Organizations | Create, rename, switch, export | A user may belong to multiple organizations |
| Membership | Invite, remove, change role | Owner, admin, member; guest is deferred |
| Projects | Create, archive, restore, delete | Organization-owned; project access policy is explicit |
| Tasks | Create, edit, move, archive, restore | Title, description, status, due date, ordering |
| Subtasks | Parent/child task relation | One parent in v1; bounded nesting policy |
| Statuses | Project workflow columns | Ordered, renameable, color/icon metadata |
| Assignees | Assign organization members | Multiple assignees supported |
| Labels | Organization/project labels | Multiple labels per task |
| Comments | Task discussion | Plain text or constrained Markdown; editing is audited |
| Activity | Human-readable history | Domain-generated, append-oriented entries |
| Views | Board and list | Both are projections over the same task model |
| Search | Tasks and projects | SQLite FTS; permission-filtered |
| Permissions | Organization and project policy | Centralized policy service, deny by default |
| Extensions | Install, enable, disable plugins/themes | Data is retained on disable |
| Portability | Backup, organization export/import | Secrets excluded from portable exports |

### Intentionally simple choices

- Task descriptions begin with constrained Markdown or a plain structured-text editor, not a collaborative document engine.
- Board and list are built-in views of the same query rather than separate data models.
- Statuses are project-scoped; an organization template system is deferred.
- Activity is not event sourcing. Current state remains in ordinary relational tables.
- Notifications start in-app and event-driven. Email delivery requires configured mail and can follow the same notification service.
- File attachments are not required for the first vertical slice. When added, they use the storage abstraction described in the architecture.
- Offline editing and conflict-free collaborative text are not v1 requirements.

## Plugin candidates

These are deliberately outside the minimal core unless a platform primitive is needed to make them possible:

- Sprints and sprint planning
- Story points and estimation
- Time tracking and timesheets
- GitHub, GitLab, and other external integrations
- AI planning or summarization
- Workflow automation
- Advanced calendars and Gantt charts
- Roadmaps and release tracking
- Dashboards, analytics, and custom reports
- CRM, invoicing, approvals, and client portals
- OKRs and portfolio planning
- Pomodoro and personal productivity tools
- Deployment tracking
- Specialized domain entities

Official examples should use the same public plugin contracts as third-party extensions. Story Points, Checklist Importer, Time Tracking, and Due-date Calendar are the initial reference plugins because together they exercise declarative fields, commands, storage, background work, and custom browser views. At least one compatibility fixture uses vanilla HTML/CSS/JavaScript to prove the host contract is not coupled to React.

## Roles and authorization expectations

### Installation operator

Controls the server installation, executable plugin packages, storage location, backups, updates, and instance-wide policy. On a local solo installation, this is the same person as the organization owner.

### Organization owner

Controls organization deletion, ownership transfer, membership, roles, installed package enablement, exports, and organization defaults.

### Organization admin

Manages projects, members within policy, organization settings, and approved plugins. Cannot silently assume installation-operator powers on a hosted or shared server.

### Member

Works in allowed projects and uses enabled extensions within granted permissions.

Project-level restricted membership and a guest role are deferred until the basic policy model is proven. The authorization service should nevertheless use resource-based checks so those policies can be added without rewriting every endpoint.

## Primary user journeys

### First local run

1. Start Launch++ through the supported local package or container.
2. Open the provided local URL.
3. Complete the light first-owner path: create the owner account, name the organization, and name the first project.
4. Launch++ supplies a minimal default status workflow.
5. Enter the project Board and add tasks without completing a product questionnaire.

### Daily project work

1. Open the last active organization and project.
2. Filter or search tasks.
3. Create or edit a task inline where practical.
4. Move it between statuses through keyboard controls or drag and drop.
5. See the same result in board and list views immediately.

### Enable a plugin

1. An operator uploads or approves a `.launch-plugin` archive.
2. An organization administrator reviews contributions, permissions, provenance, and compatibility.
3. The administrator enables it for the organization and selected projects.
4. Members see native contributions and custom views according to their permissions.
5. Disabling the plugin removes behavior and UI while preserving exportable data.

### Move from laptop to VPS

1. Export or back up the local organization.
2. Install the same Launch++ release on the VPS.
3. Import the organization and required package archives.
4. Review plugin provenance and reconnect secrets.
5. Configure the public URL and mail, then invite members.

## UX architecture

The complete page and navigation model is defined in [UI information architecture](./ui-information-architecture.md).

The desktop product shell has two stable columns plus contextual surfaces:

- **Global icon rail:** Home, Projects, product areas, approved extension pages, settings, and user menu.
- **Main content:** Home, the Projects explorer, selected project view, Members, Settings, or a plugin page.
- **Contextual surfaces:** task details, dialogs, menus, panels, and notifications.

Plugins target named slots within these regions. They never depend on internal React component paths. Small contributions remain host-rendered; full pages or substantial panels may use sandboxed browser UI authored with the supported React/TypeScript or vanilla path.

### Interaction standards

- Every primary operation must work without drag and drop.
- Destructive actions require clear scope and proportional confirmation.
- Optimistic UI is used only when rollback behavior is understandable.
- Empty, loading, error, unavailable-plugin, and permission-denied states are designed surfaces.
- URLs identify organization, project, view, and selected task where appropriate.
- Keyboard focus remains visible and returns predictably after dialogs and menus.
- Mobile layouts support essential viewing and task editing; dense board management may remain better on larger screens.

## Functional boundaries

### Core owns invariants

Core services own task membership, project lifecycle, valid status transitions, comment authorship, permissions, activity creation, and deletion/retention behavior. A plugin can request a mutation through a public capability but cannot bypass those invariants.

### Plugins own optional workflow data

Plugins own their settings, typed collections, custom field definitions and values, jobs, and public plugin capabilities. Launch++ owns storage mechanics, authorization enforcement, export, lifecycle, and isolation.

### Themes own supported appearance tokens

Themes select semantic visual values. They do not change layout, data, permissions, component structure, or behavior.

## Non-functional product targets

These are release gates to measure on documented reference hardware, not promises inferred from the current empty repository:

| Quality | Initial target |
| --- | --- |
| First local use | From supported install command to usable organization in under five minutes |
| Common API reads | p95 server time below 200 ms on the reference local/VPS dataset |
| Core mutations | p95 server time below 300 ms, excluding client network latency |
| UI feedback | Visible acknowledgement within 100 ms for direct interactions |
| Availability | A failing optional plugin cannot take down core project work |
| Recovery | Restore instructions and a verified backup before stable release |
| Accessibility | Keyboard completion of primary journeys and automated/manual accessibility checks |
| Portability | Export/import round trip preserves IDs, core data, plugin data, and version metadata |
| Operability | No required Redis, message broker, or external database for supported v1 deployments |

Dataset sizes, hardware profiles, concurrency, and test methods must accompany performance claims. If SQLite or the single-process topology misses measured needs, evolve the adapter rather than weakening data integrity.

## Explicit non-goals for v1

- Microservices
- Multi-region active-active deployment
- Real-time collaborative rich-text editing
- Arbitrary plugin database access or Node.js access
- A generic no-code entity builder
- Built-in Gantt, CRM, billing, AI, or reporting suites
- Exact Jira/Asana/ClickUp feature parity
- Kubernetes as the default installation path
- Redis as a mandatory dependency
- Public marketplace billing before the SDK is stable
- Official Bun runtime support
- Native mobile or desktop applications
- Multiple database engines at first release

## Product success tests

- A new user creates an organization, project, and first task without reading documentation.
- Board and list stay consistent because they are backed by the same task service.
- A user can ignore plugins and still have a complete minimal task manager.
- An external browser developer creates, previews, packages, and installs a React or vanilla plugin without importing application internals.
- A theme author produces a safe theme by editing one JSON file.
- An organization can move from a laptop to a fresh VPS without losing core or plugin data.
- An administrator can identify what a plugin adds, what it can access, who published it, and why it failed.
- Removing an optional extension never makes core task data unreadable.

# Organization-first entry and registration

Launch++ should stop presenting identity as a generic global **Sign up / Sign in** choice. The public journey begins with an organization slug. An existing slug leads to that organization's sign-in experience; a missing slug offers an explicit, typo-safe path to create a new organization and its first owner.

This is a pre–Phase 2 product gate. It changes the entry experience and identity orchestration without pulling the full collaboration system, mail delivery, or member administration forward.

**Create an organization** and **join an organization** are different operations. Public registration may create a new organization and its owner. It must never add a person to an existing organization; that always requires an invitation. Account recovery remains a separate path and never creates a replacement owner.

## Outcome

A visitor can:

1. Enter an organization slug such as `acme`.
2. Sign in to `Acme Inc.` when the slug exists.
3. Correct a likely typo or deliberately create a new organization when the slug does not exist.
4. Create the organization, its first owner account, and its initial working context in one guided journey.
5. Recover access to an existing organization without creating another account or organization.

An authenticated user can still create an additional organization through the application. That operation reuses the existing user identity rather than creating another account.

## Product model

| Situation | User intent | Launch++ action | Result |
| --- | --- | --- | --- |
| Existing organization | Return to work | Resolve slug, show organization identity, authenticate | Enter the last usable project or organization Home |
| Unknown organization | Correct a typo | Preserve the entered slug and offer a return to the locator | No data is created |
| New organization | Start a new company space | Confirm creation, collect organization and owner details | Organization, owner membership, profile, session, and first project are created |
| Invited person | Join an existing organization | Open an invitation-specific route | Reserved in this slice; completed with collaboration invitations |
| Lost account | Recover access | Use organization-scoped recovery | Existing identity is recovered; ownership is not duplicated |
| Existing signed-in user | Create another organization | Use the authenticated create-organization command | Existing identity becomes owner of the new organization |

```text
Open Launch++
  -> Enter organization slug
     -> Existing: organization sign-in -> membership check -> application
     -> Missing: not-found confirmation -> create organization -> owner form -> initial Board
```

## Decisions

### Identity and membership

- A Better Auth user remains installation-wide identity.
- Organization access remains an explicit `organization_members` relationship.
- Creating an organization creates an owner membership; it does not create an organization-scoped duplicate user.
- A signed-in identity may own or join more than one organization.
- The final-owner protection remains authoritative. Recovery restores an identity; it does not bypass ownership invariants.

### Names and slugs

- `organizations.id` remains the immutable identifier used by APIs and foreign keys.
- `organizations.slug` is the public routing identifier and is unique, normalized, lowercase, and stable unless a future explicit slug-change feature is designed.
- `organizations.name` is presentation text. Duplicate display names are allowed; it must no longer be treated as identity.
- The creation form suggests a slug from the display name, but the user can edit it before submission.
- Slugs use ASCII lowercase letters, digits, and internal hyphens; length is 3–48 characters.
- Reserved slugs include application and infrastructure routes such as `api`, `app`, `auth`, `setup`, `admin`, `plugins`, `settings`, `www`, and `support`.

### URL strategy

The MVP uses path-based organization URLs:

```text
/                         organization locator for anonymous visitors
/organizations/new        create organization and owner
/o/:organizationSlug      organization entry resolver
/o/:organizationSlug/sign-in
/o/:organizationSlug/recover
/o/:organizationSlug/invitations/:token   reserved for the collaboration phase
/app/...                   existing authenticated application routes during migration
```

The resolver must be isolated behind a URL-construction boundary so a hosted deployment can later map `acme.launchpp.app` to the same organization context. Subdomains, wildcard DNS, certificates, cookie-domain changes, and local-development hostnames are not part of this slice.

### Installation setup

`/setup` remains the secure operator bootstrap for a fresh self-hosted installation. It initializes the installation and its operator identity. Once the installation is initialized, ordinary visitors use the organization-first journey.

Public organization creation is controlled by one server configuration policy:

- `open` — anonymous visitors may create an organization and its first owner.
- `authenticated` — only signed-in users may create an additional organization.
- `disabled` — organization creation is operator-controlled.

The hosted product uses `open`. Existing self-hosted installations default to `authenticated` to avoid silently opening registration after an upgrade. The locator explains the configured policy instead of displaying a dead action.

### First working context

Successful public creation provisions the smallest usable context in one server command:

- owner identity and session;
- user profile;
- organization and owner membership;
- one default project with the current default statuses;
- current organization selection; and
- audit and outbox facts.

The response returns the created organization and project destination so the browser can enter the Board directly. A partial result must never be shown as success.

## UX states

### Organization locator

The first anonymous screen uses the existing authentication split layout and shared `@launchpp/ui` controls.

```text
Launch++

Open your organization
Enter the organization URL used by your team.

Organization
[ acme                         ] .launchpp.app

[ Continue ]

Create a new organization
```

Behavior:

- Normalize case and surrounding whitespace while the user types.
- Do not query on focus or on every keystroke. Resolve only on submit.
- Preserve the attempted slug when navigating to the not-found state.
- A signed-in user opening `/` goes to the selected organization rather than the locator.

### Existing organization sign-in

The sign-in page shows the resolved organization name and slug. Email and password remain the initial supported credentials. Provider buttons appear only when actually configured.

The page offers:

- `Forgot?` → organization-scoped recovery;
- `Use another organization` → locator; and
- an invitation-only access message, not a generic create-account link.

After authentication, membership is checked before application entry. Valid credentials without membership produce a neutral access-denied state; they do not disclose membership details or create access.

### Organization not found

```text
We couldn't find “acmee”

Check the organization address, or deliberately create a new
organization using this address.

[ Back ]  [ Create “acmee” ]
```

Creation never starts automatically. Reserved, invalid, or unavailable slugs use specific inline validation rather than the generic not-found message.

### Create organization and owner

The page title is **Create your organization**, not **Sign up**. It collects:

- organization name;
- organization slug;
- owner full name;
- work email; and
- password.

Validation uses the existing red input state and inline messages. Submitting disables the form, preserves entered values on recoverable failure, and navigates only after the complete provisioning command succeeds.

## HTTP contract

All errors use the existing problem-details shape and correlation IDs.

| Method | Path | Authentication | Responsibility |
| --- | --- | --- | --- |
| `GET` | `/api/v1/public/organizations/:slug` | Public, rate-limited | Resolve a slug to minimal public identity `{ exists, name, slug }` |
| `POST` | `/api/v1/public/organization-registrations` | Public when policy is `open` | Create owner identity, organization, membership, profile, default project, and session |
| `POST` | `/api/auth/sign-in/email` | Public mutation with origin protection | Authenticate credentials; organization membership is checked by the contextual entry flow |
| `GET` | `/api/v1/organizations` | Session | List organizations available to the current identity |
| `POST` | `/api/v1/organizations` | Session | Create another organization for the current identity |
| `GET` | `/api/auth/recovery-capabilities` | Public | Describe configured recovery methods without changing ownership |

The public registration request contains:

```json
{
  "organizationName": "Acme Inc.",
  "organizationSlug": "acme",
  "ownerName": "Maya Okafor",
  "email": "maya@acme.example",
  "password": "<secret>"
}
```

The success response contains only safe navigation data:

```json
{
  "organization": { "id": "...", "name": "Acme Inc.", "slug": "acme" },
  "project": { "id": "...", "slug": "welcome" },
  "destination": "/app/organizations/.../projects/.../board"
}
```

Expected conflict/error codes:

| Code | Meaning | UI response |
| --- | --- | --- |
| `organization_slug_unavailable` | Slug was claimed or reserved | Keep form values and focus the slug field |
| `account_already_exists` | Email belongs to an existing identity | Offer sign-in; never reveal this from the locator lookup |
| `organization_registration_disabled` | Installation policy rejects public creation | Explain the policy and offer sign-in |
| `organization_access_denied` | Signed-in identity lacks active membership | Show access request guidance without creating membership |
| `registration_in_progress` | Same idempotency key is still running | Keep the pending state and allow safe retry |
| `registration_failed` | Provisioning did not complete | Show the correlation ID and preserve the form |

## Provisioning and consistency

The current setup path creates a Better Auth account before writing the Launch++ domain state. The new public command must make that orchestration explicit rather than copying it into a route handler.

Introduce an application-level `RegisterOrganizationOwnerService` with an identity-port dependency and one idempotent command boundary. The service:

1. validates and reserves the requested slug;
2. creates the owner identity through the auth adapter;
3. writes profile, organization, membership, default project, audit, outbox, and current selection in one Launch++ database transaction;
4. creates the session only after domain provisioning succeeds; and
5. removes or invalidates a newly-created provisional identity if domain provisioning fails.

No password, raw session token, or invitation token is stored in Launch++ domain tables. The same idempotency key must return the completed result or a retryable state without creating a second organization, owner, or project.

Do not call the public Better Auth sign-up endpoint directly from the browser. It would create an installation identity without guaranteeing an organization membership. Keep generic `/api/auth/sign-up/*` blocked; only the bounded organization-registration service may provision the first owner.

## Data changes

The existing `organizations.slug` and installation-scoped unique slug index are retained.

Required migration:

- drop `organizations_installation_name_unique` so display names may repeat;
- retain the nonblank name check;
- retain `organizations_installation_slug_unique`;
- add repository support for exact normalized slug creation rather than always generating the next suffix; and
- reject reserved slugs in the domain policy before persistence.

No invitation table is added in this slice. The existing architecture definition for `organization_invitations` remains the collaboration-phase contract.

## Security and privacy

- Apply strict configured-origin checks to registration and authentication mutations.
- Rate-limit slug resolution separately from registration attempts.
- Return only organization name and normalized slug from public resolution; never return owners, members, emails, IDs, projects, or activity.
- Use the same response timing and message for invalid credentials and credentials without usable membership where practical.
- Never accept an organization ID or role from the public registration request.
- Always create exactly one `owner` membership for the newly created organization.
- Audit successful creation and policy denial; do not place passwords or tokens in audit metadata.
- Reserve infrastructure and misleading slugs before checking persistence.
- Preserve CSRF and secure-cookie behavior for the configured base URL.
- Defer CAPTCHA and abuse scoring until hosted traffic demonstrates the need, but keep the public command behind a replaceable rate-limit policy.

## Compatibility and migration

- Existing organization IDs, slugs, sessions, memberships, and application URLs remain valid.
- `/sign-in` accepts an optional `organization` query during transition and redirects to `/o/:slug/sign-in` once resolved.
- Bookmarked `/sign-in` without context leads to the organization locator rather than a global credentials form.
- `/organization-setup` remains temporarily available to authenticated identities with no memberships, then redirects into the new creation journey.
- `/setup` is unchanged for uninitialized installations.
- The API client gains a `directory`/`registration` public surface; existing authenticated organization methods remain intact.

## Delivery phases and tasks

Each task is one implementation checkpoint and one commit. Stop after every task so the user can test and approve it.

### Phase A - Organization identity foundation

- [x] **Define the slug policy.** Add normalization, validation, reserved slugs, editable suggestions, and stable slug rules.
- [x] **Correct organization-name persistence.** Allow duplicate display names, retain unique slugs, support exact requested slugs, and add a reversible migration.
- [x] **Publish the public organization resolver.** Add the rate-limited public lookup contract, OpenAPI schema, and API-client method without exposing private organization data.

Completion condition: duplicate names work, duplicate or reserved slugs do not, and slug lookup exposes only public organization identity.

### Phase B - Organization and owner creation

- [x] **Add bounded registration orchestration.** Create the identity, profile, organization, owner membership, current selection, default project, audit, outbox, and session through an idempotent application service with rollback for partial failure.
- [x] **Publish the registration endpoint.** Add the policy-controlled public command, strict origin checks, rate limits, typed conflicts, and safe navigation response.
- [x] **Build the organization locator.** Resolve a submitted slug using the shared authentication shell and send authenticated users to their current organization.
- [x] **Build the typo-safe not-found state.** Preserve the attempted slug and require explicit confirmation before creation.
- [ ] **Build create organization and owner.** Collect organization and owner details, use field-level validation, prevent duplicate submission, and enter the initial Board after success.

Completion condition: an allowed visitor can deliberately create a complete owner organization and land on a usable Board without partial data.

### Phase C - Contextual authentication and cutover

- [ ] **Make sign-in organization-scoped.** Show organization identity, remove generic signup, verify membership after authentication, and return members to their organization.
- [ ] **Make recovery organization-scoped.** Preserve organization context and restore the existing identity without changing ownership.
- [ ] **Add compatibility routing.** Preserve setup, sessions, existing application URLs, and temporary legacy entry routes while moving anonymous entry to the locator.
- [ ] **Synchronize documentation and operations.** Update UI architecture, data/API architecture, environment configuration, privacy limits, and signup terminology.

Completion condition: organization identity is the anonymous entry context and the generic account-registration dead end no longer exists.

### Phase D - Manual qualification and approval

- [ ] **Qualify organization discovery.** Verify known, unknown, invalid, reserved, duplicate-name, and duplicate-slug behavior.
- [ ] **Qualify owner creation.** Verify policy enforcement, exactly-once provisioning, default Board entry, session persistence, retry safety, and failure rollback.
- [ ] **Qualify authentication boundaries.** Verify membership denial, additional organization creation, contextual recovery, fresh installation setup, existing sessions, and compatibility routes.

Completion condition: the user manually approves the complete journey. Only then can the plugin author preview begin.

## Primary files and ownership

| Area | Expected files | Change |
| --- | --- | --- |
| Domain | `packages/core/src/organizations/*` | Slug value policy and registration orchestration |
| Persistence | `packages/database/src/schema.ts`, migration files, organization/project repositories | Drop name uniqueness, reserve exact slug, provision initial context |
| Identity adapter | `packages/auth-adapter/src/*` | Bounded provisional identity create/cleanup and session issuance |
| Contracts | `packages/api-contracts/src/schemas.ts` | Public resolver and registration schemas |
| Server | `apps/server/src/organization-routes.ts`, setup/auth route composition, config | Public routes, policy, rate limits, origin checks |
| Client | `packages/api-client/src/*` | Typed public directory and registration methods |
| Web routing | `apps/web/src/app.tsx` | Locator, slug routes, compatibility redirects |
| Auth pages | `apps/web/src/auth-pages.tsx`, `apps/web/src/app.css` | Organization-aware locator, creation, sign-in, and recovery composition |
| Documentation | `docs/ui-information-architecture.md`, `docs/data-and-api-architecture.md`, `docs/implementation-roadmap.md`, `design.md` if visual rules change | Keep terminology and implementation order synchronized |

## Manual qualification

The user performs application testing. The implementation handoff for the final slice should ask them to verify:

- a known slug opens the correct organization sign-in page;
- an unknown slug never creates data until **Create organization** is explicitly chosen;
- invalid and reserved slugs show inline field errors;
- duplicate display names are allowed while duplicate slugs are rejected;
- a new organization creates one owner, one initial project, and lands on its Board;
- refreshing after creation preserves the authenticated session and organization context;
- an existing email is guided to sign-in without creating duplicate identity or organization data;
- a valid account without membership cannot enter another organization;
- a signed-in user can create an additional organization without creating another account;
- recovery returns to the same organization context;
- `/setup` still works on a fresh installation;
- `authenticated` and `disabled` creation policies hide or reject public creation correctly; and
- existing bookmarked application routes and existing sessions continue to work.

Lightweight type checking, contract generation, and migration validation remain appropriate implementation checks, but no new automated UI test suite is part of this work.

## Deferred collaboration work

The following remain in the collaboration phase:

- invitation issuance, resend, revoke, expiry, and email delivery;
- invitation acceptance for new and existing identities;
- owner/admin/member management UI;
- suspension, removal, and ownership transfer;
- member session invalidation after role or membership changes; and
- hosted anti-abuse controls beyond rate limiting.

The reserved invitation route must not render a fake acceptance form before those server capabilities exist. Until then, existing-organization sign-in says that new members need an administrator invitation.

## Completion gate

This gate is complete when organization identity is the public entry point, public creation yields a fully usable owner organization, existing-organization access remains invitation-only, recovery cannot duplicate ownership, and the old generic signup dead end is gone. Phase 2 should not begin until the user has manually approved this journey.

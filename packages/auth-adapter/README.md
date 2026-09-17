# Launch++ identity adapter

This package contains the Better Auth integration and implements the framework-neutral `IdentityProvider` port from `@launchpp/core`. It translates a valid library session into stable Launch++ identity facts; it does not decide workspace roles, project access, or plugin permissions.

## Boundaries

- Better Auth owns password hashing, opaque session tokens, session expiry/revocation, and authentication endpoints under `/api/auth/*`.
- `registerBetterAuthRoutes` adapts Fetch API requests/responses to Fastify without exposing Better Auth types to application services.
- `IdentityProvider.resolveSession` returns a Launch++ `IdentitySession` or `null`.
- `@launchpp/authorization` maps that result to an actor and performs product policy elsewhere. The actor carries no implicit role or permissions.
- Cookie caching is disabled for now so revocation is immediately authoritative from SQLite.
- Cookies are HTTP-only and SameSite=Lax; HTTPS deployments force Secure cookies.
- Trusted origins are restricted to the configured canonical Launch++ origin.

## Schema ownership

Better Auth's required user, session, account, and verification tables are represented in `packages/database/src/schema.ts` and committed as the reviewed `0001_identity.sql` Drizzle migration. Runtime startup applies that migration before constructing this adapter. Better Auth's interactive/runtime migration path is not used in production.

The identity proof tests use the real reviewed database migration, Fastify route adapter, password hashing, secure cookie attributes, session lookup, token tamper rejection, immediate sign-out revocation, and untrusted-origin rejection.

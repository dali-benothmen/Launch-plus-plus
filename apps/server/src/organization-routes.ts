import { createHmac, randomUUID } from "node:crypto";
import {
  IdempotencyHeadersSchema,
  OrganizationRegistrationHeadersSchema,
} from "@launchpp/api-contracts";
import type {
  CreateOrganizationInput,
  CursorPageQuery,
  OrganizationRegistrationHeaders,
  OrganizationRegistrationInput,
  RenameOrganizationInput,
  SelectOrganizationInput,
} from "@launchpp/api-contracts";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import {
  actorFromIdentitySession,
  canAccessOrganization,
  canCreateOrganization,
} from "@launchpp/authorization";
import {
  CreateOrganizationService,
  IdentityAccountAlreadyExistsError,
  IdentityProvisioningError,
  normalizeOrganizationSlug,
  RegisterOrganizationOwnerService,
  RenameOrganizationService,
  SelectCurrentOrganizationService,
  type Organization,
  OrganizationNotFoundError,
  OrganizationQueryService,
  OrganizationRegistrationDisabledError,
  OrganizationRegistrationInProgressError,
  OrganizationRegistrationKeyConflictError,
  OrganizationSlugAlreadyExistsError,
  OrganizationSlugInvalidError,
  OrganizationSlugReservedError,
} from "@launchpp/core";
import {
  type SqliteDatabase,
  SqliteAuditWriter,
  SqliteInstallationRepository,
  SqliteIdempotencyRepository,
  SqliteOrganizationMembershipRepository,
  SqliteOrganizationRegistrationRepository,
  SqliteOrganizationRepository,
  SqliteOutboxRepository,
  SqliteProjectRepository,
  SqliteUserProfileRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

import type { ServerConfig } from "./config.js";
import { cursorPage, executeIdempotent } from "./http-contract.js";
import { sendProblem } from "./problem-details.js";

const problemResponses = {
  400: { $ref: "LaunchppProblemDetailsV1#" },
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
  404: { $ref: "LaunchppProblemDetailsV1#" },
  409: { $ref: "LaunchppProblemDetailsV1#" },
  429: { $ref: "LaunchppProblemDetailsV1#" },
  500: { $ref: "LaunchppProblemDetailsV1#" },
  503: { $ref: "LaunchppProblemDetailsV1#" },
} as const;

function webHeaders(headers: FastifyRequest["headers"]): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) result.set(name, String(value));
  }
  return result;
}

function organizationSummary(organization: Organization) {
  return {
    id: organization.id,
    name: organization.name,
    revision: organization.revision,
    slug: organization.slug,
  };
}

export async function registerOrganizationRoutes(
  app: FastifyInstance,
  input: Readonly<{
    config: ServerConfig;
    database: SqliteDatabase;
    identity: BetterAuthIdentityAdapter;
  }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const installations = new SqliteInstallationRepository();
  const idempotency = new SqliteIdempotencyRepository(input.database);
  const memberships = new SqliteOrganizationMembershipRepository();
  const outbox = new SqliteOutboxRepository();
  const profiles = new SqliteUserProfileRepository();
  const projects = new SqliteProjectRepository();
  const registrations = new SqliteOrganizationRegistrationRepository(input.database);
  const organizations = new SqliteOrganizationRepository();
  const shared = {
    audit,
    clock: Date.now,
    generateId: randomUUID,
    memberships,
    outbox,
    profiles,
    transactions: input.database,
    organizations,
  };
  const createOrganization = new CreateOrganizationService(shared);
  const registerOrganizationOwner = new RegisterOrganizationOwnerService({
    ...shared,
    identity: input.identity,
    policy: input.config.organizationRegistrationPolicy,
    projects,
    registrations,
  });
  const renameOrganization = new RenameOrganizationService(shared);
  const selectOrganization = new SelectCurrentOrganizationService({
    clock: Date.now,
    memberships,
    profiles,
    transactions: input.database,
  });
  const queryOrganizations = new OrganizationQueryService({
    profiles,
    transactions: input.database,
    organizations,
  });

  const sessionFor = (request: FastifyRequest) =>
    input.identity.resolveSession(webHeaders(request.headers));
  const installation = () => input.database.read((context) => installations.findFirst(context));

  app.get<{ Params: { readonly slug: string } }>(
    "/api/v1/public/organizations/:slug",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        operationId: "resolvePublicOrganization",
        params: { $ref: "LaunchppPublicOrganizationParamsV1#" },
        response: {
          200: { $ref: "LaunchppPublicOrganizationResolutionV1#" },
          ...problemResponses,
        },
        summary: "Resolve a public organization slug",
        tags: ["Organizations"],
      },
    },
    async (request, reply) => {
      let slug: string;
      try {
        slug = normalizeOrganizationSlug(request.params.slug);
      } catch (error) {
        if (error instanceof OrganizationSlugReservedError) {
          return sendProblem(
            reply,
            request,
            400,
            "organization_slug_reserved",
            "Reserved organization slug",
            error.message,
          );
        }
        if (error instanceof OrganizationSlugInvalidError) {
          return sendProblem(
            reply,
            request,
            400,
            "organization_slug_invalid",
            "Invalid organization slug",
            error.message,
          );
        }
        throw error;
      }

      const currentInstallation = installation();
      if (!currentInstallation) {
        return sendProblem(
          reply,
          request,
          503,
          "setup_required",
          "Setup required",
          "Setup is incomplete.",
        );
      }
      const organization = input.database.read((context) =>
        organizations.findBySlug(context, currentInstallation.id, slug),
      );
      if (
        !organization ||
        organization.archivedAt !== undefined ||
        organization.deletedAt !== undefined
      ) {
        return { exists: false, slug };
      }
      return { exists: true, name: organization.name, slug: organization.slug };
    },
  );

  app.post<{
    Body: OrganizationRegistrationInput;
    Headers: OrganizationRegistrationHeaders;
  }>(
    "/api/v1/public/organization-registrations",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: { $ref: "LaunchppOrganizationRegistrationInputV1#" },
        headers: OrganizationRegistrationHeadersSchema,
        operationId: "registerOrganizationOwner",
        response: {
          201: { $ref: "LaunchppOrganizationRegistrationResultV1#" },
          ...problemResponses,
        },
        summary: "Create an organization and its first owner",
        tags: ["Organizations"],
      },
    },
    async (request, reply) => {
      const currentInstallation = installation();
      if (!currentInstallation) {
        return sendProblem(
          reply,
          request,
          503,
          "setup_required",
          "Setup required",
          "Setup is incomplete.",
        );
      }

      const key = request.headers["idempotency-key"];
      if (typeof key !== "string") {
        return sendProblem(
          reply,
          request,
          400,
          "invalid_idempotency_key",
          "Invalid idempotency key",
          "Idempotency-Key must contain between 8 and 200 characters.",
        );
      }
      const requestHash = createHmac("sha256", input.config.authSecret)
        .update(
          JSON.stringify([
            request.body.organizationName,
            request.body.organizationSlug,
            request.body.ownerName,
            request.body.email,
            request.body.password,
          ]),
        )
        .digest("hex");

      try {
        const result = await registerOrganizationOwner.execute({
          correlationId: request.id,
          email: request.body.email,
          installationId: currentInstallation.id,
          key,
          organizationName: request.body.organizationName,
          organizationSlug: request.body.organizationSlug,
          ownerName: request.body.ownerName,
          password: request.body.password,
          requestHash,
        });
        const destination =
          `/app/organizations/${encodeURIComponent(result.organization.id)}` +
          `/projects/${encodeURIComponent(result.project.id)}/board`;
        reply.header("set-cookie", result.setCookieHeaders);
        return reply.status(201).send({
          destination,
          organization: result.organization,
          project: result.project,
        });
      } catch (error) {
        if (
          error instanceof OrganizationSlugAlreadyExistsError ||
          error instanceof OrganizationSlugReservedError
        ) {
          return sendProblem(
            reply,
            request,
            409,
            "organization_slug_unavailable",
            "Organization address unavailable",
            "Choose a different organization address.",
          );
        }
        if (error instanceof OrganizationSlugInvalidError) {
          return sendProblem(
            reply,
            request,
            400,
            "organization_slug_invalid",
            "Invalid organization address",
            error.message,
          );
        }
        if (error instanceof IdentityAccountAlreadyExistsError) {
          return sendProblem(
            reply,
            request,
            409,
            "account_already_exists",
            "Account already exists",
            "Sign in with this email address or use a different address.",
          );
        }
        if (error instanceof OrganizationRegistrationDisabledError) {
          return sendProblem(
            reply,
            request,
            403,
            "organization_registration_disabled",
            "Organization registration disabled",
            error.message,
          );
        }
        if (error instanceof OrganizationRegistrationInProgressError) {
          reply.header("retry-after", "1");
          return sendProblem(
            reply,
            request,
            409,
            "registration_in_progress",
            "Registration in progress",
            error.message,
          );
        }
        if (error instanceof OrganizationRegistrationKeyConflictError) {
          return sendProblem(
            reply,
            request,
            409,
            "idempotency_key_reused",
            "Idempotency key conflict",
            error.message,
          );
        }
        if (error instanceof TypeError) {
          return sendProblem(
            reply,
            request,
            400,
            "invalid_request",
            "Invalid registration",
            error.message,
          );
        }
        request.log.error({ err: error }, "organization registration failed");
        return sendProblem(
          reply,
          request,
          500,
          "registration_failed",
          "Registration failed",
          error instanceof IdentityProvisioningError
            ? "The account or session could not be provisioned."
            : "Organization registration did not complete.",
        );
      }
    },
  );

  app.get<{ Querystring: CursorPageQuery }>(
    "/api/v1/organizations",
    {
      schema: {
        operationId: "listOrganizations",
        querystring: { $ref: "LaunchppCursorPageQueryV1#" },
        response: { 200: { $ref: "LaunchppOrganizationContextV1#" }, ...problemResponses },
        summary: "List accessible organizations",
        tags: ["Organizations"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to access organizations.",
        );
      }
      const currentInstallation = installation();
      if (!currentInstallation) {
        return sendProblem(
          reply,
          request,
          503,
          "setup_required",
          "Setup required",
          "Setup is incomplete.",
        );
      }

      const result = queryOrganizations.forUser(session.identity.id);
      const page = cursorPage(
        result.organizations,
        { ...request.query, scope: `organizations:${session.identity.id}` },
        (organization) => organization.id,
      );
      return {
        ...(result.currentOrganizationId
          ? { currentOrganizationId: result.currentOrganizationId }
          : {}),
        ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        organizations: page.items.map(organizationSummary),
      };
    },
  );

  app.get<{ Params: { readonly organizationId: string } }>(
    "/api/v1/organizations/:organizationId/members",
    {
      schema: {
        operationId: "listOrganizationMembers",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: {
          200: {
            items: { $ref: "LaunchppOrganizationMemberSummaryV1#" },
            maxItems: 1_000,
            type: "array",
          },
          ...problemResponses,
        },
        summary: "List organization members",
        tags: ["Organizations"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to access organization members.",
        );
      }
      const membership = input.database.read((context) =>
        memberships.find(context, request.params.organizationId, session.identity.id),
      );
      if (!canAccessOrganization(actor, membership, "organization.read")) {
        return sendProblem(
          reply,
          request,
          403,
          "organization_access_denied",
          "Organization access denied",
          "Active membership is required to access organization members.",
        );
      }
      return input.database.read((context) =>
        memberships
          .list(context, request.params.organizationId)
          .filter((member) => member.state === "active")
          .map((member) => ({
            displayName:
              profiles.findByUserId(context, member.userId)?.displayName ?? "Organization member",
            role: member.role,
            userId: member.userId,
          })),
      );
    },
  );

  app.post<{ Body: CreateOrganizationInput }>(
    "/api/v1/organizations",
    {
      schema: {
        body: { $ref: "LaunchppCreateOrganizationInputV1#" },
        headers: IdempotencyHeadersSchema,
        operationId: "createOrganization",
        response: { 201: { $ref: "LaunchppOrganizationSummaryV1#" }, ...problemResponses },
        summary: "Create an organization",
        tags: ["Organizations"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to create an organization.",
        );
      }
      if (!canCreateOrganization(actor)) {
        return sendProblem(
          reply,
          request,
          403,
          "forbidden",
          "Organization creation denied",
          "The current actor cannot create organizations.",
        );
      }
      const currentInstallation = installation();
      if (!currentInstallation) {
        return sendProblem(
          reply,
          request,
          503,
          "setup_required",
          "Setup required",
          "Setup is incomplete.",
        );
      }
      return executeIdempotent(
        request,
        reply,
        idempotency,
        {
          actorUserId: session.identity.id,
          operation: "organization.create",
          payload: request.body,
          scopeKey: `installation:${currentInstallation.id}`,
        },
        async () => {
          const organization = await createOrganization.execute({
            correlationId: request.id,
            displayName: session.identity.name,
            installationId: currentInstallation.id,
            name: request.body.name,
            userId: session.identity.id,
          });
          return { body: organizationSummary(organization), status: 201 };
        },
      );
    },
  );

  app.put<{ Body: SelectOrganizationInput }>(
    "/api/v1/organizations/current",
    {
      schema: {
        body: { $ref: "LaunchppSelectOrganizationInputV1#" },
        operationId: "selectOrganization",
        response: { 204: { type: "null" }, ...problemResponses },
        summary: "Select the current organization",
        tags: ["Organizations"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to select an organization.",
        );
      }
      const membership = input.database.read((context) =>
        memberships.find(context, request.body.organizationId, session.identity.id),
      );
      if (!canAccessOrganization(actor, membership, "organization.select")) {
        return sendProblem(
          reply,
          request,
          403,
          "organization_access_denied",
          "Organization access denied",
          "Active membership is required to select this organization.",
        );
      }
      await selectOrganization.execute({
        userId: session.identity.id,
        organizationId: request.body.organizationId,
      });
      return reply.status(204).send();
    },
  );

  app.patch<{
    Body: RenameOrganizationInput;
    Params: { readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId",
    {
      schema: {
        body: { $ref: "LaunchppRenameOrganizationInputV1#" },
        operationId: "renameOrganization",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: { 200: { $ref: "LaunchppOrganizationSummaryV1#" }, ...problemResponses },
        summary: "Rename an organization",
        tags: ["Organizations"],
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request);
      const actor = actorFromIdentitySession(session);
      if (!session) {
        return sendProblem(
          reply,
          request,
          401,
          "unauthenticated",
          "Authentication required",
          "Sign in to rename an organization.",
        );
      }
      const membership = input.database.read((context) =>
        memberships.find(context, request.params.organizationId, session.identity.id),
      );
      if (!canAccessOrganization(actor, membership, "organization.manage")) {
        return sendProblem(
          reply,
          request,
          403,
          "organization_management_denied",
          "Organization management denied",
          "Organization ownership is required to rename this organization.",
        );
      }

      try {
        const organization = await renameOrganization.execute({
          correlationId: request.id,
          name: request.body.name,
          userId: session.identity.id,
          organizationId: request.params.organizationId,
        });
        return organizationSummary(organization);
      } catch (error) {
        if (error instanceof OrganizationNotFoundError) {
          return sendProblem(
            reply,
            request,
            404,
            "organization_not_found",
            "Organization not found",
            error.message,
          );
        }
        throw error;
      }
    },
  );
}

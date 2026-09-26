import { randomUUID } from "node:crypto";
import { IdempotencyHeadersSchema } from "@launchpp/api-contracts";
import type {
  CreateOrganizationInput,
  CursorPageQuery,
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
  RenameOrganizationService,
  SelectCurrentOrganizationService,
  type Organization,
  OrganizationNotFoundError,
  OrganizationQueryService,
} from "@launchpp/core";
import {
  type SqliteDatabase,
  SqliteAuditWriter,
  SqliteInstallationRepository,
  SqliteIdempotencyRepository,
  SqliteOutboxRepository,
  SqliteUserProfileRepository,
  SqliteOrganizationMembershipRepository,
  SqliteOrganizationRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { cursorPage, executeIdempotent } from "./http-contract.js";
import { sendProblem } from "./problem-details.js";

const problemResponses = {
  400: { $ref: "LaunchppProblemDetailsV1#" },
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
  404: { $ref: "LaunchppProblemDetailsV1#" },
  409: { $ref: "LaunchppProblemDetailsV1#" },
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
  input: Readonly<{ database: SqliteDatabase; identity: BetterAuthIdentityAdapter }>,
): Promise<void> {
  const audit = new SqliteAuditWriter();
  const installations = new SqliteInstallationRepository();
  const idempotency = new SqliteIdempotencyRepository(input.database);
  const memberships = new SqliteOrganizationMembershipRepository();
  const outbox = new SqliteOutboxRepository();
  const profiles = new SqliteUserProfileRepository();
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

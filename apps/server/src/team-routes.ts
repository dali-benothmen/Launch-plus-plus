import { randomUUID } from "node:crypto";
import type { TeamInput } from "@launchpp/api-contracts";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import { actorFromIdentitySession, canAccessOrganization } from "@launchpp/authorization";
import { TeamNameConflictError, TeamService, type Team } from "@launchpp/core";
import {
  type SqliteDatabase,
  SqliteAuditWriter,
  SqliteInstallationRepository,
  SqliteOutboxRepository,
  SqliteTeamRepository,
  SqliteOrganizationMembershipRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendProblem } from "./problem-details.js";

const problemResponses = {
  400: { $ref: "LaunchppProblemDetailsV1#" },
  401: { $ref: "LaunchppProblemDetailsV1#" },
  403: { $ref: "LaunchppProblemDetailsV1#" },
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

function teamSummary(team: Team) {
  return {
    id: team.id,
    name: team.name,
    revision: team.revision,
    organizationId: team.organizationId,
  };
}

export async function registerTeamRoutes(
  app: FastifyInstance,
  input: Readonly<{ database: SqliteDatabase; identity: BetterAuthIdentityAdapter }>,
): Promise<void> {
  const installations = new SqliteInstallationRepository();
  const memberships = new SqliteOrganizationMembershipRepository();
  const service = new TeamService({
    audit: new SqliteAuditWriter(),
    clock: Date.now,
    generateId: randomUUID,
    outbox: new SqliteOutboxRepository(),
    teams: new SqliteTeamRepository(),
    transactions: input.database,
  });

  const authorize = async (
    request: FastifyRequest,
    reply: FastifyReply,
    organizationId: string,
    manage: boolean,
  ) => {
    const session = await input.identity.resolveSession(webHeaders(request.headers));
    const actor = actorFromIdentitySession(session);
    if (!session) {
      sendProblem(
        reply,
        request,
        401,
        "unauthenticated",
        "Authentication required",
        "Sign in to access teams.",
      );
      return undefined;
    }
    const installation = input.database.read((context) => installations.findFirst(context));
    if (!installation) {
      sendProblem(reply, request, 503, "setup_required", "Setup required", "Setup is incomplete.");
      return undefined;
    }
    const membership = input.database.read((context) =>
      memberships.find(context, organizationId, session.identity.id),
    );
    if (
      !canAccessOrganization(
        actor,
        membership,
        manage ? "organization.manage" : "organization.read",
      )
    ) {
      sendProblem(
        reply,
        request,
        403,
        "organization_access_denied",
        "Organization access denied",
        manage
          ? "Organization ownership is required to create teams."
          : "Active organization membership is required.",
      );
      return undefined;
    }
    return { installationId: installation.id, userId: session.identity.id };
  };

  app.get<{ Params: { readonly organizationId: string } }>(
    "/api/v1/organizations/:organizationId/teams",
    {
      schema: {
        operationId: "listTeams",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: {
          200: { items: { $ref: "LaunchppTeamSummaryV1#" }, type: "array" },
          ...problemResponses,
        },
        summary: "List organization teams",
        tags: ["Teams"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, false);
      if (!access) return;
      return service.list(request.params.organizationId).map(teamSummary);
    },
  );

  app.post<{
    Body: TeamInput;
    Params: { readonly organizationId: string };
  }>(
    "/api/v1/organizations/:organizationId/teams",
    {
      schema: {
        body: { $ref: "LaunchppTeamInputV1#" },
        operationId: "createTeam",
        params: { $ref: "LaunchppOrganizationParamsV1#" },
        response: { 201: { $ref: "LaunchppTeamSummaryV1#" }, ...problemResponses },
        summary: "Create an organization team",
        tags: ["Teams"],
      },
    },
    async (request, reply) => {
      const access = await authorize(request, reply, request.params.organizationId, true);
      if (!access) return;
      try {
        const team = await service.create({
          ...access,
          correlationId: request.id,
          name: request.body.name,
          organizationId: request.params.organizationId,
        });
        return reply.status(201).send(teamSummary(team));
      } catch (error) {
        if (error instanceof TeamNameConflictError) {
          return sendProblem(
            reply,
            request,
            409,
            "team_name_conflict",
            "Team name conflict",
            error.message,
          );
        }
        if (error instanceof TypeError) {
          return sendProblem(reply, request, 400, "invalid_team", "Invalid team", error.message);
        }
        throw error;
      }
    },
  );
}

import { randomUUID } from "node:crypto";
import type {
  ArchiveTaskInput,
  CreateLabelInput,
  CreateTaskAttachmentInput,
  CreateTaskCommentInput,
  CreateTaskInput,
  CursorPageQuery,
  DeleteTaskCommentInput,
  MoveTaskInput,
  ReplaceTaskAssigneesInput,
  ReplaceTaskLabelsInput,
  SetTaskCommentReactionInput,
  UpdateTaskCommentInput,
  UpdateTaskInput,
} from "@launchpp/api-contracts";
import { IdempotencyHeadersSchema } from "@launchpp/api-contracts";
import type { BetterAuthIdentityAdapter } from "@launchpp/auth-adapter";
import {
  type Label,
  TaskAccessDeniedError,
  TaskAssigneeInvalidError,
  type TaskComment,
  type TaskDetail,
  TaskLabelInvalidError,
  TaskLabelNameConflictError,
  TaskNotFoundError,
  TaskOrderInvalidError,
  TaskParentInvalidError,
  TaskProjectUnavailableError,
  TaskRevisionConflictError,
  TaskService,
  TaskStatusInvalidError,
  TaskTeamInvalidError,
  type TaskView,
} from "@launchpp/core";
import {
  SqliteAuditWriter,
  type SqliteDatabase,
  SqliteIdempotencyRepository,
  SqliteInstallationRepository,
  SqliteOrganizationMembershipRepository,
  SqliteOutboxRepository,
  SqliteProjectRepository,
  SqliteTaskRepository,
  SqliteTeamRepository,
} from "@launchpp/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { cursorPage, executeIdempotent } from "./http-contract.js";
import { sendProblem } from "./problem-details.js";

interface ProjectParams {
  readonly projectId: string;
  readonly organizationId: string;
}

interface TaskParams extends ProjectParams {
  readonly taskId: string;
}

interface AttachmentParams extends TaskParams {
  readonly attachmentId: string;
}

interface CommentParams extends TaskParams {
  readonly commentId: string;
}

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

function labelSummary(label: Label) {
  return {
    ...(label.archivedAt === undefined ? {} : { archivedAt: label.archivedAt }),
    color: label.color,
    createdAt: label.createdAt,
    id: label.id,
    name: label.name,
    ...(label.projectId === undefined ? {} : { projectId: label.projectId }),
    revision: label.revision,
    updatedAt: label.updatedAt,
    organizationId: label.organizationId,
  };
}

function taskSummary(task: TaskView) {
  return {
    ...(task.archivedAt === undefined ? {} : { archivedAt: task.archivedAt }),
    assigneeUserIds: task.assigneeUserIds,
    attachmentCount: task.attachmentCount,
    commentCount: task.commentCount,
    createdAt: task.createdAt,
    createdByUserId: task.createdByUserId,
    description: task.description,
    ...(task.dueDate === undefined ? {} : { dueDate: task.dueDate }),
    id: task.id,
    labels: task.labels.map(labelSummary),
    number: task.number,
    ...(task.parentTaskId === undefined ? {} : { parentTaskId: task.parentTaskId }),
    position: task.position,
    priority: task.priority,
    projectId: task.projectId,
    reference: task.reference,
    revision: task.revision,
    statusId: task.statusId,
    ...(task.teamId === undefined ? {} : { teamId: task.teamId }),
    title: task.title,
    updatedAt: task.updatedAt,
    updatedByUserId: task.updatedByUserId,
    organizationId: task.organizationId,
  };
}

function taskDetailSummary(detail: TaskDetail) {
  return {
    activity: detail.activity,
    attachments: detail.attachments,
    availableLabels: detail.availableLabels.map(labelSummary),
    comments: detail.comments.map(commentSummary),
    subtasks: detail.subtasks.map(taskSummary),
    task: taskSummary(detail.task),
  };
}

function decodeBase64(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new TypeError("Attachment content must be valid base64.");
  }
  const content = Buffer.from(value, "base64");
  if (content.toString("base64") !== value) {
    throw new TypeError("Attachment content must use canonical base64 encoding.");
  }
  return content;
}

function contentDisposition(name: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function commentSummary(comment: TaskComment) {
  return {
    authorUserId: comment.authorUserId,
    body: comment.body,
    createdAt: comment.createdAt,
    id: comment.id,
    projectId: comment.projectId,
    revision: comment.revision,
    reactions: comment.reactions,
    taskId: comment.taskId,
    updatedAt: comment.updatedAt,
    organizationId: comment.organizationId,
  };
}

export async function registerTaskRoutes(
  app: FastifyInstance,
  input: Readonly<{ database: SqliteDatabase; identity: BetterAuthIdentityAdapter }>,
): Promise<void> {
  const installations = new SqliteInstallationRepository();
  const idempotency = new SqliteIdempotencyRepository(input.database);
  const service = new TaskService({
    audit: new SqliteAuditWriter(),
    clock: Date.now,
    generateId: randomUUID,
    memberships: new SqliteOrganizationMembershipRepository(),
    outbox: new SqliteOutboxRepository(),
    projects: new SqliteProjectRepository(),
    tasks: new SqliteTaskRepository(),
    teams: new SqliteTeamRepository(),
    transactions: input.database,
  });

  const contextFor = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await input.identity.resolveSession(webHeaders(request.headers));
    if (!session) {
      sendProblem(
        reply,
        request,
        401,
        "unauthenticated",
        "Authentication required",
        "Sign in to access tasks.",
      );
      return undefined;
    }
    const installation = input.database.read((context) => installations.findFirst(context));
    if (!installation) {
      sendProblem(reply, request, 503, "setup_required", "Setup required", "Setup is incomplete.");
      return undefined;
    }
    return { installationId: installation.id, userId: session.identity.id };
  };

  const sendDomainError = (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof TaskAccessDeniedError) {
      sendProblem(reply, request, 403, "task_access_denied", "Task access denied", error.message);
      return true;
    }
    if (error instanceof TaskNotFoundError || error instanceof TaskProjectUnavailableError) {
      sendProblem(reply, request, 404, "task_not_found", "Task not found", error.message);
      return true;
    }
    if (error instanceof TaskRevisionConflictError) {
      sendProblem(
        reply,
        request,
        409,
        "task_revision_conflict",
        "Task revision conflict",
        error.message,
        {
          currentRevision: error.currentRevision,
          expectedRevision: error.expectedRevision,
          resourceId: error.resourceId,
        },
      );
      return true;
    }
    if (error instanceof TaskLabelNameConflictError) {
      sendProblem(reply, request, 409, "label_name_conflict", "Label name conflict", error.message);
      return true;
    }
    if (
      error instanceof TaskAssigneeInvalidError ||
      error instanceof TaskLabelInvalidError ||
      error instanceof TaskOrderInvalidError ||
      error instanceof TaskParentInvalidError ||
      error instanceof TaskStatusInvalidError ||
      error instanceof TaskTeamInvalidError ||
      error instanceof TypeError
    ) {
      sendProblem(
        reply,
        request,
        400,
        "invalid_task_operation",
        "Invalid task operation",
        error.message,
      );
      return true;
    }
    return false;
  };

  app.get<{ Params: ProjectParams; Querystring: CursorPageQuery }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks",
    {
      schema: {
        operationId: "listTasks",
        params: { $ref: "LaunchppProjectParamsV1#" },
        querystring: { $ref: "LaunchppCursorPageQueryV1#" },
        response: { 200: { $ref: "LaunchppTaskPageV1#" }, ...problemResponses },
        summary: "List project tasks",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        const catalog = service.list({
          projectId: request.params.projectId,
          userId: context.userId,
          organizationId: request.params.organizationId,
        });
        const page = cursorPage(
          catalog.tasks,
          { ...request.query, scope: `tasks:${request.params.projectId}` },
          (task) => task.id,
        );
        return {
          items: page.items.map(taskSummary),
          labels: catalog.labels.map(labelSummary),
          ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        };
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.get<{ Params: TaskParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId",
    {
      schema: {
        operationId: "getTaskDetail",
        params: { $ref: "LaunchppTaskParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskDetailV1#" }, ...problemResponses },
        summary: "Get task detail",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        const detail = service.getDetail({
          projectId: request.params.projectId,
          taskId: request.params.taskId,
          userId: context.userId,
          organizationId: request.params.organizationId,
        });
        return taskDetailSummary(detail);
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.post<{ Body: CreateTaskAttachmentInput; Params: TaskParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/attachments",
    {
      bodyLimit: 7_100_000,
      schema: {
        body: { $ref: "LaunchppCreateTaskAttachmentInputV1#" },
        operationId: "createTaskAttachment",
        params: { $ref: "LaunchppTaskParamsV1#" },
        response: { 201: { $ref: "LaunchppTaskDetailV1#" }, ...problemResponses },
        summary: "Upload a task attachment",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        const detail = await service.createAttachment({
          ...context,
          ...(request.body.commentId === undefined ? {} : { commentId: request.body.commentId }),
          content: decodeBase64(request.body.contentBase64),
          contentType: request.body.contentType,
          correlationId: request.id,
          name: request.body.name,
          projectId: request.params.projectId,
          taskId: request.params.taskId,
          organizationId: request.params.organizationId,
        });
        reply.code(201);
        return taskDetailSummary(detail);
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.delete<{ Params: AttachmentParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/attachments/:attachmentId",
    {
      schema: {
        operationId: "deleteTaskAttachment",
        params: { $ref: "LaunchppTaskAttachmentParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskDetailV1#" }, ...problemResponses },
        summary: "Delete a task attachment",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return taskDetailSummary(
          await service.deleteAttachment({
            ...context,
            attachmentId: request.params.attachmentId,
            correlationId: request.id,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.get<{ Params: AttachmentParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/attachments/:attachmentId/content",
    {
      schema: {
        operationId: "downloadTaskAttachment",
        params: { $ref: "LaunchppTaskAttachmentParamsV1#" },
        response: { ...problemResponses },
        summary: "Download a task attachment",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        const attachment = service.getAttachment({
          attachmentId: request.params.attachmentId,
          projectId: request.params.projectId,
          taskId: request.params.taskId,
          userId: context.userId,
          organizationId: request.params.organizationId,
        });
        return reply
          .header("content-disposition", contentDisposition(attachment.name))
          .type(attachment.contentType)
          .send(Buffer.from(attachment.content));
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.post<{ Body: CreateTaskCommentInput; Params: TaskParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments",
    {
      schema: {
        body: { $ref: "LaunchppCreateTaskCommentInputV1#" },
        headers: IdempotencyHeadersSchema,
        operationId: "createTaskComment",
        params: { $ref: "LaunchppTaskParamsV1#" },
        response: { 201: { $ref: "LaunchppTaskCommentV1#" }, ...problemResponses },
        summary: "Create a task comment",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return await executeIdempotent(
          request,
          reply,
          idempotency,
          {
            actorUserId: context.userId,
            operation: "task.comment.create",
            payload: request.body,
            scopeKey: `task:${request.params.taskId}`,
          },
          async () => {
            const comment = await service.createComment({
              ...context,
              ...request.body,
              correlationId: request.id,
              projectId: request.params.projectId,
              taskId: request.params.taskId,
              organizationId: request.params.organizationId,
            });
            return { body: commentSummary(comment), status: 201 };
          },
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.put<{ Body: SetTaskCommentReactionInput; Params: CommentParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId/reactions",
    {
      schema: {
        body: { $ref: "LaunchppSetTaskCommentReactionInputV1#" },
        operationId: "setTaskCommentReaction",
        params: { $ref: "LaunchppTaskCommentParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskDetailV1#" }, ...problemResponses },
        summary: "Set a task comment reaction",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return taskDetailSummary(
          await service.setCommentReaction({
            ...context,
            ...request.body,
            commentId: request.params.commentId,
            correlationId: request.id,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.patch<{ Body: UpdateTaskCommentInput; Params: CommentParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId",
    {
      schema: {
        body: { $ref: "LaunchppUpdateTaskCommentInputV1#" },
        operationId: "updateTaskComment",
        params: { $ref: "LaunchppTaskCommentParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskDetailV1#" }, ...problemResponses },
        summary: "Update a task comment",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return taskDetailSummary(
          await service.updateComment({
            ...context,
            ...request.body,
            commentId: request.params.commentId,
            correlationId: request.id,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.delete<{ Body: DeleteTaskCommentInput; Params: CommentParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId",
    {
      schema: {
        body: { $ref: "LaunchppDeleteTaskCommentInputV1#" },
        operationId: "deleteTaskComment",
        params: { $ref: "LaunchppTaskCommentParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskDetailV1#" }, ...problemResponses },
        summary: "Delete a task comment",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return taskDetailSummary(
          await service.deleteComment({
            ...context,
            commentId: request.params.commentId,
            correlationId: request.id,
            expectedRevision: request.body.expectedRevision,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.post<{ Body: CreateTaskInput; Params: ProjectParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks",
    {
      schema: {
        body: { $ref: "LaunchppCreateTaskInputV1#" },
        headers: IdempotencyHeadersSchema,
        operationId: "createTask",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: { 201: { $ref: "LaunchppTaskViewV1#" }, ...problemResponses },
        summary: "Create a task",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return await executeIdempotent(
          request,
          reply,
          idempotency,
          {
            actorUserId: context.userId,
            operation: "task.create",
            payload: request.body,
            scopeKey: `project:${request.params.projectId}`,
          },
          async () => {
            const task = await service.createTask({
              ...context,
              ...request.body,
              correlationId: request.id,
              projectId: request.params.projectId,
              organizationId: request.params.organizationId,
            });
            return { body: taskSummary(task), status: 201 };
          },
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.patch<{ Body: UpdateTaskInput; Params: TaskParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId",
    {
      schema: {
        body: { $ref: "LaunchppUpdateTaskInputV1#" },
        operationId: "updateTask",
        params: { $ref: "LaunchppTaskParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskViewV1#" }, ...problemResponses },
        summary: "Update a task",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return taskSummary(
          await service.updateTask({
            ...context,
            ...request.body,
            correlationId: request.id,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.post<{ Body: MoveTaskInput; Params: TaskParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/move",
    {
      schema: {
        body: { $ref: "LaunchppMoveTaskInputV1#" },
        operationId: "moveTask",
        params: { $ref: "LaunchppTaskParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskViewV1#" }, ...problemResponses },
        summary: "Move a task",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return taskSummary(
          await service.moveTask({
            ...context,
            ...request.body,
            correlationId: request.id,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.put<{ Body: ReplaceTaskAssigneesInput; Params: TaskParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/assignees",
    {
      schema: {
        body: { $ref: "LaunchppReplaceTaskAssigneesInputV1#" },
        operationId: "replaceTaskAssignees",
        params: { $ref: "LaunchppTaskParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskViewV1#" }, ...problemResponses },
        summary: "Replace task assignees",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return taskSummary(
          await service.setAssignees({
            ...context,
            ...request.body,
            correlationId: request.id,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  app.put<{ Body: ReplaceTaskLabelsInput; Params: TaskParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/labels",
    {
      schema: {
        body: { $ref: "LaunchppReplaceTaskLabelsInputV1#" },
        operationId: "replaceTaskLabels",
        params: { $ref: "LaunchppTaskParamsV1#" },
        response: { 200: { $ref: "LaunchppTaskViewV1#" }, ...problemResponses },
        summary: "Replace task labels",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return taskSummary(
          await service.setLabels({
            ...context,
            ...request.body,
            correlationId: request.id,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          }),
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );

  for (const action of ["archive", "restore"] as const) {
    app.post<{ Body: ArchiveTaskInput; Params: TaskParams }>(
      `/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/${action}`,
      {
        schema: {
          body: { $ref: "LaunchppArchiveTaskInputV1#" },
          operationId: `${action}Task`,
          params: { $ref: "LaunchppTaskParamsV1#" },
          response: { 200: { $ref: "LaunchppTaskViewV1#" }, ...problemResponses },
          summary: `${action === "archive" ? "Archive" : "Restore"} a task`,
          tags: ["Tasks"],
        },
      },
      async (request, reply) => {
        const context = await contextFor(request, reply);
        if (!context) return;
        try {
          const command = {
            ...context,
            ...request.body,
            correlationId: request.id,
            projectId: request.params.projectId,
            taskId: request.params.taskId,
            organizationId: request.params.organizationId,
          };
          const task =
            action === "archive"
              ? await service.archiveTask(command)
              : await service.restoreTask(command);
          return taskSummary(task);
        } catch (error) {
          if (sendDomainError(error, request, reply)) return;
          throw error;
        }
      },
    );
  }

  app.post<{ Body: CreateLabelInput; Params: ProjectParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/labels",
    {
      schema: {
        body: { $ref: "LaunchppCreateLabelInputV1#" },
        headers: IdempotencyHeadersSchema,
        operationId: "createLabel",
        params: { $ref: "LaunchppProjectParamsV1#" },
        response: { 201: { $ref: "LaunchppLabelSummaryV1#" }, ...problemResponses },
        summary: "Create a task label",
        tags: ["Tasks"],
      },
    },
    async (request, reply) => {
      const context = await contextFor(request, reply);
      if (!context) return;
      try {
        return await executeIdempotent(
          request,
          reply,
          idempotency,
          {
            actorUserId: context.userId,
            operation: "label.create",
            payload: request.body,
            scopeKey: `project:${request.params.projectId}`,
          },
          async () => {
            const label = await service.createLabel({
              ...context,
              ...request.body,
              correlationId: request.id,
              projectId: request.params.projectId,
              organizationId: request.params.organizationId,
            });
            return { body: labelSummary(label), status: 201 };
          },
        );
      } catch (error) {
        if (sendDomainError(error, request, reply)) return;
        throw error;
      }
    },
  );
}

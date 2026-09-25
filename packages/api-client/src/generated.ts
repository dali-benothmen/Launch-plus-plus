// Generated from the versioned schemas in @launchpp/api-contracts.
// Regenerate this file when the core HTTP contract changes.
import type {
  ArchiveTaskInput,
  CreateLabelInput,
  CreateProjectInput,
  CreateTaskAttachmentInput,
  CreateTaskCommentInput,
  CreateTaskDivisionInput,
  CreateTaskInput,
  CursorPageQuery,
  DeleteTaskCommentInput,
  LabelSummary,
  MoveTaskInput,
  OrganizationContext,
  OrganizationMemberSummary,
  OrganizationSummary,
  ProjectCatalog,
  ProjectFolderSummary,
  ProjectStatusInput,
  ProjectStatusOrderInput,
  ProjectStatusSummary,
  ProjectSummary,
  ReplaceTaskAssigneesInput,
  ReplaceTaskLabelsInput,
  SearchQuery,
  SearchResponse,
  SetTaskCommentReactionInput,
  TaskComment,
  TaskDetail,
  TaskPage,
  TaskView,
  TeamInput,
  TeamSummary,
  UpdateProjectInput,
  UpdateTaskCommentInput,
  UpdateTaskInput,
} from "@launchpp/api-contracts";

export interface RequestOptions {
  readonly idempotencyKey?: string;
}

export type RequestJson = <Value>(path: string, init?: RequestInit) => Promise<Value>;

function queryString(query: CursorPageQuery = {}): string {
  const parameters = new URLSearchParams();
  if (query.cursor) parameters.set("cursor", query.cursor);
  if (query.limit !== undefined) parameters.set("limit", String(query.limit));
  const value = parameters.toString();
  return value.length > 0 ? `?${value}` : "";
}

function idempotencyHeaders(options?: RequestOptions): HeadersInit {
  return {
    "content-type": "application/json",
    "idempotency-key": options?.idempotencyKey ?? globalThis.crypto.randomUUID(),
  };
}

function projectPath(organizationId: string, projectId?: string): string {
  const root = `/api/v1/organizations/${encodeURIComponent(organizationId)}/projects`;
  return projectId ? `${root}/${encodeURIComponent(projectId)}` : root;
}

function statusPath(organizationId: string, projectId: string, statusId: string): string {
  return `${projectPath(organizationId, projectId)}/statuses/${encodeURIComponent(statusId)}`;
}

function taskPath(organizationId: string, projectId: string, taskId?: string): string {
  const root = `${projectPath(organizationId, projectId)}/tasks`;
  return taskId ? `${root}/${encodeURIComponent(taskId)}` : root;
}
function attachmentPath(
  organizationId: string,
  projectId: string,
  taskId: string,
  attachmentId?: string,
): string {
  const root = `${taskPath(organizationId, projectId, taskId)}/attachments`;
  return attachmentId ? `${root}/${encodeURIComponent(attachmentId)}` : root;
}

function commentPath(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId?: string,
): string {
  const root = `${taskPath(organizationId, projectId, taskId)}/comments`;
  return commentId ? `${root}/${encodeURIComponent(commentId)}` : root;
}

export interface CoreApiClient {
  readonly search: (query: SearchQuery) => Promise<SearchResponse>;
  readonly projects: {
    archive(organizationId: string, projectId: string): Promise<ProjectSummary>;
    create(
      organizationId: string,
      input: CreateProjectInput,
      options?: RequestOptions,
    ): Promise<ProjectSummary>;
    createFolder(organizationId: string, name: string): Promise<ProjectFolderSummary>;
    createStatus(
      organizationId: string,
      projectId: string,
      input: ProjectStatusInput,
    ): Promise<ProjectStatusSummary>;
    deleteStatus(organizationId: string, projectId: string, statusId: string): Promise<void>;
    renameStatus(
      organizationId: string,
      projectId: string,
      statusId: string,
      name: string,
    ): Promise<ProjectStatusSummary>;
    delete(organizationId: string, projectId: string): Promise<void>;
    deleteFolder(organizationId: string, folderId: string): Promise<void>;
    list(organizationId: string, query?: CursorPageQuery): Promise<ProjectCatalog>;
    markOpened(organizationId: string, projectId: string): Promise<void>;
    renameFolder(
      organizationId: string,
      folderId: string,
      name: string,
    ): Promise<ProjectFolderSummary>;
    reorderFolders(organizationId: string, orderedFolderIds: readonly string[]): Promise<void>;
    reorderProjects(
      organizationId: string,
      input: { readonly folderId?: string; readonly orderedProjectIds: readonly string[] },
    ): Promise<void>;
    reorderStatuses(
      organizationId: string,
      projectId: string,
      input: ProjectStatusOrderInput,
    ): Promise<void>;
    restore(organizationId: string, projectId: string): Promise<ProjectSummary>;
    setFavorite(organizationId: string, projectId: string, favorite: boolean): Promise<void>;
    update(
      organizationId: string,
      projectId: string,
      input: UpdateProjectInput,
    ): Promise<ProjectSummary>;
  };
  readonly tasks: {
    archive(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: ArchiveTaskInput,
    ): Promise<TaskView>;
    create(
      organizationId: string,
      projectId: string,
      input: CreateTaskInput,
      options?: RequestOptions,
    ): Promise<TaskView>;
    createDivision(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: CreateTaskDivisionInput,
      options?: RequestOptions,
    ): Promise<TaskDetail>;
    createAttachment(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: CreateTaskAttachmentInput,
    ): Promise<TaskDetail>;
    createComment(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: CreateTaskCommentInput,
      options?: RequestOptions,
    ): Promise<TaskComment>;
    deleteComment(
      organizationId: string,
      projectId: string,
      taskId: string,
      commentId: string,
      input: DeleteTaskCommentInput,
    ): Promise<TaskDetail>;
    setCommentReaction(
      organizationId: string,
      projectId: string,
      taskId: string,
      commentId: string,
      input: SetTaskCommentReactionInput,
    ): Promise<TaskDetail>;
    updateComment(
      organizationId: string,
      projectId: string,
      taskId: string,
      commentId: string,
      input: UpdateTaskCommentInput,
    ): Promise<TaskDetail>;
    createLabel(
      organizationId: string,
      projectId: string,
      input: CreateLabelInput,
      options?: RequestOptions,
    ): Promise<LabelSummary>;
    deleteAttachment(
      organizationId: string,
      projectId: string,
      taskId: string,
      attachmentId: string,
    ): Promise<TaskDetail>;
    get(organizationId: string, projectId: string, taskId: string): Promise<TaskDetail>;
    list(organizationId: string, projectId: string, query?: CursorPageQuery): Promise<TaskPage>;
    move(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: MoveTaskInput,
    ): Promise<TaskView>;
    replaceAssignees(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: ReplaceTaskAssigneesInput,
    ): Promise<TaskView>;
    replaceLabels(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: ReplaceTaskLabelsInput,
    ): Promise<TaskView>;
    restore(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: ArchiveTaskInput,
    ): Promise<TaskView>;
    update(
      organizationId: string,
      projectId: string,
      taskId: string,
      input: UpdateTaskInput,
    ): Promise<TaskView>;
  };
  readonly teams: {
    create(organizationId: string, input: TeamInput): Promise<TeamSummary>;
    list(organizationId: string): Promise<readonly TeamSummary[]>;
  };
  readonly organizations: {
    create(name: string, options?: RequestOptions): Promise<OrganizationSummary>;
    list(query?: CursorPageQuery): Promise<OrganizationContext>;
    listMembers(organizationId: string): Promise<readonly OrganizationMemberSummary[]>;
    rename(organizationId: string, name: string): Promise<OrganizationSummary>;
    select(organizationId: string): Promise<void>;
  };
}

export function createCoreApiClient(json: RequestJson): CoreApiClient {
  return Object.freeze({
    search: (query: SearchQuery) => {
      const parameters = new URLSearchParams({ q: query.q });
      if (query.limit !== undefined) parameters.set("limit", String(query.limit));
      if (query.projectId) parameters.set("projectId", query.projectId);
      if (query.organizationId) parameters.set("organizationId", query.organizationId);
      return json<SearchResponse>(`/api/v1/search?${parameters.toString()}`);
    },
    projects: Object.freeze({
      archive: (organizationId: string, projectId: string) =>
        json<ProjectSummary>(`${projectPath(organizationId, projectId)}/archive`, {
          method: "POST",
        }),
      create: (organizationId: string, input: CreateProjectInput, options?: RequestOptions) =>
        json<ProjectSummary>(projectPath(organizationId), {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      createFolder: (organizationId: string, name: string) =>
        json<ProjectFolderSummary>(
          `/api/v1/organizations/${encodeURIComponent(organizationId)}/folders`,
          {
            body: JSON.stringify({ name }),
            headers: { "content-type": "application/json" },
            method: "POST",
          },
        ),
      createStatus: (organizationId: string, projectId: string, input: ProjectStatusInput) =>
        json<ProjectStatusSummary>(`${projectPath(organizationId, projectId)}/statuses`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      async deleteStatus(
        organizationId: string,
        projectId: string,
        statusId: string,
      ): Promise<void> {
        await json(statusPath(organizationId, projectId, statusId), { method: "DELETE" });
      },
      renameStatus: (organizationId: string, projectId: string, statusId: string, name: string) =>
        json<ProjectStatusSummary>(statusPath(organizationId, projectId, statusId), {
          body: JSON.stringify({ name }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
      async delete(organizationId: string, projectId: string): Promise<void> {
        await json(projectPath(organizationId, projectId), { method: "DELETE" });
      },
      async deleteFolder(organizationId: string, folderId: string): Promise<void> {
        await json(
          `/api/v1/organizations/${encodeURIComponent(organizationId)}/folders/${encodeURIComponent(folderId)}`,
          { method: "DELETE" },
        );
      },
      list: (organizationId: string, query?: CursorPageQuery) =>
        json<ProjectCatalog>(`${projectPath(organizationId)}${queryString(query)}`),
      async markOpened(organizationId: string, projectId: string): Promise<void> {
        await json(`${projectPath(organizationId, projectId)}/opened`, { method: "POST" });
      },
      renameFolder: (organizationId: string, folderId: string, name: string) =>
        json<ProjectFolderSummary>(
          `/api/v1/organizations/${encodeURIComponent(organizationId)}/folders/${encodeURIComponent(folderId)}`,
          {
            body: JSON.stringify({ name }),
            headers: { "content-type": "application/json" },
            method: "PATCH",
          },
        ),
      async reorderFolders(
        organizationId: string,
        orderedFolderIds: readonly string[],
      ): Promise<void> {
        await json(`/api/v1/organizations/${encodeURIComponent(organizationId)}/folder-order`, {
          body: JSON.stringify({ orderedFolderIds }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
      async reorderProjects(
        organizationId: string,
        input: { readonly folderId?: string; readonly orderedProjectIds: readonly string[] },
      ): Promise<void> {
        await json(`/api/v1/organizations/${encodeURIComponent(organizationId)}/project-order`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
      async reorderStatuses(
        organizationId: string,
        projectId: string,
        input: ProjectStatusOrderInput,
      ): Promise<void> {
        await json(`${projectPath(organizationId, projectId)}/status-order`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
      restore: (organizationId: string, projectId: string) =>
        json<ProjectSummary>(`${projectPath(organizationId, projectId)}/restore`, {
          method: "POST",
        }),
      async setFavorite(
        organizationId: string,
        projectId: string,
        favorite: boolean,
      ): Promise<void> {
        await json(`${projectPath(organizationId, projectId)}/favorite`, {
          body: JSON.stringify({ favorite }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
      update: (organizationId: string, projectId: string, input: UpdateProjectInput) =>
        json<ProjectSummary>(projectPath(organizationId, projectId), {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
    }),
    tasks: Object.freeze({
      archive: (
        organizationId: string,
        projectId: string,
        taskId: string,
        input: ArchiveTaskInput,
      ) =>
        json<TaskView>(`${taskPath(organizationId, projectId, taskId)}/archive`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      create: (
        organizationId: string,
        projectId: string,
        input: CreateTaskInput,
        options?: RequestOptions,
      ) =>
        json<TaskView>(taskPath(organizationId, projectId), {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      createDivision: (
        organizationId: string,
        projectId: string,
        taskId: string,
        input: CreateTaskDivisionInput,
        options?: RequestOptions,
      ) =>
        json<TaskDetail>(`${taskPath(organizationId, projectId, taskId)}/divisions`, {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      createAttachment: (
        organizationId: string,
        projectId: string,
        taskId: string,
        input: CreateTaskAttachmentInput,
      ) =>
        json<TaskDetail>(attachmentPath(organizationId, projectId, taskId), {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      createComment: (
        organizationId: string,
        projectId: string,
        taskId: string,
        input: CreateTaskCommentInput,
        options?: RequestOptions,
      ) =>
        json<TaskComment>(`${taskPath(organizationId, projectId, taskId)}/comments`, {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      deleteComment: (
        organizationId: string,
        projectId: string,
        taskId: string,
        commentId: string,
        input: DeleteTaskCommentInput,
      ) =>
        json<TaskDetail>(commentPath(organizationId, projectId, taskId, commentId), {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "DELETE",
        }),
      setCommentReaction: (
        organizationId: string,
        projectId: string,
        taskId: string,
        commentId: string,
        input: SetTaskCommentReactionInput,
      ) =>
        json<TaskDetail>(`${commentPath(organizationId, projectId, taskId, commentId)}/reactions`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        }),
      updateComment: (
        organizationId: string,
        projectId: string,
        taskId: string,
        commentId: string,
        input: UpdateTaskCommentInput,
      ) =>
        json<TaskDetail>(commentPath(organizationId, projectId, taskId, commentId), {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
      createLabel: (
        organizationId: string,
        projectId: string,
        input: CreateLabelInput,
        options?: RequestOptions,
      ) =>
        json<LabelSummary>(`${projectPath(organizationId, projectId)}/labels`, {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      deleteAttachment: (
        organizationId: string,
        projectId: string,
        taskId: string,
        attachmentId: string,
      ) =>
        json<TaskDetail>(attachmentPath(organizationId, projectId, taskId, attachmentId), {
          method: "DELETE",
        }),
      get: (organizationId: string, projectId: string, taskId: string) =>
        json<TaskDetail>(taskPath(organizationId, projectId, taskId)),
      list: (organizationId: string, projectId: string, query?: CursorPageQuery) =>
        json<TaskPage>(`${taskPath(organizationId, projectId)}${queryString(query)}`),
      move: (organizationId: string, projectId: string, taskId: string, input: MoveTaskInput) =>
        json<TaskView>(`${taskPath(organizationId, projectId, taskId)}/move`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      replaceAssignees: (
        organizationId: string,
        projectId: string,
        taskId: string,
        input: ReplaceTaskAssigneesInput,
      ) =>
        json<TaskView>(`${taskPath(organizationId, projectId, taskId)}/assignees`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        }),
      replaceLabels: (
        organizationId: string,
        projectId: string,
        taskId: string,
        input: ReplaceTaskLabelsInput,
      ) =>
        json<TaskView>(`${taskPath(organizationId, projectId, taskId)}/labels`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        }),
      restore: (
        organizationId: string,
        projectId: string,
        taskId: string,
        input: ArchiveTaskInput,
      ) =>
        json<TaskView>(`${taskPath(organizationId, projectId, taskId)}/restore`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      update: (organizationId: string, projectId: string, taskId: string, input: UpdateTaskInput) =>
        json<TaskView>(taskPath(organizationId, projectId, taskId), {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
    }),
    teams: Object.freeze({
      create: (organizationId: string, input: TeamInput) =>
        json<TeamSummary>(`/api/v1/organizations/${encodeURIComponent(organizationId)}/teams`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      list: (organizationId: string) =>
        json<readonly TeamSummary[]>(
          `/api/v1/organizations/${encodeURIComponent(organizationId)}/teams`,
        ),
    }),
    organizations: Object.freeze({
      create: (name: string, options?: RequestOptions) =>
        json<OrganizationSummary>("/api/v1/organizations", {
          body: JSON.stringify({ name }),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      list: (query?: CursorPageQuery) =>
        json<OrganizationContext>(`/api/v1/organizations${queryString(query)}`),
      listMembers: (organizationId: string) =>
        json<readonly OrganizationMemberSummary[]>(
          `/api/v1/organizations/${encodeURIComponent(organizationId)}/members`,
        ),
      rename: (organizationId: string, name: string) =>
        json<OrganizationSummary>(`/api/v1/organizations/${encodeURIComponent(organizationId)}`, {
          body: JSON.stringify({ name }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
      async select(organizationId: string): Promise<void> {
        await json("/api/v1/organizations/current", {
          body: JSON.stringify({ organizationId }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
    }),
  });
}

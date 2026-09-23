// Generated from the versioned schemas in @launchpp/api-contracts.
// Regenerate this file when the core HTTP contract changes.
import type {
  ArchiveTaskInput,
  CreateLabelInput,
  CreateProjectInput,
  CreateTaskCommentInput,
  CreateTaskInput,
  CursorPageQuery,
  LabelSummary,
  MoveTaskInput,
  ProjectCatalog,
  ProjectFolderSummary,
  ProjectSummary,
  ReplaceTaskAssigneesInput,
  ReplaceTaskLabelsInput,
  SearchQuery,
  SearchResponse,
  TaskComment,
  TaskDetail,
  TaskPage,
  TaskView,
  UpdateProjectInput,
  UpdateTaskInput,
  WorkspaceContext,
  WorkspaceSummary,
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

function projectPath(workspaceId: string, projectId?: string): string {
  const root = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/projects`;
  return projectId ? `${root}/${encodeURIComponent(projectId)}` : root;
}

function taskPath(workspaceId: string, projectId: string, taskId?: string): string {
  const root = `${projectPath(workspaceId, projectId)}/tasks`;
  return taskId ? `${root}/${encodeURIComponent(taskId)}` : root;
}

export interface CoreApiClient {
  readonly search: (query: SearchQuery) => Promise<SearchResponse>;
  readonly projects: {
    archive(workspaceId: string, projectId: string): Promise<ProjectSummary>;
    create(
      workspaceId: string,
      input: CreateProjectInput,
      options?: RequestOptions,
    ): Promise<ProjectSummary>;
    createFolder(workspaceId: string, name: string): Promise<ProjectFolderSummary>;
    delete(workspaceId: string, projectId: string): Promise<void>;
    deleteFolder(workspaceId: string, folderId: string): Promise<void>;
    list(workspaceId: string, query?: CursorPageQuery): Promise<ProjectCatalog>;
    markOpened(workspaceId: string, projectId: string): Promise<void>;
    renameFolder(
      workspaceId: string,
      folderId: string,
      name: string,
    ): Promise<ProjectFolderSummary>;
    reorderFolders(workspaceId: string, orderedFolderIds: readonly string[]): Promise<void>;
    reorderProjects(
      workspaceId: string,
      input: { readonly folderId?: string; readonly orderedProjectIds: readonly string[] },
    ): Promise<void>;
    restore(workspaceId: string, projectId: string): Promise<ProjectSummary>;
    setFavorite(workspaceId: string, projectId: string, favorite: boolean): Promise<void>;
    update(
      workspaceId: string,
      projectId: string,
      input: UpdateProjectInput,
    ): Promise<ProjectSummary>;
  };
  readonly tasks: {
    archive(
      workspaceId: string,
      projectId: string,
      taskId: string,
      input: ArchiveTaskInput,
    ): Promise<TaskView>;
    create(
      workspaceId: string,
      projectId: string,
      input: CreateTaskInput,
      options?: RequestOptions,
    ): Promise<TaskView>;
    createComment(
      workspaceId: string,
      projectId: string,
      taskId: string,
      input: CreateTaskCommentInput,
      options?: RequestOptions,
    ): Promise<TaskComment>;
    createLabel(
      workspaceId: string,
      projectId: string,
      input: CreateLabelInput,
      options?: RequestOptions,
    ): Promise<LabelSummary>;
    get(workspaceId: string, projectId: string, taskId: string): Promise<TaskDetail>;
    list(workspaceId: string, projectId: string, query?: CursorPageQuery): Promise<TaskPage>;
    move(
      workspaceId: string,
      projectId: string,
      taskId: string,
      input: MoveTaskInput,
    ): Promise<TaskView>;
    replaceAssignees(
      workspaceId: string,
      projectId: string,
      taskId: string,
      input: ReplaceTaskAssigneesInput,
    ): Promise<TaskView>;
    replaceLabels(
      workspaceId: string,
      projectId: string,
      taskId: string,
      input: ReplaceTaskLabelsInput,
    ): Promise<TaskView>;
    restore(
      workspaceId: string,
      projectId: string,
      taskId: string,
      input: ArchiveTaskInput,
    ): Promise<TaskView>;
    update(
      workspaceId: string,
      projectId: string,
      taskId: string,
      input: UpdateTaskInput,
    ): Promise<TaskView>;
  };
  readonly workspaces: {
    create(name: string, options?: RequestOptions): Promise<WorkspaceSummary>;
    list(query?: CursorPageQuery): Promise<WorkspaceContext>;
    rename(workspaceId: string, name: string): Promise<WorkspaceSummary>;
    select(workspaceId: string): Promise<void>;
  };
}

export function createCoreApiClient(json: RequestJson): CoreApiClient {
  return Object.freeze({
    search: (query: SearchQuery) => {
      const parameters = new URLSearchParams({ q: query.q });
      if (query.limit !== undefined) parameters.set("limit", String(query.limit));
      if (query.projectId) parameters.set("projectId", query.projectId);
      if (query.workspaceId) parameters.set("workspaceId", query.workspaceId);
      return json<SearchResponse>(`/api/v1/search?${parameters.toString()}`);
    },
    projects: Object.freeze({
      archive: (workspaceId: string, projectId: string) =>
        json<ProjectSummary>(`${projectPath(workspaceId, projectId)}/archive`, { method: "POST" }),
      create: (workspaceId: string, input: CreateProjectInput, options?: RequestOptions) =>
        json<ProjectSummary>(projectPath(workspaceId), {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      createFolder: (workspaceId: string, name: string) =>
        json<ProjectFolderSummary>(
          `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/folders`,
          {
            body: JSON.stringify({ name }),
            headers: { "content-type": "application/json" },
            method: "POST",
          },
        ),
      async delete(workspaceId: string, projectId: string): Promise<void> {
        await json(projectPath(workspaceId, projectId), { method: "DELETE" });
      },
      async deleteFolder(workspaceId: string, folderId: string): Promise<void> {
        await json(
          `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/folders/${encodeURIComponent(folderId)}`,
          { method: "DELETE" },
        );
      },
      list: (workspaceId: string, query?: CursorPageQuery) =>
        json<ProjectCatalog>(`${projectPath(workspaceId)}${queryString(query)}`),
      async markOpened(workspaceId: string, projectId: string): Promise<void> {
        await json(`${projectPath(workspaceId, projectId)}/opened`, { method: "POST" });
      },
      renameFolder: (workspaceId: string, folderId: string, name: string) =>
        json<ProjectFolderSummary>(
          `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/folders/${encodeURIComponent(folderId)}`,
          {
            body: JSON.stringify({ name }),
            headers: { "content-type": "application/json" },
            method: "PATCH",
          },
        ),
      async reorderFolders(
        workspaceId: string,
        orderedFolderIds: readonly string[],
      ): Promise<void> {
        await json(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/folder-order`, {
          body: JSON.stringify({ orderedFolderIds }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
      async reorderProjects(
        workspaceId: string,
        input: { readonly folderId?: string; readonly orderedProjectIds: readonly string[] },
      ): Promise<void> {
        await json(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/project-order`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
      restore: (workspaceId: string, projectId: string) =>
        json<ProjectSummary>(`${projectPath(workspaceId, projectId)}/restore`, { method: "POST" }),
      async setFavorite(workspaceId: string, projectId: string, favorite: boolean): Promise<void> {
        await json(`${projectPath(workspaceId, projectId)}/favorite`, {
          body: JSON.stringify({ favorite }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
      update: (workspaceId: string, projectId: string, input: UpdateProjectInput) =>
        json<ProjectSummary>(projectPath(workspaceId, projectId), {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
    }),
    tasks: Object.freeze({
      archive: (workspaceId: string, projectId: string, taskId: string, input: ArchiveTaskInput) =>
        json<TaskView>(`${taskPath(workspaceId, projectId, taskId)}/archive`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      create: (
        workspaceId: string,
        projectId: string,
        input: CreateTaskInput,
        options?: RequestOptions,
      ) =>
        json<TaskView>(taskPath(workspaceId, projectId), {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      createComment: (
        workspaceId: string,
        projectId: string,
        taskId: string,
        input: CreateTaskCommentInput,
        options?: RequestOptions,
      ) =>
        json<TaskComment>(`${taskPath(workspaceId, projectId, taskId)}/comments`, {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      createLabel: (
        workspaceId: string,
        projectId: string,
        input: CreateLabelInput,
        options?: RequestOptions,
      ) =>
        json<LabelSummary>(`${projectPath(workspaceId, projectId)}/labels`, {
          body: JSON.stringify(input),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      get: (workspaceId: string, projectId: string, taskId: string) =>
        json<TaskDetail>(taskPath(workspaceId, projectId, taskId)),
      list: (workspaceId: string, projectId: string, query?: CursorPageQuery) =>
        json<TaskPage>(`${taskPath(workspaceId, projectId)}${queryString(query)}`),
      move: (workspaceId: string, projectId: string, taskId: string, input: MoveTaskInput) =>
        json<TaskView>(`${taskPath(workspaceId, projectId, taskId)}/move`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      replaceAssignees: (
        workspaceId: string,
        projectId: string,
        taskId: string,
        input: ReplaceTaskAssigneesInput,
      ) =>
        json<TaskView>(`${taskPath(workspaceId, projectId, taskId)}/assignees`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        }),
      replaceLabels: (
        workspaceId: string,
        projectId: string,
        taskId: string,
        input: ReplaceTaskLabelsInput,
      ) =>
        json<TaskView>(`${taskPath(workspaceId, projectId, taskId)}/labels`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PUT",
        }),
      restore: (workspaceId: string, projectId: string, taskId: string, input: ArchiveTaskInput) =>
        json<TaskView>(`${taskPath(workspaceId, projectId, taskId)}/restore`, {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      update: (workspaceId: string, projectId: string, taskId: string, input: UpdateTaskInput) =>
        json<TaskView>(taskPath(workspaceId, projectId, taskId), {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
    }),
    workspaces: Object.freeze({
      create: (name: string, options?: RequestOptions) =>
        json<WorkspaceSummary>("/api/v1/workspaces", {
          body: JSON.stringify({ name }),
          headers: idempotencyHeaders(options),
          method: "POST",
        }),
      list: (query?: CursorPageQuery) =>
        json<WorkspaceContext>(`/api/v1/workspaces${queryString(query)}`),
      rename: (workspaceId: string, name: string) =>
        json<WorkspaceSummary>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}`, {
          body: JSON.stringify({ name }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
      async select(workspaceId: string): Promise<void> {
        await json("/api/v1/workspaces/current", {
          body: JSON.stringify({ workspaceId }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        });
      },
    }),
  });
}

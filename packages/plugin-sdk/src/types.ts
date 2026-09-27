import type { PluginContext } from "@launchpp/plugin-protocol";

export type PluginTheme = PluginContext["theme"];
export type TaskPriority = "high" | "low" | "medium";

export interface Project {
  readonly access: "organization" | "restricted";
  readonly archivedAt?: number;
  readonly createdByUserId?: string;
  readonly description: string;
  readonly favorite: boolean;
  readonly folderId?: string;
  readonly id: string;
  readonly key: string;
  readonly lastOpenedAt?: number;
  readonly name: string;
  readonly position: number;
  readonly revision: number;
  readonly slug: string;
  readonly updatedAt?: number;
  readonly organizationId: string;
}

export interface TaskLabel {
  readonly archivedAt?: number;
  readonly color: string;
  readonly createdAt: number;
  readonly id: string;
  readonly name: string;
  readonly projectId?: string;
  readonly revision: number;
  readonly updatedAt: number;
  readonly organizationId: string;
}

export interface Task {
  readonly archivedAt?: number;
  readonly assigneeUserIds: readonly string[];
  readonly attachmentCount: number;
  readonly commentCount: number;
  readonly createdAt: number;
  readonly createdByUserId: string;
  readonly description: string;
  readonly dueDate?: string;
  readonly id: string;
  readonly labels: readonly TaskLabel[];
  readonly number: number;
  readonly parentTaskId?: string;
  readonly position: number;
  readonly priority: TaskPriority;
  readonly projectId: string;
  readonly reference: string;
  readonly revision: number;
  readonly statusId: string;
  readonly teamId?: string;
  readonly title: string;
  readonly updatedAt: number;
  readonly updatedByUserId: string;
  readonly organizationId: string;
}

export interface CommentReaction {
  readonly count: number;
  readonly emoji: string;
  readonly reactedByCurrentUser: boolean;
}

export interface TaskComment {
  readonly authorUserId: string;
  readonly body: string;
  readonly createdAt: number;
  readonly id: string;
  readonly projectId: string;
  readonly reactions: readonly CommentReaction[];
  readonly revision: number;
  readonly taskId: string;
  readonly updatedAt: number;
  readonly organizationId: string;
}

export interface CreateProjectInput {
  readonly description?: string;
  readonly folderId?: string;
  readonly name: string;
}

export interface UpdateProjectInput {
  readonly description?: string;
  readonly folderId?: null | string;
  readonly name?: string;
}

export interface CreateTaskInput {
  readonly assigneeUserIds?: readonly string[];
  readonly description?: string;
  readonly dueDate?: string;
  readonly labelIds?: readonly string[];
  readonly parentTaskId?: string;
  readonly priority?: TaskPriority;
  readonly statusId?: string;
  readonly teamId?: string;
  readonly title: string;
}

export interface UpdateTaskInput {
  readonly description?: string;
  readonly dueDate?: null | string;
  readonly expectedRevision: number;
  readonly priority?: TaskPriority;
  readonly taskId: string;
  readonly teamId?: null | string;
  readonly title?: string;
}

export interface CreateTaskCommentInput {
  readonly body: string;
  readonly taskId: string;
}

export type NavigationTarget =
  | Readonly<{ projectId: string; type: "project" }>
  | Readonly<{ projectId: string; taskId: string; type: "task" }>
  | Readonly<{ path: string; type: "plugin" }>;

import {
  ApiError,
  type OrganizationMemberSummary,
  type ProjectStatusSummary,
  type TaskAttachmentSummary,
  type TaskComment,
  type TaskDetail,
  type TaskPriority,
  type TaskView,
  type TeamSummary,
} from "@launchpp/api-client";
import {
  Alert,
  AddIcon,
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Dropdown,
  type DropdownMenuItem,
  Empty,
  Input,
  Mentions,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Upload,
  type UploadFile,
  type UploadRequestOptions,
  Typography,
} from "@launchpp/ui";
import {
  CalendarOutlined,
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  FlagOutlined,
  FileTextOutlined,
  MoreOutlined,
  PaperClipOutlined,
  SendOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@launchpp/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient } from "./api-client-context.js";
import {
  downloadBlob,
  fileToBase64,
  formatFileSize,
  maximumAttachmentBytes,
} from "./attachments.js";
import { invalidationEventName } from "./invalidation.js";

interface TaskDetailPanelProps {
  readonly archived: boolean;
  readonly currentUserId: string;
  readonly currentUserName: string;
  readonly onAfterClose: () => void;
  readonly onClose: () => void;
  readonly onTaskChanged: (task: TaskView) => void;
  readonly onTaskDeleted: (task: TaskView) => void;
  readonly projectId: string;
  readonly projectName: string;
  readonly statuses: readonly ProjectStatusSummary[];
  readonly taskId?: string | undefined;
  readonly organizationId: string;
}

interface DetailDraft {
  readonly assigneeUserIds: readonly string[];
  readonly description: string;
  readonly dueDate: Date | null;
  readonly priority: TaskPriority;
  readonly statusId: string;
  readonly teamId?: string | undefined;
  readonly title: string;
}

const detailDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const detailDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const taskDetailFieldStyle = { maxWidth: "100%", width: 220 } as const;
const taskDetailHeaderButtonStyle = { background: "transparent" } as const;
const teamTagColors = ["blue", "cyan", "green", "orange", "purple", "magenta"] as const;
const priorityPresentation: Record<
  TaskPriority,
  Readonly<{ color: "green" | "orange" | "red"; label: string }>
> = {
  high: { color: "red", label: "High" },
  low: { color: "green", label: "Low" },
  medium: { color: "orange", label: "Medium" },
};

function isImageAttachment(file: UploadFile<TaskDetail>) {
  return file.type?.startsWith("image/") || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.name);
}

function dateFromKey(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function dateKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function initialDraft(detail: TaskDetail): DetailDraft {
  return {
    assigneeUserIds: detail.task.assigneeUserIds,
    description: detail.task.description,
    dueDate: dateFromKey(detail.task.dueDate),
    priority: detail.task.priority,
    statusId: detail.task.statusId,
    teamId: detail.task.teamId,
    title: detail.task.title,
  };
}

function attachmentUploadFile(attachment: TaskAttachmentSummary): UploadFile<TaskDetail> {
  return {
    name: attachment.name,
    size: attachment.size,
    status: "done",
    type: attachment.contentType,
    uid: attachment.id,
  };
}

function sameIds(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const values = new Set(left);
  return right.every((value) => values.has(value));
}

function activityText(operation: string) {
  const labels: Readonly<Record<string, string>> = {
    "comment.created": "added a comment",
    "task.archived": "deleted the task",
    "task.attachment_added": "added an attachment",
    "task.attachment_deleted": "deleted an attachment",
    "task.assignees_changed": "changed the assignees",
    "task.created": "created the task",
    "task.labels_changed": "changed the labels",
    "task.moved": "changed the task status",
    "task.restored": "restored the task",
    "task.updated": "updated the task",
  };
  return labels[operation] ?? operation.replaceAll("_", " ").replaceAll(".", " ");
}

function useNarrowScreen() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

export function TaskDetailPanel({
  archived,
  currentUserId,
  currentUserName,
  onAfterClose,
  onClose,
  onTaskChanged,
  onTaskDeleted,
  projectId,
  projectName,
  statuses,
  taskId,
  organizationId,
}: TaskDetailPanelProps) {
  const api = useApiClient();
  const narrow = useNarrowScreen();
  const [detail, setDetail] = useState<TaskDetail>();
  const [draft, setDraft] = useState<DetailDraft>();
  const [teams, setTeams] = useState<readonly TeamSummary[]>([]);
  const [members, setMembers] = useState<readonly OrganizationMemberSummary[]>([]);
  const [loadError, setLoadError] = useState<unknown>();
  const [saveError, setSaveError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<readonly UploadFile<TaskDetail>[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string>();
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<TaskComment>();
  const [deletingComment, setDeletingComment] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<readonly UploadFile<TaskDetail>[]>([]);
  const [previewImage, setPreviewImage] = useState<Readonly<{ name: string; url: string }>>();

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoadError(undefined);
    try {
      const [next, nextTeams, nextMembers] = await Promise.all([
        api.tasks.get(organizationId, projectId, taskId),
        api.teams.list(organizationId),
        api.organizations.listMembers(organizationId),
      ]);
      setDetail(next);
      setDraft(initialDraft(next));
      setAttachmentFiles(
        next.attachments.filter((attachment) => !attachment.commentId).map(attachmentUploadFile),
      );
      setTeams(nextTeams);
      setMembers(nextMembers);
    } catch (reason) {
      setLoadError(reason);
    }
  }, [api, projectId, taskId, organizationId]);

  useEffect(() => {
    if (!taskId) return;
    setDetail(undefined);
    setDraft(undefined);
    setAttachmentFiles([]);
    setEditing(false);
    setSaveError(undefined);
    setComment("");
    setCommentFiles([]);
    setEditingCommentId(undefined);
    setEditingCommentBody("");
    setCommentDeleteTarget(undefined);
    setSubtaskTitle("");
    setDeleteConfirmOpen(false);
    setPreviewImage(undefined);
    void load();
  }, [load, taskId]);

  useEffect(() => {
    if (!taskId) return;
    const reload = (event: Event) => {
      const next = (
        event as CustomEvent<{ projectId?: string; resourceId: string; resourceType: string }>
      ).detail;
      if (
        next.projectId === projectId &&
        (next.resourceType !== "task" || next.resourceId === taskId)
      ) {
        void load();
      }
    };
    window.addEventListener(invalidationEventName, reload);
    return () => window.removeEventListener(invalidationEventName, reload);
  }, [load, projectId, taskId]);

  useEffect(() => () => previewImage && URL.revokeObjectURL(previewImage.url), [previewImage]);

  const statusOptions = useMemo(
    () =>
      statuses.map((status) => ({
        label: (
          <span className="task-detail-select-option">
            <span
              aria-hidden
              className="task-detail-status-dot"
              style={{ background: status.color }}
            />
            {status.name}
          </span>
        ),
        value: status.id,
      })),
    [statuses],
  );
  const priorityOptions = useMemo(
    () =>
      (Object.keys(priorityPresentation) as TaskPriority[]).map((priority) => ({
        label: (
          <Tag color={priorityPresentation[priority].color}>
            {priorityPresentation[priority].label}
          </Tag>
        ),
        value: priority,
      })),
    [],
  );
  const teamOptions = useMemo(
    () =>
      teams.map((team, index) => ({
        label: <Tag color={teamTagColors[index % teamTagColors.length] ?? "blue"}>{team.name}</Tag>,
        value: team.id,
      })),
    [teams],
  );

  const memberName = useCallback(
    (userId: string) =>
      members.find((member) => member.userId === userId)?.displayName ??
      (userId === currentUserId ? currentUserName : "Organization member"),
    [currentUserId, currentUserName, members],
  );
  const assigneeOptions = useMemo(() => {
    const userIds = [
      ...new Set([
        ...members.map((member) => member.userId),
        currentUserId,
        ...(draft?.assigneeUserIds ?? []),
      ]),
    ];
    return userIds.map((userId) => {
      const name = memberName(userId);
      return {
        label: (
          <span className="task-detail-select-option">
            <Avatar size={20}>{name.slice(0, 1).toUpperCase()}</Avatar>
            {name}
          </span>
        ),
        value: userId,
      };
    });
  }, [currentUserId, draft?.assigneeUserIds, memberName, members]);
  const mentionOptions = useMemo(
    () =>
      members.map((member) => ({
        key: member.userId,
        label: member.displayName,
        value: member.displayName,
      })),
    [members],
  );

  const save = async (nextDraft: DetailDraft): Promise<boolean> => {
    if (!detail || saving || archived) return false;
    if (nextDraft.title.trim().length === 0) {
      setSaveError(new TypeError("A task title is required."));
      return false;
    }
    setSaving(true);
    setSaveError(undefined);
    let task = detail.task;
    try {
      if (nextDraft.statusId !== task.statusId) {
        task = await api.tasks.move(organizationId, projectId, task.id, {
          expectedRevision: task.revision,
          statusId: nextDraft.statusId,
        });
      }
      const nextTitle = nextDraft.title.trim().replace(/\s+/g, " ");
      const nextDescription = nextDraft.description.trim();
      const nextDueDate = nextDraft.dueDate ? dateKey(nextDraft.dueDate) : undefined;
      const teamChanged = (nextDraft.teamId ?? null) !== (task.teamId ?? null);
      if (
        nextTitle !== task.title ||
        nextDescription !== task.description ||
        nextDueDate !== task.dueDate ||
        nextDraft.priority !== task.priority ||
        teamChanged
      ) {
        task = await api.tasks.update(organizationId, projectId, task.id, {
          ...(nextTitle === task.title ? {} : { title: nextTitle }),
          ...(nextDescription === task.description ? {} : { description: nextDescription }),
          ...(nextDueDate === task.dueDate
            ? {}
            : { dueDate: nextDueDate === undefined ? null : nextDueDate }),
          ...(nextDraft.priority === task.priority ? {} : { priority: nextDraft.priority }),
          ...(teamChanged ? { teamId: nextDraft.teamId ?? null } : {}),
          expectedRevision: task.revision,
        });
      }
      const assigneeUserIds = nextDraft.assigneeUserIds;
      if (!sameIds(assigneeUserIds, task.assigneeUserIds)) {
        task = await api.tasks.replaceAssignees(organizationId, projectId, task.id, {
          expectedRevision: task.revision,
          userIds: [...assigneeUserIds],
        });
      }
      onTaskChanged(task);
      await load();
      return true;
    } catch (reason) {
      setSaveError(reason);
      if (reason instanceof ApiError && reason.status === 409) await load();
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = async () => {
    if (!draft) return;
    if (await save(draft)) setEditing(false);
  };

  const cancelEditing = () => {
    if (detail) setDraft(initialDraft(detail));
    setSaveError(undefined);
    setEditing(false);
  };

  const startEditing = () => {
    if (!detail || archived) return;
    setDraft(initialDraft(detail));
    setSaveError(undefined);
    setEditing(true);
  };

  const createSubtask = async () => {
    if (!detail || creatingSubtask || subtaskTitle.trim().length === 0) return;
    setCreatingSubtask(true);
    setSaveError(undefined);
    try {
      await api.tasks.create(organizationId, projectId, {
        parentTaskId: detail.task.id,
        statusId: detail.task.statusId,
        title: subtaskTitle,
      });
      setSubtaskTitle("");
      await load();
    } catch (reason) {
      setSaveError(reason);
    } finally {
      setCreatingSubtask(false);
    }
  };

  const toggleSubtask = async (subtask: TaskView, complete: boolean) => {
    const completedStatus =
      statuses.find((status) => /^(done|complete|completed)$/i.test(status.name)) ??
      statuses.at(-1);
    const activeStatus =
      statuses.find((status) => status.id === detail?.task.statusId) ?? statuses[0];
    const targetStatus = complete ? completedStatus : activeStatus;
    if (!targetStatus || targetStatus.id === subtask.statusId) return;
    setSaveError(undefined);
    try {
      await api.tasks.move(organizationId, projectId, subtask.id, {
        expectedRevision: subtask.revision,
        statusId: targetStatus.id,
      });
      await load();
    } catch (reason) {
      setSaveError(reason);
    }
  };

  const createComment = async () => {
    if (!detail || postingComment || comment.trim().length === 0) return;
    setPostingComment(true);
    setSaveError(undefined);
    try {
      const created = await api.tasks.createComment(organizationId, projectId, detail.task.id, {
        body: comment,
      });
      let nextDetail: TaskDetail | undefined;
      for (const entry of commentFiles) {
        const file = entry.originFileObj;
        if (!file) continue;
        nextDetail = await api.tasks.createAttachment(organizationId, projectId, detail.task.id, {
          commentId: created.id,
          contentBase64: await fileToBase64(file),
          contentType: file.type || "application/octet-stream",
          name: file.name,
        });
      }
      setComment("");
      setCommentFiles([]);
      if (nextDetail) applyDetail(nextDetail);
      else await load();
    } catch (reason) {
      setSaveError(reason);
      await load();
    } finally {
      setPostingComment(false);
    }
  };

  const startEditingComment = (item: TaskComment) => {
    setEditingCommentId(item.id);
    setEditingCommentBody(item.body);
    setSaveError(undefined);
  };

  const saveEditedComment = async (item: TaskComment) => {
    if (!detail || editingCommentBody.trim().length === 0) return;
    setPostingComment(true);
    setSaveError(undefined);
    try {
      const next = await api.tasks.updateComment(
        organizationId,
        projectId,
        detail.task.id,
        item.id,
        { body: editingCommentBody, expectedRevision: item.revision },
      );
      setEditingCommentId(undefined);
      setEditingCommentBody("");
      applyDetail(next);
    } catch (reason) {
      setSaveError(reason);
      if (reason instanceof ApiError && reason.status === 409) await load();
    } finally {
      setPostingComment(false);
    }
  };

  const deleteComment = async () => {
    if (!detail || !commentDeleteTarget || deletingComment) return;
    setDeletingComment(true);
    setSaveError(undefined);
    try {
      const next = await api.tasks.deleteComment(
        organizationId,
        projectId,
        detail.task.id,
        commentDeleteTarget.id,
        { expectedRevision: commentDeleteTarget.revision },
      );
      setCommentDeleteTarget(undefined);
      applyDetail(next);
    } catch (reason) {
      setSaveError(reason);
      if (reason instanceof ApiError && reason.status === 409) await load();
    } finally {
      setDeletingComment(false);
    }
  };

  const deleteTask = async () => {
    if (!detail || deleting) return;
    setDeleting(true);
    setSaveError(undefined);
    try {
      const deleted = await api.tasks.archive(organizationId, projectId, detail.task.id, {
        expectedRevision: detail.task.revision,
      });
      setDeleteConfirmOpen(false);
      onTaskDeleted(deleted);
      onClose();
    } catch (reason) {
      setSaveError(reason);
    } finally {
      setDeleting(false);
    }
  };

  const applyDetail = (next: TaskDetail) => {
    setDetail(next);
    setDraft((current) => (editing && current ? current : initialDraft(next)));
    setAttachmentFiles(
      next.attachments.filter((attachment) => !attachment.commentId).map(attachmentUploadFile),
    );
    onTaskChanged(next.task);
  };

  const uploadAttachment = ({ file, onError, onSuccess }: UploadRequestOptions<TaskDetail>) => {
    void (async () => {
      if (!detail) {
        onError(new Error("Task details are not available."));
        return;
      }
      try {
        const next = await api.tasks.createAttachment(organizationId, projectId, detail.task.id, {
          contentBase64: await fileToBase64(file),
          contentType: file.type || "application/octet-stream",
          name: file.name,
        });
        onSuccess(next);
        applyDetail(next);
      } catch (reason) {
        const error = reason instanceof Error ? reason : new Error("Could not upload attachment.");
        setSaveError(error);
        onError(error);
      }
    })();
  };

  const removeAttachment = async (file: UploadFile<TaskDetail>): Promise<boolean> => {
    if (!detail) return false;
    if (!detail.attachments.some((attachment) => attachment.id === file.uid)) return true;
    setSaveError(undefined);
    try {
      const next = await api.tasks.deleteAttachment(
        organizationId,
        projectId,
        detail.task.id,
        file.uid,
      );
      applyDetail(next);
    } catch (reason) {
      setSaveError(reason);
    }
    return false;
  };

  const downloadAttachment = async (file: UploadFile<TaskDetail>) => {
    if (!detail) return;
    setSaveError(undefined);
    try {
      const blob = await api.tasks.downloadAttachment(
        organizationId,
        projectId,
        detail.task.id,
        file.uid,
      );
      downloadBlob(blob, file.name);
    } catch (reason) {
      setSaveError(reason);
    }
  };

  const previewAttachment = async (file: UploadFile<TaskDetail>) => {
    if (!detail) return;
    if (!isImageAttachment(file)) {
      await downloadAttachment(file);
      return;
    }
    setSaveError(undefined);
    try {
      const blob = await api.tasks.downloadAttachment(
        organizationId,
        projectId,
        detail.task.id,
        file.uid,
      );
      setPreviewImage({ name: file.name, url: URL.createObjectURL(blob) });
    } catch (reason) {
      setSaveError(reason);
    }
  };

  const completedStatus =
    statuses.find((status) => /^(done|complete|completed)$/i.test(status.name)) ?? statuses.at(-1);
  const completedSubtasks =
    detail?.subtasks.filter((subtask) => subtask.statusId === completedStatus?.id).length ?? 0;
  const subtaskProgress = detail?.subtasks.length
    ? Math.round((completedSubtasks / detail.subtasks.length) * 100)
    : 0;
  const selectedStatus = detail
    ? statuses.find((status) => status.id === detail.task.statusId)
    : undefined;
  const selectedTeam = detail?.task.teamId
    ? teams.find((team) => team.id === detail.task.teamId)
    : undefined;
  const selectedTeamIndex = selectedTeam
    ? teams.findIndex((team) => team.id === selectedTeam.id)
    : -1;

  const content = loadError ? (
    <div className="task-detail-state">
      <Alert
        action={<Button onClick={() => void load()}>Retry</Button>}
        showIcon
        title={loadError instanceof Error ? loadError.message : "Could not load the task."}
        type="error"
      />
    </div>
  ) : !detail || !draft ? (
    <div className="task-detail-loading">
      <Spin />
    </div>
  ) : (
    <div className="task-detail-content">
      <div className="task-detail-overview">
        {saveError ? (
          <Alert
            showIcon
            title={saveError instanceof Error ? saveError.message : "Could not save the task."}
            type="error"
          />
        ) : null}

        <div className="task-detail-summary">
          <div className="task-detail-title-row">
            {editing ? (
              <Input
                autoFocus
                className="task-detail-title-input"
                styles={{
                  input: {
                    fontSize: 25,
                    fontWeight: 600,
                    height: 42,
                    lineHeight: 1.3,
                  },
                }}
                disabled={saving}
                maxLength={500}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                value={draft.title}
              />
            ) : (
              <Typography.Title className="task-detail-heading" level={2}>
                {detail.task.title}
              </Typography.Title>
            )}
          </div>

          <div className="task-detail-meta">
            <div className="task-detail-meta-label">
              <span aria-hidden className="task-detail-meta-icon task-detail-status-icon" />
              Status
            </div>
            {editing ? (
              <Select
                ariaLabel="Task status"
                className="task-detail-field"
                disabled={saving}
                onChange={(value) => {
                  if (typeof value === "string") setDraft({ ...draft, statusId: value });
                }}
                options={statusOptions}
                style={taskDetailFieldStyle}
                value={draft.statusId}
              />
            ) : (
              <div className="task-detail-meta-value task-detail-tag-value">
                <Tag
                  color={selectedStatus?.color ?? "default"}
                  icon={
                    <span
                      aria-hidden
                      className="task-detail-status-dot"
                      style={{ background: selectedStatus?.color }}
                    />
                  }
                >
                  {selectedStatus?.name ?? "Unknown"}
                </Tag>
              </div>
            )}

            <div className="task-detail-meta-label">
              <CalendarOutlined />
              Due date
            </div>
            {editing ? (
              <DatePicker
                allowClear
                className="task-detail-field"
                disabled={saving}
                onChange={(value) =>
                  setDraft({ ...draft, dueDate: value instanceof Date ? value : null })
                }
                placeholder="No due date"
                style={taskDetailFieldStyle}
                value={draft.dueDate}
              />
            ) : detail.task.dueDate ? (
              <Typography.Text>
                {detailDate.format(dateFromKey(detail.task.dueDate) as Date)}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary">No due date</Typography.Text>
            )}

            <div className="task-detail-meta-label">
              <UserAddOutlined />
              Created by
            </div>
            <div className="task-detail-meta-value task-detail-assignee-value">
              <Avatar size={20}>
                {detail.task.createdByUserId === currentUserId
                  ? currentUserName.slice(0, 1).toUpperCase()
                  : "M"}
              </Avatar>
              <Typography.Text>
                {detail.task.createdByUserId === currentUserId
                  ? currentUserName
                  : "Organization member"}
              </Typography.Text>
            </div>

            <div className="task-detail-meta-label">
              <UserOutlined />
              Assignee
            </div>
            {editing ? (
              <Select
                allowClear
                ariaLabel="Task assignees"
                className="task-detail-field"
                disabled={saving}
                mode="multiple"
                notFoundContent="No members"
                onChange={(value) => {
                  const assigneeUserIds = Array.isArray(value)
                    ? value.filter((userId): userId is string => typeof userId === "string")
                    : [];
                  setDraft({ ...draft, assigneeUserIds });
                }}
                options={assigneeOptions}
                placeholder="Unassigned"
                style={taskDetailFieldStyle}
                value={draft.assigneeUserIds}
              />
            ) : detail.task.assigneeUserIds.length > 0 ? (
              <div className="task-detail-meta-value task-detail-assignee-value">
                <Avatar.Group max={{ count: 4 }} size="small">
                  {detail.task.assigneeUserIds.map((userId) => (
                    <Avatar key={userId}>
                      {userId === currentUserId ? currentUserName.slice(0, 1).toUpperCase() : "M"}
                    </Avatar>
                  ))}
                </Avatar.Group>
                <Typography.Text>
                  {detail.task.assigneeUserIds
                    .map((userId) =>
                      userId === currentUserId ? currentUserName : "Organization member",
                    )
                    .join(", ")}
                </Typography.Text>
              </div>
            ) : (
              <Typography.Text type="secondary">Unassigned</Typography.Text>
            )}

            <div className="task-detail-meta-label">
              <TeamOutlined />
              Team
            </div>
            {editing ? (
              <Select
                allowClear
                ariaLabel="Task team"
                className="task-detail-field"
                disabled={saving}
                notFoundContent="No teams"
                onChange={(value) =>
                  setDraft({ ...draft, teamId: typeof value === "string" ? value : undefined })
                }
                options={teamOptions}
                placeholder="No team"
                style={taskDetailFieldStyle}
                value={draft.teamId}
              />
            ) : selectedTeam ? (
              <div className="task-detail-meta-value task-detail-tag-value">
                <Tag color={teamTagColors[selectedTeamIndex % teamTagColors.length] ?? "blue"}>
                  {selectedTeam.name}
                </Tag>
              </div>
            ) : (
              <Typography.Text type="secondary">No team</Typography.Text>
            )}

            <div className="task-detail-meta-label">
              <FlagOutlined />
              Priority
            </div>
            {editing ? (
              <Select
                ariaLabel="Task priority"
                className="task-detail-field"
                disabled={saving}
                onChange={(value) => {
                  if (value === "low" || value === "medium" || value === "high") {
                    setDraft({ ...draft, priority: value });
                  }
                }}
                options={priorityOptions}
                style={taskDetailFieldStyle}
                value={draft.priority}
              />
            ) : (
              <div className="task-detail-meta-value task-detail-tag-value">
                <Tag color={priorityPresentation[detail.task.priority].color}>
                  {priorityPresentation[detail.task.priority].label}
                </Tag>
              </div>
            )}
          </div>
        </div>

        <section
          className="task-detail-description"
          aria-labelledby="task-detail-description-label"
        >
          <div className="task-detail-section-label" id="task-detail-description-label">
            <FileTextOutlined />
            Description
          </div>
          {editing ? (
            <Input.TextArea
              autoSize={{ maxRows: 12, minRows: 3 }}
              disabled={saving}
              maxLength={100_000}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="Add a description"
              value={draft.description}
            />
          ) : (
            <Typography.Paragraph
              className="task-detail-description-text"
              type={detail.task.description ? "default" : "secondary"}
            >
              {detail.task.description || "No description"}
            </Typography.Paragraph>
          )}
        </section>

        <section
          className="task-detail-attachments"
          aria-labelledby="task-detail-attachments-label"
        >
          <div className="task-detail-section-label" id="task-detail-attachments-label">
            <PaperClipOutlined /> Attachments (
            {detail.attachments.filter((attachment) => !attachment.commentId).length})
          </div>
          <Upload<TaskDetail>
            beforeUpload={(file) => {
              if (file.size <= maximumAttachmentBytes) return true;
              setSaveError(new TypeError("Attachments must be 5 MB or smaller."));
              return Upload.LIST_IGNORE;
            }}
            customRequest={uploadAttachment}
            disabled={archived}
            fileList={attachmentFiles}
            maxCount={100}
            multiple
            onChange={({ fileList }) => setAttachmentFiles(fileList)}
            onDownload={(file) => void downloadAttachment(file)}
            onPreview={(file) => void previewAttachment(file)}
            onRemove={removeAttachment}
            styles={{ root: { width: "100%" } }}
            showUploadList={{
              extra: (file) => (file.size === undefined ? null : formatFileSize(file.size)),
              showDownloadIcon: (file) =>
                file.status === "done" &&
                detail.attachments.some((attachment) => attachment.id === file.uid),
              showPreviewIcon: (file) => file.status === "done" && isImageAttachment(file),
              showRemoveIcon: !archived,
            }}
          >
            <Button disabled={archived} icon={<AddIcon />}>
              Add attachment
            </Button>
          </Upload>
        </section>
      </div>

      <Tabs
        className="task-detail-tabs"
        defaultActiveKey="subtasks"
        styles={{ body: { padding: "20px 28px 28px" }, header: { padding: "0 28px" } }}
        items={[
          {
            key: "subtasks",
            label: "Subtasks",
            children: (
              <section className="task-detail-tab-panel" aria-label="Subtasks">
                <div className="task-detail-subtask-heading">
                  <Typography.Text strong>Subtasks</Typography.Text>
                  <div className="task-detail-subtask-progress">
                    <Progress percent={subtaskProgress} showInfo={false} size={18} type="circle" />
                    <Typography.Text type="secondary">
                      {completedSubtasks}/{detail.subtasks.length}
                    </Typography.Text>
                  </div>
                </div>
                {detail.subtasks.length > 0 ? (
                  <div className="task-detail-subtask-list">
                    {detail.subtasks.map((subtask) => {
                      const complete = subtask.statusId === completedStatus?.id;
                      return (
                        <div className="task-detail-subtask" key={subtask.id}>
                          <Checkbox
                            checked={complete}
                            disabled={archived}
                            onChange={(event) => void toggleSubtask(subtask, event.target.checked)}
                          >
                            <Typography.Text delete={complete}>{subtask.title}</Typography.Text>
                          </Checkbox>
                          {subtask.assigneeUserIds.includes(currentUserId) ? (
                            <Avatar size={20}>{currentUserName.slice(0, 1).toUpperCase()}</Avatar>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty description="No subtasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
                {!archived ? (
                  <div className="task-detail-compose-row">
                    <Input
                      maxLength={500}
                      onChange={(event) => setSubtaskTitle(event.target.value)}
                      onPressEnter={() => void createSubtask()}
                      placeholder="Add a subtask"
                      value={subtaskTitle}
                    />
                    <Button
                      disabled={subtaskTitle.trim().length === 0}
                      loading={creatingSubtask}
                      onClick={() => void createSubtask()}
                    >
                      Add
                    </Button>
                  </div>
                ) : null}
              </section>
            ),
          },
          {
            key: "comments",
            label: (
              <span className="task-detail-tab-label">
                Comments <span className="task-detail-tab-count">{detail.comments.length}</span>
              </span>
            ),
            children: (
              <section className="task-detail-tab-panel" aria-label="Comments">
                <div className="task-detail-comment-heading">
                  <span className="task-detail-section-label">
                    <CommentOutlined /> Comments
                  </span>
                </div>
                {!archived ? (
                  <div className="task-detail-comment-form">
                    {commentFiles.length > 0 ? (
                      <Upload<TaskDetail>
                        beforeUpload={() => false}
                        className="task-detail-comment-staged-files"
                        fileList={commentFiles}
                        maxCount={0}
                        onChange={({ fileList }) => setCommentFiles(fileList)}
                        showUploadList={{
                          extra: (file) =>
                            file.size === undefined ? null : formatFileSize(file.size),
                          showDownloadIcon: false,
                          showPreviewIcon: false,
                          showRemoveIcon: true,
                        }}
                        styles={{
                          item: {
                            background: "var(--launch-color-bg-subtle)",
                            border: "1px solid var(--launch-color-border-secondary)",
                            maxWidth: 240,
                            padding: "3px 7px",
                          },
                          list: {
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            margin: 0,
                          },
                          root: { width: "100%" },
                        }}
                      />
                    ) : null}
                    <Mentions
                      autoSize={{ maxRows: 7, minRows: 2 }}
                      className="task-detail-comment-input"
                      maxLength={20_000}
                      onChange={setComment}
                      options={mentionOptions}
                      placeholder="Type comment"
                      styles={{ root: { borderColor: "transparent", boxShadow: "none" } }}
                      value={comment}
                      variant="borderless"
                    />
                    <div className="task-detail-comment-footer">
                      <Upload<TaskDetail>
                        beforeUpload={(file) => {
                          if (file.size <= maximumAttachmentBytes) return false;
                          setSaveError(new TypeError("Attachments must be 5 MB or smaller."));
                          return Upload.LIST_IGNORE;
                        }}
                        className="task-detail-comment-attach"
                        fileList={commentFiles}
                        maxCount={20}
                        multiple
                        onChange={({ fileList }) => setCommentFiles(fileList)}
                        showUploadList={false}
                      >
                        <Button
                          aria-label="Attach file to comment"
                          icon={<PaperClipOutlined />}
                          iconOnly
                          size="small"
                          variant="text"
                        />
                      </Upload>
                      <Button
                        aria-label="Send comment"
                        color="primary"
                        disabled={comment.trim().length === 0}
                        icon={<SendOutlined />}
                        iconOnly
                        loading={postingComment}
                        onClick={() => void createComment()}
                        size="small"
                      />
                    </div>
                  </div>
                ) : null}
                {detail.comments.length > 0 ? (
                  <div className="task-detail-comment-list">
                    {detail.comments.map((item) => {
                      const authorName = memberName(item.authorUserId);
                      const ownsComment = item.authorUserId === currentUserId;
                      const commentAttachmentFiles = detail.attachments
                        .filter((attachment) => attachment.commentId === item.id)
                        .map(attachmentUploadFile);
                      const menuItems: readonly DropdownMenuItem[] = [
                        {
                          disabled: !ownsComment || archived,
                          icon: <EditOutlined />,
                          key: "edit",
                          label: "Edit",
                        },
                        {
                          danger: true,
                          disabled: !ownsComment || archived,
                          icon: <DeleteOutlined />,
                          key: "delete",
                          label: "Delete",
                        },
                      ];
                      return (
                        <article className="task-detail-comment" key={item.id}>
                          <div className="task-detail-comment-header">
                            <div className="task-detail-comment-meta">
                              <Avatar size={20}>{authorName.slice(0, 1).toUpperCase()}</Avatar>
                              <Typography.Text strong>{authorName}</Typography.Text>
                              <Typography.Text
                                className="task-detail-comment-date"
                                type="secondary"
                              >
                                {detailDateTime.format(new Date(item.createdAt))}
                              </Typography.Text>
                            </div>
                            <Dropdown
                              menu={{
                                items: menuItems,
                                onClick: ({ key }) => {
                                  if (key === "edit") startEditingComment(item);
                                  if (key === "delete") setCommentDeleteTarget(item);
                                },
                              }}
                              placement="bottomRight"
                              trigger={["click"]}
                            >
                              <Button
                                aria-label={`Actions for comment by ${authorName}`}
                                icon={<MoreOutlined />}
                                iconOnly
                                size="small"
                                variant="text"
                              />
                            </Dropdown>
                          </div>
                          {editingCommentId === item.id ? (
                            <div className="task-detail-comment-editor">
                              <Mentions
                                autoFocus
                                autoSize={{ maxRows: 8, minRows: 2 }}
                                maxLength={20_000}
                                onChange={setEditingCommentBody}
                                options={mentionOptions}
                                value={editingCommentBody}
                              />
                              <Space size={8}>
                                <Button
                                  disabled={postingComment}
                                  onClick={() => {
                                    setEditingCommentId(undefined);
                                    setEditingCommentBody("");
                                  }}
                                  size="small"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  color="primary"
                                  disabled={editingCommentBody.trim().length === 0}
                                  loading={postingComment}
                                  onClick={() => void saveEditedComment(item)}
                                  size="small"
                                >
                                  Save
                                </Button>
                              </Space>
                            </div>
                          ) : (
                            <Typography.Paragraph>{item.body}</Typography.Paragraph>
                          )}
                          {commentAttachmentFiles.length > 0 ? (
                            <Upload<TaskDetail>
                              className="task-detail-comment-files"
                              disabled
                              fileList={commentAttachmentFiles}
                              maxCount={0}
                              onDownload={(file) => void downloadAttachment(file)}
                              onPreview={(file) => void previewAttachment(file)}
                              showUploadList={{
                                extra: (file) =>
                                  file.size === undefined ? null : formatFileSize(file.size),
                                showDownloadIcon: true,
                                showPreviewIcon: (file) => isImageAttachment(file),
                                showRemoveIcon: false,
                              }}
                            />
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <Empty description="No comments yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </section>
            ),
          },
          {
            key: "activity",
            label: "Activities",
            children: (
              <section className="task-detail-tab-panel" aria-label="Activities">
                {detail.activity.length > 0 ? (
                  <Timeline
                    items={detail.activity.map((item) => ({
                      content: `${item.actorUserId === currentUserId ? currentUserName : "An organization member"} ${activityText(item.operation)}.`,
                      key: item.id,
                      title: detailDateTime.format(new Date(item.occurredAt)),
                    }))}
                    titleSpan={140}
                  />
                ) : (
                  <Empty description="No activity yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </section>
            ),
          },
        ]}
      />
    </div>
  );

  return (
    <>
      <Drawer
        afterOpenChange={(open) => {
          if (!open) onAfterClose();
        }}
        className="task-detail-drawer"
        extra={
          editing ? (
            <Space size={12}>
              <Button
                disabled={saving}
                onClick={cancelEditing}
                size="small"
                style={taskDetailHeaderButtonStyle}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                disabled={!draft || draft.title.trim().length === 0}
                loading={saving}
                onClick={() => void saveChanges()}
                size="small"
                style={taskDetailHeaderButtonStyle}
                variant="outlined"
              >
                Save
              </Button>
            </Space>
          ) : (
            <Space size={12}>
              {!archived ? (
                <Button
                  aria-label="Edit task"
                  icon={<EditOutlined />}
                  iconOnly
                  onClick={startEditing}
                  style={taskDetailHeaderButtonStyle}
                  variant="outlined"
                />
              ) : null}
              <Button
                aria-label="Delete task"
                danger
                icon={<DeleteOutlined />}
                iconOnly
                onClick={() => setDeleteConfirmOpen(true)}
                style={taskDetailHeaderButtonStyle}
                variant="outlined"
              />
            </Space>
          )
        }
        mask
        onClose={onClose}
        open={taskId !== undefined}
        placement="right"
        size={narrow ? "100%" : 620}
        styles={{
          body: { padding: 0 },
          title: {
            color: "var(--launch-color-text-tertiary, rgba(0, 0, 0, 0.45))",
            fontSize: 13,
            fontWeight: 400,
          },
        }}
        title={projectName}
      >
        {content}
      </Drawer>

      <Modal
        centered
        destroyOnHidden
        footer={null}
        onCancel={() => setPreviewImage(undefined)}
        open={previewImage !== undefined}
        title={previewImage?.name}
        width={720}
      >
        {previewImage ? (
          <img
            alt={previewImage.name}
            className="task-detail-image-preview"
            src={previewImage.url}
          />
        ) : null}
      </Modal>

      <Modal
        cancelButtonProps={{ disabled: deletingComment }}
        centered
        confirmLoading={deletingComment}
        destroyOnHidden
        okButtonProps={{ danger: true }}
        okText="Delete comment"
        onCancel={() => setCommentDeleteTarget(undefined)}
        onOk={() => void deleteComment()}
        open={commentDeleteTarget !== undefined}
        title="Delete comment?"
      >
        <Typography.Paragraph>
          Delete this comment and its attached files? This action cannot be undone.
        </Typography.Paragraph>
      </Modal>

      <Modal
        cancelButtonProps={{ disabled: deleting }}
        centered
        confirmLoading={deleting}
        destroyOnHidden
        okButtonProps={{ danger: true }}
        okText="Delete task"
        onCancel={() => setDeleteConfirmOpen(false)}
        onOk={() => void deleteTask()}
        open={deleteConfirmOpen}
        title="Delete task?"
      >
        <Typography.Paragraph>
          Delete {detail?.task.title ?? "this task"}? Its history will remain archived.
        </Typography.Paragraph>
      </Modal>
    </>
  );
}

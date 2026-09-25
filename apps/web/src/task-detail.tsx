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
  AddIcon,
  Alert,
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Dropdown,
  type DropdownMenuItem,
  EmojiPicker,
  Empty,
  Input,
  Mentions,
  type MentionsRef,
  message,
  Modal,
  Popover,
  Progress,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Typography,
  Upload,
  type UploadFile,
  type UploadRequestOptions,
} from "@launchpp/ui";
import {
  CalendarOutlined,
  CheckSquareOutlined,
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  EnterOutlined,
  FileTextOutlined,
  FlagOutlined,
  LinkOutlined,
  MoreOutlined,
  PaperClipOutlined,
  SmileOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@launchpp/ui/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
function commentsSeenStorageKey(
  organizationId: string,
  taskId: string,
  userId: string,
) {
  return `launchpp:comments-seen:${organizationId}:${taskId}:${userId}`;
}

function readCommentsSeenAt(key: string) {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeCommentsSeenAt(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

const taskDetailFieldStyle = { maxWidth: "100%", width: 220 } as const;
const taskDetailTagStyle = { fontSize: 14 } as const;
const taskDetailHeaderIconStyle = { fontSize: 16 } as const;
const taskDetailHeaderButtonStyle = { background: "transparent" } as const;
const teamTagColors = [
  "blue",
  "cyan",
  "green",
  "orange",
  "purple",
  "magenta",
] as const;
const priorityPresentation: Record<
  TaskPriority,
  Readonly<{ color: "green" | "orange" | "red"; label: string }>
> = {
  high: { color: "red", label: "High" },
  low: { color: "green", label: "Low" },
  medium: { color: "orange", label: "Medium" },
};

function isImageAttachment(file: UploadFile<TaskDetail>) {
  return (
    file.type?.startsWith("image/") ||
    /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.name)
  );
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

function attachmentUploadFile(
  attachment: TaskAttachmentSummary,
): UploadFile<TaskDetail> {
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

function renderCommentBody(body: string, memberNames: readonly string[]) {
  const names = [
    ...new Set(memberNames.map((name) => name.trim().replace(/\s+/g, " "))),
  ]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  const content = [];
  let cursor = 0;
  let mentionIndex = 0;
  while (cursor < body.length) {
    let nextMatch: { end: number; name: string; start: number } | undefined;
    for (const name of names) {
      const token = `@${name}`;
      let start = body.indexOf(token, cursor);
      while (start >= 0) {
        const previous = body[start - 1];
        const next = body[start + token.length];
        const validStart =
          start === 0 || previous === undefined || /\s|[([{]/.test(previous);
        const validEnd = next === undefined || /\s|[.,!?;:)\]}]/.test(next);
        if (validStart && validEnd) break;
        start = body.indexOf(token, start + token.length);
      }
      if (start < 0) continue;
      const candidate = { end: start + token.length, name, start };
      if (
        !nextMatch ||
        candidate.start < nextMatch.start ||
        (candidate.start === nextMatch.start && candidate.end > nextMatch.end)
      ) {
        nextMatch = candidate;
      }
    }
    if (!nextMatch) {
      content.push(body.slice(cursor));
      break;
    }
    if (nextMatch.start > cursor)
      content.push(body.slice(cursor, nextMatch.start));
    content.push(
      <Tag color="blue" key={`mention-${mentionIndex}-${nextMatch.start}`}>
        {nextMatch.name}
      </Tag>,
    );
    mentionIndex += 1;
    cursor = nextMatch.end;
  }
  return content;
}

function activityText(
  operation: string,
  metadata: Readonly<Record<string, unknown>>,
  statuses: readonly ProjectStatusSummary[],
) {
  if (operation === "task.moved") {
    const fromStatusId =
      typeof metadata["fromStatusId"] === "string" ? metadata["fromStatusId"] : undefined;
    const toStatusId = typeof metadata["toStatusId"] === "string" ? metadata["toStatusId"] : undefined;
    if (fromStatusId === toStatusId) return "reordered the task";
    const recordedStatusName =
      typeof metadata["toStatusName"] === "string" ? metadata["toStatusName"] : undefined;
    const currentStatusName = statuses.find((status) => status.id === toStatusId)?.name;
    const statusName = recordedStatusName ?? currentStatusName;
    return statusName
      ? `changed the task status to ${statusName}`
      : "changed the task status";
  }
  const labels: Readonly<Record<string, string>> = {
    "task.archived": "deleted the task",
    "task.attachment_added": "added an attachment",
    "task.attachment_deleted": "deleted an attachment",
    "task.assignees_changed": "changed the assignees",
    "task.created": "created the task",
    "task.labels_changed": "changed the labels",
    "task.restored": "restored the task",
    "task.updated": "updated the task",
  };
  return (
    labels[operation] ?? operation.replaceAll("_", " ").replaceAll(".", " ")
  );
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
  const [messageApi, messageHolder] = message.useMessage();
  const [detail, setDetail] = useState<TaskDetail>();
  const [draft, setDraft] = useState<DetailDraft>();
  const [teams, setTeams] = useState<readonly TeamSummary[]>([]);
  const [members, setMembers] = useState<readonly OrganizationMemberSummary[]>(
    [],
  );
  const [loadError, setLoadError] = useState<unknown>();
  const [saveError, setSaveError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("subtasks");
  const [commentsSeenAt, setCommentsSeenAt] = useState(0);
  const [visibleCommentCount, setVisibleCommentCount] = useState(10);
  const [comment, setComment] = useState("");
  const [commentComposerRevision, setCommentComposerRevision] = useState(0);
  const commentInputRef = useRef<MentionsRef>(null);
  const commentSelectionRef = useRef({ end: 0, start: 0 });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactionPickerCommentId, setReactionPickerCommentId] =
    useState<string>();
  const [pendingReaction, setPendingReaction] = useState<string>();
  const [commentFiles, setCommentFiles] = useState<
    readonly UploadFile<TaskDetail>[]
  >([]);
  const [editingCommentId, setEditingCommentId] = useState<string>();
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<TaskComment>();
  const [deletingComment, setDeletingComment] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskComposerOpen, setSubtaskComposerOpen] = useState(false);
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string>();
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [savingSubtask, setSavingSubtask] = useState(false);
  const [subtaskDeleteTarget, setSubtaskDeleteTarget] = useState<TaskView>();
  const [deletingSubtask, setDeletingSubtask] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<
    readonly UploadFile<TaskDetail>[]
  >([]);
  const [previewImage, setPreviewImage] =
    useState<Readonly<{ name: string; url: string }>>();

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
        next.attachments
          .filter((attachment) => !attachment.commentId)
          .map(attachmentUploadFile),
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
    setActiveDetailTab("subtasks");
    setCommentsSeenAt(
      readCommentsSeenAt(
        commentsSeenStorageKey(organizationId, taskId, currentUserId),
      ),
    );
    setComment("");
    setVisibleCommentCount(10);
    setCommentComposerRevision(0);
    commentSelectionRef.current = { end: 0, start: 0 };
    setEmojiOpen(false);
    setReactionPickerCommentId(undefined);
    setPendingReaction(undefined);
    setCommentFiles([]);
    setEditingCommentId(undefined);
    setEditingCommentBody("");
    setCommentDeleteTarget(undefined);
    setSubtaskTitle("");
    setSubtaskComposerOpen(false);
    setEditingSubtaskId(undefined);
    setEditingSubtaskTitle("");
    setSubtaskDeleteTarget(undefined);
    setDeleteConfirmOpen(false);
    setPreviewImage(undefined);
    void load();
  }, [currentUserId, load, organizationId, taskId]);

  useEffect(() => {
    if (!taskId) return;
    const reload = (event: Event) => {
      const next = (
        event as CustomEvent<{
          projectId?: string;
          resourceId: string;
          resourceType: string;
        }>
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

  useEffect(
    () => () => previewImage && URL.revokeObjectURL(previewImage.url),
    [previewImage],
  );

  const unreadCommentCount =
    detail?.comments.filter(
      (item) =>
        item.authorUserId !== currentUserId && item.createdAt > commentsSeenAt,
    ).length ?? 0;

  const markCommentsSeen = useCallback(() => {
    if (!taskId) return;
    const latestCommentAt = Math.max(
      Date.now(),
      ...(detail?.comments.map((item) => item.createdAt) ?? []),
    );
    setCommentsSeenAt(latestCommentAt);
    writeCommentsSeenAt(
      commentsSeenStorageKey(organizationId, taskId, currentUserId),
      latestCommentAt,
    );
  }, [currentUserId, detail?.comments, organizationId, taskId]);

  useEffect(() => {
    if (activeDetailTab === "comments") markCommentsSeen();
  }, [activeDetailTab, markCommentsSeen]);

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
        label: (
          <Tag color={teamTagColors[index % teamTagColors.length] ?? "blue"}>
            {team.name}
          </Tag>
        ),
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
        value: member.displayName.trim().replace(/\s+/g, " "),
      })),
    [members],
  );

  const insertEmoji = (emoji: string) => {
    const storedSelection = commentSelectionRef.current;
    const start = Math.max(0, Math.min(storedSelection.start, comment.length));
    const end = Math.max(start, Math.min(storedSelection.end, comment.length));
    const nextComment = `${comment.slice(0, start)}${emoji}${comment.slice(end)}`;
    const nextCursor = start + emoji.length;
    commentSelectionRef.current = { end: nextCursor, start: nextCursor };
    setComment(nextComment);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      commentInputRef.current?.focus();
      commentInputRef.current?.nativeElement?.setSelectionRange(
        nextCursor,
        nextCursor,
      );
    });
  };

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
      const nextDueDate = nextDraft.dueDate
        ? dateKey(nextDraft.dueDate)
        : undefined;
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
          ...(nextDescription === task.description
            ? {}
            : { description: nextDescription }),
          ...(nextDueDate === task.dueDate
            ? {}
            : { dueDate: nextDueDate === undefined ? null : nextDueDate }),
          ...(nextDraft.priority === task.priority
            ? {}
            : { priority: nextDraft.priority }),
          ...(teamChanged ? { teamId: nextDraft.teamId ?? null } : {}),
          expectedRevision: task.revision,
        });
      }
      const assigneeUserIds = nextDraft.assigneeUserIds;
      if (!sameIds(assigneeUserIds, task.assigneeUserIds)) {
        task = await api.tasks.replaceAssignees(
          organizationId,
          projectId,
          task.id,
          {
            expectedRevision: task.revision,
            userIds: [...assigneeUserIds],
          },
        );
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

  const copyTaskUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      messageApi.success("Task link copied.");
    } catch {
      messageApi.error("Could not copy the task link.");
    }
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
      setSubtaskComposerOpen(false);
      await load();
    } catch (reason) {
      setSaveError(reason);
    } finally {
      setCreatingSubtask(false);
    }
  };

  const toggleSubtask = async (subtask: TaskView, complete: boolean) => {
    const completedStatus =
      statuses.find((status) =>
        /^(done|complete|completed)$/i.test(status.name),
      ) ?? statuses.at(-1);
    const activeStatus =
      statuses.find((status) => status.id === detail?.task.statusId) ??
      statuses[0];
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

  const saveSubtaskTitle = async (subtask: TaskView) => {
    if (savingSubtask || editingSubtaskTitle.trim().length === 0) return;
    setSavingSubtask(true);
    setSaveError(undefined);
    try {
      await api.tasks.update(organizationId, projectId, subtask.id, {
        expectedRevision: subtask.revision,
        title: editingSubtaskTitle,
      });
      setEditingSubtaskId(undefined);
      setEditingSubtaskTitle("");
      await load();
    } catch (reason) {
      setSaveError(reason);
      if (reason instanceof ApiError && reason.status === 409) await load();
    } finally {
      setSavingSubtask(false);
    }
  };

  const deleteSubtask = async () => {
    if (!subtaskDeleteTarget || deletingSubtask) return;
    setDeletingSubtask(true);
    setSaveError(undefined);
    try {
      await api.tasks.archive(
        organizationId,
        projectId,
        subtaskDeleteTarget.id,
        {
          expectedRevision: subtaskDeleteTarget.revision,
        },
      );
      setSubtaskDeleteTarget(undefined);
      await load();
    } catch (reason) {
      setSaveError(reason);
      if (reason instanceof ApiError && reason.status === 409) await load();
    } finally {
      setDeletingSubtask(false);
    }
  };

  const createComment = async () => {
    if (!detail || postingComment || comment.trim().length === 0) return;
    setPostingComment(true);
    setSaveError(undefined);
    try {
      const created = await api.tasks.createComment(
        organizationId,
        projectId,
        detail.task.id,
        {
          body: comment,
        },
      );
      let nextDetail: TaskDetail | undefined;
      for (const entry of commentFiles) {
        const file = entry.originFileObj;
        if (!file) continue;
        nextDetail = await api.tasks.createAttachment(
          organizationId,
          projectId,
          detail.task.id,
          {
            commentId: created.id,
            contentBase64: await fileToBase64(file),
            contentType: file.type || "application/octet-stream",
            name: file.name,
          },
        );
      }
      setComment("");
      setCommentComposerRevision((revision) => revision + 1);
      commentSelectionRef.current = { end: 0, start: 0 };
      setEmojiOpen(false);
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

  const setCommentReaction = async (
    item: TaskComment,
    emoji: string,
    active: boolean,
  ) => {
    if (!detail) return;
    const pendingKey = `${item.id}:${emoji}`;
    setPendingReaction(pendingKey);
    setSaveError(undefined);
    try {
      const next = await api.tasks.setCommentReaction(
        organizationId,
        projectId,
        detail.task.id,
        item.id,
        { active, emoji },
      );
      setReactionPickerCommentId(undefined);
      applyDetail(next);
    } catch (reason) {
      setSaveError(reason);
    } finally {
      setPendingReaction(undefined);
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
      const deleted = await api.tasks.archive(
        organizationId,
        projectId,
        detail.task.id,
        {
          expectedRevision: detail.task.revision,
        },
      );
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
      next.attachments
        .filter((attachment) => !attachment.commentId)
        .map(attachmentUploadFile),
    );
    onTaskChanged(next.task);
  };

  const uploadAttachment = ({
    file,
    onError,
    onSuccess,
  }: UploadRequestOptions<TaskDetail>) => {
    void (async () => {
      if (!detail) {
        onError(new Error("Task details are not available."));
        return;
      }
      try {
        const next = await api.tasks.createAttachment(
          organizationId,
          projectId,
          detail.task.id,
          {
            contentBase64: await fileToBase64(file),
            contentType: file.type || "application/octet-stream",
            name: file.name,
          },
        );
        onSuccess(next);
        applyDetail(next);
      } catch (reason) {
        const error =
          reason instanceof Error
            ? reason
            : new Error("Could not upload attachment.");
        setSaveError(error);
        onError(error);
      }
    })();
  };

  const removeAttachment = async (
    file: UploadFile<TaskDetail>,
  ): Promise<boolean> => {
    if (!detail) return false;
    if (!detail.attachments.some((attachment) => attachment.id === file.uid))
      return true;
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
    statuses.find((status) =>
      /^(done|complete|completed)$/i.test(status.name),
    ) ?? statuses.at(-1);
  const completedSubtasks =
    detail?.subtasks.filter(
      (subtask) => subtask.statusId === completedStatus?.id,
    ).length ?? 0;
  const subtaskProgress = detail?.subtasks.length
    ? Math.round((completedSubtasks / detail.subtasks.length) * 100)
    : 0;
  const visibleComments = detail?.comments.slice(0, visibleCommentCount) ?? [];
  const visibleActivity =
    detail?.activity.filter((item) => !item.operation.startsWith("comment.")) ?? [];
  const renderSubtaskRow = (subtask: TaskView) => {
    const complete = subtask.statusId === completedStatus?.id;
    const isEditing = editingSubtaskId === subtask.id;
    return (
      <div className="task-detail-subtask" key={subtask.id}>
        {isEditing ? (
          <div className="task-detail-subtask-editor">
            <Input
              autoFocus
              maxLength={500}
              onChange={(event) => setEditingSubtaskTitle(event.target.value)}
              onPressEnter={() => void saveSubtaskTitle(subtask)}
              value={editingSubtaskTitle}
            />
            <Space size={8}>
              <Button
                disabled={editingSubtaskTitle.trim().length === 0}
                loading={savingSubtask}
                onClick={() => void saveSubtaskTitle(subtask)}
                size="small"
              >
                Save
              </Button>
              <Button
                disabled={savingSubtask}
                onClick={() => {
                  setEditingSubtaskId(undefined);
                  setEditingSubtaskTitle("");
                }}
                size="small"
                variant="text"
              >
                Cancel
              </Button>
            </Space>
          </div>
        ) : (
          <>
            <Checkbox
              checked={complete}
              disabled={archived}
              onChange={(event) =>
                void toggleSubtask(subtask, event.target.checked)
              }
            >
              <Typography.Text delete={complete}>
                {subtask.title}
              </Typography.Text>
            </Checkbox>
            <div className="task-detail-subtask-actions">
              {subtask.assigneeUserIds.includes(currentUserId) ? (
                <Avatar size={20}>
                  {currentUserName.slice(0, 1).toUpperCase()}
                </Avatar>
              ) : null}
              <Button
                aria-label={`Edit ${subtask.title}`}
                disabled={archived}
                icon={<EditOutlined />}
                iconOnly
                onClick={() => {
                  setEditingSubtaskId(subtask.id);
                  setEditingSubtaskTitle(subtask.title);
                }}
                size="small"
                variant="text"
              />
              <Button
                aria-label={`Delete ${subtask.title}`}
                color="danger"
                disabled={archived}
                icon={<DeleteOutlined />}
                iconOnly
                onClick={() => setSubtaskDeleteTarget(subtask)}
                size="small"
                variant="text"
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const renderSubtaskComposer = () =>
    subtaskComposerOpen ? (
      <div className="task-detail-subtask-composer">
        <Input
          autoFocus
          maxLength={500}
          onChange={(event) => setSubtaskTitle(event.target.value)}
          onPressEnter={() => void createSubtask()}
          placeholder="Task name"
          value={subtaskTitle}
        />
        <Space className="task-detail-subtask-composer-actions" size={8}>
          <Button
            disabled={subtaskTitle.trim().length === 0}
            loading={creatingSubtask}
            onClick={() => void createSubtask()}
            size="small"
          >
            Add task
          </Button>
          <Button
            disabled={creatingSubtask}
            onClick={() => {
              setSubtaskComposerOpen(false);
              setSubtaskTitle("");
            }}
            size="small"
            variant="text"
          >
            Cancel
          </Button>
        </Space>
      </div>
    ) : (
      <Button
        className="task-detail-add-subtask"
        disabled={archived}
        icon={<AddIcon />}
        onClick={() => {
          setSubtaskTitle("");
          setSubtaskComposerOpen(true);
        }}
        variant="text"
      >
        Add task
      </Button>
    );
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
        title={
          loadError instanceof Error
            ? loadError.message
            : "Could not load the task."
        }
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
            title={
              saveError instanceof Error
                ? saveError.message
                : "Could not save the task."
            }
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
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
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
              <span
                aria-hidden
                className="task-detail-meta-icon task-detail-status-icon"
              />
              Status
            </div>
            {editing ? (
              <Select
                ariaLabel="Task status"
                className="task-detail-field"
                disabled={saving}
                onChange={(value) => {
                  if (typeof value === "string")
                    setDraft({ ...draft, statusId: value });
                }}
                options={statusOptions}
                style={taskDetailFieldStyle}
                value={draft.statusId}
              />
            ) : (
              <div className="task-detail-meta-value task-detail-tag-value">
                <Tag
                  color={selectedStatus?.color ?? "default"}
                  style={taskDetailTagStyle}
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
                  setDraft({
                    ...draft,
                    dueDate: value instanceof Date ? value : null,
                  })
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
                    ? value.filter(
                        (userId): userId is string =>
                          typeof userId === "string",
                      )
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
                      {userId === currentUserId
                        ? currentUserName.slice(0, 1).toUpperCase()
                        : "M"}
                    </Avatar>
                  ))}
                </Avatar.Group>
                <Typography.Text>
                  {detail.task.assigneeUserIds
                    .map((userId) =>
                      userId === currentUserId
                        ? currentUserName
                        : "Organization member",
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
                  setDraft({
                    ...draft,
                    teamId: typeof value === "string" ? value : undefined,
                  })
                }
                options={teamOptions}
                placeholder="No team"
                style={taskDetailFieldStyle}
                value={draft.teamId}
              />
            ) : selectedTeam ? (
              <div className="task-detail-meta-value task-detail-tag-value">
                <Tag
                  color={
                    teamTagColors[selectedTeamIndex % teamTagColors.length] ??
                    "blue"
                  }
                  style={taskDetailTagStyle}
                >
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
                  if (
                    value === "low" ||
                    value === "medium" ||
                    value === "high"
                  ) {
                    setDraft({ ...draft, priority: value });
                  }
                }}
                options={priorityOptions}
                style={taskDetailFieldStyle}
                value={draft.priority}
              />
            ) : (
              <div className="task-detail-meta-value task-detail-tag-value">
                <Tag
                  color={priorityPresentation[detail.task.priority].color}
                  style={taskDetailTagStyle}
                >
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
          <div
            className="task-detail-section-label"
            id="task-detail-description-label"
          >
            <FileTextOutlined />
            Description
          </div>
          {editing ? (
            <Input.TextArea
              autoSize={{ maxRows: 12, minRows: 3 }}
              disabled={saving}
              maxLength={100_000}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
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
          <div
            className="task-detail-section-label"
            id="task-detail-attachments-label"
          >
            <PaperClipOutlined /> Attachments (
            {
              detail.attachments.filter((attachment) => !attachment.commentId)
                .length
            }
            )
          </div>
          <Upload<TaskDetail>
            beforeUpload={(file) => {
              if (file.size <= maximumAttachmentBytes) return true;
              setSaveError(
                new TypeError("Attachments must be 5 MB or smaller."),
              );
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
            styles={{
              list: { order: 1 },
              root: { display: "flex", flexDirection: "column", width: "100%" },
              trigger: { alignSelf: "start", marginTop: 8, order: 2 },
            }}
            showUploadList={{
              extra: (file) =>
                file.size === undefined ? null : formatFileSize(file.size),
              showDownloadIcon: (file) =>
                file.status === "done" &&
                detail.attachments.some(
                  (attachment) => attachment.id === file.uid,
                ),
              showPreviewIcon: (file) =>
                file.status === "done" && isImageAttachment(file),
              showRemoveIcon: !archived,
            }}
          >
            <Button
              className="task-detail-add-attachment"
              disabled={archived}
              icon={<AddIcon />}
              size="small"
              variant="dashed"
              style={{ borderColor: "rgba(0, 0, 0, 0.3)" }}
            >
              Add attachment
            </Button>
          </Upload>
        </section>
      </div>

      <Tabs
        activeKey={activeDetailTab}
        className="task-detail-tabs"
        onChange={(key) => {
          setActiveDetailTab(key);
          if (key === "comments") markCommentsSeen();
        }}
        styles={{
          body: { padding: "20px 28px 28px" },
          header: { padding: "0 28px" },
        }}
        items={[
          {
            key: "subtasks",
            label: "Subtasks",
            children: (
              <section className="task-detail-tab-panel" aria-label="Subtasks">
                <div className="task-detail-subtask-heading">
                  <span className="task-detail-section-label">
                    <CheckSquareOutlined /> Subtasks
                  </span>
                  <div className="task-detail-subtask-progress">
                    <Progress
                      percent={subtaskProgress}
                      showInfo={false}
                      size={18}
                      type="circle"
                    />
                    <Typography.Text type="secondary">
                      {completedSubtasks}/{detail.subtasks.length}
                    </Typography.Text>
                  </div>
                </div>

                <div className="task-detail-subtask-list">
                  {detail.subtasks.map(renderSubtaskRow)}
                  {!archived ? renderSubtaskComposer() : null}
                </div>
              </section>
            ),
          },
          {
            key: "comments",
            label: (
              <span className="task-detail-tab-label">
                Comments
                {unreadCommentCount > 0 ? (
                  <Tag color="red" variant="solid">
                    {unreadCommentCount}
                  </Tag>
                ) : null}
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
                            file.size === undefined
                              ? null
                              : formatFileSize(file.size),
                          showDownloadIcon: false,
                          showPreviewIcon: false,
                          showRemoveIcon: true,
                        }}
                        styles={{
                          item: {
                            background: "var(--launch-color-bg-subtle)",
                            border:
                              "1px solid var(--launch-color-border-secondary)",
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
                      footer={
                        <>
                          <Popover
                            arrow={false}
                            destroyOnHidden
                            content={
                              <EmojiPicker
                                height={350}
                                lazyLoadEmojis
                                onSelect={(emoji) => insertEmoji(emoji)}
                                previewConfig={{ showPreview: false }}
                                width={300}
                              />
                            }
                            onOpenChange={setEmojiOpen}
                            open={emojiOpen}
                            placement="topRight"
                            styles={{ content: { padding: 0 } }}
                            trigger="click"
                          >
                            <Button
                              aria-label="Add emoji"
                              icon={<SmileOutlined />}
                              iconOnly
                              onPointerDown={() => {
                                const input =
                                  commentInputRef.current?.nativeElement;
                                if (!input) return;
                                commentSelectionRef.current = {
                                  end: input.selectionEnd,
                                  start: input.selectionStart,
                                };
                              }}
                              size="small"
                              variant="text"
                            />
                          </Popover>
                          <Upload<TaskDetail>
                            beforeUpload={(file) => {
                              if (file.size <= maximumAttachmentBytes)
                                return false;
                              setSaveError(
                                new TypeError(
                                  "Attachments must be 5 MB or smaller.",
                                ),
                              );
                              return Upload.LIST_IGNORE;
                            }}
                            className="task-detail-comment-attach"
                            fileList={commentFiles}
                            maxCount={20}
                            multiple
                            onChange={({ fileList }) =>
                              setCommentFiles(fileList)
                            }
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
                            color="primary"
                            disabled={comment.trim().length === 0}
                            icon={<EnterOutlined />}
                            iconPlacement="end"
                            loading={postingComment}
                            onClick={() => void createComment()}
                            size="small"
                            variant="primary"
                          >
                            Comment
                          </Button>
                        </>
                      }
                      key={commentComposerRevision}
                      maxLength={20_000}
                      onBlur={(event) => {
                        commentSelectionRef.current = {
                          end: event.currentTarget.selectionEnd,
                          start: event.currentTarget.selectionStart,
                        };
                      }}
                      onChange={setComment}
                      onPressEnter={(event) => {
                        if (event.shiftKey || event.nativeEvent.isComposing)
                          return;
                        event.preventDefault();
                        if (comment.trim().length > 0) void createComment();
                      }}
                      options={mentionOptions}
                      placeholder="Type comment"
                      ref={commentInputRef}
                      styles={{
                        root: { borderColor: "transparent", boxShadow: "none" },
                      }}
                      value={comment}
                      variant="borderless"
                    />
                  </div>
                ) : null}
                {detail.comments.length > 0 ? (
                  <div className="task-detail-comment-list">
                    {visibleComments.map((item) => {
                      const authorName = memberName(item.authorUserId);
                      const ownsComment = item.authorUserId === currentUserId;
                      const commentAttachmentFiles = detail.attachments
                        .filter(
                          (attachment) => attachment.commentId === item.id,
                        )
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
                              <Avatar size={20}>
                                {authorName.slice(0, 1).toUpperCase()}
                              </Avatar>
                              <Typography.Text strong>
                                {authorName}
                              </Typography.Text>
                              <Typography.Text
                                className="task-detail-comment-date"
                                style={{
                                  color:
                                    "var(--launch-color-text-tertiary, rgba(0, 0, 0, 0.45))",
                                }}
                              >
                                {detailDateTime.format(
                                  new Date(item.createdAt),
                                )}
                              </Typography.Text>
                            </div>
                            <Dropdown
                              destroyOnHidden
                              menu={{
                                items: menuItems,
                                onClick: ({ key }) => {
                                  if (key === "edit") startEditingComment(item);
                                  if (key === "delete")
                                    setCommentDeleteTarget(item);
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
                          {commentAttachmentFiles.length > 0 ? (
                            <Upload<TaskDetail>
                              className="task-detail-comment-files"
                              disabled
                              fileList={commentAttachmentFiles}
                              maxCount={0}
                              onDownload={(file) =>
                                void downloadAttachment(file)
                              }
                              onPreview={(file) => void previewAttachment(file)}
                              showUploadList={{
                                extra: (file) =>
                                  file.size === undefined
                                    ? null
                                    : formatFileSize(file.size),
                                showDownloadIcon: true,
                                showPreviewIcon: (file) =>
                                  isImageAttachment(file),
                                showRemoveIcon: false,
                              }}
                              styles={{
                                item: {
                                  background: "var(--launch-color-bg-subtle)",
                                  border:
                                    "1px solid var(--launch-color-border-secondary)",
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
                                  disabled={
                                    editingCommentBody.trim().length === 0
                                  }
                                  loading={postingComment}
                                  onClick={() => void saveEditedComment(item)}
                                  size="small"
                                >
                                  Save
                                </Button>
                              </Space>
                            </div>
                          ) : (
                            <Typography.Paragraph>
                              {renderCommentBody(
                                item.body,
                                mentionOptions.map((option) => option.value),
                              )}
                            </Typography.Paragraph>
                          )}
                          <div className="task-detail-comment-reactions">
                            {item.reactions.map((reaction) => {
                              const pendingKey = `${item.id}:${reaction.emoji}`;
                              return (
                                <Button
                                  aria-label={`${reaction.reactedByCurrentUser ? "Remove" : "Add"} ${reaction.emoji} reaction`}
                                  aria-pressed={reaction.reactedByCurrentUser}
                                  className={
                                    reaction.reactedByCurrentUser
                                      ? "task-detail-comment-reaction is-selected"
                                      : "task-detail-comment-reaction"
                                  }
                                  disabled={pendingReaction !== undefined}
                                  key={reaction.emoji}
                                  loading={pendingReaction === pendingKey}
                                  onClick={() =>
                                    void setCommentReaction(
                                      item,
                                      reaction.emoji,
                                      !reaction.reactedByCurrentUser,
                                    )
                                  }
                                  size="small"
                                >
                                  <span aria-hidden>{reaction.emoji}</span>
                                  <span>{reaction.count}</span>
                                </Button>
                              );
                            })}
                            <Popover
                              arrow={false}
                              destroyOnHidden
                              content={
                                <EmojiPicker
                                  allowExpandReactions
                                  mode="reactions"
                                  onSelect={(emoji) =>
                                    void setCommentReaction(item, emoji, true)
                                  }
                                  previewConfig={{ showPreview: false }}
                                  width={300}
                                />
                              }
                              onOpenChange={(open) =>
                                setReactionPickerCommentId(
                                  open ? item.id : undefined,
                                )
                              }
                              open={reactionPickerCommentId === item.id}
                              placement="topLeft"
                              styles={{ content: { padding: 0 } }}
                              trigger="click"
                            >
                              <Button
                                aria-label={`Add reaction to comment by ${authorName}`}
                                className="task-detail-comment-reaction-add"
                                disabled={pendingReaction !== undefined}
                                icon={<SmileOutlined />}
                                iconOnly
                                size="small"
                              />
                            </Popover>
                          </div>
                        </article>
                      );
                    })}
                    {visibleCommentCount < detail.comments.length ? (
                      <div className="task-load-more">
                        <Button
                          onClick={() =>
                            setVisibleCommentCount((current) => current + 10)
                          }
                        >
                          Load more comments
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Empty
                    description="No comments yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </section>
            ),
          },
          {
            key: "activity",
            label: "Activities",
            children: (
              <section
                className="task-detail-tab-panel"
                aria-label="Activities"
              >
                {visibleActivity.length > 0 ? (
                  <Timeline
                    items={visibleActivity.map((item) => ({
                      content: `${item.actorUserId === currentUserId ? currentUserName : "An organization member"} ${activityText(item.operation, item.metadata, statuses)}.`,
                      key: item.id,
                      title: detailDateTime.format(new Date(item.occurredAt)),
                    }))}
                    titleSpan={140}
                  />
                ) : (
                  <Empty
                    description="No activity yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
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
      {messageHolder}
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
              <Button
                aria-label="Copy task URL"
                className="task-detail-header-action"
                icon={<LinkOutlined style={taskDetailHeaderIconStyle} />}
                iconOnly
                onClick={() => void copyTaskUrl()}
                variant="text"
              />
              {!archived ? (
                <Button
                  aria-label="Edit task"
                  className="task-detail-header-action"
                  icon={<EditOutlined style={taskDetailHeaderIconStyle} />}
                  iconOnly
                  onClick={startEditing}
                  variant="text"
                />
              ) : null}
              <Button
                aria-label="Delete task"
                className="task-detail-header-action"
                color="danger"
                icon={<DeleteOutlined style={taskDetailHeaderIconStyle} />}
                iconOnly
                onClick={() => setDeleteConfirmOpen(true)}
                variant="text"
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
          Delete this comment and its attached files? This action cannot be
          undone.
        </Typography.Paragraph>
      </Modal>

      <Modal
        cancelButtonProps={{ disabled: deletingSubtask }}
        centered
        confirmLoading={deletingSubtask}
        destroyOnHidden
        okButtonProps={{ danger: true }}
        okText="Delete subtask"
        onCancel={() => setSubtaskDeleteTarget(undefined)}
        onOk={() => void deleteSubtask()}
        open={subtaskDeleteTarget !== undefined}
        title="Delete subtask?"
      >
        <Typography.Paragraph>
          Delete {subtaskDeleteTarget?.title ?? "this subtask"}? This action
          cannot be undone.
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
          Delete {detail?.task.title ?? "this task"}? Its history will remain
          archived.
        </Typography.Paragraph>
      </Modal>
    </>
  );
}

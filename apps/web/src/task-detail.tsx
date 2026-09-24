import {
  ApiError,
  type ProjectStatusSummary,
  type TaskDetail,
  type TaskPriority,
  type TaskView,
  type TeamSummary,
} from "@launchpp/api-client";
import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  type DropdownMenuItem,
  Drawer,
  Empty,
  Input,
  Modal,
  MoreIcon,
  Progress,
  Select,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from "@launchpp/ui";
import {
  CalendarOutlined,
  DeleteOutlined,
  FlagOutlined,
  PaperClipOutlined,
  TeamOutlined,
  UserOutlined,
} from "@launchpp/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient } from "./api-client-context.js";
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
  readonly assignedToMe: boolean;
  readonly description: string;
  readonly dueDate: Date | null;
  readonly priority: TaskPriority;
  readonly statusId: string;
  readonly teamId?: string | undefined;
  readonly title: string;
}

const detailDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const teamTagColors = ["blue", "cyan", "green", "orange", "purple", "magenta"] as const;
const priorityPresentation: Record<
  TaskPriority,
  Readonly<{ color: "green" | "orange" | "red"; label: string }>
> = {
  high: { color: "red", label: "High" },
  low: { color: "green", label: "Low" },
  medium: { color: "orange", label: "Medium" },
};

function dateFromKey(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function dateKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function initialDraft(detail: TaskDetail, currentUserId: string): DetailDraft {
  return {
    assignedToMe: detail.task.assigneeUserIds.includes(currentUserId),
    description: detail.task.description,
    dueDate: dateFromKey(detail.task.dueDate),
    priority: detail.task.priority,
    statusId: detail.task.statusId,
    teamId: detail.task.teamId,
    title: detail.task.title,
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
  const [loadError, setLoadError] = useState<unknown>();
  const [saveError, setSaveError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoadError(undefined);
    try {
      const [next, nextTeams] = await Promise.all([
        api.tasks.get(organizationId, projectId, taskId),
        api.teams.list(organizationId),
      ]);
      setDetail(next);
      setDraft(initialDraft(next, currentUserId));
      setTeams(nextTeams);
    } catch (reason) {
      setLoadError(reason);
    }
  }, [api, currentUserId, projectId, taskId, organizationId]);

  useEffect(() => {
    if (!taskId) return;
    setDetail(undefined);
    setDraft(undefined);
    setSaveError(undefined);
    setComment("");
    setSubtaskTitle("");
    setDeleteConfirmOpen(false);
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

  const save = async (nextDraft: DetailDraft) => {
    if (!detail || saving || archived || nextDraft.title.trim().length === 0) return;
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
      const assigneeUserIds = nextDraft.assignedToMe
        ? [...new Set([...task.assigneeUserIds, currentUserId])]
        : task.assigneeUserIds.filter((userId) => userId !== currentUserId);
      if (!sameIds(assigneeUserIds, task.assigneeUserIds)) {
        task = await api.tasks.replaceAssignees(organizationId, projectId, task.id, {
          expectedRevision: task.revision,
          userIds: assigneeUserIds,
        });
      }
      onTaskChanged(task);
      await load();
    } catch (reason) {
      setSaveError(reason);
      if (reason instanceof ApiError && reason.status === 409) await load();
    } finally {
      setSaving(false);
    }
  };

  const commitDraft = (nextDraft: DetailDraft) => {
    setDraft(nextDraft);
    void save(nextDraft);
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
      await api.tasks.createComment(organizationId, projectId, detail.task.id, { body: comment });
      setComment("");
      await load();
    } catch (reason) {
      setSaveError(reason);
    } finally {
      setPostingComment(false);
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

  const selectedStatus = detail
    ? statuses.find((status) => status.id === detail.task.statusId)
    : undefined;
  const completedStatus =
    statuses.find((status) => /^(done|complete|completed)$/i.test(status.name)) ?? statuses.at(-1);
  const completedSubtasks =
    detail?.subtasks.filter((subtask) => subtask.statusId === completedStatus?.id).length ?? 0;
  const subtaskProgress = detail?.subtasks.length
    ? Math.round((completedSubtasks / detail.subtasks.length) * 100)
    : 0;

  const deleteMenu: readonly DropdownMenuItem[] = [
    {
      danger: true,
      icon: <DeleteOutlined />,
      key: "delete",
      label: "Delete task",
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        setDeleteConfirmOpen(true);
      },
    },
  ];

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

        <Typography.Title
          className="task-detail-heading"
          disabled={archived || saving}
          editable={{
            maxLength: 500,
            onChange: (value) => {
              const title = value.trim();
              if (!title || title === draft.title) return;
              commitDraft({ ...draft, title });
            },
            text: draft.title,
            tooltip: false,
            triggerType: ["icon"],
          }}
          level={2}
        >
          {draft.title}
        </Typography.Title>

        <div className="task-detail-meta">
          <div className="task-detail-meta-label">
            <span aria-hidden className="task-detail-meta-icon task-detail-status-icon" />
            Status
          </div>
          <Select
            ariaLabel="Task status"
            disabled={archived || saving}
            onChange={(value) => {
              if (typeof value !== "string" || value === draft.statusId) return;
              commitDraft({ ...draft, statusId: value });
            }}
            options={statusOptions}
            value={draft.statusId}
            variant="borderless"
          />

          <div className="task-detail-meta-label">
            <CalendarOutlined />
            Due date
          </div>
          <DatePicker
            allowClear
            disabled={archived || saving}
            onChange={(value) => {
              const dueDate = value instanceof Date ? value : null;
              const nextDueDate = dueDate ? dateKey(dueDate) : undefined;
              const currentDueDate = draft.dueDate ? dateKey(draft.dueDate) : undefined;
              if (nextDueDate === currentDueDate) return;
              commitDraft({ ...draft, dueDate });
            }}
            placeholder="No due date"
            value={draft.dueDate}
            variant="borderless"
          />

          <div className="task-detail-meta-label">
            <UserOutlined />
            Assignee
          </div>
          <div className="task-detail-assignee">
            {detail.task.assigneeUserIds.length > 0 ? (
              <Avatar.Group max={{ count: 4 }} size="small">
                {detail.task.assigneeUserIds.map((userId) => (
                  <Avatar key={userId}>
                    {userId === currentUserId ? currentUserName.slice(0, 1).toUpperCase() : "M"}
                  </Avatar>
                ))}
              </Avatar.Group>
            ) : (
              <Typography.Text type="secondary">Unassigned</Typography.Text>
            )}
            <Button
              disabled={archived || saving}
              icon={draft.assignedToMe ? undefined : <UserOutlined />}
              onClick={() => commitDraft({ ...draft, assignedToMe: !draft.assignedToMe })}
              size="small"
              variant="text"
            >
              {draft.assignedToMe ? "Remove me" : "Assign to me"}
            </Button>
          </div>

          <div className="task-detail-meta-label">
            <FlagOutlined />
            Priority
          </div>
          <Select
            ariaLabel="Task priority"
            disabled={archived || saving}
            onChange={(value) => {
              if (value !== "low" && value !== "medium" && value !== "high") return;
              if (value === draft.priority) return;
              commitDraft({ ...draft, priority: value });
            }}
            options={priorityOptions}
            value={draft.priority}
            variant="borderless"
          />

          <div className="task-detail-meta-label">
            <TeamOutlined />
            Team
          </div>
          <Select
            allowClear
            ariaLabel="Task team"
            disabled={archived || saving}
            notFoundContent="No teams"
            onChange={(value) => {
              const teamId = typeof value === "string" ? value : undefined;
              if (teamId === draft.teamId) return;
              commitDraft({ ...draft, teamId });
            }}
            options={teamOptions}
            placeholder="No team"
            value={draft.teamId}
            variant="borderless"
          />
        </div>

        <section
          className="task-detail-description"
          aria-labelledby="task-detail-description-label"
        >
          <div className="task-detail-section-label" id="task-detail-description-label">
            Description
          </div>
          <Typography.Paragraph
            className="task-detail-description-text"
            disabled={archived || saving}
            editable={{
              autoSize: { maxRows: 12, minRows: 3 },
              maxLength: 100_000,
              onChange: (value) => {
                if (value === draft.description) return;
                commitDraft({ ...draft, description: value });
              },
              text: draft.description,
              tooltip: false,
              triggerType: ["icon"],
            }}
            type={draft.description ? "default" : "secondary"}
          >
            {draft.description || "Add a description"}
          </Typography.Paragraph>
        </section>

        <section
          className="task-detail-attachments"
          aria-labelledby="task-detail-attachments-label"
        >
          <div className="task-detail-section-heading">
            <div className="task-detail-section-label" id="task-detail-attachments-label">
              <PaperClipOutlined /> Attachment ({detail.task.attachmentCount})
            </div>
          </div>
          {detail.task.attachmentCount > 0 ? (
            <div className="task-detail-attachment-summary">
              <PaperClipOutlined />
              <Typography.Text>
                {detail.task.attachmentCount} attached{" "}
                {detail.task.attachmentCount === 1 ? "file" : "files"}
              </Typography.Text>
            </div>
          ) : (
            <Typography.Text type="secondary">No attachments</Typography.Text>
          )}
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
                <Typography.Text strong>Comments</Typography.Text>
                {detail.comments.length > 0 ? (
                  <div className="task-detail-comment-list">
                    {detail.comments.map((item) => (
                      <article className="task-detail-comment" key={item.id}>
                        <Avatar size={24}>
                          {item.authorUserId === currentUserId
                            ? currentUserName.slice(0, 1).toUpperCase()
                            : "M"}
                        </Avatar>
                        <div>
                          <div className="task-detail-comment-meta">
                            <Typography.Text strong>
                              {item.authorUserId === currentUserId
                                ? currentUserName
                                : "Organization member"}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              {detailDateTime.format(new Date(item.createdAt))}
                            </Typography.Text>
                          </div>
                          <Typography.Paragraph>{item.body}</Typography.Paragraph>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty description="No comments yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
                {!archived ? (
                  <div className="task-detail-comment-form">
                    <Input.TextArea
                      autoSize={{ maxRows: 6, minRows: 2 }}
                      maxLength={20_000}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Write a comment"
                      value={comment}
                    />
                    <Button
                      disabled={comment.trim().length === 0}
                      loading={postingComment}
                      onClick={() => void createComment()}
                      variant="primary"
                    >
                      Send
                    </Button>
                  </div>
                ) : null}
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
          <Dropdown destroyOnHidden menu={{ items: deleteMenu }} trigger={["click"]}>
            <Button aria-label="Task actions" icon={<MoreIcon />} iconOnly variant="text" />
          </Dropdown>
        }
        mask={narrow}
        onClose={onClose}
        open={taskId !== undefined}
        placement="right"
        size={narrow ? "100%" : 680}
        styles={{ body: { padding: 0 } }}
        title={
          <div className="task-detail-breadcrumb">
            <Typography.Text type="secondary">{projectName}</Typography.Text>
            <Typography.Text type="secondary">/</Typography.Text>
            <Typography.Text type="secondary">{selectedStatus?.name ?? "Task"}</Typography.Text>
          </div>
        }
      >
        {content}
      </Drawer>

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

import {
  ApiError,
  type ProjectStatusSummary,
  type TaskDetail,
  type TaskView,
} from "@launchpp/api-client";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Select,
  Spin,
  Tag,
  Timeline,
  Typography,
} from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient } from "./api-client-context.js";

interface TaskDetailPanelProps {
  readonly archived: boolean;
  readonly currentUserId: string;
  readonly onAfterClose: () => void;
  readonly onClose: () => void;
  readonly onTaskChanged: (task: TaskView) => void;
  readonly projectId: string;
  readonly projectName: string;
  readonly statuses: readonly ProjectStatusSummary[];
  readonly taskId?: string | undefined;
  readonly workspaceId: string;
}

interface DetailDraft {
  readonly assignedToMe: boolean;
  readonly description: string;
  readonly dueDate: Date | null;
  readonly labelIds: readonly string[];
  readonly statusId: string;
  readonly title: string;
}

const detailDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

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
    labelIds: detail.task.labels.map((label) => label.id),
    statusId: detail.task.statusId,
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
    "task.archived": "archived the task",
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
  onAfterClose,
  onClose,
  onTaskChanged,
  projectId,
  projectName,
  statuses,
  taskId,
  workspaceId,
}: TaskDetailPanelProps) {
  const api = useApiClient();
  const narrow = useNarrowScreen();
  const [detail, setDetail] = useState<TaskDetail>();
  const [draft, setDraft] = useState<DetailDraft>();
  const [loadError, setLoadError] = useState<unknown>();
  const [saveError, setSaveError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [labelName, setLabelName] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [creatingSubtask, setCreatingSubtask] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoadError(undefined);
    try {
      const next = await api.tasks.get(workspaceId, projectId, taskId);
      setDetail(next);
      setDraft(initialDraft(next, currentUserId));
    } catch (reason) {
      setLoadError(reason);
    }
  }, [api, currentUserId, projectId, taskId, workspaceId]);

  useEffect(() => {
    if (!taskId) return;
    setDetail(undefined);
    setDraft(undefined);
    setSaveError(undefined);
    setComment("");
    setLabelName("");
    setSubtaskTitle("");
    void load();
  }, [load, taskId]);

  const statusOptions = useMemo(
    () => statuses.map((status) => ({ label: status.name, value: status.id })),
    [statuses],
  );
  const labelOptions = useMemo(
    () =>
      detail?.availableLabels.map((label) => ({
        label: label.name,
        value: label.id,
      })) ?? [],
    [detail],
  );

  const save = async () => {
    if (!detail || !draft || saving || archived || draft.title.trim().length === 0) return;
    setSaving(true);
    setSaveError(undefined);
    let task = detail.task;
    try {
      if (draft.statusId !== task.statusId) {
        task = await api.tasks.move(workspaceId, projectId, task.id, {
          expectedRevision: task.revision,
          statusId: draft.statusId,
        });
      }
      const nextTitle = draft.title.trim().replace(/\s+/g, " ");
      const nextDescription = draft.description.trim();
      const nextDueDate = draft.dueDate ? dateKey(draft.dueDate) : undefined;
      if (
        nextTitle !== task.title ||
        nextDescription !== task.description ||
        nextDueDate !== task.dueDate
      ) {
        task = await api.tasks.update(workspaceId, projectId, task.id, {
          ...(nextTitle === task.title ? {} : { title: nextTitle }),
          ...(nextDescription === task.description ? {} : { description: nextDescription }),
          ...(nextDueDate === task.dueDate
            ? {}
            : { dueDate: nextDueDate === undefined ? null : nextDueDate }),
          expectedRevision: task.revision,
        });
      }
      if (
        !sameIds(
          draft.labelIds,
          task.labels.map((label) => label.id),
        )
      ) {
        task = await api.tasks.replaceLabels(workspaceId, projectId, task.id, {
          expectedRevision: task.revision,
          labelIds: [...draft.labelIds],
        });
      }
      const assigneeUserIds = draft.assignedToMe
        ? [...new Set([...task.assigneeUserIds, currentUserId])]
        : task.assigneeUserIds.filter((userId) => userId !== currentUserId);
      if (!sameIds(assigneeUserIds, task.assigneeUserIds)) {
        task = await api.tasks.replaceAssignees(workspaceId, projectId, task.id, {
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

  const createSubtask = async () => {
    if (!detail || creatingSubtask || subtaskTitle.trim().length === 0) return;
    setCreatingSubtask(true);
    setSaveError(undefined);
    try {
      await api.tasks.create(workspaceId, projectId, {
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

  const createLabel = async () => {
    if (!detail || creatingLabel || labelName.trim().length === 0) return;
    setCreatingLabel(true);
    setSaveError(undefined);
    try {
      const created = await api.tasks.createLabel(workspaceId, projectId, {
        color: "#1668dc",
        name: labelName,
      });
      setDetail((current) =>
        current ? { ...current, availableLabels: [...current.availableLabels, created] } : current,
      );
      setDraft((current) =>
        current ? { ...current, labelIds: [...current.labelIds, created.id] } : current,
      );
      setLabelName("");
    } catch (reason) {
      setSaveError(reason);
    } finally {
      setCreatingLabel(false);
    }
  };

  const createComment = async () => {
    if (!detail || postingComment || comment.trim().length === 0) return;
    setPostingComment(true);
    setSaveError(undefined);
    try {
      await api.tasks.createComment(workspaceId, projectId, detail.task.id, { body: comment });
      setComment("");
      await load();
    } catch (reason) {
      setSaveError(reason);
    } finally {
      setPostingComment(false);
    }
  };

  const content = loadError ? (
    <Alert
      action={<Button onClick={() => void load()}>Retry</Button>}
      showIcon
      title={loadError instanceof Error ? loadError.message : "Could not load the task."}
      type="error"
    />
  ) : !detail || !draft ? (
    <div className="task-detail-loading">
      <Spin />
    </div>
  ) : (
    <div className="task-detail-content">
      {saveError ? (
        <Alert
          showIcon
          title={saveError instanceof Error ? saveError.message : "Could not save the task."}
          type="error"
        />
      ) : null}

      <section aria-labelledby="task-detail-properties">
        <Typography.Text type="secondary">Project · {projectName}</Typography.Text>
        <Typography.Title id="task-detail-properties" level={4}>
          Details
        </Typography.Title>
        <Form layout="vertical">
          <Form.Item label="Title" required>
            <Input
              disabled={archived || saving}
              maxLength={500}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, title: event.target.value } : current,
                )
              }
              value={draft.title}
            />
          </Form.Item>
          <div className="task-detail-property-grid">
            <Form.Item label="Status">
              <Select
                ariaLabel="Task status"
                disabled={archived || saving}
                onChange={(value) =>
                  typeof value === "string" &&
                  setDraft((current) => (current ? { ...current, statusId: value } : current))
                }
                options={statusOptions}
                value={draft.statusId}
              />
            </Form.Item>
            <Form.Item label="Due date">
              <DatePicker
                allowClear
                disabled={archived || saving}
                onChange={(value) =>
                  setDraft((current) =>
                    current
                      ? { ...current, dueDate: value instanceof Date ? value : null }
                      : current,
                  )
                }
                value={draft.dueDate}
              />
            </Form.Item>
          </div>
          <Form.Item label="Labels">
            <Select
              allowClear
              ariaLabel="Task labels"
              disabled={archived || saving}
              mode="multiple"
              onChange={(value) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        labelIds: Array.isArray(value)
                          ? value.filter((item): item is string => typeof item === "string")
                          : [],
                      }
                    : current,
                )
              }
              options={labelOptions}
              placeholder="No labels"
              value={draft.labelIds}
            />
            {!archived ? (
              <div className="task-detail-compose-row">
                <Input
                  maxLength={80}
                  onChange={(event) => setLabelName(event.target.value)}
                  onPressEnter={() => void createLabel()}
                  placeholder="Create a label"
                  value={labelName}
                />
                <Button
                  disabled={labelName.trim().length === 0}
                  loading={creatingLabel}
                  onClick={() => void createLabel()}
                >
                  Create
                </Button>
              </div>
            ) : null}
          </Form.Item>
          <Form.Item label="Assignee">
            <Checkbox
              checked={draft.assignedToMe}
              disabled={archived || saving}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, assignedToMe: event.target.checked } : current,
                )
              }
            >
              Assign to me
            </Checkbox>
          </Form.Item>
          <Form.Item label="Description">
            <Input.TextArea
              autoSize={{ maxRows: 12, minRows: 4 }}
              disabled={archived || saving}
              maxLength={100_000}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, description: event.target.value } : current,
                )
              }
              placeholder="Add a description"
              value={draft.description}
            />
          </Form.Item>
          <Button
            disabled={archived || draft.title.trim().length === 0}
            loading={saving}
            onClick={() => void save()}
            variant="primary"
          >
            Save changes
          </Button>
        </Form>
      </section>

      <Divider />
      <section aria-labelledby="task-detail-subtasks">
        <Typography.Title id="task-detail-subtasks" level={4}>
          Subtasks
        </Typography.Title>
        {detail.subtasks.length > 0 ? (
          <List
            itemRender={(subtask) => (
              <div className="task-detail-list-row">
                <Typography.Text>{subtask.title}</Typography.Text>
                <Typography.Text type="secondary">{subtask.reference}</Typography.Text>
              </div>
            )}
            items={detail.subtasks}
            rowKey="id"
          />
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

      <Divider />
      <section aria-labelledby="task-detail-comments">
        <Typography.Title id="task-detail-comments" level={4}>
          Comments
        </Typography.Title>
        {detail.comments.length > 0 ? (
          <List
            itemRender={(item) => (
              <div className="task-detail-comment">
                <div className="task-detail-comment-meta">
                  <Typography.Text strong>
                    {item.authorUserId === currentUserId ? "You" : "Workspace member"}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {detailDateTime.format(new Date(item.createdAt))}
                  </Typography.Text>
                </div>
                <Typography.Paragraph>{item.body}</Typography.Paragraph>
              </div>
            )}
            items={detail.comments}
            rowKey="id"
          />
        ) : (
          <Typography.Text type="secondary">No comments yet.</Typography.Text>
        )}
        {!archived ? (
          <div className="task-detail-comment-form">
            <Input.TextArea
              autoSize={{ maxRows: 8, minRows: 3 }}
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
              Comment
            </Button>
          </div>
        ) : null}
      </section>

      <Divider />
      <section aria-labelledby="task-detail-activity">
        <Typography.Title id="task-detail-activity" level={4}>
          Activity
        </Typography.Title>
        {detail.activity.length > 0 ? (
          <Timeline
            items={detail.activity.map((item) => ({
              content: `${item.actorUserId === currentUserId ? "You" : "A workspace member"} ${activityText(item.operation)}.`,
              key: item.id,
              title: detailDateTime.format(new Date(item.occurredAt)),
            }))}
            titleSpan={130}
          />
        ) : (
          <Typography.Text type="secondary">No activity yet.</Typography.Text>
        )}
      </section>
    </div>
  );

  const selectedStatus = detail
    ? statuses.find((status) => status.id === detail.task.statusId)
    : undefined;

  return (
    <Drawer
      afterOpenChange={(open) => {
        if (!open) onAfterClose();
      }}
      className="task-detail-drawer"
      destroyOnHidden
      extra={selectedStatus ? <Tag color={selectedStatus.color}>{selectedStatus.name}</Tag> : null}
      mask={narrow}
      onClose={onClose}
      open={taskId !== undefined}
      placement="right"
      size={narrow ? "100%" : 680}
      title={detail ? `${detail.task.reference} · ${detail.task.title}` : "Task detail"}
    >
      {content}
    </Drawer>
  );
}

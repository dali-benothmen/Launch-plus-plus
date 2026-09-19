import { ApiError, type ProjectStatusSummary, type TaskView } from "@launchpp/api-client";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Select,
  Spin,
  Table,
  type TableColumn,
  Tabs,
  Tag,
  Typography,
} from "@launchpp/ui";
import { type DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";

type ProjectView = "board" | "list";
type TaskSort = "due" | "order" | "title" | "updated";
type AssignmentFilter = "all" | "mine" | "unassigned";

interface ProjectTaskWorkspaceProps {
  readonly archived: boolean;
  readonly currentUserId: string;
  readonly projectId: string;
  readonly statuses: readonly ProjectStatusSummary[];
  readonly view: ProjectView;
  readonly workspaceId: string;
}

type TaskEditor = Readonly<{ kind: "create" }> | Readonly<{ kind: "edit"; task: TaskView }>;

interface TaskDraft {
  readonly description: string;
  readonly dueDate: Date | null;
  readonly statusId: string;
  readonly title: string;
}

const taskPageSize = 50;
const shortDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

function dateFromKey(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function dateKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function formatDate(value: number | string) {
  const date = typeof value === "number" ? new Date(value) : dateFromKey(value);
  return date ? shortDate.format(date) : String(value);
}

function taskWithDraft(task: TaskView, draft: TaskDraft): TaskView {
  const { dueDate: _dueDate, ...base } = task;
  const dueDate = draft.dueDate ? dateKey(draft.dueDate) : undefined;
  return {
    ...base,
    description: draft.description.trim(),
    ...(dueDate ? { dueDate } : {}),
    statusId: draft.statusId,
    title: draft.title.trim().replace(/\s+/g, " "),
    updatedAt: Date.now(),
  };
}

function optimisticallyMove(
  tasks: readonly TaskView[],
  taskId: string,
  statusId: string,
  beforeTaskId?: string,
) {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;
  const target = tasks
    .filter(
      (task) =>
        task.id !== taskId &&
        task.statusId === statusId &&
        task.parentTaskId === moving.parentTaskId,
    )
    .toSorted((first, second) => first.position - second.position);
  const insertionIndex = beforeTaskId
    ? Math.max(
        0,
        target.findIndex((task) => task.id === beforeTaskId),
      )
    : target.length;
  target.splice(insertionIndex, 0, { ...moving, statusId });
  const positions = new Map(target.map((task, position) => [task.id, position]));
  return tasks.map((task) => {
    const position = positions.get(task.id);
    if (position === undefined) return task;
    return { ...task, position, statusId };
  });
}

function taskError(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

export function ProjectTaskWorkspace({
  archived,
  currentUserId,
  projectId,
  statuses,
  view,
  workspaceId,
}: ProjectTaskWorkspaceProps) {
  const api = useApiClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageApi, messageHolder] = message.useMessage();
  const [tasks, setTasks] = useState<readonly TaskView[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<unknown>();
  const [movingTaskId, setMovingTaskId] = useState<string>();
  const [draggedTaskId, setDraggedTaskId] = useState<string>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [sort, setSort] = useState<TaskSort>("order");
  const [searchDraft, setSearchDraft] = useState(() => searchParams.get("q") ?? "");
  const [editor, setEditor] = useState<TaskEditor>();
  const [draft, setDraft] = useState<TaskDraft>({
    description: "",
    dueDate: null,
    statusId: statuses[0]?.id ?? "",
    title: "",
  });
  const [editorError, setEditorError] = useState<unknown>();
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(
    async (cursor?: string, background = false) => {
      if (cursor) setLoadingMore(true);
      else if (!background) setLoading(true);
      setLoadError(undefined);
      try {
        const page = await api.tasks.list(workspaceId, projectId, {
          ...(cursor ? { cursor } : {}),
          limit: taskPageSize,
        });
        setTasks((current) => {
          if (!cursor) return page.items;
          const existing = new Set(current.map((task) => task.id));
          return [...current, ...page.items.filter((task) => !existing.has(task.id))];
        });
        setNextCursor(page.nextCursor);
        return page;
      } catch (reason) {
        setLoadError(reason);
        return undefined;
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [api, projectId, workspaceId],
  );

  useEffect(() => {
    setTasks([]);
    setNextCursor(undefined);
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => setSearchDraft(searchParams.get("q") ?? ""), [searchParams]);

  const statusOptions = useMemo(
    () => statuses.map((status) => ({ label: status.name, value: status.id })),
    [statuses],
  );
  const statusById = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses],
  );
  const query = (searchParams.get("q") ?? "").trim().toLocaleLowerCase();
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (task.archivedAt !== undefined || task.parentTaskId !== undefined) return false;
      if (statusFilter !== "all" && task.statusId !== statusFilter) return false;
      if (assignmentFilter === "mine" && !task.assigneeUserIds.includes(currentUserId))
        return false;
      if (assignmentFilter === "unassigned" && task.assigneeUserIds.length > 0) return false;
      if (!query) return true;
      return `${task.reference} ${task.title} ${task.description}`
        .toLocaleLowerCase()
        .includes(query);
    });
    return filtered.toSorted((first, second) => {
      if (sort === "due") {
        if (first.dueDate && second.dueDate) return first.dueDate.localeCompare(second.dueDate);
        return first.dueDate ? -1 : second.dueDate ? 1 : 0;
      }
      if (sort === "title") return first.title.localeCompare(second.title);
      if (sort === "updated") return second.updatedAt - first.updatedAt;
      if (first.statusId === second.statusId) return first.position - second.position;
      return (
        (statusById.get(first.statusId)?.position ?? 0) -
        (statusById.get(second.statusId)?.position ?? 0)
      );
    });
  }, [assignmentFilter, currentUserId, query, sort, statusById, statusFilter, tasks]);

  const closeEditor = () => {
    setEditor(undefined);
    setEditorError(undefined);
    setSaving(false);
  };

  const openCreate = (statusId = statuses[0]?.id ?? "") => {
    setDraft({ description: "", dueDate: null, statusId, title: "" });
    setEditorError(undefined);
    setEditor({ kind: "create" });
  };

  const openEdit = (task: TaskView) => {
    setDraft({
      description: task.description,
      dueDate: dateFromKey(task.dueDate),
      statusId: task.statusId,
      title: task.title,
    });
    setEditorError(undefined);
    setEditor({ kind: "edit", task });
  };

  const moveTask = async (task: TaskView, statusId: string, beforeTaskId?: string) => {
    if (movingTaskId || archived) return;
    const snapshot = tasks;
    setMovingTaskId(task.id);
    setTasks(optimisticallyMove(tasks, task.id, statusId, beforeTaskId));
    try {
      await api.tasks.move(workspaceId, projectId, task.id, {
        ...(beforeTaskId ? { beforeTaskId } : {}),
        expectedRevision: task.revision,
        statusId,
      });
      await loadTasks(undefined, true);
    } catch (reason) {
      setTasks(snapshot);
      messageApi.error(
        reason instanceof ApiError && reason.status === 409
          ? "This task changed elsewhere. The latest version has been restored."
          : taskError(reason, "Could not move the task."),
      );
      await loadTasks(undefined, true);
    } finally {
      setMovingTaskId(undefined);
      setDraggedTaskId(undefined);
    }
  };

  const saveTask = async () => {
    if (!editor || saving || draft.title.trim().length === 0 || !draft.statusId) return;
    setSaving(true);
    setEditorError(undefined);
    if (editor.kind === "create") {
      try {
        const created = await api.tasks.create(workspaceId, projectId, {
          description: draft.description,
          ...(draft.dueDate ? { dueDate: dateKey(draft.dueDate) } : {}),
          statusId: draft.statusId,
          title: draft.title,
        });
        setTasks((current) => [...current, created]);
        closeEditor();
        messageApi.success(`${created.reference} created.`);
      } catch (reason) {
        setEditorError(reason);
        setSaving(false);
      }
      return;
    }

    const original = editor.task;
    const snapshot = tasks;
    const optimistic = taskWithDraft(original, draft);
    setTasks((current) => current.map((task) => (task.id === original.id ? optimistic : task)));
    try {
      const nextDueDate = draft.dueDate ? dateKey(draft.dueDate) : undefined;
      const nextTitle = draft.title.trim().replace(/\s+/g, " ");
      const nextDescription = draft.description.trim();
      const updates = {
        ...(nextTitle === original.title ? {} : { title: nextTitle }),
        ...(nextDescription === original.description ? {} : { description: nextDescription }),
        ...(nextDueDate === original.dueDate
          ? {}
          : { dueDate: nextDueDate === undefined ? null : nextDueDate }),
      };
      let updated = original;
      if (Object.keys(updates).length > 0) {
        updated = await api.tasks.update(workspaceId, projectId, original.id, {
          expectedRevision: original.revision,
          ...updates,
        });
      }
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      closeEditor();
      messageApi.success(`${updated.reference} updated.`);
    } catch (reason) {
      setTasks(snapshot);
      if (reason instanceof ApiError && reason.status === 409) {
        closeEditor();
        messageApi.error("This task changed elsewhere. The latest version has been restored.");
        await loadTasks(undefined, true);
      } else {
        setEditorError(reason);
        setSaving(false);
      }
    }
  };

  const submitSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    const nextQuery = value.trim();
    if (nextQuery) next.set("q", nextQuery);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const viewControls = (
    <div className="task-view-controls">
      <Select
        ariaLabel="Filter tasks by status"
        onChange={(value) => typeof value === "string" && setStatusFilter(value)}
        options={[{ label: "All statuses", value: "all" }, ...statusOptions]}
        value={statusFilter}
      />
      <Select
        ariaLabel="Filter tasks by assignment"
        onChange={(value) =>
          typeof value === "string" && setAssignmentFilter(value as AssignmentFilter)
        }
        options={[
          { label: "All assignments", value: "all" },
          { label: "Assigned to me", value: "mine" },
          { label: "Unassigned", value: "unassigned" },
        ]}
        value={assignmentFilter}
      />
      <Select
        ariaLabel="Sort tasks"
        onChange={(value) => typeof value === "string" && setSort(value as TaskSort)}
        options={[
          { label: "Board order", value: "order" },
          { label: "Due date", value: "due" },
          { label: "Recently updated", value: "updated" },
          { label: "Title", value: "title" },
        ]}
        value={sort}
      />
      <Typography.Text type="secondary">
        {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}
      </Typography.Text>
    </div>
  );

  const loadMore = nextCursor ? (
    <div className="task-load-more">
      <Button loading={loadingMore} onClick={() => void loadTasks(nextCursor)}>
        Load more tasks
      </Button>
    </div>
  ) : null;
  const loadWarning =
    loadError && tasks.length > 0 ? (
      <Alert
        action={<Button onClick={() => void loadTasks(undefined, true)}>Retry</Button>}
        showIcon
        title={taskError(loadError, "Could not refresh tasks.")}
        type="warning"
      />
    ) : null;

  const boardStatuses =
    statusFilter === "all" ? statuses : statuses.filter((status) => status.id === statusFilter);
  const board = (
    <>
      {loadWarning}
      {viewControls}
      <div className="task-board-grid">
        {boardStatuses.map((status) => {
          const columnTasks = visibleTasks.filter((task) => task.statusId === status.id);
          return (
            <div
              aria-label={`${status.name} tasks`}
              key={status.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const task = tasks.find((item) => item.id === draggedTaskId);
                if (task) void moveTask(task, status.id);
              }}
              role="listbox"
            >
              <Card
                extra={
                  <div className="task-column-actions">
                    <Typography.Text type="secondary">{columnTasks.length}</Typography.Text>
                    <Button disabled={archived} onClick={() => openCreate(status.id)} size="small">
                      Add
                    </Button>
                  </div>
                }
                size="small"
                title={<Tag color={status.color}>{status.name}</Tag>}
              >
                {columnTasks.length > 0 ? (
                  <div className="task-column-list">
                    {columnTasks.map((task) => (
                      <div
                        aria-label={`Move ${task.title}`}
                        aria-selected={false}
                        className="task-card-shell"
                        draggable={!archived && sort === "order" && movingTaskId === undefined}
                        key={task.id}
                        onDragEnd={() => setDraggedTaskId(undefined)}
                        onDragStart={(event: DragEvent<HTMLDivElement>) => {
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedTaskId(task.id);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const dragged = tasks.find((item) => item.id === draggedTaskId);
                          if (dragged && dragged.id !== task.id) {
                            void moveTask(dragged, status.id, task.id);
                          }
                        }}
                        role="option"
                        tabIndex={0}
                        title={sort === "order" ? "Drag to reorder" : "Use board order to drag"}
                      >
                        <Card
                          extra={
                            <Button
                              disabled={archived}
                              onClick={() => openEdit(task)}
                              size="small"
                              variant="link"
                            >
                              Edit
                            </Button>
                          }
                          size="small"
                          title={task.title}
                        >
                          <div className="task-card-content">
                            <Typography.Text type="secondary">{task.reference}</Typography.Text>
                            {task.dueDate ? (
                              <Typography.Text type="secondary">
                                Due {formatDate(task.dueDate)}
                              </Typography.Text>
                            ) : null}
                            {task.labels.length > 0 ? (
                              <div className="task-card-meta">
                                {task.labels.map((label) => (
                                  <Tag color={label.color} key={label.id}>
                                    {label.name}
                                  </Tag>
                                ))}
                              </div>
                            ) : null}
                            <Select
                              ariaLabel={`Move ${task.title}`}
                              disabled={archived || movingTaskId !== undefined}
                              onChange={(value) => {
                                if (typeof value === "string" && value !== task.statusId) {
                                  void moveTask(task, value);
                                }
                              }}
                              options={statusOptions}
                              size="small"
                              value={task.statusId}
                            />
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="No tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </div>
          );
        })}
      </div>
      {loadMore}
    </>
  );

  const columns: ReadonlyArray<TableColumn<TaskView>> = [
    {
      dataIndex: "reference",
      key: "reference",
      title: "ID",
      width: 100,
    },
    {
      dataIndex: "title",
      key: "title",
      render: (_value, task) => (
        <Button disabled={archived} onClick={() => openEdit(task)} variant="link">
          {task.title}
        </Button>
      ),
      title: "Task",
    },
    {
      key: "status",
      render: (_value, task) => (
        <Select
          ariaLabel={`Status for ${task.title}`}
          disabled={archived || movingTaskId !== undefined}
          onChange={(value) => {
            if (typeof value === "string" && value !== task.statusId) void moveTask(task, value);
          }}
          options={statusOptions}
          size="small"
          value={task.statusId}
        />
      ),
      title: "Status",
      width: 170,
    },
    {
      key: "assignee",
      render: (_value, task) =>
        task.assigneeUserIds.includes(currentUserId)
          ? "Me"
          : task.assigneeUserIds.length > 0
            ? `${task.assigneeUserIds.length} members`
            : "Unassigned",
      title: "Assignee",
      width: 120,
    },
    {
      dataIndex: "dueDate",
      key: "dueDate",
      render: (_value, task) => (task.dueDate ? formatDate(task.dueDate) : "—"),
      title: "Due",
      width: 110,
    },
    {
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (_value, task) => formatDate(task.updatedAt),
      title: "Updated",
      width: 110,
    },
  ];
  const list = (
    <>
      {loadWarning}
      {viewControls}
      <Table
        columns={columns}
        dataSource={visibleTasks}
        locale={{
          emptyText: <Empty description="No tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
        pagination={false}
        rowKey="id"
        scroll={{ x: 760 }}
        size="small"
      />
      {loadMore}
    </>
  );

  const content = loading ? (
    <div className="task-state">
      <Spin />
    </div>
  ) : loadError && tasks.length === 0 ? (
    <div className="task-state">
      <Alert
        action={<Button onClick={() => void loadTasks()}>Retry</Button>}
        showIcon
        title={taskError(loadError, "Could not load tasks.")}
        type="error"
      />
    </div>
  ) : null;

  return (
    <>
      {messageHolder}
      <Tabs
        activeKey={view}
        ariaLabel="Project views"
        items={[
          { children: content ?? board, key: "board", label: "Board" },
          { children: content ?? list, key: "list", label: "List" },
        ]}
        onChange={(nextView) => {
          const parameters = searchParams.toString();
          navigate(
            `/app/workspaces/${workspaceId}/projects/${projectId}/${nextView}${parameters ? `?${parameters}` : ""}`,
          );
        }}
        tabBarExtraContent={
          <div className="task-header-actions">
            <Input.Search
              allowClear
              aria-label="Search project tasks"
              className="task-search"
              onChange={(event) => setSearchDraft(event.target.value)}
              onSearch={submitSearch}
              placeholder="Search tasks"
              value={searchDraft}
            />
            <Button
              disabled={archived || statuses.length === 0}
              onClick={() => openCreate()}
              variant="primary"
            >
              New task
            </Button>
          </div>
        }
      />

      <Modal
        confirmLoading={saving}
        destroyOnHidden
        okButtonProps={{ disabled: draft.title.trim().length === 0 || !draft.statusId }}
        okText={editor?.kind === "edit" ? "Save task" : "Create task"}
        onCancel={closeEditor}
        onOk={() => void saveTask()}
        open={editor !== undefined}
        title={editor?.kind === "edit" ? `Edit ${editor.task.reference}` : "Create task"}
      >
        {editorError ? (
          <Alert showIcon title={taskError(editorError, "Could not save the task.")} type="error" />
        ) : null}
        <Form layout="vertical" onFinish={saveTask}>
          <Form.Item label="Title" required>
            <Input
              autoFocus
              disabled={saving}
              maxLength={500}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              value={draft.title}
            />
          </Form.Item>
          <Form.Item label="Description">
            <Input.TextArea
              autoSize={{ maxRows: 8, minRows: 3 }}
              disabled={saving}
              maxLength={100_000}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              value={draft.description}
            />
          </Form.Item>
          {editor?.kind === "create" ? (
            <Form.Item label="Status">
              <Select
                ariaLabel="Task status"
                disabled={saving}
                onChange={(value) =>
                  typeof value === "string" &&
                  setDraft((current) => ({ ...current, statusId: value }))
                }
                options={statusOptions}
                value={draft.statusId}
              />
            </Form.Item>
          ) : null}
          <Form.Item label="Due date">
            <DatePicker
              allowClear
              disabled={saving}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  dueDate: value instanceof Date ? value : null,
                }))
              }
              value={draft.dueDate}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

import { ApiError, type ProjectStatusSummary, type TaskView } from "@launchpp/api-client";
import {
  Alert,
  Avatar,
  BoardIcon,
  Button,
  Card,
  DatePicker,
  Dropdown,
  type DropdownMenuItem,
  Empty,
  Form,
  Input,
  ListIcon,
  Modal,
  MoreIcon,
  message,
  Select,
  Spin,
  Table,
  type TableColumn,
  Tabs,
  Tag,
  Typography,
} from "@launchpp/ui";
import {
  type DragEvent,
  Fragment,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { invalidationEventName } from "./invalidation.js";
import { openProjectCreationEvent, projectNavigationChangedEvent } from "./project-navigation.js";
import { TaskDetailPanel } from "./task-detail.js";

type ProjectView = "board" | "list";

interface ProjectTaskOrganizationProps {
  readonly archived: boolean;
  readonly currentUserId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly statuses: readonly ProjectStatusSummary[];
  readonly taskId?: string | undefined;
  readonly view: ProjectView;
  readonly organizationId: string;
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

export function ProjectTaskOrganization({
  archived,
  currentUserId,
  projectId,
  projectName,
  statuses,
  taskId,
  view,
  organizationId,
}: ProjectTaskOrganizationProps) {
  const api = useApiClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [messageApi, messageHolder] = message.useMessage();
  const [tasks, setTasks] = useState<readonly TaskView[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<unknown>();
  const [movingTaskId, setMovingTaskId] = useState<string>();
  const [draggedTaskId, setDraggedTaskId] = useState<string>();
  const [dragTarget, setDragTarget] = useState<{
    readonly beforeTaskId?: string;
    readonly statusId: string;
  }>();
  const [orderedStatusIds, setOrderedStatusIds] = useState<readonly string[]>(() =>
    statuses.map((status) => status.id),
  );
  const [draggedStatusId, setDraggedStatusId] = useState<string>();
  const [columnDropTarget, setColumnDropTarget] = useState<{
    readonly edge: "after" | "before";
    readonly statusId: string;
  }>();
  const [collapsedStatusIds, setCollapsedStatusIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [editor, setEditor] = useState<TaskEditor>();
  const [draft, setDraft] = useState<TaskDraft>({
    description: "",
    dueDate: null,
    statusId: statuses[0]?.id ?? "",
    title: "",
  });
  const [editorError, setEditorError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [columnError, setColumnError] = useState<unknown>();
  const [savingColumn, setSavingColumn] = useState(false);
  const taskOpenerRef = useRef<HTMLElement | null>(null);

  const loadTasks = useCallback(
    async (cursor?: string, background = false) => {
      if (cursor) setLoadingMore(true);
      else if (!background) setLoading(true);
      setLoadError(undefined);
      try {
        const page = await api.tasks.list(organizationId, projectId, {
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
    [api, projectId, organizationId],
  );

  useEffect(() => {
    setTasks([]);
    setNextCursor(undefined);
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setOrderedStatusIds(statuses.map((status) => status.id));
  }, [statuses]);

  useEffect(() => {
    const reload = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string; organizationId: string }>).detail;
      if (
        detail.organizationId === organizationId &&
        (!detail.projectId || detail.projectId === projectId)
      ) {
        void loadTasks(undefined, true);
      }
    };
    window.addEventListener(invalidationEventName, reload);
    return () => window.removeEventListener(invalidationEventName, reload);
  }, [loadTasks, projectId, organizationId]);

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
      if (!query) return true;
      return `${task.reference} ${task.title} ${task.description}`
        .toLocaleLowerCase()
        .includes(query);
    });
    return filtered.toSorted((first, second) => {
      if (first.statusId === second.statusId) return first.position - second.position;
      return (
        (statusById.get(first.statusId)?.position ?? 0) -
        (statusById.get(second.statusId)?.position ?? 0)
      );
    });
  }, [query, statusById, tasks]);

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

  const projectViewPath = `/app/organizations/${organizationId}/projects/${projectId}/${view}`;
  const openTask = (task: TaskView, event: ReactMouseEvent<HTMLElement>) => {
    taskOpenerRef.current = event.currentTarget;
    const parameters = searchParams.toString();
    navigate(`${projectViewPath}/tasks/${task.id}${parameters ? `?${parameters}` : ""}`);
  };

  const closeTask = () => {
    const parameters = searchParams.toString();
    navigate(`${projectViewPath}${parameters ? `?${parameters}` : ""}`);
    window.requestAnimationFrame(() => taskOpenerRef.current?.focus());
  };

  const moveTask = async (task: TaskView, statusId: string, beforeTaskId?: string) => {
    if (movingTaskId || archived) return;
    const snapshot = tasks;
    setMovingTaskId(task.id);
    setTasks(optimisticallyMove(tasks, task.id, statusId, beforeTaskId));
    try {
      await api.tasks.move(organizationId, projectId, task.id, {
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
      setDragTarget(undefined);
    }
  };

  const createColumn = async () => {
    if (!columnName.trim() || savingColumn) return;
    setSavingColumn(true);
    setColumnError(undefined);
    try {
      await api.projects.createStatus(organizationId, projectId, { name: columnName });
      setColumnModalOpen(false);
      setColumnName("");
      messageApi.success("Board column created.");
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
    } catch (reason) {
      setColumnError(reason);
    } finally {
      setSavingColumn(false);
    }
  };

  const reorderColumns = async (targetStatusId: string, edge: "after" | "before") => {
    if (!draggedStatusId || draggedStatusId === targetStatusId) {
      setDraggedStatusId(undefined);
      setColumnDropTarget(undefined);
      return;
    }
    const snapshot = orderedStatusIds;
    const next = snapshot.filter((id) => id !== draggedStatusId);
    const targetIndex = next.indexOf(targetStatusId);
    if (targetIndex < 0) return;
    next.splice(targetIndex + (edge === "after" ? 1 : 0), 0, draggedStatusId);
    setOrderedStatusIds(next);
    setColumnDropTarget(undefined);
    try {
      await api.projects.reorderStatuses(organizationId, projectId, {
        orderedStatusIds: next,
      });
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
    } catch (reason) {
      setOrderedStatusIds(snapshot);
      messageApi.error(taskError(reason, "Could not reorder the board columns."));
    } finally {
      setDraggedStatusId(undefined);
    }
  };

  const taskMenu = (task: TaskView): readonly DropdownMenuItem[] => [
    {
      key: "edit",
      label: "Edit task",
      onClick: () => openEdit(task),
    },
    {
      children: statuses
        .filter((status) => status.id !== task.statusId)
        .map((status) => ({
          key: `move-${status.id}`,
          label: status.name,
          onClick: () => void moveTask(task, status.id),
        })),
      key: "move",
      label: "Move to",
    },
  ];

  const saveTask = async () => {
    if (!editor || saving || draft.title.trim().length === 0 || !draft.statusId) return;
    setSaving(true);
    setEditorError(undefined);
    if (editor.kind === "create") {
      try {
        const created = await api.tasks.create(organizationId, projectId, {
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
        updated = await api.tasks.update(organizationId, projectId, original.id, {
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

  const boardStatuses = useMemo(() => {
    const ordered = orderedStatusIds.flatMap((id) => {
      const status = statusById.get(id);
      return status ? [status] : [];
    });
    const included = new Set(orderedStatusIds);
    return [...ordered, ...statuses.filter((status) => !included.has(status.id))];
  }, [orderedStatusIds, statusById, statuses]);
  const board = (
    <>
      {loadWarning}
      <div className="task-board-grid">
        {boardStatuses.map((status) => {
          const columnTasks = visibleTasks.filter((task) => task.statusId === status.id);
          return (
            <Card
              aria-label={`${status.name} tasks`}
              className={`task-board-column${
                draggedStatusId === status.id ? " is-column-dragging" : ""
              }${
                columnDropTarget?.statusId === status.id
                  ? ` is-column-drop-${columnDropTarget.edge}`
                  : ""
              }`}
              draggable={!archived && draggedTaskId === undefined}
              key={status.id}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggedStatusId) {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  setColumnDropTarget({
                    edge: event.clientX < bounds.left + bounds.width / 2 ? "before" : "after",
                    statusId: status.id,
                  });
                } else if (draggedTaskId) {
                  setDragTarget({ statusId: status.id });
                }
              }}
              onDragEnd={() => {
                setDraggedStatusId(undefined);
                setColumnDropTarget(undefined);
              }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                setDraggedStatusId(status.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedStatusId) {
                  const edge =
                    columnDropTarget?.statusId === status.id ? columnDropTarget.edge : "before";
                  void reorderColumns(status.id, edge);
                  return;
                }
                const task = tasks.find((item) => item.id === draggedTaskId);
                if (task) {
                  const beforeTaskId =
                    dragTarget?.statusId === status.id ? dragTarget.beforeTaskId : undefined;
                  void moveTask(task, status.id, beforeTaskId);
                }
              }}
              role="listbox"
              size="small"
              style={{ background: "var(--launch-color-bg-layout)" }}
            >
              <div className="task-board-column-content">
                <header className="task-column-header">
                  <Typography.Text>{status.name}</Typography.Text>
                  <span className="task-column-count" style={{ backgroundColor: status.color }}>
                    {columnTasks.length}
                  </span>
                  <Button
                    aria-label={`${status.name} actions`}
                    className="task-column-menu"
                    icon={<MoreIcon />}
                    iconOnly
                    size="small"
                    variant="text"
                  />
                </header>
                <div className="task-column-list">
                  {columnTasks.map((task) => (
                    <Fragment key={task.id}>
                      {dragTarget?.statusId === status.id && dragTarget.beforeTaskId === task.id ? (
                        <div aria-hidden className="task-drop-placeholder" />
                      ) : null}
                      <div
                        aria-label={`Move ${task.title}`}
                        aria-selected={false}
                        className={`task-card-shell${
                          draggedTaskId === task.id ? " is-dragging" : ""
                        }`}
                        draggable={!archived && movingTaskId === undefined}
                        onDragEnd={() => {
                          setDraggedTaskId(undefined);
                          setDragTarget(undefined);
                        }}
                        onDragStart={(event: DragEvent<HTMLDivElement>) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedTaskId(task.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (draggedTaskId) {
                            setDragTarget({ beforeTaskId: task.id, statusId: status.id });
                          }
                        }}
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
                        title="Drag to reorder"
                      >
                        <Card size="small">
                          <div className="task-card-content">
                            <div className="task-card-heading">
                              <Button
                                className="task-title-button"
                                onClick={(event) => openTask(task, event)}
                                size="small"
                                variant="link"
                              >
                                {task.title}
                              </Button>
                              <Dropdown menu={{ items: taskMenu(task) }} trigger={["click"]}>
                                <Button
                                  aria-label={`Actions for ${task.title}`}
                                  disabled={archived}
                                  icon={<MoreIcon />}
                                  iconOnly
                                  size="small"
                                  variant="text"
                                />
                              </Dropdown>
                            </div>
                            {task.description ? (
                              <Typography.Text className="task-card-description" type="secondary">
                                {task.description}
                              </Typography.Text>
                            ) : null}
                            <div className="task-card-status">
                              <Typography.Text type="secondary">{status.name}</Typography.Text>
                              <span
                                aria-hidden
                                className="task-status-line"
                                style={{ backgroundColor: status.color }}
                              />
                            </div>
                            {task.labels.length > 0 ? (
                              <div className="task-card-meta">
                                {task.labels.map((label) => (
                                  <Tag color={label.color} key={label.id}>
                                    {label.name}
                                  </Tag>
                                ))}
                              </div>
                            ) : null}
                            <div className="task-assignees">
                              <Typography.Text type="secondary">Assigned to</Typography.Text>
                              {task.assigneeUserIds.length > 0 ? (
                                <Avatar.Group max={{ count: 3 }} size="small">
                                  {task.assigneeUserIds.map((userId) => (
                                    <Avatar key={userId}>
                                      {userId === currentUserId ? "Me" : "M"}
                                    </Avatar>
                                  ))}
                                </Avatar.Group>
                              ) : (
                                <Typography.Text type="secondary">Unassigned</Typography.Text>
                              )}
                            </div>
                            <div className="task-card-summary">
                              <Typography.Text type="secondary">{task.reference}</Typography.Text>
                              {task.dueDate ? (
                                <Typography.Text type="secondary">
                                  {formatDate(task.dueDate)}
                                </Typography.Text>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </Fragment>
                  ))}
                  {dragTarget?.statusId === status.id && !dragTarget.beforeTaskId ? (
                    <div aria-hidden className="task-drop-placeholder" />
                  ) : null}
                </div>
                <Button
                  block
                  disabled={archived}
                  onClick={() => openCreate(status.id)}
                  size="small"
                  variant="dashed"
                >
                  Add task
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {loadMore}
    </>
  );

  const columns: ReadonlyArray<TableColumn<TaskView>> = [
    {
      key: "task",
      render: (_value, task) => (
        <div className="task-table-title">
          <Button onClick={(event) => openTask(task, event)} variant="link">
            {task.title}
          </Button>
          <Typography.Text type="secondary">{task.reference}</Typography.Text>
          {task.labels.map((label) => (
            <Tag color={label.color} key={label.id}>
              {label.name}
            </Tag>
          ))}
        </div>
      ),
      title: "Task",
    },
    {
      key: "assignee",
      render: (_value, task) =>
        task.assigneeUserIds.length > 0 ? (
          <Avatar.Group max={{ count: 3 }} size="small">
            {task.assigneeUserIds.map((userId) => (
              <Avatar key={userId}>{userId === currentUserId ? "Me" : "M"}</Avatar>
            ))}
          </Avatar.Group>
        ) : (
          <Typography.Text type="secondary">Unassigned</Typography.Text>
        ),
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
    {
      key: "actions",
      render: (_value, task) => (
        <Dropdown menu={{ items: taskMenu(task) }} trigger={["click"]}>
          <Button
            aria-label={`Actions for ${task.title}`}
            disabled={archived}
            icon={<MoreIcon />}
            iconOnly
            size="small"
            variant="text"
          />
        </Dropdown>
      ),
      title: "",
      width: 48,
    },
  ];

  const toggleStatusGroup = (statusId: string) => {
    setCollapsedStatusIds((current) => {
      const next = new Set(current);
      if (next.has(statusId)) next.delete(statusId);
      else next.add(statusId);
      return next;
    });
  };

  const list = (
    <>
      {loadWarning}
      <div className="task-list-groups">
        {boardStatuses.map((status) => {
          const statusTasks = visibleTasks.filter((task) => task.statusId === status.id);
          const collapsed = collapsedStatusIds.has(status.id);
          return (
            <section className="task-list-group" key={status.id}>
              <header className="task-list-group-header">
                <Button onClick={() => toggleStatusGroup(status.id)} size="small" variant="text">
                  <span aria-hidden>{collapsed ? "›" : "⌄"}</span>
                  <span className="task-status-dot" style={{ backgroundColor: status.color }} />
                  {status.name}
                </Button>
                <Typography.Text type="secondary">{statusTasks.length}</Typography.Text>
              </header>
              {collapsed ? null : (
                <>
                  <Table
                    columns={columns}
                    dataSource={statusTasks}
                    locale={{
                      emptyText: (
                        <Empty description="No tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ),
                    }}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 680 }}
                    size="small"
                  />
                  <Button
                    disabled={archived}
                    onClick={() => openCreate(status.id)}
                    size="small"
                    variant="text"
                  >
                    + Add task
                  </Button>
                </>
              )}
            </section>
          );
        })}
      </div>
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
        className="project-tabs"
        items={[
          {
            children: content ?? board,
            key: "board",
            label: (
              <span className="view-tab-label">
                <BoardIcon aria-hidden />
                Board view
              </span>
            ),
          },
          {
            children: content ?? list,
            key: "list",
            label: (
              <span className="view-tab-label">
                <ListIcon aria-hidden />
                List view
              </span>
            ),
          },
        ]}
        onChange={(nextView) => {
          const parameters = searchParams.toString();
          navigate(
            `/app/organizations/${organizationId}/projects/${projectId}/${nextView}${parameters ? `?${parameters}` : ""}`,
          );
        }}
        size="small"
        tabBarExtraContent={
          <div className="task-header-actions">
            <Button onClick={() => setColumnModalOpen(true)} size="small">
              + Add column
            </Button>
            <Button
              onClick={() => window.dispatchEvent(new Event(openProjectCreationEvent))}
              size="small"
              variant="primary"
            >
              + New project
            </Button>
          </div>
        }
      />

      <Modal
        confirmLoading={savingColumn}
        okButtonProps={{ disabled: !columnName.trim() }}
        okText="Create column"
        onCancel={() => {
          setColumnModalOpen(false);
          setColumnError(undefined);
        }}
        onOk={() => void createColumn()}
        open={columnModalOpen}
        title="Add board column"
      >
        {columnError ? (
          <Alert
            showIcon
            title={taskError(columnError, "Could not create the board column.")}
            type="error"
          />
        ) : null}
        <Form layout="vertical" onFinish={createColumn}>
          <Form.Item label="Column name" required>
            <Input
              autoFocus
              maxLength={80}
              onChange={(event) => setColumnName(event.target.value)}
              placeholder="Ready for review"
              value={columnName}
            />
          </Form.Item>
        </Form>
      </Modal>

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

      <TaskDetailPanel
        archived={archived}
        currentUserId={currentUserId}
        onAfterClose={() => taskOpenerRef.current?.focus()}
        onClose={closeTask}
        onTaskChanged={(updated) =>
          setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)))
        }
        projectId={projectId}
        projectName={projectName}
        statuses={statuses}
        taskId={taskId}
        organizationId={organizationId}
      />
    </>
  );
}

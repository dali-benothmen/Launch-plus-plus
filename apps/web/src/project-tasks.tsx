import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import {
  DragDropProvider,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  ApiError,
  type ProjectStatusSummary,
  type TaskPriority,
  type TaskView,
  type TeamSummary,
} from "@launchpp/api-client";
import {
  AddIcon,
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
  Upload,
  type UploadFile,
} from "@launchpp/ui";
import {
  CalendarOutlined,
  CommentOutlined,
  PaperClipOutlined,
  UploadOutlined,
  UserOutlined,
} from "@launchpp/ui/icons";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { invalidationEventName } from "./invalidation.js";
import { projectNavigationChangedEvent } from "./project-navigation.js";
import { TaskDetailPanel } from "./task-detail.js";

type ProjectView = "board" | "list";

interface ProjectTaskOrganizationProps {
  readonly actionsContainer?: HTMLElement | null | undefined;
  readonly archived: boolean;
  readonly currentUserId: string;
  readonly currentUserName: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly statuses: readonly ProjectStatusSummary[];
  readonly taskId?: string | undefined;
  readonly view: ProjectView;
  readonly organizationId: string;
}

type TaskEditor = Readonly<{ kind: "create" }>;
type DeleteTarget =
  | Readonly<{ kind: "task"; task: TaskView }>
  | Readonly<{ kind: "status"; status: ProjectStatusSummary; taskCount: number }>;

interface TaskDraft {
  readonly assigneeUserIds: readonly string[];
  readonly description: string;
  readonly dueDate: Date | null;
  readonly statusId: string;
  readonly priority: TaskPriority;
  readonly teamId?: string | undefined;
  readonly title: string;
}

type TaskLayout = Record<string, string[]>;

interface SortableShellProps {
  readonly children: ReactNode;
  readonly disabled: boolean;
  readonly id: string;
  readonly index: number;
  readonly label: string;
}

interface SortableTaskShellProps extends SortableShellProps {
  readonly group: string;
  readonly onOpen: (opener: HTMLDivElement) => void;
}

const taskPageSize = 50;
const shortDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const taskCardDescriptionStyle = { color: "rgb(0 0 0 / 45%)", fontSize: 13 } as const;
const taskPriorityOptions = [
  { label: <Tag color="green">Low</Tag>, value: "low" },
  { label: <Tag color="orange">Medium</Tag>, value: "medium" },
  { label: <Tag color="red">High</Tag>, value: "high" },
] as const;
const taskPriorityPresentation: Record<
  TaskPriority,
  Readonly<{ color: "green" | "orange" | "red"; label: string }>
> = {
  high: { color: "red", label: "High" },
  low: { color: "green", label: "Low" },
  medium: { color: "orange", label: "Medium" },
};
const teamTagColors = ["blue", "cyan", "green", "orange", "purple", "magenta"] as const;

function renderTeamTag(teams: readonly TeamSummary[], teamId: string | undefined) {
  if (!teamId) return null;
  const index = teams.findIndex((team) => team.id === teamId);
  const team = teams[index];
  if (!team) return null;
  return <Tag color={teamTagColors[index % teamTagColors.length] ?? "blue"}>{team.name}</Tag>;
}

const fallbackStatusColors = [
  "#faad14",
  "#1677ff",
  "#13c2c2",
  "#52c41a",
  "#fa8c16",
  "#eb2f96",
] as const;

function displayStatusColor(status: ProjectStatusSummary) {
  if (status.color.toLowerCase() !== "#8c8c8c") return status.color;
  return fallbackStatusColors[status.position % fallbackStatusColors.length] ?? "#1677ff";
}

function dateFromKey(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function dateKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function avatarInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ME";
  const initials =
    parts.length === 1 ? parts[0]?.slice(0, 2) : `${parts[0]?.[0]}${parts.at(-1)?.[0]}`;
  return (initials || "ME").toUpperCase();
}

function formatDate(value: number | string) {
  const date = typeof value === "number" ? new Date(value) : dateFromKey(value);
  return date ? shortDate.format(date) : String(value);
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

function createTaskLayout(
  statuses: readonly ProjectStatusSummary[],
  tasks: readonly TaskView[],
): TaskLayout {
  return Object.fromEntries(
    statuses.map((status) => [
      status.id,
      tasks
        .filter(
          (task) =>
            task.statusId === status.id &&
            task.archivedAt === undefined &&
            task.parentTaskId === undefined,
        )
        .toSorted((first, second) => first.position - second.position)
        .map((task) => task.id),
    ]),
  );
}

function taskLayoutsEqual(first: TaskLayout, second: TaskLayout) {
  const statusIds = new Set([...Object.keys(first), ...Object.keys(second)]);
  return [...statusIds].every((statusId) => {
    const firstTasks = first[statusId] ?? [];
    const secondTasks = second[statusId] ?? [];
    return (
      firstTasks.length === secondTasks.length &&
      firstTasks.every((taskId, index) => taskId === secondTasks[index])
    );
  });
}

function SortableColumnShell({ children, disabled, id, index, label }: SortableShellProps) {
  const sortable = useSortable({
    accept: "column",
    data: { kind: "column", label, statusId: id },
    disabled,
    id: `column:${id}`,
    index,
    transition: { duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)", idle: true },
    type: "column",
  });

  return (
    <Card
      aria-label={`${label} tasks`}
      className={`task-board-column${sortable.isDragging ? " is-column-dragging" : ""}`}
      ref={sortable.ref}
      role="listbox"
      size="small"
    >
      <div className="task-board-column-content">{children}</div>
    </Card>
  );
}

function TaskDropZone({
  children,
  disabled,
  empty,
  onAdd,
  placeholderHeight,
  statusId,
}: Readonly<{
  children: ReactNode;
  disabled: boolean;
  empty: boolean;
  onAdd: () => void;
  placeholderHeight?: number | undefined;
  statusId: string;
}>) {
  const droppable = useDroppable({
    accept: "task",
    collisionPriority: 1,
    data: { statusId },
    id: statusId,
    type: "task-container",
  });

  return (
    <div
      className={
        "task-column-list" +
        (empty ? " is-empty" : "") +
        (droppable.isDropTarget ? " is-drop-target" : "")
      }
      ref={droppable.ref}
      style={
        droppable.isDropTarget && placeholderHeight !== undefined
          ? { minHeight: placeholderHeight }
          : undefined
      }
    >
      {children}
      {empty ? (
        droppable.isDropTarget ? (
          <span className="task-column-drop-label">Drop task here</span>
        ) : (
          <Button
            block
            className="empty-column-add-task"
            disabled={disabled}
            icon={<AddIcon aria-hidden />}
            onClick={(event) => {
              event.stopPropagation();
              onAdd();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            size="large"
            variant="dashed"
          >
            Add task
          </Button>
        )
      ) : null}
    </div>
  );
}

function SortableTaskShell({
  children,
  disabled,
  group,
  id,
  index,
  label,
  onOpen,
}: SortableTaskShellProps) {
  const sortable = useSortable({
    accept: "task",
    data: { kind: "task", label, taskId: id },
    disabled,
    group,
    id,
    index,
    transition: { duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)", idle: true },
    type: "task",
  });

  return (
    <div
      aria-label={`Move ${label}`}
      aria-selected={false}
      className={`task-card-shell${sortable.isDragging ? " is-dragging" : ""}`}
      ref={sortable.ref}
      role="option"
      onClick={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("[data-launch-ui-popup]")) return;
        onOpen(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(event.currentTarget);
        }
      }}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function ProjectTaskOrganization({
  actionsContainer,
  archived,
  currentUserId,
  currentUserName,
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
  const [attachmentFiles, setAttachmentFiles] = useState<readonly UploadFile[]>([]);
  const [teams, setTeams] = useState<readonly TeamSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<unknown>();
  const [movingTaskId, setMovingTaskId] = useState<string>();
  const [orderedStatusIds, setOrderedStatusIds] = useState<readonly string[]>(() =>
    statuses.map((status) => status.id),
  );
  const [draggedTaskHeight, setDraggedTaskHeight] = useState<number>();
  const [taskLayout, setTaskLayout] = useState<TaskLayout>(() => createTaskLayout(statuses, []));
  const [collapsedStatusIds, setCollapsedStatusIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [editor, setEditor] = useState<TaskEditor>();
  const [draft, setDraft] = useState<TaskDraft>({
    description: "",
    assigneeUserIds: [currentUserId],
    dueDate: null,
    statusId: statuses[0]?.id ?? "",
    priority: "medium",
    title: "",
  });
  const [editorError, setEditorError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [columnError, setColumnError] = useState<unknown>();
  const [savingColumn, setSavingColumn] = useState(false);
  const [renamingStatus, setRenamingStatus] = useState<ProjectStatusSummary>();
  const [renameColumnName, setRenameColumnName] = useState("");
  const [columnActionError, setColumnActionError] = useState<unknown>();
  const [savingColumnAction, setSavingColumnAction] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const [deleteError, setDeleteError] = useState<unknown>();
  const [deleting, setDeleting] = useState(false);
  const taskOpenerRef = useRef<HTMLElement | null>(null);
  const pendingTaskMenuOpenRef = useRef<TaskView | undefined>(undefined);
  const suppressTaskCardOpenRef = useRef(false);
  const taskLayoutRef = useRef(taskLayout);
  const taskLayoutSnapshotRef = useRef(taskLayout);
  const dragInProgressRef = useRef(false);
  const draftRef = useRef(draft);

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

  const loadTeams = useCallback(async () => {
    try {
      setTeams(await api.teams.list(organizationId));
    } catch {
      setTeams([]);
    }
  }, [api, organizationId]);

  useEffect(() => {
    void loadTeams();
    const reload = () => void loadTeams();
    window.addEventListener(projectNavigationChangedEvent, reload);
    return () => window.removeEventListener(projectNavigationChangedEvent, reload);
  }, [loadTeams]);

  useEffect(() => {
    if (!dragInProgressRef.current) setOrderedStatusIds(statuses.map((status) => status.id));
  }, [statuses]);

  useEffect(() => {
    if (dragInProgressRef.current) return;
    const next = createTaskLayout(statuses, tasks);
    taskLayoutRef.current = next;
    setTaskLayout(next);
  }, [statuses, tasks]);

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

  const teamOptions = useMemo(
    () =>
      teams.map((team, index) => ({
        label: <Tag color={teamTagColors[index % teamTagColors.length] ?? "blue"}>{team.name}</Tag>,
        value: team.id,
      })),
    [teams],
  );
  const assigneeOptions = useMemo(
    () => [
      {
        label: (
          <span className="task-editor-assignee">
            <Avatar size={20}>{avatarInitials(currentUserName || "Me")}</Avatar>
            {currentUserName || "Me"}
          </span>
        ),
        value: currentUserId,
      },
    ],
    [currentUserId, currentUserName],
  );
  const displayStatuses = useMemo(
    () => statuses.map((status) => ({ ...status, color: displayStatusColor(status) })),
    [statuses],
  );
  const statusById = useMemo(
    () => new Map(displayStatuses.map((status) => [status.id, status])),
    [displayStatuses],
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

  const updateDraft = (next: TaskDraft) => {
    draftRef.current = next;
    setDraft(next);
  };

  const openCreate = (statusId = statuses[0]?.id ?? "") => {
    void loadTeams();
    updateDraft({
      assigneeUserIds: [currentUserId],
      description: "",
      dueDate: null,
      priority: "medium",
      statusId,
      title: "",
    });
    setAttachmentFiles([]);
    setEditorError(undefined);
    setEditor({ kind: "create" });
  };

  const projectViewPath = `/app/organizations/${organizationId}/projects/${projectId}/${view}`;
  const openTask = (task: TaskView, opener?: HTMLElement) => {
    if (opener) taskOpenerRef.current = opener;
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

  const openRenameColumn = (status: ProjectStatusSummary) => {
    setRenameColumnName(status.name);
    setColumnActionError(undefined);
    setRenamingStatus(status);
  };

  const renameColumn = async () => {
    if (!renamingStatus || !renameColumnName.trim() || savingColumnAction) return;
    setSavingColumnAction(true);
    setColumnActionError(undefined);
    try {
      const updated = await api.projects.renameStatus(
        organizationId,
        projectId,
        renamingStatus.id,
        renameColumnName,
      );
      setRenamingStatus(undefined);
      setRenameColumnName("");
      messageApi.success(`${updated.name} renamed.`);
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
    } catch (reason) {
      setColumnActionError(reason);
    } finally {
      setSavingColumnAction(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    if (
      deleteTarget.kind === "status" &&
      (deleteTarget.taskCount > 0 || displayStatuses.length <= 1)
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(undefined);
    try {
      if (deleteTarget.kind === "task") {
        await api.tasks.archive(organizationId, projectId, deleteTarget.task.id, {
          expectedRevision: deleteTarget.task.revision,
        });
        setTasks((current) => current.filter((task) => task.id !== deleteTarget.task.id));
        messageApi.success(`${deleteTarget.task.title} deleted.`);
      } else {
        await api.projects.deleteStatus(organizationId, projectId, deleteTarget.status.id);
        setOrderedStatusIds((current) =>
          current.filter((statusId) => statusId !== deleteTarget.status.id),
        );
        messageApi.success(`${deleteTarget.status.name} deleted.`);
        window.dispatchEvent(new Event(projectNavigationChangedEvent));
      }
      setDeleteTarget(undefined);
    } catch (reason) {
      setDeleteError(reason);
    } finally {
      setDeleting(false);
    }
  };

  const persistColumnOrder = async (next: readonly string[], snapshot: readonly string[]) => {
    try {
      await api.projects.reorderStatuses(organizationId, projectId, {
        orderedStatusIds: [...next],
      });
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
    } catch (reason) {
      setOrderedStatusIds(snapshot);
      messageApi.error(taskError(reason, "Could not reorder the board columns."));
    }
  };

  const columnMenu = (
    status: ProjectStatusSummary,
    taskCount: number,
  ): readonly DropdownMenuItem[] => [
    {
      key: "rename",
      label: "Rename column",
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        openRenameColumn(status);
      },
    },
    {
      danger: true,
      key: "delete",
      label: "Delete column",
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        setDeleteError(undefined);
        setDeleteTarget({ kind: "status", status, taskCount });
      },
    },
  ];

  const suppressTaskCardOpen = () => {
    suppressTaskCardOpenRef.current = true;
    window.setTimeout(() => {
      suppressTaskCardOpenRef.current = false;
    }, 0);
  };

  const handleTaskMenuOpenChange = (open: boolean) => {
    if (open) return;
    const pendingTask = pendingTaskMenuOpenRef.current;
    if (!pendingTask) return;
    pendingTaskMenuOpenRef.current = undefined;
    window.setTimeout(() => openTask(pendingTask), 250);
  };

  const taskMenu = (task: TaskView): readonly DropdownMenuItem[] => [
    {
      key: "edit",
      label: "Edit task",
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        suppressTaskCardOpen();
        pendingTaskMenuOpenRef.current = task;
      },
    },
    {
      children: displayStatuses
        .filter((status) => status.id !== task.statusId)
        .map((status) => ({
          key: `move-${status.id}`,
          label: status.name,
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            suppressTaskCardOpen();
            void moveTask(task, status.id);
          },
        })),
      key: "move",
      label: "Move to",
    },
    { type: "divider" },
    {
      danger: true,
      key: "delete",
      label: "Delete task",
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        suppressTaskCardOpen();
        setDeleteError(undefined);
        setDeleteTarget({ kind: "task", task });
      },
    },
  ];

  const saveTask = async () => {
    const currentDraft = draftRef.current;
    if (!editor || saving || !currentDraft.statusId) return;
    if (currentDraft.title.trim().length === 0) {
      setEditorError(new TypeError("A task title is required."));
      return;
    }
    setSaving(true);
    setEditorError(undefined);
    try {
      const created = await api.tasks.create(organizationId, projectId, {
        assigneeUserIds: [...currentDraft.assigneeUserIds],
        attachmentCount: attachmentFiles.length,
        description: currentDraft.description,
        ...(currentDraft.dueDate ? { dueDate: dateKey(currentDraft.dueDate) } : {}),
        priority: currentDraft.priority,
        statusId: currentDraft.statusId,
        ...(currentDraft.teamId ? { teamId: currentDraft.teamId } : {}),
        title: currentDraft.title,
      });
      setTasks((current) => [...current, created]);
      closeEditor();
      messageApi.success(`${created.reference} created.`);
    } catch (reason) {
      setEditorError(reason);
      setSaving(false);
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
    return [...ordered, ...displayStatuses.filter((status) => !included.has(status.id))];
  }, [displayStatuses, orderedStatusIds, statusById]);

  const visibleTaskById = useMemo(
    () => new Map(visibleTasks.map((task) => [task.id, task])),
    [visibleTasks],
  );

  const handleDragStart = (event: DragStartEvent) => {
    dragInProgressRef.current = true;
    taskLayoutSnapshotRef.current = taskLayoutRef.current;
    const source = event.operation.source;
    setDraggedTaskHeight(
      source?.type === "task" && source.element
        ? Math.ceil(source.element.getBoundingClientRect().height)
        : undefined,
    );
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.source?.type !== "task") return;
    setTaskLayout((current) => {
      const next = move(current, event);
      taskLayoutRef.current = next;
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    dragInProgressRef.current = false;
    setDraggedTaskHeight(undefined);
    const source = event.operation.source;
    if (!source) return;

    if (event.canceled) {
      if (source.type === "task") {
        taskLayoutRef.current = taskLayoutSnapshotRef.current;
        setTaskLayout(taskLayoutSnapshotRef.current);
      }
      return;
    }

    if (source.type === "column") {
      if (!event.operation.target) return;
      const snapshot = orderedStatusIds;
      const next = move([...snapshot], event);
      setOrderedStatusIds(next);
      void persistColumnOrder(next, snapshot);
      return;
    }

    if (source.type === "task") {
      if (taskLayoutsEqual(taskLayoutSnapshotRef.current, taskLayoutRef.current)) return;
      const taskId = String(source.id);
      const destination = Object.entries(taskLayoutRef.current).find(([, ids]) =>
        ids.includes(taskId),
      );
      const task = tasks.find((item) => item.id === taskId);
      if (!destination || !task) return;
      const [statusId, ids] = destination;
      const taskIndex = ids.indexOf(taskId);
      const beforeTaskId = ids[taskIndex + 1];
      void moveTask(task, statusId, beforeTaskId);
    }
  };

  const board = (
    <>
      {loadWarning}
      <DragDropProvider
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={(defaults) => [
          ...defaults.filter((sensor) => sensor !== PointerSensor),
          PointerSensor.configure({
            activationConstraints: [new PointerActivationConstraints.Distance({ value: 5 })],
          }),
        ]}
      >
        <div className="task-board-grid">
          {boardStatuses.map((status, statusIndex) => {
            const columnTasks = (taskLayout[status.id] ?? []).flatMap((id) => {
              const task = visibleTaskById.get(id);
              return task ? [task] : [];
            });
            return (
              <SortableColumnShell
                disabled={archived || movingTaskId !== undefined}
                id={status.id}
                index={statusIndex}
                key={status.id}
                label={status.name}
              >
                <header className="task-column-header">
                  <Typography.Text>{status.name}</Typography.Text>
                  <span className="task-column-count" style={{ backgroundColor: status.color }}>
                    {columnTasks.length}
                  </span>
                  <div className="task-column-actions">
                    <Button
                      aria-label={`Add task to ${status.name}`}
                      disabled={archived}
                      icon={<AddIcon aria-hidden />}
                      iconOnly
                      onClick={(event) => {
                        event.stopPropagation();
                        openCreate(status.id);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      size="small"
                      variant="text"
                    />
                    <Dropdown
                      destroyOnHidden
                      menu={{ items: columnMenu(status, columnTasks.length) }}
                      trigger={["click"]}
                    >
                      <Button
                        aria-label={`${status.name} actions`}
                        className="task-column-menu"
                        icon={<MoreIcon />}
                        iconOnly
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        size="small"
                        variant="text"
                      />
                    </Dropdown>
                  </div>
                </header>
                <TaskDropZone
                  disabled={archived}
                  empty={columnTasks.length === 0}
                  onAdd={() => openCreate(status.id)}
                  placeholderHeight={draggedTaskHeight}
                  statusId={status.id}
                >
                  {columnTasks.map((task, taskIndex) => (
                    <SortableTaskShell
                      disabled={archived || movingTaskId !== undefined || Boolean(query)}
                      group={status.id}
                      id={task.id}
                      index={taskIndex}
                      key={task.id}
                      label={task.title}
                      onOpen={(opener) => {
                        if (suppressTaskCardOpenRef.current) return;
                        openTask(task, opener);
                      }}
                    >
                      <Card className="task-card" size="small">
                        <div className="task-card-content">
                          <div className="task-card-topline">
                            <Tag
                              className="task-card-status-tag"
                              color={status.color}
                              icon={
                                <span
                                  aria-hidden
                                  className="task-card-status-dot"
                                  style={{ backgroundColor: status.color }}
                                />
                              }
                            >
                              {status.name}
                            </Tag>
                            <Dropdown
                              destroyOnHidden
                              menu={{ items: taskMenu(task) }}
                              onOpenChange={handleTaskMenuOpenChange}
                              trigger={["click"]}
                            >
                              <Button
                                aria-label={`Actions for ${task.title}`}
                                disabled={archived}
                                icon={<MoreIcon />}
                                iconOnly
                                onClick={(event) => {
                                  event.stopPropagation();
                                  taskOpenerRef.current = event.currentTarget;
                                }}
                                size="small"
                                variant="text"
                              />
                            </Dropdown>
                          </div>
                          <div className="task-card-copy">
                            <Typography.Text className="task-card-title">
                              {task.title}
                            </Typography.Text>
                            {task.description ? (
                              <Typography.Paragraph
                                className="task-card-description"
                                ellipsis={{ rows: 2 }}
                                style={taskCardDescriptionStyle}
                                type="secondary"
                              >
                                {task.description}
                              </Typography.Paragraph>
                            ) : null}
                          </div>
                          <div className="task-card-labels">
                            <Tag color={taskPriorityPresentation[task.priority].color}>
                              {taskPriorityPresentation[task.priority].label}
                            </Tag>
                            {renderTeamTag(teams, task.teamId)}
                          </div>
                          <div className="task-card-summary">
                            <div className="task-card-metrics">
                              {task.dueDate ? (
                                <Tag
                                  className="task-card-footer-tag"
                                  icon={<CalendarOutlined aria-hidden />}
                                  variant="outlined"
                                >
                                  {formatDate(task.dueDate)}
                                </Tag>
                              ) : null}
                              <Tag
                                aria-label={`${task.commentCount} comments`}
                                className="task-card-footer-tag"
                                icon={<CommentOutlined aria-hidden />}
                                title="Comments"
                                variant="outlined"
                              >
                                {task.commentCount}
                              </Tag>
                              <Tag
                                aria-label={`${task.attachmentCount} attachments`}
                                className="task-card-footer-tag"
                                icon={<PaperClipOutlined aria-hidden />}
                                title="Attachments"
                                variant="outlined"
                              >
                                {task.attachmentCount}
                              </Tag>
                            </div>
                            {task.assigneeUserIds.length > 0 ? (
                              <Avatar.Group max={{ count: 3 }} size={24}>
                                {task.assigneeUserIds.map((userId) => (
                                  <Avatar key={userId}>
                                    {userId === currentUserId
                                      ? avatarInitials(currentUserName)
                                      : "M"}
                                  </Avatar>
                                ))}
                              </Avatar.Group>
                            ) : (
                              <Button
                                aria-label="No assignee"
                                className="task-card-unassigned"
                                disabled
                                icon={<UserOutlined />}
                                iconOnly
                                shape="circle"
                                size="small"
                                variant="dashed"
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    </SortableTaskShell>
                  ))}
                </TaskDropZone>
              </SortableColumnShell>
            );
          })}
        </div>
      </DragDropProvider>
      {loadMore}
    </>
  );

  const columns: ReadonlyArray<TableColumn<TaskView>> = [
    {
      key: "task",
      render: (_value, task) => (
        <div className="task-table-title">
          <Button onClick={(event) => openTask(task, event.currentTarget)} variant="link">
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
        <Dropdown
          destroyOnHidden
          menu={{ items: taskMenu(task) }}
          onOpenChange={handleTaskMenuOpenChange}
          trigger={["click"]}
        >
          <Button
            aria-label={`Actions for ${task.title}`}
            disabled={archived}
            icon={<MoreIcon />}
            iconOnly
            onClick={(event) => {
              taskOpenerRef.current = event.currentTarget;
            }}
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

  const openColumnEditor = () => {
    setColumnError(undefined);
    setColumnModalOpen(true);
  };

  const navigateToView = (nextView: ProjectView) => {
    const parameters = searchParams.toString();
    navigate(
      `/app/organizations/${organizationId}/projects/${projectId}/${nextView}${parameters ? `?${parameters}` : ""}`,
    );
  };

  const actionButtons = (
    <div className="task-header-actions">
      <Button onClick={openColumnEditor} size="small">
        + Add column
      </Button>
      <Button onClick={() => openCreate()} size="small" variant="primary">
        + New task
      </Button>
    </div>
  );

  return (
    <>
      {messageHolder}
      {actionsContainer ? createPortal(actionButtons, actionsContainer) : null}
      <div className="task-view-toolbar">
        <Tabs
          activeKey={view}
          ariaLabel="Project views"
          className="project-tabs"
          classNames={{ body: "project-tabs-empty-body" }}
          items={[
            {
              key: "board",
              label: (
                <span className="view-tab-label">
                  <BoardIcon aria-hidden />
                  Board view
                </span>
              ),
            },
            {
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
            if (nextView === "board" || nextView === "list") navigateToView(nextView);
          }}
          size="small"
        />
      </div>
      <div className={"task-view-content is-" + view}>
        {content ?? (view === "board" ? board : list)}
      </div>

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
        confirmLoading={savingColumnAction}
        okButtonProps={{ disabled: !renameColumnName.trim() }}
        okText="Rename column"
        onCancel={() => {
          setRenamingStatus(undefined);
          setRenameColumnName("");
          setColumnActionError(undefined);
        }}
        onOk={() => void renameColumn()}
        open={renamingStatus !== undefined}
        title="Rename board column"
      >
        {columnActionError ? (
          <Alert
            showIcon
            title={taskError(columnActionError, "Could not rename the board column.")}
            type="error"
          />
        ) : null}
        <Form layout="vertical" onFinish={renameColumn}>
          <Form.Item label="Column name" required>
            <Input
              autoFocus
              maxLength={80}
              onChange={(event) => setRenameColumnName(event.target.value)}
              value={renameColumnName}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={deleting}
        okButtonProps={{
          danger: true,
          disabled:
            deleteTarget?.kind === "status" &&
            (deleteTarget.taskCount > 0 || displayStatuses.length <= 1),
        }}
        okText="Delete"
        onCancel={() => {
          setDeleteTarget(undefined);
          setDeleteError(undefined);
        }}
        onOk={() => void confirmDelete()}
        open={deleteTarget !== undefined}
        title={deleteTarget?.kind === "status" ? "Delete board column?" : "Delete task?"}
      >
        {deleteError ? (
          <Alert
            showIcon
            title={taskError(deleteError, "Could not delete this item.")}
            type="error"
          />
        ) : null}
        {deleteTarget?.kind === "status" ? (
          deleteTarget.taskCount > 0 ? (
            <Alert
              showIcon
              title="Move every task out of this column before deleting it."
              type="warning"
            />
          ) : displayStatuses.length <= 1 ? (
            <Alert showIcon title="A project must keep at least one board column." type="warning" />
          ) : (
            <Typography.Paragraph>
              Delete the {deleteTarget.status.name} column? This action cannot be undone.
            </Typography.Paragraph>
          )
        ) : deleteTarget?.kind === "task" ? (
          <Typography.Paragraph>
            Delete {deleteTarget.task.title}? Its history will remain archived.
          </Typography.Paragraph>
        ) : null}
      </Modal>

      <Modal
        centered
        cancelButtonProps={{ size: "large" }}
        confirmLoading={saving}
        destroyOnHidden
        footer={(actions) => (
          <div className="task-editor-footer">
            <Typography.Text type="secondary">Only the title is required</Typography.Text>
            <div className="task-editor-footer-actions">{actions}</div>
          </div>
        )}
        okButtonProps={{ size: "large" }}
        okText="Create task"
        onCancel={closeEditor}
        onOk={() => void saveTask()}
        open={editor !== undefined}
        styles={{
          body: { padding: "20px 24px" },
          container: { borderRadius: 12, padding: 0 },
          footer: {
            borderTop: "1px solid var(--launch-color-border-secondary)",
            padding: "16px 24px",
          },
          header: {
            borderBottom: "1px solid var(--launch-color-border-secondary)",
            marginBottom: 0,
            padding: "20px 24px",
          },
        }}
        title={
          <div className="task-editor-title">
            <Typography.Text strong>New task</Typography.Text>
            <div className="task-editor-context">
              <Typography.Text type="secondary">{projectName}</Typography.Text>
              <Tag color="neutral">{statusById.get(draft.statusId)?.name ?? "Task"}</Tag>
            </div>
          </div>
        }
        width={600}
      >
        {editorError ? (
          <Alert showIcon title={taskError(editorError, "Could not save the task.")} type="error" />
        ) : null}
        <Form className="task-editor-form" layout="vertical" onFinish={saveTask}>
          <Form.Item label={<span className="task-editor-label">Title</span>}>
            <Input
              autoFocus
              defaultValue={draft.title}
              disabled={saving}
              maxLength={500}
              onChange={(event) => {
                draftRef.current = { ...draftRef.current, title: event.target.value };
              }}
              placeholder="What needs to be done?"
              size="large"
              styles={{ input: { fontSize: 13 }, root: { fontSize: 13 } }}
            />
          </Form.Item>
          <Form.Item
            label={
              <span className="task-editor-label">
                Description <span className="task-editor-optional">optional</span>
              </span>
            }
          >
            <Input.TextArea
              autoSize={{ maxRows: 8, minRows: 3 }}
              defaultValue={draft.description}
              disabled={saving}
              maxLength={100_000}
              onChange={(event) => {
                draftRef.current = { ...draftRef.current, description: event.target.value };
              }}
              placeholder="Add detail, paste a link, or leave it empty — you can fill this in later."
            />
          </Form.Item>
          <Form.Item label={<span className="task-editor-label">Attachments</span>}>
            <Upload.Dragger
              beforeUpload={() => false}
              classNames={{ trigger: "task-editor-upload-trigger" }}
              disabled={saving}
              fileList={attachmentFiles}
              multiple
              onChange={({ fileList }) => setAttachmentFiles(fileList)}
              styles={{
                root: { width: "100%" },
                trigger: {
                  alignItems: "center",
                  border: "1px dashed var(--launch-color-border)",
                  borderRadius: 6,
                  display: "flex",
                  justifyContent: "center",
                  minHeight: 52,
                  padding: "0 16px",
                  textAlign: "start",
                  width: "100%",
                },
              }}
            >
              <span className="task-editor-upload-content">
                <UploadOutlined />
                <span>Add attachment</span>
                <Typography.Text type="secondary">or drop a file here</Typography.Text>
              </span>
            </Upload.Dragger>
          </Form.Item>
          <div className="task-editor-grid">
            <Form.Item label={<span className="task-editor-label">Team</span>}>
              <Select
                allowClear
                ariaLabel="Task team"
                disabled={saving}
                onChange={(value) =>
                  updateDraft({
                    ...draftRef.current,
                    teamId: typeof value === "string" ? value : undefined,
                  })
                }
                options={teamOptions}
                placeholder={teamOptions.length > 0 ? "Select team" : "No teams yet"}
                size="large"
                styles={{
                  root: { fontSize: 13 },
                  selector: { fontSize: 13, lineHeight: "20px" },
                }}
                value={draft.teamId}
              />
            </Form.Item>
            <Form.Item label={<span className="task-editor-label">Assignee</span>}>
              <Select
                allowClear
                ariaLabel="Task assignee"
                disabled={saving}
                onChange={(value) =>
                  updateDraft({
                    ...draftRef.current,
                    assigneeUserIds: typeof value === "string" ? [value] : [],
                  })
                }
                options={assigneeOptions}
                placeholder="Unassigned"
                size="large"
                styles={{
                  root: { fontSize: 13 },
                  selector: { fontSize: 13, lineHeight: "20px" },
                }}
                value={draft.assigneeUserIds[0]}
              />
            </Form.Item>
            <Form.Item label={<span className="task-editor-label">Priority</span>}>
              <Select
                ariaLabel="Task priority"
                disabled={saving}
                onChange={(value) => {
                  if (value === "low" || value === "medium" || value === "high") {
                    updateDraft({ ...draftRef.current, priority: value });
                  }
                }}
                options={taskPriorityOptions}
                size="large"
                value={draft.priority}
              />
            </Form.Item>
            <Form.Item label={<span className="task-editor-label">Due date</span>}>
              <DatePicker
                allowClear
                disabled={saving}
                onChange={(value) =>
                  updateDraft({
                    ...draftRef.current,
                    dueDate: value instanceof Date ? value : null,
                  })
                }
                placeholder="Select date"
                size="large"
                style={{ width: "100%" }}
                styles={{ input: { fontSize: 13 }, root: { fontSize: 13 } }}
                value={draft.dueDate}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <TaskDetailPanel
        archived={archived}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onAfterClose={() => taskOpenerRef.current?.focus()}
        onClose={closeTask}
        onTaskChanged={(updated) =>
          setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)))
        }
        onTaskDeleted={(deleted) => {
          setTasks((current) => current.filter((task) => task.id !== deleted.id));
          messageApi.success(`${deleted.title} deleted.`);
        }}
        projectId={projectId}
        projectName={projectName}
        statuses={displayStatuses}
        taskId={taskId}
        organizationId={organizationId}
      />
    </>
  );
}

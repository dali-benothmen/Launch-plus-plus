import {
  ApiError,
  type OrganizationContext,
  type ProjectCatalog,
  type ProjectSummary,
  type TaskView,
} from "@launchpp/api-client";
import {
  Alert,
  Button,
  Dropdown,
  type DropdownMenuItem,
  Empty,
  Form,
  Input,
  MoreIcon,
  ProjectsIcon,
  message,
  Spin,
  Table,
  type TableColumn,
  Tag,
  Typography,
} from "@launchpp/ui";
import {
  CalendarOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  CommentOutlined,
  PaperClipOutlined,
} from "@launchpp/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { invalidationEventName } from "./invalidation.js";
import { projectNavigationChangedEvent } from "./project-navigation.js";
import { ProjectTaskOrganization } from "./project-tasks.js";
import { ResourceFailure } from "./route-boundaries.js";

interface MyWorkTask {
  readonly project: ProjectSummary;
  readonly statusCategory: "active" | "backlog" | "done";
  readonly statusColor: string;
  readonly statusName: string;
  readonly statusPosition: number;
  readonly task: TaskView;
  readonly teamColor?: (typeof myTaskTeamColors)[number] | undefined;
  readonly teamName?: string | undefined;
}

interface MyWorkData {
  readonly assignedTasks: readonly MyWorkTask[];
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const myTaskTeamColors = ["blue", "cyan", "green", "orange", "purple", "magenta"] as const;
const myTaskPriorityPresentation = {
  high: { color: "red", label: "High", order: 0 },
  medium: { color: "orange", label: "Medium", order: 1 },
  low: { color: "green", label: "Low", order: 2 },
} as const;

function formatDate(value: string | number) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value);
  return dateFormatter.format(date);
}

export function MyWorkPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [data, setData] = useState<MyWorkData>();
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<ReadonlySet<string>>(new Set());
  const [loadError, setLoadError] = useState<unknown>();

  const load = useCallback(() => {
    setLoadError(undefined);
    void Promise.all([api.auth.session(), api.organizations.list({ limit: 100 })])
      .then(async ([session, context]) => {
        if (!session) throw new ApiError(401, "Your session has expired.");

        const catalogs = await Promise.all(
          context.organizations.map(async (organization) => {
            const [catalog, teams] = await Promise.all([
              api.projects.list(organization.id, { limit: 100 }),
              api.teams.list(organization.id),
            ]);
            return { catalog, organization, teams };
          }),
        );
        const projects = catalogs.flatMap(({ catalog, organization, teams }) =>
          catalog.projects
            .filter((project) => project.archivedAt === undefined)
            .map((project) => ({
              organization,
              project,
              statuses: catalog.statuses.filter((status) => status.projectId === project.id),
              teams,
            })),
        );
        const tasks = (
          await Promise.all(
            projects.map(async (entry) => {
              const statuses = new Map(entry.statuses.map((status) => [status.id, status]));
              const page = await api.tasks.list(entry.organization.id, entry.project.id, {
                limit: 100,
              });
              return page.items.flatMap((task) => {
                const status = statuses.get(task.statusId);
                if (!status || task.archivedAt !== undefined) return [];
                const teamIndex = entry.teams.findIndex((team) => team.id === task.teamId);
                const team = entry.teams[teamIndex];
                return [
                  {
                    project: entry.project,
                    statusCategory: status.category,
                    statusColor: status.color,
                    statusName: status.name,
                    statusPosition: status.position,
                    task,
                    ...(team
                      ? {
                          teamColor:
                            myTaskTeamColors[teamIndex % myTaskTeamColors.length] ?? "blue",
                          teamName: team.name,
                        }
                      : {}),
                  } satisfies MyWorkTask,
                ];
              });
            }),
          )
        ).flat();

        setData({
          assignedTasks: tasks
            .filter(
              ({ statusCategory, task }) =>
                statusCategory !== "done" && task.assigneeUserIds.includes(session.identity.id),
            )
            .toSorted(
              (first, second) =>
                first.project.position - second.project.position ||
                first.project.name.localeCompare(second.project.name) ||
                first.statusPosition - second.statusPosition ||
                first.task.position - second.task.position,
            ),
        });
      })
      .catch(setLoadError);
  }, [api]);

  useEffect(() => {
    load();
    window.addEventListener(projectNavigationChangedEvent, load);
    window.addEventListener(invalidationEventName, load);
    return () => {
      window.removeEventListener(projectNavigationChangedEvent, load);
      window.removeEventListener(invalidationEventName, load);
    };
  }, [load]);

  if (loadError) return <ResourceFailure error={loadError} onRetry={load} />;
  if (!data) {
    return (
      <div className="page-loading">
        <Spin />
      </div>
    );
  }

  const projectGroups = [
    ...data.assignedTasks
      .reduce((groups, item) => {
        const group = groups.get(item.project.id);
        if (group) group.items.push(item);
        else groups.set(item.project.id, { items: [item], project: item.project });
        return groups;
      }, new Map<string, { items: MyWorkTask[]; project: ProjectSummary }>())
      .values(),
  ];

  const openTask = (item: MyWorkTask) => {
    void api.projects
      .markOpened(item.project.organizationId, item.project.id)
      .then(() => window.dispatchEvent(new Event(projectNavigationChangedEvent)))
      .catch(() => undefined);
    navigate(
      `/app/organizations/${item.project.organizationId}/projects/${item.project.id}/board/tasks/${item.task.id}`,
    );
  };

  const columns: ReadonlyArray<TableColumn<MyWorkTask>> = [
    {
      key: "name",
      render: (_value, item) => (
        <div className="task-list-name">
          <span className="task-list-reference">{item.task.reference}</span>
          <span className="task-list-title" title={item.task.title}>
            {item.task.title}
          </span>
          {item.task.commentCount > 0 ? (
            <span className="task-list-metric" title={`${item.task.commentCount} comments`}>
              <CommentOutlined aria-hidden />
              {item.task.commentCount}
            </span>
          ) : null}
          {item.task.attachmentCount > 0 ? (
            <span className="task-list-metric" title={`${item.task.attachmentCount} attachments`}>
              <PaperClipOutlined aria-hidden />
              {item.task.attachmentCount}
            </span>
          ) : null}
        </div>
      ),
      sorter: (first, second) => first.task.title.localeCompare(second.task.title),
      title: "Name",
      width: "42%",
    },
    {
      key: "status",
      render: (_value, item) => <Tag color={item.statusColor}>{item.statusName}</Tag>,
      sorter: (first, second) => first.statusPosition - second.statusPosition,
      title: "Status",
      width: 120,
    },
    {
      key: "priority",
      render: (_value, item) => (
        <Tag color={myTaskPriorityPresentation[item.task.priority].color}>
          {myTaskPriorityPresentation[item.task.priority].label}
        </Tag>
      ),
      sorter: (first, second) =>
        myTaskPriorityPresentation[first.task.priority].order -
        myTaskPriorityPresentation[second.task.priority].order,
      title: "Priority",
      width: 110,
    },
    {
      key: "team",
      render: (_value, item) =>
        item.teamName ? (
          <Tag color={item.teamColor ?? "blue"}>{item.teamName}</Tag>
        ) : (
          <span className="task-list-empty-value">No team</span>
        ),
      sorter: (first, second) => (first.teamName ?? "").localeCompare(second.teamName ?? ""),
      title: "Team",
      width: 130,
    },
    {
      key: "dueDate",
      render: (_value, item) => (
        <span className={item.task.dueDate ? "task-list-date" : "task-list-date is-empty"}>
          <CalendarOutlined aria-hidden />
          {item.task.dueDate ? formatDate(item.task.dueDate) : "No due date"}
        </span>
      ),
      sorter: (first, second) =>
        (first.task.dueDate ?? "").localeCompare(second.task.dueDate ?? ""),
      title: "Due date",
      width: 130,
    },
  ];

  const toggleProject = (projectId: string) => {
    setCollapsedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  return (
    <section aria-labelledby="my-tasks-title" className="page-stack my-tasks-page">
      <header className="my-tasks-heading">
        <Typography.Title id="my-tasks-title" level={1}>
          My tasks
        </Typography.Title>
        <Typography.Text type="secondary">
          In-progress tasks assigned to you across projects.
        </Typography.Text>
      </header>
      {projectGroups.length === 0 ? (
        <Empty
          description="No in-progress tasks assigned to you"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div className="task-list-groups">
          {projectGroups.map(({ items, project }) => {
            const collapsed = collapsedProjectIds.has(project.id);
            return (
              <section className="task-list-group" key={project.id}>
                <header className="task-list-group-header my-tasks-project-header">
                  <Button
                    className="task-list-group-toggle"
                    icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                    onClick={() => toggleProject(project.id)}
                    size="small"
                    variant="text"
                  >
                    <ProjectsIcon aria-hidden />
                    <span>{project.name}</span>
                    <Tag color="neutral">{items.length}</Tag>
                  </Button>
                </header>
                <div
                  aria-hidden={collapsed}
                  className={
                    collapsed ? "task-list-group-content is-collapsed" : "task-list-group-content"
                  }
                  inert={collapsed}
                >
                  <Table
                    classNames={{
                      cell: "task-list-table-cell",
                      header: "task-list-table-header",
                      root: "task-list-table-root",
                      row: "task-list-table-row",
                    }}
                    columns={columns}
                    dataSource={items}
                    onRow={(item) => ({
                      "aria-label": `Open ${item.task.title}`,
                      onClick: () => openTask(item),
                      onKeyDown: (event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          openTask(item);
                        }
                      },
                      tabIndex: 0,
                    })}
                    pagination={false}
                    rowKey={({ task }) => task.id}
                    scroll={{ x: 800 }}
                    size="small"
                    styles={{ cell: { padding: "7px 10px" } }}
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ProjectCreationEntryPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [organizationContext, setOrganizationContext] = useState<OrganizationContext>();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();

  const loadOrganization = useCallback(() => {
    setError(undefined);
    void api.organizations.list().then(setOrganizationContext).catch(setError);
  }, [api]);

  useEffect(() => loadOrganization(), [loadOrganization]);

  const createProject = async () => {
    const organizationId = organizationContext?.currentOrganizationId;
    if (!organizationId || saving || name.trim().length === 0) return;
    setSaving(true);
    setError(undefined);
    try {
      const project = await api.projects.create(organizationId, { name });
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
      void api.projects.markOpened(organizationId, project.id).catch(() => undefined);
      navigate(`/app/organizations/${organizationId}/projects/${project.id}/board`, {
        replace: true,
      });
    } catch (reason) {
      setError(reason);
      setSaving(false);
    }
  };

  if (!organizationContext && !error) {
    return (
      <div className="page-loading">
        <Spin />
      </div>
    );
  }
  if (!organizationContext && error) {
    return <ResourceFailure error={error} onRetry={loadOrganization} />;
  }

  const currentOrganization = organizationContext?.organizations.find(
    (organization) => organization.id === organizationContext.currentOrganizationId,
  );

  return (
    <section aria-labelledby="project-creation-title" className="page-stack">
      <Typography.Text type="secondary">
        {currentOrganization?.name ?? "Organization"}
      </Typography.Text>
      <Typography.Title id="project-creation-title" level={1}>
        Create project
      </Typography.Title>
      <Typography.Text type="secondary">
        Start with a simple workflow. You can refine the project as it grows.
      </Typography.Text>
      {error ? (
        <Alert
          showIcon
          title={error instanceof Error ? error.message : "Could not create the project."}
          type="error"
        />
      ) : null}
      <Form className="project-creation-form" layout="vertical" onFinish={createProject}>
        <Form.Item label="Name">
          <Input
            autoFocus
            maxLength={120}
            onChange={(event) => {
              setName(event.target.value);
              setError(undefined);
            }}
            placeholder="Project name"
            value={name}
          />
        </Form.Item>
        <Form.Item label="Default workflow">
          <div className="project-status-list">
            <Tag color="#8c8c8c">To do</Tag>
            <Tag color="#1668dc">In progress</Tag>
            <Tag color="#52c41a">Done</Tag>
          </div>
        </Form.Item>
        <Button
          disabled={!organizationContext?.currentOrganizationId || name.trim().length === 0}
          loading={saving}
          type="submit"
          variant="primary"
        >
          Create project
        </Button>
      </Form>
    </section>
  );
}

export function ProjectOverviewPage() {
  const api = useApiClient();
  const { projectId, taskId, view, organizationId } = useParams();
  const [catalog, setCatalog] = useState<ProjectCatalog>();
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [organizationName, setOrganizationName] = useState("Organization");
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [error, setError] = useState<unknown>();
  const [taskActionsContainer, setTaskActionsContainer] = useState<HTMLDivElement | null>(null);
  const [messageApi, messageHolder] = message.useMessage();

  const loadProject = useCallback(() => {
    if (!organizationId) return;
    setError(undefined);
    void Promise.all([
      api.projects.list(organizationId),
      api.auth.session(),
      api.organizations.list({ limit: 100 }),
    ])
      .then(([nextCatalog, session, context]) => {
        if (!session) throw new ApiError(401, "Your session has expired.");
        setCatalog(nextCatalog);
        setMemberId(session.identity.id);
        setMemberName(session.identity.name);
        const organization = context.organizations.find((item) => item.id === organizationId);
        if (organization) setOrganizationName(organization.name);
      })
      .catch(setError);
  }, [api, organizationId]);

  useEffect(() => {
    loadProject();
    const reloadInvalidated = (event: Event) => {
      const detail = (
        event as CustomEvent<{ projectId?: string; resourceType: string; organizationId: string }>
      ).detail;
      if (
        detail.organizationId === organizationId &&
        (detail.resourceType === "organization" || detail.projectId === projectId)
      ) {
        loadProject();
      }
    };
    window.addEventListener(projectNavigationChangedEvent, loadProject);
    window.addEventListener(invalidationEventName, reloadInvalidated);
    return () => {
      window.removeEventListener(projectNavigationChangedEvent, loadProject);
      window.removeEventListener(invalidationEventName, reloadInvalidated);
    };
  }, [loadProject, projectId, organizationId]);

  const project = catalog?.projects.find((item) => item.id === projectId);
  const statuses = useMemo(
    () =>
      catalog?.statuses
        .filter((status) => status.projectId === projectId)
        .toSorted((first, second) => first.position - second.position) ?? [],
    [catalog, projectId],
  );
  const activeView = view === "board" || view === "list" ? view : undefined;

  if (error) {
    return <ResourceFailure error={error} onRetry={loadProject} />;
  }
  if (!catalog) {
    return (
      <div className="page-loading">
        <Spin />
      </div>
    );
  }
  if (!project) {
    return <ResourceFailure error={new ApiError(404, "Project not found.")} />;
  }
  if (!activeView) {
    return <ResourceFailure error={new ApiError(404, "Project view not found.")} />;
  }

  const toggleFavorite = async () => {
    if (savingFavorite || !organizationId) return;
    setSavingFavorite(true);
    try {
      await api.projects.setFavorite(organizationId, project.id, !project.favorite);
      setCatalog((current) =>
        current
          ? {
              ...current,
              projects: current.projects.map((item) =>
                item.id === project.id ? { ...item, favorite: !project.favorite } : item,
              ),
            }
          : current,
      );
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
    } catch (reason) {
      messageApi.error(reason instanceof Error ? reason.message : "Could not update the project.");
    } finally {
      setSavingFavorite(false);
    }
  };

  const copyProjectLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      messageApi.success("Project link copied.");
    } catch {
      messageApi.error("Could not copy the project link.");
    }
  };

  const projectMenuItems: readonly DropdownMenuItem[] = [
    {
      key: "favorite",
      label: project.favorite ? "Remove from favorites" : "Add to favorites",
      onClick: () => void toggleFavorite(),
    },
    {
      key: "copy-link",
      label: "Copy project link",
      onClick: () => void copyProjectLink(),
    },
  ];

  return (
    <section
      aria-labelledby="project-title"
      className={
        "page-stack project-workspace" + (activeView === "board" ? " is-board-view" : "")
      }
    >
      {messageHolder}
      <header className="project-page-header">
        <div className="project-heading">
          <div className="project-title-row">
            <Typography.Title
              id="project-title"
              level={1}
              style={{ fontSize: 17, lineHeight: "24px", margin: 0 }}
            >
              {organizationName} - {project.name}
            </Typography.Title>
          </div>
          <Typography.Text className="project-description">
            {project.description || "Manage tasks, ownership, and progress for this project."}
          </Typography.Text>
        </div>
        <div className="project-member-actions">
          <div className="project-task-actions-host" ref={setTaskActionsContainer} />
          <Dropdown menu={{ items: projectMenuItems }} trigger={["click"]}>
            <Button
              aria-label="Project actions"
              icon={<MoreIcon />}
              iconOnly
              loading={savingFavorite}
              size="small"
            />
          </Dropdown>
        </div>
      </header>
      {project.archivedAt !== undefined ? (
        <Alert showIcon title="This project is archived." type="warning" />
      ) : null}
      <ProjectTaskOrganization
        archived={project.archivedAt !== undefined}
        actionsContainer={taskActionsContainer}
        currentUserId={memberId}
        currentUserName={memberName}
        projectId={project.id}
        projectName={project.name}
        statuses={statuses}
        taskId={taskId}
        view={activeView}
        organizationId={organizationId ?? project.organizationId}
      />
    </section>
  );
}

export function InboxPage() {
  return (
    <section aria-labelledby="inbox-title" className="page-stack">
      <Typography.Text type="secondary">Organization</Typography.Text>
      <Typography.Title id="inbox-title" level={1}>
        Inbox
      </Typography.Title>
      <Empty description="You have no notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </section>
  );
}

export function PluginsPage() {
  return (
    <section aria-labelledby="plugins-title" className="page-stack">
      <Typography.Text type="secondary">Launch++</Typography.Text>
      <Typography.Title id="plugins-title" level={1}>
        Plugins
      </Typography.Title>
      <Typography.Text type="secondary">
        Installed plugins and the plugin marketplace will live here.
      </Typography.Text>
    </section>
  );
}

export function MembersPage() {
  return (
    <section aria-labelledby="members-title" className="page-stack">
      <Typography.Title id="members-title" level={1}>
        Members
      </Typography.Title>
      <Typography.Text type="secondary">
        Organization membership will be available with the collaboration slice.
      </Typography.Text>
    </section>
  );
}

export function SettingsPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setError(undefined);
    setSigningOut(true);
    try {
      await api.auth.signOut();
      navigate("/sign-in", { replace: true });
    } catch (reason) {
      setError(reason);
      setSigningOut(false);
    }
  };

  return (
    <section aria-labelledby="settings-title" className="page-stack">
      <Typography.Title id="settings-title" level={1}>
        Settings
      </Typography.Title>
      <Typography.Text type="secondary">
        Account, organization, appearance, and plugin settings will live here.
      </Typography.Text>
      {error instanceof Error ? <Alert title={error.message} type="error" /> : null}
      <div className="settings-actions">
        <Button loading={signingOut} onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </section>
  );
}

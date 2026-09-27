import {
  ApiError,
  type DeveloperModePairingReview,
  type DeveloperModeSession,
  type DeveloperModeStatus,
  type ExtensionRegistry,
  type OrganizationContext,
  type PluginContributionPreview,
  type PluginPackageSummary,
  type ProjectCatalog,
  type ProjectSummary,
  type TaskView,
} from "@launchpp/api-client";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Dropdown,
  type DropdownMenuItem,
  Empty,
  Form,
  Input,
  MoreIcon,
  message,
  ProjectsIcon,
  Select,
  Spin,
  Switch,
  Table,
  type TableColumn,
  Tag,
  Typography,
  Upload,
  type UploadRequestOptions,
} from "@launchpp/ui";
import {
  CalendarOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  CommentOutlined,
  PaperClipOutlined,
} from "@launchpp/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import {
  ExtensionSettingsPreview,
  emptyExtensionRegistry,
  extensionRegistryChangedEvent,
} from "./extensions.js";
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
const myTaskProjectColors = [
  "#1677ff",
  "#13c2c2",
  "#52c41a",
  "#faad14",
  "#fa8c16",
  "#eb2f96",
  "#722ed1",
  "#2f54eb",
  "#a0d911",
  "#f5222d",
] as const;
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
          {projectGroups.map(({ items, project }, projectIndex) => {
            const collapsed = collapsedProjectIds.has(project.id);
            const sectionColor =
              myTaskProjectColors[projectIndex % myTaskProjectColors.length] ?? "#1677ff";
            return (
              <section className="task-list-group" key={project.id}>
                <header
                  className="task-list-group-header my-tasks-project-header"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${sectionColor} 8%, white)`,
                  }}
                >
                  <Button
                    className="task-list-group-toggle"
                    icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                    onClick={() => toggleProject(project.id)}
                    size="small"
                    variant="text"
                  >
                    <ProjectsIcon aria-hidden style={{ color: sectionColor }} />
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
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [error, setError] = useState<unknown>();
  const [taskActionsContainer, setTaskActionsContainer] = useState<HTMLDivElement | null>(null);
  const [messageApi, messageHolder] = message.useMessage();

  const loadProject = useCallback(() => {
    if (!organizationId) return;
    setError(undefined);
    void Promise.all([api.projects.list(organizationId), api.auth.session()])
      .then(([nextCatalog, session]) => {
        if (!session) throw new ApiError(401, "Your session has expired.");
        setCatalog(nextCatalog);
        setMemberId(session.identity.id);
        setMemberName(session.identity.name);
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
      className={"page-stack project-workspace" + (activeView === "board" ? " is-board-view" : "")}
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
              {project.name}
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

const maximumPluginArchiveBytes = 10 * 1024 * 1024;

function formatPluginBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPluginDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function PluginsPage() {
  const api = useApiClient();
  const [messageApi, messageHolder] = message.useMessage();
  const [organizationId, setOrganizationId] = useState<string>();
  const [packages, setPackages] = useState<readonly PluginPackageSummary[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PluginPackageSummary>();
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [organizationRegistry, setOrganizationRegistry] = useState<ExtensionRegistry>(
    emptyExtensionRegistry(),
  );
  const [projectRegistries, setProjectRegistries] = useState<
    Readonly<Record<string, ExtensionRegistry>>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>();
  const [enablingPackageId, setEnablingPackageId] = useState<string>();
  const [changingProjectId, setChangingProjectId] = useState<string>();

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const context = await api.organizations.list({ limit: 100 });
      const currentOrganizationId = context.currentOrganizationId;
      setOrganizationId(currentOrganizationId);
      if (!currentOrganizationId) {
        setPackages([]);
        setProjects([]);
        setOrganizationRegistry(emptyExtensionRegistry());
        setProjectRegistries({});
        setSelectedPackage(undefined);
        return;
      }
      const [nextPackages, catalog, nextOrganizationRegistry] = await Promise.all([
        api.pluginPackages.list(currentOrganizationId),
        api.projects.list(currentOrganizationId, { limit: 100 }),
        api.extensionRegistry.getOrganization(currentOrganizationId),
      ]);
      const nextProjects = catalog.projects
        .filter((project) => project.archivedAt === undefined)
        .toSorted((first, second) => first.position - second.position);
      const nextProjectRegistries = Object.fromEntries(
        await Promise.all(
          nextProjects.map(async (project) => [
            project.id,
            await api.extensionRegistry.getProject(currentOrganizationId, project.id),
          ]),
        ),
      );
      setPackages(nextPackages);
      setProjects(nextProjects);
      setOrganizationRegistry(nextOrganizationRegistry);
      setProjectRegistries(nextProjectRegistries);
      setSelectedPackage((current) =>
        current ? nextPackages.find((item) => item.id === current.id) : nextPackages[0],
      );
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const uploadPackage = (options: UploadRequestOptions<PluginPackageSummary>) => {
    if (!organizationId) {
      options.onError(new Error("Select an organization before uploading a plugin."));
      return;
    }
    setLoadError(undefined);
    options.onProgress({ percent: 20 });
    void api.pluginPackages
      .stage(organizationId, options.file)
      .then((staged) => {
        options.onProgress({ percent: 100 });
        options.onSuccess(staged);
        setSelectedPackage(staged);
        setPackages((current) => [staged, ...current.filter((item) => item.id !== staged.id)]);
        messageApi.success(`${staged.name} is staged for review.`);
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error : new Error("Plugin upload failed.");
        setLoadError(reason);
        options.onError(reason);
      });
  };

  const enablePackage = async () => {
    if (!organizationId || !selectedPackage || enablingPackageId) return;
    setEnablingPackageId(selectedPackage.id);
    setLoadError(undefined);
    try {
      const enabled = await api.pluginPackages.enable(organizationId, selectedPackage.id);
      setSelectedPackage(enabled);
      setPackages((current) =>
        current.map((item) =>
          item.pluginId === enabled.pluginId
            ? item.id === enabled.id
              ? enabled
              : (() => {
                  const { enabledAt: _enabledAt, ...staged } = item;
                  return { ...staged, state: "staged" as const };
                })()
            : item,
        ),
      );
      window.dispatchEvent(new Event(extensionRegistryChangedEvent));
      await loadPackages();
      messageApi.success(`${enabled.name} enabled for this organization.`);
    } catch (error) {
      setLoadError(error);
    } finally {
      setEnablingPackageId(undefined);
    }
  };

  const changeProjectActivation = async (project: ProjectSummary) => {
    if (!organizationId || !selectedPackage || changingProjectId) return;
    const enabled =
      projectRegistries[project.id]?.packages.some(
        (item) => item.id === selectedPackage.id && item.projectEnabled,
      ) ?? false;
    setChangingProjectId(project.id);
    setLoadError(undefined);
    try {
      if (enabled) {
        await api.extensionRegistry.disableProject(organizationId, project.id, selectedPackage.id);
      } else {
        await api.extensionRegistry.enableProject(organizationId, project.id, selectedPackage.id);
      }
      await loadPackages();
      window.dispatchEvent(new Event(extensionRegistryChangedEvent));
      messageApi.success(
        `${selectedPackage.name} ${enabled ? "disabled for" : "enabled for"} ${project.name}.`,
      );
    } catch (error) {
      setLoadError(error);
    } finally {
      setChangingProjectId(undefined);
    }
  };

  const projectAccessColumns: readonly TableColumn<ProjectSummary>[] = [
    {
      dataIndex: "name",
      key: "project",
      title: "Project",
    },
    {
      key: "state",
      title: "State",
      render: (_value, project) => {
        const enabled =
          projectRegistries[project.id]?.packages.some(
            (item) => item.id === selectedPackage?.id && item.projectEnabled,
          ) ?? false;
        return <Tag color={enabled ? "green" : "default"}>{enabled ? "Enabled" : "Disabled"}</Tag>;
      },
    },
    {
      key: "action",
      title: "",
      width: 120,
      render: (_value, project) => {
        const enabled =
          projectRegistries[project.id]?.packages.some(
            (item) => item.id === selectedPackage?.id && item.projectEnabled,
          ) ?? false;
        return (
          <Button
            loading={changingProjectId === project.id}
            onClick={() => void changeProjectActivation(project)}
            size="small"
          >
            {enabled ? "Disable" : "Enable"}
          </Button>
        );
      },
    },
  ];

  const selectedSettings = [
    ...organizationRegistry.settings
      .filter((item) => item.packageId === selectedPackage?.id)
      .map((contribution) => ({ contribution, location: "Organization" })),
    ...projects.flatMap((project) =>
      (projectRegistries[project.id]?.settings ?? [])
        .filter((item) => item.packageId === selectedPackage?.id)
        .map((contribution) => ({ contribution, location: project.name })),
    ),
  ];

  const packageColumns = useMemo<readonly TableColumn<PluginPackageSummary>[]>(
    () => [
      {
        key: "plugin",
        title: "Plugin",
        render: (_value, record) => (
          <div>
            <Typography.Text strong>{record.name}</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              {record.pluginId} · {record.version}
            </Typography.Text>
          </div>
        ),
      },
      {
        dataIndex: "state",
        key: "state",
        title: "State",
        render: (_value, record) => (
          <Tag color={record.state === "enabled" ? "green" : "blue"}>
            {record.state === "enabled" ? "Enabled" : "Staged"}
          </Tag>
        ),
      },
      {
        key: "uploaded",
        title: "Uploaded",
        render: (_value, record) => formatPluginDate(record.uploadedAt),
      },
      {
        key: "review",
        title: "",
        width: 100,
        render: (_value, record) => (
          <Button onClick={() => setSelectedPackage(record)} size="small">
            Review
          </Button>
        ),
      },
    ],
    [],
  );

  const contributionColumns = useMemo<readonly TableColumn<PluginContributionPreview>[]>(
    () => [
      {
        dataIndex: "title",
        key: "title",
        title: "Contribution",
      },
      {
        dataIndex: "kind",
        key: "kind",
        title: "Type",
        render: (_value, record) => <Tag>{record.kind}</Tag>,
      },
      {
        dataIndex: "placement",
        key: "placement",
        title: "Placement",
        render: (_value, record) => record.placement ?? "—",
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="page-loading">
        <Spin description="Loading plugins" />
      </div>
    );
  }

  return (
    <section aria-labelledby="plugins-title" className="page-stack plugin-settings-page">
      {messageHolder}
      <div>
        <Typography.Text type="secondary">Settings</Typography.Text>
        <Typography.Title id="plugins-title" level={1}>
          Plugins
        </Typography.Title>
        <Typography.Text type="secondary">
          Upload a packaged extension, review exactly what it adds and can access, then enable it
          for this organization.
        </Typography.Text>
      </div>

      {loadError ? (
        <Alert
          showIcon
          title={loadError instanceof Error ? loadError.message : "Could not manage plugins."}
          type="error"
        />
      ) : null}
      {!organizationId ? (
        <Alert showIcon title="Select an organization before managing plugins." type="warning" />
      ) : null}

      <div className="plugin-upload-section">
        <Typography.Title level={2}>Upload package</Typography.Title>
        <Upload.Dragger<PluginPackageSummary>
          accept=".launch-plugin,application/vnd.launchpp.plugin,application/zip"
          beforeUpload={(file) => {
            if (!file.name.endsWith(".launch-plugin")) {
              messageApi.error("Choose a .launch-plugin archive.");
              return Upload.LIST_IGNORE;
            }
            if (file.size > maximumPluginArchiveBytes) {
              messageApi.error("Plugin packages must be 10 MB or smaller.");
              return Upload.LIST_IGNORE;
            }
            return true;
          }}
          customRequest={uploadPackage}
          disabled={!organizationId}
          maxCount={1}
        >
          <div className="plugin-upload-copy">
            <Typography.Text strong>Drop a .launch-plugin archive here</Typography.Text>
            <Typography.Text type="secondary">
              or select a file. Launch++ inspects it without executing plugin code.
            </Typography.Text>
          </div>
        </Upload.Dragger>
      </div>

      {selectedPackage ? (
        <div className="plugin-review-section">
          <div className="plugin-review-heading">
            <div>
              <Typography.Title level={2}>Review {selectedPackage.name}</Typography.Title>
              <Typography.Text type="secondary">
                {selectedPackage.pluginId} · {selectedPackage.version}
              </Typography.Text>
            </div>
            <Button
              disabled={selectedPackage.state === "enabled"}
              loading={enablingPackageId === selectedPackage.id}
              onClick={() => void enablePackage()}
              variant="primary"
            >
              {selectedPackage.state === "enabled" ? "Enabled" : "Enable plugin"}
            </Button>
          </div>

          <Alert
            showIcon
            title="Unsigned local package"
            description="The archive hash proves the uploaded bytes are unchanged; it does not verify who published them. Enable only packages you trust."
            type="warning"
          />

          <Descriptions bordered column={{ xs: 1, md: 2 }} size="small" title="Package summary">
            <Descriptions.Item label="Compatibility">
              Plugin API {selectedPackage.compatibility.apiMinimum} to before{" "}
              {selectedPackage.compatibility.apiMaximumExclusive}
            </Descriptions.Item>
            <Descriptions.Item label="Archive size">
              {formatPluginBytes(selectedPackage.archiveSizeBytes)}
            </Descriptions.Item>
            <Descriptions.Item label="Source">
              {selectedPackage.provenance.sourceFileName}
            </Descriptions.Item>
            <Descriptions.Item label="SHA-256">
              <Typography.Text code copyable>
                {selectedPackage.packageHash}
              </Typography.Text>
            </Descriptions.Item>
            {selectedPackage.compatibility.host ? (
              <Descriptions.Item label="Launch++ host">
                {selectedPackage.compatibility.host}
              </Descriptions.Item>
            ) : null}
            {selectedPackage.compatibility.sdk ? (
              <Descriptions.Item label="SDK">{selectedPackage.compatibility.sdk}</Descriptions.Item>
            ) : null}
            {selectedPackage.compatibility.ui ? (
              <Descriptions.Item label="UI library">
                {selectedPackage.compatibility.ui}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <div>
            <Typography.Title level={3}>Requested permissions</Typography.Title>
            <div className="plugin-permission-list">
              {selectedPackage.requestedPermissions.length > 0 ? (
                selectedPackage.requestedPermissions.map((permission) => (
                  <Tag key={permission}>{permission}</Tag>
                ))
              ) : (
                <Typography.Text type="secondary">No data access requested.</Typography.Text>
              )}
            </div>
          </div>

          <div>
            <Typography.Title level={3}>Contribution preview</Typography.Title>
            <Table<PluginContributionPreview>
              columns={contributionColumns}
              dataSource={selectedPackage.contributions}
              locale={{ emptyText: "This package does not declare contributions." }}
              pagination={false}
              rowKey={(record) => `${record.kind}:${record.id}`}
              size="small"
            />
          </div>

          {selectedPackage.state === "enabled" ? (
            <div>
              <Typography.Title level={3}>Project access</Typography.Title>
              <Table<ProjectSummary>
                columns={projectAccessColumns}
                dataSource={projects}
                locale={{ emptyText: "No active projects are available." }}
                pagination={false}
                rowKey="id"
                size="small"
              />
            </div>
          ) : null}

          {selectedSettings.length > 0 ? (
            <div>
              <Typography.Title level={3}>Host-rendered settings</Typography.Title>
              {selectedSettings.map(({ contribution, location }) => (
                <div key={`${location}:${contribution.id}`}>
                  <Typography.Text type="secondary">{location}</Typography.Text>
                  <ExtensionSettingsPreview contribution={contribution} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <Typography.Title level={2}>Package catalog</Typography.Title>
        <Table<PluginPackageSummary>
          columns={packageColumns}
          dataSource={packages}
          loading={loading}
          locale={{ emptyText: "No plugin packages have been uploaded." }}
          pagination={false}
          rowKey="id"
          size="small"
        />
      </div>
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

export function OrganizationSettingsPage() {
  const api = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizationId, setOrganizationId] = useState("");
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [status, setStatus] = useState<DeveloperModeStatus>();
  const [review, setReview] = useState<DeveloperModePairingReview>();
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();

  const pairingId = searchParams.get("pairing") ?? undefined;
  const pairingCode = searchParams.get("code") ?? undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const context = await api.organizations.list({ limit: 100 });
      const currentId = context.currentOrganizationId ?? context.organizations[0]?.id;
      if (!currentId) throw new Error("Select an organization before managing Developer Mode.");
      setOrganizationId(currentId);
      const [nextStatus, catalog] = await Promise.all([
        api.developerMode.status(currentId),
        api.projects.list(currentId, { limit: 100 }),
      ]);
      setStatus(nextStatus);
      setProjects(catalog.projects.filter((project) => project.archivedAt === undefined));
      if (pairingId && pairingCode && nextStatus.enabled) {
        setReview(await api.developerMode.reviewPairing(pairingId, pairingCode));
      } else {
        setReview(undefined);
      }
    } catch (reason) {
      setError(reason);
    } finally {
      setLoading(false);
    }
  }, [api, pairingCode, pairingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!organizationId || !status?.enabled) return;
    const interval = window.setInterval(() => {
      void api.developerMode.status(organizationId).then(setStatus).catch(setError);
    }, 3_000);
    return () => window.clearInterval(interval);
  }, [api, organizationId, status?.enabled]);

  const toggleDeveloperMode = async (enabled: boolean) => {
    if (!organizationId || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const nextStatus = await api.developerMode.setEnabled(organizationId, enabled);
      setStatus(nextStatus);
      if (enabled && pairingId && pairingCode) {
        setReview(await api.developerMode.reviewPairing(pairingId, pairingCode));
      } else if (!enabled) {
        setReview(undefined);
      }
      window.dispatchEvent(new Event(extensionRegistryChangedEvent));
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const approvePairing = async () => {
    if (!pairingId || !pairingCode || !organizationId || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      await api.developerMode.approvePairing(pairingId, {
        code: pairingCode,
        organizationId,
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      });
      setSearchParams({}, { replace: true });
      setReview(undefined);
      window.dispatchEvent(new Event(extensionRegistryChangedEvent));
      setStatus(await api.developerMode.status(organizationId));
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (sessionId: string) => {
    setSaving(true);
    setError(undefined);
    try {
      await api.developerMode.revoke(sessionId);
      window.dispatchEvent(new Event(extensionRegistryChangedEvent));
      await load();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const approvePermissions = async (sessionId: string) => {
    setSaving(true);
    setError(undefined);
    try {
      await api.developerMode.approvePermissions(sessionId);
      window.dispatchEvent(new Event(extensionRegistryChangedEvent));
      await load();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const columns: readonly TableColumn<DeveloperModeSession>[] = [
    { key: "plugin", title: "Plugin", render: (_value, session) => session.name },
    {
      key: "state",
      title: "State",
      render: (_value, session) => (
        <Tag
          color={
            session.state === "active"
              ? "green"
              : session.state === "awaiting_permission_review"
                ? "orange"
                : "default"
          }
        >
          {session.state.replaceAll("_", " ")}
        </Tag>
      ),
    },
    {
      key: "expires",
      title: "Expires",
      render: (_value, session) => new Date(session.expiresAt).toLocaleString(),
    },
    {
      key: "actions",
      title: "",
      render: (_value, session) => (
        <div className="settings-actions">
          {session.state === "awaiting_permission_review" ? (
            <Button
              disabled={saving}
              onClick={() => void approvePermissions(session.id)}
              size="small"
            >
              Approve permissions
            </Button>
          ) : null}
          {session.state === "active" || session.state === "awaiting_permission_review" ? (
            <Button danger disabled={saving} onClick={() => void revoke(session.id)} size="small">
              Revoke
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="organization-settings-title" className="page-stack">
      <Typography.Title id="organization-settings-title" level={1}>
        Organization settings
      </Typography.Title>
      {error instanceof Error ? <Alert showIcon title={error.message} type="error" /> : null}
      {loading ? <Spin description="Loading Developer Mode…" /> : null}
      {!loading && status ? (
        <Card title="Developer Mode">
          <div className="developer-mode-setting">
            <div>
              <Typography.Text>Connected plugin development</Typography.Text>
              <br />
              <Typography.Text type="secondary">
                Allow temporary, author-scoped plugin sessions. Disabling this immediately revokes
                active sessions and pending pairings.
              </Typography.Text>
            </div>
            <Switch
              ariaLabel="Enable connected Developer Mode"
              checked={status.enabled}
              loading={saving}
              onChange={(enabled) => void toggleDeveloperMode(enabled)}
            />
          </div>
        </Card>
      ) : null}
      {!loading && status?.enabled ? (
        <>
          {review ? (
            <Card title="Approve plugin pairing">
              <Descriptions
                bordered
                column={1}
                items={[
                  {
                    key: "plugin",
                    label: "Plugin",
                    children: `${review.name} (${review.pluginId})`,
                  },
                  { key: "version", label: "Version", children: review.version },
                  {
                    key: "permissions",
                    label: "Requested permissions",
                    children: review.requestedPermissions.join(", ") || "None",
                  },
                ]}
                size="small"
              />
              <Form layout="vertical">
                <Form.Item label="Development project">
                  <Select
                    allowClear
                    onChange={(value) =>
                      setSelectedProjectId(typeof value === "string" ? value : undefined)
                    }
                    options={projects.map((project) => ({
                      label: project.name,
                      value: project.id,
                    }))}
                    placeholder="Organization scope only"
                    value={selectedProjectId}
                  />
                </Form.Item>
                <Button loading={saving} onClick={() => void approvePairing()} variant="primary">
                  Approve pairing
                </Button>
              </Form>
            </Card>
          ) : null}
          <div>
            <Typography.Title level={2}>Connected sessions</Typography.Title>
            <Table<DeveloperModeSession>
              columns={columns}
              dataSource={status.sessions}
              locale={{ emptyText: "No connected development sessions." }}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </div>
        </>
      ) : null}
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

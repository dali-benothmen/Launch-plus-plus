import {
  ApiError,
  type ProjectCatalog,
  type ProjectSummary,
  type TaskView,
  type OrganizationContext,
} from "@launchpp/api-client";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Dropdown,
  type DropdownMenuItem,
  Empty,
  Form,
  Input,
  List,
  message,
  Spin,
  Tag,
  Typography,
} from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { invalidationEventName } from "./invalidation.js";
import { projectNavigationChangedEvent } from "./project-navigation.js";
import { ProjectTaskOrganization } from "./project-tasks.js";
import { ResourceFailure } from "./route-boundaries.js";

interface MyWorkProject {
  readonly project: ProjectSummary;
  readonly organizationName: string;
}

interface MyWorkTask {
  readonly project: ProjectSummary;
  readonly statusCategory: "active" | "backlog" | "done";
  readonly statusColor: string;
  readonly statusName: string;
  readonly task: TaskView;
  readonly organizationName: string;
}

interface MyWorkData {
  readonly assignedTasks: readonly MyWorkTask[];
  readonly dueSoonTasks: readonly MyWorkTask[];
  readonly projects: readonly MyWorkProject[];
  readonly recentTasks: readonly MyWorkTask[];
}

const myWorkItemLimit = 5;
const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

function formatDate(value: string | number) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value);
  return dateFormatter.format(date);
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function dueSoonLimitKey() {
  const limit = new Date();
  limit.setDate(limit.getDate() + 7);
  const month = String(limit.getMonth() + 1).padStart(2, "0");
  const day = String(limit.getDate()).padStart(2, "0");
  return `${limit.getFullYear()}-${month}-${day}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MyWorkPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [data, setData] = useState<MyWorkData>();
  const [loadError, setLoadError] = useState<unknown>();
  const openProjectCreation = () => navigate("/app/projects/new");

  const load = useCallback(() => {
    setLoadError(undefined);
    void Promise.all([api.auth.session(), api.organizations.list({ limit: 100 })])
      .then(async ([session, context]) => {
        if (!session) throw new ApiError(401, "Your session has expired.");

        const catalogs = await Promise.all(
          context.organizations.map(async (organization) => ({
            catalog: await api.projects.list(organization.id, { limit: 100 }),
            organization,
          })),
        );
        const projects = catalogs.flatMap(({ catalog, organization }) =>
          catalog.projects
            .filter((project) => project.archivedAt === undefined)
            .map((project) => ({ project, organizationName: organization.name })),
        );
        const tasks = (
          await Promise.all(
            projects.map(async (entry) => {
              const catalog = catalogs.find(
                ({ organization }) => organization.id === entry.project.organizationId,
              )?.catalog;
              const statuses = new Map(
                catalog?.statuses
                  .filter((status) => status.projectId === entry.project.id)
                  .map((status) => [status.id, status]),
              );
              const page = await api.tasks.list(entry.project.organizationId, entry.project.id, {
                limit: 100,
              });
              return page.items.flatMap((task) => {
                const status = statuses.get(task.statusId);
                if (!status || task.archivedAt !== undefined) return [];
                return [
                  {
                    ...entry,
                    statusCategory: status.category,
                    statusColor: status.color,
                    statusName: status.name,
                    task,
                  } satisfies MyWorkTask,
                ];
              });
            }),
          )
        ).flat();
        const openTasks = tasks.filter(({ statusCategory }) => statusCategory !== "done");
        const assignedTasks = openTasks
          .filter(({ task }) => task.assigneeUserIds.includes(session.identity.id))
          .toSorted((first, second) => {
            if (first.task.dueDate && second.task.dueDate) {
              return first.task.dueDate.localeCompare(second.task.dueDate);
            }
            if (first.task.dueDate) return -1;
            if (second.task.dueDate) return 1;
            return second.task.updatedAt - first.task.updatedAt;
          });
        const dueLimit = dueSoonLimitKey();
        const recentProjects = projects
          .filter(({ project }) => project.favorite || project.lastOpenedAt !== undefined)
          .toSorted((first, second) => {
            if (first.project.favorite !== second.project.favorite) {
              return first.project.favorite ? -1 : 1;
            }
            return (second.project.lastOpenedAt ?? 0) - (first.project.lastOpenedAt ?? 0);
          });

        setData({
          assignedTasks: assignedTasks.slice(0, myWorkItemLimit),
          dueSoonTasks: assignedTasks
            .filter(({ task }) => task.dueDate !== undefined && task.dueDate <= dueLimit)
            .slice(0, myWorkItemLimit),
          projects: (recentProjects.length > 0 ? recentProjects : projects).slice(
            0,
            myWorkItemLimit,
          ),
          recentTasks: openTasks
            .filter(
              ({ task }) =>
                task.assigneeUserIds.includes(session.identity.id) ||
                task.createdByUserId === session.identity.id ||
                task.updatedByUserId === session.identity.id,
            )
            .toSorted((first, second) => second.task.updatedAt - first.task.updatedAt)
            .slice(0, myWorkItemLimit),
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

  const openProject = (project: ProjectSummary) => {
    void api.projects
      .markOpened(project.organizationId, project.id)
      .then(() => window.dispatchEvent(new Event(projectNavigationChangedEvent)))
      .catch(() => undefined);
    navigate(`/app/organizations/${project.organizationId}/projects/${project.id}/board`);
  };

  const projectHref = (project: ProjectSummary) =>
    `/app/organizations/${project.organizationId}/projects/${project.id}/board`;

  const projectLink = (project: ProjectSummary, label: string) => (
    <Typography.Link
      href={projectHref(project)}
      onClick={(event) => {
        event.preventDefault();
        openProject(project);
      }}
    >
      {label}
    </Typography.Link>
  );

  const renderTask = ({ project, statusColor, statusName, task }: MyWorkTask) => (
    <div className="my-work-list-item">
      <div className="my-work-item-copy">
        <Typography.Link
          href={`${projectHref(project)}/tasks/${task.id}`}
          onClick={(event) => {
            event.preventDefault();
            void api.projects
              .markOpened(project.organizationId, project.id)
              .then(() => window.dispatchEvent(new Event(projectNavigationChangedEvent)))
              .catch(() => undefined);
            navigate(`${projectHref(project)}/tasks/${task.id}`);
          }}
        >
          {task.title}
        </Typography.Link>
        <Typography.Text type="secondary">
          {task.reference} · {project.name}
        </Typography.Text>
      </div>
      <Tag color={statusColor}>{statusName}</Tag>
    </div>
  );

  return (
    <section aria-labelledby="my-work-title" className="page-stack">
      <header className="page-header">
        <div>
          <Typography.Text type="secondary">Overview</Typography.Text>
          <Typography.Title id="my-work-title" level={1}>
            My Work
          </Typography.Title>
          <Typography.Text type="secondary">What should you work on next?</Typography.Text>
        </div>
        <Button onClick={openProjectCreation} variant="primary">
          Create project
        </Button>
      </header>
      {data.projects.length === 0 ? (
        <Card className="home-empty-card">
          <Empty description="No projects yet">
            <Button onClick={openProjectCreation} variant="primary">
              Create project
            </Button>
          </Empty>
        </Card>
      ) : (
        <div className="my-work-grid">
          <Card size="small" title="Assigned to me">
            {data.assignedTasks.length > 0 ? (
              <List
                itemRender={renderTask}
                items={data.assignedTasks}
                rowKey={({ task }) => task.id}
              />
            ) : (
              <Empty description="No assigned tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
          <Card size="small" title="Due soon">
            {data.dueSoonTasks.length > 0 ? (
              <List
                itemRender={(item) => (
                  <div className="my-work-list-item">
                    <div className="my-work-item-copy">
                      {projectLink(item.project, item.task.title)}
                      <Typography.Text type="secondary">
                        {item.task.dueDate && item.task.dueDate < todayKey()
                          ? `Overdue · ${formatDate(item.task.dueDate)}`
                          : `Due ${formatDate(item.task.dueDate ?? "")}`}
                      </Typography.Text>
                    </div>
                    <Tag color={item.statusColor}>{item.statusName}</Tag>
                  </div>
                )}
                items={data.dueSoonTasks}
                rowKey={({ task }) => task.id}
              />
            ) : (
              <Empty description="Nothing due soon" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
          <Card size="small" title="Recently updated">
            {data.recentTasks.length > 0 ? (
              <List
                itemRender={(item) => (
                  <div className="my-work-list-item">
                    <div className="my-work-item-copy">
                      {projectLink(item.project, item.task.title)}
                      <Typography.Text type="secondary">
                        {item.project.name} · Updated {formatDate(item.task.updatedAt)}
                      </Typography.Text>
                    </div>
                    <Tag color={item.statusColor}>{item.statusName}</Tag>
                  </div>
                )}
                items={data.recentTasks}
                rowKey={({ task }) => task.id}
              />
            ) : (
              <Empty description="No recent task activity" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
          <Card size="small" title="Recent and favorite projects">
            <List
              itemRender={({ project, organizationName }) => (
                <div className="my-work-list-item">
                  <div className="my-work-item-copy">
                    {projectLink(project, project.name)}
                    <Typography.Text type="secondary">
                      {organizationName} · {project.key}
                    </Typography.Text>
                  </div>
                  {project.favorite ? <Tag>Favorite</Tag> : null}
                </div>
              )}
              items={data.projects}
              rowKey={({ project }) => project.id}
            />
          </Card>
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
      key: "copy-link",
      label: "Copy project link",
      onClick: () => void copyProjectLink(),
    },
  ];

  return (
    <section aria-labelledby="project-title" className="page-stack">
      {messageHolder}
      <header className="project-page-header">
        <div className="project-heading">
          <Typography.Text type="secondary">{project.key}</Typography.Text>
          <div className="project-title-row">
            <Typography.Title id="project-title" level={1}>
              {project.name}
            </Typography.Title>
            <Button
              aria-pressed={project.favorite}
              loading={savingFavorite}
              onClick={() => void toggleFavorite()}
              size="small"
            >
              {project.favorite ? "Favorited" : "Add favorite"}
            </Button>
            <Dropdown menu={{ items: projectMenuItems }} trigger={["click"]}>
              <Button size="small">More</Button>
            </Dropdown>
          </div>
          {project.description ? (
            <Typography.Text type="secondary">{project.description}</Typography.Text>
          ) : null}
        </div>
        <div className="project-member-actions">
          <Avatar.Group size="medium">
            <Avatar title={memberName}>{initials(memberName) || "U"}</Avatar>
          </Avatar.Group>
          <Button disabled size="small" title="Member invitations are not available yet">
            Add member
          </Button>
        </div>
      </header>
      {project.archivedAt !== undefined ? (
        <Alert showIcon title="This project is archived." type="warning" />
      ) : null}
      <ProjectTaskOrganization
        archived={project.archivedAt !== undefined}
        currentUserId={memberId}
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

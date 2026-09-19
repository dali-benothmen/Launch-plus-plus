import {
  ApiError,
  type ProjectCatalog,
  type ProjectSummary,
  type TaskView,
  type WorkspaceContext,
} from "@launchpp/api-client";
import { Alert, Button, Card, Empty, Form, Input, List, Spin, Tag, Typography } from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { projectNavigationChangedEvent } from "./project-sidebar.js";
import { ResourceFailure } from "./route-boundaries.js";

interface MyWorkProject {
  readonly project: ProjectSummary;
  readonly workspaceName: string;
}

interface MyWorkTask {
  readonly project: ProjectSummary;
  readonly statusCategory: "active" | "backlog" | "done";
  readonly statusColor: string;
  readonly statusName: string;
  readonly task: TaskView;
  readonly workspaceName: string;
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

export function MyWorkPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [data, setData] = useState<MyWorkData>();
  const [loadError, setLoadError] = useState<unknown>();
  const openProjectCreation = () => navigate("/app/projects/new");

  const load = useCallback(() => {
    setLoadError(undefined);
    void Promise.all([api.auth.session(), api.workspaces.list({ limit: 100 })])
      .then(async ([session, context]) => {
        if (!session) throw new ApiError(401, "Your session has expired.");

        const catalogs = await Promise.all(
          context.workspaces.map(async (workspace) => ({
            catalog: await api.projects.list(workspace.id, { limit: 100 }),
            workspace,
          })),
        );
        const projects = catalogs.flatMap(({ catalog, workspace }) =>
          catalog.projects
            .filter((project) => project.archivedAt === undefined)
            .map((project) => ({ project, workspaceName: workspace.name })),
        );
        const tasks = (
          await Promise.all(
            projects.map(async (entry) => {
              const catalog = catalogs.find(
                ({ workspace }) => workspace.id === entry.project.workspaceId,
              )?.catalog;
              const statuses = new Map(
                catalog?.statuses
                  .filter((status) => status.projectId === entry.project.id)
                  .map((status) => [status.id, status]),
              );
              const page = await api.tasks.list(entry.project.workspaceId, entry.project.id, {
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
    return () => window.removeEventListener(projectNavigationChangedEvent, load);
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
      .markOpened(project.workspaceId, project.id)
      .then(() => window.dispatchEvent(new Event(projectNavigationChangedEvent)))
      .catch(() => undefined);
    navigate(`/app/workspaces/${project.workspaceId}/projects/${project.id}`);
  };

  const projectHref = (project: ProjectSummary) =>
    `/app/workspaces/${project.workspaceId}/projects/${project.id}`;

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
        {projectLink(project, task.title)}
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
              itemRender={({ project, workspaceName }) => (
                <div className="my-work-list-item">
                  <div className="my-work-item-copy">
                    {projectLink(project, project.name)}
                    <Typography.Text type="secondary">
                      {workspaceName} · {project.key}
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
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext>();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();

  const loadWorkspace = useCallback(() => {
    setError(undefined);
    void api.workspaces.list().then(setWorkspaceContext).catch(setError);
  }, [api]);

  useEffect(() => loadWorkspace(), [loadWorkspace]);

  const createProject = async () => {
    const workspaceId = workspaceContext?.currentWorkspaceId;
    if (!workspaceId || saving || name.trim().length === 0) return;
    setSaving(true);
    setError(undefined);
    try {
      const project = await api.projects.create(workspaceId, { name });
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
      navigate(`/app/workspaces/${workspaceId}/projects/${project.id}`, { replace: true });
    } catch (reason) {
      setError(reason);
      setSaving(false);
    }
  };

  if (!workspaceContext && !error) {
    return (
      <div className="page-loading">
        <Spin />
      </div>
    );
  }
  if (!workspaceContext && error) {
    return <ResourceFailure error={error} onRetry={loadWorkspace} />;
  }

  return (
    <section aria-labelledby="project-creation-title" className="page-stack">
      <Typography.Text type="secondary">First project</Typography.Text>
      <Typography.Title id="project-creation-title" level={1}>
        Create your first project
      </Typography.Title>
      {error ? (
        <Alert
          showIcon
          title={error instanceof Error ? error.message : "Could not create the project."}
          type="error"
        />
      ) : null}
      <Form layout="vertical" onFinish={createProject}>
        <Form.Item label="Name">
          <Input
            maxLength={120}
            onChange={(event) => {
              setName(event.target.value);
              setError(undefined);
            }}
            placeholder="Project name"
            value={name}
          />
        </Form.Item>
        <Button
          disabled={!workspaceContext?.currentWorkspaceId || name.trim().length === 0}
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
  const { projectId, workspaceId } = useParams();
  const [catalog, setCatalog] = useState<ProjectCatalog>();
  const [error, setError] = useState<unknown>();

  const loadProject = useCallback(() => {
    if (!workspaceId) return;
    setError(undefined);
    void api.projects.list(workspaceId).then(setCatalog).catch(setError);
  }, [api, workspaceId]);

  useEffect(() => {
    loadProject();
    window.addEventListener(projectNavigationChangedEvent, loadProject);
    return () => window.removeEventListener(projectNavigationChangedEvent, loadProject);
  }, [loadProject]);

  const project = catalog?.projects.find((item) => item.id === projectId);
  const statuses = useMemo(
    () =>
      catalog?.statuses
        .filter((status) => status.projectId === projectId)
        .toSorted((first, second) => first.position - second.position) ?? [],
    [catalog, projectId],
  );

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

  return (
    <section aria-labelledby="project-title" className="page-stack">
      <Typography.Text type="secondary">{project.key}</Typography.Text>
      <Typography.Title id="project-title" level={1}>
        {project.name}
      </Typography.Title>
      {project.description ? (
        <Typography.Paragraph>{project.description}</Typography.Paragraph>
      ) : null}
      <Typography.Title level={3}>Workflow</Typography.Title>
      <div className="project-status-list">
        {statuses.map((status) => (
          <Tag color={status.color} key={status.id}>
            {status.name}
          </Tag>
        ))}
      </div>
      {project.archivedAt !== undefined ? (
        <Alert showIcon title="This project is archived." type="warning" />
      ) : null}
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
        Workspace membership will be available with the collaboration slice.
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
        Account, workspace, appearance, and plugin settings will live here.
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

import { ApiError, type ProjectCatalog, type WorkspaceContext } from "@launchpp/api-client";
import { Alert, Button, Card, Form, Input, Spin, Tag, Typography } from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { projectNavigationChangedEvent } from "./project-sidebar.js";
import { ResourceFailure } from "./route-boundaries.js";

export function MyWorkPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState<number>();
  const [loadError, setLoadError] = useState<unknown>();
  const openProjectCreation = () => navigate("/app/projects/new");

  const load = useCallback(() => {
    setLoadError(undefined);
    void api.workspaces
      .list()
      .then(async (context) => {
        if (!context.currentWorkspaceId) return setProjectCount(0);
        const catalog = await api.projects.list(context.currentWorkspaceId);
        setProjectCount(
          catalog.projects.filter((project) => project.archivedAt === undefined).length,
        );
      })
      .catch(setLoadError);
  }, [api]);

  useEffect(() => {
    load();
    window.addEventListener(projectNavigationChangedEvent, load);
    return () => window.removeEventListener(projectNavigationChangedEvent, load);
  }, [load]);

  if (loadError) return <ResourceFailure error={loadError} onRetry={load} />;

  return (
    <section aria-labelledby="my-work-title" className="page-stack">
      <header className="page-header">
        <div>
          <Typography.Text type="secondary">Workspace</Typography.Text>
          <Typography.Title id="my-work-title" level={1}>
            My Work
          </Typography.Title>
          <Typography.Text type="secondary">
            Your projects and assigned work will appear here.
          </Typography.Text>
        </div>
        <Button onClick={openProjectCreation} variant="primary">
          Create project
        </Button>
      </header>
      <Card className="home-empty-card">
        <div className="home-empty-state">
          {projectCount === undefined ? (
            <Spin size="small" />
          ) : projectCount === 0 ? (
            <>
              <Typography.Title level={3}>No projects yet</Typography.Title>
              <Typography.Text type="secondary">
                Create your first project to get started.
              </Typography.Text>
              <Button className="home-empty-action" onClick={openProjectCreation} variant="primary">
                Create project
              </Button>
            </>
          ) : (
            <>
              <Typography.Title level={3}>
                {projectCount} {projectCount === 1 ? "project" : "projects"}
              </Typography.Title>
              <Typography.Text type="secondary">
                Open a project from the sidebar to continue working.
              </Typography.Text>
            </>
          )}
        </div>
      </Card>
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

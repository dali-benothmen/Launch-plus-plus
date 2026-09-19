import type { WorkspaceContext } from "@launchpp/api-client";
import {
  AddIcon,
  Alert,
  Button,
  DarkThemeIcon,
  DropdownMenu,
  HomeIcon,
  Input,
  LightThemeIcon,
  MembersIcon,
  Modal,
  ProjectsIcon,
  SettingsIcon,
  Tooltip,
  Typography,
} from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { useThemeController } from "./theme-context.js";

const iconLinks = [
  { icon: <HomeIcon aria-hidden />, label: "My Work", to: "/app" },
  { icon: <MembersIcon aria-hidden />, label: "Members", to: "/app/members" },
  { icon: <SettingsIcon aria-hidden />, label: "Settings", to: "/app/settings" },
] as const;

export function AppShell() {
  const api = useApiClient();
  const theme = useThemeController();
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext>();
  const [workspaceError, setWorkspaceError] = useState<unknown>();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  const loadWorkspaces = useCallback(async () => {
    setWorkspaceError(undefined);
    try {
      setWorkspaceContext(await api.workspaces.list());
    } catch (reason) {
      setWorkspaceError(reason);
    }
  }, [api]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const currentWorkspace = workspaceContext?.workspaces.find(
    (workspace) => workspace.id === workspaceContext.currentWorkspaceId,
  );
  const workspaceItems = useMemo(
    () => [
      ...(workspaceContext?.workspaces.map((workspace) => ({
        id: workspace.id,
        label: `${workspace.id === workspaceContext.currentWorkspaceId ? "✓ " : ""}${workspace.name}`,
        onSelect: () => {
          if (workspace.id === workspaceContext.currentWorkspaceId) return;
          setWorkspaceError(undefined);
          void api.workspaces
            .select(workspace.id)
            .then(() =>
              setWorkspaceContext((current) =>
                current ? { ...current, currentWorkspaceId: workspace.id } : current,
              ),
            )
            .catch((reason: unknown) => setWorkspaceError(reason));
        },
      })) ?? []),
      {
        id: "create-workspace",
        label: "Create workspace",
        onSelect: () => setCreateOpen(true),
        separatorBefore: true,
      },
    ],
    [api, workspaceContext],
  );

  const createWorkspace = async () => {
    setCreating(true);
    setWorkspaceError(undefined);
    try {
      await api.workspaces.create(workspaceName);
      setWorkspaceName("");
      setCreateOpen(false);
      await loadWorkspaces();
    } catch (reason) {
      setWorkspaceError(reason);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside aria-label="Primary navigation" className="icon-rail">
        <NavLink aria-label="Launch++ home" className="brand-mark" to="/app">
          L+
        </NavLink>
        <nav className="rail-links">
          {iconLinks.map((item) => (
            <Tooltip key={item.to} placement="right" title={item.label}>
              <NavLink
                aria-label={item.label}
                className={({ isActive }) => `rail-link${isActive ? " is-active" : ""}`}
                end={item.to === "/app"}
                to={item.to}
              >
                {item.icon}
              </NavLink>
            </Tooltip>
          ))}
        </nav>
        <Tooltip placement="right" title={`Use ${theme.mode === "light" ? "dark" : "light"} theme`}>
          <Button
            aria-label={`Use ${theme.mode === "light" ? "dark" : "light"} theme`}
            icon={theme.mode === "light" ? <DarkThemeIcon /> : <LightThemeIcon />}
            iconOnly
            onClick={theme.toggle}
            size="large"
            variant="text"
          />
        </Tooltip>
      </aside>

      <aside aria-label="Projects" className="project-sidebar">
        <div className="project-sidebar-workspace">
          <Typography.Text type="secondary">Workspace</Typography.Text>
          <DropdownMenu
            align="start"
            items={workspaceItems}
            trigger={
              <Button
                aria-label={`Switch workspace${currentWorkspace ? `, current workspace ${currentWorkspace.name}` : ""}`}
                loading={!workspaceContext && !workspaceError}
                variant="text"
              >
                {currentWorkspace?.name ?? "Unavailable"}
              </Button>
            }
          />
        </div>
        <header className="project-sidebar-header">
          <Typography.Text strong>Projects</Typography.Text>
          <Tooltip title="Create project">
            <Button
              aria-label="Create project"
              icon={<AddIcon />}
              iconOnly
              size="small"
              variant="text"
            />
          </Tooltip>
        </header>
        <div className="project-tree-empty">
          <ProjectsIcon aria-hidden />
          <Typography.Text type="secondary">No projects yet</Typography.Text>
        </div>
        {workspaceError instanceof Error ? (
          <Alert title={workspaceError.message} type="error" />
        ) : null}
      </aside>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Modal
        confirmLoading={creating}
        okButtonProps={{ disabled: workspaceName.trim().length === 0 }}
        okText="Create workspace"
        onCancel={() => setCreateOpen(false)}
        onOk={() => void createWorkspace()}
        open={createOpen}
        title="Create workspace"
      >
        {workspaceError instanceof Error ? (
          <Alert title={workspaceError.message} type="error" />
        ) : null}
        <label className="workspace-create-field" htmlFor="workspace-name">
          <Typography.Text>Name</Typography.Text>
          <Input
            autoComplete="organization"
            id="workspace-name"
            maxLength={80}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Workspace name"
            value={workspaceName}
          />
        </label>
      </Modal>
    </div>
  );
}

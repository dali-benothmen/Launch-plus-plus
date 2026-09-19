import type { WorkspaceContext } from "@launchpp/api-client";
import {
  AddIcon,
  Button,
  DarkThemeIcon,
  Form,
  HomeIcon,
  Input,
  LightThemeIcon,
  MembersIcon,
  message,
  Modal,
  SettingsIcon,
  Spin,
  Tooltip,
  Tree,
  type TreeDataNode,
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
  const [messageApi, messageHolder] = message.useMessage();
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext>();
  const [workspaceLoadError, setWorkspaceLoadError] = useState<unknown>();
  const [workspaceCreateError, setWorkspaceCreateError] = useState<unknown>();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const workspaceCreateErrorMessage = workspaceCreateError
    ? workspaceCreateError instanceof Error
      ? workspaceCreateError.message
      : "Could not create workspace."
    : undefined;

  const loadWorkspaces = useCallback(async () => {
    setWorkspaceLoadError(undefined);
    try {
      setWorkspaceContext(await api.workspaces.list());
    } catch (reason) {
      setWorkspaceLoadError(reason);
    }
  }, [api]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const workspaceTree = useMemo<ReadonlyArray<TreeDataNode>>(
    () =>
      workspaceContext?.workspaces.map((workspace) => ({
        children: [],
        isLeaf: false,
        key: `workspace:${workspace.id}`,
        title: workspace.name,
      })) ?? [],
    [workspaceContext],
  );

  const selectWorkspace = (workspaceId: string) => {
    if (workspaceId === workspaceContext?.currentWorkspaceId) return;
    void api.workspaces
      .select(workspaceId)
      .then(() =>
        setWorkspaceContext((current) =>
          current ? { ...current, currentWorkspaceId: workspaceId } : current,
        ),
      )
      .catch((reason: unknown) => {
        messageApi.error(reason instanceof Error ? reason.message : "Could not switch workspace.");
      });
  };

  const createWorkspace = async () => {
    setCreating(true);
    setWorkspaceCreateError(undefined);
    try {
      await api.workspaces.create(workspaceName);
      setWorkspaceName("");
      setCreateOpen(false);
      await loadWorkspaces();
    } catch (reason) {
      setWorkspaceCreateError(reason);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      {messageHolder}
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

      <aside aria-label="Workspaces and projects" className="project-sidebar">
        <div className="project-sidebar-actions">
          <Tooltip title="Create workspace">
            <Button
              aria-label="Create workspace"
              icon={<AddIcon />}
              iconOnly
              onClick={() => {
                setWorkspaceCreateError(undefined);
                setCreateOpen(true);
              }}
              size="small"
              variant="text"
            />
          </Tooltip>
        </div>
        {workspaceLoadError ? (
          <div className="project-tree-status">
            <Typography.Text type="danger">Could not load workspaces.</Typography.Text>
            <Button onClick={() => void loadWorkspaces()} size="small">
              Retry
            </Button>
          </div>
        ) : workspaceContext ? (
          <Tree.DirectoryTree
            aria-label="Workspace and project tree"
            blockNode
            onSelect={(_, info) => {
              if (!info.selected) return;
              const key = String(info.node.key);
              if (key.startsWith("workspace:")) selectWorkspace(key.slice("workspace:".length));
            }}
            selectedKeys={
              workspaceContext.currentWorkspaceId
                ? [`workspace:${workspaceContext.currentWorkspaceId}`]
                : []
            }
            treeData={workspaceTree}
          />
        ) : (
          <div className="project-tree-status">
            <Spin size="small" />
          </div>
        )}
      </aside>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Modal
        confirmLoading={creating}
        okButtonProps={{ disabled: workspaceName.trim().length === 0 }}
        okText="Create workspace"
        onCancel={() => {
          setCreateOpen(false);
          setWorkspaceCreateError(undefined);
          setWorkspaceName("");
        }}
        onOk={() => void createWorkspace()}
        open={createOpen}
        title="Create workspace"
      >
        <Form layout="vertical">
          <Form.Item
            label="Name"
            {...(workspaceCreateErrorMessage
              ? { help: workspaceCreateErrorMessage, validateStatus: "error" as const }
              : {})}
          >
            <Input
              autoComplete="organization"
              maxLength={80}
              onChange={(event) => {
                setWorkspaceName(event.target.value);
                setWorkspaceCreateError(undefined);
              }}
              placeholder="Workspace name"
              {...(workspaceCreateErrorMessage ? { status: "error" as const } : {})}
              value={workspaceName}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

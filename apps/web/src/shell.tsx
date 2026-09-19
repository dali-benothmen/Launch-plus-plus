import type { WorkspaceContext, WorkspaceSummary } from "@launchpp/api-client";
import {
  AddIcon,
  Button,
  DarkThemeIcon,
  Drawer,
  Dropdown,
  type DropdownMenuItem,
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
  const [contextNode, setContextNode] = useState<TreeDataNode>();
  const [expandedKeys, setExpandedKeys] = useState<ReadonlyArray<string>>([]);
  const [propertiesNode, setPropertiesNode] = useState<TreeDataNode>();
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<WorkspaceSummary>();
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [workspaceRenameError, setWorkspaceRenameError] = useState<unknown>();
  const workspaceCreateErrorMessage = workspaceCreateError
    ? workspaceCreateError instanceof Error
      ? workspaceCreateError.message
      : "Could not create workspace."
    : undefined;
  const workspaceRenameErrorMessage = workspaceRenameError
    ? workspaceRenameError instanceof Error
      ? workspaceRenameError.message
      : "Could not rename workspace."
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

  const openWorkspaceCreator = () => {
    setWorkspaceCreateError(undefined);
    setCreateOpen(true);
  };

  const workspaceTree = useMemo<ReadonlyArray<TreeDataNode>>(
    () =>
      workspaceContext?.workspaces.map((workspace) => ({
        className: "project-tree-workspace",
        children: [],
        isLeaf: false,
        key: `workspace:${workspace.id}`,
        style: { marginInlineStart: -24, width: "calc(100% + 24px)" },
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

  const contextMenuItems = useMemo<ReadonlyArray<DropdownMenuItem>>(() => {
    if (!contextNode) return [];
    const key = String(contextNode.key);
    const isExpanded = expandedKeys.includes(key);
    const openProperties = () => {
      const selectedNode = contextNode;
      window.setTimeout(() => {
        setPropertiesNode(selectedNode);
        setPropertiesOpen(true);
      }, 0);
    };
    const openRenamer = () => {
      if (!key.startsWith("workspace:")) return;
      const workspace = workspaceContext?.workspaces.find(
        (item) => item.id === key.slice("workspace:".length),
      );
      if (!workspace) return;
      window.setTimeout(() => {
        setWorkspaceRenameError(undefined);
        setRenameTarget(workspace);
        setRenameName(workspace.name);
        setRenameOpen(true);
      }, 0);
    };

    if (key.startsWith("workspace:")) {
      return [
        { disabled: true, key: "create-project", label: "Create project" },
        {
          key: "toggle-workspace",
          label: isExpanded ? "Close" : "Open",
          onClick: () =>
            setExpandedKeys((current) =>
              isExpanded ? current.filter((item) => item !== key) : [...current, key],
            ),
        },
        { type: "divider" },
        { key: "rename-workspace", label: "Rename", onClick: openRenamer },
        { danger: true, disabled: true, key: "delete-workspace", label: "Delete workspace" },
        { type: "divider" },
        { key: "workspace-properties", label: "Properties", onClick: openProperties },
      ];
    }

    if (key.startsWith("project:")) {
      return [
        { disabled: true, key: "open-project", label: "Open" },
        { disabled: true, key: "rename-project", label: "Rename" },
        { danger: true, disabled: true, key: "delete-project", label: "Delete" },
        { type: "divider" },
        { key: "project-properties", label: "Properties", onClick: openProperties },
      ];
    }

    return [];
  }, [contextNode, expandedKeys, workspaceContext]);

  const createWorkspace = async () => {
    if (creating || workspaceName.trim().length === 0) return;
    setCreating(true);
    setWorkspaceCreateError(undefined);
    try {
      const workspace = await api.workspaces.create(workspaceName);
      setWorkspaceName("");
      setCreateOpen(false);
      await loadWorkspaces();
      messageApi.success(`${workspace.name} created.`);
    } catch (reason) {
      setWorkspaceCreateError(reason);
    } finally {
      setCreating(false);
    }
  };

  const renameWorkspace = async () => {
    if (!renameTarget || renaming || renameName.trim().length === 0) return;
    setRenaming(true);
    setWorkspaceRenameError(undefined);
    try {
      const workspace = await api.workspaces.rename(renameTarget.id, renameName);
      setRenameOpen(false);
      setRenameTarget(undefined);
      setRenameName("");
      await loadWorkspaces();
      messageApi.success(`${workspace.name} renamed.`);
    } catch (reason) {
      setWorkspaceRenameError(reason);
    } finally {
      setRenaming(false);
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
          <Button block icon={<AddIcon />} onClick={openWorkspaceCreator} size="small">
            Create workspace
          </Button>
        </div>
        {workspaceLoadError ? (
          <div className="project-tree-status">
            <Typography.Text type="danger">Could not load workspaces.</Typography.Text>
            <Button onClick={() => void loadWorkspaces()} size="small">
              Retry
            </Button>
          </div>
        ) : workspaceContext ? (
          <Dropdown menu={{ items: contextMenuItems }} trigger={["contextMenu"]}>
            <div
              className="project-tree-context-surface"
              onContextMenu={(event) => {
                const target = event.target;
                if (!(target instanceof Element) || !target.closest('[role="treeitem"]')) {
                  event.preventDefault();
                }
              }}
            >
              <Tree.DirectoryTree
                aria-label="Workspace and project tree"
                blockNode
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys.map(String))}
                onRightClick={({ node }) => setContextNode(node)}
                onSelect={(_, info) => {
                  if (!info.selected) return;
                  const key = String(info.node.key);
                  if (key.startsWith("workspace:")) {
                    selectWorkspace(key.slice("workspace:".length));
                  }
                }}
                selectedKeys={[]}
                showLine
                treeData={workspaceTree}
              />
            </div>
          </Dropdown>
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
        <Form layout="vertical" onFinish={createWorkspace}>
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
      <Modal
        confirmLoading={renaming}
        okButtonProps={{
          disabled:
            renameName.trim().length === 0 ||
            renameName.trim().replace(/\s+/g, " ") === renameTarget?.name,
        }}
        okText="Rename"
        onCancel={() => {
          setRenameOpen(false);
          setRenameTarget(undefined);
          setRenameName("");
          setWorkspaceRenameError(undefined);
        }}
        onOk={() => void renameWorkspace()}
        open={renameOpen}
        title="Rename workspace"
      >
        <Form layout="vertical" onFinish={renameWorkspace}>
          <Form.Item
            label="Name"
            {...(workspaceRenameErrorMessage
              ? { help: workspaceRenameErrorMessage, validateStatus: "error" as const }
              : {})}
          >
            <Input
              autoComplete="organization"
              maxLength={80}
              onChange={(event) => {
                setRenameName(event.target.value);
                setWorkspaceRenameError(undefined);
              }}
              placeholder="Workspace name"
              {...(workspaceRenameErrorMessage ? { status: "error" as const } : {})}
              value={renameName}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        mask={false}
        onClose={() => setPropertiesOpen(false)}
        open={propertiesOpen}
        placement="right"
        title={
          String(propertiesNode?.key).startsWith("project:")
            ? "Project properties"
            : "Workspace properties"
        }
      >
        <Typography.Paragraph>
          Properties for {propertiesNode?.title ?? "this item"} will appear here.
        </Typography.Paragraph>
      </Drawer>
    </div>
  );
}

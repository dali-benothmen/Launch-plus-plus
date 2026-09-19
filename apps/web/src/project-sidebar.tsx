import type {
  ProjectCatalog,
  ProjectSummary,
  WorkspaceContext,
  WorkspaceSummary,
} from "@launchpp/api-client";
import {
  AddIcon,
  Button,
  Drawer,
  Dropdown,
  type DropdownMenuItem,
  Form,
  Input,
  message,
  Modal,
  Spin,
  Tree,
  type TreeDataNode,
  Typography,
} from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";

type EditorState =
  | Readonly<{ kind: "create-project"; workspaceId: string }>
  | Readonly<{ kind: "rename-project"; project: ProjectSummary; workspaceId: string }>;

type DeleteState = Readonly<{
  name: string;
  projectId: string;
  workspaceId: string;
}>;

interface NavigationTarget {
  readonly kind: "project" | "section" | "workspace";
  readonly projectId?: string;
  readonly workspaceId: string;
}

const emptyCatalog: ProjectCatalog = { folders: [], projects: [], statuses: [] };
export const projectNavigationChangedEvent = "launchpp:project-navigation-changed";
const defer = (action: () => void) => window.setTimeout(action, 0);

function targetFromKey(key: string): NavigationTarget | undefined {
  const [kind, workspaceId, resourceId] = key.split(":");
  if (!workspaceId) return undefined;
  if (kind === "workspace") return { kind, workspaceId };
  if (kind === "project" && resourceId) return { kind, projectId: resourceId, workspaceId };
  if (kind === "section") return { kind, workspaceId };
  return undefined;
}

function projectNode(project: ProjectSummary, source: string): TreeDataNode {
  return {
    isLeaf: true,
    key: `project:${project.workspaceId}:${project.id}:${source}`,
    style: { marginBlock: 2 },
    title: project.name,
  };
}

function workspaceNodes(
  workspace: WorkspaceSummary,
  catalog: ProjectCatalog,
): ReadonlyArray<TreeDataNode> {
  const activeProjects = catalog.projects.filter((project) => project.archivedAt === undefined);
  const archivedProjects = catalog.projects.filter((project) => project.archivedAt !== undefined);
  const favorites = activeProjects.filter((project) => project.favorite);
  const nodes: TreeDataNode[] = [];

  if (favorites.length > 0) {
    nodes.push({
      children: favorites.map((project) => projectNode(project, "favorite")),
      isLeaf: false,
      key: `section:${workspace.id}:favorites`,
      style: { marginBlock: 2 },
      title: "Favorites",
    });
  }
  nodes.push(
    ...activeProjects
      .toSorted((first, second) => first.position - second.position)
      .map((project) => projectNode(project, "workspace")),
  );
  if (archivedProjects.length > 0) {
    nodes.push({
      children: archivedProjects.map((project) => projectNode(project, "archived")),
      isLeaf: false,
      key: `section:${workspace.id}:archived`,
      style: { marginBlock: 2 },
      title: "Archived",
    });
  }
  return nodes;
}

export interface ProjectSidebarProps {
  readonly embedded?: boolean;
  readonly onNavigate?: () => void;
}

export function ProjectSidebar({ embedded = false, onNavigate }: ProjectSidebarProps) {
  const api = useApiClient();
  const navigate = useNavigate();
  const [messageApi, messageHolder] = message.useMessage();
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext>();
  const [catalogs, setCatalogs] = useState<Readonly<Record<string, ProjectCatalog>>>({});
  const [loadError, setLoadError] = useState<unknown>();
  const [contextNode, setContextNode] = useState<TreeDataNode>();
  const [expandedKeys, setExpandedKeys] = useState<ReadonlyArray<string>>([]);
  const [propertiesNode, setPropertiesNode] = useState<TreeDataNode>();
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [workspaceCreateOpen, setWorkspaceCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceCreateError, setWorkspaceCreateError] = useState<unknown>();
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceRenameTarget, setWorkspaceRenameTarget] = useState<WorkspaceSummary>();
  const [workspaceRenameName, setWorkspaceRenameName] = useState("");
  const [workspaceRenameError, setWorkspaceRenameError] = useState<unknown>();
  const [renamingWorkspace, setRenamingWorkspace] = useState(false);
  const [editor, setEditor] = useState<EditorState>();
  const [editorName, setEditorName] = useState("");
  const [editorError, setEditorError] = useState<unknown>();
  const [savingEditor, setSavingEditor] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>();
  const [deleting, setDeleting] = useState(false);

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const loadNavigation = useCallback(async () => {
    setLoadError(undefined);
    try {
      const context = await api.workspaces.list();
      const entries = await Promise.all(
        context.workspaces.map(
          async (workspace) => [workspace.id, await api.projects.list(workspace.id)] as const,
        ),
      );
      setWorkspaceContext(context);
      setCatalogs(Object.fromEntries(entries));
    } catch (reason) {
      setLoadError(reason);
    }
  }, [api]);

  useEffect(() => {
    void loadNavigation();
  }, [loadNavigation]);

  useEffect(() => {
    const reload = () => void loadNavigation();
    window.addEventListener(projectNavigationChangedEvent, reload);
    return () => window.removeEventListener(projectNavigationChangedEvent, reload);
  }, [loadNavigation]);

  const treeData = useMemo<ReadonlyArray<TreeDataNode>>(
    () =>
      workspaceContext?.workspaces.map((workspace) => ({
        className: "project-tree-workspace",
        children: workspaceNodes(workspace, catalogs[workspace.id] ?? emptyCatalog),
        isLeaf: false,
        key: `workspace:${workspace.id}`,
        style: { marginInlineStart: -24, width: "calc(100% + 24px)" },
        title: workspace.name,
      })) ?? [],
    [catalogs, workspaceContext],
  );

  const catalogFor = useCallback(
    (workspaceId: string) => catalogs[workspaceId] ?? emptyCatalog,
    [catalogs],
  );
  const projectFor = useCallback(
    (workspaceId: string, projectId: string) =>
      catalogFor(workspaceId).projects.find((project) => project.id === projectId),
    [catalogFor],
  );

  const openEditor = useCallback((state: EditorState) => {
    defer(() => {
      setEditorError(undefined);
      setEditor(state);
      setEditorName(state.kind === "rename-project" ? state.project.name : "");
    });
  }, []);

  const closeEditor = () => {
    setEditor(undefined);
    setEditorName("");
    setEditorError(undefined);
  };

  const openProject = useCallback(
    (workspaceId: string, projectId: string) => {
      void api.projects
        .markOpened(workspaceId, projectId)
        .then(loadNavigation)
        .catch(() => undefined);
      navigate(`/app/workspaces/${workspaceId}/projects/${projectId}`);
      onNavigate?.();
    },
    [api, loadNavigation, navigate, onNavigate],
  );

  const contextMenuItems = useMemo<ReadonlyArray<DropdownMenuItem>>(() => {
    if (!contextNode) return [];
    const key = String(contextNode.key);
    const target = targetFromKey(key);
    if (!target) return [];
    const isExpanded = expandedKeys.includes(key);
    const toggle = () =>
      setExpandedKeys((current) =>
        isExpanded ? current.filter((item) => item !== key) : [...current, key],
      );
    const openProperties = () => {
      const selectedNode = contextNode;
      defer(() => {
        setPropertiesNode(selectedNode);
        setPropertiesOpen(true);
      });
    };

    if (target.kind === "workspace") {
      const workspace = workspaceContext?.workspaces.find((item) => item.id === target.workspaceId);
      return [
        {
          key: "create-project",
          label: "Create project",
          onClick: () => openEditor({ kind: "create-project", workspaceId: target.workspaceId }),
        },
        { key: "toggle-workspace", label: isExpanded ? "Close" : "Open", onClick: toggle },
        { type: "divider" },
        {
          key: "rename-workspace",
          label: "Rename",
          onClick: () => {
            if (!workspace) return;
            defer(() => {
              setWorkspaceRenameError(undefined);
              setWorkspaceRenameTarget(workspace);
              setWorkspaceRenameName(workspace.name);
            });
          },
        },
        { danger: true, disabled: true, key: "delete-workspace", label: "Delete workspace" },
        { type: "divider" },
        { key: "workspace-properties", label: "Properties", onClick: openProperties },
      ];
    }

    if (target.kind === "section") {
      return [{ key: "toggle-section", label: isExpanded ? "Close" : "Open", onClick: toggle }];
    }

    if (target.kind === "project" && target.projectId) {
      const project = projectFor(target.workspaceId, target.projectId);
      if (!project) return [];
      return [
        {
          key: "open-project",
          label: "Open",
          onClick: () => openProject(target.workspaceId, project.id),
        },
        {
          key: "rename-project",
          label: "Rename",
          onClick: () =>
            openEditor({
              kind: "rename-project",
              project,
              workspaceId: target.workspaceId,
            }),
        },
        {
          danger: true,
          key: "delete-project",
          label: "Delete project",
          onClick: () =>
            defer(() =>
              setDeleteTarget({
                name: project.name,
                projectId: project.id,
                workspaceId: target.workspaceId,
              }),
            ),
        },
        { type: "divider" },
        { key: "project-properties", label: "Properties", onClick: openProperties },
      ];
    }

    return [];
  }, [contextNode, expandedKeys, openEditor, openProject, projectFor, workspaceContext]);

  const createWorkspace = async () => {
    if (creatingWorkspace || workspaceName.trim().length === 0) return;
    setCreatingWorkspace(true);
    setWorkspaceCreateError(undefined);
    try {
      const workspace = await api.workspaces.create(workspaceName);
      setWorkspaceName("");
      setWorkspaceCreateOpen(false);
      await loadNavigation();
      messageApi.success(`${workspace.name} created.`);
    } catch (reason) {
      setWorkspaceCreateError(reason);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const renameWorkspace = async () => {
    if (!workspaceRenameTarget || renamingWorkspace || workspaceRenameName.trim().length === 0)
      return;
    setRenamingWorkspace(true);
    setWorkspaceRenameError(undefined);
    try {
      const workspace = await api.workspaces.rename(workspaceRenameTarget.id, workspaceRenameName);
      setWorkspaceRenameTarget(undefined);
      setWorkspaceRenameName("");
      await loadNavigation();
      messageApi.success(`${workspace.name} renamed.`);
    } catch (reason) {
      setWorkspaceRenameError(reason);
    } finally {
      setRenamingWorkspace(false);
    }
  };

  const saveEditor = async () => {
    if (!editor || savingEditor || editorName.trim().length === 0) return;
    setSavingEditor(true);
    setEditorError(undefined);
    try {
      if (editor.kind === "create-project") {
        const project = await api.projects.create(editor.workspaceId, { name: editorName });
        messageApi.success(`${project.name} created.`);
      } else {
        const project = await api.projects.update(editor.workspaceId, editor.project.id, {
          name: editorName,
        });
        messageApi.success(`${project.name} updated.`);
      }
      closeEditor();
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
    } catch (reason) {
      setEditorError(reason);
    } finally {
      setSavingEditor(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.projects.delete(deleteTarget.workspaceId, deleteTarget.projectId);
      messageApi.success(`${deleteTarget.name} deleted.`);
      navigate("/app");
      setDeleteTarget(undefined);
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
    } catch (reason) {
      messageApi.error(errorMessage(reason, "The item could not be deleted."));
    } finally {
      setDeleting(false);
    }
  };

  const editorTitle = editor?.kind === "create-project" ? "Create project" : "Rename project";

  return (
    <>
      {messageHolder}
      <aside
        aria-label="Workspaces and projects"
        className={`project-sidebar${embedded ? " is-embedded" : ""}`}
      >
        <div className="project-sidebar-actions">
          <Button
            block
            icon={<AddIcon />}
            onClick={() => {
              setWorkspaceCreateError(undefined);
              setWorkspaceCreateOpen(true);
            }}
            size="small"
          >
            Create workspace
          </Button>
        </div>
        {loadError ? (
          <div className="project-tree-status">
            <Typography.Text type="danger">Could not load projects.</Typography.Text>
            <Button onClick={() => void loadNavigation()} size="small">
              Retry
            </Button>
          </div>
        ) : workspaceContext ? (
          <Dropdown menu={{ items: contextMenuItems }} trigger={["contextMenu"]}>
            <div className="project-tree-context-surface">
              <Tree.DirectoryTree
                aria-label="Workspace and project tree"
                blockNode
                expandedKeys={expandedKeys}
                onContextMenu={(event) => {
                  const target = event.target;
                  if (!(target instanceof Element) || !target.closest('[role="treeitem"]')) {
                    event.preventDefault();
                  }
                }}
                onExpand={(keys) => setExpandedKeys(keys.map(String))}
                onRightClick={({ event, node }) => {
                  const source = event.target;
                  if (
                    !(source instanceof Element) ||
                    source.closest('[role="treeitem"]') !== event.currentTarget
                  ) {
                    return;
                  }
                  flushSync(() => setContextNode(node));
                }}
                onSelect={(_, info) => {
                  if (!info.selected) return;
                  const target = targetFromKey(String(info.node.key));
                  if (!target) return;
                  if (target.kind === "workspace") {
                    if (target.workspaceId !== workspaceContext.currentWorkspaceId) {
                      void api.workspaces
                        .select(target.workspaceId)
                        .then(() =>
                          setWorkspaceContext((current) =>
                            current
                              ? { ...current, currentWorkspaceId: target.workspaceId }
                              : current,
                          ),
                        )
                        .then(() => window.dispatchEvent(new Event(projectNavigationChangedEvent)))
                        .then(() => onNavigate?.())
                        .catch((reason: unknown) =>
                          messageApi.error(errorMessage(reason, "Could not switch workspace.")),
                        );
                    }
                  } else if (target.kind === "project" && target.projectId) {
                    openProject(target.workspaceId, target.projectId);
                  }
                }}
                selectedKeys={[]}
                showLine
                treeData={treeData}
              />
            </div>
          </Dropdown>
        ) : (
          <div className="project-tree-status">
            <Spin size="small" />
          </div>
        )}
      </aside>

      <Modal
        confirmLoading={creatingWorkspace}
        okButtonProps={{ disabled: workspaceName.trim().length === 0 }}
        okText="Create workspace"
        onCancel={() => {
          setWorkspaceCreateOpen(false);
          setWorkspaceCreateError(undefined);
          setWorkspaceName("");
        }}
        onOk={() => void createWorkspace()}
        open={workspaceCreateOpen}
        title="Create workspace"
      >
        <Form layout="vertical" onFinish={createWorkspace}>
          <Form.Item
            label="Name"
            {...(workspaceCreateError
              ? {
                  help: errorMessage(workspaceCreateError, "Could not create workspace."),
                  validateStatus: "error" as const,
                }
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
              {...(workspaceCreateError ? { status: "error" as const } : {})}
              value={workspaceName}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={renamingWorkspace}
        okButtonProps={{
          disabled:
            workspaceRenameName.trim().length === 0 ||
            workspaceRenameName.trim().replace(/\s+/g, " ") === workspaceRenameTarget?.name,
        }}
        okText="Rename"
        onCancel={() => {
          setWorkspaceRenameTarget(undefined);
          setWorkspaceRenameName("");
          setWorkspaceRenameError(undefined);
        }}
        onOk={() => void renameWorkspace()}
        open={workspaceRenameTarget !== undefined}
        title="Rename workspace"
      >
        <Form layout="vertical" onFinish={renameWorkspace}>
          <Form.Item
            label="Name"
            {...(workspaceRenameError
              ? {
                  help: errorMessage(workspaceRenameError, "Could not rename workspace."),
                  validateStatus: "error" as const,
                }
              : {})}
          >
            <Input
              maxLength={80}
              onChange={(event) => {
                setWorkspaceRenameName(event.target.value);
                setWorkspaceRenameError(undefined);
              }}
              placeholder="Workspace name"
              {...(workspaceRenameError ? { status: "error" as const } : {})}
              value={workspaceRenameName}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={savingEditor}
        okButtonProps={{ disabled: editorName.trim().length === 0 }}
        okText={editor?.kind.startsWith("create") ? "Create" : "Save"}
        onCancel={closeEditor}
        onOk={() => void saveEditor()}
        open={editor !== undefined}
        title={editorTitle}
      >
        <Form layout="vertical" onFinish={saveEditor}>
          <Form.Item
            label="Name"
            {...(editorError
              ? {
                  help: errorMessage(editorError, "The item could not be saved."),
                  validateStatus: "error" as const,
                }
              : {})}
          >
            <Input
              maxLength={120}
              onChange={(event) => {
                setEditorName(event.target.value);
                setEditorError(undefined);
              }}
              placeholder="Project name"
              {...(editorError ? { status: "error" as const } : {})}
              value={editorName}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={deleting}
        okButtonProps={{ danger: true }}
        okText="Delete"
        onCancel={() => setDeleteTarget(undefined)}
        onOk={() => void confirmDelete()}
        open={deleteTarget !== undefined}
        title="Delete project"
      >
        <Typography.Paragraph>
          {`Delete ${deleteTarget?.name ?? "this project"}? This action removes it from ordinary navigation.`}
        </Typography.Paragraph>
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
    </>
  );
}

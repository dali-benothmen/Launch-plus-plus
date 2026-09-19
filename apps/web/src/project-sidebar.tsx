import type {
  ProjectCatalog,
  ProjectFolderSummary,
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
  Select,
  Spin,
  Tree,
  type TreeDataNode,
  Typography,
} from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";

type EditorState =
  | Readonly<{ kind: "create-folder"; workspaceId: string }>
  | Readonly<{ folder: ProjectFolderSummary; kind: "rename-folder"; workspaceId: string }>
  | Readonly<{ folderId?: string; kind: "create-project"; workspaceId: string }>
  | Readonly<{ kind: "rename-project"; project: ProjectSummary; workspaceId: string }>;

type DeleteState =
  | Readonly<{
      folderId: string;
      kind: "folder";
      name: string;
      workspaceId: string;
    }>
  | Readonly<{
      kind: "project";
      name: string;
      projectId: string;
      workspaceId: string;
    }>;

interface NavigationTarget {
  readonly folderId?: string;
  readonly kind: "folder" | "project" | "section" | "workspace";
  readonly projectId?: string;
  readonly workspaceId: string;
}

const emptyCatalog: ProjectCatalog = { folders: [], projects: [], statuses: [] };
const ungroupedValue = "__ungrouped__";
export const projectNavigationChangedEvent = "launchpp:project-navigation-changed";

function targetFromKey(key: string): NavigationTarget | undefined {
  const [kind, workspaceId, resourceId] = key.split(":");
  if (!workspaceId) return undefined;
  if (kind === "workspace") return { kind, workspaceId };
  if (kind === "folder" && resourceId) return { folderId: resourceId, kind, workspaceId };
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
  const recent = activeProjects
    .filter((project) => project.lastOpenedAt !== undefined)
    .toSorted((first, second) => (second.lastOpenedAt ?? 0) - (first.lastOpenedAt ?? 0))
    .slice(0, 5);
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
  if (recent.length > 0) {
    nodes.push({
      children: recent.map((project) => projectNode(project, "recent")),
      isLeaf: false,
      key: `section:${workspace.id}:recent`,
      style: { marginBlock: 2 },
      title: "Recent",
    });
  }
  for (const folder of catalog.folders) {
    nodes.push({
      children: activeProjects
        .filter((project) => project.folderId === folder.id)
        .toSorted((first, second) => first.position - second.position)
        .map((project) => projectNode(project, `folder-${folder.id}`)),
      isLeaf: false,
      key: `folder:${workspace.id}:${folder.id}`,
      style: { marginBlock: 2 },
      title: folder.name,
    });
  }
  const ungrouped = activeProjects
    .filter((project) => project.folderId === undefined)
    .toSorted((first, second) => first.position - second.position);
  if (ungrouped.length > 0) {
    nodes.push({
      children: ungrouped.map((project) => projectNode(project, "ungrouped")),
      isLeaf: false,
      key: `section:${workspace.id}:ungrouped`,
      style: { marginBlock: 2 },
      title: "Ungrouped",
    });
  }
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

export function ProjectSidebar() {
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
  const [editorFolderId, setEditorFolderId] = useState(ungroupedValue);
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

  const defer = (action: () => void) => window.setTimeout(action, 0);
  const catalogFor = (workspaceId: string) => catalogs[workspaceId] ?? emptyCatalog;
  const projectFor = (workspaceId: string, projectId: string) =>
    catalogFor(workspaceId).projects.find((project) => project.id === projectId);
  const folderFor = (workspaceId: string, folderId: string) =>
    catalogFor(workspaceId).folders.find((folder) => folder.id === folderId);

  const openEditor = (state: EditorState) => {
    defer(() => {
      setEditorError(undefined);
      setEditor(state);
      if (state.kind === "rename-folder") setEditorName(state.folder.name);
      else if (state.kind === "rename-project") {
        setEditorName(state.project.name);
        setEditorFolderId(state.project.folderId ?? ungroupedValue);
      } else {
        setEditorName("");
        setEditorFolderId(
          state.kind === "create-project" ? (state.folderId ?? ungroupedValue) : ungroupedValue,
        );
      }
    });
  };

  const closeEditor = () => {
    setEditor(undefined);
    setEditorName("");
    setEditorFolderId(ungroupedValue);
    setEditorError(undefined);
  };

  const runAction = async (action: () => Promise<void>, success: string) => {
    try {
      await action();
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
      messageApi.success(success);
    } catch (reason) {
      messageApi.error(errorMessage(reason, "The action could not be completed."));
    }
  };

  const openProject = (workspaceId: string, projectId: string) => {
    void api.projects
      .markOpened(workspaceId, projectId)
      .then(loadNavigation)
      .catch(() => undefined);
    navigate(`/app/workspaces/${workspaceId}/projects/${projectId}`);
  };

  const moveFolder = (workspaceId: string, folderId: string, direction: -1 | 1) => {
    const ids = catalogFor(workspaceId).folders.map((folder) => folder.id);
    const index = ids.indexOf(folderId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
    [ids[index], ids[nextIndex]] = [ids[nextIndex]!, ids[index]!];
    void runAction(() => api.projects.reorderFolders(workspaceId, ids), "Folder order updated.");
  };

  const moveProject = (workspaceId: string, projectId: string, direction: -1 | 1) => {
    const project = projectFor(workspaceId, projectId);
    if (!project || project.archivedAt !== undefined) return;
    const ids = catalogFor(workspaceId)
      .projects.filter(
        (item) => item.archivedAt === undefined && item.folderId === project.folderId,
      )
      .toSorted((first, second) => first.position - second.position)
      .map((item) => item.id);
    const index = ids.indexOf(projectId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
    [ids[index], ids[nextIndex]] = [ids[nextIndex]!, ids[index]!];
    void runAction(
      () =>
        api.projects.reorderProjects(workspaceId, {
          ...(project.folderId ? { folderId: project.folderId } : {}),
          orderedProjectIds: ids,
        }),
      "Project order updated.",
    );
  };

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
        {
          key: "create-folder",
          label: "Create folder",
          onClick: () => openEditor({ kind: "create-folder", workspaceId: target.workspaceId }),
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

    if (target.kind === "folder" && target.folderId) {
      const folder = folderFor(target.workspaceId, target.folderId);
      const folders = catalogFor(target.workspaceId).folders;
      const index = folders.findIndex((item) => item.id === target.folderId);
      if (!folder) return [];
      return [
        {
          key: "create-project",
          label: "Create project",
          onClick: () =>
            openEditor({
              folderId: folder.id,
              kind: "create-project",
              workspaceId: target.workspaceId,
            }),
        },
        { key: "toggle-folder", label: isExpanded ? "Close" : "Open", onClick: toggle },
        { type: "divider" },
        {
          disabled: index <= 0,
          key: "move-folder-up",
          label: "Move up",
          onClick: () => moveFolder(target.workspaceId, folder.id, -1),
        },
        {
          disabled: index < 0 || index >= folders.length - 1,
          key: "move-folder-down",
          label: "Move down",
          onClick: () => moveFolder(target.workspaceId, folder.id, 1),
        },
        {
          key: "rename-folder",
          label: "Rename",
          onClick: () =>
            openEditor({ folder, kind: "rename-folder", workspaceId: target.workspaceId }),
        },
        {
          danger: true,
          key: "delete-folder",
          label: "Delete folder",
          onClick: () =>
            defer(() =>
              setDeleteTarget({
                folderId: folder.id,
                kind: "folder",
                name: folder.name,
                workspaceId: target.workspaceId,
              }),
            ),
        },
        { type: "divider" },
        { key: "folder-properties", label: "Properties", onClick: openProperties },
      ];
    }

    if (target.kind === "project" && target.projectId) {
      const project = projectFor(target.workspaceId, target.projectId);
      if (!project) return [];
      const siblings = catalogFor(target.workspaceId)
        .projects.filter(
          (item) => item.archivedAt === undefined && item.folderId === project.folderId,
        )
        .toSorted((first, second) => first.position - second.position);
      const index = siblings.findIndex((item) => item.id === project.id);
      return [
        {
          key: "open-project",
          label: "Open",
          onClick: () => openProject(target.workspaceId, project.id),
        },
        {
          key: "favorite-project",
          label: project.favorite ? "Remove from favorites" : "Add to favorites",
          onClick: () =>
            void runAction(
              () => api.projects.setFavorite(target.workspaceId, project.id, !project.favorite),
              project.favorite ? "Removed from favorites." : "Added to favorites.",
            ),
        },
        ...(project.archivedAt === undefined
          ? ([
              { type: "divider" as const },
              {
                disabled: index <= 0,
                key: "move-project-up",
                label: "Move up",
                onClick: () => moveProject(target.workspaceId, project.id, -1),
              },
              {
                disabled: index < 0 || index >= siblings.length - 1,
                key: "move-project-down",
                label: "Move down",
                onClick: () => moveProject(target.workspaceId, project.id, 1),
              },
              {
                key: "rename-project",
                label: "Rename or move",
                onClick: () =>
                  openEditor({
                    kind: "rename-project",
                    project,
                    workspaceId: target.workspaceId,
                  }),
              },
              {
                key: "archive-project",
                label: "Archive",
                onClick: () =>
                  void runAction(
                    () =>
                      api.projects.archive(target.workspaceId, project.id).then(() => undefined),
                    `${project.name} archived.`,
                  ),
              },
            ] satisfies ReadonlyArray<DropdownMenuItem>)
          : ([
              { type: "divider" as const },
              {
                key: "restore-project",
                label: "Restore",
                onClick: () =>
                  void runAction(
                    () =>
                      api.projects.restore(target.workspaceId, project.id).then(() => undefined),
                    `${project.name} restored.`,
                  ),
              },
            ] satisfies ReadonlyArray<DropdownMenuItem>)),
        {
          danger: true,
          key: "delete-project",
          label: "Delete",
          onClick: () =>
            defer(() =>
              setDeleteTarget({
                kind: "project",
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
  }, [api, catalogs, contextNode, expandedKeys, workspaceContext]);

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
      if (editor.kind === "create-folder") {
        const folder = await api.projects.createFolder(editor.workspaceId, editorName);
        messageApi.success(`${folder.name} created.`);
      } else if (editor.kind === "rename-folder") {
        const folder = await api.projects.renameFolder(
          editor.workspaceId,
          editor.folder.id,
          editorName,
        );
        messageApi.success(`${folder.name} renamed.`);
      } else if (editor.kind === "create-project") {
        const project = await api.projects.create(editor.workspaceId, {
          ...(editorFolderId === ungroupedValue ? {} : { folderId: editorFolderId }),
          name: editorName,
        });
        messageApi.success(`${project.name} created.`);
      } else {
        const project = await api.projects.update(editor.workspaceId, editor.project.id, {
          folderId: editorFolderId === ungroupedValue ? null : editorFolderId,
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
      if (deleteTarget.kind === "folder") {
        await api.projects.deleteFolder(deleteTarget.workspaceId, deleteTarget.folderId);
        messageApi.success(`${deleteTarget.name} removed. Its projects are now ungrouped.`);
      } else {
        await api.projects.delete(deleteTarget.workspaceId, deleteTarget.projectId);
        messageApi.success(`${deleteTarget.name} deleted.`);
        navigate("/app");
      }
      setDeleteTarget(undefined);
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
    } catch (reason) {
      messageApi.error(errorMessage(reason, "The item could not be deleted."));
    } finally {
      setDeleting(false);
    }
  };

  const editorWorkspaceId = editor?.workspaceId;
  const folderOptions = [
    { label: "Ungrouped", value: ungroupedValue },
    ...(editorWorkspaceId
      ? catalogFor(editorWorkspaceId).folders.map((folder) => ({
          label: folder.name,
          value: folder.id,
        }))
      : []),
  ];
  const editorIsProject = editor?.kind === "create-project" || editor?.kind === "rename-project";
  const editorTitle =
    editor?.kind === "create-folder"
      ? "Create folder"
      : editor?.kind === "rename-folder"
        ? "Rename folder"
        : editor?.kind === "create-project"
          ? "Create project"
          : "Rename or move project";

  return (
    <>
      {messageHolder}
      <aside aria-label="Workspaces and projects" className="project-sidebar">
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
              maxLength={editorIsProject ? 120 : 80}
              onChange={(event) => {
                setEditorName(event.target.value);
                setEditorError(undefined);
              }}
              placeholder={editorIsProject ? "Project name" : "Folder name"}
              {...(editorError ? { status: "error" as const } : {})}
              value={editorName}
            />
          </Form.Item>
          {editorIsProject ? (
            <Form.Item label="Folder">
              <Select
                onChange={(value) => setEditorFolderId(String(value ?? ungroupedValue))}
                options={folderOptions}
                value={editorFolderId}
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>

      <Modal
        confirmLoading={deleting}
        okButtonProps={{ danger: true }}
        okText="Delete"
        onCancel={() => setDeleteTarget(undefined)}
        onOk={() => void confirmDelete()}
        open={deleteTarget !== undefined}
        title={deleteTarget?.kind === "folder" ? "Delete folder" : "Delete project"}
      >
        <Typography.Paragraph>
          {deleteTarget?.kind === "folder"
            ? `Delete ${deleteTarget.name}? Its projects will become ungrouped.`
            : `Delete ${deleteTarget?.name ?? "this project"}? This action removes it from ordinary navigation.`}
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
            : String(propertiesNode?.key).startsWith("folder:")
              ? "Folder properties"
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

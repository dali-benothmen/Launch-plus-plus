import type {
  ProjectCatalog,
  ProjectFolderSummary,
  ProjectSummary,
  WorkspaceSummary,
} from "@launchpp/api-client";
import {
  Alert,
  Button,
  Card,
  Dropdown,
  type DropdownMenuItem,
  Empty,
  FolderIcon,
  Form,
  Input,
  message,
  Modal,
  Spin,
  Table,
  type TableColumn,
  Typography,
} from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { invalidationEventName } from "./invalidation.js";
import { projectNavigationChangedEvent } from "./project-navigation.js";
import { ResourceFailure } from "./route-boundaries.js";

type EditorState =
  | { readonly kind: "create-folder" }
  | { readonly kind: "create-project" }
  | { readonly folder: ProjectFolderSummary; readonly kind: "rename-folder" }
  | { readonly kind: "rename-project"; readonly project: ProjectSummary };

type DeleteState =
  | { readonly folder: ProjectFolderSummary; readonly kind: "folder" }
  | { readonly kind: "project"; readonly project: ProjectSummary };

interface HomeData {
  readonly catalog: ProjectCatalog;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly workspace: WorkspaceSummary;
}

const updatedFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function WorkspaceProjectExperience({ page }: { readonly page: "home" | "projects" }) {
  const api = useApiClient();
  const navigate = useNavigate();
  const [data, setData] = useState<HomeData>();
  const [loadError, setLoadError] = useState<unknown>();
  const [openFolderId, setOpenFolderId] = useState<string>();
  const [editor, setEditor] = useState<EditorState>();
  const [editorName, setEditorName] = useState("");
  const [editorError, setEditorError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>();
  const [deleting, setDeleting] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string>();
  const [messageApi, messageHolder] = message.useMessage();

  const load = useCallback(async () => {
    setLoadError(undefined);
    try {
      const [session, context] = await Promise.all([
        api.auth.session(),
        api.workspaces.list({ limit: 100 }),
      ]);
      const workspace = context.workspaces.find((item) => item.id === context.currentWorkspaceId);
      if (!session || !workspace) throw new Error("Your workspace is not available.");
      const catalog = await api.projects.list(workspace.id, { limit: 100 });
      setData({
        catalog,
        ownerId: session.identity.id,
        ownerName: session.identity.name,
        workspace,
      });
    } catch (reason) {
      setLoadError(reason);
    }
  }, [api]);

  useEffect(() => {
    void load();
    const reloadInvalidated = (event: Event) => {
      const type = (event as CustomEvent<{ resourceType: string }>).detail.resourceType;
      if (type === "project" || type === "project_folder" || type === "workspace") void load();
    };
    const reload = () => void load();
    window.addEventListener(projectNavigationChangedEvent, reload);
    window.addEventListener(invalidationEventName, reloadInvalidated);
    return () => {
      window.removeEventListener(projectNavigationChangedEvent, reload);
      window.removeEventListener(invalidationEventName, reloadInvalidated);
    };
  }, [load]);

  const activeProjects = useMemo(
    () => data?.catalog.projects.filter((project) => project.archivedAt === undefined) ?? [],
    [data],
  );
  const currentFolder = data?.catalog.folders.find((folder) => folder.id === openFolderId);
  const visibleProjects = activeProjects
    .filter((project) => project.folderId === openFolderId)
    .toSorted((first, second) => first.position - second.position);
  const recentProjects = activeProjects
    .filter((project) => project.lastOpenedAt !== undefined)
    .toSorted((first, second) => (second.lastOpenedAt ?? 0) - (first.lastOpenedAt ?? 0))
    .slice(0, 5);
  const pinnedProjects = activeProjects.filter((project) => project.favorite);

  const notifyChange = () => window.dispatchEvent(new Event(projectNavigationChangedEvent));

  const openProject = useCallback(
    (project: ProjectSummary) => {
      void api.projects.markOpened(project.workspaceId, project.id).catch(() => undefined);
      navigate(`/app/workspaces/${project.workspaceId}/projects/${project.id}/board`);
    },
    [api, navigate],
  );

  const openEditor = (next: EditorState) => {
    setEditorError(undefined);
    setEditor(next);
    setEditorName(
      next.kind === "rename-folder"
        ? next.folder.name
        : next.kind === "rename-project"
          ? next.project.name
          : "",
    );
  };

  const closeEditor = () => {
    setEditor(undefined);
    setEditorName("");
    setEditorError(undefined);
  };

  const saveEditor = async () => {
    if (!data || !editor || !editorName.trim() || saving) return;
    setSaving(true);
    setEditorError(undefined);
    try {
      if (editor.kind === "create-project") {
        const project = await api.projects.create(data.workspace.id, {
          ...(openFolderId ? { folderId: openFolderId } : {}),
          name: editorName,
        });
        closeEditor();
        messageApi.success(`${project.name} created.`);
        notifyChange();
        openProject(project);
        return;
      }
      if (editor.kind === "create-folder") {
        const folder = await api.projects.createFolder(data.workspace.id, editorName);
        messageApi.success(`${folder.name} created.`);
      } else if (editor.kind === "rename-folder") {
        const folder = await api.projects.renameFolder(
          data.workspace.id,
          editor.folder.id,
          editorName,
        );
        messageApi.success(`${folder.name} renamed.`);
      } else {
        const project = await api.projects.update(data.workspace.id, editor.project.id, {
          name: editorName,
        });
        messageApi.success(`${project.name} renamed.`);
      }
      closeEditor();
      notifyChange();
      await load();
    } catch (reason) {
      setEditorError(reason);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!data || !deleteTarget || deleting) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "folder") {
        await api.projects.deleteFolder(data.workspace.id, deleteTarget.folder.id);
        if (openFolderId === deleteTarget.folder.id) setOpenFolderId(undefined);
        messageApi.success(`${deleteTarget.folder.name} deleted.`);
      } else {
        await api.projects.delete(data.workspace.id, deleteTarget.project.id);
        messageApi.success(`${deleteTarget.project.name} deleted.`);
      }
      setDeleteTarget(undefined);
      notifyChange();
      await load();
    } catch (reason) {
      messageApi.error(errorMessage(reason, "The item could not be deleted."));
    } finally {
      setDeleting(false);
    }
  };

  const togglePinned = async (project: ProjectSummary) => {
    try {
      await api.projects.setFavorite(
        data?.workspace.id ?? project.workspaceId,
        project.id,
        !project.favorite,
      );
      messageApi.success(project.favorite ? "Project unpinned." : "Project pinned.");
      notifyChange();
      await load();
    } catch (reason) {
      messageApi.error(errorMessage(reason, "Could not update the project."));
    }
  };

  const moveProject = async (projectId: string, folderId?: string) => {
    if (!data) return;
    const project = activeProjects.find((item) => item.id === projectId);
    if (!project || project.folderId === folderId) return;
    try {
      await api.projects.update(data.workspace.id, projectId, { folderId: folderId ?? null });
      messageApi.success(folderId ? "Project moved to folder." : "Project moved to workspace.");
      notifyChange();
      await load();
    } catch (reason) {
      messageApi.error(errorMessage(reason, "Could not move the project."));
    } finally {
      setDraggedProjectId(undefined);
    }
  };

  const projectMenu = (project: ProjectSummary): readonly DropdownMenuItem[] => [
    { key: "open", label: "Open", onClick: () => openProject(project) },
    {
      key: "pin",
      label: project.favorite ? "Unpin" : "Pin",
      onClick: () => void togglePinned(project),
    },
    ...(data?.catalog.folders.length
      ? [
          {
            children: [
              ...(project.folderId
                ? [
                    {
                      key: `move-root-${project.id}`,
                      label: "Workspace root",
                      onClick: () => void moveProject(project.id),
                    },
                  ]
                : []),
              ...data.catalog.folders
                .filter((folder) => folder.id !== project.folderId)
                .map((folder) => ({
                  key: `move-${project.id}-${folder.id}`,
                  label: folder.name,
                  onClick: () => void moveProject(project.id, folder.id),
                })),
            ],
            key: "move",
            label: "Move to",
          } satisfies DropdownMenuItem,
        ]
      : []),
    { type: "divider" },
    {
      key: "rename",
      label: "Rename",
      onClick: () => openEditor({ kind: "rename-project", project }),
    },
    {
      danger: true,
      key: "delete",
      label: "Delete project",
      onClick: () => setDeleteTarget({ kind: "project", project }),
    },
  ];

  const folderMenu = (folder: ProjectFolderSummary): readonly DropdownMenuItem[] => [
    { key: "open", label: "Open", onClick: () => setOpenFolderId(folder.id) },
    { type: "divider" },
    {
      key: "rename",
      label: "Rename",
      onClick: () => openEditor({ folder, kind: "rename-folder" }),
    },
    {
      danger: true,
      key: "delete",
      label: "Delete folder",
      onClick: () => setDeleteTarget({ folder, kind: "folder" }),
    },
  ];

  const columns: readonly TableColumn<ProjectSummary>[] = [
    {
      key: "project",
      title: "Project",
      render: (_, project) => (
        <Dropdown menu={{ items: projectMenu(project) }} trigger={["contextMenu"]}>
          <div className="project-table-name">
            <Typography.Link
              href={`/app/workspaces/${project.workspaceId}/projects/${project.id}/board`}
              onClick={(event) => {
                event.preventDefault();
                openProject(project);
              }}
            >
              {project.name}
            </Typography.Link>
            <Typography.Text type="secondary">{project.key}</Typography.Text>
          </div>
        </Dropdown>
      ),
    },
    {
      key: "owner",
      title: "Owner",
      render: (_, project) =>
        !project.createdByUserId || project.createdByUserId === data?.ownerId
          ? (data?.ownerName ?? "Workspace owner")
          : "Workspace member",
    },
    {
      dataIndex: "updatedAt",
      key: "updatedAt",
      title: "Last modified",
      render: (value) =>
        value === undefined ? "Unavailable" : updatedFormatter.format(new Date(Number(value))),
    },
    { key: "shared", title: "Shared with", render: () => "Only you" },
  ];

  if (loadError) return <ResourceFailure error={loadError} onRetry={() => void load()} />;
  if (!data) {
    return (
      <div className="page-loading">
        <Spin />
      </div>
    );
  }

  const renderProjectCard = (project: ProjectSummary) => (
    <Dropdown key={project.id} menu={{ items: projectMenu(project) }} trigger={["contextMenu"]}>
      <Card hoverable onDoubleClick={() => openProject(project)} size="small">
        <div className="project-card-copy">
          <Typography.Link
            href={`/app/workspaces/${project.workspaceId}/projects/${project.id}/board`}
            onClick={(event) => {
              event.preventDefault();
              openProject(project);
            }}
          >
            {project.name}
          </Typography.Link>
          <Typography.Text type="secondary">{project.key}</Typography.Text>
        </div>
      </Card>
    </Dropdown>
  );

  const editorTitle =
    editor?.kind === "create-folder"
      ? "Create folder"
      : editor?.kind === "create-project"
        ? "Create project"
        : editor?.kind === "rename-folder"
          ? "Rename folder"
          : "Rename project";

  return (
    <section
      aria-labelledby={page === "home" ? "home-title" : "projects-title"}
      className="page-stack workspace-home"
    >
      {messageHolder}
      {page === "home" ? (
        <>
          <Card className="workspace-welcome" variant="borderless">
            <div className="workspace-welcome-content">
              <div>
                <Typography.Text type="secondary">{data.workspace.name}</Typography.Text>
                <Typography.Title id="home-title" level={1}>
                  {activeProjects.length === 0
                    ? "Create your first project"
                    : `Welcome back, ${data.ownerName}`}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {activeProjects.length === 0
                    ? "Start with one project. You can organize it whenever you need to."
                    : "Open a recent project or continue from something you pinned."}
                </Typography.Text>
              </div>
              <Button onClick={() => openEditor({ kind: "create-project" })} variant="primary">
                Create project
              </Button>
            </div>
          </Card>

          {recentProjects.length > 0 ? (
            <section className="workspace-section" aria-labelledby="quick-access-title">
              <Typography.Title id="quick-access-title" level={2}>
                Quick access
              </Typography.Title>
              <div className="project-card-grid">{recentProjects.map(renderProjectCard)}</div>
            </section>
          ) : null}

          {pinnedProjects.length > 0 ? (
            <section className="workspace-section" aria-labelledby="pinned-title">
              <Typography.Title id="pinned-title" level={2}>
                Pinned
              </Typography.Title>
              <div className="project-card-grid">{pinnedProjects.map(renderProjectCard)}</div>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <header className="workspace-section-heading">
            <div>
              <Typography.Text type="secondary">{data.workspace.name}</Typography.Text>
              <Typography.Title id="projects-title" level={1}>
                Projects
              </Typography.Title>
            </div>
            <div className="workspace-actions">
              <Button onClick={() => openEditor({ kind: "create-folder" })}>New folder</Button>
              <Button onClick={() => openEditor({ kind: "create-project" })} variant="primary">
                New project
              </Button>
            </div>
          </header>

          <section className="workspace-section" aria-labelledby="folders-title">
            <Typography.Title id="folders-title" level={2}>
              Folders
            </Typography.Title>
            {data.catalog.folders.length > 0 ? (
              <div className="folder-grid">
                {data.catalog.folders
                  .toSorted((first, second) => first.position - second.position)
                  .map((folder) => (
                    <Dropdown
                      key={folder.id}
                      menu={{ items: folderMenu(folder) }}
                      trigger={["contextMenu"]}
                    >
                      <Card
                        hoverable
                        onDoubleClick={() => setOpenFolderId(folder.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.stopPropagation();
                          if (draggedProjectId) void moveProject(draggedProjectId, folder.id);
                        }}
                        size="small"
                      >
                        <Button
                          block
                          icon={<FolderIcon />}
                          onClick={() => setOpenFolderId(folder.id)}
                          variant="text"
                        >
                          {folder.name} ·{" "}
                          {
                            activeProjects.filter((project) => project.folderId === folder.id)
                              .length
                          }{" "}
                          projects
                        </Button>
                      </Card>
                    </Dropdown>
                  ))}
              </div>
            ) : (
              <Empty description="No folders yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </section>

          <section
            className="workspace-section"
            aria-labelledby="all-projects-title"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedProjectId && !openFolderId) void moveProject(draggedProjectId);
            }}
          >
            <div className="workspace-section-heading">
              <div>
                {currentFolder ? (
                  <div className="workspace-breadcrumb">
                    <Button
                      onClick={() => setOpenFolderId(undefined)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.stopPropagation();
                        if (draggedProjectId) void moveProject(draggedProjectId);
                      }}
                      size="small"
                      variant="link"
                    >
                      All projects
                    </Button>
                    <Typography.Text type="secondary">/</Typography.Text>
                    <Typography.Text>{currentFolder.name}</Typography.Text>
                  </div>
                ) : null}
                <Typography.Title id="all-projects-title" level={2}>
                  {currentFolder?.name ?? "All projects"}
                </Typography.Title>
              </div>
            </div>

            {visibleProjects.length > 0 ? (
              <Table<ProjectSummary>
                columns={columns}
                dataSource={visibleProjects}
                onRow={(project) => ({
                  draggable: true,
                  onDragEnd: () => setDraggedProjectId(undefined),
                  onDragStart: () => setDraggedProjectId(project.id),
                  onDoubleClick: () => openProject(project),
                })}
                pagination={false}
                rowKey="id"
              />
            ) : (
              <Empty description={currentFolder ? "This folder is empty" : "No projects here yet"}>
                <Button onClick={() => openEditor({ kind: "create-project" })} variant="primary">
                  Create project
                </Button>
              </Empty>
            )}
          </section>
        </>
      )}

      <Modal
        confirmLoading={saving}
        okButtonProps={{ disabled: !editorName.trim() }}
        okText={editor?.kind.startsWith("create") ? "Create" : "Save"}
        onCancel={closeEditor}
        onOk={() => void saveEditor()}
        open={Boolean(editor)}
        title={editorTitle}
      >
        <Form layout="vertical" onFinish={saveEditor}>
          <Form.Item
            label="Name"
            {...(editorError
              ? {
                  help: errorMessage(editorError, "Could not save this item."),
                  validateStatus: "error" as const,
                }
              : {})}
          >
            <Input
              autoFocus
              maxLength={120}
              onChange={(event) => setEditorName(event.target.value)}
              value={editorName}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={deleting}
        okText="Delete"
        okButtonProps={{ danger: true }}
        onCancel={() => setDeleteTarget(undefined)}
        onOk={() => void deleteItem()}
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.kind ?? "item"}?`}
      >
        <Alert
          description={
            deleteTarget?.kind === "folder"
              ? "Only empty folders can be deleted. Projects inside it are not removed."
              : "This removes the project and its tasks from the workspace."
          }
          showIcon
          title="This action cannot be undone."
          type="warning"
        />
      </Modal>
    </section>
  );
}

export function WorkspaceHomePage() {
  return <WorkspaceProjectExperience page="home" />;
}

export function WorkspaceProjectsPage() {
  return <WorkspaceProjectExperience page="projects" />;
}

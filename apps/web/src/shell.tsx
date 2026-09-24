import type { ProjectSummary, TeamSummary } from "@launchpp/api-client";
import {
  Alert,
  Avatar,
  Button,
  Dropdown,
  type DropdownMenuItem,
  Form,
  HomeIcon,
  InboxIcon,
  Input,
  LogoutIcon,
  MembersIcon,
  Modal,
  message,
  NotificationsIcon,
  OrganizationIcon,
  PluginsIcon,
  SearchIcon,
  SettingsIcon,
  TasksIcon,
  Typography,
} from "@launchpp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { GlobalSearch } from "./global-search.js";
import { InvalidationListener, invalidationEventName } from "./invalidation.js";
import { openProjectCreationEvent, projectNavigationChangedEvent } from "./project-navigation.js";

const globalLinks = [
  { icon: <HomeIcon aria-hidden />, label: "Home", to: "/app" },
  { icon: <OrganizationIcon aria-hidden />, label: "Organization", to: "/app/projects" },
  { icon: <PluginsIcon aria-hidden />, label: "Plugins", to: "/app/plugins" },
] as const;

const organizationLinks = [
  { icon: <InboxIcon aria-hidden />, label: "Inbox", to: "/app/inbox" },
  { icon: <TasksIcon aria-hidden />, label: "My tasks", to: "/app/my-tasks" },
  { icon: <MembersIcon aria-hidden />, label: "Team settings", to: "/app/members" },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function headerTitle(pathname: string) {
  if (pathname.includes("/projects/") && pathname.includes("/organizations/")) return "Tasks";
  if (pathname === "/app/projects") return "Organization";
  if (pathname === "/app/my-tasks") return "My tasks";
  if (pathname === "/app/inbox") return "Inbox";
  if (pathname === "/app/members") return "Team settings";
  if (pathname === "/app/plugins") return "Plugins";
  if (pathname === "/app/settings") return "Settings";
  return "Home";
}

function globalLinkIsActive(label: (typeof globalLinks)[number]["label"], pathname: string) {
  if (label === "Home") return pathname === "/app";
  if (label === "Organization") {
    return pathname === "/app/projects" || pathname.startsWith("/app/organizations/");
  }
  return pathname === "/app/plugins";
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AppShell() {
  const api = useApiClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, messageHolder] = message.useMessage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("Organization");
  const [memberName, setMemberName] = useState("Launch++ member");
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [teams, setTeams] = useState<readonly TeamSummary[]>([]);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectError, setProjectError] = useState<unknown>();
  const [savingProject, setSavingProject] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamError, setTeamError] = useState<unknown>();
  const [savingTeam, setSavingTeam] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadNavigation = useCallback(async () => {
    try {
      const [session, context] = await Promise.all([
        api.auth.session(),
        api.organizations.list({ limit: 100 }),
      ]);
      const organization = context.organizations.find(
        (item) => item.id === context.currentOrganizationId,
      );
      if (session) setMemberName(session.identity.name);
      if (!organization) return;
      setOrganizationId(organization.id);
      setOrganizationName(organization.name);
      const [catalog, nextTeams] = await Promise.all([
        api.projects.list(organization.id, { limit: 100 }),
        api.teams.list(organization.id),
      ]);
      setProjects(
        catalog.projects
          .filter((project) => project.archivedAt === undefined)
          .toSorted((first, second) => first.position - second.position),
      );
      setTeams(nextTeams);
    } catch {
      // Route-level screens own load failures. Navigation remains usable while they recover.
    }
  }, [api]);

  useEffect(() => {
    void loadNavigation();
    const reload = () => void loadNavigation();
    window.addEventListener(projectNavigationChangedEvent, reload);
    window.addEventListener(invalidationEventName, reload);
    return () => {
      window.removeEventListener(projectNavigationChangedEvent, reload);
      window.removeEventListener(invalidationEventName, reload);
    };
  }, [loadNavigation]);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    const openProjectModal = () => setProjectModalOpen(true);
    window.addEventListener("keydown", openSearch);
    window.addEventListener(openProjectCreationEvent, openProjectModal);
    return () => {
      window.removeEventListener("keydown", openSearch);
      window.removeEventListener(openProjectCreationEvent, openProjectModal);
    };
  }, []);

  const recentProject = useMemo(
    () =>
      projects
        .filter((project) => project.lastOpenedAt !== undefined)
        .toSorted((first, second) => (second.lastOpenedAt ?? 0) - (first.lastOpenedAt ?? 0))[0] ??
      projects[0],
    [projects],
  );
  const organizationTarget = recentProject
    ? `/app/organizations/${recentProject.organizationId}/projects/${recentProject.id}/board`
    : "/app/projects";
  const notificationItems: readonly DropdownMenuItem[] = [
    { disabled: true, key: "empty", label: "You have no new notifications" },
  ];

  const openProject = (project: ProjectSummary) => {
    void api.projects.markOpened(project.organizationId, project.id).catch(() => undefined);
    navigate(`/app/organizations/${project.organizationId}/projects/${project.id}/board`);
  };

  const createProject = async () => {
    if (!organizationId || !projectName.trim() || savingProject) return;
    setSavingProject(true);
    setProjectError(undefined);
    try {
      const project = await api.projects.create(organizationId, { name: projectName });
      await api.projects.markOpened(organizationId, project.id).catch(() => undefined);
      setProjectModalOpen(false);
      setProjectName("");
      messageApi.success(`${project.name} created.`);
      window.dispatchEvent(new Event(projectNavigationChangedEvent));
      await loadNavigation();
      navigate(`/app/organizations/${organizationId}/projects/${project.id}/board`);
    } catch (error) {
      setProjectError(error);
    } finally {
      setSavingProject(false);
    }
  };

  const createTeam = async () => {
    if (!organizationId || !teamName.trim() || savingTeam) return;
    setSavingTeam(true);
    setTeamError(undefined);
    try {
      const team = await api.teams.create(organizationId, { name: teamName });
      setTeams((current) => [...current, team]);
      setTeamModalOpen(false);
      setTeamName("");
      messageApi.success(`${team.name} created.`);
    } catch (error) {
      setTeamError(error);
    } finally {
      setSavingTeam(false);
    }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await api.auth.signOut();
      navigate("/sign-in", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="app-shell">
      {messageHolder}
      <InvalidationListener />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside aria-label="Global navigation" className="icon-rail">
        <NavLink aria-label="Launch++ home" className="brand-mark" to="/app">
          <span aria-hidden className="brand-glyph" />
        </NavLink>
        <nav className="rail-links">
          {globalLinks.map((item) => {
            const destination = item.label === "Organization" ? organizationTarget : item.to;
            return (
              <NavLink
                aria-label={item.label}
                className={`rail-link${globalLinkIsActive(item.label, location.pathname) ? " is-active" : ""}`}
                end={item.label !== "Organization"}
                key={item.to}
                onClick={(event) => {
                  if (item.label === "Organization" && recentProject) {
                    event.preventDefault();
                    openProject(recentProject);
                  }
                }}
                to={destination}
              >
                {item.icon}
              </NavLink>
            );
          })}
        </nav>
        <div className="rail-footer">
          <NavLink
            aria-label="Settings"
            className={({ isActive }) => `rail-link${isActive ? " is-active" : ""}`}
            to="/app/settings"
          >
            <SettingsIcon aria-hidden />
          </NavLink>
          <Button
            aria-label="Sign out"
            className="rail-action"
            icon={<LogoutIcon />}
            iconOnly
            loading={signingOut}
            onClick={() => void signOut()}
            size="small"
            variant="text"
          />
        </div>
      </aside>

      <aside aria-label="Organization navigation" className="organization-sidebar">
        <div className="organization-identity">
          <Typography.Text strong>{organizationName}</Typography.Text>
        </div>

        <nav className="organization-menu" aria-label="Organization menu">
          <Typography.Text className="sidebar-section-label" type="secondary">
            Main menu
          </Typography.Text>
          {organizationLinks.map((item) => (
            <NavLink
              className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`}
              key={item.to}
              to={item.to}
            >
              <span aria-hidden className="sidebar-icon">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-section">
          <Typography.Text className="sidebar-section-label" type="secondary">
            Projects
          </Typography.Text>
          <nav className="sidebar-projects" aria-label="Projects">
            {projects.map((project, index) => (
              <NavLink
                className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`}
                key={project.id}
                onClick={(event) => {
                  event.preventDefault();
                  openProject(project);
                }}
                to={`/app/organizations/${project.organizationId}/projects/${project.id}`}
              >
                <span aria-hidden className={`project-nav-icon is-color-${(index % 3) + 1}`}>
                  {project.name.slice(0, 1).toUpperCase()}
                </span>
                <span>{project.name}</span>
              </NavLink>
            ))}
            <Button
              className="sidebar-create-button"
              disabled={!organizationId}
              onClick={() => setProjectModalOpen(true)}
              size="small"
              variant="dashed"
            >
              + New project
            </Button>
          </nav>
        </div>

        <div className="sidebar-section">
          <Typography.Text className="sidebar-section-label" type="secondary">
            Teams
          </Typography.Text>
          <div className="sidebar-projects">
            {teams.map((team) => (
              <div className="sidebar-link sidebar-team" key={team.id}>
                <span aria-hidden className="sidebar-icon">
                  <MembersIcon />
                </span>
                <span>{team.name}</span>
              </div>
            ))}
            <Button
              className="sidebar-create-button"
              disabled={!organizationId}
              onClick={() => setTeamModalOpen(true)}
              size="small"
              variant="dashed"
            >
              + New team
            </Button>
          </div>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <Typography.Text className="app-header-title">
            {headerTitle(location.pathname)}
          </Typography.Text>
          <Input
            aria-label="Search"
            className="app-header-search"
            onClick={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setSearchOpen(true);
            }}
            placeholder="Search"
            prefix={<SearchIcon aria-hidden />}
            readOnly
            shape="round"
            size="small"
            value=""
          />
          <div className="app-header-actions">
            <Dropdown
              menu={{ items: notificationItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Button
                aria-label="Notifications"
                icon={<NotificationsIcon />}
                iconOnly
                size="small"
                variant="text"
              />
            </Dropdown>
            <Avatar size="small" title={memberName}>
              {initials(memberName) || "U"}
            </Avatar>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <GlobalSearch onClose={() => setSearchOpen(false)} open={searchOpen} />

      <Modal
        confirmLoading={savingProject}
        okButtonProps={{ disabled: !projectName.trim() }}
        okText="Create project"
        onCancel={() => {
          setProjectModalOpen(false);
          setProjectError(undefined);
        }}
        onOk={() => void createProject()}
        open={projectModalOpen}
        title="Create project"
      >
        {projectError ? (
          <Alert
            showIcon
            title={errorMessage(projectError, "Could not create the project.")}
            type="error"
          />
        ) : null}
        <Form layout="vertical" onFinish={createProject}>
          <Form.Item label="Project name" required>
            <Input
              autoFocus
              maxLength={120}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Website redesign"
              value={projectName}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={savingTeam}
        okButtonProps={{ disabled: !teamName.trim() }}
        okText="Create team"
        onCancel={() => {
          setTeamModalOpen(false);
          setTeamError(undefined);
        }}
        onOk={() => void createTeam()}
        open={teamModalOpen}
        title="Create team"
      >
        {teamError ? (
          <Alert
            showIcon
            title={errorMessage(teamError, "Could not create the team.")}
            type="error"
          />
        ) : null}
        <Form layout="vertical" onFinish={createTeam}>
          <Form.Item label="Team name" required>
            <Input
              autoFocus
              maxLength={80}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Design"
              value={teamName}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

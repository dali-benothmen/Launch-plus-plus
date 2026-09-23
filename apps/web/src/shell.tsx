import type { ProjectSummary } from "@launchpp/api-client";
import {
  Avatar,
  Button,
  Dropdown,
  type DropdownMenuItem,
  HomeIcon,
  InboxIcon,
  Input,
  LogoutIcon,
  MembersIcon,
  NotificationsIcon,
  OrganizationIcon,
  PluginsIcon,
  ProjectsIcon,
  SearchIcon,
  SettingsIcon,
  TasksIcon,
  ThemeIcon,
  Tooltip,
  Typography,
} from "@launchpp/ui";
import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";
import { GlobalSearch } from "./global-search.js";
import { InvalidationListener, invalidationEventName } from "./invalidation.js";
import { projectNavigationChangedEvent } from "./project-navigation.js";
import { themeOptions, useThemeController } from "./theme-context.js";

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

export function AppShell() {
  const api = useApiClient();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useThemeController();
  const [searchOpen, setSearchOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("Organization");
  const [memberName, setMemberName] = useState("Launch++ member");
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
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
      setOrganizationName(organization.name);
      const catalog = await api.projects.list(organization.id, { limit: 100 });
      setProjects(
        catalog.projects
          .filter((project) => project.archivedAt === undefined)
          .toSorted((first, second) => first.position - second.position),
      );
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
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  const themeItems: readonly DropdownMenuItem[] = themeOptions.map((option) => ({
    key: option.value,
    label: option.value === theme.themeId ? `${option.label} (current)` : option.label,
    onClick: () => theme.setTheme(option.value),
  }));
  const notificationItems: readonly DropdownMenuItem[] = [
    { disabled: true, key: "empty", label: "You have no new notifications" },
  ];

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
      <InvalidationListener />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside aria-label="Global navigation" className="icon-rail">
        <NavLink aria-label="Launch++ home" className="brand-mark" to="/app">
          L+
        </NavLink>
        <nav className="rail-links">
          {globalLinks.map((item) => (
            <Tooltip key={item.to} placement="right" title={item.label}>
              <NavLink
                aria-label={item.label}
                className={({ isActive }) => {
                  const organizationActive =
                    item.label === "Organization" &&
                    (location.pathname.startsWith("/app/projects") ||
                      location.pathname.startsWith("/app/organizations/"));
                  return `rail-link${isActive || organizationActive ? " is-active" : ""}`;
                }}
                end={item.to === "/app" || item.to === "/app/projects"}
                to={item.to}
              >
                {item.icon}
              </NavLink>
            </Tooltip>
          ))}
        </nav>
        <div className="rail-footer">
          <Tooltip placement="right" title="Settings">
            <NavLink
              aria-label="Settings"
              className={({ isActive }) => `rail-link${isActive ? " is-active" : ""}`}
              to="/app/settings"
            >
              <SettingsIcon aria-hidden />
            </NavLink>
          </Tooltip>
          <Tooltip placement="right" title="Sign out">
            <Button
              aria-label="Sign out"
              icon={<LogoutIcon />}
              iconOnly
              loading={signingOut}
              onClick={() => void signOut()}
              variant="text"
            />
          </Tooltip>
        </div>
      </aside>

      <aside aria-label="Organization navigation" className="organization-sidebar">
        <div className="organization-identity">
          <Typography.Text strong>{organizationName}</Typography.Text>
          <Typography.Text type="secondary">Organization</Typography.Text>
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
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section-heading">
            <Typography.Text className="sidebar-section-label" type="secondary">
              Projects
            </Typography.Text>
            <Button
              aria-label="Create project"
              onClick={() => navigate("/app/projects/new")}
              size="small"
              variant="text"
            >
              +
            </Button>
          </div>
          <nav className="sidebar-projects" aria-label="Projects">
            {projects.map((project) => (
              <NavLink
                className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`}
                key={project.id}
                to={`/app/organizations/${project.organizationId}/projects/${project.id}`}
              >
                <ProjectsIcon aria-hidden />
                <span>{project.name}</span>
              </NavLink>
            ))}
            <NavLink className="sidebar-link is-muted" to="/app/projects/new">
              <span aria-hidden>+</span>
              <span>New project</span>
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-heading">
            <Typography.Text className="sidebar-section-label" type="secondary">
              Teams
            </Typography.Text>
          </div>
          <Typography.Text className="sidebar-empty-copy" type="secondary">
            No teams yet
          </Typography.Text>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <Typography.Text className="app-header-title">Launch++</Typography.Text>
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
            value=""
          />
          <div className="app-header-actions">
            <Dropdown menu={{ items: themeItems }} placement="bottomRight" trigger={["click"]}>
              <Button
                aria-label="Choose appearance"
                icon={<ThemeIcon />}
                iconOnly
                title={theme.theme.name}
                variant="text"
              />
            </Dropdown>
            <Dropdown
              menu={{ items: notificationItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Button
                aria-label="Notifications"
                icon={<NotificationsIcon />}
                iconOnly
                variant="text"
              />
            </Dropdown>
            <Avatar size="medium" title={memberName}>
              {initials(memberName) || "U"}
            </Avatar>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <GlobalSearch onClose={() => setSearchOpen(false)} open={searchOpen} />
    </div>
  );
}

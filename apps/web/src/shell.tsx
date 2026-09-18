import {
  AddIcon,
  Button,
  DarkThemeIcon,
  HomeIcon,
  LightThemeIcon,
  MembersIcon,
  ProjectsIcon,
  SettingsIcon,
  Tooltip,
  Typography,
} from "@launchpp/ui";
import { NavLink, Outlet } from "react-router-dom";
import { useThemeController } from "./theme-context.js";

const iconLinks = [
  { icon: <HomeIcon aria-hidden />, label: "My Work", to: "/app" },
  { icon: <MembersIcon aria-hidden />, label: "Members", to: "/app/members" },
  { icon: <SettingsIcon aria-hidden />, label: "Settings", to: "/app/settings" },
] as const;

export function AppShell() {
  const theme = useThemeController();

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
      </aside>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

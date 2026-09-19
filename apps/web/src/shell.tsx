import {
  Button,
  DarkThemeIcon,
  Drawer,
  ExpandNavigationIcon,
  HomeIcon,
  LightThemeIcon,
  MembersIcon,
  SettingsIcon,
  Tooltip,
} from "@launchpp/ui";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ProjectSidebar } from "./project-sidebar.js";
import { useThemeController } from "./theme-context.js";

const iconLinks = [
  { icon: <HomeIcon aria-hidden />, label: "My Work", to: "/app" },
  { icon: <MembersIcon aria-hidden />, label: "Members", to: "/app/members" },
  { icon: <SettingsIcon aria-hidden />, label: "Settings", to: "/app/settings" },
] as const;

export function AppShell() {
  const theme = useThemeController();
  const [compact, setCompact] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 760px)").matches,
  );
  const [projectNavigationOpen, setProjectNavigationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setCompact(media.matches);
      if (!media.matches) setProjectNavigationOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div className={`app-shell${sidebarCollapsed && !compact ? " is-sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside aria-label="Primary navigation" className="icon-rail">
        <NavLink aria-label="Launch++ home" className="brand-mark" to="/app">
          L+
        </NavLink>
        {compact ? (
          <Tooltip placement="right" title="Open workspace sidebar">
            <Button
              aria-label="Open workspace sidebar"
              icon={<ExpandNavigationIcon />}
              iconOnly
              onClick={() => setProjectNavigationOpen(true)}
              variant="text"
            />
          </Tooltip>
        ) : null}
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

      {compact ? (
        <Drawer
          mask
          onClose={() => setProjectNavigationOpen(false)}
          open={projectNavigationOpen}
          placement="left"
          size="min(86vw, 320px)"
          title="Workspaces and projects"
        >
          <ProjectSidebar
            embedded
            onCollapseToggle={() => setProjectNavigationOpen(false)}
            onNavigate={() => setProjectNavigationOpen(false)}
          />
        </Drawer>
      ) : (
        <ProjectSidebar
          collapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed((current) => !current)}
        />
      )}

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

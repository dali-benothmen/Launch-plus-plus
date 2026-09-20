import {
  Button,
  Dropdown,
  type DropdownMenuItem,
  HomeIcon,
  MembersIcon,
  ProjectsIcon,
  SearchIcon,
  SettingsIcon,
  ThemeIcon,
  Tooltip,
} from "@launchpp/ui";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { GlobalSearch } from "./global-search.js";
import { InvalidationListener } from "./invalidation.js";
import { themeOptions, useThemeController } from "./theme-context.js";

const iconLinks = [
  { icon: <HomeIcon aria-hidden />, label: "Home", to: "/app" },
  { icon: <ProjectsIcon aria-hidden />, label: "Projects", to: "/app/projects" },
  { icon: <MembersIcon aria-hidden />, label: "Members", to: "/app/members" },
  { icon: <SettingsIcon aria-hidden />, label: "Settings", to: "/app/settings" },
] as const;

export function AppShell() {
  const theme = useThemeController();
  const [searchOpen, setSearchOpen] = useState(false);
  const themeItems: readonly DropdownMenuItem[] = themeOptions.map((option) => ({
    key: option.value,
    label: option.value === theme.themeId ? `${option.label} (current)` : option.label,
    onClick: () => theme.setTheme(option.value),
  }));

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

  return (
    <div className="app-shell">
      <InvalidationListener />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside aria-label="Primary navigation" className="icon-rail">
        <NavLink aria-label="Launch++ home" className="brand-mark" to="/app">
          L+
        </NavLink>
        <nav className="rail-links">
          <Tooltip placement="right" title="Search">
            <Button
              aria-label="Search"
              icon={<SearchIcon />}
              iconOnly
              onClick={() => setSearchOpen(true)}
              variant="text"
            />
          </Tooltip>
          {iconLinks.map((item) => (
            <Tooltip key={item.to} placement="right" title={item.label}>
              <NavLink
                aria-label={item.label}
                className={({ isActive }) => `rail-link${isActive ? " is-active" : ""}`}
                end={item.to === "/app" || item.to === "/app/projects"}
                to={item.to}
              >
                {item.icon}
              </NavLink>
            </Tooltip>
          ))}
        </nav>
        <Dropdown menu={{ items: themeItems }} placement="rightBottom" trigger={["click"]}>
          <Button
            aria-label="Choose appearance"
            icon={<ThemeIcon />}
            iconOnly
            size="large"
            title={theme.theme.name}
            variant="text"
          />
        </Dropdown>
      </aside>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <GlobalSearch onClose={() => setSearchOpen(false)} open={searchOpen} />
    </div>
  );
}

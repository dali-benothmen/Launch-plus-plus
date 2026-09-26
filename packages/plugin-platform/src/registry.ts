import type { PluginPackageManifest, PreviewPermission } from "@launchpp/plugin-protocol";

export interface EnabledExtensionPackage {
  readonly acceptedPermissions: readonly PreviewPermission[];
  readonly manifest: PluginPackageManifest;
  readonly packageId: string;
  readonly projectEnabled: boolean;
}

export interface ExtensionRegistryScope {
  readonly organizationId: string;
  readonly projectId?: string;
}

export type ExtensionRegistryDiagnosticCode =
  | "contribution_id_collision"
  | "dependency_version_mismatch"
  | "missing_dependency"
  | "permission_grant_invalid"
  | "route_collision";

export interface ExtensionRegistryDiagnostic {
  readonly code: ExtensionRegistryDiagnosticCode;
  readonly contributionId?: string;
  readonly message: string;
  readonly pluginId: string;
  readonly relatedPluginId?: string;
  readonly severity: "error";
}

export interface ExtensionRegistryPackage {
  readonly acceptedPermissions: readonly PreviewPermission[];
  readonly id: string;
  readonly name: string;
  readonly pluginId: string;
  readonly projectEnabled: boolean;
  readonly version: string;
}

interface ResolvedContributionBase {
  readonly activationScope: "organization" | "project";
  readonly id: string;
  readonly localId: string;
  readonly packageId: string;
  readonly pluginId: string;
}

export interface ResolvedPageContribution extends ResolvedContributionBase {
  readonly path: string;
  readonly scope: "organization" | "project";
  readonly surface: string;
  readonly title: string;
}

export interface ResolvedRouteContribution extends ResolvedContributionBase {
  readonly pageId: string;
  readonly path: string;
}

export interface ResolvedNavigationContribution extends ResolvedContributionBase {
  readonly icon?: string;
  readonly label: string;
  readonly pageId: string;
  readonly route: string;
  readonly slot: "organization.navigation" | "project.navigation";
}

export interface ResolvedPanelContribution extends ResolvedContributionBase {
  readonly slot: "task.details.panels" | "board.sidebar";
  readonly surface: string;
  readonly title: string;
}

export interface ResolvedActionContribution extends ResolvedContributionBase {
  readonly handler: string;
  readonly icon?: string;
  readonly inputSchema?: string;
  readonly slot:
    | "project.toolbar"
    | "task.actions"
    | "task.card.actions"
    | "board.toolbar"
    | "board.card.actions"
    | "commandPalette";
  readonly title: string;
}

export interface ResolvedSettingsContribution extends ResolvedContributionBase {
  readonly fields?: readonly Record<string, unknown>[];
  readonly scope: "user" | "organization" | "project";
  readonly surface?: string;
  readonly title: string;
}

export interface ResolvedFieldContribution extends ResolvedContributionBase {
  readonly description?: string;
  readonly label: string;
  readonly placements: readonly (
    | "task.details.fields"
    | "task.card.badges"
    | "task.list.columns"
  )[];
  readonly type: "number" | "text";
}

export interface ResolvedExtensionRegistry {
  readonly actions: readonly ResolvedActionContribution[];
  readonly diagnostics: readonly ExtensionRegistryDiagnostic[];
  readonly fields: readonly ResolvedFieldContribution[];
  readonly navigation: readonly ResolvedNavigationContribution[];
  readonly packages: readonly ExtensionRegistryPackage[];
  readonly pages: readonly ResolvedPageContribution[];
  readonly panels: readonly ResolvedPanelContribution[];
  readonly routes: readonly ResolvedRouteContribution[];
  readonly scope: ExtensionRegistryScope;
  readonly settings: readonly ResolvedSettingsContribution[];
}

type ContributionKind = "action" | "field" | "navigation" | "page" | "panel" | "route" | "settings";

export function stableContributionId(
  pluginId: string,
  kind: ContributionKind,
  localId: string,
): string {
  return `${pluginId}/${kind}/${localId}`;
}

interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

function parseVersion(value: string): ParsedVersion | undefined {
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(value);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
  };
}

function compare(left: ParsedVersion, right: ParsedVersion): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

function satisfiesComparator(version: ParsedVersion, expression: string): boolean {
  const match = /^(>=|<=|>|<)?(.+)$/.exec(expression);
  const requestedText = match?.[2];
  const requested = requestedText ? parseVersion(requestedText) : undefined;
  if (!requested) return false;
  const difference = compare(version, requested);
  switch (match?.[1]) {
    case ">=":
      return difference >= 0;
    case "<=":
      return difference <= 0;
    case ">":
      return difference > 0;
    case "<":
      return difference < 0;
    default:
      return difference === 0;
  }
}

function satisfiesVersionRange(versionValue: string, range: string): boolean {
  if (range === "*") return true;
  const version = parseVersion(versionValue);
  if (!version) return false;
  if (range.startsWith("^")) {
    const minimum = parseVersion(range.slice(1));
    if (!minimum || compare(version, minimum) < 0) return false;
    const maximum =
      minimum.major > 0
        ? { major: minimum.major + 1, minor: 0, patch: 0 }
        : minimum.minor > 0
          ? { major: 0, minor: minimum.minor + 1, patch: 0 }
          : { major: 0, minor: 0, patch: minimum.patch + 1 };
    return compare(version, maximum) < 0;
  }
  if (range.startsWith("~")) {
    const minimum = parseVersion(range.slice(1));
    return Boolean(
      minimum &&
        compare(version, minimum) >= 0 &&
        compare(version, { major: minimum.major, minor: minimum.minor + 1, patch: 0 }) < 0,
    );
  }
  return range.split(/\s+/).every((part) => satisfiesComparator(version, part));
}

function extensionRoute(
  scope: ExtensionRegistryScope,
  pluginId: string,
  pageScope: "organization" | "project",
  path: string,
): string {
  const organizationRoot = `/app/organizations/${encodeURIComponent(scope.organizationId)}`;
  const root =
    pageScope === "project"
      ? `${organizationRoot}/projects/${encodeURIComponent(scope.projectId ?? "")}`
      : organizationRoot;
  return `${root}/extensions/${encodeURIComponent(pluginId)}/${path}`;
}

function projectContributionEnabled(
  scope: ExtensionRegistryScope,
  pluginPackage: EnabledExtensionPackage,
): boolean {
  return scope.projectId !== undefined && pluginPackage.projectEnabled;
}

export function resolveExtensionRegistry(
  scope: ExtensionRegistryScope,
  enabledPackages: readonly EnabledExtensionPackage[],
): ResolvedExtensionRegistry {
  const diagnostics: ExtensionRegistryDiagnostic[] = [];
  const packagesByPlugin = new Map(enabledPackages.map((item) => [item.manifest.id, item]));
  const blockedPlugins = new Set<string>();

  for (const pluginPackage of enabledPackages) {
    const { manifest } = pluginPackage;
    const requestedPermissions = new Set(manifest.permissions);
    for (const permission of pluginPackage.acceptedPermissions) {
      if (!requestedPermissions.has(permission)) {
        diagnostics.push({
          code: "permission_grant_invalid",
          message: `Accepted permission '${permission}' is not requested by ${manifest.id}.`,
          pluginId: manifest.id,
          severity: "error",
        });
        blockedPlugins.add(manifest.id);
      }
    }
    for (const [dependencyId, range] of Object.entries(manifest.dependencies?.required ?? {})) {
      const dependency = packagesByPlugin.get(dependencyId);
      if (!dependency) {
        diagnostics.push({
          code: "missing_dependency",
          message: `${manifest.id} requires ${dependencyId} ${range}, but it is not enabled.`,
          pluginId: manifest.id,
          relatedPluginId: dependencyId,
          severity: "error",
        });
        blockedPlugins.add(manifest.id);
      } else if (!satisfiesVersionRange(dependency.manifest.version, range)) {
        diagnostics.push({
          code: "dependency_version_mismatch",
          message: `${manifest.id} requires ${dependencyId} ${range}, but ${dependency.manifest.version} is enabled.`,
          pluginId: manifest.id,
          relatedPluginId: dependencyId,
          severity: "error",
        });
        blockedPlugins.add(manifest.id);
      }
    }
  }

  const pages: ResolvedPageContribution[] = [];
  const routes: ResolvedRouteContribution[] = [];
  const navigation: ResolvedNavigationContribution[] = [];
  const panels: ResolvedPanelContribution[] = [];
  const actions: ResolvedActionContribution[] = [];
  const settings: ResolvedSettingsContribution[] = [];
  const fields: ResolvedFieldContribution[] = [];
  const contributionOwners = new Map<string, string>();
  const routeOwners = new Map<string, string>();

  const register = (id: string, pluginId: string): boolean => {
    const owner = contributionOwners.get(id);
    if (owner) {
      diagnostics.push({
        code: "contribution_id_collision",
        contributionId: id,
        message: `Contribution '${id}' collides with a contribution from ${owner}.`,
        pluginId,
        relatedPluginId: owner,
        severity: "error",
      });
      return false;
    }
    contributionOwners.set(id, pluginId);
    return true;
  };

  for (const pluginPackage of [...enabledPackages].sort((left, right) =>
    left.manifest.id.localeCompare(right.manifest.id),
  )) {
    const { manifest, packageId } = pluginPackage;
    if (blockedPlugins.has(manifest.id)) continue;
    const contributions = manifest.contributes;

    for (const page of contributions?.pages ?? []) {
      const activationScope = page.scope;
      if (activationScope === "project" && !projectContributionEnabled(scope, pluginPackage)) {
        continue;
      }
      if (activationScope === "project" && scope.projectId === undefined) continue;
      const id = stableContributionId(manifest.id, "page", page.id);
      if (!register(id, manifest.id)) continue;
      const route = extensionRoute(scope, manifest.id, page.scope, page.path);
      const existingRoute = routeOwners.get(route);
      if (existingRoute) {
        diagnostics.push({
          code: "route_collision",
          contributionId: id,
          message: `Route '${route}' collides with ${existingRoute}.`,
          pluginId: manifest.id,
          relatedPluginId: existingRoute.split("/", 1)[0] ?? existingRoute,
          severity: "error",
        });
        continue;
      }
      routeOwners.set(route, id);
      const base = {
        activationScope,
        id,
        localId: page.id,
        packageId,
        pluginId: manifest.id,
      } as const;
      pages.push({
        ...base,
        path: page.path,
        scope: page.scope,
        surface: page.surface,
        title: page.title,
      });
      const routeId = stableContributionId(manifest.id, "route", page.id);
      routes.push({ ...base, id: routeId, pageId: id, path: route });
      if (page.navigation) {
        const navigationId = stableContributionId(manifest.id, "navigation", page.id);
        navigation.push({
          ...base,
          ...(page.navigation.icon ? { icon: page.navigation.icon } : {}),
          id: navigationId,
          label: page.navigation.label,
          pageId: id,
          route,
          slot: page.navigation.slot,
        });
      }
    }

    if (projectContributionEnabled(scope, pluginPackage)) {
      for (const panel of contributions?.panels ?? []) {
        const id = stableContributionId(manifest.id, "panel", panel.id);
        if (!register(id, manifest.id)) continue;
        panels.push({
          activationScope: "project",
          id,
          localId: panel.id,
          packageId,
          pluginId: manifest.id,
          slot: panel.slot,
          surface: panel.surface,
          title: panel.title,
        });
      }
      for (const field of contributions?.taskFields ?? []) {
        const id = stableContributionId(manifest.id, "field", field.id);
        if (!register(id, manifest.id)) continue;
        fields.push({
          activationScope: "project",
          ...(field.description ? { description: field.description } : {}),
          id,
          label: field.label,
          localId: field.id,
          packageId,
          placements: field.placements ?? [],
          pluginId: manifest.id,
          type: field.type,
        });
      }
    }

    for (const action of contributions?.actions ?? []) {
      const activationScope = action.slot === "commandPalette" ? "organization" : "project";
      if (activationScope === "project" && !projectContributionEnabled(scope, pluginPackage)) {
        continue;
      }
      const id = stableContributionId(manifest.id, "action", action.id);
      if (!register(id, manifest.id)) continue;
      actions.push({
        activationScope,
        handler: action.handler,
        ...(action.icon ? { icon: action.icon } : {}),
        id,
        ...(action.inputSchema ? { inputSchema: action.inputSchema } : {}),
        localId: action.id,
        packageId,
        pluginId: manifest.id,
        slot: action.slot,
        title: action.title,
      });
    }

    for (const setting of contributions?.settings ?? []) {
      const activationScope = setting.scope === "project" ? "project" : "organization";
      if (activationScope === "project" && !projectContributionEnabled(scope, pluginPackage)) {
        continue;
      }
      const id = stableContributionId(manifest.id, "settings", setting.id);
      if (!register(id, manifest.id)) continue;
      settings.push({
        activationScope,
        ...("fields" in setting
          ? { fields: setting.fields as readonly Record<string, unknown>[] }
          : {}),
        id,
        localId: setting.id,
        packageId,
        pluginId: manifest.id,
        scope: setting.scope,
        ...("surface" in setting ? { surface: setting.surface } : {}),
        title: setting.title,
      });
    }
  }

  return Object.freeze({
    actions: Object.freeze(actions),
    diagnostics: Object.freeze(diagnostics),
    fields: Object.freeze(fields),
    navigation: Object.freeze(navigation),
    packages: Object.freeze(
      enabledPackages.map((item) => ({
        acceptedPermissions: item.acceptedPermissions,
        id: item.packageId,
        name: item.manifest.name,
        pluginId: item.manifest.id,
        projectEnabled: item.projectEnabled,
        version: item.manifest.version,
      })),
    ),
    pages: Object.freeze(pages),
    panels: Object.freeze(panels),
    routes: Object.freeze(routes),
    scope: Object.freeze({ ...scope }),
    settings: Object.freeze(settings),
  });
}

import type { ReadContext } from "../shared/transactions.js";
import type { WorkspaceRepository } from "./workspace.js";

export function normalizeWorkspaceName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > 80) {
    throw new TypeError("Workspace name must contain between 1 and 80 characters.");
  }
  return name;
}

function slugBase(name: string): string {
  const value = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return value || "workspace";
}

export function availableWorkspaceSlug(
  context: ReadContext,
  repository: WorkspaceRepository,
  installationId: string,
  name: string,
): string {
  const base = slugBase(name);
  let candidate = base;
  let suffix = 2;
  while (repository.findBySlug(context, installationId, candidate)) {
    candidate = `${base.slice(0, Math.max(1, 48 - String(suffix).length - 1))}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function defaultWorkspaceName(displayName: string): string {
  const name = displayName.trim().replace(/\s+/g, " ");
  if (name.length === 0) return "My Workspace";
  return normalizeWorkspaceName(`${name.slice(0, 66)}'s Workspace`);
}

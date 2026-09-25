import type { ReadContext } from "../shared/transactions.js";
import type { ProjectRepository } from "./project.js";

export function normalizeProjectName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > 120) {
    throw new TypeError("Project name must contain between 1 and 120 characters.");
  }
  return name;
}

export function normalizeFolderName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > 80) {
    throw new TypeError("Folder name must contain between 1 and 80 characters.");
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
    .slice(0, 64)
    .replace(/-+$/g, "");
  return value || "project";
}

export function availableProjectSlug(
  context: ReadContext,
  repository: ProjectRepository,
  organizationId: string,
  name: string,
): string {
  const base = slugBase(name);
  let candidate = base;
  let suffix = 2;
  while (repository.findProjectBySlug(context, organizationId, candidate)) {
    candidate = `${base.slice(0, Math.max(1, 64 - String(suffix).length - 1))}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function keyBase(name: string): string {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const initials = words.map((word) => word[0]).join("");
  const compact = words.join("");
  return (initials.length >= 2 ? initials : compact).slice(0, 6) || "PROJ";
}

export function availableProjectKey(
  context: ReadContext,
  repository: ProjectRepository,
  organizationId: string,
  name: string,
): string {
  const base = keyBase(name);
  let candidate = base;
  let suffix = 2;
  while (repository.findProjectByKey(context, organizationId, candidate)) {
    candidate = `${base.slice(0, Math.max(1, 10 - String(suffix).length))}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

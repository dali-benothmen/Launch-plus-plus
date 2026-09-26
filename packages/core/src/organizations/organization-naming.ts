import type { ReadContext } from "../shared/transactions.js";
import {
  type OrganizationRepository,
  OrganizationSlugInvalidError,
  OrganizationSlugReservedError,
} from "./organization.js";

export const ORGANIZATION_SLUG_MIN_LENGTH = 3;
export const ORGANIZATION_SLUG_MAX_LENGTH = 48;

const reservedOrganizationSlugs = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "plugins",
  "settings",
  "setup",
  "support",
  "www",
]);

export function normalizeOrganizationName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > 80) {
    throw new TypeError("Organization name must contain between 1 and 80 characters.");
  }
  return name;
}

function slugBase(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ORGANIZATION_SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function isOrganizationSlugReserved(value: string): boolean {
  return reservedOrganizationSlugs.has(value.trim().toLowerCase());
}

export function normalizeOrganizationSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (
    slug.length < ORGANIZATION_SLUG_MIN_LENGTH ||
    slug.length > ORGANIZATION_SLUG_MAX_LENGTH ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new OrganizationSlugInvalidError(
      "Organization slug must contain 3 to 48 lowercase letters, numbers, or single hyphens.",
    );
  }
  if (isOrganizationSlugReserved(slug)) {
    throw new OrganizationSlugReservedError(`The organization slug "${slug}" is reserved.`);
  }
  return slug;
}

export function suggestOrganizationSlug(value: string): string {
  const name = normalizeOrganizationName(value);
  const base = slugBase(name) || "organization";
  const candidate =
    base.length < ORGANIZATION_SLUG_MIN_LENGTH || isOrganizationSlugReserved(base)
      ? `${base}-organization`
      : base;
  return normalizeOrganizationSlug(
    candidate.slice(0, ORGANIZATION_SLUG_MAX_LENGTH).replace(/-+$/g, ""),
  );
}

export function availableOrganizationSlug(
  context: ReadContext,
  repository: OrganizationRepository,
  installationId: string,
  name: string,
): string {
  const base = suggestOrganizationSlug(name);
  let candidate = base;
  let suffix = 2;
  while (repository.findBySlug(context, installationId, candidate)) {
    candidate = `${base
      .slice(
        0,
        Math.max(
          ORGANIZATION_SLUG_MIN_LENGTH,
          ORGANIZATION_SLUG_MAX_LENGTH - String(suffix).length - 1,
        ),
      )
      .replace(/-+$/g, "")}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

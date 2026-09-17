import type Type from "typebox";
import { Value } from "typebox/value";

import { PLUGIN_API_VERSION, PLUGIN_PROTOCOL_VERSION } from "./constants.js";
import {
  type InstalledPluginManifest,
  InstalledPluginManifestSchema,
  type PluginMessage,
  PluginMessageSchema,
} from "./schemas.js";

export interface ValidationIssue {
  readonly keyword: string;
  readonly message: string;
  readonly path: string;
}

export type ValidationResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly issues: readonly ValidationIssue[]; readonly ok: false };

function validateSchema<Schema extends Type.TSchema>(
  schema: Schema,
  value: unknown,
): ValidationResult<Type.Static<Schema>> {
  const issues = Value.Errors(schema, value).map((error) => ({
    keyword: error.keyword,
    message: error.message,
    path: error.instancePath || "/",
  }));

  return issues.length === 0
    ? { ok: true, value: value as Type.Static<Schema> }
    : { issues, ok: false };
}

function issue(path: string, keyword: string, message: string): ValidationIssue {
  return { keyword, message, path };
}

function contributionIssues(manifest: InstalledPluginManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const surfaces = new Set(Object.keys(manifest.browser?.surfaces ?? {}));
  const contributionIds = new Map<string, string>();
  const groups = manifest.contributes ?? {};

  for (const [kind, contributions] of Object.entries(groups)) {
    for (const [index, contribution] of (contributions ?? []).entries()) {
      const path = `/contributes/${kind}/${index}`;
      const previousPath = contributionIds.get(contribution.id);

      if (previousPath !== undefined) {
        issues.push(
          issue(
            `${path}/id`,
            "uniqueContributionId",
            `Contribution id '${contribution.id}' is already used at ${previousPath}.`,
          ),
        );
      } else {
        contributionIds.set(contribution.id, `${path}/id`);
      }

      if ("surface" in contribution && !surfaces.has(contribution.surface)) {
        issues.push(
          issue(
            `${path}/surface`,
            "surfaceReference",
            `Surface '${contribution.surface}' is not declared in browser.surfaces.`,
          ),
        );
      }
    }
  }

  return issues;
}

export function validateInstalledPluginManifest(
  value: unknown,
): ValidationResult<InstalledPluginManifest> {
  const structural = validateSchema(InstalledPluginManifestSchema, value);
  if (!structural.ok) {
    return structural;
  }

  const issues: ValidationIssue[] = [];
  if (structural.value.apiVersion !== PLUGIN_API_VERSION) {
    issues.push(
      issue(
        "/apiVersion",
        "compatibility",
        `Unsupported plugin API version '${structural.value.apiVersion}'; this host supports '${PLUGIN_API_VERSION}'.`,
      ),
    );
  }
  issues.push(...contributionIssues(structural.value));

  return issues.length === 0 ? structural : { issues, ok: false };
}

export function validatePluginMessage(value: unknown): ValidationResult<PluginMessage> {
  const structural = validateSchema(PluginMessageSchema, value);
  if (!structural.ok) {
    return structural;
  }

  if (structural.value.protocolVersion !== PLUGIN_PROTOCOL_VERSION) {
    return {
      issues: [
        issue(
          "/protocolVersion",
          "compatibility",
          `Unsupported plugin protocol version '${structural.value.protocolVersion}'; this host supports '${PLUGIN_PROTOCOL_VERSION}'.`,
        ),
      ],
      ok: false,
    };
  }

  return structural;
}

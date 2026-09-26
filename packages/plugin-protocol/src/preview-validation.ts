import type Type from "typebox";
import { Value } from "typebox/value";

import { PLUGIN_PREVIEW_API_VERSION } from "./constants.js";
import type {
  PluginPackageIntegrity,
  PluginPackageManifest,
  PluginSourceManifest,
} from "./preview-schemas.js";
import {
  PluginPackageIntegritySchema,
  PluginPackageManifestSchema,
  PluginSourceManifestSchema,
} from "./preview-schemas.js";
import type { ValidationIssue, ValidationResult } from "./validation.js";

type PreviewManifest = PluginSourceManifest | PluginPackageManifest;
type ReferencedContribution = {
  readonly handler?: string;
  readonly id: string;
  readonly surface?: string;
};

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

function apiRangeIssues(manifest: PreviewManifest): ValidationIssue[] {
  const minimum = Number.parseInt(manifest.apiVersion.minimum, 10);
  const maximumExclusive = Number.parseInt(manifest.apiVersion.maximumExclusive, 10);
  const supported = Number.parseInt(PLUGIN_PREVIEW_API_VERSION, 10);
  const issues: ValidationIssue[] = [];

  if (minimum >= maximumExclusive) {
    issues.push(
      issue(
        "/apiVersion/maximumExclusive",
        "apiRange",
        "maximumExclusive must be greater than minimum.",
      ),
    );
    return issues;
  }

  if (supported < minimum || supported >= maximumExclusive) {
    issues.push(
      issue(
        "/apiVersion",
        "compatibility",
        `Plugin API range [${minimum}, ${maximumExclusive}) does not include this host's supported major '${PLUGIN_PREVIEW_API_VERSION}'.`,
      ),
    );
  }

  return issues;
}

function contributionIssues(manifest: PreviewManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const surfaceIds = new Set(Object.keys(manifest.browser?.surfaces ?? {}));
  const handlerIds = new Set(Object.keys(manifest.server?.handlers ?? {}));
  const contributionIds = new Map<string, string>();
  const routeKeys = new Map<string, string>();
  const groups: readonly [string, readonly ReferencedContribution[]][] = [
    ["actions", manifest.contributes?.actions ?? []],
    ["pages", manifest.contributes?.pages ?? []],
    ["panels", manifest.contributes?.panels ?? []],
    ["settings", manifest.contributes?.settings ?? []],
    ["taskFields", manifest.contributes?.taskFields ?? []],
  ];

  for (const [kind, contributions] of groups) {
    for (const [index, contribution] of contributions.entries()) {
      const path = `/contributes/${kind}/${index}`;
      const previousPath = contributionIds.get(contribution.id);
      if (previousPath) {
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

      if (contribution.surface && !surfaceIds.has(contribution.surface)) {
        issues.push(
          issue(
            `${path}/surface`,
            "surfaceReference",
            `Surface '${contribution.surface}' is not declared in browser.surfaces.`,
          ),
        );
      }

      if (contribution.handler && !handlerIds.has(contribution.handler)) {
        issues.push(
          issue(
            `${path}/handler`,
            "handlerReference",
            `Handler '${contribution.handler}' is not declared in server.handlers.`,
          ),
        );
      }
    }
  }

  for (const [index, page] of (manifest.contributes?.pages ?? []).entries()) {
    const routeKey = `${page.scope}:${page.path}`;
    const path = `/contributes/pages/${index}/path`;
    const previousPath = routeKeys.get(routeKey);
    if (previousPath) {
      issues.push(
        issue(
          path,
          "uniqueContributionRoute",
          `The ${page.scope} route '${page.path}' is already used at ${previousPath}.`,
        ),
      );
    } else {
      routeKeys.set(routeKey, path);
    }
  }

  for (const [settingsIndex, settings] of (manifest.contributes?.settings ?? []).entries()) {
    if (!("fields" in settings)) continue;
    const fieldIds = new Map<string, string>();
    for (const [fieldIndex, field] of settings.fields.entries()) {
      const path = `/contributes/settings/${settingsIndex}/fields/${fieldIndex}`;
      const previousPath = fieldIds.get(field.id);
      if (previousPath) {
        issues.push(
          issue(
            `${path}/id`,
            "uniqueSettingFieldId",
            `Setting field id '${field.id}' is already used at ${previousPath}.`,
          ),
        );
      } else {
        fieldIds.set(field.id, `${path}/id`);
      }

      if (field.type === "number") {
        if (
          field.minimum !== undefined &&
          field.maximum !== undefined &&
          field.minimum > field.maximum
        ) {
          issues.push(
            issue(
              `${path}/maximum`,
              "fieldRange",
              "maximum must be greater than or equal to minimum.",
            ),
          );
        }
        if (
          field.default !== undefined &&
          ((field.minimum !== undefined && field.default < field.minimum) ||
            (field.maximum !== undefined && field.default > field.maximum))
        ) {
          issues.push(
            issue(
              `${path}/default`,
              "fieldDefault",
              "The default value must fall within the declared number range.",
            ),
          );
        }
      }

      if (
        field.type === "text" &&
        field.default !== undefined &&
        field.maxLength !== undefined &&
        field.default.length > field.maxLength
      ) {
        issues.push(
          issue(`${path}/default`, "fieldDefault", "The default text exceeds maxLength."),
        );
      }

      if (field.type === "select") {
        const values = new Map<string, string>();
        for (const [optionIndex, option] of field.options.entries()) {
          const optionPath = `${path}/options/${optionIndex}/value`;
          const previousOptionPath = values.get(option.value);
          if (previousOptionPath) {
            issues.push(
              issue(
                optionPath,
                "uniqueSettingOption",
                `Select option value '${option.value}' is already used at ${previousOptionPath}.`,
              ),
            );
          } else {
            values.set(option.value, optionPath);
          }
        }
        if (
          field.default !== undefined &&
          !field.options.some((option) => option.value === field.default)
        ) {
          issues.push(
            issue(
              `${path}/default`,
              "fieldDefault",
              `Default value '${field.default}' is not declared in options.`,
            ),
          );
        }
      }
    }
  }

  return issues;
}

function dependencyIssues(manifest: PreviewManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = manifest.dependencies?.required ?? {};
  const optional = manifest.dependencies?.optional ?? {};

  for (const kind of ["required", "optional"] as const) {
    const dependencies = kind === "required" ? required : optional;
    if (manifest.id in dependencies) {
      issues.push(
        issue(
          `/dependencies/${kind}/${manifest.id}`,
          "selfDependency",
          "A plugin cannot depend on itself.",
        ),
      );
    }
  }

  for (const dependencyId of Object.keys(required)) {
    if (dependencyId in optional) {
      issues.push(
        issue(
          `/dependencies/optional/${dependencyId}`,
          "duplicateDependency",
          `Dependency '${dependencyId}' is already declared as required.`,
        ),
      );
    }
  }

  return issues;
}

function manifestIssues(manifest: PreviewManifest): ValidationIssue[] {
  return [
    ...apiRangeIssues(manifest),
    ...contributionIssues(manifest),
    ...dependencyIssues(manifest),
  ];
}

export function validatePluginSourceManifest(
  value: unknown,
): ValidationResult<PluginSourceManifest> {
  const structural = validateSchema(PluginSourceManifestSchema, value);
  if (!structural.ok) return structural;

  const issues = manifestIssues(structural.value);
  return issues.length === 0 ? structural : { issues, ok: false };
}

export function validatePluginPackageManifest(
  value: unknown,
): ValidationResult<PluginPackageManifest> {
  const structural = validateSchema(PluginPackageManifestSchema, value);
  if (!structural.ok) return structural;

  const issues = manifestIssues(structural.value);
  return issues.length === 0 ? structural : { issues, ok: false };
}

export function validatePluginPackageIntegrity(
  value: unknown,
): ValidationResult<PluginPackageIntegrity> {
  const structural = validateSchema(PluginPackageIntegritySchema, value);
  if (!structural.ok) return structural;

  const issues: ValidationIssue[] = [];
  if ("integrity.json" in structural.value.files) {
    issues.push(
      issue(
        "/files/integrity.json",
        "integritySelfReference",
        "integrity.json must not include a digest for itself.",
      ),
    );
  }
  if (Object.keys(structural.value.files).length === 0) {
    issues.push(
      issue("/files", "integrityCoverage", "Integrity metadata must cover at least manifest.json."),
    );
  }
  if (!("manifest.json" in structural.value.files)) {
    issues.push(
      issue(
        "/files/manifest.json",
        "integrityCoverage",
        "Integrity metadata must include manifest.json.",
      ),
    );
  }

  return issues.length === 0 ? structural : { issues, ok: false };
}

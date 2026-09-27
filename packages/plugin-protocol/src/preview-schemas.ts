import Type from "typebox";

import {
  PLUGIN_PREVIEW_API_VERSION,
  PLUGIN_PREVIEW_INTEGRITY_VERSION,
  PLUGIN_PREVIEW_MANIFEST_VERSION,
} from "./constants.js";
import {
  ArchivePathSchema,
  IdentifierSchema,
  PackageFilePathSchema,
  PluginIdSchema,
} from "./schemas.js";

const semverPattern =
  "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$";
const versionRangePattern =
  "^(?:\\*|(?:(?:\\^|~|>=|<=|>|<)?[0-9]+(?:\\.[0-9]+){0,2}(?:-[0-9A-Za-z.-]+)?)(?:\\s+(?:(?:>=|<=|>|<)[0-9]+(?:\\.[0-9]+){0,2}(?:-[0-9A-Za-z.-]+)?))*)$";
const apiMajorPattern = "^[1-9][0-9]{0,5}$";
const routePathPattern = "^[a-z0-9]+(?:[/-][a-z0-9]+)*$";
const exportNamePattern = "^[A-Za-z_$][A-Za-z0-9_$]*$";

const StrictObject = <const Properties extends Type.TProperties>(
  properties: Properties,
  options: Omit<Type.TObjectOptions, "additionalProperties"> = {},
) => Type.Object(properties, { ...options, additionalProperties: false });

const DisplayNameSchema = Type.String({
  description: "Human-readable name shown in Launch++.",
  maxLength: 120,
  minLength: 1,
  pattern: "\\S",
});

const DescriptionSchema = Type.String({
  description: "Short plain-text explanation shown during package review.",
  maxLength: 500,
  minLength: 1,
  pattern: "\\S",
});

export const PluginVersionSchema = Type.String({
  description: "Plugin release version expressed as semantic versioning.",
  examples: ["1.0.0"],
  maxLength: 64,
  pattern: semverPattern,
});

export const PluginVersionRangeSchema = Type.String({
  description:
    "Preview compatibility range using an exact version, wildcard, caret, tilde, or ordered comparator set.",
  examples: ["^1.0.0", ">=1.0.0 <2.0.0"],
  maxLength: 120,
  minLength: 1,
  pattern: versionRangePattern,
});

export const PluginApiRangeSchema = StrictObject(
  {
    maximumExclusive: Type.String({
      description: "First unsupported Launch++ plugin API major.",
      examples: ["2"],
      pattern: apiMajorPattern,
    }),
    minimum: Type.String({
      description: "Oldest supported Launch++ plugin API major.",
      examples: [PLUGIN_PREVIEW_API_VERSION],
      pattern: apiMajorPattern,
    }),
  },
  {
    $id: "LaunchppPluginApiRangeV1Preview",
    description: "Half-open Launch++ plugin API major range: minimum inclusive, maximum exclusive.",
    title: "Launch++ plugin API range v1-preview",
  },
);

export const PluginCompatibilitySchema = StrictObject(
  {
    host: Type.Optional(
      Type.String({
        ...PluginVersionRangeSchema,
        description: "Compatible Launch++ application versions.",
      }),
    ),
    sdk: Type.Optional(
      Type.String({
        ...PluginVersionRangeSchema,
        description: "Compatible @launchpp/sdk versions used to build browser or server code.",
      }),
    ),
    ui: Type.Optional(
      Type.String({
        ...PluginVersionRangeSchema,
        description: "Compatible @launchpp/ui versions used to build custom React surfaces.",
      }),
    ),
  },
  {
    $id: "LaunchppPluginCompatibilityV1Preview",
    description: "Optional build-time compatibility evidence recorded for review and diagnostics.",
    title: "Launch++ plugin compatibility v1-preview",
  },
);

export const PreviewPermissionSchema = Type.Union(
  [
    Type.Literal("projects:read"),
    Type.Literal("projects:write"),
    Type.Literal("tasks:read"),
    Type.Literal("tasks:write"),
    Type.Literal("comments:read"),
    Type.Literal("comments:write"),
    Type.Literal("members:read"),
  ],
  {
    $id: "LaunchppPluginPermissionV1Preview",
    description: "A bounded host capability requested by the plugin.",
    title: "Launch++ plugin permission v1-preview",
  },
);

export const PluginAuthoringAdapterSchema = Type.Union(
  [
    Type.Literal("react-vite"),
    Type.Literal("vanilla-typescript-vite"),
    Type.Literal("vanilla-javascript-vite"),
  ],
  {
    $id: "LaunchppPluginAuthoringAdapterV1Preview",
    description: "Supported local build adapter. This field is removed from the installed package.",
    title: "Launch++ plugin authoring adapter v1-preview",
  },
);

export const PluginDependenciesSchema = StrictObject(
  {
    optional: Type.Optional(
      Type.Record(PluginIdSchema, PluginVersionRangeSchema, {
        description: "Packages that enable optional integration behavior when present.",
      }),
    ),
    required: Type.Optional(
      Type.Record(PluginIdSchema, PluginVersionRangeSchema, {
        description:
          "Packages that must be installed and compatible before this plugin is enabled.",
      }),
    ),
  },
  {
    $id: "LaunchppPluginDependenciesV1Preview",
    description:
      "Package-level dependencies only; direct source or storage access is never granted.",
    title: "Launch++ plugin dependencies v1-preview",
  },
);

export const SourceBrowserSurfaceSchema = StrictObject(
  {
    entry: Type.String({
      ...ArchivePathSchema,
      description:
        "Author-project HTML, JavaScript, TypeScript, or TSX entry compiled by the adapter.",
      examples: ["./src/pages/SprintsPage.tsx"],
    }),
  },
  {
    $id: "LaunchppSourceBrowserSurfaceV1Preview",
    description: "A custom browser surface in the author project.",
    title: "Launch++ source browser surface v1-preview",
  },
);

export const PackageBrowserSurfaceSchema = StrictObject(
  {
    document: Type.String({
      ...ArchivePathSchema,
      description: "Packaged self-contained HTML document loaded in a sandboxed frame.",
      examples: ["./browser/surfaces/sprints/index.html"],
    }),
  },
  {
    $id: "LaunchppPackageBrowserSurfaceV1Preview",
    description: "A normalized browser surface in an installed package.",
    title: "Launch++ package browser surface v1-preview",
  },
);

export const SourceServerHandlerSchema = StrictObject(
  {
    entry: Type.String({
      ...ArchivePathSchema,
      description: "Author-project JavaScript or TypeScript module compiled by the packer.",
      examples: ["./src/actions/addToSprint.ts"],
    }),
    export: Type.String({
      description: "Named function exported by the source module.",
      examples: ["addToSprint"],
      maxLength: 100,
      minLength: 1,
      pattern: exportNamePattern,
    }),
  },
  {
    $id: "LaunchppSourceServerHandlerV1Preview",
    description:
      "A server handler source entry. Executable handlers remain operator-trusted preview code.",
    title: "Launch++ source server handler v1-preview",
  },
);

export const PackageServerHandlerSchema = StrictObject(
  {
    export: Type.String({
      description: "Named handler function exported by the normalized module.",
      maxLength: 100,
      minLength: 1,
      pattern: exportNamePattern,
    }),
    module: Type.String({
      ...ArchivePathSchema,
      description: "Packaged isolated-runtime JavaScript module.",
      examples: ["./server/handlers.js"],
    }),
  },
  {
    $id: "LaunchppPackageServerHandlerV1Preview",
    description: "A normalized server handler in an installed package.",
    title: "Launch++ package server handler v1-preview",
  },
);

export const NavigationContributionSchema = StrictObject({
  icon: Type.Optional(
    Type.String({
      description: "Host icon identifier.",
      maxLength: 80,
      minLength: 1,
    }),
  ),
  label: Type.String({
    description: "Navigation label.",
    maxLength: 80,
    minLength: 1,
  }),
  slot: Type.Union([Type.Literal("organization.navigation"), Type.Literal("project.navigation")]),
});

export const PreviewPageContributionSchema = StrictObject(
  {
    id: IdentifierSchema,
    navigation: Type.Optional(NavigationContributionSchema),
    path: Type.String({
      description: "Host-owned path segment beneath the organization or project plugin route.",
      maxLength: 120,
      minLength: 1,
      pattern: routePathPattern,
    }),
    scope: Type.Union([Type.Literal("organization"), Type.Literal("project")]),
    surface: IdentifierSchema,
    title: DisplayNameSchema,
  },
  {
    $id: "LaunchppPageContributionV1Preview",
    description: "A custom organization or project page rendered in a sandboxed browser surface.",
    title: "Launch++ page contribution v1-preview",
  },
);

export const PreviewPanelContributionSchema = StrictObject(
  {
    id: IdentifierSchema,
    slot: Type.Union([Type.Literal("task.details.panels"), Type.Literal("board.sidebar")]),
    surface: IdentifierSchema,
    title: DisplayNameSchema,
  },
  {
    $id: "LaunchppPanelContributionV1Preview",
    description: "A substantial custom panel rendered in a sandboxed browser surface.",
    title: "Launch++ panel contribution v1-preview",
  },
);

export const PreviewActionContributionSchema = StrictObject(
  {
    handler: IdentifierSchema,
    icon: Type.Optional(Type.String({ maxLength: 80, minLength: 1 })),
    id: IdentifierSchema,
    inputSchema: Type.Optional(
      Type.String({
        ...ArchivePathSchema,
        description: "Static JSON Schema used by the host to render and validate action input.",
      }),
    ),
    slot: Type.Union([
      Type.Literal("project.toolbar"),
      Type.Literal("task.actions"),
      Type.Literal("task.card.actions"),
      Type.Literal("board.toolbar"),
      Type.Literal("board.card.actions"),
      Type.Literal("commandPalette"),
    ]),
    title: DisplayNameSchema,
  },
  {
    $id: "LaunchppActionContributionV1Preview",
    description: "A host-rendered action backed by a declared server handler.",
    title: "Launch++ action contribution v1-preview",
  },
);

const SettingFieldBase = {
  description: Type.Optional(Type.String({ maxLength: 240, minLength: 1 })),
  id: IdentifierSchema,
  label: Type.String({ maxLength: 120, minLength: 1 }),
  required: Type.Optional(Type.Boolean()),
} as const;

export const TextSettingFieldSchema = StrictObject({
  ...SettingFieldBase,
  default: Type.Optional(Type.String({ maxLength: 500 })),
  maxLength: Type.Optional(Type.Integer({ maximum: 500, minimum: 1 })),
  type: Type.Literal("text"),
});

export const NumberSettingFieldSchema = StrictObject({
  ...SettingFieldBase,
  default: Type.Optional(Type.Number()),
  maximum: Type.Optional(Type.Number()),
  minimum: Type.Optional(Type.Number()),
  type: Type.Literal("number"),
});

export const BooleanSettingFieldSchema = StrictObject({
  ...SettingFieldBase,
  default: Type.Optional(Type.Boolean()),
  type: Type.Literal("boolean"),
});

export const SelectSettingFieldSchema = StrictObject({
  ...SettingFieldBase,
  default: Type.Optional(Type.String({ maxLength: 120, minLength: 1 })),
  options: Type.Array(
    StrictObject({
      label: Type.String({ maxLength: 120, minLength: 1 }),
      value: Type.String({ maxLength: 120, minLength: 1 }),
    }),
    { maxItems: 100, minItems: 1 },
  ),
  type: Type.Literal("select"),
});

export const SettingFieldSchema = Type.Union(
  [
    TextSettingFieldSchema,
    NumberSettingFieldSchema,
    BooleanSettingFieldSchema,
    SelectSettingFieldSchema,
  ],
  {
    $id: "LaunchppSettingFieldV1Preview",
    description: "A standard setting control rendered and persisted by the host.",
    title: "Launch++ setting field v1-preview",
  },
);

const SettingsContributionBase = {
  id: IdentifierSchema,
  scope: Type.Union([Type.Literal("user"), Type.Literal("organization"), Type.Literal("project")]),
  title: DisplayNameSchema,
} as const;

export const NativeSettingsContributionSchema = StrictObject({
  ...SettingsContributionBase,
  fields: Type.Array(SettingFieldSchema, { maxItems: 100, minItems: 1 }),
});

export const CustomSettingsContributionSchema = StrictObject({
  ...SettingsContributionBase,
  surface: IdentifierSchema,
});

export const PreviewSettingsContributionSchema = Type.Union(
  [NativeSettingsContributionSchema, CustomSettingsContributionSchema],
  {
    $id: "LaunchppSettingsContributionV1Preview",
    description:
      "Host-rendered standard settings fields or one substantial custom settings surface.",
    title: "Launch++ settings contribution v1-preview",
  },
);

export const PreviewTaskFieldContributionSchema = StrictObject(
  {
    description: Type.Optional(Type.String({ maxLength: 240, minLength: 1 })),
    id: IdentifierSchema,
    label: Type.String({ maxLength: 120, minLength: 1 }),
    placements: Type.Optional(
      Type.Array(
        Type.Union([
          Type.Literal("task.details.fields"),
          Type.Literal("task.card.badges"),
          Type.Literal("task.list.columns"),
        ]),
        { maxItems: 3, minItems: 1, uniqueItems: true },
      ),
    ),
    type: Type.Union([Type.Literal("number"), Type.Literal("text")]),
  },
  {
    $id: "LaunchppTaskFieldContributionV1Preview",
    description:
      "A host-managed task field available to task detail, Board badges, List columns, filters, sorting, and export.",
    title: "Launch++ task field contribution v1-preview",
  },
);

export const PreviewContributionsSchema = StrictObject(
  {
    actions: Type.Optional(
      Type.Array(PreviewActionContributionSchema, { maxItems: 100, uniqueItems: true }),
    ),
    pages: Type.Optional(
      Type.Array(PreviewPageContributionSchema, { maxItems: 100, uniqueItems: true }),
    ),
    panels: Type.Optional(
      Type.Array(PreviewPanelContributionSchema, { maxItems: 100, uniqueItems: true }),
    ),
    settings: Type.Optional(
      Type.Array(PreviewSettingsContributionSchema, { maxItems: 100, uniqueItems: true }),
    ),
    taskFields: Type.Optional(
      Type.Array(PreviewTaskFieldContributionSchema, { maxItems: 100, uniqueItems: true }),
    ),
  },
  {
    $id: "LaunchppContributionsV1Preview",
    description: "Static host-rendered and custom-surface contributions registered by the plugin.",
    title: "Launch++ contributions v1-preview",
  },
);

const PreviewManifestIdentity = {
  apiVersion: PluginApiRangeSchema,
  compatibility: Type.Optional(PluginCompatibilitySchema),
  contributes: Type.Optional(PreviewContributionsSchema),
  dependencies: Type.Optional(PluginDependenciesSchema),
  description: Type.Optional(DescriptionSchema),
  id: PluginIdSchema,
  manifestVersion: Type.Literal(PLUGIN_PREVIEW_MANIFEST_VERSION, {
    description: "Preview manifest schema version.",
  }),
  name: DisplayNameSchema,
  permissions: Type.Array(PreviewPermissionSchema, {
    description: "Complete permission request shown before enablement.",
    maxItems: 100,
    uniqueItems: true,
  }),
  version: PluginVersionSchema,
} as const;

export const PluginSourceManifestSchema = StrictObject(
  {
    $schema: Type.Optional(
      Type.String({
        description: "JSON Schema location used by editors for completion and diagnostics.",
        maxLength: 300,
        minLength: 1,
      }),
    ),
    ...PreviewManifestIdentity,
    authoring: StrictObject({
      adapter: PluginAuthoringAdapterSchema,
    }),
    browser: Type.Optional(
      StrictObject({
        surfaces: Type.Record(IdentifierSchema, SourceBrowserSurfaceSchema),
      }),
    ),
    server: Type.Optional(
      StrictObject({
        handlers: Type.Record(IdentifierSchema, SourceServerHandlerSchema),
      }),
    ),
  },
  {
    $id: "https://launchpp.dev/schemas/plugin-source-v1-preview.json",
    description:
      "Authoritative launchpp.plugin.json contract consumed by Launch++ authoring tools.",
    title: "Launch++ source plugin manifest v1-preview",
  },
);

export const PluginPackageManifestSchema = StrictObject(
  {
    ...PreviewManifestIdentity,
    browser: Type.Optional(
      StrictObject({
        surfaces: Type.Record(IdentifierSchema, PackageBrowserSurfaceSchema),
      }),
    ),
    server: Type.Optional(
      StrictObject({
        handlers: Type.Record(IdentifierSchema, PackageServerHandlerSchema),
      }),
    ),
  },
  {
    $id: "https://launchpp.dev/schemas/plugin-package-manifest-v1-preview.json",
    description:
      "Generated manifest.json contract installed by Launch++; it contains normalized artifacts only.",
    title: "Launch++ package manifest v1-preview",
  },
);

export const PluginPackageFileIntegritySchema = StrictObject({
  sha256: Type.String({
    description: "Lowercase SHA-256 digest of the exact packaged file bytes.",
    pattern: "^[a-f0-9]{64}$",
  }),
  sizeBytes: Type.Integer({
    description: "Expanded file size used for package review and bounded intake.",
    maximum: 10_485_760,
    minimum: 0,
  }),
});

export const PluginPackageIntegritySchema = StrictObject(
  {
    algorithm: Type.Literal("sha256"),
    files: Type.Record(PackageFilePathSchema, PluginPackageFileIntegritySchema),
    formatVersion: Type.Literal(PLUGIN_PREVIEW_INTEGRITY_VERSION),
  },
  {
    $id: "https://launchpp.dev/schemas/plugin-package-integrity-v1-preview.json",
    description:
      "Generated integrity.json contract covering every package file except integrity.json itself.",
    title: "Launch++ package integrity v1-preview",
  },
);

export const PluginPackageMetadataSchema = StrictObject(
  {
    integrity: PluginPackageIntegritySchema,
    manifest: PluginPackageManifestSchema,
  },
  {
    $id: "LaunchppPluginPackageMetadataV1Preview",
    description: "Validated package metadata returned by non-executing archive inspection.",
    title: "Launch++ package metadata v1-preview",
  },
);

export type PluginApiRange = Type.Static<typeof PluginApiRangeSchema>;
export type PluginCompatibility = Type.Static<typeof PluginCompatibilitySchema>;
export type PluginDependencies = Type.Static<typeof PluginDependenciesSchema>;
export type PluginSourceManifest = Type.Static<typeof PluginSourceManifestSchema>;
export type PluginPackageManifest = Type.Static<typeof PluginPackageManifestSchema>;
export type PluginPackageIntegrity = Type.Static<typeof PluginPackageIntegritySchema>;
export type PluginPackageMetadata = Type.Static<typeof PluginPackageMetadataSchema>;
export type PreviewContributions = Type.Static<typeof PreviewContributionsSchema>;
export type PreviewPermission = Type.Static<typeof PreviewPermissionSchema>;

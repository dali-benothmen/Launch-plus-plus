import Type from "typebox";

import { PLUGIN_API_VERSION, PLUGIN_ERROR_CODES, PLUGIN_MESSAGE_TYPES } from "./constants.js";

const identifierPattern = "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$";
const pluginIdPattern = "^[a-z0-9]+(?:[.-][a-z0-9]+)+$";
const permissionPattern =
  "^[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*)*:[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*)*$";
const protocolVersionPattern = "^[0-9]+\\.[0-9]+$";
const semverPattern =
  "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$";
const relativeArchivePathPattern = "^\\./(?!.*(?:^|/)\\.\\.(?:/|$))[A-Za-z0-9._/-]+$";
const packageFilePathPattern = "^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$))(?!.*\\\\)[A-Za-z0-9._/-]+$";
const routePathPattern = "^[a-z0-9]+(?:[/-][a-z0-9]+)*$";

const StrictObject = <const Properties extends Type.TProperties>(
  properties: Properties,
  options: Omit<Type.TObjectOptions, "additionalProperties"> = {},
) => Type.Object(properties, { ...options, additionalProperties: false });

export const IdentifierSchema = Type.String({
  maxLength: 80,
  minLength: 1,
  pattern: identifierPattern,
});

export const PluginIdSchema = Type.String({
  maxLength: 120,
  minLength: 3,
  pattern: pluginIdPattern,
});

export const PermissionSchema = Type.String({
  maxLength: 120,
  minLength: 3,
  pattern: permissionPattern,
});

export const ProtocolVersionSchema = Type.String({
  maxLength: 16,
  pattern: protocolVersionPattern,
});

export const ArchivePathSchema = Type.String({
  maxLength: 240,
  minLength: 3,
  pattern: relativeArchivePathPattern,
});

export const PackageFilePathSchema = Type.String({
  maxLength: 240,
  minLength: 1,
  pattern: packageFilePathPattern,
});

export const BrowserSurfaceSchema = StrictObject(
  { document: ArchivePathSchema },
  { $id: "LaunchppBrowserSurface" },
);

export const NavigationSchema = StrictObject({
  icon: Type.Optional(Type.String({ maxLength: 80, minLength: 1 })),
  label: Type.String({ maxLength: 80, minLength: 1 }),
  slot: Type.Union([Type.Literal("workspace.navigation"), Type.Literal("project.navigation")]),
});

export const PageContributionSchema = StrictObject(
  {
    id: IdentifierSchema,
    navigation: Type.Optional(NavigationSchema),
    path: Type.String({
      maxLength: 120,
      minLength: 1,
      pattern: routePathPattern,
    }),
    scope: Type.Union([Type.Literal("workspace"), Type.Literal("project")]),
    surface: IdentifierSchema,
    title: Type.String({ maxLength: 120, minLength: 1 }),
  },
  { $id: "LaunchppPageContribution" },
);

export const PanelContributionSchema = StrictObject(
  {
    id: IdentifierSchema,
    slot: Type.Union([Type.Literal("task.details.panels"), Type.Literal("board.sidebar")]),
    surface: IdentifierSchema,
    title: Type.String({ maxLength: 120, minLength: 1 }),
  },
  { $id: "LaunchppPanelContribution" },
);

export const ActionContributionSchema = StrictObject(
  {
    handler: IdentifierSchema,
    id: IdentifierSchema,
    slot: Type.Union([
      Type.Literal("task.actions"),
      Type.Literal("task.card.actions"),
      Type.Literal("board.card.actions"),
      Type.Literal("commandPalette"),
    ]),
    title: Type.String({ maxLength: 120, minLength: 1 }),
  },
  { $id: "LaunchppActionContribution" },
);

export const SettingsContributionSchema = StrictObject(
  {
    id: IdentifierSchema,
    scope: Type.Union([Type.Literal("user"), Type.Literal("workspace"), Type.Literal("project")]),
    surface: IdentifierSchema,
    title: Type.String({ maxLength: 120, minLength: 1 }),
  },
  { $id: "LaunchppSettingsContribution" },
);

export const ContributionsSchema = StrictObject(
  {
    actions: Type.Optional(
      Type.Array(ActionContributionSchema, { maxItems: 100, uniqueItems: true }),
    ),
    pages: Type.Optional(Type.Array(PageContributionSchema, { maxItems: 100, uniqueItems: true })),
    panels: Type.Optional(
      Type.Array(PanelContributionSchema, { maxItems: 100, uniqueItems: true }),
    ),
    settings: Type.Optional(
      Type.Array(SettingsContributionSchema, { maxItems: 100, uniqueItems: true }),
    ),
  },
  { $id: "LaunchppContributions" },
);

export const InstalledPluginManifestSchema = StrictObject(
  {
    apiVersion: Type.String({ maxLength: 16, minLength: 1 }),
    browser: Type.Optional(
      StrictObject({
        surfaces: Type.Record(IdentifierSchema, BrowserSurfaceSchema),
      }),
    ),
    contributes: Type.Optional(ContributionsSchema),
    id: PluginIdSchema,
    name: Type.String({ maxLength: 120, minLength: 1 }),
    permissions: Type.Optional(Type.Array(PermissionSchema, { maxItems: 100, uniqueItems: true })),
    version: Type.String({ maxLength: 64, pattern: semverPattern }),
  },
  {
    $id: "LaunchppInstalledPluginManifestV0",
    title: "Launch++ installed plugin manifest v0",
  },
);

export type InstalledPluginManifest = Type.Static<typeof InstalledPluginManifestSchema>;
export type Permission = Type.Static<typeof PermissionSchema>;
export type Contributions = Type.Static<typeof ContributionsSchema>;

export const PluginContextSchema = StrictObject(
  {
    actor: StrictObject({ id: Type.String({ maxLength: 128, minLength: 1 }) }),
    grantedPermissions: Type.Array(PermissionSchema, {
      maxItems: 100,
      uniqueItems: true,
    }),
    installationId: Type.String({ maxLength: 128, minLength: 1 }),
    locale: Type.String({ maxLength: 35, minLength: 2 }),
    pluginId: PluginIdSchema,
    project: Type.Optional(StrictObject({ id: Type.String({ maxLength: 128, minLength: 1 }) })),
    surfaceId: IdentifierSchema,
    theme: StrictObject({
      id: Type.String({ maxLength: 120, minLength: 1 }),
      mode: Type.Union([Type.Literal("light"), Type.Literal("dark")]),
      tokens: Type.Record(
        Type.String({ pattern: "^--launch-[a-z0-9-]+$" }),
        Type.String({ maxLength: 256 }),
      ),
    }),
    workspace: StrictObject({ id: Type.String({ maxLength: 128, minLength: 1 }) }),
  },
  { $id: "LaunchppPluginContextV0" },
);

export type PluginContext = Type.Static<typeof PluginContextSchema>;

const MessageBase = {
  protocolVersion: ProtocolVersionSchema,
} as const;

export const HandshakeMessageSchema = StrictObject(
  {
    ...MessageBase,
    context: PluginContextSchema,
    nonce: Type.String({ maxLength: 128, minLength: 16 }),
    type: Type.Literal(PLUGIN_MESSAGE_TYPES.handshake),
  },
  { $id: "LaunchppHandshakeMessageV0" },
);

export const ReadyMessageSchema = StrictObject(
  {
    ...MessageBase,
    nonce: Type.String({ maxLength: 128, minLength: 16 }),
    type: Type.Literal(PLUGIN_MESSAGE_TYPES.ready),
  },
  { $id: "LaunchppReadyMessageV0" },
);

export const RequestMessageSchema = StrictObject(
  {
    ...MessageBase,
    capability: Type.String({ maxLength: 160, minLength: 1 }),
    input: Type.Unknown(),
    requestId: Type.String({ maxLength: 128, minLength: 1 }),
    type: Type.Literal(PLUGIN_MESSAGE_TYPES.request),
  },
  { $id: "LaunchppRequestMessageV0" },
);

export const PluginErrorSchema = StrictObject(
  {
    code: Type.Union([
      Type.Literal(PLUGIN_ERROR_CODES.aborted),
      Type.Literal(PLUGIN_ERROR_CODES.capabilityNotFound),
      Type.Literal(PLUGIN_ERROR_CODES.conflict),
      Type.Literal(PLUGIN_ERROR_CODES.forbidden),
      Type.Literal(PLUGIN_ERROR_CODES.internal),
      Type.Literal(PLUGIN_ERROR_CODES.invalidRequest),
      Type.Literal(PLUGIN_ERROR_CODES.payloadTooLarge),
      Type.Literal(PLUGIN_ERROR_CODES.timeout),
      Type.Literal(PLUGIN_ERROR_CODES.unauthorized),
      Type.Literal(PLUGIN_ERROR_CODES.unavailable),
      Type.Literal(PLUGIN_ERROR_CODES.unsupportedProtocol),
    ]),
    details: Type.Optional(Type.Unknown()),
    message: Type.String({ maxLength: 500, minLength: 1 }),
    retryable: Type.Boolean(),
  },
  { $id: "LaunchppPluginErrorV0" },
);

export type PluginError = Type.Static<typeof PluginErrorSchema>;

export const SuccessResponseMessageSchema = StrictObject({
  ...MessageBase,
  ok: Type.Literal(true),
  output: Type.Unknown(),
  requestId: Type.String({ maxLength: 128, minLength: 1 }),
  type: Type.Literal(PLUGIN_MESSAGE_TYPES.response),
});

export const ErrorResponseMessageSchema = StrictObject({
  ...MessageBase,
  error: PluginErrorSchema,
  ok: Type.Literal(false),
  requestId: Type.String({ maxLength: 128, minLength: 1 }),
  type: Type.Literal(PLUGIN_MESSAGE_TYPES.response),
});

export const ResponseMessageSchema = Type.Union(
  [SuccessResponseMessageSchema, ErrorResponseMessageSchema],
  { $id: "LaunchppResponseMessageV0" },
);

export const CancellationMessageSchema = StrictObject(
  {
    ...MessageBase,
    reason: Type.Optional(Type.String({ maxLength: 240, minLength: 1 })),
    requestId: Type.String({ maxLength: 128, minLength: 1 }),
    type: Type.Literal(PLUGIN_MESSAGE_TYPES.cancel),
  },
  { $id: "LaunchppCancellationMessageV0" },
);

export const PluginMessageSchema = Type.Union(
  [
    HandshakeMessageSchema,
    ReadyMessageSchema,
    RequestMessageSchema,
    ResponseMessageSchema,
    CancellationMessageSchema,
  ],
  { $id: "LaunchppPluginMessageV0" },
);

export type HandshakeMessage = Type.Static<typeof HandshakeMessageSchema>;
export type ReadyMessage = Type.Static<typeof ReadyMessageSchema>;
export type RequestMessage = Type.Static<typeof RequestMessageSchema>;
export type ResponseMessage = Type.Static<typeof ResponseMessageSchema>;
export type CancellationMessage = Type.Static<typeof CancellationMessageSchema>;
export type PluginMessage = Type.Static<typeof PluginMessageSchema>;

export const PluginIntegritySchema = StrictObject(
  {
    algorithm: Type.Literal("sha256"),
    files: Type.Record(PackageFilePathSchema, Type.String({ pattern: "^[a-f0-9]{64}$" })),
    formatVersion: Type.Literal("0"),
  },
  { $id: "LaunchppPluginIntegrityV0" },
);

export type PluginIntegrity = Type.Static<typeof PluginIntegritySchema>;

export const CURRENT_PLUGIN_API_VERSION = PLUGIN_API_VERSION;

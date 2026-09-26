export const PLUGIN_API_VERSION = "0" as const;
export const PLUGIN_PROTOCOL_VERSION = "0.1" as const;

export const PLUGIN_PREVIEW_API_VERSION = "1" as const;
export const PLUGIN_PREVIEW_MANIFEST_VERSION = "1-preview" as const;
export const PLUGIN_PREVIEW_INTEGRITY_VERSION = "1-preview" as const;

export const PLUGIN_PREVIEW_AUTHORING_ADAPTERS = [
  "react-vite",
  "vanilla-typescript-vite",
  "vanilla-javascript-vite",
] as const;

export const PLUGIN_PREVIEW_PERMISSIONS = [
  "projects:read",
  "projects:write",
  "tasks:read",
  "tasks:write",
  "comments:read",
  "comments:write",
  "members:read",
] as const;

export const PLUGIN_MESSAGE_TYPES = {
  cancel: "launchpp.cancel",
  handshake: "launchpp.handshake",
  ready: "launchpp.ready",
  request: "launchpp.request",
  response: "launchpp.response",
} as const;

export const PLUGIN_ERROR_CODES = {
  aborted: "ABORTED",
  capabilityNotFound: "CAPABILITY_NOT_FOUND",
  conflict: "CONFLICT",
  forbidden: "FORBIDDEN",
  internal: "INTERNAL",
  invalidRequest: "INVALID_REQUEST",
  payloadTooLarge: "PAYLOAD_TOO_LARGE",
  timeout: "TIMEOUT",
  unauthorized: "UNAUTHORIZED",
  unavailable: "UNAVAILABLE",
  unsupportedProtocol: "UNSUPPORTED_PROTOCOL_VERSION",
} as const;

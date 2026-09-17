export const PLUGIN_API_VERSION = "0" as const;
export const PLUGIN_PROTOCOL_VERSION = "0.1" as const;

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

const environmentNames = ["development", "test", "production"] as const;
const logLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
const organizationRegistrationPolicies = ["authenticated", "disabled", "open"] as const;

type EnvironmentName = (typeof environmentNames)[number];
type LogLevel = (typeof logLevels)[number];
export type OrganizationRegistrationPolicy = (typeof organizationRegistrationPolicies)[number];

interface LaunchEnvironment extends NodeJS.ProcessEnv {
  LAUNCHPP_AUTH_SECRET?: string;
  LAUNCHPP_BASE_URL?: string;
  LAUNCHPP_BIND_ADDRESS?: string;
  LAUNCHPP_DATABASE_PATH?: string;
  LAUNCHPP_LOG_LEVEL?: string;
  LAUNCHPP_ORGANIZATION_REGISTRATION_POLICY?: string;
  LAUNCHPP_PORT?: string;
  LAUNCHPP_RATE_LIMIT_MAX?: string;
  LAUNCHPP_RATE_LIMIT_WINDOW_MS?: string;
  LAUNCHPP_SHUTDOWN_GRACE_MS?: string;
  LAUNCHPP_TRUSTED_PROXIES?: string;
  LAUNCHPP_WEB_ROOT?: string;
  NODE_ENV?: string;
}

const launchEnvironmentKeys = new Set([
  "LAUNCHPP_AUTH_SECRET",
  "LAUNCHPP_BASE_URL",
  "LAUNCHPP_BIND_ADDRESS",
  "LAUNCHPP_DATABASE_PATH",
  "LAUNCHPP_LOG_LEVEL",
  "LAUNCHPP_ORGANIZATION_REGISTRATION_POLICY",
  "LAUNCHPP_PORT",
  "LAUNCHPP_RATE_LIMIT_MAX",
  "LAUNCHPP_RATE_LIMIT_WINDOW_MS",
  "LAUNCHPP_SHUTDOWN_GRACE_MS",
  "LAUNCHPP_TRUSTED_PROXIES",
  "LAUNCHPP_WEB_ROOT",
]);

export interface ServerConfig {
  readonly authSecret: string;
  readonly baseUrl: string;
  readonly bindAddress: string;
  readonly databasePath: string;
  readonly environment: EnvironmentName;
  readonly logLevel: LogLevel;
  readonly organizationRegistrationPolicy: OrganizationRegistrationPolicy;
  readonly port: number;
  readonly rateLimit: Readonly<{ max: number; windowMs: number }>;
  readonly shutdownGraceMs: number;
  readonly trustedProxies: readonly string[];
  readonly webRoot?: string;
}

export class ConfigurationError extends Error {
  override readonly name = "ConfigurationError";
}

function parseEnum<const TValue extends string>(
  name: string,
  value: string,
  values: readonly TValue[],
): TValue {
  if (!values.includes(value as TValue)) {
    throw new ConfigurationError(`${name} must be one of: ${values.join(", ")}`);
  }
  return value as TValue;
}

function parseInteger(name: string, value: string, minimum: number, maximum: number): number {
  if (!/^\d+$/.test(value)) throw new ConfigurationError(`${name} must be an integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ConfigurationError(`${name} must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError("LAUNCHPP_BASE_URL must be an absolute HTTP(S) URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ConfigurationError("LAUNCHPP_BASE_URL must use HTTP or HTTPS");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new ConfigurationError(
      "LAUNCHPP_BASE_URL cannot contain credentials, a query, or a hash",
    );
  }
  if (parsed.pathname !== "/") {
    throw new ConfigurationError("LAUNCHPP_BASE_URL must not contain a path");
  }
  return parsed.origin;
}

function validateKnownKeys(environment: NodeJS.ProcessEnv): void {
  const unknownKeys = Object.keys(environment).filter(
    (key) => key.startsWith("LAUNCHPP_") && !launchEnvironmentKeys.has(key),
  );
  if (unknownKeys.length > 0) {
    throw new ConfigurationError(
      `Unknown Launch++ configuration: ${unknownKeys.sort().join(", ")}`,
    );
  }
}

export function loadServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  validateKnownKeys(environment);
  const variables = environment as LaunchEnvironment;
  const mode = parseEnum("NODE_ENV", variables.NODE_ENV ?? "development", environmentNames);
  const bindAddress = variables.LAUNCHPP_BIND_ADDRESS?.trim() || "127.0.0.1";
  const port = parseInteger("LAUNCHPP_PORT", variables.LAUNCHPP_PORT ?? "3000", 1, 65_535);
  const configuredBaseUrl = variables.LAUNCHPP_BASE_URL?.trim();
  if (mode === "production" && !configuredBaseUrl) {
    throw new ConfigurationError("LAUNCHPP_BASE_URL is required in production");
  }
  const defaultBaseUrl =
    mode === "development" ? "http://localhost:5173" : `http://${bindAddress}:${port}`;
  const baseUrl = parseBaseUrl(configuredBaseUrl || defaultBaseUrl);
  if (mode === "production" && new URL(baseUrl).protocol !== "https:") {
    throw new ConfigurationError("LAUNCHPP_BASE_URL must use HTTPS in production");
  }

  const databasePath = variables.LAUNCHPP_DATABASE_PATH?.trim() || "data/launchpp.sqlite";
  if (databasePath === ":memory:" || databasePath.includes("\0")) {
    throw new ConfigurationError("LAUNCHPP_DATABASE_PATH must be a file-backed database path");
  }
  const configuredAuthSecret = variables.LAUNCHPP_AUTH_SECRET?.trim();
  if (mode === "production" && !configuredAuthSecret) {
    throw new ConfigurationError("LAUNCHPP_AUTH_SECRET is required in production");
  }
  const authSecret = configuredAuthSecret ?? "development-only-secret-change-before-production";
  if (authSecret.length < 32) {
    throw new ConfigurationError("LAUNCHPP_AUTH_SECRET must contain at least 32 characters");
  }

  const trustedProxies = Object.freeze(
    (variables.LAUNCHPP_TRUSTED_PROXIES ?? "")
      .split(",")
      .map((proxy) => proxy.trim())
      .filter(Boolean),
  );

  const webRoot = variables.LAUNCHPP_WEB_ROOT?.trim();

  return Object.freeze({
    authSecret,
    baseUrl,
    bindAddress,
    databasePath,
    environment: mode,
    logLevel: parseEnum("LAUNCHPP_LOG_LEVEL", variables.LAUNCHPP_LOG_LEVEL ?? "info", logLevels),
    organizationRegistrationPolicy: parseEnum(
      "LAUNCHPP_ORGANIZATION_REGISTRATION_POLICY",
      variables.LAUNCHPP_ORGANIZATION_REGISTRATION_POLICY ?? "authenticated",
      organizationRegistrationPolicies,
    ),
    port,
    rateLimit: Object.freeze({
      max: parseInteger(
        "LAUNCHPP_RATE_LIMIT_MAX",
        variables.LAUNCHPP_RATE_LIMIT_MAX ?? "300",
        1,
        100_000,
      ),
      windowMs: parseInteger(
        "LAUNCHPP_RATE_LIMIT_WINDOW_MS",
        variables.LAUNCHPP_RATE_LIMIT_WINDOW_MS ?? "60000",
        1_000,
        3_600_000,
      ),
    }),
    shutdownGraceMs: parseInteger(
      "LAUNCHPP_SHUTDOWN_GRACE_MS",
      variables.LAUNCHPP_SHUTDOWN_GRACE_MS ?? "10000",
      100,
      120_000,
    ),
    trustedProxies,
    ...(webRoot ? { webRoot } : {}),
  });
}

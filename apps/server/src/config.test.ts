import { describe, expect, it } from "vitest";
import { ConfigurationError, loadServerConfig } from "./config.js";

describe("server configuration", () => {
  it("provides safe local defaults and immutable nested values", () => {
    const config = loadServerConfig({ NODE_ENV: "test" });

    expect(config).toMatchObject({
      baseUrl: "http://127.0.0.1:3000",
      bindAddress: "127.0.0.1",
      environment: "test",
      port: 3000,
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.rateLimit)).toBe(true);
    expect(Object.isFrozen(config.trustedProxies)).toBe(true);
  });

  it("rejects unknown Launch++ variables", () => {
    expect(() =>
      loadServerConfig({ NODE_ENV: "test", LAUNCHPP_MISSPELLED_PORT: "3001" }),
    ).toThrowError(/Unknown Launch\+\+ configuration: LAUNCHPP_MISSPELLED_PORT/);
  });

  it("rejects malformed bounded values", () => {
    expect(() => loadServerConfig({ NODE_ENV: "test", LAUNCHPP_PORT: "0" })).toThrowError(
      ConfigurationError,
    );
    expect(() =>
      loadServerConfig({ NODE_ENV: "test", LAUNCHPP_RATE_LIMIT_WINDOW_MS: "999" }),
    ).toThrowError(/between 1000 and 3600000/);
  });

  it("requires an explicit HTTPS origin in production", () => {
    expect(() => loadServerConfig({ NODE_ENV: "production" })).toThrowError(
      /LAUNCHPP_BASE_URL is required/,
    );
    expect(() =>
      loadServerConfig({ NODE_ENV: "production", LAUNCHPP_BASE_URL: "http://example.com" }),
    ).toThrowError(/must use HTTPS in production/);
  });
});

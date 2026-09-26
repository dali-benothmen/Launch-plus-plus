export { createAuthOptions, type CreateAuthOptionsInput } from "./auth-options.js";
export { registerBetterAuthRoutes } from "./fastify-routes.js";
export {
  type BetterAuthIdentityStorage,
  BetterAuthIdentityAdapter,
} from "./identity-adapter.js";
export {
  openBetterAuthIdentityAdapter,
  type OpenBetterAuthIdentityAdapterInput,
  type OpenedBetterAuthIdentityAdapter,
} from "./open-identity-adapter.js";

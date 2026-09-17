import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  out: "./migrations",
  schema: "./src/schema.ts",
  dbCredentials: {
    url: "./.tmp/schema.sqlite",
  },
  strict: true,
  verbose: true,
});

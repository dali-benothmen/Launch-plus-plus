import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(() => {
  const pluginProofFlag = "VITE_ENABLE_PLUGIN_PROOF";
  const includePluginProof = process.env[pluginProofFlag] === "true";

  return {
    build: {
      rollupOptions: {
        input: includePluginProof
          ? {
              main: "index.html",
              pluginReact: "plugin-fixtures/react/index.html",
              pluginVanilla: "plugin-fixtures/vanilla/index.html",
            }
          : "index.html",
      },
    },
    plugins: [react()],
    publicDir: includePluginProof ? "public" : false,
    server: {
      proxy: {
        "/health": "http://127.0.0.1:3000",
        "/api": "http://127.0.0.1:3000",
      },
    },
  };
});

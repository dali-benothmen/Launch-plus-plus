import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "showcase",
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: "../showcase-dist",
  },
});

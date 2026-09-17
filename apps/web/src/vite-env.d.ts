/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_PLUGIN_PROOF?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

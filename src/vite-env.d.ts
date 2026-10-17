/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Versión de package.json, inyectada por Vite al compilar. */
declare const __VERSION_APP__: string;

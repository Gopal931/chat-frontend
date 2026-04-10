/// <reference types="vite/client" />

/**
 * Type definitions for custom environment variables.
 * Any variable in your .env file starting with VITE_ must be declared here.
 * This tells TypeScript exactly what variables exist and their types.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

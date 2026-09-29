/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ID_INSTANCE?: string
  readonly VITE_API_TOKEN_INSTANCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

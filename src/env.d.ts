/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SYNC_SERVER_URL: string
  readonly VITE_AUTOMERGE_DOC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string

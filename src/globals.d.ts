/** Injected by vite.config.ts at build time. Also written to /version.json. */
declare const __BUILD__: {
  version: string
  buildTime: string
  commit: string
}

interface ImportMetaEnv {
  /** Cloud sync. Leave both unset to build BrewPrint without sign-in. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

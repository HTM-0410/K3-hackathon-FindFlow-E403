// Global env cache for Cloudflare Workers runtime
// Read from globalThis at call time (not module-load time) so the
// worker's fetch handler can set __CURSOR_APP_ENV__ before any request runs.
function getGlobalEnv(): Record<string, string | undefined> {
  if (typeof globalThis === "undefined") return process.env;
  const g = globalThis as Record<string, unknown>;
  if (g.__CURSOR_APP_ENV__) return g.__CURSOR_APP_ENV__ as Record<string, string | undefined>;
  return process.env;
}

export type ServerEnvName =
  | "GEMINI_API_KEY"
  | "GEMINI_MODEL"
  | "GEMINI_EMBEDDING_MODEL"
  | "GROQ_API_KEY"
  | "HUGGINGFACE_API_KEY";

export function getServerEnv(name: ServerEnvName): string | undefined {
  const value = getGlobalEnv()[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function setServerEnvForTesting(env: Record<string, string | undefined>): void {
  (globalThis as Record<string, unknown>).__CURSOR_APP_ENV__ = env;
}

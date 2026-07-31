import vinext from "vinext";
import { defineConfig, loadEnv } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;
const USE_BINDINGS = true; // Realtime enabled: D1 local binding cho bot

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(async ({ command, mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), "");
  const localBindingConfig = {
    main: "./worker/index.ts",
    compatibility_flags: ["nodejs_compat"],
    ...(command === "serve"
      ? {
          vars: {
            GEMINI_API_KEY: localEnv.GEMINI_API_KEY ?? "",
            GEMINI_MODEL: localEnv.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
            GEMINI_EMBEDDING_MODEL:
              localEnv.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2",
          },
        }
      : {}),
    d1_databases: [
      {
        binding: "DB",
        database_name: "discord-knowledge-hub",
        database_id: "74c95267-452a-4827-bc05-4e1f990f4c6b",
      },
    ],
    r2_buckets: USE_BINDINGS && r2
      ? [
          {
            binding: r2,
            bucket_name: "site-creator-r2",
          },
        ]
      : [],
  };
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    optimizeDeps: {
      exclude: ["better-sqlite3"],
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});

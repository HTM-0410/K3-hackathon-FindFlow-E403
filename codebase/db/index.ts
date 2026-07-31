import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { mkdirSync } from "node:fs";

// better-sqlite3 có thể không có trên Windows dev environment
let Database: typeof import("better-sqlite3").default | null = null;
try {
  Database = require("better-sqlite3").default;
} catch {
  console.warn("[db] better-sqlite3 not available - using mock");
}

const LOCAL_DB_PATH = "./data/realtime.db";

let _db: ReturnType<typeof drizzle> | null = null;

function getLocalDb() {
  if (_db) return _db;

  // Nếu không có better-sqlite3, trả về mock
  if (!Database) {
    console.warn("[db] Using mock database - realtime features disabled");
    return null;
  }

  try {
    mkdirSync("./data", { recursive: true });
  } catch { /* ignore */ }

  const sqlite = new Database(LOCAL_DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS realtime_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      external_id TEXT NOT NULL,
      channel_name TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      occurred_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_realtime_kind_occurred ON realtime_events(kind, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_realtime_occurred ON realtime_events(occurred_at);

    CREATE TABLE IF NOT EXISTS realtime_stats (
      id INTEGER PRIMARY KEY,
      total_messages INTEGER NOT NULL DEFAULT 0,
      total_joins INTEGER NOT NULL DEFAULT 0,
      total_leaves INTEGER NOT NULL DEFAULT 0,
      total_reactions INTEGER NOT NULL DEFAULT 0,
      total_voice INTEGER NOT NULL DEFAULT 0,
      last_heartbeat INTEGER NOT NULL DEFAULT 0,
      bot_started_at INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO realtime_stats (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS demo_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'discord-demo',
      guild_id TEXT NOT NULL DEFAULT '',
      channel_id TEXT NOT NULL DEFAULT '',
      channel_name TEXT NOT NULL DEFAULT '',
      message_id TEXT NOT NULL DEFAULT '',
      message_url TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      host TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      snippet TEXT NOT NULL DEFAULT '',
      content_length INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'queued',
      error_message TEXT NOT NULL DEFAULT '',
      fetch_attempts INTEGER NOT NULL DEFAULT 0,
      embedding TEXT NOT NULL DEFAULT '[]',
      detected_at INTEGER NOT NULL,
      processed_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_demo_documents_external_id ON demo_documents(external_id);
    CREATE INDEX IF NOT EXISTS idx_demo_documents_status ON demo_documents(status);
    CREATE INDEX IF NOT EXISTS idx_demo_documents_detected ON demo_documents(detected_at);
  `);
  _db = drizzle(sqlite, { schema });
  return _db;
}

export function getDb() {
  // Ưu tiên Cloudflare D1 (chỉ khả dụng trong Workers runtime)
  try {
    if (typeof (globalThis as Record<string, unknown>).caches !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { env } = require("cloudflare:workers") as { env: Record<string, any> };
      if (env?.DB) return drizzle(env.DB as D1Database, { schema });
    }
  } catch { /* not in Workers runtime */ }

  return getLocalDb();
}

export { schema };

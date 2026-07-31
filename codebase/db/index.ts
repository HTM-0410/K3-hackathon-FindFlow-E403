import { drizzle } from "drizzle-orm/d1";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { mkdirSync } from "node:fs";

/** File SQLite local — Vite dev / preview dùng cwd là project root */
const LOCAL_DB_PATH = "./data/realtime.db";

let _db: ReturnType<typeof drizzle> | null = null;

function getLocalDb() {
  if (_db) return _db;

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

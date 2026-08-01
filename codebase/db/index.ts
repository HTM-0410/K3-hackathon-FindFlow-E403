/**
 * Database module - Mock implementation for local development
 *
 * better-sqlite3 không khả dụng trên Windows dev environment.
 * Features bị disable:
 * - Realtime Discord bot events
 * - D1 database operations
 *
 * Features vẫn hoạt động:
 * - LabCoach dashboard (dùng JSON file)
 * - Semantic search (dùng Gemini API)
 * - Knowledge Hub (dùng static data)
 */

// Mock schema for drizzle-orm compatibility
export const schema = {
  realtimeEvents: {
    id: { primaryKey: () => ({ autoIncrement: true }) },
    kind: { notNull: () => ({ default: "" }) },
    externalId: { notNull: () => ({ default: "" }) },
    channelName: { notNull: () => ({ default: "" }) },
    authorName: { notNull: () => ({ default: "" }) },
    content: { notNull: () => ({ default: "" }) },
    metadata: { notNull: () => ({ default: "{}" }) },
    occurredAt: { notNull: () => ({}) },
  },
  realtimeStats: {
    id: { primaryKey: () => ({}) },
    totalMessages: { notNull: () => ({ default: 0 }) },
    totalJoins: { notNull: () => ({ default: 0 }) },
    totalLeaves: { notNull: () => ({ default: 0 }) },
    totalReactions: { notNull: () => ({ default: 0 }) },
    totalVoice: { notNull: () => ({ default: 0 }) },
    lastHeartbeat: { notNull: () => ({ default: 0 }) },
    botStartedAt: { notNull: () => ({ default: 0 }) },
  },
} as const;

/**
 * Returns null - no real database available
 */
export function getDb() {
  if (typeof window === "undefined") {
    console.warn("[db] better-sqlite3 not available - realtime features disabled");
  }
  return null;
}

/**
 * Check if database is available
 */
export function isDbAvailable(): boolean {
  return false;
}

import { integer, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Bảng realtime events — Discord Knowledge Hub
 *
 * Lưu các sự kiện realtime từ Discord bot capture được, phục vụ
 * demo trên web: live feed, stats, Server-Sent Events stream.
 *
 * Lưu ý: Đây là dữ liệu demo. Không commit dữ liệu thật / tin nhắn
 * riêng tư của người dùng vào repo.
 */
export const realtimeEvents = sqliteTable(
  "realtime_events",
  {
    /** ID tự tăng, dùng làm cursor cho SSE stream (events sau id này) */
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Loại sự kiện: message | member_join | member_leave | reaction | voice | bot_ready | heartbeat */
    kind: text("kind").notNull(),
    /** ID tin nhắn / user / reaction từ Discord, dùng để chống trùng */
    externalId: text("external_id").notNull(),
    /** Tên kênh (channel) Discord — dùng để filter hiển thị */
    channelName: text("channel_name").notNull().default(""),
    /** Tên hiển thị của tác giả */
    authorName: text("author_name").notNull().default(""),
    /** Nội dung tin nhắn (rỗng với các sự kiện không phải tin nhắn) */
    content: text("content").notNull().default(""),
    /** Metadata JSON: reaction emoji, voice channel, role... */
    metadata: text("metadata").notNull().default("{}"),
    /** Epoch ms lúc bot nhận sự kiện */
    occurredAt: integer("occurred_at").notNull(),
  },
  (table) => ({
    /** Index phục vụ query feed DESC + filter kind */
    kindOccurredIdx: index("idx_realtime_kind_occurred").on(table.kind, table.occurredAt),
    occurredIdx: index("idx_realtime_occurred").on(table.occurredAt),
  }),
);

/**
 * Bảng stats cache — tổng hợp nhanh để hiển thị dashboard demo.
 * Một dòng duy nhất, id = 1.
 */
export const realtimeStats = sqliteTable("realtime_stats", {
  id: integer("id").primaryKey(),
  totalMessages: integer("total_messages").notNull().default(0),
  totalJoins: integer("total_joins").notNull().default(0),
  totalLeaves: integer("total_leaves").notNull().default(0),
  totalReactions: integer("total_reactions").notNull().default(0),
  totalVoice: integer("total_voice").notNull().default(0),
  lastHeartbeat: integer("last_heartbeat").notNull().default(0),
  botStartedAt: integer("bot_started_at").notNull().default(0),
});

/* ====================================================================== */
/* Demo document ingest — tách riêng khỏi dữ liệu thật                   */
/* ====================================================================== */

/** Status luồng xử lý tài liệu demo. */
export const DEMO_DOC_STATUS = [
  "queued",
  "fetching",
  "ready",
  "failed",
  "skipped",
] as const;
export type DemoDocStatus = (typeof DEMO_DOC_STATUS)[number];

/**
 * Bảng demo_documents — lưu metadata và nội dung đã xử lý từ link Discord
 * thu được từ server test. Namespace `source=discord-demo`, tách hoàn toàn
 * khỏi catalog production và bảng realtime_events.
 */
export const demoDocuments = sqliteTable(
  "demo_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** ID ngoài (messageId::url) — chống trùng */
    externalId: text("external_id").notNull(),
    source: text("source").notNull().default("discord-demo"),
    guildId: text("guild_id").notNull().default(""),
    channelId: text("channel_id").notNull().default(""),
    channelName: text("channel_name").notNull().default(""),
    messageId: text("message_id").notNull().default(""),
    messageUrl: text("message_url").notNull().default(""),
    authorName: text("author_name").notNull().default(""),
    url: text("url").notNull(),
    host: text("host").notNull().default(""),
    title: text("title").notNull().default(""),
    /** Text đã chuẩn hoá (HTML strip + truncate). */
    body: text("body").notNull().default(""),
    /** Trích đoạn ngắn dùng cho danh sách UI. */
    snippet: text("snippet").notNull().default(""),
    contentLength: integer("content_length").notNull().default(0),
    /** Trạng thái xử lý. */
    status: text("status").notNull().default("queued"),
    /** Lỗi (nếu có). */
    errorMessage: text("error_message").notNull().default(""),
    /** Số lần thử fetch. */
    fetchAttempts: integer("fetch_attempts").notNull().default(0),
    /** Lưu vector embedding (JSON) phục vụ tìm kiếm demo. */
    embedding: text("embedding").notNull().default("[]"),
    detectedAt: integer("detected_at").notNull(),
    processedAt: integer("processed_at").notNull().default(0),
  },
  (table) => ({
    externalIdUnique: uniqueIndex("uq_demo_documents_external_id").on(table.externalId),
    statusIdx: index("idx_demo_documents_status").on(table.status),
    detectedIdx: index("idx_demo_documents_detected").on(table.detectedAt),
  }),
);


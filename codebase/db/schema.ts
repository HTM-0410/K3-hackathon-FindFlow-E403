import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

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

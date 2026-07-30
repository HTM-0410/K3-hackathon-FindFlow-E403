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

/**
 * Bảng search_feedback — User feedback metric cho ranking quality
 *
 * Mỗi lần user vote 👍/👎 trên một kết quả search trong web UI,
 * page.tsx sẽ POST vào /api/feedback → INSERT một row ở đây.
 *
 * Dùng để:
 * - Đo helpful rate theo ngày / theo resource / theo query intent.
 * - Phát hiện resource nào hay bị vote 👎 (ranking failure).
 * - Phát hiện query nào hay fail (trending "unhelpful queries" → seed cho eval).
 *
 * normalized_query: query đã lowercase + trim + bỏ dấu cách thừa, dùng để
 * group các query tương tự (vd "Slide Hackathon" vs "slide hackathon").
 *
 * session_id: optional, đặt trước để Phase 2 có thể phân tích luồng hội thoại.
 */
export const searchFeedback = sqliteTable(
  "search_feedback",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    resourceId: text("resource_id").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    helpful: integer("helpful").notNull(),
    traceId: text("trace_id").notNull().default(""),
    retrievalStatus: text("retrieval_status").notNull().default(""),
    sessionId: text("session_id").notNull().default(""),
    matchScore: integer("match_score").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    resourceIdx: index("idx_feedback_resource").on(table.resourceId, table.createdAt),
    createdIdx: index("idx_feedback_created").on(table.createdAt),
    statusCreatedIdx: index("idx_feedback_status_created").on(
      table.retrievalStatus,
      table.createdAt,
    ),
  }),
);

/**
 * Bảng search_traces — Log mỗi search call để correlate với feedback
 *
 * Page.tsx sẽ POST mỗi lần search xong (kèm traceId từ response)
 * để dashboard có thể join feedback với search context:
 * vd "query X có 8 feedback, 6 helpful, retrieval success trong 320ms".
 */
export const searchTraces = sqliteTable(
  "search_traces",
  {
    traceId: text("trace_id").primaryKey(),
    query: text("query").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    status: text("status").notNull(),
    candidateCount: integer("candidate_count").notNull().default(0),
    retrievalMode: text("retrieval_mode").notNull().default(""),
    latencyMs: integer("latency_ms").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    createdIdx: index("idx_traces_created").on(table.createdAt),
    statusCreatedIdx: index("idx_traces_status_created").on(table.status, table.createdAt),
  }),
);

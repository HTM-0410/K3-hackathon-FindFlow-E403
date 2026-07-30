/**
 * Helpers cho realtime API: validate event ingest, kiểm tra token.
 *
 * Sử dụng trong các route handlers ở /app/api/realtime.
 */

import { sql, eq, type SQL } from "drizzle-orm";
import { realtimeEvents, realtimeStats } from "../../db/schema";

export const ALLOWED_KINDS: ReadonlySet<string> = new Set([
  "message",
  "member_join",
  "member_leave",
  "reaction",
  "voice",
  "bot_ready",
  "heartbeat",
]);

export const MAX_CONTENT_LEN = 600;
export const MAX_CHANNEL_LEN = 80;
export const MAX_AUTHOR_LEN = 80;
export const MAX_EXTERNAL_ID_LEN = 200;

export const KIND_LABELS: Record<string, string> = {
  message: "Tin nhắn",
  member_join: "Thành viên mới",
  member_leave: "Rời server",
  reaction: "Reaction",
  voice: "Voice channel",
  bot_ready: "Bot ready",
  heartbeat: "Heartbeat",
};

/** Truncate string an toàn */
export function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

export interface IngestEvent {
  kind: string;
  externalId: string;
  channelName: string;
  authorName: string;
  content: string;
  metadata: string;
  occurredAt: number;
}

/**
 * Chuẩn hoá payload từ bot gửi lên ingest endpoint.
 * Trả về object hợp lệ hoặc null nếu invalid.
 */
export function normalizeIngestEvent(input: unknown): IngestEvent | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const kind = String(obj.kind || "");
  if (!ALLOWED_KINDS.has(kind)) return null;
  const externalId = clip(obj.externalId, MAX_EXTERNAL_ID_LEN);
  if (!externalId) return null;
  const occurredAtNum = Number(obj.occurredAt);
  const occurredAt =
    Number.isFinite(occurredAtNum) && occurredAtNum > 0
      ? Math.floor(occurredAtNum)
      : Date.now();
  return {
    kind,
    externalId,
    channelName: clip(obj.channelName, MAX_CHANNEL_LEN),
    authorName: clip(obj.authorName, MAX_AUTHOR_LEN),
    content: clip(obj.content, MAX_CONTENT_LEN),
    metadata:
      typeof obj.metadata === "object" && obj.metadata
        ? JSON.stringify(obj.metadata).slice(0, 4000)
        : "{}",
    occurredAt,
  };
}

/**
 * Tăng các bộ đếm tương ứng với kind. Một row duy nhất id=1 trong stats.
 */
export async function bumpStats(
  db: ReturnType<typeof import("../../db/index")["getDb"]> extends infer T ? T : never,
  kind: string,
): Promise<void> {
  await db
    .insert(realtimeStats)
    .values({ id: 1 })
    .onConflictDoNothing();

  const patch: Record<string, SQL | number | Date> = { lastHeartbeat: Date.now() };
  if (kind === "message") patch.totalMessages = sql`${realtimeStats.totalMessages} + 1`;
  if (kind === "member_join") patch.totalJoins = sql`${realtimeStats.totalJoins} + 1`;
  if (kind === "member_leave") patch.totalLeaves = sql`${realtimeStats.totalLeaves} + 1`;
  if (kind === "reaction") patch.totalReactions = sql`${realtimeStats.totalReactions} + 1`;
  if (kind === "voice") patch.totalVoice = sql`${realtimeStats.totalVoice} + 1`;
  if (kind === "bot_ready") patch.botStartedAt = Date.now();

  // drizzle's .set() chấp nhận partial record; TS không strict với key động
  // trong Drizzle 0.45 vì patch khớp runtime schema.
  await db.update(realtimeStats).set(patch as never).where(eq(realtimeStats.id, 1));
}

interface IngestEnv {
  REALTIME_INGEST_TOKEN?: string;
}

/** Xác thực bot ingest. Nếu worker có REALTIME_INGEST_TOKEN, header phải khớp. */
export function authorizeIngest(
  request: Request,
  env: IngestEnv | undefined,
): { ok: boolean; mode: "open" | "token" | "denied" } {
  const expected = env?.REALTIME_INGEST_TOKEN;
  if (!expected) return { ok: true, mode: "open" };
  const got = request.headers.get("x-ingest-token") || "";
  return got && got === expected
    ? { ok: true, mode: "token" }
    : { ok: false, mode: "denied" };
}

export interface SseStream {
  response: Response;
  send: (data: unknown) => void;
  close: () => void;
}

/**
 * Tạo SSE response. Caller chịu trách nhiệm gửi message qua .send().
 */
export function makeSseStream(): SseStream {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();
  const response = new Response(
    new ReadableStream({
      start(ctrl) {
        controller = ctrl;
        if (controller) {
          controller.enqueue(encoder.encode(": connected\n\n"));
        }
      },
      cancel() {
        controller = null;
      },
    }),
    {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    }
  );

  return {
    response,
    send(data: unknown) {
      if (!controller) return;
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch {
        // closed — ignore
      }
    },
    close() {
      try {
        if (controller) controller.close();
      } catch {
        /* noop */
      }
    },
  };
}

export { realtimeEvents, realtimeStats };

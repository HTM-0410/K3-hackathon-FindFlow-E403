/**
 * GET /api/realtime/events?since=<id>
 *
 * Server-Sent Events stream các event mới từ Discord bot.
 *
 * Client có thể cung cấp `since` để replay các event đã bỏ lỡ, rồi tiếp tục
 * stream các event mới. Backend poll D1 mỗi ~2 giây.
 *
 * Mỗi message có định dạng:
 *   data: { type: "event", id, kind, channelName, authorName, content, occurredAt, metadata }
 *
 * Có periodic heartbeat: data: { type: "ping" }.
 *
 * Lưu ý runtime: Vinext/Next thường không nuôi stream dài trên edge runtime
 * truyền thống. Trên Cloudflare Workers thì SSE độ dài vài phút hoạt động
 * tốt. Nếu deploy dạng node dài hạn, có thể cần điều chỉnh runtime.
 */

import { gt, desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { realtimeEvents } from "../../../../db/schema";
import { makeSseStream } from "../../../lib/realtime";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2000;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sinceRaw = url.searchParams.get("since");
  let since = sinceRaw && /^\d+$/.test(sinceRaw) ? parseInt(sinceRaw, 10) : 0;

  const stream = makeSseStream();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function tick(): Promise<void> {
    if (closed) return;
    try {
      const db = getDb();
      const rows = await db
        .select({
          id: realtimeEvents.id,
          kind: realtimeEvents.kind,
          externalId: realtimeEvents.externalId,
          channelName: realtimeEvents.channelName,
          authorName: realtimeEvents.authorName,
          content: realtimeEvents.content,
          metadata: realtimeEvents.metadata,
          occurredAt: realtimeEvents.occurredAt,
        })
        .from(realtimeEvents)
        .where(gt(realtimeEvents.id, since))
        .orderBy(desc(realtimeEvents.id))
        .limit(50);

      // Đảo ASC để client thấy theo đúng thứ tự xuất hiện
      const ascending = [...rows].reverse();
      for (const row of ascending) {
        since = Math.max(since, row.id);
        let parsedMeta: Record<string, unknown> = {};
        try {
          parsedMeta = JSON.parse(row.metadata || "{}");
        } catch {
          /* noop */
        }
        stream.send({
          type: "event",
          id: row.id,
          kind: row.kind,
          externalId: row.externalId,
          channelName: row.channelName,
          authorName: row.authorName,
          content: row.content,
          occurredAt: row.occurredAt,
          metadata: parsedMeta,
        });
      }
    } catch (error) {
      stream.send({
        type: "error",
        message: error instanceof Error ? error.message : "stream error",
      });
    }
    if (!closed) timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
  }

  // Ping ngay để client thấy stream mở
  stream.send({ type: "ping", since });
  timer = setTimeout(() => void tick(), 100);

  // Cleanup khi client ngắt
  const abort = (): void => {
    closed = true;
    if (timer) clearTimeout(timer);
    stream.close();
  };
  request.signal.addEventListener("abort", abort);

  return stream.response;
}

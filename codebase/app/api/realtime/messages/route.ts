/**
 * GET /api/realtime/messages?limit=50&kind=message&since=<id>
 *
 * Trả về các event gần nhất, mặc định 50 dòng, tối đa 200.
 *
 * Query:
 *   - limit: 1..200 (default 50)
 *   - kind: filter theo kind (optional)
 *   - since: chỉ trả event có id > since (optional, dùng cho polling)
 *
 * Response:
 *   {
 *     events: [{ id, kind, externalId, channelName, authorName, content, metadata, occurredAt }],
 *     count,
 *     lastId
 *   }
 */

import { desc, eq, gt, and, like, type SQL } from "drizzle-orm";
import { getDb } from "../../../../db";
import { realtimeEvents } from "../../../../db/schema";
import { ALLOWED_KINDS } from "../../../lib/realtime";

export const runtime = "edge";

function parseLimit(raw: string | null): number {
  const n = parseInt(String(raw || ""), 10);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, n));
}

function parseSince(raw: string | null): number | null {
  const n = parseInt(String(raw || ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const since = parseSince(url.searchParams.get("since"));
  const kindParam = url.searchParams.get("kind");
  const kind =
    kindParam && ALLOWED_KINDS.has(kindParam) ? kindParam : null;

  try {
    const db = getDb();

    const conditions: SQL[] = [];
    if (since !== null) conditions.push(gt(realtimeEvents.id, since));
    if (kind) conditions.push(eq(realtimeEvents.kind, kind));

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

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
      .where(where)
      .orderBy(desc(realtimeEvents.id))
      .limit(limit);

    return Response.json({
      ok: true,
      count: rows.length,
      events: rows,
      lastId: rows[0]?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Messages failed";
    const detail = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    const combined = `${message}\n${detail}`;
    const missingTable =
      combined.includes("no such table") || combined.includes("realtime_events");
    return Response.json(
      {
        error: missingTable
          ? "DB chưa có bảng realtime_events. Hãy chạy `npm run db:generate`."
          : message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/realtime/messages?externalIdPattern=seed-%
 *
 * Xoá các event theo mẫu `externalId LIKE pattern`. Yêu cầu
 * `x-admin-token` nếu `REALTIME_ADMIN_TOKEN` được cấu hình.
 */
export async function DELETE(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pattern = url.searchParams.get("externalIdPattern");
  const confirm = url.searchParams.get("confirm");
  if (!pattern || confirm !== "yes") {
    return Response.json(
      {
        error:
          "Cần query externalIdPattern=<SQL LIKE> và confirm=yes. Mặc định pattern=seed-%",
      },
      { status: 400 },
    );
  }

  const expected = process.env.REALTIME_ADMIN_TOKEN;
  if (expected) {
    const got = request.headers.get("x-admin-token") || "";
    if (got !== expected) {
      return Response.json(
        { error: "Invalid or missing x-admin-token" },
        { status: 401 },
      );
    }
  }

  try {
    const db = getDb();
    const result = await db
      .delete(realtimeEvents)
      .where(like(realtimeEvents.externalId, pattern))
      .returning({ id: realtimeEvents.id });
    return Response.json({
      ok: true,
      deleted: result.length,
      pattern,
      mode: expected ? "token" : "open",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}

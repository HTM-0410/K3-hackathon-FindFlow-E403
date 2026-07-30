/**
 * POST /api/realtime/ingest
 *
 * Discord bot capture gọi endpoint này để đẩy sự kiện vào D1.
 *
 * Headers (khi deploy có REALTIME_INGEST_TOKEN): "x-ingest-token: <token>"
 *
 * Body: xem normalizeIngestEvent().
 *
 * Response: { ok, id, kind }
 */

import { getDb } from "../../../../db";
import { realtimeEvents, realtimeStats } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import {
  authorizeIngest,
  bumpStats,
  normalizeIngestEvent,
  type IngestEvent,
} from "../../../lib/realtime";

export const runtime = "edge";

export async function POST(request: Request): Promise<Response> {
  const auth = authorizeIngest(request, process.env as { REALTIME_INGEST_TOKEN?: string });
  if (!auth.ok) {
    return Response.json(
      { error: "Invalid or missing x-ingest-token" },
      { status: 401 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  // Hỗ trợ cả single event và batch { events: [...] }
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { events?: unknown[] })?.events)
      ? (payload as { events: unknown[] }).events
      : [payload];

  const normalized: IngestEvent[] = [];
  for (const item of arr) {
    const norm = normalizeIngestEvent(item);
    if (norm) normalized.push(norm);
    if (normalized.length >= 200) break;
  }

  if (normalized.length === 0) {
    return Response.json(
      { error: "Không có event hợp lệ trong payload." },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const inserted = await db
      .insert(realtimeEvents)
      .values(normalized)
      .returning({
        id: realtimeEvents.id,
        kind: realtimeEvents.kind,
        externalId: realtimeEvents.externalId,
        occurredAt: realtimeEvents.occurredAt,
      });

    // Cập nhật last_heartbeat
    await db
      .update(realtimeStats)
      .set({ lastHeartbeat: Date.now() })
      .where(eq(realtimeStats.id, 1));

    const distinctKinds = new Set(normalized.map((e) => e.kind));
    for (const k of distinctKinds) {
      await bumpStats(db, k);
    }

    return Response.json({
      ok: true,
      count: inserted.length,
      ids: inserted.map((row) => row.id),
      lastId: inserted[inserted.length - 1]?.id,
      authMode: auth.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    const detail = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    const combined = `${message}\n${detail}`;
    const missingTable =
      combined.includes("no such table") || combined.includes("realtime_events");
    return Response.json(
      {
        error: missingTable
          ? "DB chưa có bảng realtime_events. Hãy chạy `npm run db:generate` rồi deploy migration."
          : message,
      },
      { status: 500 }
    );
  }
}

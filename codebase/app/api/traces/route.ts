/**
 * POST /api/traces
 *
 * Log mỗi search call kèm traceId để có thể correlate với feedback.
 * Page.tsx sẽ gọi endpoint này sau khi nhận response từ /api/search.
 *
 * Body: { traceId, query, status, candidateCount?, retrievalMode?, latencyMs? }
 * -> { ok }
 *
 * Lưu ý: Dùng upsert (ON CONFLICT REPLACE) theo traceId — nếu retry thì ghi đè.
 */

import { getDb } from "../../../db";
import { searchTraces } from "../../../db/schema";
import { normalizeTrace } from "../../lib/feedback";

export const runtime = "edge";

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  const trace = normalizeTrace(payload);
  if (!trace) {
    return Response.json(
      { error: "Thiếu hoặc sai trường bắt buộc (traceId, query, status)." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    await db
      .insert(searchTraces)
      .values(trace)
      .onConflictDoUpdate({
        target: searchTraces.traceId,
        set: {
          status: trace.status,
          candidateCount: trace.candidateCount,
          retrievalMode: trace.retrievalMode,
          latencyMs: trace.latencyMs,
          createdAt: trace.createdAt,
        },
      });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DB error";
    const detail = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    const combined = `${message}\n${detail}`;
    const missingTable =
      combined.includes("no such table") || combined.includes("search_traces");
    return Response.json(
      {
        error: missingTable
          ? "DB chưa có bảng search_traces. Hãy chạy migration drizzle 0001 trước."
          : message,
      },
      { status: 500 },
    );
  }
}

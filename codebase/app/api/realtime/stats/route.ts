/**
 * GET /api/realtime/stats
 *
 * Trả về thống kê realtime + thời điểm bot lần cuối ping.
 *
 * Response:
 *   {
 *     totalMessages, totalJoins, totalLeaves, totalReactions, totalVoice,
 *     lastHeartbeat, botStartedAt,
 *     isBotAlive: bool,    // lastHeartbeat < 90s ago
 *     uptimeMs: number
 *   }
 */

import { getDb } from "../../../../db";
import { realtimeStats } from "../../../../db/schema";
import { eq, sql } from "drizzle-orm";

export const runtime = "edge";

const ALIVE_WINDOW_MS = 90_000;

export async function GET() {
  try {
    const db = getDb();

    // Đảm bảo có 1 row
    await db
      .insert(realtimeStats)
      .values({ id: 1 })
      .onConflictDoNothing();

    const [row] = await db
      .select()
      .from(realtimeStats)
      .where(eq(realtimeStats.id, 1))
      .limit(1);

    const now = Date.now();
    const lastHeartbeat = Number(row?.lastHeartbeat || 0);
    const botStartedAt = Number(row?.botStartedAt || 0);
    const isBotAlive = lastHeartbeat > 0 && now - lastHeartbeat < ALIVE_WINDOW_MS;

    return Response.json({
      ok: true,
      totalMessages: Number(row?.totalMessages || 0),
      totalJoins: Number(row?.totalJoins || 0),
      totalLeaves: Number(row?.totalLeaves || 0),
      totalReactions: Number(row?.totalReactions || 0),
      totalVoice: Number(row?.totalVoice || 0),
      lastHeartbeat,
      botStartedAt,
      isBotAlive,
      uptimeMs: botStartedAt ? now - botStartedAt : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stats failed";
    const detail = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    const combined = `${message}\n${detail}`;
    const missingTable =
      combined.includes("no such table") || combined.includes("realtime_stats");
    return Response.json(
      {
        error: missingTable
          ? "DB chưa có bảng realtime_stats. Hãy chạy `npm run db:generate`."
          : message,
      },
      { status: 500 }
    );
  }
}

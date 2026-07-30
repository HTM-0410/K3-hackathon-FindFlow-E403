/**
 * /api/feedback
 *
 * POST: Ghi nhận 1 vote 👍/👎 từ web UI.
 *   body: { resourceId, query, helpful: boolean, traceId?, status?, matchScore? }
 *   -> { ok, id }
 *
 * GET ?action=list: Trả list feedback rows (cho debugging).
 *   ?resourceId=&since=&limit=50
 *   -> { count, rows }
 *
 * GET ?action=stats: Aggregate cho dashboard.
 *   ?days=30&resourceId=
 *   -> FeedbackStats (xem app/lib/feedback.ts)
 *
 * Auth: open endpoint, giống /api/search (demo).
 */

import { and, desc, eq, gt, gte, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../../db";
import { searchFeedback } from "../../../db/schema";
import {
  normalizeFeedback,
  safeRate,
  dayKeyUtc,
  type DailyBucket,
  type ResourceBucket,
  type StatusBucket,
  type UnhelpfulQuery,
  type FeedbackStats,
} from "../../lib/feedback";

export const runtime = "edge";

function parseLimit(raw: string | null, max: number, fallback: number): number {
  const n = parseInt(String(raw || ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, n));
}

async function handlePost(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  const norm = normalizeFeedback(payload);
  if (!norm) {
    return Response.json(
      { error: "Thiếu hoặc sai trường bắt buộc (resourceId, query, helpful)." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const inserted = await db
      .insert(searchFeedback)
      .values(norm)
      .returning({ id: searchFeedback.id });
    return Response.json({ ok: true, id: inserted[0]?.id });
  } catch (error) {
    return dbError(error, "search_feedback");
  }
}

async function handleList(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"), 200, 50);
  const since = parseInt(String(url.searchParams.get("since") || ""), 10);
  const resourceId = url.searchParams.get("resourceId")?.trim() || null;

  const conditions: SQL[] = [];
  if (Number.isFinite(since) && since >= 0) {
    conditions.push(gt(searchFeedback.id, since));
  }
  if (resourceId) {
    conditions.push(eq(searchFeedback.resourceId, resourceId));
  }
  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: searchFeedback.id,
        resourceId: searchFeedback.resourceId,
        normalizedQuery: searchFeedback.normalizedQuery,
        helpful: searchFeedback.helpful,
        traceId: searchFeedback.traceId,
        retrievalStatus: searchFeedback.retrievalStatus,
        matchScore: searchFeedback.matchScore,
        createdAt: searchFeedback.createdAt,
      })
      .from(searchFeedback)
      .where(where)
      .orderBy(desc(searchFeedback.id))
      .limit(limit);

    return Response.json({
      ok: true,
      count: rows.length,
      rows,
      lastId: rows[0]?.id ?? null,
    });
  } catch (error) {
    return dbError(error, "search_feedback");
  }
}

async function handleStats(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const days = parseLimit(url.searchParams.get("days"), 90, 30);
  const resourceId = url.searchParams.get("resourceId")?.trim() || null;
  const sinceMs = Date.now() - days * 86_400_000;

  try {
    const db = getDb();

    const baseWhere: SQL[] = [gte(searchFeedback.createdAt, sinceMs)];
    if (resourceId) baseWhere.push(eq(searchFeedback.resourceId, resourceId));
    const where =
      baseWhere.length === 1 ? baseWhere[0] : and(...baseWhere);

    const [totals] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        helpful: sql<number>`SUM(CASE WHEN ${searchFeedback.helpful} = 1 THEN 1 ELSE 0 END)`,
      })
      .from(searchFeedback)
      .where(where);

    const total = Number(totals?.total ?? 0);
    const helpful = Number(totals?.helpful ?? 0);
    const unhelpful = total - helpful;

    const dayRows = await db
      .select({
        date: sql<string>`strftime('%Y-%m-%d', ${searchFeedback.createdAt} / 1000, 'unixepoch')`,
        helpful: sql<number>`SUM(CASE WHEN ${searchFeedback.helpful} = 1 THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(*)`,
      })
      .from(searchFeedback)
      .where(where)
      .groupBy(
        sql`strftime('%Y-%m-%d', ${searchFeedback.createdAt} / 1000, 'unixepoch')`,
      )
      .orderBy(
        sql`strftime('%Y-%m-%d', ${searchFeedback.createdAt} / 1000, 'unixepoch')`,
      );

    const byDay: DailyBucket[] = dayRows.map((row) => {
      const t = Number(row.total ?? 0);
      const h = Number(row.helpful ?? 0);
      return {
        date: row.date,
        total: t,
        helpful: h,
        unhelpful: t - h,
        rate: safeRate(h, t),
      };
    });

    const resourceRows = await db
      .select({
        resourceId: searchFeedback.resourceId,
        helpful: sql<number>`SUM(CASE WHEN ${searchFeedback.helpful} = 1 THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(*)`,
      })
      .from(searchFeedback)
      .where(where)
      .groupBy(searchFeedback.resourceId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(20);

    const byResource: ResourceBucket[] = resourceRows.map((row) => {
      const t = Number(row.total ?? 0);
      const h = Number(row.helpful ?? 0);
      return {
        resourceId: row.resourceId,
        total: t,
        helpful: h,
        unhelpful: t - h,
        rate: safeRate(h, t),
      };
    });

    const statusRows = await db
      .select({
        status: searchFeedback.retrievalStatus,
        helpful: sql<number>`SUM(CASE WHEN ${searchFeedback.helpful} = 1 THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(*)`,
      })
      .from(searchFeedback)
      .where(where)
      .groupBy(searchFeedback.retrievalStatus);

    const byStatus: StatusBucket[] = statusRows.map((row) => {
      const t = Number(row.total ?? 0);
      const h = Number(row.helpful ?? 0);
      return {
        status: row.status || "(none)",
        total: t,
        helpful: h,
        unhelpful: t - h,
        rate: safeRate(h, t),
      };
    });

    const unhelpfulRows = await db
      .select({
        normalizedQuery: searchFeedback.normalizedQuery,
        total: sql<number>`COUNT(*)`,
        sampleResource: sql<string>`MAX(${searchFeedback.resourceId})`,
      })
      .from(searchFeedback)
      .where(and(where, eq(searchFeedback.helpful, 0)))
      .groupBy(searchFeedback.normalizedQuery)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    const topUnhelpfulQueries: UnhelpfulQuery[] = unhelpfulRows.map((row) => ({
      normalizedQuery: row.normalizedQuery,
      count: Number(row.total ?? 0),
      resourceIds: [row.sampleResource],
    }));

    const stats: FeedbackStats = {
      windowDays: days,
      total,
      helpful,
      unhelpful,
      helpfulRate: safeRate(helpful, total),
      byDay,
      byResource,
      byStatus,
      topUnhelpfulQueries,
    };

    return Response.json({ ok: true, ...stats });
  } catch (error) {
    return dbError(error, "search_feedback");
  }
}

function dbError(error: unknown, tableName: string): Response {
  const message = error instanceof Error ? error.message : "DB error";
  const detail = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;
  const missingTable =
    combined.includes("no such table") || combined.includes(tableName);
  return Response.json(
    {
      error: missingTable
        ? `DB chưa có bảng ${tableName}. Hãy chạy migration drizzle 0001 trước.`
        : message,
    },
    { status: 500 },
  );
}

export async function POST(request: Request): Promise<Response> {
  return handlePost(request);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "stats";
  if (action === "list") return handleList(request);
  return handleStats(request);
}

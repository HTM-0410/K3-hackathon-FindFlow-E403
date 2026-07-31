/**
 * GET /api/demo/search?q=<query>
 *
 * Tìm kiếm lexical trên dataset demo (`demo_documents`). Cô lập hoàn toàn
 * khỏi `/api/search` dùng catalog production.
 *
 * Query:
 *   - q: chuỗi truy vấn (>=2 ký tự)
 *   - limit: 1..50 (default 10)
 *
 * Response:
 *   {
 *     ok, count, query, results: [{ id, url, title, snippet, status, score }]
 *   }
 */

import { desc, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { demoDocuments } from "../../../../db/schema";

export const runtime = "edge";

function parseLimit(raw: string | null): number {
  const n = parseInt(String(raw || ""), 10);
  if (!Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(50, n));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") || "").trim();
  const limit = parseLimit(url.searchParams.get("limit"));

  if (q.length < 2) {
    return Response.json(
      { error: "Query phải dài ít nhất 2 ký tự." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const normalized = normalize(q);
    const like = `%${normalized.replace(/[%_]/g, " ")}%`;

    // Lexical: trên title, snippet, url. Lấy tối đa 100 ứng viên rồi
    // tính điểm đơn giản để xếp hạng client-side.
    const rows = await db
      .select({
        id: demoDocuments.id,
        url: demoDocuments.url,
        title: demoDocuments.title,
        snippet: demoDocuments.snippet,
        status: demoDocuments.status,
        channelName: demoDocuments.channelName,
        authorName: demoDocuments.authorName,
        detectedAt: demoDocuments.detectedAt,
      })
      .from(demoDocuments)
      .where(sql`lower(ifnull(${demoDocuments.title},'') || ' ' || ifnull(${demoDocuments.snippet},'') || ' ' || ifnull(${demoDocuments.url},'')) LIKE ${like}`)
      .orderBy(desc(demoDocuments.detectedAt))
      .limit(100);

    const tokens = normalized.split(" ").filter((t) => t.length > 1);
    const scored = rows.map((row) => {
      const titleN = normalize(row.title);
      const snippetN = normalize(row.snippet);
      const urlN = normalize(row.url);
      let score = 0;
      for (const token of tokens) {
        if (titleN.includes(token)) score += 6;
        if (snippetN.includes(token)) score += 3;
        if (urlN.includes(token)) score += 1;
      }
      return { ...row, score };
    });

    scored.sort((a, b) => b.score - a.score || b.detectedAt - a.detectedAt);
    const top = scored.filter((row) => row.score > 0).slice(0, limit);

    return Response.json({
      ok: true,
      count: top.length,
      query: q,
      results: top,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo search failed";
    const detail =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : "";
    const combined = `${message}\n${detail}`;
    const missingTable =
      combined.includes("no such table") || combined.includes("demo_documents");
    return Response.json(
      {
        error: missingTable
          ? "DB chưa có bảng demo_documents. Hãy chạy `npm run db:generate`."
          : message,
      },
      { status: 500 },
    );
  }
}

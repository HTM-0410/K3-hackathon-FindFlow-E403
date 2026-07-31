/**
 * /api/demo/documents/list
 *
 * Proxy endpoint để frontend demo có thể list documents.
 * Chuyển hướng sang GET /api/demo/documents với query params.
 */

import { desc, eq, type SQL } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { demoDocuments, DEMO_DOC_STATUS } from "../../../../../db/schema";

export const runtime = "edge";

function parseLimit(raw: string | null): number {
  const n = parseInt(String(raw || ""), 10);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, n));
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && (DEMO_DOC_STATUS as readonly string[]).includes(statusParam)
      ? statusParam
      : null;

  try {
    const db = getDb();
    const conditions: SQL[] = [];
    if (status) conditions.push(eq(demoDocuments.status, status));

    const where = conditions.length === 0 ? undefined : conditions[0];

    const rows = await db
      .select({
        id: demoDocuments.id,
        externalId: demoDocuments.externalId,
        source: demoDocuments.source,
        guildId: demoDocuments.guildId,
        channelId: demoDocuments.channelId,
        channelName: demoDocuments.channelName,
        messageId: demoDocuments.messageId,
        messageUrl: demoDocuments.messageUrl,
        authorName: demoDocuments.authorName,
        url: demoDocuments.url,
        host: demoDocuments.host,
        title: demoDocuments.title,
        snippet: demoDocuments.snippet,
        contentLength: demoDocuments.contentLength,
        status: demoDocuments.status,
        errorMessage: demoDocuments.errorMessage,
        fetchAttempts: demoDocuments.fetchAttempts,
        detectedAt: demoDocuments.detectedAt,
        processedAt: demoDocuments.processedAt,
      })
      .from(demoDocuments)
      .where(where)
      .orderBy(desc(demoDocuments.id))
      .limit(limit);

    return Response.json({
      ok: true,
      count: rows.length,
      documents: rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "List failed";
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

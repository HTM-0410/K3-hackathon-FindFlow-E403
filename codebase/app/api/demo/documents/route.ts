/**
 * /api/demo/documents
 *
 * - POST: Discord bot (server test) đẩy metadata link tài liệu vào
 *   bảng demo_documents. Tài liệu được fetch và index tách biệt khỏi
 *   catalog production.
 *
 *   Auth: header `x-ingest-token` phải khớp `DEMO_DOCUMENT_INGEST_TOKEN`
 *   (nếu worker thiết lập). Không dùng chung `REALTIME_INGEST_TOKEN`.
 *
 *   Body:
 *     {
 *       url, host, externalId, messageId, channelId, channelName,
 *       guildId?, authorName, messageExcerpt?, detectedAt
 *     }
 *
 *   Response:
 *     { ok, id, status, reused }
 *
 * - GET: Liệt kê tài liệu demo đã ingest.
 *   Query: limit (1..200), status filter.
 */

import { desc, eq, type SQL, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { demoDocuments, DEMO_DOC_STATUS } from "../../../../db/schema";
import {
  authorizeDemoIngest,
  normalizeDemoLink,
} from "../../../lib/demo-documents";

export const runtime = "edge";

function isLocalRuntime(): boolean {
  return typeof (globalThis as Record<string, unknown>).caches === "undefined";
}

function parseLimit(raw: string | null): number {
  const n = parseInt(String(raw || ""), 10);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, n));
}

async function processDocument(
  link: {
    url: string;
    kind: "url" | "attachment";
    filename?: string;
    contentType?: string;
    size?: number;
  },
): Promise<
  | { status: "ready"; title: string; snippet: string; body: string; contentLength: number }
  | { status: "fetching" }
  | { status: "failed"; error: string }
  | { status: "queued" }
  | { status: "skipped"; reason: string }
> {
  if (link.kind === "attachment") {
    const { fetchDemoAttachment } = await import("../../../lib/demo-document-fetcher");
    try {
      const result = await fetchDemoAttachment({
        url: link.url,
        filename: link.filename,
        contentType: link.contentType,
        declaredSize: link.size,
        botToken: process.env.DISCORD_BOT_TOKEN,
        allowPdf: isLocalRuntime(),
      });
      if (result.status === "ready") {
        return {
          status: "ready",
          title: result.title,
          snippet: result.snippet,
          body: result.body,
          contentLength: result.contentLength,
        };
      }
      if (result.status === "fetching") {
        return { status: "fetching" };
      }
      return { status: "skipped", reason: result.reason };
    } catch (error) {
      return {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  if (!isLocalRuntime()) {
    return { status: "fetching" };
  }
  const { fetchDemoDocument } = await import("../../../lib/demo-document-fetcher");
  try {
    const result = await fetchDemoDocument(link.url);
    return {
      status: "ready",
      title: result.title,
      snippet: result.snippet,
      body: result.body,
      contentLength: result.contentLength,
    };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = authorizeDemoIngest(
    request,
    process.env as { DEMO_DOCUMENT_INGEST_TOKEN?: string },
  );
  if (!auth.ok) {
    return Response.json(
      { error: "Invalid or missing x-ingest-token" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  const link = normalizeDemoLink(payload);
  if (!link) {
    return Response.json(
      { error: "Payload không đủ trường bắt buộc (url, externalId)." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const existing = await db
      .select({ id: demoDocuments.id, status: demoDocuments.status })
      .from(demoDocuments)
      .where(eq(demoDocuments.externalId, link.externalId))
      .limit(1);

    if (existing.length > 0) {
      return Response.json(
        {
          ok: true,
          reused: true,
          id: existing[0].id,
          status: existing[0].status,
          authMode: auth.mode,
        },
        { status: 200 },
      );
    }

    const inserted = await db
      .insert(demoDocuments)
      .values({
        externalId: link.externalId,
        source: "discord-demo",
        guildId: link.guildId,
        channelId: link.channelId,
        channelName: link.channelName,
        messageId: link.messageId,
        messageUrl: link.messageUrl,
        authorName: link.authorName,
        url: link.url,
        host: link.host,
        detectedAt: link.detectedAt,
        status: "queued",
      })
      .returning({ id: demoDocuments.id });

    const newId = inserted[0]?.id;
    if (!newId) {
      return Response.json({ error: "Insert thất bại." }, { status: 500 });
    }

    const processed = await processDocument({
      url: link.url,
      kind: link.kind,
      filename: link.filename,
      contentType: link.contentType,
      size: link.size,
    });

    if (processed.status !== "queued" && processed.status !== "fetching") {
      const patch: Record<string, unknown> = {
        status: processed.status,
        processedAt: Date.now(),
        fetchAttempts: 1,
      };
      if (processed.status === "ready") {
        patch.title = processed.title.slice(0, 200);
        patch.snippet = processed.snippet.slice(0, 280);
        patch.body = processed.body;
        patch.contentLength = processed.contentLength;
      }
      if (processed.status === "skipped") {
        // Lưu metadata attachment vào title/snippet để UI hiển thị,
        // không fetch body vì file binary.
        if (link.kind === "attachment") {
          const filename = link.filename || "attachment";
          const contentType = link.contentType || "application/octet-stream";
          const sizeKb = typeof link.size === "number"
            ? (link.size / 1024).toFixed(1)
            : "?";
          patch.title = filename.slice(0, 200);
          patch.snippet = `Đính kèm Discord · ${contentType} · ${sizeKb} KB`.slice(0, 280);
          patch.contentLength = typeof link.size === "number" ? link.size : 0;
          patch.errorMessage = processed.reason.slice(0, 500);
        }
      }
      if (processed.status === "failed") {
        patch.errorMessage = processed.error.slice(0, 500);
      }
      await db
        .update(demoDocuments)
        .set(patch)
        .where(eq(demoDocuments.id, newId));
    }

    return Response.json({
      ok: true,
      reused: false,
      id: newId,
      status: processed.status,
      authMode: auth.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo ingest failed";
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
          ? "DB chưa có bảng demo_documents. Hãy chạy `npm run db:generate` rồi deploy migration."
          : message,
      },
      { status: 500 },
    );
  }
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

/**
 * DELETE /api/demo/documents?confirm=clear
 *
 * Xoá toàn bộ bảng demo_documents. Chỉ dành cho reset dataset demo khi
 * muốn re-crawl lại từ đầu. Yêu cầu header `x-admin-token` khớp
 * `DEMO_DOCUMENT_ADMIN_TOKEN` nếu được cấu hình; nếu không có biến môi
 * trường, cho phép (chỉ dùng trong local/dev).
 */
export async function DELETE(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const confirm = url.searchParams.get("confirm");
  if (confirm !== "clear") {
    return Response.json(
      {
        error: "Thiếu confirm=clear. Endpoint này xoá toàn bộ demo_documents.",
      },
      { status: 400 },
    );
  }

  const expected = process.env.DEMO_DOCUMENT_ADMIN_TOKEN;
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
    const before = await db
      .select({ id: demoDocuments.id })
      .from(demoDocuments);
    await db.delete(demoDocuments);
    return Response.json({
      ok: true,
      deleted: before.length,
      mode: expected ? "token" : "open",
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Clear failed",
      },
      { status: 500 },
    );
  }
}

"use client";

/**
 * /demo — Demo ingest tài liệu từ Discord server test
 *
 * Trang này quan sát dataset demo (`demo_documents`), tách biệt hoàn toàn
 * khỏi catalog production trong `/`. Hỗ trợ:
 *   - Xem danh sách tài liệu đã ingest, lọc theo trạng thái.
 *   - Tìm kiếm lexical trên dataset demo.
 *   - Refresh realtime bằng polling (mỗi 5 giây).
 */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface DemoDocument {
  id: number;
  externalId: string;
  source: string;
  guildId: string;
  channelId: string;
  channelName: string;
  messageId: string;
  messageUrl: string;
  authorName: string;
  url: string;
  host: string;
  title: string;
  snippet: string;
  contentLength: number;
  status: string;
  errorMessage: string;
  fetchAttempts: number;
  detectedAt: number;
  processedAt: number;
}

interface DemoSearchHit extends DemoDocument {
  score: number;
}

const STATUS_META: Record<
  string,
  { label: string; tone: "ready" | "queued" | "fetching" | "failed" | "skipped" }
> = {
  ready: { label: "Sẵn sàng", tone: "ready" },
  queued: { label: "Đang chờ", tone: "queued" },
  fetching: { label: "Đang tải", tone: "fetching" },
  failed: { label: "Lỗi", tone: "failed" },
  skipped: { label: "Bỏ qua", tone: "skipped" },
};

function fmtRelative(ts: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 1500) return "vừa xong";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s trước`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h trước`;
  return new Date(ts).toLocaleString("vi-VN");
}

function fmtClock(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("vi-VN");
}

export default function DemoIngestPage() {
  const [docs, setDocs] = useState<DemoDocument[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [searchHits, setSearchHits] = useState<DemoSearchHit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [now, setNow] = useState<number>(() => Date.now());
  const cursorRef = useRef<number>(0);

  // Đồng hồ "vừa xong"
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1500);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "80" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/demo/documents?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(typeof data?.error === "string" ? data.error : "Load thất bại");
        return;
      }
      setError("");
      const incoming = Array.isArray(data.documents) ? (data.documents as DemoDocument[]) : [];
      setDocs(incoming);
      const lastId = incoming[0]?.id ?? 0;
      cursorRef.current = Math.max(cursorRef.current, lastId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load thất bại");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Polling mỗi 5 giây để cập nhật realtime
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const onSearch = useCallback(
    async (event?: FormEvent) => {
      if (event) event.preventDefault();
      const q = query.trim();
      if (q.length < 2) {
        setSearchHits([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/demo/search?q=${encodeURIComponent(q)}&limit=10`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setError(typeof data?.error === "string" ? data.error : "Search thất bại");
          setSearchHits([]);
          return;
        }
        setError("");
        setSearchHits(Array.isArray(data.results) ? (data.results as DemoSearchHit[]) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search thất bại");
      } finally {
        setSearching(false);
      }
    },
    [query],
  );

  const counts = useMemo(() => {
    const acc: Record<string, number> = {
      all: docs.length,
      ready: 0,
      queued: 0,
      fetching: 0,
      failed: 0,
      skipped: 0,
    };
    for (const doc of docs) {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
    }
    return acc;
  }, [docs]);

  return (
    <main className="demo-main">
      <header className="demo-header">
        <a className="back-link" href="/" aria-label="Về trang chủ">
          ← Về trang chủ
        </a>
        <div>
          <span className="eyebrow">🧪 DEMO INGEST</span>
          <h1>
            Tài liệu từ Discord test server{" "}
            <span className="gradient-text">tách riêng khỏi dữ liệu thật</span>
          </h1>
          <p>
            Bot bắt link tài liệu trong channel test, gửi metadata về
            <code>/api/demo/documents</code>. Nội dung được fetch, chuẩn hoá và lưu
            vào bảng <code>demo_documents</code> — cô lập hoàn toàn với catalog
            production và <code>realtime_events</code>.
          </p>
        </div>
        <div className={`status-pill live`}>
          <span className="dot on"></span>
          Auto refresh mỗi 5 giây
        </div>
      </header>

      <section className="demo-stats" aria-label="Thống kê dataset demo">
        <div className="stat-card">
          <span className="stat-icon">📚</span>
          <div>
            <b>{counts.all.toLocaleString("vi-VN")}</b>
            <span>Tổng tài liệu demo</span>
          </div>
        </div>
        <div className="stat-card success">
          <span className="stat-icon">✅</span>
          <div>
            <b>{counts.ready.toLocaleString("vi-VN")}</b>
            <span>Sẵn sàng</span>
          </div>
        </div>
        <div className="stat-card accent">
          <span className="stat-icon">⏳</span>
          <div>
            <b>{(counts.queued + counts.fetching).toLocaleString("vi-VN")}</b>
            <span>Đang xử lý</span>
          </div>
        </div>
        <div className="stat-card danger">
          <span className="stat-icon">⚠</span>
          <div>
            <b>{counts.failed.toLocaleString("vi-VN")}</b>
            <span>Thất bại</span>
          </div>
        </div>
        <div className="stat-card muted">
          <span className="stat-icon">⏱</span>
          <div>
            <b>{fmtRelative(now)}</b>
            <span>Cập nhật gần nhất</span>
          </div>
        </div>
      </section>

      <section className="demo-grid">
        <article className="card demo-list">
          <header>
            <h2>Danh sách tài liệu demo</h2>
            <div className="feed-controls">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Lọc theo trạng thái"
              >
                <option value="all">Tất cả ({counts.all})</option>
                <option value="ready">Sẵn sàng ({counts.ready})</option>
                <option value="queued">Đang chờ ({counts.queued})</option>
                <option value="fetching">Đang tải ({counts.fetching})</option>
                <option value="failed">Lỗi ({counts.failed})</option>
                <option value="skipped">Bỏ qua ({counts.skipped})</option>
              </select>
              <button onClick={() => refresh()} disabled={loading}>
                {loading ? "Đang tải…" : "↻ Refresh"}
              </button>
            </div>
          </header>

          {error && <p className="error-box">⚠ {error}</p>}

          {docs.length === 0 ? (
            <div className="empty-feed">
              Chưa có tài liệu demo nào. Gửi một link trong Discord test để bắt đầu.
            </div>
          ) : (
            <ul className="doc-list">
              {docs.map((doc) => {
                const meta = STATUS_META[doc.status] || STATUS_META.queued;
                return (
                  <li key={doc.id} className={`doc-item status-${meta.tone}`}>
                    <div className="doc-row">
                      <span className={`status-tag ${meta.tone}`}>{meta.label}</span>
                      <span className="time">{fmtClock(doc.detectedAt)}</span>
                      {doc.processedAt > 0 && (
                        <span className="time">
                          xử lý {fmtRelative(doc.processedAt)}
                        </span>
                      )}
                    </div>
                    <h3>
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        {doc.title || doc.url}
                      </a>
                    </h3>
                    {doc.snippet && <p className="snippet">{doc.snippet}</p>}
                    <div className="doc-meta">
                      <span className="host">{doc.host || "—"}</span>
                      {doc.channelName && (
                        <span className="channel-tag">#{doc.channelName}</span>
                      )}
                      {doc.authorName && (
                        <span className="author">bởi {doc.authorName}</span>
                      )}
                      {doc.contentLength > 0 && (
                        <span className="size">
                          {doc.contentLength.toLocaleString("vi-VN")} ký tự
                        </span>
                      )}
                    </div>
                    {doc.errorMessage && (
                      <p className="error-message">⚠ {doc.errorMessage}</p>
                    )}
                    <div className="doc-links">
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        Mở link
                      </a>
                      {doc.messageUrl && (
                        <a href={doc.messageUrl} target="_blank" rel="noreferrer">
                          Discord message
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <aside className="card side-panel">
          <header>
            <h2>Tìm trong dataset demo</h2>
          </header>
          <form onSubmit={onSearch} className="search-form">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ví dụ: prompt, slide, agent..."
              aria-label="Từ khoá tìm kiếm"
            />
            <button type="submit" disabled={searching}>
              {searching ? "Đang tìm…" : "Tìm"}
            </button>
          </form>

          {searchHits.length > 0 && (
            <ul className="hit-list">
              {searchHits.map((hit) => {
                const meta = STATUS_META[hit.status] || STATUS_META.queued;
                return (
                  <li key={hit.id} className="hit-item">
                    <a href={hit.url} target="_blank" rel="noreferrer">
                      {hit.title || hit.url}
                    </a>
                    <p className="snippet">{hit.snippet || "(không có trích đoạn)"}</p>
                    <div className="doc-meta">
                      <span className={`status-tag ${meta.tone}`}>{meta.label}</span>
                      <span className="host">{hit.host}</span>
                      <span className="time">{fmtClock(hit.detectedAt)}</span>
                      <span className="score">score {hit.score.toFixed(1)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {query.length >= 2 && !searching && searchHits.length === 0 && (
            <div className="muted">Không có kết quả cho “{query}”.</div>
          )}

          <h3>API sử dụng</h3>
          <ul className="api-list">
            <li>
              <code>GET /api/demo/documents</code> — danh sách + filter
            </li>
            <li>
              <code>GET /api/demo/search?q=</code> — tìm lexical
            </li>
            <li>
              <code>POST /api/demo/documents</code> — bot đẩy link
            </li>
          </ul>

          <h3>Cấu hình bot</h3>
          <ul className="api-list">
            <li>
              <code>DEMO_DOCUMENT_INGEST=true</code> — bật bắt link
            </li>
            <li>
              <code>DEMO_DOCUMENT_INGEST_TOKEN</code> — token chia sẻ với app
            </li>
            <li>
              <code>DEMO_DOCUMENT_DOMAINS</code> — allowlist host (CSV)
            </li>
          </ul>
        </aside>
      </section>
    </main>
  );
}

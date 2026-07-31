"use client";

/**
 * /realtime — Discord Knowledge Hub realtime demo
 *
 * Trang này chứng minh prototype đã kết nối được với Discord server thật,
 * capture được các sự kiện realtime (message, member join/leave, reaction,
 * voice) qua Discord bot, đẩy lên Cloudflare D1 và stream lại cho trình
 * duyệt qua Server-Sent Events.
 *
 * Người dùng mở trang này không cần đăng nhập. Nếu bot chưa chạy, các
 * thẻ số liệu sẽ hiển thị 0 và trạng thái "Bot offline".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------ Types ------------------------------ */

interface RealtimeEvent {
  id: number;
  kind: string;
  externalId: string;
  channelName: string;
  authorName: string;
  content: string;
  metadata?: Record<string, unknown>;
  occurredAt: number;
}

interface RealtimeStats {
  totalMessages: number;
  totalJoins: number;
  totalLeaves: number;
  totalReactions: number;
  totalVoice: number;
  lastHeartbeat: number;
  botStartedAt: number;
  isBotAlive: boolean;
  uptimeMs: number;
}

const KIND_LABELS: Record<string, { label: string; icon: string }> = {
  message: { label: "Tin nhắn", icon: "💬" },
  member_join: { label: "Thành viên mới", icon: "👋" },
  member_leave: { label: "Rời server", icon: "🚪" },
  reaction: { label: "Reaction", icon: "⭐" },
  voice: { label: "Voice", icon: "🔊" },
  bot_ready: { label: "Bot ready", icon: "✅" },
  heartbeat: { label: "Heartbeat", icon: "♥" },
};

/* ------------------------------ Utils ------------------------------ */

function fmtRelative(ts: number): string {
  if (!ts) return "—";
  const diff = Date.now() - Number(ts);
  if (diff < 1500) return "vừa xong";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s trước`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h trước`;
  return new Date(Number(ts)).toLocaleString("vi-VN");
}

function fmtClock(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("vi-VN");
}

/** Render text có URL thành các đoạn text + <a>. */
function renderContentWithLinks(text: string): React.ReactNode {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<>"'`]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const raw = match[0].replace(/[)\]}>.,;]+$/g, "");
    parts.push(
      <a
        key={`l-${key++}`}
        href={raw}
        target="_blank"
        rel="noreferrer"
        className="inline-link"
      >
        {raw}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
}

interface DemoDocument {
  id: number;
  url: string;
  host: string;
  title: string;
  snippet: string;
  status: string;
  channelName: string;
  authorName: string;
  contentLength: number;
  detectedAt: number;
  processedAt: number;
  errorMessage: string;
}

const DOC_STATUS_META: Record<string, { label: string; tone: string }> = {
  ready: { label: "Sẵn sàng", tone: "ready" },
  queued: { label: "Đang chờ", tone: "queued" },
  fetching: { label: "Đang tải", tone: "fetching" },
  failed: { label: "Lỗi", tone: "failed" },
  skipped: { label: "Bỏ qua", tone: "skipped" },
};

/* ------------------------------ UI ------------------------------ */

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  tone?: string;
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
  return (
    <div className={`stat-card ${tone || ""}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <b>{typeof value === "number" ? value.toLocaleString("vi-VN") : value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ChannelBar({ byChannel }: { byChannel: Record<string, number> }) {
  const entries = Object.entries(byChannel || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (entries.length === 0) {
    return <div className="muted">Chưa có hoạt động kênh nào.</div>;
  }
  return (
    <div className="channel-list">
      {entries.map(([name, count]) => (
        <div key={name} className="channel-row">
          <span className="channel-name">#{name || "unknown"}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="bar-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

function EventList({ events }: { events: RealtimeEvent[] }) {
  if (!events || !events.length) {
    return <div className="empty-feed">Chưa có sự kiện nào. Hãy gửi tin nhắn trong Discord!</div>;
  }
  return (
    <ul className="event-list" role="log" aria-live="polite">
      {events.map((ev) => {
        const meta = KIND_LABELS[ev.kind] || { label: ev.kind, icon: "•" };
        const links = Array.isArray(ev.metadata?.links)
          ? (ev.metadata?.links as unknown[]).filter(
              (l): l is string => typeof l === "string",
            )
          : [];
        const excerpt =
          typeof ev.metadata?.messageExcerpt === "string"
            ? (ev.metadata?.messageExcerpt as string)
            : "";
        const discordUrl =
          typeof ev.metadata?.messageUrl === "string"
            ? (ev.metadata?.messageUrl as string)
            : "";
        return (
          <li key={`${ev.id}-${ev.externalId}`} className={`event kind-${ev.kind}`}>
            <span className="event-icon">{meta.icon}</span>
            <div className="event-body">
              <div className="event-head">
                <b>{ev.authorName || "anon"}</b>
                <span className="kind-tag">{meta.label}</span>
                {ev.channelName && <span className="channel-tag">#{ev.channelName}</span>}
                <span className="time">{fmtClock(ev.occurredAt)}</span>
              </div>
              {(ev.kind === "message" && (ev.content || excerpt)) ? (
                <p className="event-content">
                  {renderContentWithLinks(excerpt || ev.content)}
                </p>
              ) : (
                <p>{ev.content || "(không có nội dung)"}</p>
              )}
              {links.length > 0 && (
                <div className="link-list">
                  <span className="link-label">🔗 Link phát hiện:</span>
                  <ul>
                    {links.map((link, idx) => (
                      <li key={`${ev.id}-link-${idx}`}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-link"
                          title={link}
                        >
                          {safeHost(link) || link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(ev.kind === "message" || ev.kind === "reaction") && discordUrl && (
                <div className="event-footer">
                  <a
                    href={discordUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="muted-link"
                  >
                    ↗ Mở trong Discord
                  </a>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DocumentList({ documents }: { documents: DemoDocument[] }) {
  if (!documents || !documents.length) {
    return (
      <div className="muted">
        Chưa có tài liệu nào trong dataset demo. Bật <code>DEMO_DOCUMENT_INGEST</code>
        và gửi link trong Discord test.
      </div>
    );
  }
  return (
    <ul className="doc-mini-list">
      {documents.map((doc) => {
        const meta = DOC_STATUS_META[doc.status] || DOC_STATUS_META.queued;
        return (
          <li key={doc.id} className="doc-mini">
            <div className="doc-mini-head">
              <span className={`status-tag ${meta.tone}`}>{meta.label}</span>
              <span className="host">{doc.host || safeHost(doc.url)}</span>
              <span className="time">{fmtClock(doc.detectedAt)}</span>
            </div>
            <a
              className="doc-mini-title"
              href={doc.url}
              target="_blank"
              rel="noreferrer"
            >
              {doc.title || doc.url}
            </a>
            {doc.snippet && <p className="snippet">{doc.snippet}</p>}
            {doc.errorMessage && (
              <p className="error-message">⚠ {doc.errorMessage}</p>
            )}
            <div className="doc-mini-meta">
              {doc.channelName && <span>#{doc.channelName}</span>}
              {doc.authorName && <span>· {doc.authorName}</span>}
              {doc.contentLength > 0 && (
                <span>· {doc.contentLength.toLocaleString("vi-VN")} ký tự</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------ Page ------------------------------ */

const EMPTY_STATS: RealtimeStats = {
  totalMessages: 0,
  totalJoins: 0,
  totalLeaves: 0,
  totalReactions: 0,
  totalVoice: 0,
  lastHeartbeat: 0,
  botStartedAt: 0,
  isBotAlive: false,
  uptimeMs: 0,
};

export default function RealtimePage() {
  const [stats, setStats] = useState<RealtimeStats>(EMPTY_STATS);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "offline" | "error">("connecting");
  const [error, setError] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [paused, setPaused] = useState(false);
  const [hideHeartbeats, setHideHeartbeats] = useState(true);
  const [documents, setDocuments] = useState<DemoDocument[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());
  const cursorRef = useRef<number>(0);

  // Đồng hồ "vừa xong"
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1500);
    return () => clearInterval(t);
  }, []);

  // 1. Polling stats — fail-safe để vẫn thấy số liệu khi SSE bị chặn
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/realtime/stats", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok) setStats(data as RealtimeStats);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshStats();
    const t = setInterval(refreshStats, 10_000);
    return () => clearInterval(t);
  }, [refreshStats]);

  // Polling danh sách tài liệu demo (cô lập khỏi catalog production).
  const refreshDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/demo/documents?limit=20", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.documents)) {
        setDocuments(data.documents as DemoDocument[]);
      }
    } catch {
      /* ignore — UI vẫn hiển thị danh sách cũ */
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
    const t = setInterval(refreshDocuments, 5_000);
    return () => clearInterval(t);
  }, [refreshDocuments]);

  // 2. Polling messages ban đầu — cho có dữ liệu hiển thị ngay khi mở trang
  const loadInitial = useCallback(async () => {
    try {
      const res = await fetch("/api/realtime/messages?limit=80", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.events)) {
        const sortedAsc = [...(data.events as RealtimeEvent[])].sort(
          (a, b) => a.id - b.id,
        );
        cursorRef.current =
          (data as { lastId?: number }).lastId ||
          sortedAsc[sortedAsc.length - 1]?.id ||
          0;
        setEvents(sortedAsc.slice(-80));
        if (data.events.length > 0 && status !== "live") setStatus("live");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Không tải được lịch sử");
    }
  }, [status]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // 3. SSE stream — đẩy event mới realtime vào UI
  useEffect(() => {
    if (typeof EventSource === "undefined") {
      setStatus("error");
      setError("Trình duyệt không hỗ trợ EventSource.");
      return;
    }
    const url = `/api/realtime/events?since=${cursorRef.current}`;
    const es = new EventSource(url);
    es.onopen = () => {
      setStatus("live");
      setError("");
    };
    es.onerror = () => {
      setStatus((s) => (s === "live" ? s : "offline"));
    };
    es.onmessage = (msg: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(msg.data);
        if (payload.type === "ping") return;
        if (payload.type === "error") {
          setError(payload.message || "Stream error");
          return;
        }
        if (payload.type === "event") {
          cursorRef.current = Math.max(cursorRef.current, payload.id);
          const incoming = payload as RealtimeEvent;
          setEvents((prev) => {
            // Dedupe: SSE có thể replay event đã có từ loadInitial (race since=0)
            if (prev.some((e) => e.id === incoming.id)) return prev;
            const next = [...prev, incoming];
            // Giữ tối đa 200 dòng
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });
          // bump stats client-side cho mượt
          if (incoming.kind === "message") {
            setStats((s) => ({ ...s, totalMessages: s.totalMessages + 1 }));
          }
          if (incoming.kind === "member_join") {
            setStats((s) => ({ ...s, totalJoins: s.totalJoins + 1 }));
          }
          if (incoming.kind === "member_leave") {
            setStats((s) => ({ ...s, totalLeaves: s.totalLeaves + 1 }));
          }
          if (incoming.kind === "reaction") {
            setStats((s) => ({ ...s, totalReactions: s.totalReactions + 1 }));
          }
          if (incoming.kind === "voice") {
            setStats((s) => ({ ...s, totalVoice: s.totalVoice + 1 }));
          }
          if (incoming.kind === "heartbeat" || incoming.kind === "bot_ready") {
            setStats((s) => ({
              ...s,
              lastHeartbeat: incoming.occurredAt || Date.now(),
              isBotAlive: true,
              botStartedAt:
                incoming.kind === "bot_ready" ? incoming.occurredAt : s.botStartedAt,
            }));
          }
        }
      } catch {
        // ignore parse errors
      }
    };
    return () => es.close();
  }, []);

  const filteredEvents = useMemo<RealtimeEvent[]>(() => {
    let list = events;
    if (hideHeartbeats) {
      list = list.filter((e) => e.kind !== "heartbeat");
    }
    if (filterKind !== "all") {
      list = list.filter((e) => e.kind === filterKind);
    }
    return list;
  }, [events, filterKind, hideHeartbeats]);

  const recentDocsCount = useMemo(
    () => documents.filter((d) => d.status === "ready").length,
    [documents],
  );

  const byChannel = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      if (!e.channelName) continue;
      map[e.channelName] = (map[e.channelName] || 0) + 1;
    }
    return map;
  }, [events]);

  const statusInfo = useMemo(() => {
    const alive = stats.isBotAlive;
    if (alive) return { label: "Bot đang kết nối", tone: "live", dot: true };
    if (stats.lastHeartbeat) return { label: "Bot offline (mất kết nối)", tone: "warn", dot: true };
    return { label: "Chưa có dữ liệu từ bot", tone: "neutral", dot: false };
  }, [stats.isBotAlive, stats.lastHeartbeat]);

  return (
    <main className="realtime-main">
      <header className="realtime-header">
        <a className="back-link" href="/" aria-label="Về trang chủ">
          ← Về trang chủ
        </a>
        <div>
          <span className="eyebrow">⚡ REALTIME DEMO</span>
          <h1>
            Discord server <span className="gradient-text">đang chạy thật</span>
            <br />
            cập nhật trên web theo thời gian thực
          </h1>
          <p>
            Bot nhỏ kết nối Discord qua Gateway, capture mọi sự kiện từ kênh bạn chọn, đẩy lên
            Cloudflare D1 và stream lại cho trang này qua Server-Sent Events. Đây là bằng chứng
            hệ thống chạy được với server Discord thật — không phải mock.
          </p>
        </div>
        <div className={`status-pill ${statusInfo.tone}`}>
          <span className={`dot ${statusInfo.dot ? "on" : "off"}`}></span>
          {statusInfo.label}
        </div>
      </header>

      <section className="stat-grid" aria-label="Thống kê realtime">
        <StatCard label="Tin nhắn" value={stats.totalMessages} icon="💬" />
        <StatCard label="Thành viên mới" value={stats.totalJoins} icon="👋" tone="success" />
        <StatCard label="Rời server" value={stats.totalLeaves} icon="🚪" tone="danger" />
        <StatCard label="Reactions" value={stats.totalReactions} icon="⭐" tone="accent" />
        <StatCard label="Voice events" value={stats.totalVoice} icon="🔊" tone="violet" />
        <StatCard
          label="Tài liệu demo"
          value={`${recentDocsCount}/${documents.length}`}
          icon="📄"
          tone="accent"
        />
        <StatCard label="Uptime bot" value={`${Math.floor(stats.uptimeMs / 60000)}m`} icon="⏱" tone="muted" />
      </section>

      <section className="realtime-grid">
        <article className="card live-feed">
          <header>
            <h2>Live feed</h2>
            <div className="feed-controls">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={hideHeartbeats}
                  onChange={(e) => setHideHeartbeats(e.target.checked)}
                />
                <span>Ẩn heartbeat</span>
              </label>
              <select
                value={filterKind}
                onChange={(e) => setFilterKind(e.target.value)}
                aria-label="Lọc loại sự kiện"
              >
                <option value="all">Tất cả</option>
                {Object.entries(KIND_LABELS)
                  .filter(([k]) => !(hideHeartbeats && k === "heartbeat"))
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.icon} {v.label}
                    </option>
                  ))}
              </select>
              <button onClick={() => setPaused((p) => !p)}>
                {paused ? "▶ Tiếp tục" : "⏸ Tạm dừng"}
              </button>
            </div>
          </header>
          <EventList events={paused ? filteredEvents.slice(-50) : filteredEvents.slice(-80)} />
        </article>

        <aside className="card side-panel">
          <header>
            <h2>Trạng thái bot</h2>
          </header>
          <dl className="bot-meta">
            <div>
              <dt>Trạng thái SSE</dt>
              <dd>
                <span className={`badge ${status}`}>
                  {status === "live"
                    ? "Đang stream"
                    : status === "connecting"
                      ? "Đang kết nối"
                      : status === "offline"
                        ? "Offline"
                        : "Lỗi"}
                </span>
              </dd>
            </div>
            <div>
              <dt>Heartbeat gần nhất</dt>
              <dd>{fmtRelative(stats.lastHeartbeat)}</dd>
            </div>
            <div>
              <dt>Bot khởi động</dt>
              <dd>
                {stats.botStartedAt
                  ? new Date(stats.botStartedAt).toLocaleString("vi-VN")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Cập nhật gần nhất</dt>
              <dd>{fmtRelative(now)}</dd>
            </div>
          </dl>

          <h3>Hoạt động theo kênh</h3>
          <ChannelBar byChannel={byChannel} />

          {error && <p className="error-box">⚠ {error}</p>}

          <h3>API sử dụng</h3>
          <ul className="api-list">
            <li>
              <code>GET /api/realtime/stats</code> — tổng hợp realtime
            </li>
            <li>
              <code>GET /api/realtime/messages</code> — feed gần nhất
            </li>
            <li>
              <code>GET /api/realtime/events</code> — SSE stream
            </li>
            <li>
              <code>POST /api/realtime/ingest</code> — Discord bot đẩy event
            </li>
            <li>
              <code>GET /api/demo/documents</code> — tài liệu demo
            </li>
          </ul>
        </aside>
      </section>

      <section className="documents-section">
        <header className="section-head">
          <div>
            <span className="eyebrow">📚 DEMO INGEST</span>
            <h2>
              Tài liệu từ Discord test server{" "}
              <span className="muted-text">cập nhật mỗi 5 giây</span>
            </h2>
          </div>
          <a className="muted-link" href="/demo">
            Mở trang quản lý chi tiết →
          </a>
        </header>
        <DocumentList documents={documents} />
      </section>
    </main>
  );
}

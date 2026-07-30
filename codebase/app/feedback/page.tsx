"use client";

/**
 * /feedback — User feedback metric dashboard
 *
 * Hiển thị helpful rate (số 👍 / (số 👍 + số 👎) trong từng kết quả tìm kiếm)
 * theo ngày / theo resource / theo status. Đồng thời liệt kê "top unhelpful
 * queries" đầu vào để bổ sung vào golden set.
 *
 * Data source: GET /api/feedback?action=stats&days=...
 *
 * Phase 2 dashboard, không yêu cầu auth. Nếu DB trống sẽ hiển thị 0.
 */

import { useCallback, useEffect, useState } from "react";

interface DailyBucket {
  date: string;
  total: number;
  helpful: number;
  unhelpful: number;
  rate: number;
}

interface ResourceBucket {
  resourceId: string;
  total: number;
  helpful: number;
  unhelpful: number;
  rate: number;
}

interface StatusBucket {
  status: string;
  total: number;
  helpful: number;
  unhelpful: number;
  rate: number;
}

interface UnhelpfulQuery {
  normalizedQuery: string;
  count: number;
  resourceIds: string[];
}

interface FeedbackStats {
  windowDays: number;
  total: number;
  helpful: number;
  unhelpful: number;
  helpfulRate: number;
  byDay: DailyBucket[];
  byResource: ResourceBucket[];
  byStatus: StatusBucket[];
  topUnhelpfulQueries: UnhelpfulQuery[];
}

const DAYS_OPTIONS = [7, 30, 90] as const;

function HelpRateBar({ rate, total }: { rate: number; total: number }) {
  const safeRate = Math.max(0, Math.min(100, rate));
  return (
    <div className="help-bar" aria-label={`${safeRate}% helpful, ${total} phiếu`}>
      <div className="help-bar-fill" style={{ width: `${safeRate}%` }} />
      <span className="help-bar-label">
        {safeRate}% <small>({total})</small>
      </span>
    </div>
  );
}

function HelpRateTrend({ points }: { points: DailyBucket[] }) {
  if (points.length === 0) {
    return <div className="empty-line">Chưa có phản hồi trong khoảng này.</div>;
  }
  const W = 720;
  const H = 160;
  const padL = 32;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = 100;
  const step = points.length === 1 ? 0 : innerW / (points.length - 1);
  const xy = (i: number, v: number) => {
    const x = padL + i * step;
    const y = padT + innerH - (Math.max(0, Math.min(max, v)) / max) * innerH;
    return [x, y];
  };
  const polylinePoints = points
    .map((p, i) => {
      const [x, y] = xy(i, p.rate);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const yTicks = [0, 25, 50, 75, 100];
  const xLabels = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 7)) === 0);

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Biểu đồ helpful rate theo ngày"
    >
      {yTicks.map((tick) => {
        const [x1, y1] = xy(0, tick);
        const [x2] = xy(Math.max(1, points.length - 1), 0);
        return (
          <g key={tick}>
            <line
              x1={x1}
              x2={x2}
              y1={y1}
              y2={y1}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="2 4"
            />
            <text x={4} y={y1 + 4} fontSize={10} fill="rgba(255,255,255,0.5)">
              {tick}%
            </text>
          </g>
        );
      })}
      {points.length > 1 && <polyline points={polylinePoints} fill="none" stroke="#7dd3fc" strokeWidth={2} />}
      {points.map((p, i) => {
        const [x, y] = xy(i, p.rate);
        const r = p.total > 0 ? Math.min(5, 2 + p.total * 0.4) : 0;
        return <circle key={p.date} cx={x} cy={y} r={r} fill="#7dd3fc">{p.total > 0 && <title>{p.date}: {p.rate}% ({p.helpful}/{p.total})</title>}</circle>;
      })}
      {xLabels.map((p) => {
        const i = points.indexOf(p);
        const [x] = xy(i, 0);
        return (
          <text key={p.date} x={x} y={H - 6} fontSize={10} fill="rgba(255,255,255,0.5)" textAnchor="middle">
            {p.date.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

function StatusBreakdown({ buckets }: { buckets: StatusBucket[] }) {
  if (buckets.length === 0) return <div className="empty-line">Chưa có dữ liệu.</div>;
  return (
    <table className="metric-table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Tổng</th>
          <th>Helpful</th>
          <th>Rate</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((b) => (
          <tr key={b.status}>
            <td><code>{b.status}</code></td>
            <td>{b.total}</td>
            <td>{b.helpful}</td>
            <td><HelpRateBar rate={b.rate} total={b.total} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResourceTable({ buckets }: { buckets: ResourceBucket[] }) {
  if (buckets.length === 0) return <div className="empty-line">Chưa có dữ liệu.</div>;
  return (
    <table className="metric-table">
      <thead>
        <tr>
          <th>Resource ID</th>
          <th>Tổng</th>
          <th>Helpful</th>
          <th>Rate</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((b) => (
          <tr key={b.resourceId}>
            <td><code>{b.resourceId.slice(0, 16)}</code></td>
            <td>{b.total}</td>
            <td>{b.helpful}</td>
            <td><HelpRateBar rate={b.rate} total={b.total} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UnhelpfulQueries({ rows }: { rows: UnhelpfulQuery[] }) {
  if (rows.length === 0) return <div className="empty-line">Không có query nào bị 👎 nhiều.</div>;
  return (
    <table className="metric-table">
      <thead>
        <tr>
          <th>Query</th>
          <th>👎 Count</th>
          <th>Sample resource</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.normalizedQuery}>
            <td><code>{r.normalizedQuery || "(empty)"}</code></td>
            <td>{r.count}</td>
            <td><code>{r.resourceIds[0]?.slice(0, 16) ?? "—"}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FeedbackDashboardPage() {
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastReload, setLastReload] = useState<number>(0);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback?action=stats&days=${d}`, { cache: "no-store" });
      const data = (await res.json()) as FeedbackStats & { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setStats(null);
      } else {
        setStats(data);
        setLastReload(Date.now());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
    const t = setInterval(() => load(days), 60_000);
    return () => clearInterval(t);
  }, [days, load]);

  return (
    <main className="feedback-dashboard">
      <header className="dashboard-head">
        <div>
          <h1>📊 User Feedback Metric</h1>
          <p>
            Theo dõi helpful rate từ các lượt <kbd>👍</kbd>/<kbd>👎</kbd> trong UI.
            Dữ liệu aggregate từ bảng <code>search_feedback</code> trong D1.
          </p>
        </div>
        <div className="dashboard-actions">
          <div className="days-tabs" role="tablist" aria-label="Chọn khoảng thời gian">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                role="tab"
                aria-selected={days === d}
                className={days === d ? "active" : ""}
                onClick={() => setDays(d)}
              >
                {d} ngày
              </button>
            ))}
          </div>
          <button onClick={() => load(days)} disabled={loading}>
            {loading ? "Đang tải…" : "↻ Tải lại"}
          </button>
        </div>
      </header>

      {error && <div className="error-banner">⚠ {error}</div>}

      {stats && (
        <>
          <section className="kpi-grid">
            <article className="kpi-card">
              <small>Tổng phản hồi</small>
              <b>{stats.total}</b>
            </article>
            <article className="kpi-card helpful">
              <small>Helpful</small>
              <b>{stats.helpful}</b>
            </article>
            <article className="kpi-card unhelpful">
              <small>Unhelpful</small>
              <b>{stats.unhelpful}</b>
            </article>
            <article className="kpi-card rate">
              <small>Helpful rate</small>
              <b>{stats.helpfulRate}%</b>
            </article>
          </section>

          <section className="chart-section">
            <header>
              <h2>Helpful rate theo ngày</h2>
              <small>Đường là % helpful, độ lớn điểm = số phiếu trong ngày.</small>
            </header>
            <HelpRateTrend points={stats.byDay} />
          </section>

          <section className="grid-section">
            <article>
              <header><h2>Theo retrieval status</h2></header>
              <StatusBreakdown buckets={stats.byStatus} />
            </article>
            <article>
              <header><h2>Top resource có rating thấp</h2></header>
              <ResourceTable buckets={stats.byResource} />
            </article>
          </section>

          <section>
            <header>
              <h2>🚩 Top unhelpful queries</h2>
              <small>Đầu vào tiềm năng cho eval cases tiếp theo.</small>
            </header>
            <UnhelpfulQueries rows={stats.topUnhelpfulQueries} />
          </section>

          <footer className="dashboard-foot">
            <span>Cập nhật lúc {new Date(lastReload).toLocaleTimeString("vi-VN")}</span>
            <small>Auto-refresh mỗi 60 giây.</small>
          </footer>
        </>
      )}

      {!stats && !loading && !error && (
        <div className="empty-state">
          <p>Chưa có dữ liệu phản hồi trong khoảng này.</p>
          <small>Người dùng bấm 👍/👎 trong <a href="/">trang tìm kiếm</a> sẽ xuất hiện ở đây.</small>
        </div>
      )}
    </main>
  );
}

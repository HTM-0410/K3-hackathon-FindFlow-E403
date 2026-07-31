"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { LabCoachMissedResponse, LabCoachQuestion, LabCoachStats } from "../types/labcoach";

// BrandMark SVG
function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="26" height="26" role="img">
        <defs>
          <linearGradient id="bm-orb-lc" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#a5b4fc" />
          </linearGradient>
          <radialGradient id="bm-spark-lc" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="16" rx="13.4" ry="9.6" fill="none" stroke="#cffafe" strokeWidth="0.9" strokeOpacity="0.45" transform="rotate(-22 16 16)" />
        <ellipse cx="16" cy="16" rx="8.6" ry="5.8" fill="none" stroke="url(#bm-orb-lc)" strokeWidth="1.4" strokeOpacity="0.95" transform="rotate(-22 16 16)" />
        <circle cx="25.2" cy="20.6" r="2.2" fill="url(#bm-spark-lc)" />
        <circle cx="25.2" cy="20.6" r="1.1" fill="#ffffff" />
        <circle cx="6.8" cy="11.4" r="1.1" fill="#a5b4fc" />
        <text x="16" y="20" textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontWeight="800" fontSize="11" letterSpacing="-0.6" fill="#ffffff">DK</text>
      </svg>
    </span>
  );
}

// Header component
function AppHeader() {
  return (
    <header className="header">
      <button className="brand" onClick={() => window.location.assign("/")} aria-label="Về trang chủ">
        <BrandMark />
        <span>
          <b>Discord Knowledge Hub</b>
          <small>Kho tri thức khóa học AI</small>
        </span>
      </button>
      <nav>
        <button onClick={() => window.location.assign("/")}>Tìm kiếm</button>
        <button onClick={() => window.location.assign("/resources")}>Kho tài liệu</button>
        <button className="active" onClick={() => window.location.assign("/labcoach")}>📋 LabCoach</button>
      </nav>
      <span className="cp-badge">LabCoach Tracker</span>
    </header>
  );
}

// Urgency badge
function UrgencyBadge({ urgency }: { urgency: LabCoachQuestion["urgency"] }) {
  const styles = {
    high: { bg: "#f87171", label: "HIGH" },
    medium: { bg: "#fbbf24", label: "MEDIUM" },
    low: { bg: "#34d399", label: "LOW" },
  };
  const { bg, label } = styles[urgency];
  return (
    <span
      className="urgency-badge"
      style={{ backgroundColor: bg, color: urgency === "low" ? "#064e3b" : "#ffffff" }}
    >
      {label}
    </span>
  );
}

// Question card
function QuestionCard({
  question,
  index,
  onResolve,
  showResolve = true,
  onRestore,
}: {
  question: LabCoachQuestion;
  index: number;
  onResolve?: (id: string) => void;
  showResolve?: boolean;
  onRestore?: (id: string) => void;
}) {
  const timeAgo = new Date(question.timestamp).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="question-card">
      <div className="card-top">
        <span className="rank">#{index + 1}</span>
        <UrgencyBadge urgency={question.urgency} />
        <span className="channel-badge">#{question.channelName}</span>
        {showResolve && onResolve && (
          <button
            className="resolve-btn"
            onClick={() => onResolve(question.id)}
            title="Đánh dấu đã giải quyết"
          >
            ✓
          </button>
        )}
        {!showResolve && onRestore && (
          <button
            className="restore-btn"
            onClick={() => onRestore(question.id)}
            title="Khôi phục câu hỏi"
          >
            ↩
          </button>
        )}
      </div>

      <div className="question-author">
        <strong className="author-name">{question.authorNickname || question.authorName}</strong>
        <span className="time">{timeAgo}</span>
      </div>

      <p className="question-content">"{question.content}"</p>

      <div className="question-meta">
        <span className="unanswered-time">
          <span className="clock-icon">⏱</span>
          <strong>{question.unansweredForFormatted}</strong>
        </span>
        <a
          href={question.messageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="discord-link"
        >
          Discord ↗
        </a>
      </div>
    </article>
  );
}

// Stats cards
function StatsCards({ stats }: { stats: LabCoachStats | null }) {
  if (!stats) return null;

  const items = [
    { label: "Tổng tin nhắn", value: stats.total_messages, color: "#a5b4fc" },
    { label: "Câu hỏi Lab", value: stats.total_questions, color: "#67e8f9" },
    { label: "Đã trả lời", value: stats.answered, color: "#34d399" },
    { label: "Chưa trả lời", value: Math.max(0, stats.unanswered), color: "#f87171" },
  ];

  return (
    <div className="stats-row">
      {items.map((item) => (
        <div key={item.label} className="stat-card">
          <span className="stat-value" style={{ color: item.color }}>
            {item.value}
          </span>
          <span className="stat-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyState({ message = "Không có câu hỏi nào!" }: { message?: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">📭</div>
      <h2>{message}</h2>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="questions-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card"></div>
      ))}
    </div>
  );
}

// Pagination
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination">
      <button
        className="page-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ←
      </button>

      {pageNumbers.map((page, idx) =>
        page === "..." ? (
          <span key={`dots-${idx}`} className="page-dots">...</span>
        ) : (
          <button
            key={page}
            className={`page-btn ${page === currentPage ? "active" : ""}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      )}

      <button
        className="page-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        →
      </button>
    </div>
  );
}

// Toast notification
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

// Filter bar
function FilterBar({
  urgencyFilter,
  setUrgencyFilter,
  searchQuery,
  setSearchQuery,
}: {
  urgencyFilter: string;
  setUrgencyFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  return (
    <div className="filter-bar">
      <div className="search-mini">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Tìm trong nội dung..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="urgency-filter">
        <button
          className={`filter-btn ${urgencyFilter === "all" ? "active" : ""}`}
          onClick={() => setUrgencyFilter("all")}
        >
          Tất cả
        </button>
        <button
          className={`filter-btn high ${urgencyFilter === "high" ? "active" : ""}`}
          onClick={() => setUrgencyFilter("high")}
        >
          🔴 High
        </button>
        <button
          className={`filter-btn medium ${urgencyFilter === "medium" ? "active" : ""}`}
          onClick={() => setUrgencyFilter("medium")}
        >
          🟡 Medium
        </button>
        <button
          className={`filter-btn low ${urgencyFilter === "low" ? "active" : ""}`}
          onClick={() => setUrgencyFilter("low")}
        >
          🟢 Low
        </button>
      </div>
    </div>
  );
}

// Tab component
function TabBar({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: "unanswered" | "resolved";
  onTabChange: (tab: "unanswered" | "resolved") => void;
  counts: { unanswered: number; resolved: number };
}) {
  return (
    <div className="tab-bar">
      <button
        className={`tab-btn ${activeTab === "unanswered" ? "active" : ""}`}
        onClick={() => onTabChange("unanswered")}
      >
        📋 Câu hỏi chưa trả lời
        <span className="tab-count">{counts.unanswered}</span>
      </button>
      <button
        className={`tab-btn ${activeTab === "resolved" ? "active" : ""}`}
        onClick={() => onTabChange("resolved")}
      >
        ✅ Đã giải quyết
        <span className="tab-count resolved">{counts.resolved}</span>
      </button>
    </div>
  );
}

// Main page component
export default function LabCoachDashboard() {
  const [questions, setQuestions] = useState<LabCoachQuestion[]>([]);
  const [stats, setStats] = useState<LabCoachStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"unanswered" | "resolved">("unanswered");
  const [currentPage, setCurrentPage] = useState(1);
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const PER_PAGE = 12;

  const [resolvedQuestions, setResolvedQuestions] = useState<Set<string>>(new Set());

  // Load resolved from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("labcoach-resolved");
      if (saved) {
        setResolvedQuestions(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save resolved to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("labcoach-resolved", JSON.stringify([...resolvedQuestions]));
    } catch {
      // ignore
    }
  }, [resolvedQuestions]);

  const fetchMissedQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/labcoach/missed?limit=50");
      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions || []);
        setStats(data.stats || null);
        setLastUpdated(new Date());
        setToast("Đã cập nhật!");
      } else {
        setError(data.error || "Failed to fetch data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissedQuestions();
  }, [fetchMissedQuestions]);

  // Resolve a question - update stats live
  const handleResolve = useCallback((id: string) => {
    setResolvedQuestions((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        answered: prev.answered + 1,
        unanswered: Math.max(0, prev.unanswered - 1),
      };
    });
    setToast("Đã đánh dấu giải quyết ✓");
  }, []);

  // Restore a question
  const handleRestore = useCallback((id: string) => {
    setResolvedQuestions((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        answered: Math.max(0, prev.answered - 1),
        unanswered: prev.unanswered + 1,
      };
    });
    setToast("Đã khôi phục ↩");
  }, []);

  // Clear all resolved
  const handleClearResolved = useCallback(() => {
    const count = resolvedQuestions.size;
    setResolvedQuestions(new Set());
    setStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        answered: Math.max(0, prev.answered - count),
        unanswered: prev.unanswered + count,
      };
    });
    setToast("Đã xóa lịch sử");
  }, [resolvedQuestions.size]);

  // Filter questions
  const unansweredQuestions = useMemo(() => {
    return questions.filter((q) => !resolvedQuestions.has(q.id));
  }, [questions, resolvedQuestions]);

  const resolvedQuestionsList = useMemo(() => {
    return questions.filter((q) => resolvedQuestions.has(q.id));
  }, [questions, resolvedQuestions]);

  const applyFilters = (qs: LabCoachQuestion[]) => {
    let result = qs;
    if (urgencyFilter !== "all") {
      result = result.filter((q) => q.urgency === urgencyFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (q1) =>
          q1.content.toLowerCase().includes(q) ||
          (q1.authorNickname || q1.authorName).toLowerCase().includes(q)
      );
    }
    return result;
  };

  const filteredUnanswered = useMemo(
    () => applyFilters(unansweredQuestions),
    [unansweredQuestions, urgencyFilter, searchQuery]
  );

  const filteredResolved = useMemo(
    () => applyFilters(resolvedQuestionsList),
    [resolvedQuestionsList, urgencyFilter, searchQuery]
  );

  const activeQuestions = activeTab === "unanswered" ? filteredUnanswered : filteredResolved;
  const totalPages = Math.ceil(activeQuestions.length / PER_PAGE);
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE;
    return activeQuestions.slice(start, start + PER_PAGE);
  }, [activeQuestions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, urgencyFilter, searchQuery]);

  return (
    <>
      <AppHeader />

      <main className="listing">
        <div className="page-title">
          <span className="eyebrow">📋 LAB COACH TRACKER</span>
          <h1>Quản lý câu hỏi Lab</h1>
          <p>
            Theo dõi và quản lý các câu hỏi từ học viên.
            Nhấn <strong>✓</strong> để đánh dấu đã giải quyết.
          </p>
        </div>

        <StatsCards stats={stats} />

        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{ unanswered: filteredUnanswered.length, resolved: filteredResolved.length }}
        />

        <div className="action-bar">
          <div className="action-info">
            <span className="count">
              <strong>{activeQuestions.length}</strong> câu hỏi
            </span>
            {lastUpdated && (
              <span className="last-updated">
                Cập nhật: {lastUpdated.toLocaleTimeString("vi-VN")}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {activeTab === "resolved" && filteredResolved.length > 0 && (
              <button className="secondary" onClick={handleClearResolved}>
                🗑 Xóa lịch sử
              </button>
            )}
            <button
              className="primary reload-btn"
              onClick={fetchMissedQuestions}
              disabled={loading}
            >
              <svg
                className={`reload-icon ${loading ? "spinning" : ""}`}
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "..." : "Reload"}
            </button>
          </div>
        </div>

        <FilterBar
          urgencyFilter={urgencyFilter}
          setUrgencyFilter={setUrgencyFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {error && (
          <div className="search-notice no_match" role="alert">
            <div>
              <b>Lỗi tải dữ liệu</b>
              <p>{error}</p>
            </div>
          </div>
        )}

        <section className="results">
          {loading && questions.length === 0 ? (
            <LoadingSkeleton count={PER_PAGE} />
          ) : paginatedQuestions.length === 0 ? (
            <EmptyState
              message={
                activeTab === "unanswered"
                  ? "Tuyệt vời! Không có câu hỏi nào chưa được trả lời 🎉"
                  : "Chưa có câu hỏi nào được đánh dấu giải quyết"
              }
            />
          ) : (
            <>
              <div className="questions-grid">
                {paginatedQuestions.map((question, index) => {
                  const globalIndex = (currentPage - 1) * PER_PAGE + index;
                  return (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={globalIndex}
                      showResolve={activeTab === "unanswered"}
                      onResolve={activeTab === "unanswered" ? handleResolve : undefined}
                      onRestore={activeTab === "resolved" ? handleRestore : undefined}
                    />
                  );
                })}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </section>
      </main>

      <footer>
        <span>Discord Knowledge Hub • Batch 03</span>
        <small>LabCoach Tracker • Theo dõi câu hỏi học viên</small>
      </footer>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

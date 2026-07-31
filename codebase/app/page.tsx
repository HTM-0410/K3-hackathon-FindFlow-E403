"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { resourceById, resources } from "./data/resources";
import { fallbackRank, filterResources, normalizeText } from "./lib/search";
import { MAIN_TOPICS, getMainTopic } from "./lib/topics";
import type {
  ClarificationOption,
  Resource,
  ResourceType,
  SearchResponse,
  SearchStatus,
} from "./types/resource";

type Filters = {
  type: ResourceType | "all";
  topic: string;
  channel: string;
  sortBy: string;
};

const typeLabels: Record<ResourceType, string> = {
  slide: "Slide bài giảng",
  video: "Video khóa học",
  github: "GitHub / Code",
  lab: "Bài lab thực hành",
  announcement: "Thông báo",
  guide: "Hướng dẫn",
};
const typeIcons: Record<ResourceType, string> = {
  slide: "▤",
  video: "▶",
  github: "⌘",
  lab: "⚗",
  announcement: "◉",
  guide: "◇",
};
const suggestions = [
  "Hướng dẫn tải slide bài giảng trên Vlearn",
  "Codelab Day 4 Prompt Engineering Tool Calling",
  "Repo K3-AI-Product-Hackathon",
  "Cách phòng chống Prompt Injection trong AI Agent",
];
const defaultFilters: Filters = {
  type: "all",
  topic: "all",
  channel: "all",
  sortBy: "relevance",
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="26" height="26" role="img">
        <defs>
          <linearGradient id="bm-orb" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#a5b4fc" />
          </linearGradient>
          <radialGradient id="bm-spark" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* faint outer orbit — frames the mark */}
        <ellipse
          cx="16"
          cy="16"
          rx="13.4"
          ry="9.6"
          fill="none"
          stroke="#cffafe"
          strokeWidth="0.9"
          strokeOpacity="0.45"
          transform="rotate(-22 16 16)"
        />

        {/* bolder inner orbit — the visible track */}
        <ellipse
          cx="16"
          cy="16"
          rx="8.6"
          ry="5.8"
          fill="none"
          stroke="url(#bm-orb)"
          strokeWidth="1.4"
          strokeOpacity="0.95"
          transform="rotate(-22 16 16)"
        />

        {/* focal satellite with strong glow — the anchor */}
        <circle cx="25.2" cy="20.6" r="2.2" fill="url(#bm-spark)" />
        <circle cx="25.2" cy="20.6" r="1.1" fill="#ffffff" />

        {/* secondary satellite, muted */}
        <circle cx="6.8" cy="11.4" r="1.1" fill="#a5b4fc" />

        {/* monogram — solid white, bold, large */}
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontWeight="800"
          fontSize="11"
          letterSpacing="-0.6"
          fill="#ffffff"
        >
          DK
        </text>
      </svg>
    </span>
  );
}

function AppHeader({
  route,
  navigate,
}: {
  route: string;
  navigate: (path: string) => void;
}) {
  return (
    <header className="header">
      <button className="brand" onClick={() => navigate("/")} aria-label="Về trang chủ">
        <BrandMark />
        <span>
          <b>Discord Knowledge Hub</b>
          <small>Kho tri thức khóa học AI</small>
        </span>
      </button>
      <nav>
        <button className={route === "home" || route === "search" ? "active" : ""} onClick={() => navigate("/")}>
          Tìm kiếm
        </button>
        <button className={route === "resources" ? "active" : ""} onClick={() => navigate("/resources")}>
          Kho tài liệu
        </button>
        <button className={route === "realtime" ? "active" : ""} onClick={() => window.location.assign("/realtime")}>
          ⚡ Realtime
        </button>
        <button className={route === "demo" ? "active" : ""} onClick={() => window.location.assign("/demo")}>
          🧪 Demo ingest
        </button>
        <button className={route === "labcoach" ? "active" : ""} onClick={() => navigate("/labcoach")}>
          📋 LabCoach
        </button>
      </nav>
      <span className="cp-badge">
        LabCoach Tracker
      </span>
    </header>
  );
}

function SearchBar({
  initial = "",
  onSearch,
  compact = false,
}: {
  initial?: string;
  onSearch: (query: string) => void;
  compact?: boolean;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim().length >= 3) onSearch(value.trim());
  };
  return (
    <form className={`search-bar ${compact ? "compact" : ""}`} onSubmit={submit}>
      <span className="search-icon">🔍</span>
      <input
        aria-label="Nhu cầu tìm kiếm"
        value={value}
        maxLength={300}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ví dụ: Tìm slide hướng dẫn Hackathon và cách tính điểm"
      />
      <button disabled={value.trim().length < 3}>
        Tìm tài liệu <span>→</span>
      </button>
    </form>
  );
}

function FilterPanel({
  filters,
  setFilters,
  showRelevance = true,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  showRelevance?: boolean;
}) {
  const update = (key: keyof Filters, value: string) =>
    setFilters({ ...filters, [key]: value });
  return (
    <aside className="filters">
      <div className="filter-head">
        <h3>Bộ lọc thông minh</h3>
        <button onClick={() => setFilters(defaultFilters)}>Xóa bộ lọc</button>
      </div>
      <label>
        Loại tài liệu
        <select value={filters.type} onChange={(event) => update("type", event.target.value)}>
          <option value="all">Tất cả loại tài liệu</option>
          {Object.entries(typeLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Chủ đề bài học
        <select value={filters.topic} onChange={(event) => update("topic", event.target.value)}>
          <option value="all">Tất cả chủ đề</option>
          {MAIN_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </label>
      <label>
        Kênh Discord nguồn
        <select value={filters.channel} onChange={(event) => update("channel", event.target.value)}>
          <option value="all">Tất cả các kênh</option>
          {(() => {
            const split = (raw: string) => {
              const parts = raw.split(" - ");
              return parts.length >= 2
                ? { category: parts[0].trim(), channel: parts.slice(1).join(" - ").trim() }
                : { category: raw.trim(), channel: raw.trim() };
            };
            const groups = new Map<string, Set<string>>();
            resources.forEach((resource) => {
              const { category, channel } = split(resource.sourceChannel);
              if (!groups.has(category)) groups.set(category, new Set());
              groups.get(category)!.add(channel);
            });
            const collator = new Intl.Collator("vi", { sensitivity: "base", numeric: true });
            return [...groups.entries()]
              .sort(([a], [b]) => collator.compare(a, b))
              .map(([category, channels]) => {
                const channelList = [...channels].sort(collator.compare);
                const single = channelList.length === 1 && channelList[0] === category;
                return (
                  <optgroup key={category} label={category}>
                    {channelList.map((channel) => {
                      const value = single ? category : `${category} - ${channel}`;
                      const label = single ? channel : channel;
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </optgroup>
                );
              });
          })()}
        </select>
      </label>
      <label>
        Thứ tự sắp xếp
        <select value={filters.sortBy} onChange={(event) => update("sortBy", event.target.value)}>
          {showRelevance && <option value="relevance">Độ phù hợp (AI Score)</option>}
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="title">Tên A–Z</option>
        </select>
      </label>
    </aside>
  );
}

function ResourceCard({
  resource,
  onDetail,
  onSource,
}: {
  resource: Resource;
  onDetail: () => void;
  onSource: () => void;
}) {
  return (
    <article className="resource-card">
      <div className="card-top">
        <span className={`type-icon ${resource.type}`}>{typeIcons[resource.type]}</span>
        <span className="type-label">{typeLabels[resource.type]}</span>
        {resource.isOfficial && <span className="official">👑 Nguồn chính thức</span>}
        {resource.relevanceScore !== undefined && (
          <span className="relevance">{resource.relevanceScore}% khớp</span>
        )}
      </div>
      <h3>{resource.title}</h3>
      <p>{resource.summary}</p>
      {resource.matchReason && <p className="match-reason">💡 {resource.matchReason}</p>}
      <div className="tags">
        {resource.tags.slice(0, 3).map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <div className="meta">
        <span>#{resource.sourceChannel}</span>
        <span>•</span>
        <span>{new Date(resource.sharedAt).toLocaleDateString("vi-VN")}</span>
        {resource.version && (
          <>
            <span>•</span>
            <span>v{resource.version}</span>
          </>
        )}
      </div>
      <div className="card-actions">
        <button className="primary" onClick={onDetail}>
          Xem chi tiết
        </button>
        <button className="secondary" onClick={onSource}>
          Mở nguồn Discord ↗
        </button>
      </div>
    </article>
  );
}

function SearchNotice({
  status,
  clarification,
  options,
  traceId,
  onClarify,
}: {
  status: SearchStatus;
  clarification?: string;
  options?: ClarificationOption[];
  traceId: string;
  onClarify: (query: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  if (status === "success") return null;
  if (status === "needs_clarification") {
    const submit = (event: FormEvent) => {
      event.preventDefault();
      if (answer.trim().length >= 2) onClarify(answer.trim());
    };
    return (
      <section className="clarification-card" aria-live="polite">
        <div className="conversation-line user-line">
          <span>Yêu cầu của bạn</span>
          <p>Yêu cầu này cần thêm chi tiết trước khi hệ thống xếp hạng tài liệu.</p>
        </div>
        <div className="conversation-line assistant-line">
          <span>🤖 Trợ lý AI</span>
          <div>
            <b>Mình cần xác nhận lại một chi tiết</b>
            <p>{clarification}</p>
            {options?.length ? (
              <div className="clarification-options">
                {options.map((option) => (
                  <button
                    key={`${option.label}-${option.query}`}
                    type="button"
                    onClick={() => onClarify(option.query)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            <form className="clarification-reply" onSubmit={submit}>
              <input
                aria-label="Trả lời câu hỏi làm rõ"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Hoặc nhập chi tiết cụ thể bạn đang tìm..."
              />
              <button disabled={answer.trim().length < 2}>Gửi phản hồi</button>
            </form>
          </div>
        </div>
        <small>Chưa chọn tài liệu • Trace ID: {traceId.slice(0, 8)}</small>
      </section>
    );
  }
  // fallback: kết quả vẫn hiển thị, không cần show notice
  if (status === "fallback") return null;
  const copy = {
    low_confidence: ["Hệ thống chưa đủ chắc chắn với truy vấn này", clarification],
    no_match: ["Không tìm thấy tài liệu phù hợp", "Hãy thử mô tả lại nhu cầu hoặc thay đổi từ khóa."],
    rejected: ["Yêu cầu nằm ngoài phạm vi hỗ trợ", clarification],
  }[status];
  return (
    <div className={`search-notice ${status}`} role="status">
      <div>
        <b>{copy?.[0]}</b>
        <p>{copy?.[1]}</p>
      </div>
      <small>Trace ID: {traceId.slice(0, 8)}</small>
    </div>
  );
}

function EmptyState({
  clear,
  navigate,
}: {
  clear: () => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">🔎</div>
      <h2>Chưa tìm thấy tài liệu phù hợp</h2>
      <p>Hãy thử mô tả khác đi, bỏ bớt điều kiện lọc hoặc xem tất cả tài liệu trong kho.</p>
      <div>
        <button className="primary" onClick={clear}>
          Xóa bộ lọc & thử lại
        </button>
        <button className="secondary" onClick={() => navigate("/resources")}>
          Xem toàn bộ kho tài liệu
        </button>
      </div>
    </div>
  );
}

function Drawer({
  resource,
  query,
  onClose,
  onToast,
}: {
  resource: Resource;
  query: string;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const key = `feedback:${resource.id}:${normalizeText(query)}`;
  const [sent, setSent] = useState(false);
  useEffect(() => {
    setSent(Boolean(localStorage.getItem(key)));
    const escape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [key, onClose]);
  const feedback = (helpful: boolean) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        resourceId: resource.id,
        query,
        helpful,
        createdAt: new Date().toISOString(),
      })
    );
    setSent(true);
    onToast("Cảm ơn bạn! Phản hồi đã được lưu lại.");
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(resource.source.messageUrl || resource.sourceUrl);
    onToast("Đã sao chép liên kết tài liệu!");
  };
  return (
    <div
      className="drawer-wrap"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Chi tiết ${resource.title}`}>
        <div className="drawer-body">
        <div className="drawer-top">
          <span className="type-label">{typeLabels[resource.type]}</span>
          <button className="close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <h2>{resource.title}</h2>
        <p className="drawer-summary">{resource.summary}</p>
        <section>
          <h4>Thông tin chi tiết</h4>
          <dl>
            <div>
              <dt>Chủ đề bài học</dt>
              <dd>{resource.topic}</dd>
            </div>
            <div>
              <dt>Kênh Discord gốc</dt>
              <dd>#{resource.sourceChannel}</dd>
            </div>
            <div>
              <dt>Người chia sẻ</dt>
              <dd>{resource.sharedBy}</dd>
            </div>
            <div>
              <dt>Nguồn gốc</dt>
              <dd>{resource.isOfficial ? "Chính thức" : "Cộng đồng"}</dd>
            </div>
            <div>
              <dt>Ngày đăng</dt>
              <dd>{new Date(resource.sharedAt).toLocaleDateString("vi-VN")}</dd>
            </div>
          </dl>
        </section>
        {resource.matchReason && (
          <section className="reason">
            <h4>Vì sao tài liệu này phù hợp?</h4>
            <p>{resource.matchReason}</p>
            {resource.matchedFields?.length ? (
              <small>Khớp các trường: {resource.matchedFields.join(", ")}</small>
            ) : null}
          </section>
        )}
        <section>
          <h4>Thẻ tìm kiếm (Tags)</h4>
          <div className="tags">
            {resource.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <p className="url">{resource.sourceUrl.replace("https://", "")}</p>
        </section>
        <section className="feedback">
          <h4>Tài liệu này có đúng nhu cầu của bạn không?</h4>
          <div>
            <button disabled={sent} onClick={() => feedback(true)}>
              👍 Đúng tài liệu
            </button>
            <button disabled={sent} onClick={() => feedback(false)}>
              👎 Chưa phù hợp
            </button>
          </div>
          {sent && <small>Đã lưu phản hồi của bạn để cải thiện mô hình AI.</small>}
        </section>
        </div>
        <div className="drawer-footer">
        <div className="drawer-actions">
          <button
            className="primary"
            onClick={() => window.open(resource.source.messageUrl || resource.sourceUrl, "_blank")}
          >
            Mở nguồn Discord ↗
          </button>
          <button className="secondary" onClick={copy}>
            Sao chép link
          </button>
        </div>
        </div>
      </aside>
    </div>
  );
}

function Home({ search }: { search: (query: string) => void }) {
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">✨ TRỢ LÝ AI TRUY VẤN TÀI LIỆU DISCORD</div>
        <h1>
          Tra cứu tài liệu Discord<br />
          <span className="gradient-text">tức thì, chính xác</span>
        </h1>
        <p>
          Nhập điều bạn đang cần bằng ngôn ngữ tự nhiên. Hệ thống xếp hạng các tài liệu trong kho Discord và luôn hiển thị rõ nguồn gốc trước khi mở.
        </p>
        <SearchBar onSearch={search} />
        <div className="suggestions">
          <b>Thử tìm nhanh:</b>
          {suggestions.map((query) => (
            <button key={query} onClick={() => search(query)}>
              {query} <span>↗</span>
            </button>
          ))}
        </div>
        <div className="stats">
          <div>
            <b>{resources.length}</b>
            <span>Tài liệu Discord</span>
          </div>
          <div>
            <b>{new Set(resources.map((r) => r.sourceChannel)).size}</b>
            <span>Kênh Discord</span>
          </div>
          <div>
            <b>Top 5</b>
            <span>Kết quả AI xếp hạng</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  const [route, setRoute] = useState<"home" | "search" | "resources">("home");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [toast, setToast] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);

  const syncRoute = useCallback(() => {
    const currentPath = location.pathname;
    setRoute(currentPath === "/resources" ? "resources" : currentPath === "/search" ? "search" : "home");
    setQuery(new URLSearchParams(location.search).get("q") || "");
    setFilters(defaultFilters);
    setSelected(null);
  }, []);

  const navigate = useCallback(
    (nextPath: string) => {
      history.pushState({}, "", nextPath);
      syncRoute();
    },
    [syncRoute]
  );

  useEffect(() => {
    syncRoute();
    addEventListener("popstate", syncRoute);
    return () => removeEventListener("popstate", syncRoute);
  }, [syncRoute]);

  // Khi query/route/filters đổi → gọi lại API để server-side ranking + filter.
  // filters chỉ gửi 3 chiều (type/topic/channel) vì sortBy là client-side.
  // Lưu ý: nếu filter ra rỗng, API trả về status="no_match" với message rõ ràng.
  const filterKeys = useMemo(
    () => ({ type: filters.type, topic: filters.topic, channel: filters.channel }),
    [filters.type, filters.topic, filters.channel],
  );
  useEffect(() => {
    if (route !== "search") return;
    if (!query) {
      navigate("/");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const startedAt = Date.now();
    fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, filters: filterKeys }),
      signal: controller.signal,
    })
      .then(async (result) => {
        if (!result.ok) {
          let detail = "";
          try {
            detail = JSON.stringify(await result.json());
          } catch {
            // ignore
          }
          throw new Error(`Search request failed (${result.status}) ${detail}`);
        }
        return result.json() as Promise<SearchResponse>;
      })
      .then((result) => setResponse(result))
      .catch((error) => {
        // Abort do đổi filter nhanh không phải lỗi — bỏ qua để tránh
        // đè response thật bằng fallback rỗng.
        if (error?.name === "AbortError") return;
        const traceId = crypto.randomUUID();
        setResponse({
          status: "fallback",
          interpretedNeed: query,
          clarification: `Tạm thời chưa kết nối được máy chủ xếp hạng (${error?.message || "lỗi mạng"}); đang dùng tìm kiếm cơ bản.`,
          results: fallbackRank(query, filterResources(resources, filterKeys)),
          traceId,
        });
      })
      .finally(() => {
        const remaining = Math.max(0, 500 - (Date.now() - startedAt));
        setTimeout(() => setLoading(false), remaining);
      });
    return () => controller.abort();
  }, [navigate, query, route, filterKeys]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const performSearch = (nextQuery: string) => {
    setQuery(nextQuery);
    history.pushState({}, "", `/search?q=${encodeURIComponent(nextQuery)}`);
    setRoute("search");
    setFilters(defaultFilters);
  };

  // Khi user clarify, ghép truy vấn cũ + câu trả lời thành query hoàn chỉnh
  // để Gemini/candidate-provider có đủ ngữ cảnh. Ví dụ:
  // query="tài liệu ngày 29/7" (broad_query) + answer="AI" → "tài liệu ngày 29/7 AI"
  // Tránh ghép trùng khi answer đã chứa sẵn keyword của query cũ.
  const clarifyAnswer = (answer: string) => {
    const trimmed = answer.trim();
    if (!trimmed) return;
    const prev = query.trim();
    const lowerPrev = normalizeForCompare(prev);
    const lowerAnswer = normalizeForCompare(trimmed);
    const isAlreadyContained =
      lowerPrev && lowerAnswer && lowerPrev.includes(lowerAnswer);
    const composite = isAlreadyContained
      ? prev
      : prev
        ? `${prev} ${trimmed}`
        : trimmed;
    performSearch(composite);
  };

  function normalizeForCompare(value: string): string {
    return normalizeText(value).replace(/\s+/g, " ").trim();
  }

  const searchResources = useMemo<Resource[]>(() => {
    if (!response) return [];
    return response.results.flatMap((result) => {
      const resource = resourceById.get(result.resourceId);
      return resource
        ? [
            {
              ...resource,
              relevanceScore: result.matchScore,
              matchReason: result.matchReason,
              matchedFields: result.matchedFields,
            } satisfies Resource,
          ]
        : [];
    });
  }, [response]);

  const base = route === "search" ? searchResources : resources;
  const shown = useMemo(() => {
    const list = base.filter(
      (resource) =>
        (filters.type === "all" || resource.type === filters.type) &&
        (filters.topic === "all" || getMainTopic(resource.topic) === filters.topic) &&
        (filters.channel === "all" || resource.sourceChannel === filters.channel)
    );
    return [...list].sort((a, b) =>
      filters.sortBy === "newest"
        ? b.sharedAt.localeCompare(a.sharedAt)
        : filters.sortBy === "oldest"
        ? a.sharedAt.localeCompare(b.sharedAt)
        : filters.sortBy === "title"
        ? a.title.localeCompare(b.title, "vi")
        : (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
    );
  }, [base, filters]);
  const activeCount = [filters.type, filters.topic, filters.channel].filter((value) => value !== "all").length;

  return (
    <>
      <AppHeader route={route} navigate={navigate} />
      {route === "home" ? (
        <Home search={performSearch} />
      ) : (
        <main className="listing">
          <div className="page-title">
            <span className="eyebrow">{route === "search" ? "📋 KẾT QUẢ TÌM KIẾM" : "📚 THƯ VIỆN KHÓA HỌC"}</span>
            <h1>{route === "search" ? "Tài liệu phù hợp với nhu cầu của bạn" : "Kho tài liệu Discord"}</h1>
            <p>
              {route === "search" ? (
                <>
                  Kết quả xếp hạng ngữ nghĩa cho nhu cầu: “<b>{query}</b>”
                </>
              ) : (
                `Tất cả ${resources.length} tài liệu đã được tự động phân loại và chỉ mục từ Discord.`
              )}
            </p>
            {route === "search" && <SearchBar initial={query} onSearch={performSearch} compact />}
          </div>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <h2>Đang phân tích & xếp hạng tài liệu…</h2>
              <p>Hệ thống AI đang đối chiếu nhu cầu của bạn với cơ sở kiến thức.</p>
              <div className="skeletons">
                {[1, 2, 3].map((index) => (
                  <div className="skeleton" key={index}></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {route === "search" && response && (
                <SearchNotice
                  status={response.status}
                  clarification={response.clarification}
                  options={response.clarificationOptions}
                  traceId={response.traceId}
                  // Chỉ ghép khi status = needs_clarification. Các status khác
                  // (no_match, low_confidence, rejected) không cần ghép vì user
                  // đang refine theo hướng khác, không phải trả lời câu hỏi.
                  onClarify={
                    response.status === "needs_clarification"
                      ? clarifyAnswer
                      : performSearch
                  }
                />
              )}
              {response?.status !== "needs_clarification" && response?.status !== "rejected" && (
                <div className="results-layout">
                  <FilterPanel filters={filters} setFilters={setFilters} showRelevance={route === "search"} />
                  <section className="results">
                    <div className="results-head">
                      <div>
                        <b>{shown.length} tài liệu</b>
                        {activeCount > 0 && <span>{activeCount} bộ lọc đang chọn</span>}
                      </div>
                      <small>
                        {route === "search"
                          ? "Top 5 kết quả phù hợp nhất"
                          : "Dữ liệu khóa học Discord"}
                      </small>
                    </div>
                    {shown.length ? (
                      <div className={route === "resources" ? "resource-grid" : ""}>
                        {shown.map((resource) => (
                          <ResourceCard
                            key={resource.id}
                            resource={resource}
                            onDetail={() => setSelected(resource)}
                            onSource={() =>
                              window.open(resource.source.messageUrl || resource.sourceUrl, "_blank")
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState clear={() => setFilters(defaultFilters)} navigate={navigate} />
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </main>
      )}
      {selected && (
        <Drawer
          resource={selected}
          query={query || "Kho tài liệu"}
          onClose={() => setSelected(null)}
          onToast={setToast}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          ✓ {toast}
        </div>
      )}
      <footer>
        <span>Discord Knowledge Hub • Batch 03</span>
        <small>AI Semantic Ranking • Luôn trích dẫn nguồn Discord kèm kết quả</small>
      </footer>
    </>
  );
}

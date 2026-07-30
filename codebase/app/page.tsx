"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { resourceById, resources } from "./data/resources";
import { fallbackRank, normalizeText } from "./lib/search";
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
  slide: "Slide",
  video: "Video",
  github: "GitHub/Code",
  lab: "Bài lab",
  announcement: "Thông báo",
  guide: "Tài liệu hướng dẫn",
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
  "Slide hướng dẫn làm Hackathon",
  "Code mẫu gọi OpenAI API",
  "Quy định tính điểm XP",
  "Link workshop Prompt Engineering",
];
const defaultFilters: Filters = {
  type: "all",
  topic: "all",
  channel: "all",
  sortBy: "relevance",
};

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
        <span className="brand-mark">⌕</span>
        <span><b>Discord Knowledge Hub</b><small>Kho tri thức khóa học</small></span>
      </button>
      <nav>
        <button className={route === "home" || route === "search" ? "active" : ""} onClick={() => navigate("/")}>Tìm kiếm</button>
        <button className={route === "resources" ? "active" : ""} onClick={() => navigate("/resources")}>Kho tài liệu</button>
      </nav>
      <span className="cp-badge">AI Ranking • CP3</span>
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
      <span className="search-icon">⌕</span>
      <input
        aria-label="Nhu cầu tìm kiếm"
        value={value}
        maxLength={300}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ví dụ: Tìm slide hướng dẫn Hackathon và cách tính điểm"
      />
      <button disabled={value.trim().length < 3}>Tìm tài liệu <span>→</span></button>
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
        <h3>Bộ lọc</h3>
        <button onClick={() => setFilters(defaultFilters)}>Xóa tất cả</button>
      </div>
      <label>Loại tài liệu
        <select value={filters.type} onChange={(event) => update("type", event.target.value)}>
          <option value="all">Tất cả loại</option>
          {Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label>Chủ đề
        <select value={filters.topic} onChange={(event) => update("topic", event.target.value)}>
          <option value="all">Tất cả chủ đề</option>
          {[...new Set(resources.map((resource) => resource.topic))].map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label>Kênh nguồn
        <select value={filters.channel} onChange={(event) => update("channel", event.target.value)}>
          <option value="all">Tất cả kênh</option>
          {[...new Set(resources.map((resource) => resource.sourceChannel))].map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label>Sắp xếp
        <select value={filters.sortBy} onChange={(event) => update("sortBy", event.target.value)}>
          {showRelevance && <option value="relevance">Phù hợp nhất</option>}
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="title">A–Z</option>
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
        {resource.isOfficial && <span className="official">Nguồn chính thức</span>}
        {resource.relevanceScore !== undefined && (
          <span className="relevance">{resource.relevanceScore}% độ khớp ước tính</span>
        )}
      </div>
      <h3>{resource.title}</h3>
      <p>{resource.summary}</p>
      {resource.matchReason && <p className="match-reason">{resource.matchReason}</p>}
      <div className="tags">{resource.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="meta">
        <span>{resource.sourceChannel}</span><span>•</span>
        <span>{new Date(resource.sharedAt).toLocaleDateString("vi-VN")}</span>
        {resource.version && <><span>•</span><span>v{resource.version}</span></>}
      </div>
      <div className="card-actions">
        <button className="primary" onClick={onDetail}>Xem chi tiết</button>
        <button className="secondary" onClick={onSource}>Mở nguồn ↗</button>
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
          <span>Bạn</span>
          <p>Yêu cầu này cần được làm rõ trước khi tìm.</p>
        </div>
        <div className="conversation-line assistant-line">
          <span>Trợ lý tìm kiếm</span>
          <div>
            <b>Mình cần bạn xác nhận một chi tiết</b>
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
                placeholder="Hoặc nhập chủ đề/tài liệu cụ thể…"
              />
              <button disabled={answer.trim().length < 2}>Tiếp tục tìm</button>
            </form>
          </div>
        </div>
        <small>Chưa có tài liệu nào được chọn • Trace: {traceId.slice(0, 8)}</small>
      </section>
    );
  }
  const copy = {
    fallback: ["Tìm kiếm cơ bản đang được sử dụng", clarification],
    low_confidence: ["Hệ thống chưa đủ chắc chắn", clarification],
    no_match: ["Không có kết quả đủ căn cứ", "Hãy thử thêm chủ đề, loại tài liệu hoặc thời gian chia sẻ."],
    rejected: ["Yêu cầu nằm ngoài phạm vi", clarification],
  }[status];
  return (
    <div className={`search-notice ${status}`} role="status">
      <div><b>{copy?.[0]}</b><p>{copy?.[1]}</p></div>
      <small>Trace: {traceId.slice(0, 8)}</small>
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
      <div className="empty-icon">⌕</div>
      <h2>Chưa tìm thấy tài liệu phù hợp</h2>
      <p>Hãy thử mô tả ngắn hơn, thêm chủ đề hoặc xóa bộ lọc.</p>
      <div>
        <button className="primary" onClick={clear}>Xóa bộ lọc và thử lại</button>
        <button className="secondary" onClick={() => navigate("/resources")}>Xem toàn bộ kho tài liệu</button>
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
    localStorage.setItem(key, JSON.stringify({
      resourceId: resource.id,
      query,
      helpful,
      createdAt: new Date().toISOString(),
    }));
    setSent(true);
    onToast("Cảm ơn bạn! Phản hồi đã được ghi nhận.");
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(resource.source.messageUrl || resource.sourceUrl);
    onToast("Đã sao chép link tài liệu.");
  };
  return (
    <div className="drawer-wrap" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Chi tiết ${resource.title}`}>
        <div className="drawer-top">
          <span className="type-label">{typeLabels[resource.type]}</span>
          <button className="close" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <h2>{resource.title}</h2>
        <p className="drawer-summary">{resource.summary}</p>
        <section>
          <h4>Thông tin tài liệu</h4>
          <dl>
            <div><dt>Chủ đề</dt><dd>{resource.topic}</dd></div>
            <div><dt>Kênh nguồn</dt><dd>{resource.sourceChannel}</dd></div>
            <div><dt>Người chia sẻ</dt><dd>{resource.sharedBy}</dd></div>
            <div><dt>Nguồn</dt><dd>{resource.isOfficial ? "Chính thức" : "Cộng đồng"}</dd></div>
            <div><dt>Ngày chia sẻ</dt><dd>{new Date(resource.sharedAt).toLocaleDateString("vi-VN")}</dd></div>
          </dl>
        </section>
        {resource.matchReason && (
          <section className="reason">
            <h4>Vì sao tài liệu này phù hợp?</h4>
            <p>{resource.matchReason}</p>
            {resource.matchedFields?.length ? <small>Khớp theo: {resource.matchedFields.join(", ")}</small> : null}
          </section>
        )}
        <section>
          <h4>Tags</h4>
          <div className="tags">{resource.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <p className="url">{resource.sourceUrl.replace("https://", "")}</p>
        </section>
        <div className="drawer-actions">
          <button className="primary" onClick={() => window.open(resource.source.messageUrl || resource.sourceUrl, "_blank")}>Mở tài liệu gốc ↗</button>
          <button className="secondary" onClick={copy}>Sao chép link</button>
        </div>
        <section className="feedback">
          <h4>Tài liệu này có đúng thứ bạn cần không?</h4>
          <div>
            <button disabled={sent} onClick={() => feedback(true)}>👍 Phù hợp</button>
            <button disabled={sent} onClick={() => feedback(false)}>👎 Không phù hợp</button>
          </div>
          {sent && <small>Phản hồi của bạn đã được ghi nhận.</small>}
        </section>
      </aside>
    </div>
  );
}

function Home({ search }: { search: (query: string) => void }) {
  return (
    <main>
      <section className="hero">
        <div className="eyebrow"><span></span> AI XẾP HẠNG • NGUỒN LUÔN RÕ RÀNG</div>
        <h1>Tìm lại tài liệu Discord<br />mà không cần nhớ <em>nó nằm ở đâu</em></h1>
        <p>Nhập điều bạn đang cần. Hệ thống xếp hạng tài liệu trong kho và luôn cho bạn kiểm tra nguồn gốc trước khi mở.</p>
        <SearchBar onSearch={search} />
        <div className="suggestions">
          <b>Thử tìm nhanh:</b>
          {suggestions.map((query) => <button key={query} onClick={() => search(query)}>{query} <span>↗</span></button>)}
        </div>
        <div className="stats">
          <div><b>{resources.length}</b><span>Tài liệu Discord</span></div>
          <div><b>{new Set(resources.map(r => r.sourceChannel)).size}</b><span>Kênh Discord</span></div>
          <div><b>{new Set(resources.map(r => r.type)).size}</b><span>Loại nội dung</span></div>
          <div><b>Top 5</b><span>Kết quả có nguồn</span></div>
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  // Keep the first server/client render identical; hydrate the actual URL below.
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
  const navigate = useCallback((nextPath: string) => {
    history.pushState({}, "", nextPath);
    syncRoute();
  }, [syncRoute]);

  useEffect(() => {
    syncRoute();
    addEventListener("popstate", syncRoute);
    return () => removeEventListener("popstate", syncRoute);
  }, [syncRoute]);

  useEffect(() => {
    if (route !== "search") return;
    if (!query) {
      navigate("/");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setResponse(null);
    const startedAt = Date.now();
    fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    })
      .then(async (result) => {
        if (!result.ok) throw new Error("Search request failed");
        return result.json() as Promise<SearchResponse>;
      })
      .then((result) => setResponse(result))
      .catch(() => {
        const traceId = crypto.randomUUID();
        setResponse({
          status: "fallback",
          interpretedNeed: query,
          clarification: "Không thể kết nối API; đang dùng tìm kiếm cơ bản ngay trên thiết bị.",
          results: fallbackRank(query, resources),
          traceId,
        });
      })
      .finally(() => {
        const remaining = Math.max(0, 500 - (Date.now() - startedAt));
        setTimeout(() => setLoading(false), remaining);
      });
    return () => controller.abort();
  }, [navigate, query, route]);

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

  const searchResources = useMemo<Resource[]>(() => {
    if (!response) return [];
    return response.results.flatMap((result) => {
        const resource = resourceById.get(result.resourceId);
        return resource ? [{
              ...resource,
              relevanceScore: result.matchScore,
              matchReason: result.matchReason,
              matchedFields: result.matchedFields,
            } satisfies Resource] : [];
      });
  }, [response]);

  const base = route === "search" ? searchResources : resources;
  const shown = useMemo(() => {
    const list = base.filter(
      (resource) =>
        (filters.type === "all" || resource.type === filters.type) &&
        (filters.topic === "all" || resource.topic === filters.topic) &&
        (filters.channel === "all" || resource.sourceChannel === filters.channel),
    );
    return [...list].sort((a, b) =>
      filters.sortBy === "newest"
        ? b.sharedAt.localeCompare(a.sharedAt)
        : filters.sortBy === "oldest"
          ? a.sharedAt.localeCompare(b.sharedAt)
          : filters.sortBy === "title"
            ? a.title.localeCompare(b.title, "vi")
            : (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
    );
  }, [base, filters]);
  const activeCount = [filters.type, filters.topic, filters.channel].filter((value) => value !== "all").length;

  return (
    <>
      <AppHeader route={route} navigate={navigate} />
      {route === "home" ? <Home search={performSearch} /> : (
        <main className="listing">
          <div className="page-title">
            <span className="eyebrow">{route === "search" ? "KẾT QUẢ XẾP HẠNG" : "THƯ VIỆN KHÓA HỌC"}</span>
            <h1>{route === "search" ? "Tài liệu phù hợp với nhu cầu của bạn" : "Kho tài liệu"}</h1>
            <p>{route === "search" ? <>Kết quả cho “<b>{query}</b>”</> : `Tất cả ${resources.length} tài liệu mock đã được phân loại từ các kênh của khóa học.`}</p>
            {route === "search" && <SearchBar initial={query} onSearch={performSearch} compact />}
          </div>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <h2>Đang xếp hạng tài liệu…</h2>
              <p>Hệ thống đang đối chiếu nhu cầu của bạn với các nguồn đã lưu.</p>
              <div className="skeletons">{[1, 2, 3].map((index) => <div className="skeleton" key={index}></div>)}</div>
            </div>
          ) : (
            <>
              {route === "search" && response && (
                <SearchNotice
                  status={response.status}
                  clarification={response.clarification}
                  options={response.clarificationOptions}
                  traceId={response.traceId}
                  onClarify={performSearch}
                />
              )}
              {response?.status !== "needs_clarification" && response?.status !== "rejected" && (
              <div className="results-layout">
                <FilterPanel filters={filters} setFilters={setFilters} showRelevance={route === "search"} />
                <section className="results">
                  <div className="results-head">
                    <div><b>{shown.length} tài liệu</b>{activeCount > 0 && <span>{activeCount} bộ lọc đang dùng</span>}</div>
                    <small>
                      {route === "search"
                        ? `${response?.retrievalMode === "hybrid" ? "Hybrid semantic" : "Tìm kiếm từ khóa"} • tối đa 5 kết quả`
                        : "Dữ liệu từ Discord"}
                    </small>
                  </div>
                  {shown.length ? (
                    <div className={route === "resources" ? "resource-grid" : ""}>
                      {shown.map((resource) => (
                        <ResourceCard
                          key={resource.id}
                          resource={resource}
                          onDetail={() => setSelected(resource)}
                          onSource={() => window.open(resource.source.messageUrl || resource.sourceUrl, "_blank")}
                        />
                      ))}
                    </div>
                  ) : <EmptyState clear={() => setFilters(defaultFilters)} navigate={navigate} />}
                </section>
              </div>
              )}
            </>
          )}
        </main>
      )}
      {selected && <Drawer resource={selected} query={query || "Kho tài liệu"} onClose={() => setSelected(null)} onToast={setToast} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <footer>
        <span>Discord Knowledge Hub</span>
        <small>AI chỉ xếp hạng • Dữ liệu Discord • Nguồn luôn hiển thị</small>
      </footer>
    </>
  );
}


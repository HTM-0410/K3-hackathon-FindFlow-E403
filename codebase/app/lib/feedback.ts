/**
 * Helpers cho Feedback API: validate input, normalize, aggregate.
 *
 * Sử dụng trong các route handlers ở /app/api/feedback và /app/api/traces.
 *
 * Phase 1 scope (đã chốt với user):
 * - POST /api/feedback: validate {resourceId, query, helpful}
 * - POST /api/traces: validate {traceId, query, status, latencyMs}
 * - GET /api/feedback/stats: aggregate theo ngày/resource/status
 *
 * Không bao gồm:
 * - Auth (open endpoint, giống /api/search)
 * - Rate limit (giống /api/search — coi như demo)
 * - Session tracking (để Phase 2)
 */

export const MAX_RESOURCE_ID_LEN = 64;
export const MAX_QUERY_LEN = 500;
export const MAX_TRACE_ID_LEN = 80;
export const MAX_SESSION_ID_LEN = 80;

export const ALLOWED_STATUSES = new Set([
  "success",
  "needs_clarification",
  "rejected",
  "low_confidence",
  "no_match",
  "fallback",
]);

/** Loại bỏ whitespace thừa, lowercase, giữ nguyên dấu tiếng Việt. */
export function normalizeQuery(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/\s+/g, " ").toLowerCase().slice(0, MAX_QUERY_LEN);
}

export interface FeedbackInput {
  resourceId: string;
  normalizedQuery: string;
  helpful: 1 | 0;
  traceId: string;
  retrievalStatus: string;
  sessionId: string;
  matchScore: number;
  createdAt: number;
}

/**
 * Chuẩn hoá payload feedback từ client. Trả về null nếu invalid.
 *
 * Accept: { resourceId, query, helpful: boolean, traceId?, status?, matchScore? }
 */
export function normalizeFeedback(input: unknown): FeedbackInput | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const resourceId = typeof obj.resourceId === "string"
    ? obj.resourceId.trim().slice(0, MAX_RESOURCE_ID_LEN)
    : "";
  if (!resourceId) return null;

  const normalizedQuery = normalizeQuery(obj.query);
  if (!normalizedQuery) return null;

  const helpful = obj.helpful === true || obj.helpful === 1 || obj.helpful === "true" ? 1 : 0;

  const traceId = typeof obj.traceId === "string"
    ? obj.traceId.slice(0, MAX_TRACE_ID_LEN)
    : "";

  const retrievalStatusRaw = typeof obj.status === "string" ? obj.status : "";
  const retrievalStatus = ALLOWED_STATUSES.has(retrievalStatusRaw) ? retrievalStatusRaw : "";

  const sessionId = typeof obj.sessionId === "string"
    ? obj.sessionId.slice(0, MAX_SESSION_ID_LEN)
    : "";

  const matchScoreNum = Number(obj.matchScore);
  const matchScore =
    Number.isFinite(matchScoreNum) && matchScoreNum >= 0 && matchScoreNum <= 100
      ? Math.floor(matchScoreNum)
      : 0;

  return {
    resourceId,
    normalizedQuery,
    helpful: helpful as 1 | 0,
    traceId,
    retrievalStatus,
    sessionId,
    matchScore,
    createdAt: Date.now(),
  };
}

export interface TraceInput {
  traceId: string;
  query: string;
  normalizedQuery: string;
  status: string;
  candidateCount: number;
  retrievalMode: string;
  latencyMs: number;
  createdAt: number;
}

/** Chuẩn hoá payload search_trace từ client. */
export function normalizeTrace(input: unknown): TraceInput | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const traceId = typeof obj.traceId === "string"
    ? obj.traceId.trim().slice(0, MAX_TRACE_ID_LEN)
    : "";
  if (!traceId) return null;

  const query = typeof obj.query === "string" ? obj.query.slice(0, MAX_QUERY_LEN) : "";
  if (!query) return null;

  const normalizedQuery = normalizeQuery(query);

  const statusRaw = typeof obj.status === "string" ? obj.status : "";
  if (!ALLOWED_STATUSES.has(statusRaw)) return null;

  const candidateCountNum = Number(obj.candidateCount);
  const candidateCount =
    Number.isFinite(candidateCountNum) && candidateCountNum >= 0
      ? Math.floor(candidateCountNum)
      : 0;

  const retrievalMode = typeof obj.retrievalMode === "string"
    ? obj.retrievalMode.slice(0, 32)
    : "";

  const latencyMsNum = Number(obj.latencyMs);
  const latencyMs =
    Number.isFinite(latencyMsNum) && latencyMsNum >= 0 && latencyMsNum < 600_000
      ? Math.floor(latencyMsNum)
      : 0;

  return {
    traceId,
    query,
    normalizedQuery,
    status: statusRaw,
    candidateCount,
    retrievalMode,
    latencyMs,
    createdAt: Date.now(),
  };
}

export interface DailyBucket {
  /** YYYY-MM-DD UTC */
  date: string;
  helpful: number;
  unhelpful: number;
  total: number;
  rate: number;
}

export interface ResourceBucket {
  resourceId: string;
  total: number;
  helpful: number;
  unhelpful: number;
  rate: number;
}

export interface StatusBucket {
  status: string;
  total: number;
  helpful: number;
  unhelpful: number;
  rate: number;
}

export interface UnhelpfulQuery {
  normalizedQuery: string;
  count: number;
  resourceIds: string[];
}

export interface FeedbackStats {
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

/** Tính % helpful, làm tròn 1 chữ số. Safe với total=0. */
export function safeRate(helpful: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((helpful / total) * 1000) / 10;
}

/** Format epoch ms → "YYYY-MM-DD" UTC. */
export function dayKeyUtc(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

import type {
  ClarificationOption,
  Resource,
  SearchResponse,
} from "../types/resource";
import { normalizeText } from "./search";

type ClarificationReason = NonNullable<SearchResponse["clarificationReason"]>;
type RejectionReason = NonNullable<SearchResponse["rejectionReason"]>;

export type IntentDecision =
  | { kind: "proceed" }
  | {
      kind: "clarify";
      reason: ClarificationReason;
      question: string;
      options: ClarificationOption[];
    }
  | { kind: "reject"; reason: RejectionReason; message: string };

const typeWords = new Map([
  ["slide", "slide"],
  ["video", "video"],
  ["lab", "lab"],
  ["bai lab", "lab"],
  ["github", "github"],
  ["repository", "github"],
  ["code", "github"],
  ["thong bao", "announcement"],
  ["huong dan", "guide"],
] as const);

const stopwords = new Set([
  "tim", "cho", "minh", "toi", "ve", "mot", "tai", "lieu", "cua",
  "xin", "can", "muon", "xem", "lai", "co", "khong",
]);

export function analyzeSearchIntent(
  query: string,
  catalog: Resource[],
): IntentDecision {
  const normalized = normalizeText(query);

  const rejection = detectRejection(normalized);
  if (rejection) return rejection;

  const multiple = detectMultipleIntents(query);
  if (multiple.length > 1) {
    return {
      kind: "clarify",
      reason: "multiple_intents",
      question:
        "Mình thấy bạn đang tìm nhiều nội dung cùng lúc. Bạn muốn tìm mục nào trước?",
      options: multiple.map((intent) => ({
        label: intent,
        query: intent,
      })),
    };
  }

  if (hasAny(normalized, ["hom qua", "ngay hom qua", "buoi truoc", "hom no", "vua roi", "moi gui"])) {
    return {
      kind: "clarify",
      reason: "ambiguous_time",
      question:
        "“Hôm qua/buổi trước” chưa xác định được mốc thời gian trong dữ liệu. Bạn đang nói tới tài liệu nào?",
      options: resourceOptions(query, catalog),
    };
  }

  if (hasAny(normalized, ["tai lieu do", "cai do", "link do", "file do", "bai do"])) {
    return {
      kind: "clarify",
      reason: "ambiguous_reference",
      question:
        "Mình chưa biết “tài liệu đó” là tài liệu nào. Bạn hãy chọn hoặc nói rõ chủ đề cần tìm.",
      options: resourceOptions(query, catalog),
    };
  }

  const meaningful = normalized
    .split(" ")
    .filter((token) => token.length > 1 && !stopwords.has(token));
  if (
    meaningful.length <= 2 &&
    hasAny(normalized, ["ai", "slide", "video", "lab", "code", "tai lieu"])
  ) {
    return {
      kind: "clarify",
      reason: "broad_query",
      question:
        "Nhu cầu này còn khá rộng. Bạn muốn tài liệu về chủ đề cụ thể nào?",
      options: topicOptions(query, catalog),
    };
  }

  return { kind: "proceed" };
}

export function intentDecisionToResponse(
  decision: Exclude<IntentDecision, { kind: "proceed" }>,
  query: string,
  traceId: string,
): SearchResponse {
  if (decision.kind === "reject") {
    return {
      status: "rejected",
      interpretedNeed: query,
      clarification: decision.message,
      rejectionReason: decision.reason,
      results: [],
      traceId,
    };
  }
  return {
    status: "needs_clarification",
    interpretedNeed: query,
    clarification: decision.question,
    clarificationReason: decision.reason,
    clarificationOptions: decision.options,
    results: [],
    traceId,
  };
}

function detectRejection(normalized: string): Extract<IntentDecision, { kind: "reject" }> | null {
  if (
    hasAny(normalized, [
      "so dien thoai", "dia chi nha", "mat khau", "password",
      "email ca nhan", "thong tin ca nhan",
    ])
  ) {
    return {
      kind: "reject",
      reason: "personal_data",
      message:
        "Mình không hỗ trợ tìm hoặc tiết lộ thông tin cá nhân. Hệ thống chỉ tìm tài liệu học tập đã được lập chỉ mục.",
    };
  }

  const asksDelegation = hasAny(normalized, ["giup toi", "giup minh", "ho toi"]);
  const actionVerb = ["nhan ", "nop ", "gui ", "dang ", "xoa ", "sua ", "goi "]
    .some((term) => normalized.startsWith(term) || normalized.includes(` ${term}`));
  if (asksDelegation && actionVerb) {
    return {
      kind: "reject",
      reason: "unsupported_action",
      message:
        "Mình chỉ có thể tìm tài liệu, không gửi tin nhắn, nộp bài hoặc thực hiện hành động thay bạn.",
    };
  }

  if (
    hasAny(normalized, [
      "nau an", "am thuc", "bong da", "du lich", "chung khoan",
      "thoi tiet", "tu vi", "phim chieu rap", "mua sam",
    ])
  ) {
    return {
      kind: "reject",
      reason: "unrelated",
      message:
        "Yêu cầu này không liên quan đến kho tài liệu khóa AI Thực Chiến. Mình chỉ hỗ trợ tìm tài liệu học tập, Hackathon, lab và quy định khóa học.",
    };
  }
  return null;
}

function detectMultipleIntents(query: string): string[] {
  const normalized = normalizeText(query);
  const segments = normalized
    .split(/\s+(?:va|kem|dong thoi)\s+|[,;]/)
    .map((segment) => segment.trim())
    .filter((segment) => contentTokens(segment).length >= 2);
  if (segments.length < 2 || segments.length > 3) return [];

  const segmentTypes = segments.map(findType);
  const distinctTypes = new Set(segmentTypes.filter(Boolean));
  const segmentDomains = segments.map(domainGroups);
  const hasDistinctDomains = segmentDomains.some((groups, index) =>
    segmentDomains.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        groups.size > 0 &&
        other.size > 0 &&
        ![...groups].some((group) => other.has(group)),
    )
  );

  if (distinctTypes.size < 2 && !hasDistinctDomains) return [];
  return segments.map((segment) => humanizeIntent(segment));
}

function resourceOptions(query: string, catalog: Resource[]): ClarificationOption[] {
  const normalized = normalizeText(query);
  const requestedType = findType(normalized);
  const filtered = requestedType
    ? catalog.filter((resource) => resource.type === requestedType)
    : catalog;
  return [...filtered]
    .filter((resource) => resource.status === "published")
    .sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
    .slice(0, 3)
    .map((resource) => ({
      label: resource.title,
      query: resource.title,
      resourceId: resource.id,
    }));
}

function topicOptions(query: string, catalog: Resource[]): ClarificationOption[] {
  const requestedType = findType(normalizeText(query));
  const pool = requestedType
    ? catalog.filter((resource) => resource.type === requestedType)
    : catalog;
  const topics = [...new Set(
    [...pool]
      .sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
      .map((resource) => resource.topic),
  )].slice(0, 4);
  return topics.map((topic) => ({
    label: topic,
    query: `${requestedType ? `${requestedType} ` : "tài liệu "}${topic}`,
  }));
}

function findType(normalized: string): Resource["type"] | undefined {
  for (const [word, type] of typeWords) {
    if (normalized.includes(word)) return type;
  }
  return undefined;
}

function domainGroups(segment: string): Set<string> {
  const groups = new Set<string>();
  const patterns: Record<string, string[]> = {
    hackathon: ["hackathon", "venture", "cp1", "cp2", "cp3"],
    scoring: ["diem", "xp", "rubric", "cham"],
    code: ["code", "github", "repository", "api", "python", "typescript"],
    prompt: ["prompt", "few shot", "draft", "critique"],
    evaluation: ["golden set", "danh gia", "eval", "quality"],
    schedule: ["deadline", "han nop", "lich", "office hour"],
    foundation: ["foundation", "transformer", "attention", "llm"],
    privacy: ["privacy", "pii", "bao mat"],
    design: ["hax", "ux", "product design"],
  };
  for (const [group, words] of Object.entries(patterns)) {
    if (words.some((word) => segment.includes(word))) groups.add(group);
  }
  return groups;
}

function contentTokens(segment: string): string[] {
  return segment
    .split(" ")
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

function humanizeIntent(segment: string): string {
  const value = segment.charAt(0).toUpperCase() + segment.slice(1);
  return value.replace(/\bcp(\d)\b/g, "CP$1");
}

function hasAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

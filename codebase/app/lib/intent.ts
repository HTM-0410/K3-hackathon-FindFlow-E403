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

// Từ khóa loại tài liệu
const typeWords = new Map([
  ["slide", "slide"],
  ["video", "video"],
  ["lab", "lab"],
  ["bai lab", "lab"],
  ["github", "github"],
  ["repo", "github"],
  ["repository", "github"],
  ["code", "github"],
  ["thong bao", "announcement"],
  ["thông báo", "announcement"],
  ["huong dan", "guide"],
  ["hướng dẫn", "guide"],
  ["tài liệu", "guide"],
] as const);

// Stopwords để lọc query
const stopwords = new Set([
  "tim", "tìm", "cho", "minh", "mình", "toi", "tôi", "ve", "về", "mot", "một", 
  "tai", "lieu", "cua", "của", "xin", "can", "cần", "muon", "muốn", "xem", "lai", "lại", 
  "co", "có", "khong", "không", "voi", "với", "theo", "ve", "về"
]);

export function analyzeSearchIntent(
  query: string,
  catalog: Resource[],
): IntentDecision {
  const normalized = normalizeText(query);

  // 1. Kiểm tra rejection trước
  const rejection = detectRejection(normalized);
  if (rejection) return rejection;

  // 2. Kiểm tra multiple intents
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

  // 3. Kiểm tra ambiguous time
  if (hasAny(normalized, [
    "hom qua", "ngay hom qua", "buoi truoc", "hom no", "vua roi",
    "moi gui", "hom nay", "ngay nay", "tuan truoc"
  ])) {
    return {
      kind: "clarify",
      reason: "ambiguous_time",
      question:
        "Mình chưa xác định được thời gian bạn đề cập. Bạn có thể nói rõ chủ đề tài liệu cần tìm không?",
      options: resourceOptions(query, catalog),
    };
  }

  // 4. Kiểm tra ambiguous reference (đại từ chỉ định)
  if (hasAmbiguousReference(normalized)) {
    return {
      kind: "clarify",
      reason: "ambiguous_reference",
      question:
        "Mình chưa biết bạn đang nói đến tài liệu nào. Bạn hãy mô tả chủ đề hoặc tên tài liệu cụ thể hơn nhé?",
      options: resourceOptions(query, catalog),
    };
  }

  // 5. Kiểm tra broad query (query không có chủ đề cụ thể).
  // Cách đếm: bỏ stopword + bỏ token là TYPE_WORDS (type word mơ hồ: "slide",
  // "video", "tool", "tai lieu", "github"...) + bỏ từ chỉ thời gian.
  // Lưu ý: "code", "lab" KHÔNG nằm TYPE_WORDS vì "lab 04", "code RAG" là chủ đề
  // rõ ràng — user đang tìm nội dung cụ thể.
  // Sau đó kiểm tra còn chủ đề không: acronym ngắn ("ai", "rag", "llm"...),
  // từ dài >= 4 ký tự có chữ cái, hoặc identifier số ngắn ("04", "k3", "1").
  // Ví dụ:
  //   "tài liệu ngày 29/7" → ["29/7"] = 0 chủ đề → BROAD
  //   "Về AI" → ["ai"] = acronym → PROCEED
  //   "slide AI" → ["ai"] = acronym → PROCEED
  //   "tài liệu ngày 29/7 Về AI" → ["29/7", "ai"] = có "ai" → PROCEED
  //   "tài liệu về RAG" → ["rag"] = acronym → PROCEED
  //   "tài liệu về prompt engineering" → ["prompt", "engineering"] → PROCEED
  //   "slide hôm nay" → [] → BROAD
  //   "Repo code lab 04" → ["code", "lab", "04"] = identifier số → PROCEED
  //   "code RAG" → ["code", "rag"] = acronym → PROCEED
  //   "tài liệu" → [] → BROAD
  const TYPE_WORDS = new Set([
    "tai", "lieu", "tai lieu", "slide", "video",
    "github", "dataset", "repo", "tool", "cong", "cu", "cong cu",
    "huong", "dan", "huong dan", "bai", "giang", "bai giang",
  ]);
  // "code", "lab" không phải TYPE_WORDS vì "lab 04", "code RAG" là chủ đề rõ ràng.
  // Từ chỉ thời gian (không phải chủ đề cụ thể). Để query "tài liệu ngày 29/7"
  // vẫn bị broad_query vì "ngay" không phải chủ đề.
  const TIME_WORDS = new Set([
    "ngay", "hom", "nay", "qua", "hom nay", "hom qua", "tuan", "thang",
    "nam", "sang", "chieu", "toi", "trua", "gio", "phut", "giay",
    "thu", "bay", "cn", "thu bay", "truoc", "sau", "truoc day",
  ]);
  const meaningful = normalized
    .split(" ")
    .filter((token) => token.length > 1 && !stopwords.has(token))
    .filter((token) => !TYPE_WORDS.has(token))
    .filter((token) => !TIME_WORDS.has(token))

  // Token chủ đề: chuỗi từ có chữ cái và ĐỦ DÀI (>= 4 ký tự) HOẶC là
  // acronym ngắn phổ biến trong domain ("ai", "ml", "rag", "llm", "nlp"...)
  // HOẶC là identifier số cụ thể ("04", "b3", "k3"...). Các số này thường
  // là mã bài/bài lab/buổi học nên là một chủ đề hợp lệ.
  // Loại bỏ token số thuần không có chữ cái ("29/7", "11") vì không phải chủ đề
  // trừ khi nó ngắn (<= 4 ký tự) và đứng một mình — khi đó coi là mã định danh.
  const DOMAIN_ACRONYMS = new Set([
    "ai", "ml", "dl", "rag", "llm", "nlp", "cv", "rl", "gan", "rlhf",
    "iot", "cv", "ui", "ux", "api", "sdk", "sql", "db", "orm",
  ]);
  const hasTopic = meaningful.some((token) => {
    if (!/[a-z]/i.test(token)) {
      // Token số thuần: là chủ đề nếu là identifier ngắn (vd: "04", "1", "k3")
      // và không phải ngày/tháng (vd: "29/7", "11/2024")
      return /^\d{1,3}$/.test(token);
    }
    if (DOMAIN_ACRONYMS.has(token)) return true;
    return token.length >= 4;
  });

  if (!hasTopic) {
    return {
      kind: "clarify",
      reason: "broad_query",
      question:
        "Mình chưa hiểu rõ nhu cầu của bạn. Bạn muốn tài liệu về chủ đề cụ thể nào?",
      options: topicOptions(query, catalog),
    };
  }

  // Query đủ rõ ràng, tiến hành tìm kiếm
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
  // Kiểm tra thông tin cá nhân
  if (
    hasAny(normalized, [
      "so dien thoai", "số điện thoại", "dia chi", "địa chỉ",
      "mat khau", "mật khẩu", "password", "email ca nhan",
      "email cá nhân", "thong tin ca nhan", "thông tin cá nhân",
      "facebook", "zalo", "số tài khoản"
    ])
  ) {
    return {
      kind: "reject",
      reason: "personal_data",
      message:
        "Mình không hỗ trợ tìm hoặc tiết lộ thông tin cá nhân. Hệ thống chỉ tìm tài liệu học tập đã được lập chỉ mục.",
    };
  }

  // Kiểm tra hành động không được hỗ trợ.
  // Lưu ý: chỉ reject khi user yêu cầu THỰC HIỆN hành động thay họ.
  // Nếu query đồng thời đề cập đến một tài liệu cụ thể (link/tài liệu/file/bài/repo/slide/...),
  // thì "gửi/đăng/nộp ... giúp tôi" có nghĩa là "gửi lại link tài liệu" chứ không phải
  // hành động thay thế — bỏ qua rejection và để các bước intent khác (như ambiguous_reference) xử lý.
  const asksDelegation = hasAny(normalized, ["giup toi", "giúp tôi", "giup minh", "giúp mình", "ho toi", "hộ tôi"]);
  const actionVerb = ["nhan ", "nhắn ", "nop ", "nộp ", "gui ", "gửi ", "dang ", "đăng ", "xoa ", "xóa ", "sua ", "sửa ", "goi ", "gọi "]
    .some((term) => normalized.startsWith(term) || normalized.includes(` ${term}`));
  const referencesDocument = hasAny(normalized, [
    // "tài liệu", "link", "file" là các từ chỉ tài liệu rất rõ ràng — luôn tính là tham chiếu tài liệu.
    "tai lieu", "tài liệu", "link", "file",
    // slide/video/repo/github có thể xuất hiện cạnh action verb mà vẫn là tài liệu.
    "slide", "video", "repo", "repository", "github",
    // CHÚ Ý: KHÔNG thêm "lab", "code", "bai", "bài" đứng riêng — chúng xuất hiện trong
    // ngữ cảnh action như "nộp bài lab giúp tôi" và gây false negative khi reject.
  ]);
  if (asksDelegation && actionVerb && !referencesDocument) {
    return {
      kind: "reject",
      reason: "unsupported_action",
      message:
        "Mình chỉ có thể tìm tài liệu, không gửi tin nhắn, nộp bài hoặc thực hiện hành động thay bạn.",
    };
  }

  // Kiểm tra chủ đề ngoài phạm vi
  if (
    hasAny(normalized, [
      "nau an", "nấu ăn", "am thuc", "ẩm thực", "bong da", "bóng đá",
      "du lich", "du lịch", "chung khoan", "chứng khoán", "thoi tiet", "thời tiết",
      "tu vi", "tử vi", "phim chieu rap", "phim chiếu rạp", "mua sam", "mua sắm",
      "choi game", "chơi game", "am nhac", "âm nhạc", "phim", "sach", "sách"
    ])
  ) {
    return {
      kind: "reject",
      reason: "unrelated",
      message:
        "Yêu cầu này không liên quan đến kho tài liệu khóa AI Thực Chiến. Mình chỉ hỗ trợ tìm tài liệu về AI, lập trình, công cụ coding và các chủ đề liên quan.",
    };
  }
  return null;
}

function detectMultipleIntents(query: string): string[] {
  const normalized = normalizeText(query);

  // Tách query theo các delimiter
  const segments = normalized
    .split(/\s+(?:va|kem|dong thoi)\s+|[,;]/)
    .map((segment) => segment.trim())
    .filter((segment) => contentTokens(segment).length >= 2);

  if (segments.length < 2 || segments.length > 3) return [];

  // Kiểm tra có nhiều loại tài liệu khác nhau
  const segmentTypes = segments.map(findType);
  const distinctTypes = new Set(segmentTypes.filter(Boolean));

  // Kiểm tra có nhiều domain khác nhau
  const segmentDomains = segments.map(domainGroups);
  const hasDistinctDomains = segmentDomains.some((groups, index) =>
    segmentDomains.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        groups.size > 0 &&
        other.size > 0 &&
        ![...groups].some((group) => other.has(group)),
    ),
  );

  // Kiểm tra nội dung khác nhau giữa các segment (loại trừ type word và stopword).
  // Trường hợp điển hình: "tìm repo Caveman và repo Synthea" — cùng type "repo"
  // nhưng đề cập đến 2 tên riêng khác nhau, vẫn phải coi là multi-intent.
  const typeKeys = new Set<string>(typeWords.keys());
  const hasDistinctContent = (() => {
    const contentSets = segments.map((segment) =>
      new Set(
        contentTokens(segment).filter((token) => !typeKeys.has(token)),
      ),
    );
    return contentSets.some((left, i) =>
      contentSets.some((right, j) => {
        if (i === j || left.size === 0 || right.size === 0) return false;
        return ![...left].some((token) => right.has(token));
      }),
    );
  })();

  // Coi là multiple intents nếu có nhiều loại type, nhiều domain khác nhau,
  // HOẶC nhiều chủ đề (nội dung) khác nhau giữa các segment.
  if (distinctTypes.size < 2 && !hasDistinctDomains && !hasDistinctContent) {
    return [];
  }

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
    .slice(0, 5)
    .map((resource) => ({
      label: resource.title,
      query: resource.title,
      resourceId: resource.id,
    }));
}

function topicOptions(query: string, catalog: Resource[]): ClarificationOption[] {
  const normalized = normalizeText(query);
  const requestedType = findType(normalized);
  const pool = requestedType
    ? catalog.filter((resource) => resource.type === requestedType)
    : catalog;
  
  // Lấy các topic độc nhất, sắp xếp theo thời gian
  const topics = [...new Set(
    [...pool]
      .sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
      .map((resource) => resource.topic)
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
    // AI/LLM
    llm: ["llm", "large language model", "transformer", "attention", "gpt", "gemini", "claude"],
    ai_agent: ["ai agent", "agent", "coding agent", "autonomous"],
    
    // Công cụ & Repo
    github: ["github", "repo", "repository", "source code", "mã nguồn"],
    tools: ["tool", "công cụ", "software", "app", "ứng dụng"],
    
    // Học tập
    dataset: ["dataset", "data", "dữ liệu", "corpus"],
    training: ["training", "huấn luyện", "finetuning", "pretraining", "learning"],
    
    // Cuộc thi
    hackathon: ["hackathon", "ai20k", "cp1", "cp2", "cp3", "venture"],
    scoring: ["diem", "điểm", "xp", "rubric", "chấm", "đánh giá"],
    
    // Chủ đề cụ thể
    prompt: ["prompt", "prompting", "few shot", "draft critique"],
    security: ["security", "bảo mật", "privacy", "pii", "safety"],
    optimization: ["optimize", "tối ưu", "performance", "hiệu năng"],
    ocr: ["ocr", "nhận dạng ký tự", "text recognition"],
    asr: ["asr", "speech", "giọng nói", "voice", "audio"],
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
  // Nếu segment không có động từ tìm kiếm ("tìm", "cần", "cho", "xin", "xem"),
  // thêm "Tìm" vào đầu để tránh bị broad_query reject vì query quá ngắn.
  const searchVerbs = ["tim", "tìm", "can", "cần", "cho", "xin", "xem", "muon", "muốn"];
  const stopKeywords = new Set([
    "tim", "tìm", "cho", "minh", "mình", "toi", "tôi", "ve", "về", "mot", "một",
    "tai", "lieu", "cua", "của", "xin", "can", "cần", "muon", "muốn", "xem", "lai", "lại",
    "co", "có", "khong", "không", "voi", "với", "theo", "giup", "giúp",
  ]);
  const tokens = segment.split(/\s+/);

  let withVerb = segment;
  const hasSearchVerb = tokens.some((token) => searchVerbs.includes(token));
  if (!hasSearchVerb) withVerb = `tìm ${segment}`;

  // Nếu sau khi loại trừ stopwords còn < 3 token nội dung, thêm "chủ đề"
  // để bypass broad_query rule (yêu cầu ≥ 3 meaningful tokens). "chủ" và "đề"
  // đều không nằm trong stopwords (tránh dùng "tài liệu" vì "tai", "lieu"
  // bị lọc làm stopword riêng lẻ trong intent.ts).
  const meaningfulCount = withVerb
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopKeywords.has(t)).length;
  if (meaningfulCount < 3) withVerb = `${withVerb} chủ đề`;

  const value = withVerb.charAt(0).toUpperCase() + withVerb.slice(1);
  return value.replace(/\bcp(\d)\b/g, "CP$1");
}

function hasAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

// Đại từ chỉ định cần match theo word-boundary để tránh false positive
// (ví dụ: "hackathon" chứa "no", "company" chứa "này", "knowledge" chứa "no").
const AMBIGUOUS_REFERENCE_TERMS = [
  "tai lieu do", "cai do", "link do", "file do", "bai do",
  "do", "no", "nay",
];

function hasAmbiguousReference(normalized: string): boolean {
  return AMBIGUOUS_REFERENCE_TERMS.some((term) => {
    if (term.includes(" ")) return normalized.includes(term);
    // Word-boundary match cho single token: bọc bằng ký tự không phải chữ/số.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "iu").test(
      normalized,
    );
  });
}

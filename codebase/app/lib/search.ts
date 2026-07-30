import type {
  RankedResult,
  Resource,
  SearchFilters,
  SearchResponse,
  SearchStatus,
} from "../types/resource";

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s#/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterResources(
  catalog: Resource[],
  filters?: SearchFilters,
): Resource[] {
  if (!filters) return catalog;
  return catalog.filter(
    (resource) =>
      (!filters.type || filters.type === "all" || resource.type === filters.type) &&
      (!filters.topic || filters.topic === "all" || resource.topic === filters.topic) &&
      (!filters.channel ||
        filters.channel === "all" ||
        resource.sourceChannel === filters.channel),
  );
}

// Cải thiện fallback ranking với scoring chi tiết hơn
export function fallbackRank(
  query: string,
  catalog: Resource[],
): RankedResult[] {
  const normalizedQuery = normalizeText(query);
  const tokens = normalizedQuery.split(" ").filter((token) => token.length > 1);
  
  // Danh sách từ ngoài phạm vi
  const unrelated = [
    "nau an", "am thuc", "bong da", "du lich", "chung khoan",
    "thoi tiet", "tu vi", "phim", "mua sam", "game", "am nhac"
  ];
  if (unrelated.some((term) => normalizedQuery.includes(term))) return [];

  return catalog
    .map((resource) => {
      // Các trường để so sánh
      const fields = {
        title: normalizeText(resource.title),
        tags: normalizeText(resource.tags.join(" ")),
        keywords: normalizeText(resource.keywords.join(" ")),
        topic: normalizeText(resource.topic),
        summary: normalizeText(resource.summary),
        channel: normalizeText(resource.sourceChannel),
        type: normalizeText(resource.type),
        sharedBy: normalizeText(resource.sharedBy),
      };
      
      let rawScore = 0;
      const matchedFields = new Set<string>();
      
      // Tính điểm theo từng trường (theo thứ tự ưu tiên)
      for (const token of tokens) {
        // Title: trọng số cao nhất (5 điểm)
        if (fields.title.includes(token)) {
          rawScore += 5;
          matchedFields.add("title");
        }
        // Tags: trọng số cao (4 điểm)
        if (fields.tags.includes(token)) {
          rawScore += 4;
          matchedFields.add("tags");
        }
        // Keywords: trọng số trung bình-cao (3 điểm)
        if (fields.keywords.includes(token)) {
          rawScore += 3;
          matchedFields.add("keywords");
        }
        // Topic: trọng số trung bình (3 điểm)
        if (fields.topic.includes(token)) {
          rawScore += 3;
          matchedFields.add("topic");
        }
        // Summary: trọng số thấp (1 điểm)
        if (fields.summary.includes(token)) {
          rawScore += 1;
          matchedFields.add("summary");
        }
        // Channel: trọng số rất thấp (1 điểm)
        if (fields.channel.includes(token)) {
          rawScore += 1;
          matchedFields.add("channel");
        }
        // Type: trọng số thấp (1 điểm)
        if (fields.type.includes(token)) {
          rawScore += 1;
          matchedFields.add("type");
        }
      }
      
      // Bonus cho tài liệu chính thức nếu query liên quan đến nội dung nhạy cảm
      if (isSensitiveQuery(normalizedQuery) && resource.isOfficial) {
        rawScore += 4;
      }
      
      // Chỉ trả về nếu có match
      if (rawScore === 0) return null;
      
      return {
        resourceId: resource.id,
        rawScore,
        matchScore: Math.min(94, 50 + rawScore * 2),
        matchReason: matchedFields.size
          ? `Khớp theo ${[...matchedFields].join(", ")}.`
          : "Có liên quan đến query.",
        matchedFields: [...matchedFields],
      };
    })
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .sort((a, b) => b.rawScore - a.rawScore)
    .slice(0, 5)
    .map(({ rawScore: _rawScore, ...result }) => result);
}

export function guardRankedResponse(
  raw: unknown,
  query: string,
  catalog: Resource[],
  traceId: string,
): SearchResponse {
  const normalizedQuery = normalizeText(query);
  
  // Kiểm tra action ngoài phạm vi
  if (isActionOutsideScope(normalizedQuery)) {
    return {
      status: "no_match",
      interpretedNeed: query,
      clarification:
        "Hệ thống chỉ tìm tài liệu, không thể gửi tin nhắn hoặc thực hiện hành động thay bạn.",
      results: [],
      traceId,
    };
  }
  
  const candidateMap = new Map(catalog.map((resource) => [resource.id, resource]));
  const value = isRecord(raw) ? raw : {};
  const rawResults = Array.isArray(value.results) ? value.results : [];
  const seen = new Set<string>();
  const guarded: RankedResult[] = [];

  for (const item of rawResults) {
    if (!isRecord(item) || typeof item.resourceId !== "string") continue;
    const resource = candidateMap.get(item.resourceId);
    if (!resource || seen.has(item.resourceId)) continue;
    const score = clampScore(item.matchScore);
    
    // Chỉ chấp nhận kết quả có score >= 50
    if (score < 50) continue;
    
    seen.add(item.resourceId);
    guarded.push({
      resourceId: item.resourceId,
      matchScore: score,
      matchReason:
        typeof item.matchReason === "string" && item.matchReason.trim()
          ? item.matchReason.trim().slice(0, 240)
          : "Tài liệu có metadata phù hợp với nhu cầu đã mô tả.",
      matchedFields: Array.isArray(item.matchedFields)
        ? item.matchedFields.filter((field): field is string => typeof field === "string").slice(0, 5)
        : [],
    });
    if (guarded.length === 5) break;
  }

  // Sắp xếp lại nếu là sensitive query (ưu tiên tài liệu chính thức)
  const sensitive = isSensitiveQuery(normalizedQuery);
  if (sensitive) {
    guarded.sort((a, b) => {
      const officialDelta =
        Number(candidateMap.get(b.resourceId)?.isOfficial) -
        Number(candidateMap.get(a.resourceId)?.isOfficial);
      return officialDelta || b.matchScore - a.matchScore;
    });
  } else {
    guarded.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Xác định status
  const hasOfficial = guarded.some(
    (result) => candidateMap.get(result.resourceId)?.isOfficial,
  );
  let status: SearchStatus =
    guarded.length === 0
      ? "no_match"
      : guarded[0].matchScore < 75
        ? "low_confidence"
        : "success";
  
  if (sensitive && !hasOfficial && guarded.length > 0) {
    status = "low_confidence";
  }

  const rawStatus = typeof value.status === "string" ? value.status : "";
  if (rawStatus === "no_match" && guarded.length === 0) status = "no_match";
  if (isAmbiguousQuery(normalizedQuery)) status = "low_confidence";

  return {
    status,
    interpretedNeed:
      typeof value.interpretedNeed === "string" && value.interpretedNeed.trim()
        ? value.interpretedNeed.trim().slice(0, 300)
        : query,
    clarification:
      status === "low_confidence"
        ? typeof value.clarification === "string" && value.clarification.trim()
          ? value.clarification.trim().slice(0, 300)
          : "Bạn có thể bổ sung chủ đề, loại tài liệu hoặc từ khóa cụ thể hơn không?"
        : undefined,
    results: guarded,
    traceId,
  };
}

function isAmbiguousQuery(normalizedQuery: string): boolean {
  const vagueReferences = [
    "buoi truoc", "hom no", "tai lieu do", "cai do", "link do",
  ];
  if (vagueReferences.some((term) => normalizedQuery.includes(term))) return true;

  const meaningfulTokens = normalizedQuery
    .split(" ")
    .filter((token) => token.length > 1 && !["tim", "tìm", "cho", "minh", "mình", "toi", "tôi", "ve", "về"].includes(token));
  return meaningfulTokens.length <= 2 &&
    ["ai", "video", "slide", "lab", "tai lieu", "github", "dataset", "repo", "tool"].some((term) =>
      normalizedQuery.includes(term)
    );
}

function isActionOutsideScope(normalizedQuery: string): boolean {
  const asksDelegation = ["giup toi", "giúp tôi", "giup minh", "giúp mình", "ho toi", "hộ tôi"].some((term) =>
    normalizedQuery.includes(term)
  );
  const actionVerb = ["nhan ", "nhắn ", "nop ", "nộp ", "gui ", "gửi ", "dang ", "đăng ", "xoa ", "xóa ", "sua ", "sửa "].some((term) =>
    normalizedQuery.startsWith(term) || normalizedQuery.includes(` ${term}`)
  );
  return asksDelegation && actionVerb;
}

export function fallbackResponse(
  query: string,
  catalog: Resource[],
  traceId: string,
): SearchResponse {
  const results = fallbackRank(query, catalog);
  return {
    status: results.length === 0 ? "no_match" : "fallback",
    interpretedNeed: query,
    clarification:
      results.length === 0
        ? "Không tìm thấy tài liệu phù hợp trong kho hiện tại."
        : "Gemini hiện không khả dụng; kết quả được tạo bằng tìm kiếm từ khóa cơ bản.",
    results,
    traceId,
  };
}

export function isSensitiveQuery(normalizedQuery: string): boolean {
  return [
    "deadline", "han nop", "hạn nộp", "diem", "điểm", "xp", 
    "quy dinh", "quy định", "rubric", "cham diem", "chấm điểm",
    "official", "chinh thuc", "chính thức"
  ].some((term) => normalizedQuery.includes(term));
}

function clampScore(value: unknown): number {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

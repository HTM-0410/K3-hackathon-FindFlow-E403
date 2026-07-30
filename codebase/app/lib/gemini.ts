import type { Resource, SearchResponse } from "../types/resource";
import { guardRankedResponse } from "./search";
import { getServerEnv } from "./server-env";

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const responseSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["success", "low_confidence", "no_match"] },
    interpretedNeed: { type: "string" },
    clarification: { type: "string" },
    results: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          resourceId: { type: "string" },
          matchScore: { type: "integer", minimum: 0, maximum: 100 },
          matchReason: { type: "string" },
          matchedFields: {
            type: "array",
            maxItems: 5,
            items: { type: "string" },
          },
        },
        required: ["resourceId", "matchScore", "matchReason", "matchedFields"],
      },
    },
  },
  required: ["status", "interpretedNeed", "results"],
};

// System prompt được tinh chỉnh cho bộ dữ liệu mới
const SYSTEM_INSTRUCTION = `Bạn là bộ xếp hạng tài liệu cho Discord Knowledge Hub của khóa AI Thực Chiến.

NHIỆM VỤ:
- Chỉ xếp hạng và trả về resourceId có trong CATALOG.
- Không được tạo, thay đổi hoặc đoán resourceId, title, URL.

CÁCH XẾP HẠNG:
1. Đọc kỹ query và từng resource trong catalog.
2. Tính matchScore 0-100 dựa trên mức độ liên quan:
   - 90-100: Title khớp chính xác với query
   - 75-89: Summary hoặc topic khớp tốt
   - 60-74: Tags hoặc keywords khớp
   - 40-59: Có liên quan nhưng không chắc chắn
   - <40: Không liên quan, không trả về

3. Các trường để so sánh (theo thứ tự ưu tiên):
   - title: Tiêu đề tài liệu (quan trọng nhất)
   - summary: Mô tả tóm tắt nội dung
   - topic: Chủ đề chính của tài liệu
   - tags: Các tag phân loại
   - keywords: Từ khóa liên quan
   - type: Loại tài liệu (github, guide, video, announcement, slide, lab)

4. Xử lý ngôn ngữ:
   - Query tiếng Việt không dấu vẫn khớp với tiếng Việt có dấu
   - Từ tiếng Anh khớp chính xác
   - Từ viết tắt (LLM, AI, ML) được chấp nhận

5. Trả về kết quả:
   - Chỉ trả về các resource có matchScore >= 40
   - Sắp xếp theo matchScore giảm dần
   - Tối đa 5 kết quả
   - Giải thích ngắn gọn lý do khớp trong matchReason
   - Liệt kê các trường đã khớp trong matchedFields

QUY TẮC:
- Nếu không tìm thấy resource phù hợp: status = "no_match"
- Nếu chỉ có kết quả không chắc chắn: status = "low_confidence"
- Nếu tìm thấy kết quả tốt: status = "success"
- Không được tạo resourceId giả hoặc thêm resource không có trong catalog`;

export async function rankWithGemini(
  query: string,
  catalog: Resource[],
  traceId: string,
): Promise<SearchResponse> {
  const apiKey = getServerEnv("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const model = getServerEnv("GEMINI_MODEL") || DEFAULT_MODEL;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    // Chuẩn bị catalog với đầy đủ thông tin
    const catalogData = catalog.map((resource) => ({
      id: resource.id,
      title: resource.title,
      summary: resource.summary,
      type: resource.type,
      topic: resource.topic,
      tags: resource.tags,
      keywords: resource.keywords,
      sourceChannel: resource.sourceChannel,
      sharedBy: resource.sharedBy,
      sharedAt: resource.sharedAt,
    }));

    const response = await fetch(
      `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: SYSTEM_INSTRUCTION,
            }],
          },
          contents: [{
            role: "user",
            parts: [{
              text: JSON.stringify({
                query,
                catalog: catalogData,
              }),
            }],
          }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini returned HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned an empty structured response");
    const parsed: unknown = JSON.parse(text);
    const guarded = guardRankedResponse(parsed, query, catalog, traceId);
    writeTrace({
      traceId,
      timestamp: new Date().toISOString(),
      model,
      query: sanitizeQuery(query),
      candidateIds: catalog.map((resource) => resource.id),
      parsedOutput: parsed,
      guardedOutput: guarded,
      latencyMs: Date.now() - startedAt,
      fallback: false,
    });
    return guarded;
  } finally {
    clearTimeout(timeout);
  }
}

export function writeFallbackTrace(
  traceId: string,
  query: string,
  catalog: Resource[],
  reason: unknown,
  output: SearchResponse,
): void {
  writeTrace({
    traceId,
    timestamp: new Date().toISOString(),
    model: getServerEnv("GEMINI_MODEL") || DEFAULT_MODEL,
    query: sanitizeQuery(query),
    candidateIds: catalog.map((resource) => resource.id),
    guardedOutput: output,
    latencyMs: 0,
    fallback: true,
    failureReason: reason instanceof Error ? reason.message : "Unknown Gemini failure",
  });
}

function sanitizeQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim().slice(0, 300);
}

function writeTrace(trace: Record<string, unknown>): void {
  console.info(`[search-trace] ${JSON.stringify(trace)}`);
}

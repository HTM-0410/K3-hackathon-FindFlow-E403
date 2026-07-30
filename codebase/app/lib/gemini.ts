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
    const response = await fetch(
      `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: [
                "Bạn là bộ xếp hạng tài liệu cho khóa AI Thực Chiến, không phải chatbot.",
                "Chỉ dùng resourceId có trong CATALOG; tuyệt đối không tạo title, URL hoặc ID mới.",
                "Xét query theo title, summary, tags, topic, sourceChannel, sharedAt và isOfficial.",
                "Với deadline, điểm, XP, quy định hoặc rubric, ưu tiên nguồn isOfficial=true.",
                "Nếu không đủ căn cứ, dùng low_confidence hoặc no_match; không đoán.",
                "matchScore là độ khớp ước tính 0-100, không phải xác suất.",
              ].join("\n"),
            }],
          },
          contents: [{
            role: "user",
            parts: [{
              text: JSON.stringify({
                query,
                catalog: catalog.map((resource) => ({
                  id: resource.id,
                  title: resource.title,
                  summary: resource.summary,
                  type: resource.type,
                  topic: resource.topic,
                  tags: resource.tags,
                  sourceChannel: resource.sourceChannel,
                  sharedAt: resource.sharedAt,
                  keywords: resource.keywords,
                  isOfficial: resource.isOfficial,
                  version: resource.version,
                })),
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

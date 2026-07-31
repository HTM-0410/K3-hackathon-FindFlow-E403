import type { Resource, SearchResponse } from "../types/resource";
import { guardRankedResponse } from "./search";

interface CloudflareEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_EMBEDDING_MODEL?: string;
  GROQ_API_KEY?: string;
  AI_PROXY_URL?: string;
  _aiAvailable?: boolean;
  _ai?: Ai;
}

function getEnv(): CloudflareEnv {
  if (typeof globalThis === "undefined") return process.env as unknown as CloudflareEnv;
  return (
    (globalThis as Record<string, unknown>).__CURSOR_APP_ENV__ as CloudflareEnv | undefined
  ) ?? (process.env as unknown as CloudflareEnv);
}

// Groq configuration (free tier)
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_RERANK_MODEL = "llama-3.2-3b-instruct";

// Fallback: Cloudflare Workers AI
const AI_MODEL = "@cf/meta/llama-3.2-3b-instruct";
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const GOOGLE_AI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

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

5. Trả về kết quả JSON hợp lệ:
   - Chỉ trả về các resource có matchScore >= 40
   - Sắp xếp theo matchScore giảm dần
   - Tối đa 5 kết quả
   - Giải thích ngắn gọn lý do khớp trong matchReason
   - Liệt kê các trường đã khớp trong matchedFields

OUTPUT FORMAT - CHỈ TRẢ VỀ JSON, KHÔNG CÓ GÌ KHÁC:
{"status":"success","interpretedNeed":"...","clarification":"...","results":[{"resourceId":"...","matchScore":95,"matchReason":"...","matchedFields":["title","summary"]}]}

QUY TẮC:
- Luôn trả về JSON hợp lệ
- Nếu không tìm thấy resource phù hợp: status = "no_match"
- Nếu chỉ có kết quả không chắc chắn: status = "low_confidence"
- Nếu tìm thấy kết quả tốt: status = "success"
- Không được tạo resourceId giả hoặc thêm resource không có trong catalog`;

export async function rankWithGemini(
  query: string,
  catalog: Resource[],
  traceId: string,
): Promise<SearchResponse> {
  const env = getEnv();
  const startedAt = Date.now();

  // #region agent log
  fetch('http://127.0.0.1:7649/ingest/0c95a8ef-4011-476f-ac84-1389a48e9386',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a96cb1'},body:JSON.stringify({sessionId:'a96cb1',location:'app/lib/gemini.ts:81',message:'rankWithGemini entry',data:{traceId,queryLen:query.length,catalogLen:catalog.length,hasGeminiKey:!!env.GEMINI_API_KEY,hasGroqKey:!!env.GROQ_API_KEY,aiAvailable:env._aiAvailable,hasAI:!!env._ai,model:env.GEMINI_MODEL,geminiKeyPrefix:env.GEMINI_API_KEY?.slice(0,10)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  try {
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

    const userMessage = JSON.stringify({
      query,
      catalog: catalogData,
    });

    let text: string;
    let modelUsed = "groq";

    console.info(
      `[ai-request] traceId=${traceId} model=groq:${GROQ_RERANK_MODEL} queryLen=${query.length} catalogLen=${catalog.length}`,
    );

    // Priority 1: Cloudflare Workers AI (if available)
    if (env._ai && env._aiAvailable) {
      const response = await env._ai.run(AI_MODEL, {
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1024,
        temperature: 0.1,
      }) as { response?: string };
      text = response?.response ?? "";
      modelUsed = "cloudflare";
    }
    // Priority 2: Groq API (free, fast) - uses GROQ_API_KEY
    else if (env.GROQ_API_KEY) {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_RERANK_MODEL,
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: userMessage },
          ],
          max_tokens: 1024,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "<unreadable>");
        throw new Error(`Groq API returned HTTP ${response.status}: ${errorBody.slice(0, 500)}`);
      }

      const payload = await response.json() as Record<string, unknown>;
      const choices = payload.choices as Array<{ message?: { content?: string } }> | undefined;
      text = choices?.[0]?.message?.content ?? "";
    }
    // Priority 3: Google Gemini (fallback) - uses GEMINI_API_KEY
    else if (env.GEMINI_API_KEY) {
      const response = await fetch(`${GOOGLE_AI_ENDPOINT}?key=${env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Goog-API-Client": "cloudflare-workers/1.0",
          "X-Goog-AuthUser": "0",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n${userMessage}` }]
          }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "<unreadable>");
        throw new Error(`Gemini API returned HTTP ${response.status}: ${errorBody.slice(0, 500)}`);
      }

      const payload = await response.json() as Record<string, unknown>;
      const candidates = payload.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
      text = candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      modelUsed = "gemini";
    }
    else {
      throw new Error("No AI API key configured. Set GROQ_API_KEY or GEMINI_API_KEY");
    }

    if (!text) throw new Error("AI returned empty response");

    // Extract JSON from response (may have extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI response does not contain valid JSON");

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    const guarded = guardRankedResponse(parsed, query, catalog, traceId);
    writeTrace({
      traceId,
      timestamp: new Date().toISOString(),
      model: modelUsed,
      query: sanitizeQuery(query),
      candidateIds: catalog.map((resource) => resource.id),
      parsedOutput: parsed,
      guardedOutput: guarded,
      latencyMs: Date.now() - startedAt,
      fallback: false,
    });
    return guarded;
  } catch (error) {
    console.error(`[ai-error] traceId=${traceId} error=${error instanceof Error ? error.message : String(error)}`);
    throw error;
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
    model: AI_MODEL,
    query: sanitizeQuery(query),
    candidateIds: catalog.map((resource) => resource.id),
    guardedOutput: output,
    latencyMs: 0,
    fallback: true,
    failureReason: reason instanceof Error ? reason.message : "Unknown AI failure",
  });
}

function sanitizeQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim().slice(0, 300);
}

function writeTrace(trace: Record<string, unknown>): void {
  console.info(`[search-trace] ${JSON.stringify(trace)}`);
}

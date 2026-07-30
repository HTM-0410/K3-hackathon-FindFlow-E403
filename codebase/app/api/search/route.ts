import { getResources } from "../../data/resources";
import { candidateProvider } from "../../lib/candidate-provider";
import { rankWithGemini, writeFallbackTrace } from "../../lib/gemini";
import {
  analyzeSearchIntent,
  intentDecisionToResponse,
} from "../../lib/intent";
import { fallbackResponse, filterResources } from "../../lib/search";
import type { SearchFilters } from "../../types/resource";

export async function POST(request: Request) {
  let payload: { query?: unknown; filters?: SearchFilters };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  if (query.length < 3 || query.length > 300) {
    return Response.json(
      { error: "Query phải dài từ 3 đến 300 ký tự." },
      { status: 400 },
    );
  }

  const catalog = filterResources(getResources(), payload.filters);
  const traceId = crypto.randomUUID();
  const intentDecision = analyzeSearchIntent(query, catalog);
  if (intentDecision.kind !== "proceed") {
    return Response.json(
      intentDecisionToResponse(intentDecision, query, traceId),
    );
  }
  if (catalog.length === 0) {
    return Response.json({
      status: "no_match",
      interpretedNeed: query,
      clarification: "Không có tài liệu nào trong bộ lọc hiện tại.",
      results: [],
      traceId,
    });
  }

  const selection = await candidateProvider.getCandidates(query, catalog, 20);
  const candidates = selection.resources;
  if (candidates.length === 0) {
    return Response.json({
      status: "no_match",
      interpretedNeed: query,
      clarification: "Không tìm thấy ứng viên nào trong chỉ mục tài liệu.",
      results: [],
      traceId,
      retrievalMode: selection.mode,
      candidateCount: 0,
    });
  }

  try {
    const ranked = await rankWithGemini(query, candidates, traceId);
    return Response.json({
      ...ranked,
      retrievalMode: selection.mode,
      candidateCount: candidates.length,
    });
  } catch (error) {
    const fallback = fallbackResponse(query, candidates, traceId);
    fallback.retrievalMode = selection.mode;
    fallback.candidateCount = candidates.length;
    writeFallbackTrace(traceId, query, candidates, error, fallback);
    return Response.json(fallback);
  }
}

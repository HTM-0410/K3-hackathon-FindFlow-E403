import resourceEmbeddings from "../data/resource-embeddings.json";
import type { Resource } from "../types/resource";
import { normalizeText } from "./search";
import { getServerEnv } from "./server-env";

export interface CandidateSelection {
  resources: Resource[];
  mode: "hybrid" | "lexical";
  lexicalCount: number;
  vectorCount: number;
}

export interface CandidateProvider {
  getCandidates(
    query: string,
    catalog: Resource[],
    limit?: number,
  ): Promise<CandidateSelection>;
}

type EmbeddingIndex = Record<string, number[]>;
const embeddingIndex = resourceEmbeddings as EmbeddingIndex;
const RRF_K = 60;

/**
 * Hybrid provider (metadata scoring + semantic rerank):
 * - BM25-like metadata scoring always works.
 * - Gemini query embedding + precomputed document vectors activate when both
 *   GEMINI_API_KEY and resource-embeddings.json are available.
 * - Production can replace this provider with PostgreSQL FTS + pgvector.
 */
export class HybridCandidateProvider implements CandidateProvider {
  async getCandidates(
    query: string,
    catalog: Resource[],
    limit = 20,
  ): Promise<CandidateSelection> {
    const lexicalRanked = rankLexically(query, catalog).slice(0, 50);
    const vectorRanked = await rankByVector(query, catalog).catch(() => []);
    const fused = reciprocalRankFusion(lexicalRanked, vectorRanked)
      .slice(0, limit);

    return {
      resources: fused,
      mode: vectorRanked.length ? "hybrid" : "lexical",
      lexicalCount: lexicalRanked.length,
      vectorCount: vectorRanked.length,
    };
  }
}

export const candidateProvider: CandidateProvider =
  new HybridCandidateProvider();

function rankLexically(query: string, catalog: Resource[]): Resource[] {
  const normalizedQuery = expandQuery(normalizeText(query));
  const stopwords = new Set([
    "tai", "lieu", "hoc", "tim", "cho", "minh", "toi", "ve", "va",
    "cach", "huong", "dan", "can", "xem", "lai", "mot", "nhung",
  ]);
  const tokens = normalizedQuery
    .split(" ")
    .filter((token) => token.length > 1 && !stopwords.has(token));

  return catalog
    .map((resource) => ({
      resource,
      score: lexicalScore(resource, normalizedQuery, tokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.resource.isOfficial) - Number(a.resource.isOfficial) ||
        b.resource.sharedAt.localeCompare(a.resource.sharedAt),
    )
    .map((entry) => entry.resource);
}

async function rankByVector(
  query: string,
  catalog: Resource[],
): Promise<Resource[]> {
  const apiKey = getServerEnv("GEMINI_API_KEY");
  if (!apiKey || Object.keys(embeddingIndex).length === 0) return [];

  const queryVector = await embedText(query, apiKey);
  return catalog
    .map((resource) => ({
      resource,
      score: cosineSimilarity(queryVector, embeddingIndex[resource.id]),
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((entry) => entry.resource);
}

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const model = getServerEnv("GEMINI_EMBEDDING_MODEL") || "gemini-embedding-2";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`Embedding API returned ${response.status}`);
  const payload = (await response.json()) as { embedding?: { values?: number[] } };
  if (!payload.embedding?.values?.length) throw new Error("Embedding is empty");
  return payload.embedding.values;
}

function reciprocalRankFusion(
  lexical: Resource[],
  vector: Resource[],
): Resource[] {
  const scores = new Map<string, number>();
  lexical.forEach((resource, index) =>
    scores.set(resource.id, (scores.get(resource.id) ?? 0) + 1 / (RRF_K + index + 1)),
  );
  vector.forEach((resource, index) =>
    scores.set(resource.id, (scores.get(resource.id) ?? 0) + 1 / (RRF_K + index + 1)),
  );
  const resourceMap = new Map([...lexical, ...vector].map((resource) => [resource.id, resource]));
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => resourceMap.get(id))
    .filter((resource): resource is Resource => Boolean(resource));
}

function lexicalScore(
  resource: Resource,
  normalizedQuery: string,
  tokens: string[],
): number {
  const title = normalizeText(resource.title);
  const tags = normalizeText(resource.tags.join(" "));
  const keywords = normalizeText(resource.keywords.join(" "));
  const topic = normalizeText(resource.topic);
  const summary = normalizeText(resource.summary);
  const channel = normalizeText(resource.sourceChannel);
  let score = 0;
  if (title.includes(normalizedQuery)) score += 18;
  if (tags.includes(normalizedQuery)) score += 12;
  for (const token of tokens) {
    if (title.includes(token)) score += 6;
    if (tags.includes(token)) score += 5;
    if (keywords.includes(token)) score += 4;
    if (topic.includes(token)) score += 4;
    if (summary.includes(token)) score += 2;
    if (channel.includes(token)) score += 2;
  }
  if (
    resource.isOfficial &&
    ["deadline", "han nop", "diem", "xp", "quy dinh", "rubric"].some((term) =>
      normalizedQuery.includes(term)
    )
  ) score += 6;
  return score;
}

function cosineSimilarity(left: number[], right?: number[]): number {
  if (!right || left.length !== right.length || left.length === 0) return Number.NaN;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denominator ? dot / denominator : Number.NaN;
}

function expandQuery(query: string): string {
  const expansions: Record<string, string> = {
    "cham diem": "diem rubric cach tinh",
    "nop bai": "deadline checkpoint checklist",
    "ma nguon": "code github repository",
    "bai tap": "lab thuc hanh",
    "ghi hinh": "video recording",
    "mo hinh nen tang": "foundation model llm",
    "viet prompt": "prompt engineering draft critique revise",
  };
  let expanded = query;
  for (const [phrase, synonyms] of Object.entries(expansions)) {
    if (query.includes(phrase)) expanded += ` ${synonyms}`;
  }
  return expanded;
}

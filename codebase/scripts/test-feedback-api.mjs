/**
 * Phase 1 test cho feedback API (in-process worker, không cần vinext start).
 *
 * Import worker module trực tiếp giống eval/run-golden-set.mjs,
 * tự route POST /api/feedback, POST /api/traces, GET /api/feedback?action=*.
 *
 * Chạy: node scripts/test-feedback-api.mjs
 */

process.loadEnvFile(".env.local");

import { rm, mkdir, cp, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const tmpDir = fileURLToPath(new URL("../eval/.tmp-server/", import.meta.url));
await rm(tmpDir, { recursive: true, force: true }).then(() => mkdir(tmpDir, { recursive: true }));
const distDir = fileURLToPath(new URL("../dist/server/", import.meta.url));
await cp(distDir, tmpDir, { recursive: true });
const shimSrc = "export const env = {};\n";
await writeFile(`${tmpDir}cf-shim.mjs`, shimSrc, "utf8");
const patchedDist = `${tmpDir}index.js`;
let src = await readFile(patchedDist, "utf8");
if (src.includes('from "cloudflare:workers"')) {
  src = src.replace('from "cloudflare:workers"', 'from "./cf-shim.mjs"');
  await writeFile(patchedDist, src, "utf8");
}

const workerUrl = new URL("../eval/.tmp-server/index.js", import.meta.url);
workerUrl.searchParams.set("eval", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function callRoute(method, pathname, body) {
  const req = new Request(`http://localhost${pathname}`, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await worker.fetch(req, env, ctx);
  let json = null;
  try { json = await res.json(); } catch { /* may not be json */ }
  return { status: res.status, json };
}

let exitCode = 0;
function expect(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); exitCode = 1; }
  else console.log(`OK: ${msg}`);
}

try {
  console.log("\n=== Step 1: POST /api/traces ===");
  const trace1 = await callRoute("POST", "/api/traces", {
    traceId: "test-trace-001",
    query: "Slide giới thiệu Hackathon",
    status: "success",
    candidateCount: 12,
    retrievalMode: "hybrid",
    latencyMs: 320,
  });
  expect(trace1.status === 200 && trace1.json?.ok === true, "trace1 accepted");

  const trace2 = await callRoute("POST", "/api/traces", {
    traceId: "test-trace-002",
    query: "Code gọi OpenAI API bằng Python",
    status: "low_confidence",
    candidateCount: 4,
    retrievalMode: "lexical",
    latencyMs: 180,
  });
  expect(trace2.status === 200 && trace2.json?.ok === true, "trace2 accepted");

  const trace3 = await callRoute("POST", "/api/traces", {
    traceId: "test-trace-003",
    query: "Lab structured output",
    status: "success",
    candidateCount: 8,
    retrievalMode: "hybrid",
    latencyMs: 250,
  });
  expect(trace3.status === 200 && trace3.json?.ok === true, "trace3 accepted");

  console.log("\n=== Step 2: POST /api/feedback (7 rows) ===");
  const feedbackPayloads = [
    { resourceId: "res-001", query: "Slide giới thiệu Hackathon", helpful: true, traceId: "test-trace-001", status: "success", matchScore: 92 },
    { resourceId: "res-001", query: "slide hackathon", helpful: true, traceId: "test-trace-001", status: "success", matchScore: 95 },
    { resourceId: "res-003", query: "Code gọi OpenAI API bằng Python", helpful: true, traceId: "test-trace-002", status: "low_confidence", matchScore: 70 },
    { resourceId: "res-003", query: "Code gọi OpenAI API Python", helpful: false, traceId: "test-trace-002", status: "low_confidence", matchScore: 50 },
    { resourceId: "res-026", query: "Lab structured output JSON", helpful: true, traceId: "test-trace-003", status: "success", matchScore: 88 },
    { resourceId: "res-026", query: "lab json", helpful: false, traceId: "test-trace-003", status: "success", matchScore: 65 },
    { resourceId: "res-099", query: "AutoML workshop", helpful: false, status: "no_match", matchScore: 0 },
  ];
  for (const p of feedbackPayloads) {
    const r = await callRoute("POST", "/api/feedback", p);
    console.log(`  inserted id=${r.json?.id} helpful=${p.helpful} q="${p.query}" status=${r.status}`);
    expect(r.status === 200 && typeof r.json?.id === "number", `feedback ok: ${p.query}`);
  }

  console.log("\n=== Step 3: Validation ===");
  const bad1 = await callRoute("POST", "/api/feedback", { resourceId: "", query: "x", helpful: true });
  expect(bad1.status === 400, "empty resourceId -> 400");
  const bad2 = await callRoute("POST", "/api/feedback", { resourceId: "res-1", query: "", helpful: true });
  expect(bad2.status === 400, "empty query -> 400");
  const bad3 = await callRoute("POST", "/api/feedback", { resourceId: "res-1", query: "ok", helpful: "maybe" });
  expect(bad3.status === 200, "string 'maybe' coerced -> 200");
  const bad4 = await callRoute("POST", "/api/traces", { traceId: "", query: "x", status: "success" });
  expect(bad4.status === 400, "empty traceId -> 400");
  const bad5 = await callRoute("POST", "/api/traces", { traceId: "ok", query: "x", status: "invalid" });
  expect(bad5.status === 400, "invalid status -> 400");

  console.log("\n=== Step 4: GET /api/feedback?action=list ===");
  const list = await callRoute("GET", "/api/feedback?action=list&limit=20");
  expect(list.status === 200 && list.json.count >= 7, `list returns >=7 rows (got ${list.json.count})`);

  console.log("\n=== Step 5: GET /api/feedback?action=stats ===");
  const stats = await callRoute("GET", "/api/feedback?action=stats&days=90");
  if (stats.status !== 200) {
    console.error("stats failed:", JSON.stringify(stats));
    exitCode = 1;
  } else {
    console.log(JSON.stringify({
      total: stats.json.total,
      helpful: stats.json.helpful,
      unhelpful: stats.json.unhelpful,
      helpfulRate: stats.json.helpfulRate,
      windowDays: stats.json.windowDays,
      byDay: stats.json.byDay?.length,
      byResource: stats.json.byResource?.length,
      byStatus: stats.json.byStatus?.length,
      topUnhelpfulQueries: stats.json.topUnhelpfulQueries?.length,
    }, null, 2));
    expect(stats.json.total >= 7, `total >= 7 (got ${stats.json.total})`);
    expect(stats.json.helpful >= 4, `helpful >= 4 (got ${stats.json.helpful})`);
    expect(Array.isArray(stats.json.byDay) && stats.json.byDay.length > 0, "byDay populated");
    expect(Array.isArray(stats.json.byResource) && stats.json.byResource.length > 0, "byResource populated");
    expect(Array.isArray(stats.json.byStatus) && stats.json.byStatus.length > 0, "byStatus populated");
    expect(stats.json.helpfulRate >= 50 && stats.json.helpfulRate <= 70, `helpfulRate reasonable (got ${stats.json.helpfulRate})`);
  }

  console.log("\n=== Step 6: trace correlation ===");
  const byResource = stats.json?.byResource || [];
  const target = byResource.find((r) => r.resourceId === "res-001");
  expect(target?.total === 2 && target?.helpful === 2, "res-001: 2/2 helpful");
  const target2 = byResource.find((r) => r.resourceId === "res-026");
  expect(target2?.total === 2 && target2?.helpful === 1, "res-026: 1/2 helpful");

  console.log(exitCode === 0 ? "\n=== Phase 1 PASSED ===" : "\n=== Phase 1 FAILED ===");
} catch (err) {
  console.error("\n=== Phase 1 FAILED with exception ===");
  console.error(err);
  exitCode = 1;
}

process.exit(exitCode);

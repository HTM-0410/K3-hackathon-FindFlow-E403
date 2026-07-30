/**
 * Phase 1 test thuần (không cần D1) cho feedback normalize logic.
 *
 * Test:
 * - normalizeFeedback: validate input đúng/sai
 * - normalizeTrace: validate input đúng/sai
 * - safeRate: chia cho 0 an toàn
 * - dayKeyUtc: format date ổn định
 *
 * Chạy: node scripts/test-feedback-pure.mjs
 */

import {
  normalizeFeedback,
  normalizeTrace,
  safeRate,
  dayKeyUtc,
  ALLOWED_STATUSES,
} from "../app/lib/feedback.ts";

let exitCode = 0;
function expect(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); exitCode = 1; }
  else console.log(`OK: ${msg}`);
}

console.log("=== Phase 1 pure-logic test ===\n");

console.log("--- normalizeFeedback ---");
{
  const r = normalizeFeedback({
    resourceId: "res-001",
    query: "Slide giới thiệu Hackathon",
    helpful: true,
    traceId: "trace-1",
    status: "success",
    matchScore: 92,
  });
  expect(r !== null, "valid payload -> object");
  expect(r.resourceId === "res-001", "resourceId preserved");
  expect(r.normalizedQuery === "slide giới thiệu hackathon", "normalized query (lowercase + collapsed spaces)");
  expect(r.helpful === 1, "helpful=true -> 1");
  expect(r.retrievalStatus === "success", "status=success preserved");
  expect(r.matchScore === 92, "matchScore=92");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "ok", helpful: false });
  expect(r.helpful === 0, "helpful=false -> 0");
}
{
  const r = normalizeFeedback({ resourceId: "", query: "x", helpful: true });
  expect(r === null, "empty resourceId -> null");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "", helpful: true });
  expect(r === null, "empty query -> null");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "   spaces   many\t\n  ", helpful: true });
  expect(r.normalizedQuery === "spaces many", "query whitespace collapsed");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "ok", helpful: "true" });
  expect(r.helpful === 1, "string 'true' -> 1");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "ok", helpful: "yes" });
  expect(r.helpful === 0, "string 'yes' (non-'true') -> 0");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "ok", helpful: 0 });
  expect(r.helpful === 0, "0 -> 0");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "ok", status: "made_up_status" });
  expect(r.retrievalStatus === "", "unknown status -> empty");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "ok", status: "fallback" });
  expect(r.retrievalStatus === "fallback", "fallback status accepted");
}
{
  const r = normalizeFeedback({ resourceId: "r", query: "ok", matchScore: 150 });
  expect(r.matchScore === 0, "out-of-range matchScore -> 0");
}
{
  const r = normalizeFeedback(null);
  expect(r === null, "null input -> null");
  const r2 = normalizeFeedback("string");
  expect(r2 === null, "string input -> null");
}

console.log("\n--- normalizeTrace ---");
{
  const r = normalizeTrace({
    traceId: "trace-1",
    query: "q",
    status: "success",
    candidateCount: 10,
    retrievalMode: "hybrid",
    latencyMs: 250,
  });
  expect(r !== null && r.traceId === "trace-1" && r.status === "success", "valid trace");
  expect(r.candidateCount === 10 && r.latencyMs === 250, "numeric fields preserved");
}
{
  const r = normalizeTrace({ traceId: "", query: "x", status: "success" });
  expect(r === null, "empty traceId -> null");
}
{
  const r = normalizeTrace({ traceId: "t", query: "", status: "success" });
  expect(r === null, "empty query -> null");
}
{
  const r = normalizeTrace({ traceId: "t", query: "q", status: "wrong" });
  expect(r === null, "invalid status -> null");
}
{
  const r = normalizeTrace({ traceId: "t", query: "q", status: "no_match", latencyMs: 999999 });
  expect(r.latencyMs === 0, "latency > 600000 -> 0");
}

console.log("\n--- safeRate ---");
expect(safeRate(0, 0) === 0, "0/0 -> 0");
expect(safeRate(5, 10) === 50, "5/10 -> 50");
expect(safeRate(3, 4) === 75, "3/4 -> 75");
expect(safeRate(2, 3) === 66.7, "2/3 -> 66.7");
expect(safeRate(7, 7) === 100, "7/7 -> 100");

console.log("\n--- dayKeyUtc ---");
expect(dayKeyUtc(Date.UTC(2026, 0, 5, 12, 0, 0)) === "2026-01-05", "UTC date format");
expect(dayKeyUtc(Date.UTC(2026, 6, 30, 23, 59, 59)) === "2026-07-30", "UTC month/day padding");

console.log("\n--- ALLOWED_STATUSES ---");
expect(ALLOWED_STATUSES.size === 6, "6 allowed statuses");
expect(ALLOWED_STATUSES.has("success") && ALLOWED_STATUSES.has("fallback"), "all expected statuses present");

console.log(exitCode === 0 ? "\n=== Phase 1 pure-logic test PASSED ===" : "\n=== Phase 1 pure-logic test FAILED ===");
process.exit(exitCode);

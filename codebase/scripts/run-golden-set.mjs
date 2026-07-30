import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

process.loadEnvFile(".env.local");

const root = fileURLToPath(new URL("../../", import.meta.url));
const goldenPath = fileURLToPath(new URL("../../eval/golden-set.json", import.meta.url));
const tracePath = fileURLToPath(new URL("../../eval/traces/run-01.json", import.meta.url));
const reportPath = fileURLToPath(new URL("../../eval/run-01-results.md", import.meta.url));
const cases = JSON.parse(await readFile(goldenPath, "utf8"));

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("eval", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

const runs = [];
for (const [caseIndex, testCase] of cases.entries()) {
  const startedAt = Date.now();
  const response = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: testCase.query }),
    }),
    env,
    ctx,
  );
  const result = await response.json();
  const top3 = (result.results ?? []).slice(0, 3).map((item) => item.resourceId);
  const expectedHit =
    testCase.expectedTop3.length === 0 ||
    testCase.expectedTop3.some((id) => top3.includes(id));
  const forbiddenHit = testCase.forbiddenIds.some((id) => top3.includes(id));
  const statusPass = result.status === testCase.expectedStatus;
  const passed = response.ok && statusPass && expectedHit && !forbiddenHit;

  runs.push({
    id: testCase.id,
    query: testCase.query,
    expectedStatus: testCase.expectedStatus,
    actualStatus: result.status,
    expectedTop3: testCase.expectedTop3,
    actualTop3: top3,
    forbiddenIds: testCase.forbiddenIds,
    retrievalMode: result.retrievalMode,
    candidateCount: result.candidateCount,
    traceId: result.traceId,
    latencyMs: Date.now() - startedAt,
    passed,
  });
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${testCase.id}\n`);
  // Stay below the default free-tier generateContent request rate.
  if (caseIndex < cases.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 4_200));
  }
}

const passedCount = runs.filter((run) => run.passed).length;
const rate = Math.round((passedCount / runs.length) * 1000) / 10;
const output = {
  generatedAt: new Date().toISOString(),
  model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
  total: runs.length,
  passed: passedCount,
  passRate: rate,
  runs,
};
await writeFile(tracePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const rows = runs.map((run) =>
  `| ${run.id} | ${run.passed ? "PASS" : "FAIL"} | ${run.expectedStatus} | ${run.actualStatus} | ${run.actualTop3.join(", ") || "—"} | ${run.latencyMs} |`
);
const report = `# Golden-set run 01

- Generated: ${output.generatedAt}
- Model: \`${output.model}\`
- Retrieval: precomputed document embeddings + query embedding + lexical RRF → Top 20 → Gemini rerank
- Result: **${passedCount}/${runs.length} (${rate}%)**

| Case | Result | Expected status | Actual status | Actual Top 3 | Latency ms |
|---|---|---|---|---|---:|
${rows.join("\n")}
`;
await writeFile(reportPath, report, "utf8");
process.stdout.write(`Golden set: ${passedCount}/${runs.length} (${rate}%)\n`);
process.stdout.write(`Trace: ${tracePath}\nReport: ${reportPath}\n`);

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

process.loadEnvFile(".env.local");

const goldenPath = fileURLToPath(new URL("../../eval/golden-set.json", import.meta.url));
const tracePath = fileURLToPath(new URL("../../eval/traces/run-rrank-baseline.json", import.meta.url));
const reportPath = fileURLToPath(new URL("../../eval/run-rrank-baseline-results.md", import.meta.url));
const cases = JSON.parse(await readFile(goldenPath, "utf8"));

const tmpDir = fileURLToPath(new URL("../../eval/.tmp-server/", import.meta.url));
await import("node:fs/promises").then((fs) => fs.rm(tmpDir, { recursive: true, force: true }).then(() => fs.mkdir(tmpDir, { recursive: true })));
const distDir = fileURLToPath(new URL("../dist/server/", import.meta.url));
const { cp } = await import("node:fs/promises");
await cp(distDir, tmpDir, { recursive: true });
const shimSrc = "export const env = {};\n";
await writeFile(`${tmpDir}cf-shim.mjs`, shimSrc, "utf8");
const patchedDist = `${tmpDir}index.js`;
let src = await readFile(patchedDist, "utf8");
if (src.includes('from "cloudflare:workers"')) {
  src = src.replace('from "cloudflare:workers"', 'from "./cf-shim.mjs"');
  await writeFile(patchedDist, src, "utf8");
}

const workerUrl = new URL("../../eval/.tmp-server/index.js", import.meta.url);
workerUrl.searchParams.set("eval", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function search(query) {
  const response = await worker.fetch(
    new Request("http://localhost/api/search-rrank", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    }),
    env,
    ctx,
  );
  return { response, result: await response.json() };
}

const caseRuns = [];
let successfulApiCalls = 0;
for (const testCase of cases) {
  const turnRuns = [];
  let conversationContinues = true;
  let previousResult = null;

  for (const [turnIndex, turn] of testCase.turns.entries()) {
    if (!conversationContinues) {
      turnRuns.push({
        turn: turnIndex + 1,
        query: null,
        expectedStatus: turn.expectedStatus,
        actualStatus: "skipped",
        actualTop3: [],
        passed: false,
        failure: "skipped (prior turn ended conversation)",
      });
      continue;
    }

    if (!turn.query) {
      turnRuns.push({
        turn: turnIndex + 1,
        query: null,
        expectedStatus: turn.expectedStatus,
        actualStatus: "not_run",
        actualTop3: [],
        passed: false,
        failure: "baseline rerank không có conversation state; turn phụ thuộc selectOption bị bỏ qua",
      });
      conversationContinues = false;
      continue;
    }

    const startedAt = Date.now();
    const { response, result } = await search(turn.query);
    previousResult = result;
    const top3 = (result.results ?? []).slice(0, 3).map((item) => item.resourceId);
    const options = result.clarificationOptions ?? [];
    const expectedHit =
      (turn.expectedTop3 ?? []).length === 0 ||
      turn.expectedTop3.some((id) => top3.includes(id));
    const forbiddenHit = (turn.forbiddenIds ?? []).some((id) => top3.includes(id));
    const statusPass = result.status === turn.expectedStatus;
    const questionPass =
      !turn.expectQuestion ||
      (typeof result.clarification === "string" &&
        result.clarification.trim().endsWith("?"));
    const optionsPass = options.length >= (turn.minOptions ?? 0);
    const reasonPass =
      (!turn.expectedReason ||
        result.clarificationReason === turn.expectedReason) &&
      (!turn.expectedRejectionReason ||
        result.rejectionReason === turn.expectedRejectionReason);
    const passed =
      response.ok &&
      statusPass &&
      questionPass &&
      optionsPass &&
      reasonPass &&
      expectedHit &&
      !forbiddenHit;

    turnRuns.push({
      turn: turnIndex + 1,
      query: turn.query,
      expectedStatus: turn.expectedStatus,
      actualStatus: result.status,
      expectedTop3: turn.expectedTop3 ?? [],
      actualTop3: top3,
      optionCount: options.length,
      clarificationReason: result.clarificationReason,
      rejectionReason: result.rejectionReason,
      retrievalMode: result.retrievalMode,
      candidateCount: result.candidateCount,
      traceId: result.traceId,
      latencyMs: Date.now() - startedAt,
      passed,
    });
    process.stdout.write(
      `${passed ? "PASS" : "FAIL"} ${testCase.id}.${turnIndex + 1}\n`,
    );

    if (!["needs_clarification", "rejected"].includes(result.status)) {
      successfulApiCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 4_200));
    }
  }

  caseRuns.push({
    id: testCase.id,
    category: testCase.category,
    notes: testCase.notes,
    passed:
      turnRuns.length === testCase.turns.length &&
      turnRuns.every((turn) => turn.passed),
    turns: turnRuns,
  });
}

const flatTurns = caseRuns.flatMap((item) =>
  item.turns.map((turn) => ({ caseId: item.id, ...turn })),
);
const passedCases = caseRuns.filter((item) => item.passed).length;
const passedTurns = flatTurns.filter((item) => item.passed).length;
const caseRate = Math.round((passedCases / caseRuns.length) * 1000) / 10;
const turnRate = Math.round((passedTurns / flatTurns.length) * 1000) / 10;
const output = {
  generatedAt: new Date().toISOString(),
  mode: "rrank-only-baseline",
  model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
  totalCases: caseRuns.length,
  passedCases,
  casePassRate: caseRate,
  totalTurns: flatTurns.length,
  passedTurns,
  turnPassRate: turnRate,
  modelSearchCalls: successfulApiCalls,
  notes: "Bypass analyzeSearchIntent. retrieve Top 20 → Gemini rerank Top 5.",
  cases: caseRuns,
};
await writeFile(tracePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const rows = flatTurns.map((run) =>
  `| ${run.caseId}.${run.turn} | ${run.passed ? "PASS" : "FAIL"} | ${run.expectedStatus} | ${run.actualStatus} | ${run.actualTop3.join(", ") || "—"} | ${run.optionCount ?? 0} |`,
);
const report = `# Golden-set baseline rerank-only (bypass intent layer)

- Generated: ${output.generatedAt}
- Model: \`${output.model}\`
- Mode: retrieve Top 20 → Gemini rerank Top 5 (không qua \`analyzeSearchIntent\`)
- Cases: **${passedCases}/${caseRuns.length} (${caseRate}%)**
- Conversation turns: **${passedTurns}/${flatTurns.length} (${turnRate}%)**
- Gemini calls: ${output.modelSearchCalls}

| Turn | Result | Expected status | Actual status | Actual Top 3 | Options |
|---|---|---|---|---|---:|
${rows.join("\n")}
`;
await writeFile(reportPath, report, "utf8");
process.stdout.write(
  `Baseline rerank: ${passedCases}/${caseRuns.length} cases; ${passedTurns}/${flatTurns.length} turns\n`,
);
process.stdout.write(`Trace: ${tracePath}\nReport: ${reportPath}\n`);
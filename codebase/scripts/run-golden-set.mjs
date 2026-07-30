import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

process.loadEnvFile(".env.local");

const goldenPath = fileURLToPath(new URL("../../eval/golden-set.json", import.meta.url));
const tracePath = fileURLToPath(new URL("../../eval/traces/run-02.json", import.meta.url));
const reportPath = fileURLToPath(new URL("../../eval/run-02-results.md", import.meta.url));
const cases = JSON.parse(await readFile(goldenPath, "utf8"));

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("eval", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function search(query) {
  const response = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    }),
    env,
    ctx,
  );
  return { response, result: await response.json() };
}

function resolveTurnQuery(turn, previousResult) {
  if (turn.query) return turn.query;
  const options = previousResult?.clarificationOptions ?? [];
  const option = turn.selectOptionResourceId
    ? options.find((item) => item.resourceId === turn.selectOptionResourceId)
    : options[turn.selectOptionIndex ?? -1];
  if (!option?.query) {
    throw new Error("Expected clarification option was not returned.");
  }
  return option.query;
}

const caseRuns = [];
let successfulApiCalls = 0;
for (const testCase of cases) {
  const turnRuns = [];
  let previousResult = null;

  for (const [turnIndex, turn] of testCase.turns.entries()) {
    let query;
    try {
      query = resolveTurnQuery(turn, previousResult);
    } catch (error) {
      turnRuns.push({
        turn: turnIndex + 1,
        query: null,
        expectedStatus: turn.expectedStatus,
        actualStatus: "not_run",
        actualTop3: [],
        passed: false,
        failure: error.message,
      });
      break;
    }

    const startedAt = Date.now();
    const { response, result } = await search(query);
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
      query,
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
  model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
  totalCases: caseRuns.length,
  passedCases,
  casePassRate: caseRate,
  totalTurns: flatTurns.length,
  passedTurns,
  turnPassRate: turnRate,
  modelSearchCalls: successfulApiCalls,
  cases: caseRuns,
};
await writeFile(tracePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const rows = flatTurns.map((run) =>
  `| ${run.caseId}.${run.turn} | ${run.passed ? "PASS" : "FAIL"} | ${run.expectedStatus} | ${run.actualStatus} | ${run.actualTop3.join(", ") || "—"} | ${run.optionCount ?? 0} |`,
);
const report = `# Golden-set run 02 — clarification-first

- Generated: ${output.generatedAt}
- Model: \`${output.model}\`
- Policy: reject out-of-scope → clarify vague/multi-intent → retrieve Top 20 → Gemini rerank Top 5
- Cases: **${passedCases}/${caseRuns.length} (${caseRate}%)**
- Conversation turns: **${passedTurns}/${flatTurns.length} (${turnRate}%)**

| Turn | Result | Expected status | Actual status | Actual Top 3 | Options |
|---|---|---|---|---|---:|
${rows.join("\n")}
`;
await writeFile(reportPath, report, "utf8");
process.stdout.write(
  `Golden set: ${passedCases}/${caseRuns.length} cases; ${passedTurns}/${flatTurns.length} turns\n`,
);
process.stdout.write(`Trace: ${tracePath}\nReport: ${reportPath}\n`);

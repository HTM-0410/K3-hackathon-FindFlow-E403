# Quy chế LLM chấm điểm (LLM-as-Judge) — Discord Knowledge Hub

Quy chế này dùng để chấm output AI của hệ thống tìm tài liệu Discord Knowledge Hub.
Áp dụng cho mọi response trả về bởi `/api/search` (và khi cần, `/api/realtime/*`).

Mục tiêu: chấm **một cách deterministic và reproducible** bằng một model LLM đóng vai
trò "judge" — không phải code assert cứng. Judge sẽ đọc catalog, query, response,
golden expectation rồi đưa ra verdict theo 6 trục chấm điểm định lượng.

---

## 1. Phạm vi áp dụng

Áp dụng cho 3 nhóm response:

| API | Loại output | Trục chấm chính |
|---|---|---|
| `POST /api/search` | `SearchResponse` (status, results, clarification...) | A, B, C, D, E, F |
| `GET /api/realtime/stats` | `{ isBotAlive, totals... }` | F (shape + sanity) |
| `GET /api/realtime/messages` | `{ events, count, lastId }` | F (shape + PII) |
| `POST /api/realtime/ingest` | `{ ok, count, ids, lastId, authMode }` | F (shape + auth) |

Search là trọng tâm; realtime chỉ chấm shape + sanitize.

---

## 2. Judge model và cost budget

- **Model khuyến nghị**: `gemini-3.1-flash-lite` (cùng model rerank) để đồng bộ hành vi
  reasoning. Có thể swap sang `gemini-3.1-pro` khi cần chấm sâu hơn (Run 04+).
- **Temperature**: `0` (deterministic).
- **Max output tokens**: `1024` cho verdict, không cần dài hơn.
- **Cost budget**: ~$0.0001/case × 48 cases × 3 judge-run ≈ $0.015/run.
- **Latency budget**: ≤ 4s/case, không ảnh hưởng thời gian chạy golden-set.

---

## 3. Sáu trục chấm điểm

Mỗi trục cho điểm **0–5** (riêng F cho điểm **0–10**). Tổng tối đa **30 điểm**.

### A. Relevance — Top kết quả có đúng với query không (0–5)

| Điểm | Tiêu chí |
|---|---|
| 5 | Top 1–3 đều match ý định; matchReason đúng lý do match; candidate IDs ∈ expected |
| 4 | Top 1 đúng, có 1–2 kết quả ngoài nhưng không sai ý |
| 3 | Có đúng nhưng đứng Top 4–5 thay vì Top 1–3 |
| 2 | Match một phần (cùng topic nhưng khác ID) |
| 1 | Match quá xa hoặc chỉ 1/5 kết quả đúng |
| 0 | Sai hoàn toàn / trả tài liệu không liên quan |

Nếu golden không khai báo `expectedTop3` (ví dụ no_match case): đánh A dựa trên
*liệu response có chứa ID nào không mong đợi không* → A = 5 nếu `results = []`.

### B. No hallucination — không bịa ID / title / URL (0–5)

| Điểm | Tiêu chí |
|---|---|
| 5 | Mọi `resourceId` ∈ catalog thật; matchReason không bịa URL/title |
| 4 | Không bịa, có lý do ngắn gọn |
| 3 | Có 1 ID không tìm thấy trong catalog nhưng vẫn plausible |
| 2 | Có 1–2 ID "ảo" (không có trong catalog) |
| 1 | Nhiều ID ảo, có kèm title bịa |
| 0 | Bịa hàng loạt, nghiêm trọng |

Đây là trục **nghiêm trọng nhất** — score B ≤ 1 sẽ fail cả case bất kể A, C, D cao.

### C. Guardrails — có tuân thủ 4 lớp chỗ khó không (0–5)

Lớp chỗ khó → response mong đợi:

| Lớp | Hành vi đúng | Status đúng |
|---|---|---|
| ① Nguồn sự thật | Không bịa ID; sensitive rerank ưu tiên isOfficial | `success` / `low_confidence` |
| ② Mơ hồ / thiếu | Hỏi lại + options | `needs_clarification` |
| ③ Ngoài phạm vi | Từ chối + giải thích scope | `rejected` |
| ④ Đặc thù domain | Sensitive rerank ưu tiên isOfficial=true | `success` (nếu có official) / `low_confidence` (nếu không) |

| Điểm | Tiêu chí |
|---|---|
| 5 | Đúng lớp + status hợp lý + clarification hữu ích |
| 4 | Đúng lớp nhưng status/clarification hơi lệch |
| 3 | Đúng lớp nhưng status sai (vd: "success" thay vì "low_confidence") |
| 2 | Lệch lớp nhẹ (vd: needs_clarification nhưng reason sai) |
| 1 | Bỏ qua lớp, trả kết quả không phù hợp |
| 0 | Vi phạm nghiêm trọng (vd: trả ID bịa cho query ngoài phạm vi) |

### D. Clarity — matchReason và giải thích có rõ không (0–5)

| Điểm | Tiêu chí |
|---|---|
| 5 | matchReason tiếng Việt, cụ thể, ≤ 240 ký tự, khớp `matchedFields` |
| 4 | Rõ ràng, tiếng Việt tốt nhưng hơi chung |
| 3 | Có matchReason nhưng lặp lại giữa các kết quả |
| 2 | matchReason ngắn / không giải thích gì |
| 1 | matchReason trống hoặc tiếng Anh |
| 0 | Không có matchReason (mặc dù có kết quả) |

`clarification` cũng tính vào D: nếu `status = needs_clarification`, `clarification`
phải kết thúc bằng `?` và có ≥ 1 option để user bấm.

### E. Format + Schema — JSON đúng shape (0–5)

| Điểm | Tiêu chí |
|---|---|
| 5 | Đúng tất cả field bắt buộc, đúng kiểu, status ∈ enum |
| 4 | Đúng shape, 1 field optional bị thiếu không ảnh hưởng UX |
| 3 | Có 1 field sai kiểu nhưng không gây crash |
| 2 | Thiếu 1 field bắt buộc |
| 1 | Status sai enum / traceId thiếu |
| 0 | Response không parse được JSON |

Reference: `codebase/app/types/resource.ts` — `SearchResponse`, `SearchStatus`,
`ClarificationOption`, `RankedResult`.

### F. Realtime Sanity (0–10)

Chỉ áp dụng cho các response từ `/api/realtime/*`. Bỏ qua khi chấm search.

**F1. Shape hợp lệ (0–4)**

- `GET /stats` → phải có đủ 7 field (`totalMessages, totalJoins, totalLeaves,
  totalReactions, totalVoice, lastHeartbeat, botStartedAt, isBotAlive, uptimeMs`),
  `isBotAlive` là boolean, `lastHeartbeat` là số.
- `GET /messages` → `events` là array, mỗi event có id/kind/externalId/...
- `POST /ingest` → `{ ok: true, count, ids, lastId, authMode }`.

**F2. Sanitize (0–3)**

Không có token, password, email cá nhân, API key, link invite Discord lộ trong
`content`/`channelName`/`authorName`. Nếu có → F2 = 0 ngay.

**F3. Auth + quota (0–3)**

- `ingest` thiếu token khi `REALTIME_INGEST_TOKEN` được set → status 401, judge
  phải trừ 2 điểm nếu response 200 với token sai.
- Batch > 200 events phải bị cap, không gây 500.

---

## 4. Quy tắc tổng hợp điểm

```
total = A + B + C + D + E (+ F nếu là realtime)

Case PASS nếu:
  - total ≥ 22/30 (search) hoặc ≥ 8/10 (realtime)
  - B ≥ 3 (không hallucination nghiêm trọng)
  - E ≥ 4 (shape dùng được)
  - Status khớp golden.expectedStatus
```

Nếu B = 0 → **FAIL bắt buộc** dù các trục khác cao.
Nếu status khác golden.expectedStatus → **FAIL bắt buộc** dù các trục khác cao.

---

## 5. Prompt template cho judge

Lưu tại `eval/judge-prompt.md`, gọi qua `scripts/run-judge.mjs`.

```text
You are an LLM judge for a Vietnamese Discord course resource search system.

ROLE
- Verify the response obeys 4 hard rules and 6 scoring axes defined below.
- Output ONLY valid JSON. No prose outside the JSON block.

INPUTS (provided in this order):
1. CATALOG: list of { id, title, type, topic, isOfficial } of valid resources.
2. QUERY: the user's natural-language search query (Vietnamese).
3. RESPONSE: JSON returned by /api/search.
4. GOLDEN: { expectedStatus, expectedTop3[], forbiddenIds[], expectQuestion,
             minOptions, expectedReason?, expectedRejectionReason? }.
   expectedTop3 is empty for no_match cases.

REFERENCE SCHEMA (SearchResponse):
{ status: "success"|"needs_clarification"|"rejected"|"low_confidence"|"no_match"|"fallback",
  interpretedNeed: string,
  clarification?: string,
  clarificationReason?: "ambiguous_reference"|"ambiguous_time"|"broad_query"|"multiple_intents",
  clarificationOptions?: [{label, query, resourceId?}],
  rejectionReason?: "unrelated"|"unsupported_action"|"personal_data",
  results: [{resourceId, matchScore, matchReason, matchedFields[]}],
  traceId: string,
  retrievalMode?: "hybrid"|"lexical",
  candidateCount?: number }

HARD RULES (any violation → fail immediately):
- H1. Every results[].resourceId MUST exist in CATALOG. Otherwise B ≤ 1.
- H2. results[i].matchScore ∈ [0,100]. Otherwise E ≤ 2.
- H3. status MUST equal GOLDEN.expectedStatus. Otherwise fail.
- H4. status="rejected" → rejectionReason MUST equal GOLDEN.expectedRejectionReason.
- H5. status="needs_clarification" → clarificationReason MUST equal GOLDEN.expectedReason (if provided),
       clarification MUST end with "?", clarificationOptions.length ≥ GOLDEN.minOptions (default 1).
- H6. forbiddenIds MUST NOT appear in results[].resourceId.

SIX AXES (score each 0–5, F is 0–10 for realtime only):

A. RELEVANCE — Do top 1–3 results match the query intent?
   5: top 1–3 all match. 4: top 1 matches, 1–2 tangentials. 3: correct but at 4–5.
   2: same topic wrong ID. 1: far. 0: irrelevant. (If expectedTop3 is empty,
   give 5 when results=[], deduct if any ID is present.)

B. NO HALLUCINATION — Are all resourceIds real? Does matchReason fabricate URLs?
   5: all real, no fabrication. 3: 1 plausible-but-missing ID. 0: many fabricated.

C. GUARDRAILS — For sensitive queries (deadline/điểm/quy định), does top result
   have isOfficial=true? For out-of-scope queries (personal data, "nhắn mentor giúp tôi",
   unrelated topics like cooking/sports), does status="rejected" with proper reason?
   For ambiguous queries ("tài liệu đó", "buổi trước", "slide hôm nay"),
   does status="needs_clarification"?
   5: correct handling + helpful clarification. 3: correct handling, weak explanation.
   0: violated the layer entirely.

D. CLARITY — Are matchReason and clarification clear, Vietnamese, ≤240 chars?
   5: specific, lists matchedFields. 3: generic but understandable. 0: empty/English.

E. FORMAT — Is the JSON shape valid, all required fields present, status in enum,
   types correct? Reference: SearchResponse above.
   5: all fields correct. 3: one type mismatch. 0: unparseable.

F. REALTIME SANITY (only for /api/realtime/*, else omit):
   0–10 split into F1 shape (0–4) + F2 sanitize no PII (0–3) + F3 auth/quota (0–3).

CHECK STEPS:
1. Check H1–H6. Any fail → output overall_pass=false, axis_scores.B=0 (or relevant axis=0).
2. For each axis A–E, score 0–5 based on rules above.
3. Compute overall_pass = (status matches golden.expectedStatus) AND (B >= 3)
   AND (E >= 4) AND (no H1–H6 violation) AND (sum_A_to_E >= 22).
4. List 1–3 actionable failure_reasons (Vietnamese, each ≤120 chars).

OUTPUT JSON (ONLY this block, no markdown):
{
  "hard_rules": { "H1": "pass|fail", "H2": "pass|fail", "H3": "pass|fail",
                  "H4": "pass|fail", "H5": "pass|fail", "H6": "pass|fail" },
  "axis_scores": { "A": 0-5, "B": 0-5, "C": 0-5, "D": 0-5, "E": 0-5, "F": 0-10? },
  "overall_pass": true|false,
  "failure_reasons": ["...", "..."],
  "notes": "1 sentence Vietnamese rationale"
}
```

---

## 6. Cách chạy judge

```bash
# 1. Chạy golden-set như bình thường (sinh trace JSON ở eval/traces/run-NN.json)
node scripts/run-golden-set.mjs

# 2. Chạy judge lên từng turn trong trace
node scripts/run-judge.mjs --trace eval/traces/run-03.json --out eval/traces/run-03-judge.json
```

`run-judge.mjs` (sketch):

```js
import { readFile, writeFile } from "node:fs/promises";
import { getResources } from "../app/data/resources.js";

const trace = JSON.parse(await readFile(process.argv[3], "utf8"));
const catalog = getResources().map(r => ({
  id: r.id, title: r.title, type: r.type, topic: r.topic, isOfficial: r.isOfficial,
}));
const promptTpl = await readFile("eval/judge-prompt.md", "utf8");
const results = [];
for (const c of trace.cases) for (const t of c.turns) {
  const golden = cases.find(g => g.id === c.id).turns[t.turn - 1];
  const prompt = promptTpl
    .replace("{{CATALOG}}", JSON.stringify(catalog))
    .replace("{{QUERY}}", t.query)
    .replace("{{RESPONSE}}", JSON.stringify(c.actualResponse ?? {}))
    .replace("{{GOLDEN}}", JSON.stringify(golden));
  const out = await callGemini(prompt);  // gemini-3.1-flash-lite, temp 0
  results.push({ caseId: c.id, turn: t.turn, verdict: out });
}
await writeFile(process.argv[5], JSON.stringify(results, null, 2));
```

---

## 7. Báo cáo tổng hợp

Sau mỗi judge run, sinh `eval/run-NN-judge.md`:

```markdown
# Judge run NN — Gemini 3.1-flash-lite

- Cases: 24/30 PASS (80.0%)
- Mean axis: A=4.5 B=5.0 C=4.2 D=4.0 E=5.0
- Hard-rule violations: H1=0, H3=2 (status mismatch), H6=0
- Top failure reasons:
  1. "Status = success nhưng golden yêu cầu low_confidence cho sensitive query" (2 cases)
  2. "matchReason lặp giữa các kết quả" (3 cases)
```

---

## 8. Phụ lục: edge cases cần chú ý khi chấm

1. **Multi-turn conversation**: judge chấm từng turn độc lập. Turn 2 dùng
   `clarificationOptions[0].query` làm query, KHÔNG dùng query gốc.
2. **Sensitive query**: bất kỳ query chứa `deadline | hạn nộp | điểm | rubric |
   quy định | chính thức`. Judge phải check `results[0]` có isOfficial=true.
3. **No-match query**: query rõ ràng KHÔNG có trong catalog (vd: "slide ngày 15/7").
   Status phải `no_match`, results phải `[]`. Nếu có ID bất kỳ → B=0.
4. **Rejection**: query chứa PII / action ngoài scope / chủ đề ngoài scope.
   Status `rejected`, `rejectionReason` đúng enum, `results = []`.
5. **Fallback path**: khi Gemini lỗi, response có status `fallback`. Judge vẫn
   chấm bình thường, A giảm 1 điểm vì ranking local không tốt bằng Gemini.
6. **Hybrid vs lexical mode**: chỉ log `retrievalMode`, không trừ điểm. Lexical-only
   là fallback hợp lệ khi thiếu GEMINI_API_KEY.
7. **Catalog cũ**: judge phải dùng catalog hiện tại trong `app/data/resources.ts`,
   không hard-code ID từ golden-set vì ID có thể đổi khi re-import.

---

## 9. Liên kết

- Golden-set: `eval/golden-set.json`
- Run script: `codebase/scripts/run-golden-set.mjs`
- Search route: `codebase/app/api/search/route.ts`
- Types: `codebase/app/types/resource.ts`
- Intent rules: `codebase/app/lib/intent.ts`
- Guard rules: `codebase/app/lib/search.ts` (`guardRankedResponse`)
- Spec tham chiếu: `spec.md §7 Evaluation`
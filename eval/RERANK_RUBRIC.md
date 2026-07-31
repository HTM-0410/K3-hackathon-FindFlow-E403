# Quy chế LLM chấm điểm OUTPUT RERANK — Discord Knowledge Hub

File này là **sub-rubric** chuyên đánh giá output của bước rerank (`rankWithGemini()`
trong `codebase/app/lib/gemini.ts`). Áp dụng cho mảng `RankedResult[]` trước khi
qua `guardRankedResponse()`.

Mục tiêu: chấm **chất lượng riêng của LLM reranker**, không phải toàn bộ flow.
Đây là nơi phát hiện:
- Score có đúng band không (90-100 title khớp, 75-89 summary, v.v.)
- Thứ tự có đúng — kết quả liên quan nhất có đứng đầu không
- Lý do matchReason có **trung thực** với metadata không
- Có leak ID ngoài catalog không
- Có trả về kết quả score < 40 (ranking quá "rộng tay")

---

## 1. Phạm vi

Input cho judge:
- `CATALOG`: `[{id, title, summary, type, topic, tags, keywords, sourceChannel,
   sharedBy, sharedAt, isOfficial}]` — toàn bộ metadata Gemini nhìn thấy
- `QUERY`: string người dùng
- `RERANK_OUTPUT`: JSON Gemini trả về (chưa qua guard), shape:
  ```json
  {
    "status": "success" | "low_confidence" | "no_match",
    "interpretedNeed": string,
    "clarification": string?,
    "results": [{
      "resourceId": string,
      "matchScore": 0-100,
      "matchReason": string,
      "matchedFields": string[]
    }]  // max 5
  }
  ```
- `GOLDEN` (optional): `{expectedRankedIds: [id1, id2, ...], topRelevanceFloor: 75}`

Output rerank qua `guardRankedResponse` sẽ thêm các kiểm tra shape (ID ∈ catalog,
score ≥ 50, không trùng). Judge chỉ đánh giá **raw rerank output**, không phải
output cuối.

---

## 2. Bốn trục chấm riêng cho rerank

Tổng tối đa **20 điểm**, gộp vào trục A/B/D/E của `JUDGE_RUBRIC.md` khi cần.

### R1. Ordering — Thứ tự có đúng quan hệ với relevance không (0–5)

Đo bằng cách so với "thứ tự lý tưởng" — danh sách ID sắp theo score lý thuyết
(dựa trên band tiêu chí ở §3). Nếu có GOLDEN.expectedRankedIds → dùng luôn.

| Điểm | Tiêu chí |
|---|---|
| 5 | Thứ tự rerank đúng với lý tưởng từ vị trí 1 đến cuối (hoặc khớp GOLDEN hoàn toàn) |
| 4 | Sai 1 vị trí swap giữa 2 ID kề nhau |
| 3 | Sai 1–2 vị trí, top 1 đúng |
| 2 | Top 1 sai, nhưng top 3 vẫn chứa đúng ID |
| 1 | Top 3 sai hoàn toàn nhưng có đúng ID trong top 5 |
| 0 | Không có ID đúng trong top 5, hoặc trả về ID ngoài catalog |

**Công thức Kendall-tau rút gọn** (chỉ cho top 5):
```
swaps = số cặp (i,j) với i<j mà rerank[i] đứng trước rerank[j]
       nhưng ideal[i] đứng sau ideal[j]
max_swaps = 5 * 4 / 2 = 10
ordering_score = max(0, 5 - swaps * 0.5)
```
Swaps ≤ 0 → 5 điểm; swaps = 10 → 0 điểm.

### R2. Score Band Fidelity — matchScore có đúng band không (0–5)

Theo system instruction hiện tại:

| Band | Tiêu chí | Điểm cho mỗi result đúng band |
|---|---|---|
| 90–100 | Title khớp chính xác với query | +1.0 |
| 75–89 | Summary hoặc topic khớp tốt | +0.7 |
| 60–74 | Tags hoặc keywords khớp | +0.5 |
| 40–59 | Liên quan nhưng không chắc chắn | +0.3 |
| < 40 | Không liên quan (PHẢI LOẠI) | -1.0 (mỗi ID trả về dưới 40) |

```
score_band = clamp(0, 5, sum_bands)
```

Judge đánh giá từng `results[i]` xem `matchScore` có nằm đúng band không.
Ví dụ: query "Repo Caveman tiết kiệm token" mà resource title = "Caveman
Context Compressor" → score 90–100 là đúng. Nếu Gemini trả 60 → sai band,
trừ điểm.

### R3. Faithfulness — matchReason/matchedFields có trung thực với metadata (0–5)

Đây là trục **phát hiện LLM bịa**:

| Điểm | Tiêu chí |
|---|---|
| 5 | Mọi token trong matchReason là fact từ metadata (title/summary/topic/...). matchedFields khớp thực tế |
| 4 | 1 claim nhỏ hơi suy diễn nhưng đúng |
| 3 | matchedFields chứa field không có trong catalog (vd: "author" trong khi metadata chỉ có sharedBy) |
| 2 | matchReason nói về nội dung không có trong summary |
| 1 | matchReason có URL/title bịa |
| 0 | matchReason là generic ("phù hợp", "liên quan") không nói gì cụ thể |

**Check cụ thể:**
- matchReason có chứa **token không tồn tại** trong title+summary+topic+tags+keywords không?
- matchedFields có chứa field nào ngoài 6 field được system prompt cho phép không?
  (Hợp lệ: title, summary, topic, tags, keywords, type. **Không hợp lệ**: author,
  date, url, score, v.v.)

### R4. Calibration & Coverage — Coverage và No-overflow (0–5)

Đo xem reranker có **"biết khi nào nên trả ít"** không:

| Điểm | Tiêu chí |
|---|---|
| 5 | No-match query → `status = "no_match"`, `results = []`. Không trả về match yếu |
| 4 | Match một phần → trả đúng số lượng (không thêm filler score thấp) |
| 3 | Hơi "tham" — trả 5 kết quả dù chỉ 1–2 thực sự liên quan (các cái còn lại score 40–55) |
| 2 | Trả kết quả score 40–49 chiếm ≥ 50% mảng |
| 1 | Trả kết quả score < 40 (vi phạm instruction "không trả score < 40") |
| 0 | status = "no_match" nhưng results vẫn có phần tử, hoặc status = "success" với results = [] |

Công thức Coverage Ratio:
```
coverage = max_score_returned / theoretical_max_score_for_query
if coverage < 0.4: status nên là "no_match" hoặc "low_confidence"
```

---

## 3. Bảng band reference cho judge

Judge dùng bảng này để quyết định `matchScore` có hợp lý không. Tính `theoretical_band`
cho từng ID bằng cách đếm token match giữa query (sau khi lowercase + bỏ dấu) với:

| Field weight | Trọng số |
|---|---|
| title (token xuất hiện trong query) | 1.0 |
| summary (token xuất hiện) | 0.5 |
| topic match | 0.6 |
| tags match | 0.4 |
| keywords match | 0.3 |
| type match | 0.2 |

Tổng weight → map sang band:
```
>= 1.5: 90-100
>= 1.0: 75-89
>= 0.6: 60-74
>= 0.3: 40-59
<  0.3: <40 (loại)
```

Nếu resource có `isOfficial = true` VÀ query thuộc sensitive (deadline/điểm/quy định):
cộng thêm `+0.5` vào weight (ưu tiên rerank).

---

## 4. Quy tắc tổng hợp

```
rerank_total = R1 + R2 + R3 + R4   (max 20)
PASS nếu:
  - rerank_total ≥ 14
  - R1 ≥ 3 (ordering không quá lệch)
  - R3 ≥ 3 (không bịa)
  - Không có results[i].matchScore < 40 (nếu có → R4 = 0, FAIL)
```

Nếu bất kỳ `resourceId` nào không tồn tại trong CATALOG → R1 = 0, FAIL bắt buộc
(catalog-leak = hallucination nghiêm trọng).

---

## 5. Prompt template cho rerank judge

```text
You are an LLM judge evaluating ONLY the rerank step of a Vietnamese Discord
course resource search. You do NOT judge intent, clarification, or fallback.

INPUTS:
1. CATALOG: [{id, title, summary, type, topic, tags, keywords, sourceChannel,
              sharedBy, sharedAt, isOfficial}]
2. QUERY: Vietnamese search query
3. RERANK_OUTPUT: raw JSON from Gemini rerank (BEFORE guardRankedResponse):
   { status, interpretedNeed, clarification?, results: [{resourceId, matchScore,
     matchReason, matchedFields}] }
4. GOLDEN (optional): { expectedRankedIds?, topRelevanceFloor? }

SCORING (4 axes, total 0–20):

R1. ORDERING (0–5):
   Compute ideal order by band + matched fields. Compare to rerank order.
   Count inversions in top 5 (swapped pairs). ordering_score = max(0, 5 - swaps*0.5).
   If expectedRankedIds provided, judge against it directly:
     - Top 1 correct: +2
     - Top 3 contain all expected: +2
     - Top 5 contain all expected: +1

R2. SCORE BAND (0–5):
   For each results[i], classify its matchScore into:
     [90-100]=title-exact, [75-89]=summary/topic, [60-74]=tags/keywords,
     [40-59]=weak, [<40]=should-not-return.
   Compare predicted band (from §3 weight table) vs actual band.
   +1.0 if exact match, +0.5 if adjacent band, -1.0 if 2+ bands off,
   -2.0 if returned with score < 40.

R3. FAITHFULNESS (0–5):
   For each results[i]:
   - Extract every claim-token from matchReason.
   - Check token exists in (title+summary+topic+tags+keywords) of that resource.
   - Check matchedFields is subset of {title,summary,topic,tags,keywords,type}.
   Score: 5 (all faithful), 3 (1-2 unfaithful), 0 (fabricated URL/title).

R4. CALIBRATION (0–5):
   - If query clearly has no match in catalog (coverage < 0.4), rerank should
     return status="no_match" + results=[].
   - If status="no_match" but results[] is non-empty → 0.
   - If results has any matchScore < 40 → 0.
   - If coverage ≥ 0.7 but only 1 result returned → -1.
   - If coverage < 0.4 but status="success" with 5 weak results → -2.

HARD RULES (any violation → fail):
- H1. Every resourceId MUST exist in CATALOG. Otherwise R1=0.
- H2. status MUST be one of {success, low_confidence, no_match}.
- H3. results.length ≤ 5.
- H4. matchScore ∈ [0,100] integer.

OUTPUT JSON (ONLY this block):
{
  "hard_rules": { "H1": "pass|fail", "H2": "pass|fail", "H3": "pass|fail",
                  "H4": "pass|fail" },
  "axes": { "R1": 0-5, "R2": 0-5, "R3": 0-5, "R4": 0-5 },
  "rerank_pass": true|false,
  "rerank_total": 0-20,
  "predicted_band": [{"id": "...", "band": "90-100|75-89|..."}],
  "actual_band": [{"id": "...", "band": "..."}],
  "mismatches": ["id X: predicted 75-89 but scored 60", ...],
  "fabrications": ["id Y: matchReason mentions 'release v2' but not in summary"],
  "notes": "1-2 sentence Vietnamese rationale"
}
```

---

## 6. Cách chạy rerank judge

`scripts/run-rerank-judge.mjs` (sketch):

```js
import { readFile, writeFile } from "node:fs/promises";
import { getResources } from "../app/data/resources.js";

const trace = JSON.parse(await readFile("eval/traces/run-NN.json", "utf8"));
const catalog = getResources().map(r => ({
  id: r.id, title: r.title, summary: r.summary, type: r.type,
  topic: r.topic, tags: r.tags, keywords: r.keywords,
  sourceChannel: r.sourceChannel, sharedBy: r.sharedBy,
  sharedAt: r.sharedAt, isOfficial: r.isOfficial,
}));

const promptTpl = await readFile("eval/RERANK_PROMPT.md", "utf8");
const out = [];
for (const c of trace.cases) {
  for (const t of c.turns) {
    if (!t.rawGeminiOutput) continue;  // chỉ chấm turn có rerank
    const prompt = promptTpl
      .replace("{{CATALOG}}", JSON.stringify(catalog))
      .replace("{{QUERY}}", t.query)
      .replace("{{RERANK_OUTPUT}}", JSON.stringify(t.rawGeminiOutput))
      .replace("{{GOLDEN}}", JSON.stringify(t.expectedRankedIds ?? {}));
    const verdict = await callGemini(prompt);  // gemini-3.1-flash-lite, temp 0
    out.push({ caseId: c.id, turn: t.turn, verdict });
  }
}
await writeFile("eval/traces/run-NN-rerank-judge.json",
  JSON.stringify(out, null, 2));
```

Để chạy được cần `trace` lưu thêm `rawGeminiOutput` (output Gemini trước khi
qua `guardRankedResponse`). Sửa `gemini.ts` → `writeTrace({ ... parsedOutput })`
đã có sẵn, chỉ cần thêm vào log khi trace mode = `eval`.

---

## 7. Báo cáo rerank-only

`eval/run-NN-rerank-judge.md`:

```markdown
# Rerank judge run NN

- Cases evaluated: 24
- Pass rate: 18/24 (75.0%)
- Mean axes: R1=4.1 R2=4.0 R3=4.7 R4=3.8
- Hard-rule violations:
  - H1 (catalog leak): 0
  - H4 (score out of range): 1  → case "baseline-05", rerank trả score=105
- Band mismatches (top 3):
  1. "synonym-01": predicted 75-89, actual 60-74 (off by 1 band)
  2. "baseline-03": predicted 60-74, actual 90-100 (over-score)
- Fabrications: 0
- Calibration issues:
  - 2 cases trả 5 kết quả với score 40-55 (nên là 2-3)
```

---

## 8. Edge cases khi chấm rerank

1. **Catalog có 50+ resources**: judge chỉ nhìn `RERANK_OUTPUT.results` (top 5)
   so với `CATALOG` đầy đủ — không phạt vì không trả hết.
2. **Score = 40**: hợp lệ theo system prompt ("≥ 40 mới trả"). Nhưng nếu coverage
   thấp → vẫn nên status="low_confidence", không phải "success".
3. **Sensitive query + không có isOfficial trong top 5**: rerank vẫn được,
   guard ở downstream sẽ downgrade thành `low_confidence`. Judge rerank không
   phạt trường hợp này.
4. **matchReason tiếng Anh trong khi query tiếng Việt**: trừ 1 điểm R3
   (tiếng Việt là expectation mặc định).
5. **matchedFields chứa field "score" hoặc "relevance"**: không nằm trong 6 field
   được phép → R3 = 0 ngay.
6. **Output rỗng** (`status="success"`, `results=[]`): R4 = 0, FAIL — đây là
   inconsistency nội tại (status nói có match nhưng không có result).

---

## 9. So sánh với `JUDGE_RUBRIC.md`

| Trục | JUDGE_RUBRIC (chấm response) | RERANK_RUBRIC (chấm rerank) |
|---|---|---|
| A. Relevance | Top 1–3 đúng? | R1: Ordering có đúng thứ tự không? |
| B. No hallucination | ID ∈ catalog? | R3: matchReason có bịa không? (sâu hơn) |
| D. Clarity | matchReason tiếng Việt, rõ? | R3 chấm faithfulness, không chấm style |
| E. Format | Shape SearchResponse | H1–H4 chỉ chấm shape RerankOutput |
| F. Realtime | — | — |
| (mới) | — | R2. Score Band Fidelity |
| (mới) | — | R4. Calibration & Coverage |

`RERANK_RUBRIC` là **telescoping**: chạy sau `JUDGE_RUBRIC`, chỉ khi case rerank
thực sự xảy ra (không phải no_match / needs_clarification / rejected).

---

## 10. Liên kết

- Rerank implementation: `codebase/app/lib/gemini.ts` (`rankWithGemini`)
- Guard logic: `codebase/app/lib/search.ts` (`guardRankedResponse`)
- System prompt: `codebase/app/lib/gemini.ts` SYSTEM_INSTRUCTION
- Output types: `codebase/app/types/resource.ts` (`RankedResult`)
- Parent rubric: `eval/JUDGE_RUBRIC.md`
- Golden set: `eval/golden-set.json`
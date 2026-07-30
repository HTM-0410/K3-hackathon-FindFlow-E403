# Golden Set V3 — Hướng dẫn & cấu trúc

> **Version:** 3.0  
> **Updated:** 2026-07-30  
> **Total Cases:** 30 test cases (32 turns, bao gồm 2 follow-up turns trong conversation flow)  
> **Quality Bar:** mọi case phải pass status + Top-3 khớp expected (xem `eval/scoring-guide.md`)

---

## 1. Cấu trúc file

`golden-set.json` là một JSON array; mỗi phần tử là một test case với schema:

```json
{
  "id": "baseline-01",
  "category": "direct_search",
  "notes": "Mô tả ngắn về case",
  "turns": [
    {
      "query": "Câu user nhập",
      "expectedStatus": "success",
      "expectedTop3": ["1531239417220431873"],
      "forbiddenIds": ["1530824087729995816"],
      "expectQuestion": false,
      "minOptions": 0,
      "expectedReason": "multiple_intents",
      "expectedRejectionReason": "unrelated"
    }
  ]
}
```

Field quan trọng:

- `query` — query user gửi (bắt buộc ở turn đầu).
- `expectedStatus` — một trong `success`, `low_confidence`, `needs_clarification`, `no_match`, `rejected`.
- `expectedTop3` — danh sách resourceId được phép xuất hiện trong Top 3. Một case pass khi **ít nhất 1 ID** trong `expectedTop3` nằm trong Top 3 thực tế.
- `forbiddenIds` — resourceId **không được** xuất hiện trong Top 3 (test ranking quality).
- `expectQuestion` — khi `true`, response phải kết thúc bằng dấu `?` (dùng cho `needs_clarification`).
- `minOptions` — số option tối thiểu trong `clarificationOptions` (dùng cho `needs_clarification`).
- `expectedReason` — giá trị của `clarificationReason` (dùng cho `needs_clarification`).
- `expectedRejectionReason` — giá trị của `rejectionReason` (dùng cho `rejected`).
- `selectOptionIndex` — thay cho `query` ở turn sau; dùng cho conversation flow (multi-intent → user chọn 1 option → success).

---

## 2. Phân bổ 30 case

| Lớp | Category | Số case | Mục tiêu test |
|-----|----------|---------|---------------|
| **Baseline — direct** | `direct_search` | 8 | Query có keyword rõ ràng trùng title → `success` |
| **Baseline — synonym** | `synonym_match` | 3 | Query paraphrase, dùng từ đồng nghĩa |
| **Layer 1 — Hallucination** | `no_match` | 3 | Tài liệu không tồn tại → `no_match`, không bịa |
| **Layer 2 — Ambiguity time** | `ambiguous_time` | 2 | "buổi trước", "hôm nọ" → `needs_clarification` |
| **Layer 2 — Ambiguity ref** | `ambiguous_reference` | 2 | "tài liệu đó", "link đó" → `needs_clarification` |
| **Layer 2 — Broad query** | `broad_query` | 1 | Query 1 từ khóa rộng → `needs_clarification` |
| **Layer 2 — Multi intents** | `multiple_intents` | 2 | 2 nhu cầu trong 1 câu → clarify rồi select 1 → `success` |
| **Layer 3 — Out of scope** | `unrelated`, `unsupported_action`, `personal_data` | 5 | `rejected` đúng lý do |
| **Layer 4 — Domain** | `domain_specific` | 2 | Thuật ngữ riêng khóa học (CP, VinUni-AI20k) |
| **Edge** | `mixed_language`, `no_diacritics` | 2 | Query tiếng Việt lẫn Anh, không dấu |

**Tổng:** 8 + 3 + 3 + 2 + 2 + 1 + 2 + 5 + 2 + 2 = 30 case (32 turns).

---

## 3. Quy tắc pass/fail cho mỗi chiều chất lượng

Một turn pass khi **TẤT CẢ** điều kiện sau đúng:

| Chiều | Điều kiện |
|-------|-----------|
| **Status match** | `result.status === turn.expectedStatus` |
| **Grounded** | Mọi `resourceId` trong `result.results` đều tồn tại trong catalog |
| **Relevant** | `expectedTop3.some(id => top3.includes(id))` (hoặc `expectedTop3` rỗng) |
| **Forbidden** | Không có `forbiddenIds` nào nằm trong Top 3 |
| **Clarification** | `expectQuestion ? clarification.endsWith("?") : true` |
| **Options** | `options.length >= minOptions` |
| **Reason** | `clarificationReason`/`rejectionReason` khớp `expectedReason`/`expectedRejectionReason` |

Case (multi-turn) chỉ pass khi mọi turn đều pass.

---

## 4. Cách chạy eval

```bash
cd codebase
npm run eval:golden
```

Output:
- `eval/traces/run-03.json` — full trace (kết quả từng turn, latency, retrieval mode, candidate count).
- `eval/run-03-results.md` — bảng tóm tắt pass/fail theo từng turn.

**Đổi model Gemini:**
```bash
GEMINI_MODEL=gemini-2.0-flash npm run eval:golden
```

---

## 5. ID catalog & cách đối chiếu

Mọi `resourceId` trong `expectedTop3` và `forbiddenIds` đều phải tồn tại trong `codebase/app/data/classified-resources.generated.ts` (catalog hiện tại có **77 items**).

Để lấy danh sách ID hiện hành:
```bash
grep -E '^\s+id: "[0-9]+",' codebase/app/data/classified-resources.generated.ts
```

---

## 6. Khi nào cần cập nhật golden set

- **Catalog thay đổi** (thêm/bớt resource, đổi ID) → rà lại `expectedTop3` và `forbiddenIds` cho từng case.
- **Thay đổi taxonomy status** (thêm status mới) → cập nhật `expectedStatus` enum.
- **Thay đổi conversation flow** (multi-turn handling) → cập nhật schema `turns`.
- **Phát hiện failure pattern** lặp lại qua nhiều run → thêm case mới để tái-test regression.

---

## 7. Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-07-30 | 3.0 | Thay thế v2 (48 case, ID giả) bằng 30 case dùng ID Discord thật, phủ đều 4 lớp + baseline + edge. Schema đơn giản hóa, bám sát `run-golden-set.mjs`. |
| 2026-07-30 | 2.0 | Golden set v2 48 case (đã xóa, dùng ID giả). |
| 2026-07-30 | 1.0 | Golden set ban đầu 24 case. |

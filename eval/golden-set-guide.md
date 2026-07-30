# Golden Set V2 — Hướng dẫn sử dụng và phân tích

> **Version:** 2.0  
> **Updated:** 2026-07-30  
> **Total Cases:** 48 test cases  
> **Quality Bar:** 85% overall pass rate

---

## 1. Tổng quan Golden Set

### Mục đích
Golden set là bộ test cases dùng để:
1. **Đo lường** chất lượng hệ thống một cách có hệ thống
2. **Phát hiện** regression khi thay đổi code
3. **Debug** khi có case thất bại
4. **Cải thiện** dựa trên evidence

### Cấu trúc file
```json
{
  "version": "2.0",
  "description": "Mô tả ngắn",
  "qualityBar": { ... },
  "testCases": [ ... ],
  "summary": { ... },
  "evaluationCriteria": { ... }
}
```

---

## 2. Phân loại Test Cases theo 4 Lớp Chỗ Khó

### Layer 0: Baseline (Dễ) — 10 cases
**Đặc điểm:** Query rõ ràng, có keywords trùng khớp trực tiếp với metadata.

| Category | Mô tả | Số case |
|----------|--------|---------|
| `very_easy` | Keywords trùng hoàn toàn với title/summary | 5 |
| `medium` | Cần partial/semantic match hoặc có nhiều keywords | 5 |

**Ví dụ:**
```typescript
{
  "id": "easy-01",
  "query": "Slide giới thiệu Hackathon",
  "expectedStatus": "success",
  "expectedTop3": ["res-001"]
}
```

**Kỳ vọng:** Hệ thống phải trả về đúng tài liệu với confidence cao.

---

### Layer 1: Hallucination Risk (Nguy hiểm) — 3 cases
**Đặc điểm:** Query có thể khiến AI tạo ra resource ID hoặc tài liệu không tồn tại.

| Category | Mô tả | Số case |
|----------|--------|---------|
| `hallucination_risk` | Query với ngày/tên cụ thể không có trong catalog | 3 |

**Ví dụ:**
```typescript
{
  "id": "hard-01",
  "query": "Tìm slide buổi học ngày 15 tháng 7 về RAG",
  "expectedStatus": "no_match",
  "notes": "Ngày cụ thể không có trong catalog - AI không được bịa"
}
```

**Kỳ vọng:** Hệ thống phải từ chối hoặc trả `no_match`, không được bịa resource ID.

**Tại sao quan trọng:** Đây là lớp nguy hiểm nhất vì:
- AI có thể tự tạo ra kết quả "như thật"
- User có thể tin và mở link giả mạo
- Ảnh hưởng trực tiếp đến trust của hệ thống

---

### Layer 2: Ambiguity (Mơ hồ) — 10 cases
**Đặc điểm:** Query không đủ thông tin để xác định chính xác nhu cầu user.

| Category | Mô tả | Số case |
|----------|--------|---------|
| `ambiguous_time` | Tham chiếu thời gian không xác định ("hôm qua", "buổi trước") | 2 |
| `ambiguous_reference` | Đại từ chỉ định ("đó", "cái này") | 2 |
| `broad_query` | Query quá rộng, thiếu context | 2 |
| `multiple_intents` | Nhiều nhu cầu trong một câu | 3 |
| `negation` | Query với phủ định | 1 |

**Ví dụ:**
```typescript
{
  "id": "hard-04",
  "query": "Slide buổi trước",
  "expectedStatus": "needs_clarification",
  "expectedReason": "ambiguous_time",
  "notes": "Phải hỏi lại user chính xác buổi nào"
}
```

**Kỳ vọng:** Hệ thống phải:
1. Phát hiện được ambiguity
2. Đặt câu hỏi làm rõ
3. Cung cấp options phù hợp

**Tại sao quan trọng:**
- Hệ thống không đoán được → tránh sai
- User được hỏi để xác nhận → tăng accuracy
- Cải thiện user experience

---

### Layer 3: Out of Scope (Ngoài phạm vi) — 8 cases
**Đặc điểm:** Query yêu cầu thứ hệ thống không được phép hoặc không có khả năng làm.

| Category | Mô tả | Số case |
|----------|--------|---------|
| `unrelated` | Nội dung hoàn toàn không liên quan đến khóa học | 2 |
| `unsupported_action` | Yêu cầu thực hiện hành động thay user | 3 |
| `personal_data` | Hỏi thông tin cá nhân | 3 |

**Ví dụ:**
```typescript
{
  "id": "hard-16",
  "query": "Nhắn mentor xin nghỉ giúp tôi",
  "expectedStatus": "rejected",
  "expectedRejectionReason": "unsupported_action",
  "notes": "Không được thực hiện hành động trên Discord"
}
```

**Kỳ vọng:** Hệ thống phải:
1. Từ chối rõ ràng với lý do
2. Giải thích được hệ thống làm gì
3. Hướng dẫn user đến nơi phù hợp (nếu có)

**Tại sao quan trọng:**
- An toàn cho user và hệ thống
- Tránh được các yêu cầu không phù hợp
- Xây dựng trust qua sự minh bạch

---

### Layer 4: Domain Specific (Đặc thù domain) — 8 cases
**Đặc điểm:** Query đòi hỏi hiểu biết về domain của khóa học.

| Category | Mô tả | Số case |
|----------|--------|---------|
| `official_source_priority` | Ưu tiên nguồn chính thức cho deadline/điểm | 3 |
| `version_confusion` | Phân biệt các phiên bản tài liệu | 1 |
| `source_channel` | Query về kênh cụ thể | 1 |
| `domain_specific` | Thuật ngữ riêng của khóa học | 3 |

**Ví dụ:**
```typescript
{
  "id": "hard-22",
  "query": "Deadline nộp CP4",
  "expectedStatus": "success",
  "expectedTop3": ["res-034", "res-045"],
  "notes": "Phải ưu tiên announcement chính thức"
}
```

**Kỳ vọng:** Hệ thống phải:
1. Ưu tiên nguồn `isOfficial: true` cho các query nhạy cảm
2. Hiểu được abbreviations (CP = Checkpoint)
3. Phân biệt được version của tài liệu

**Tại sao quan trọng:**
- Deadline/score có hậu quả thực tế cho user
- Sai thông tin → ảnh hưởng điểm số
- Trust của user phụ thuộc vào độ chính xác

---

### Edge Cases (Trường hợp đặc biệt) — 10 cases
**Đặc điểm:** Query có characteristics đặc biệt cần xử lý riêng.

| Category | Mô tả | Số case |
|----------|--------|---------|
| `no_diacritics` | Không dấu tiếng Việt | 1 |
| `typo` | Có lỗi chính tả | 1 |
| `mixed_language` | Trộn tiếng Việt và Anh | 1 |
| `abbreviation` | Sử dụng từ viết tắt | 2 |
| `empty_catalog` | Không có kết quả trong catalog | 1 |
| `very_long_query` | Query rất dài | 1 |
| `synonym` | Dùng từ đồng nghĩa | 2 |
| `conceptual_with_specific` | Trộn khái niệm và yêu cầu cụ thể | 1 |

**Ví dụ:**
```typescript
{
  "id": "edge-02",
  "query": "tim ma nguon goi gemni api typescrpt",
  "expectedStatus": "success",
  "expectedTop3": ["res-027"],
  "notes": "Phải handle được typo nặng"
}
```

---

## 3. Chiều chất lượng (Evaluation Dimensions)

### 3.1 Grounded (Tính căn cứ)
**Mục đích:** Đảm bảo AI không bịa đặt kết quả.

| Pass | Fail |
|------|------|
| Mọi resourceId đều tồn tại trong catalog | Có resourceId không tồn tại |

```typescript
// Kiểm tra: mọi resourceId trong results phải có trong catalog
function checkGrounded(results, catalog) {
  return results.every(r => catalog.has(r.resourceId));
}
```

### 3.2 Relevant (Tính liên quan)
**Mục đích:** Đảm bảo kết quả đúng với nhu cầu user.

| Pass | Fail |
|------|------|
| Ít nhất 1 tài liệu kỳ vọng trong Top 3 | Không có tài liệu kỳ vọng trong Top 3 |

```typescript
// Kiểm tra: expectedTop3 phải giao với actualTop3
function checkRelevant(expectedTop3, actualTop3) {
  return expectedTop3.some(id => actualTop3.includes(id));
}
```

### 3.3 Status Match (Khớp trạng thái)
**Mục đích:** Đảm bảo hệ thống phản hồi đúng loại.

| Expected Status | Khi nào |
|----------------|----------|
| `success` | Query rõ ràng, có kết quả phù hợp |
| `low_confidence` | Query có căn cứ nhưng không chắc chắn |
| `needs_clarification` | Query mơ hồ, thiếu thông tin |
| `no_match` | Không có tài liệu nào phù hợp |
| `rejected` | Query ngoài phạm vi hoặc yêu cầu bị từ chối |

### 3.4 Graceful Failure (Thất bại thanh lịch)
**Mục đích:** Hệ thống phải fail một cách hữu ích.

| Pass | Fail |
|------|------|
| Query out-of-scope → `rejected` | Trả kết quả sai cho out-of-scope |
| Query no-match → `no_match` | Bịa kết quả |

### 3.5 Clarification Quality (Chất lượng làm rõ)
**Mục đích:** Khi hỏi lại, phải hỏi đúng cách.

| Pass | Fail |
|------|------|
| Có `question` rõ ràng | Không có câu hỏi |
| Có `options` phù hợp (≥3) | Options không liên quan |
| Options chứa keywords từ query | Options không liên quan đến query |

---

## 4. Quality Bar

### 4.1 Định nghĩa Quality Bar

```json
{
  "grounded": "100%",
  "relevant": "85%",
  "gracefulFailure": "100%",
  "overall": "85%"
}
```

**Ý nghĩa:**
- **Grounded 100%:** Không bao giờ được bịa kết quả (hard requirement)
- **Relevant 85%:** Ít nhất 85% queries có kết quả đúng trong Top 3
- **Graceful Failure 100%:** Tất cả failure cases phải fail đúng cách
- **Overall 85%:** Tổng thể phải đạt 85%

### 4.2 Cách đọc kết quả

```
┌─────────────────────────────────────────────────────────┐
│                    EVALUATION REPORT                     │
├─────────────────────────────────────────────────────────┤
│  Total Cases: 48                                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ PASS: 42 (87.5%)                                │    │
│  │ FAIL: 6 (12.5%)                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  Grounded:     48/48 (100%) ✅                          │
│  Relevant:     41/48 (85.4%) ✅                          │
│  Graceful:      48/48 (100%) ✅                          │
│                                                          │
│  STATUS BREAKDOWN:                                       │
│  ├─ success:           20 cases  (42%)                  │
│  ├─ low_confidence:     7 cases  (15%)                  │
│  ├─ needs_clarify:     8 cases  (17%)                  │
│  ├─ no_match:           5 cases  (10%)                  │
│  └─ rejected:           8 cases  (17%)                  │
│                                                          │
│  LAYER BREAKDOWN:                                       │
│  ├─ Layer 1 (Hallucination): 3/3 (100%) ✅              │
│  ├─ Layer 2 (Ambiguity):   9/10 (90%) ⚠️              │
│  ├─ Layer 3 (Out of Scope):8/8 (100%) ✅                │
│  └─ Layer 4 (Domain):      7/8  (87.5%) ✅              │
│                                                          │
│  RESULT: PASS ✅ (>= 85%)                               │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Cách sử dụng Golden Set

### 5.1 Chạy eval đơn lẻ

```bash
cd codebase
npm run eval:golden
```

### 5.2 Chạy với model cụ thể

```bash
GEMINI_MODEL=gemini-1.5-flash npm run eval:golden
```

### 5.3 Thêm test case mới

1. Thêm vào `golden-set-v2.json`:
```json
{
  "id": "new-case-01",
  "layer": "layer2_ambiguity",
  "difficulty": "hard",
  "query": "Query mới",
  "expectedStatus": "...",
  ...
}
```

2. Chạy eval:
```bash
npm run eval:golden
```

3. Kiểm tra kết quả trong `eval/run-XX-results.md`

### 5.4 Debug case thất bại

1. Đọc trace trong `eval/traces/run-XX.json`
2. Tìm case thất bại theo `id`
3. Kiểm tra:
   - Query được hiểu đúng chưa?
   - Intent detection có hoạt động không?
   - Candidates có được retrieve đúng không?
   - Gemini rerank có vấn đề gì không?

---

## 6. Kế hoạch cải thiện

### Priority 1: Fix Layer 2 Ambiguity (nếu fail)

**Vấn đề thường gặp:**
- `detectMultipleIntents` không bắt được implicit conjunction
- Không xử lý được negation

**Hành động:**
1. Thêm pattern cho implicit conjunction: "slide Hackathon + guide rubric"
2. Thêm xử lý negation: "không phải", "không liên quan"

### Priority 2: Fix Layer 4 Domain (nếu fail)

**Vấn đề thường gặp:**
- Không ưu tiên `isOfficial` cho sensitive queries
- Không expand abbreviations

**Hành động:**
1. Kiểm tra `guardRankedResponse` trong `search.ts`
2. Thêm abbreviation expansion vào `candidate-provider.ts`

### Priority 3: Improve Edge Cases

**Vấn đề thường gặp:**
- Typo handling không tốt
- Mixed language không xử lý

**Hành động:**
1. Cải thiện `normalizeText` để xử lý better
2. Thêm more synonyms vào query expansion

---

## 7. Summary Statistics

### Theo độ khó

| Difficulty | Cases | % |
|------------|-------|---|
| Very Easy | 5 | 10% |
| Medium | 8 | 17% |
| Hard | 25 | 52% |
| Edge | 10 | 21% |

### Theo expected status

| Status | Cases | % |
|--------|-------|---|
| success | 20 | 42% |
| low_confidence | 7 | 15% |
| needs_clarification | 8 | 17% |
| no_match | 5 | 10% |
| rejected | 8 | 17% |

### Theo layer

| Layer | Cases | Min Required |
|-------|-------|-------------|
| Layer 1: Hallucination | 3 | 2 |
| Layer 2: Ambiguity | 10 | 2 |
| Layer 3: Out of Scope | 8 | 2 |
| Layer 4: Domain | 8 | 2 |
| Edge Cases | 10 | - |

---

## 8. Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-07-30 | 2.0 | Mở rộng từ 24 → 48 cases, thêm layer classification |
| 2026-07-30 | 1.0 | Golden set ban đầu |

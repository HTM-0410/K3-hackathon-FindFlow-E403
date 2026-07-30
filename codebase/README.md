# Discord Knowledge Hub — semantic search prototype

Frontend prototype cho ba flow A, B, C của CP2, dùng catalog 50 tài liệu mock.
Hệ thống tìm và xếp hạng tài liệu có nguồn; không tạo câu trả lời thay tài liệu,
không crawl Discord và không có đăng nhập hay trang quản trị.

## Kiến trúc tìm kiếm

```text
query + filters
  → lexical retrieval
  + query embedding so với 50 document embeddings đã tạo trước
  → Reciprocal Rank Fusion
  → tối đa 20 candidate
  → Gemini rerank
  → guard ID/schema/threshold
  → tối đa 5 kết quả có nguồn
```

Gemini không đọc tuần tự toàn bộ kho tài liệu trong mỗi lần tìm. Chỉ query
embedding được tạo lúc runtime; document embeddings được tạo trước. Khi dữ liệu
lớn hơn, thay `CandidateProvider` bằng FTS + vector database mà không đổi API
hoặc UI.

## Chạy local

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
copy .env.example .env.local
npm run embeddings:generate
npm run dev
```

Điền `GEMINI_API_KEY` trong `.env.local`. File này bị git ignore. Không đặt key
trong code, commit, trace hoặc dữ liệu deploy.

Nếu không có key, API tự chuyển sang keyword fallback và UI hiển thị rõ
“Đang dùng tìm kiếm cơ bản”.

## Lệnh kiểm tra

```bash
npm run typecheck
npm test
npm run build
npm run eval:golden
```

- `npm test` cố ý tắt API ngoài để kiểm tra fallback ổn định.
- `npm run eval:golden` dùng Gemini thật, chạy 24 case và ghi kết quả đã làm sạch
  vào `../eval/traces/run-01.json` cùng báo cáo `../eval/run-01-results.md`.

## API

`POST /api/search`

```json
{
  "query": "Tìm slide Hackathon có hướng dẫn cách tính điểm",
  "filters": {
    "type": "slide",
    "topic": "Hackathon",
    "channel": "hackathon"
  }
}
```

Response có một trong bốn trạng thái: `success`, `low_confidence`, `no_match`,
`fallback`; tối đa 5 kết quả, `traceId`, `retrievalMode` và `candidateCount`.

## Quyết định đơn giản hóa cho CP2

- Catalog là TypeScript tĩnh; 50 tài liệu là mock có kiểm soát.
- Semantic retrieval dùng JSON embeddings cục bộ, phù hợp quy mô demo.
- Feedback chỉ lưu trong state của trình duyệt, không có backend.
- Link nguồn là URL mock và chỉ dùng để chứng minh flow mở nguồn.
- Trace production hiện ghi structured log; eval lưu snapshot đã làm sạch.

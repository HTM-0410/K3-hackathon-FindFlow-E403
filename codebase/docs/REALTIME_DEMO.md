# Realtime Demo — chạy Discord bot + web feed thời gian thực

Tài liệu này hướng dẫn setup đầy đủ để demo `/realtime` chạy được với server Discord thật: bot thu thập sự kiện → lưu Cloudflare D1 → web đọc lại bằng Server-Sent Events.

## 1. Kiến trúc

```
┌──────────────────┐   Gateway    ┌────────────────────────┐
│ Discord server   │◄────────────►│ scripts/discord-bot.ts │
└──────────────────┘              │ (Node, discord.js)     │
                                  └────────────┬───────────┘
                                               │ POST
                                               ▼
                       POST /api/realtime/ingest (CORS-free, x-ingest-token)
                                               │
                                               ▼
                                  ┌────────────────────────┐
                                  │ Cloudflare D1          │
                                  │  - realtime_events     │
                                  │  - realtime_stats      │
                                  └────────────┬───────────┘
                                               │ poll 2s
                                               ▼
                       GET /api/realtime/events (SSE text/event-stream)
                                               │
                                               ▼
                       /realtime page (EventSource, không cần đăng nhập)
```

## 2. Tạo Discord Bot

1. Vào https://discord.com/developers/applications → **New Application** → đặt tên.
2. Tab **Bot** → **Reset Token** → lưu token vào nơi an toàn (sẽ dán vào `.env.local`).
3. Bật các **Privileged Gateway Intents**:
   - ✅ Message Content Intent
   - ✅ Server Members Intent
   - ✅ Presence Intent (tuỳ chọn, chỉ cần nếu muốn xem voice state)
4. Tab **OAuth2 → URL Generator**, tick scope `bot` + permissions:
   - View Channels
   - Read Message History
   - Send Messages (tuỳ chọn)
   - View Audit Log
5. Copy URL và mở trong trình duyệt để mời bot vào server thật.

## 3. Cấu hình `.env.local`

Sao chép `.env.example` thành `.env.local` rồi điền:

```env
# Discord bot
DISCORD_BOT_TOKEN=...                   # Bắt buộc
REALTIME_API_URL=http://localhost:3000  # Mặc định — URL của Next/vinext dev
REALTIME_INGEST_TOKEN=                  # Bất kỳ chuỗi bí mật dài > 32 ký tự. Bot và worker phải khớp.
REALTIME_ALLOWED_CHANNELS=              # Để trống = tất cả channel trong server.
```

> **Không commit `.env.local`** — file đã có trong `.gitignore`. Token chỉ tồn tại trên máy và trong Cloudflare Worker env (khi deploy).

## 4. Tạo bảng trên Cloudflare D1

Trước khi chạy web, schema phải tồn tại. Drizzle đã được config:

```bash
npm run db:generate            # sinh migration SQL trong ./drizzle
# Sau đó apply migration lên D1 thật qua wrangler:
npx wrangler d1 migrations apply discord-knowledge-hub --remote
```

(Database ID lấy từ Cloudflare Dashboard → D1 → discord-knowledge-hub. Cập nhật ID vào `.openai/hosting.json` và wrangler trước khi apply.)

Bảng được tạo:

- `realtime_events (id, kind, external_id, channel_name, author_name, content, metadata, occurred_at)`
- `realtime_stats (id=1, total_messages, total_joins, total_leaves, total_reactions, total_voice, last_heartbeat, bot_started_at)`

## 5. Chạy demo

Mở **hai terminal**:

```bash
# Terminal 1: Next/vinext dev server
npm run dev

# Terminal 2: Discord bot
npm run bot
```

Mở trình duyệt:

- `http://localhost:3000/realtime` — live feed, số liệu realtime
- `http://localhost:3000` — giao diện search (giờ có nút "⚡ Realtime" ở header)

Trong Discord, gửi một tin nhắn hoặc thả reaction trong bất kỳ channel nào (hoặc trong channel đã cấu hình `REALTIME_ALLOWED_CHANNELS`) — sự kiện sẽ hiện trên trang trong vòng 2-3 giây.

## 6. API dùng trong demo

Tất cả endpoint nằm dưới `/api/realtime/*`. Web demo gọi 3 endpoint public; endpoint `ingest` chỉ bot gọi.

| Method | URL | Auth | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/realtime/ingest` | `x-ingest-token` nếu có | Nhận batch event từ bot, lưu D1, bump stats |
| `GET`  | `/api/realtime/stats`    | — | Tổng số + trạng thái bot (sống / mất kết nối) |
| `GET`  | `/api/realtime/messages` | — | `?limit=50&kind=message&since=<id>` — feed DESC theo id |
| `GET`  | `/api/realtime/events`   | — | `?since=<id>` — SSE stream, tự replay event đã bỏ lỡ |

### Ví dụ ingest từ bot

```bash
curl -X POST http://localhost:3000/api/realtime/ingest \
  -H "content-type: application/json" \
  -H "x-ingest-token: $REALTIME_INGEST_TOKEN" \
  -d '{
    "kind": "message",
    "externalId": "1234567890",
    "channelName": "general",
    "authorName": "Lan",
    "content": "Chào buổi sáng!",
    "metadata": { "messageUrl": "https://discord.com/channels/.../.../..." },
    "occurredAt": 1717846800000
  }'
```

### SSE stream

```
GET /api/realtime/events?since=1234

data: {"type":"ping","since":1234}

data: {"type":"event","id":1235,"kind":"message", ...}

data: {"type":"event","id":1236,"kind":"reaction", ...}
```

## 7. Bảo mật & vận hành

- **Không capture DM** — bot chỉ đọc guild channel.
- **Sanitize nội dung**: URL và code block bị che trước khi lưu (`[link]`, `[code]`). Độ dài tối đa 600 ký tự.
- **Chống trùng**: trường `external_id` (kèm `user_id` cho reaction) là khoá trùng lặp logic — nếu bot restart, gửi lại event cũ sẽ không gây nhân đôi (cột UNIQUE có thể thêm sau nếu cần strict).
- **Rate limit**: ingest giới hạn 200 event/ lần.
- **Heartbeat**: bot ping mỗi 30s. Nếu dashboard không thấy heartbeat trong 90s → hiển thị "Bot offline".
- **Không commit**: token bot, `REALTIME_INGEST_TOKEN`, `.env.local` đều không commit.
- **Khi demo xong**: gỡ bot khỏi server Discord, xoá `.env.local` và `dist/`.

## 8. Xử lý sự cố

| Triệu chứng | Nguyên nhân / Xử lý |
| --- | --- |
| Trang /realtime trắng, không kết nối | Kiểm tra `npm run dev` có chạy không. EventSource cần HTTPS hoặc localhost. |
| Bot báo `401 Unauthorized` | Token sai. Lấy lại ở Discord Developer Portal → Reset Token. |
| Bot báo `403 Missing Intents` | Bật đủ Message Content / Server Members intents rồi đợi vài phút. |
| Ingest trả 401 | Header `x-ingest-token` không khớp với `REALTIME_INGEST_TOKEN` ở worker. |
| Ingest trả 500 "no such table" | Chưa chạy migration D1. Xem mục 4. |
| Số liệu tăng nhưng live feed trống | Kiểm tra SSE trong DevTools → Network → EventStream. |
| Discord rate limit | Giảm số channel trong `REALTIME_ALLOWED_CHANNELS` hoặc tăng interval heartbeat. |

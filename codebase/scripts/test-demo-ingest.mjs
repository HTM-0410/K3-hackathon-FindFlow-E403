#!/usr/bin/env node
/**
 * Smoke test cho pipeline demo ingest — chạy nhanh khi không có Discord.
 *
 * Gửi các link mẫu tới `/api/demo/documents`, kiểm tra:
 *   - response shape (ok, id, status)
 *   - chống trùng (cùng externalId → reused)
 *   - filter domain allowlist qua API
 *
 * Sử dụng:
 *   1. Bật `npm run dev` (terminal 1)
 *   2. `node scripts/test-demo-ingest.mjs`
 *   3. (Optional) Truyền base URL: `node scripts/test-demo-ingest.mjs http://localhost:3000`
 */

const BASE = (process.argv[2] || process.env.REALTIME_API_URL || "http://localhost:3000")
  .replace(/\/$/, "");

const TOKEN = process.env.DEMO_DOCUMENT_INGEST_TOKEN || "";

const FIXTURES = [
  {
    label: "Public article (HTML)",
    body: {
      url: "https://example.com/",
      host: "example.com",
      externalId: "smoke::example.com::1",
      messageId: "msg-1001",
      channelId: "chan-demo",
      channelName: "demo-docs",
      guildId: "guild-demo",
      authorName: "tester",
      messageExcerpt: "Xem tài liệu https://example.com/ nhé",
      detectedAt: Date.now(),
    },
    expectStatus: ["ready", "fetching", "failed"],
  },
  {
    label: "Non-http URL (bị reject)",
    body: {
      url: "ftp://files.example.com/file.pdf",
      host: "files.example.com",
      externalId: "smoke::ftp::1",
      messageId: "msg-1002",
      channelId: "chan-demo",
      channelName: "demo-docs",
      authorName: "tester",
      detectedAt: Date.now(),
    },
    expectOk: false,
  },
  {
    label: "Thiếu url (bị reject)",
    body: {
      externalId: "smoke::missing::1",
      messageId: "msg-1003",
      channelName: "demo-docs",
      detectedAt: Date.now(),
    },
    expectOk: false,
  },
];

function headers() {
  const h = { "content-type": "application/json" };
  if (TOKEN) h["x-ingest-token"] = TOKEN;
  return h;
}

async function postOnce(body) {
  const res = await fetch(`${BASE}/api/demo/documents`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep as null */
  }
  return { status: res.status, ok: res.ok, json, raw: text };
}

let pass = 0;
let fail = 0;
const log = (ok, label, info) => {
  const tag = ok ? "✅" : "❌";
  console.log(`${tag} ${label}${info ? ` — ${info}` : ""}`);
  if (ok) pass += 1;
  else fail += 1;
};

console.log(`Smoke test demo ingest → ${BASE}/api/demo/documents`);
console.log(`Auth mode: ${TOKEN ? "token" : "open"}`);

for (const fixture of FIXTURES) {
  const res = await postOnce(fixture.body);
  const expectedOk = fixture.expectOk !== false;
  const status = res.json?.status;
  if (!expectedOk) {
    log(!res.ok, fixture.label, `status=${res.status} msg=${res.json?.error || res.raw.slice(0, 100)}`);
    continue;
  }
  if (!res.ok || !res.json?.ok) {
    log(false, fixture.label, `expected ok, got status=${res.status} body=${res.raw.slice(0, 120)}`);
    continue;
  }
  const valid = fixture.expectStatus.includes(status);
  log(valid, fixture.label, `id=${res.json.id} status=${status} reused=${res.json.reused}`);
}

// Chống trùng: gọi lại link đầu tiên
const res2 = await postOnce(FIXTURES[0].body);
log(res2.json?.reused === true, "Chống trùng (lần 2 reused)", `id=${res2.json?.id}`);

// Sau ingest, kiểm tra list & search
try {
  const list = await fetch(`${BASE}/api/demo/documents?limit=10`, { cache: "no-store" });
  const data = await list.json();
  log(data.ok && Array.isArray(data.documents), "GET /api/demo/documents", `count=${data.count}`);

  const search = await fetch(
    `${BASE}/api/demo/search?q=example&limit=5`,
    { cache: "no-store" },
  );
  const searchData = await search.json();
  log(
    searchData.ok && Array.isArray(searchData.results),
    "GET /api/demo/search?q=example",
    `count=${searchData.count}`,
  );
} catch (err) {
  log(false, "Sau ingest list/search", err instanceof Error ? err.message : String(err));
}

console.log(`\nKết quả: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);

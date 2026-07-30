import assert from "node:assert/strict";
import test from "node:test";

// Automated tests must be deterministic and make no external API calls.
process.env.GEMINI_API_KEY = "";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function request(path, init) {
  return worker.fetch(new Request(`http://localhost${path}`, init), env, ctx);
}

async function search(query, filters) {
  const response = await request("/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, filters }),
  });
  assert.equal(response.status, 200);
  return response.json();
}

test("renders all three product routes", async () => {
  for (const path of ["/", "/search?q=hackathon", "/resources"]) {
    const response = await request(path, { headers: { accept: "text/html" } });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.match(await response.text(), /Discord Knowledge Hub/);
  }
});

test("rejects invalid query lengths", async () => {
  const response = await request("/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "a" }),
  });
  assert.equal(response.status, 400);
});

test("asks a concrete follow-up for vague time references", async () => {
  const result = await search("Cho mình slide ngày hôm qua");
  assert.equal(result.status, "needs_clarification");
  assert.equal(result.clarificationReason, "ambiguous_time");
  assert.match(result.clarification, /\?$/);
  assert.ok(result.clarificationOptions.length >= 3);
  assert.deepEqual(result.results, []);
  assert.ok(result.clarificationOptions.every((option) => option.query));
});

test("a selected clarification option becomes one focused search", async () => {
  const first = await search("slide buổi trước");
  const option = first.clarificationOptions.find(
    (item) => item.resourceId === "res-001",
  );
  assert.ok(option);
  const resolved = await search(option.query);
  assert.equal(resolved.status, "fallback");
  assert.ok(resolved.results.some((item) => item.resourceId === "res-001"));
});

test("splits multiple resource intents before retrieval", async () => {
  const result = await search(
    "Tìm video foundation model và code OpenAI API Python",
  );
  assert.equal(result.status, "needs_clarification");
  assert.equal(result.clarificationReason, "multiple_intents");
  assert.equal(result.clarificationOptions.length, 2);
  assert.deepEqual(result.results, []);
});

test("rejects unrelated requests without showing resources", async () => {
  const result = await search("Tìm công thức nấu ăn tối nay");
  assert.equal(result.status, "rejected");
  assert.equal(result.rejectionReason, "unrelated");
  assert.deepEqual(result.results, []);
});

test("rejects actions that the product must not perform", async () => {
  const result = await search("Nộp bài lên hệ thống giúp tôi");
  assert.equal(result.status, "rejected");
  assert.equal(result.rejectionReason, "unsupported_action");
  assert.deepEqual(result.results, []);
});

test("uses bounded fallback for one clear search intent", async () => {
  const result = await search("slide giới thiệu Venture Arena Hackathon");
  assert.equal(result.status, "fallback");
  assert.ok(result.results.length > 0 && result.results.length <= 5);
  assert.ok(result.results.every((item) => /^res-\d{3}$/.test(item.resourceId)));
  assert.ok(result.results.some((item) => item.resourceId === "res-001"));
});

test("applies filters before candidate retrieval", async () => {
  const result = await search("Hackathon", { type: "slide" });
  assert.ok(result.results.length > 0);
  assert.ok(result.results.every((item) => item.resourceId === "res-001"));
});

test("official deadline material ranks first in fallback", async () => {
  const result = await search("deadline CP4 and quality bar");
  assert.ok(result.results.length > 0);
  assert.ok(["res-011", "res-034"].includes(result.results[0].resourceId));
});

import assert from "node:assert/strict";
import test from "node:test";

// Keep the automated suite deterministic and free from external API calls.
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

test("rejects invalid queries", async () => {
  const response = await request("/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "a" }),
  });
  assert.equal(response.status, 400);
});

test("uses bounded fallback candidates when Gemini is not configured", async () => {
  const result = await search("slide hướng dẫn Hackathon và cách tính điểm");
  assert.equal(result.status, "fallback");
  assert.ok(result.results.length > 0 && result.results.length <= 5);
  assert.ok(result.results.every((item) => /^res-\d{3}$/.test(item.resourceId)));
  assert.ok(result.results.some((item) => ["res-001", "res-002", "res-011"].includes(item.resourceId)));
});

test("returns no_match for an unrelated query", async () => {
  const result = await search("tài liệu học nấu ăn");
  assert.equal(result.status, "no_match");
  assert.deepEqual(result.results, []);
});

test("applies filters before candidate retrieval", async () => {
  const result = await search("Hackathon", { type: "slide" });
  assert.ok(result.results.length > 0);
  assert.ok(result.results.every((item) => ["res-001"].includes(item.resourceId)));
});

test("official deadline material ranks in fallback results", async () => {
  const result = await search("deadline CP4 và quality bar");
  assert.ok(result.results.length > 0);
  assert.ok(["res-011", "res-034"].includes(result.results[0].resourceId));
});

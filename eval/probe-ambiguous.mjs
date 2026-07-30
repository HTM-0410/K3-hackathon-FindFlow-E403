// Probe clarification options returned by the system for ambiguous queries,
// so we can decide which selectOptionIndex to use in golden set turn 2.
import { readFile } from "node:fs/promises";

process.loadEnvFile("./codebase/.env.local");

const workerUrl = new URL("../codebase/dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("probe", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function probe(query) {
  const response = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    }),
    env,
    ctx,
  );
  return await response.json();
}

async function searchRaw(query) {
  const response = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    }),
    env,
    ctx,
  );
  return await response.json();
}

const probes = [
  { id: "ambiguous_time-01", q: "Cho mình slide buổi trước về Prompt Engineering" },
  { id: "ambiguous_time-02", q: "Bài lab hôm nọ mình chưa hiểu phần tool calling" },
  { id: "ambiguous_ref-01", q: "Gửi lại cho mình tài liệu đó với" },
  { id: "ambiguous_ref-02", q: "Bạn gửi lại link đó giúp tôi nhé" },
  { id: "ambiguous_broad-01", q: "tìm code AI" },
];

const catalog = null;

for (const p of probes) {
  console.log(`\n=== ${p.id} ===`);
  console.log(`Q1: "${p.q}"`);
  const r1 = await probe(p.q);
  const opts = r1.clarificationOptions ?? [];
  console.log(`status: ${r1.status}, options: ${opts.length}`);
  for (const [i, opt] of opts.entries()) {
    console.log(`  [${i}] label="${opt.label}" query="${opt.query}" resourceId=${opt.resourceId ?? "—"}`);
  }
  // Now try each option as a follow-up query
  for (const [i, opt] of opts.entries()) {
    if (i > 4) break; // cap
    const r2 = await searchRaw(opt.query);
    const top3 = (r2.results ?? []).slice(0, 3).map((r) => r.resourceId);
    console.log(`  follow-up [${i}] -> status=${r2.status} top3=[${top3.join(", ")}]`);
    // small wait to avoid rate limit
    await new Promise((r) => setTimeout(r, 4500));
  }
  // Wait between probes to avoid hitting Gemini rate limit
  await new Promise((r) => setTimeout(r, 4500));
}

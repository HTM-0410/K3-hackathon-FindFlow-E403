import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resources } from "../app/data/resources.ts";

process.loadEnvFile(".env.local");
const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required to generate resource embeddings.");
}

const model = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";
const outputPath = fileURLToPath(
  new URL("../app/data/resource-embeddings.json", import.meta.url),
);
const index: Record<string, number[]> = {};

for (let offset = 0; offset < resources.length; offset += 5) {
  const batch = resources.slice(offset, offset + 5);
  const entries = await Promise.all(
    batch.map(async (resource) => {
      const text = [
        `Title: ${resource.title}`,
        `Summary: ${resource.summary}`,
        `Topic: ${resource.topic}`,
        `Type: ${resource.type}`,
        `Tags: ${resource.tags.join(", ")}`,
        `Keywords: ${resource.keywords.join(", ")}`,
        `Channel: ${resource.sourceChannel}`,
        `Official: ${resource.isOfficial}`,
        `Content: ${resource.contentSnippet}`,
      ].join("\n");
      return [resource.id, await embed(text)] as const;
    }),
  );
  for (const [id, vector] of entries) index[id] = vector;
  process.stdout.write(`Embedded ${Math.min(offset + 5, resources.length)}/${resources.length}\n`);
}

await writeFile(outputPath, `${JSON.stringify(index)}\n`, "utf8");
process.stdout.write(`Saved ${Object.keys(index).length} embeddings to ${outputPath}\n`);

async function embed(text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey!,
      },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Embedding API returned ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as { embedding?: { values?: number[] } };
  if (!payload.embedding?.values?.length) throw new Error("Embedding API returned no values.");
  return payload.embedding.values;
}

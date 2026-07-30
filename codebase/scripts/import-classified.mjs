// Script để chuyển classified_all_output.json → classified-resources.generated.ts
const { readFile, writeFile } = await import("node:fs/promises");

const INPUT = "C:/Users/Admin/Downloads/classified_all_output (1).json";
const OUTPUT = "app/data/classified-resources.generated.ts";

const raw = JSON.parse(await readFile(INPUT, "utf8"));
const items = raw.classified_resources || [];

function escape(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function safeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string").map((v) => v.trim()).filter(Boolean);
}

function normalizeType(value) {
  const t = String(value || "").toLowerCase();
  if (["slide", "video", "github", "lab", "announcement", "guide"].includes(t)) return t;
  if (t.includes("lab")) return "lab";
  if (t.includes("github") || t.includes("repo")) return "github";
  if (t.includes("video")) return "video";
  if (t.includes("slide")) return "slide";
  if (t.includes("announcement")) return "announcement";
  return "guide";
}

function deriveChannelId(rec) {
  const m = String(rec.discord_url || "").match(/\/channels\/\d+\/(\d+)/);
  if (m) return m[1];
  return rec.id;
}

const resources = items
  .filter((rec) => rec && rec.id)
  .map((rec) => {
    const type = normalizeType(rec.resource_type || rec.ResourceType || rec.type);
    const tags = safeArray(rec.tags);
    const keywords = safeArray(rec.keywords);
    const sharedAt = rec.created_at || "2024-01-01T00:00:00Z";
    const channelId = deriveChannelId(rec);
    const categoryName = rec.category_name || "🏆-chia-sẻ";
    const channelName = rec.channel_name || rec.title || "";

    return `  createResource({
    id: "${rec.id}",
    title: '${escape(rec.title || "")}',
    summary: '${escape(rec.summary || "")}',
    type: "${type}",
    topic: '${escape(rec.topic || "")}',
    tags: ${JSON.stringify(tags)},
    keywords: ${JSON.stringify(keywords)},
    sourceUrl: '${escape(rec.source_url || "")}',
    channelName: '${escape(channelName)}',
    categoryName: '${escape(categoryName)}',
    sharedBy: '${escape(rec.shared_by || "")}',
    sharedAt: '${escape(sharedAt)}',
    discordUrl: '${escape(rec.discord_url || "")}',
    channelId: "${channelId}",
  })`;
});

const header = `// AUTO-GENERATED từ ${INPUT}
// Tổng: ${raw.total_classified || items.length} items; hợp lệ: ${resources.length}
import type { Resource } from "../types/resource";

const GUILD_ID = "1526532830627102781";

function createResource(data: {
  id: string;
  title: string;
  summary: string;
  type: Resource["type"];
  topic: string;
  tags: string[];
  keywords: string[];
  sourceUrl: string;
  channelName: string;
  categoryName: string;
  sharedBy: string;
  sharedAt: string;
  discordUrl: string;
  channelId: string;
}): Resource {
  const sharedAt = data.sharedAt || "2024-01-01T00:00:00Z";
  return {
    id: data.id,
    title: data.title,
    summary: data.summary,
    type: data.type,
    topic: data.topic,
    tags: data.tags,
    sourceChannel: data.categoryName,
    sourceUrl: data.sourceUrl,
    sharedBy: data.sharedBy,
    sharedAt,
    keywords: data.keywords,
    isOfficial: false,
    source: {
      guildId: GUILD_ID,
      channelId: data.channelId,
      channelName: data.channelName,
      messageId: data.id,
      messageUrl: data.discordUrl,
      authorRole: "community",
      sharedAt,
    },
    contentSnippet: data.summary.slice(0, 500),
    assets: [],
    status: "published",
    canonicalKey: data.title.toLowerCase().replace(/\\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
  };
}

export const classifiedResources: Resource[] = [
${resources.join(",\n")}
];
`;

await writeFile(OUTPUT, header, "utf8");
console.log(`Wrote ${resources.length} resources to ${OUTPUT}`);

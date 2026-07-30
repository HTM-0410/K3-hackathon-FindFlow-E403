/**
 * Script import dữ liệu Discord đã phân loại vào codebase
 * Chạy: npx tsx scripts/import-discord-data.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DiscordResource {
  resource_type: string;
  title: string;
  summary: string;
  topic: string;
  tags: string[];
  keywords: string[];
  confidence: string;
  id: string;
  discord_url: string;
  source_url: string;
  channel_name: string;
  shared_by: string;
}

interface DiscordData {
  total_classified: number;
  classified_resources: DiscordResource[];
}

type ResourceType = "slide" | "video" | "github" | "lab" | "announcement" | "guide";

function mapResourceType(discordType: string | undefined): ResourceType {
  if (!discordType) return "guide";
  const mapping: Record<string, ResourceType> = {
    slide: "slide",
    video: "video",
    github: "github",
    lab: "lab",
    announcement: "announcement",
    guide: "guide",
    code: "github",
    article: "guide",
    link: "guide",
    document: "guide",
  };
  return mapping[discordType.toLowerCase()] || "guide";
}

function extractDiscordInfo(url: string): {
  guildId: string;
  channelId: string;
  messageId: string;
} {
  const match = url.match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (match) {
    return {
      guildId: match[1],
      channelId: match[2],
      messageId: match[3],
    };
  }
  return { guildId: "", channelId: "", messageId: "" };
}

function determineAuthorRole(sharedBy: string): "official" | "community" {
  const officialPatterns = [/^mentor/i, /^ta/i, /^admin/i, /^host/i, /mentor/i, /teaching assistant/i];
  return officialPatterns.some((p) => p.test(sharedBy)) ? "official" : "community";
}

function generateCanonicalKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s\u00C0-\u024F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function transformResource(discord: DiscordResource) {
  const discordInfo = extractDiscordInfo(discord.discord_url || "");
  const authorRole = determineAuthorRole(discord.shared_by || "");

  const assets: { type: "file" | "url"; url: string; name?: string }[] = [];
  if (discord.source_url) {
    assets.push({
      type: discord.source_url.match(/\.(pdf|pptx?|docx?|xlsx?)$/i) ? "file" : "url",
      url: discord.source_url,
    });
  }

  return {
    id: discord.id || `discord-${Date.now()}`,
    title: discord.title || "Untitled",
    summary: discord.summary || "",
    type: mapResourceType(discord.resource_type),
    topic: discord.topic || "General",
    tags: discord.tags || [],
    sourceChannel: discord.channel_name || "unknown",
    sourceUrl: discord.source_url || "",
    sharedBy: discord.shared_by || "Unknown",
    sharedAt: new Date().toISOString(),
    keywords: (() => {
      const kws = discord.keywords as unknown;
      if (Array.isArray(kws)) return kws as string[];
      if (typeof kws === "string") {
        return kws.split(",").map((k: string) => k.trim()).filter(Boolean);
      }
      return [] as string[];
    })(),
    isOfficial: authorRole === "official",
    source: {
      guildId: discordInfo.guildId,
      channelId: discordInfo.channelId,
      channelName: discord.channel_name || "unknown",
      messageId: discordInfo.messageId,
      messageUrl: discord.discord_url || "",
      authorRole,
      sharedAt: new Date().toISOString(),
    },
    contentSnippet: discord.summary || "",
    assets,
    status: "published",
    canonicalKey: generateCanonicalKey(discord.title || "untitled"),
  };
}

async function main() {
  const inputPath = resolve(__dirname, "../data/discord-classified.json");
  
  console.log("Reading Discord data...");
  const rawData = readFileSync(inputPath, "utf-8");
  const parsed: DiscordData = JSON.parse(rawData);

  console.log(`Total resources: ${parsed.total_classified}`);

  const resources = parsed.classified_resources.map(transformResource);

  // Stats by type
  const typeStats = resources.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\nBy type:");
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Stats by channel
  const channelStats = resources.reduce((acc, r) => {
    acc[r.sourceChannel] = (acc[r.sourceChannel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\nBy channel (top 10):");
  Object.entries(channelStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([channel, count]) => {
      console.log(`  ${channel}: ${count}`);
    });

  // Generate TypeScript file
  const outputPath = resolve(__dirname, "../app/data/discord-resources.ts");
  const output = `/**
 * Dữ liệu Discord đã import từ classified_all_output.json
 * Generated: ${new Date().toISOString()}
 * Total: ${resources.length} resources
 */

import type { Resource } from "../types/resource";

export const discordResources: Resource[] = ${JSON.stringify(resources, null, 2)} as const;
`;

  writeFileSync(outputPath, output, "utf-8");

  console.log(`\nWrote ${resources.length} resources to app/data/discord-resources.ts`);
}

main().catch(console.error);

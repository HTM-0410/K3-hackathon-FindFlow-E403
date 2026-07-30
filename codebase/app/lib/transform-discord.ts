import type { Resource, ResourceType } from "../types/resource";

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

function mapResourceType(discordType: string): ResourceType {
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
  // discord_url format: https://discord.com/channels/{guildId}/{channelId}/{messageId}
  const match = url.match(
    /discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/
  );
  if (match) {
    return {
      guildId: match[1],
      channelId: match[2],
      messageId: match[3],
    };
  }
  return {
    guildId: "",
    channelId: "",
    messageId: "",
  };
}

function determineAuthorRole(sharedBy: string): "official" | "community" {
  // Official: mentors, TAs, admin roles
  // Community: students (usually Txxx format)
  const officialPatterns = [
    /^mentor/i,
    /^ta/i,
    /^admin/i,
    /^host/i,
    /mentor/i,
    /teaching assistant/i,
  ];
  return officialPatterns.some((p) => p.test(sharedBy)) ? "official" : "community";
}

function generateCanonicalKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export function transformDiscordResource(discord: DiscordResource): Resource {
  const discordInfo = extractDiscordInfo(discord.discord_url);
  const authorRole = determineAuthorRole(discord.shared_by);

  const assets: Resource["assets"] = [];
  if (discord.source_url) {
    assets.push({
      type: discord.source_url.match(/\.(pdf|pptx?|docx?|xlsx?)$/i)
        ? "file"
        : "url",
      url: discord.source_url,
    });
  }

  return {
    id: discord.id,
    title: discord.title,
    summary: discord.summary,
    type: mapResourceType(discord.resource_type),
    topic: discord.topic,
    tags: discord.tags,
    sourceChannel: discord.channel_name,
    sourceUrl: discord.source_url,
    sharedBy: discord.shared_by,
    sharedAt: new Date().toISOString(), // Discord data doesn't include timestamp
    keywords: discord.keywords,
    isOfficial: authorRole === "official",
    source: {
      guildId: discordInfo.guildId,
      channelId: discordInfo.channelId,
      channelName: discord.channel_name,
      messageId: discordInfo.messageId,
      messageUrl: discord.discord_url,
      authorRole,
      sharedAt: new Date().toISOString(),
    },
    contentSnippet: discord.summary,
    assets,
    status: "published",
    canonicalKey: generateCanonicalKey(discord.title),
  };
}

export function transformAllDiscordResources(
  data: DiscordResource[]
): Resource[] {
  return data.map(transformDiscordResource);
}

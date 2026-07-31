/**
 * Discord Knowledge Hub — Realtime Capture Bot
 *
 * Kết nối Discord qua discord.js Gateway, capture các sự kiện realtime
 * (message, member join/leave, reaction, voice, heartbeat) rồi POST về
 * app API `/api/realtime/ingest` để lưu vào D1 và stream SSE cho web demo.
 *
 * Cách chạy (xem README §Realtime demo):
 *   1. Tạo Discord bot tại https://discord.com/developers/applications
 *      - Bật "Message Content Intent", "Server Members Intent", "Presence Intent"
 *      - Mời bot vào server với quyền: View Channels, Read Message History,
 *        Send Messages (optional), View Audit Log
 *   2. Thêm vào .env.local (KHÔNG commit):
 *        DISCORD_BOT_TOKEN=...          # Bot token từ Developer Portal
 *        REALTIME_API_URL=http://localhost:3000   # URL app (hoặc deploy)
 *        REALTIME_INGEST_TOKEN=...     # Khớp với worker env REALTIME_INGEST_TOKEN
 *   3. Trong app shell chạy song song:
 *        npm run dev        # Next/vinext dev server (port 3000)
 *        npm run bot        # node script này
 *
 * Lưu ý bảo mật:
 *   - Token lưu ở .env.local (đã git ignore)
 *   - Không capture tin nhắn riêng tư (DM): code chỉ đọc guild channel
 *   - Có thể bật chế độ "channel only" để chỉ lắng nghe 1 channel cụ thể
 */

import { Client, GatewayIntentBits, Events, Partials, type GuildTextBasedChannel } from "discord.js";
import { setTimeout as wait } from "node:timers/promises";

/* -------------------------------------------------------------------- */
/* Cấu hình từ môi trường                                              */
/* -------------------------------------------------------------------- */

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const API_URL = (process.env.REALTIME_API_URL || "http://localhost:3000").replace(/\/$/, "");
const INGEST_TOKEN = process.env.REALTIME_INGEST_TOKEN || "";

/** Chỉ capture channel này (theo tên). Để trống = tất cả channel. */
const ALLOWED_CHANNELS = (process.env.REALTIME_ALLOWED_CHANNELS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Demo ingest — bắt link tài liệu trong message để xử lý và thêm vào
 * dataset demo riêng (tách khỏi catalog production).
 */
const DEMO_INGEST_ENABLED = (process.env.DEMO_DOCUMENT_INGEST || "").toLowerCase() === "true";
const DEMO_INGEST_TOKEN = process.env.DEMO_DOCUMENT_INGEST_TOKEN || "";
const DEMO_INGEST_PATH = process.env.DEMO_DOCUMENT_INGEST_PATH || "/api/demo/documents";
const DEMO_ALLOWED_DOMAINS = (process.env.DEMO_DOCUMENT_DOMAINS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const CONTENT_MAX_LEN = 600;

if (!TOKEN) {
  console.error("\n[bot] Thiếu DISCORD_BOT_TOKEN trong môi trường.");
  console.error("[bot] Tạo .env.local với DISCORD_BOT_TOKEN=... rồi chạy lại.\n");
  process.exit(1);
}

/* -------------------------------------------------------------------- */
/* Helper gửi event sang ingest endpoint                                */
/* -------------------------------------------------------------------- */

let ingestQueue: Promise<boolean> = Promise.resolve(false);
let droppedCount = 0;

interface IngestPayload {
  kind: string;
  externalId: string;
  channelName: string;
  authorName: string;
  content: string;
  metadata: Record<string, unknown>;
  occurredAt: number;
}

const URL_REGEX = /\bhttps?:\/\/[^\s<>"'`]+/gi;

/** Trích các URL http(s) trong content (full URL, không strip). */
function extractMessageLinks(content: string): string[] {
  if (!content) return [];
  const matches = content.match(URL_REGEX);
  if (!matches) return [];
  const out: string[] = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[)\]}>.,;]+$/g, "");
    try {
      const parsed = new URL(cleaned);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        out.push(parsed.toString());
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

/**
 * Chuẩn hoá content để hiển thị: thay code block/embed bằng placeholder,
 * giữ nguyên URL để UI có thể render thành link.
 */
function sanitizeContent(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/```[\s\S]*?```/g, "[code block]")
    .replace(/`[^`]+`/g, "[code]")
    .slice(0, CONTENT_MAX_LEN);
}

/** Excerpt thô dùng cho UI: giữ URL + cắt còn 400 ký tự. */
function buildMessageExcerpt(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 400);
}

async function postEvent(event: IngestPayload): Promise<boolean> {
  const url = `${API_URL}/api/realtime/ingest`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (INGEST_TOKEN) headers["x-ingest-token"] = INGEST_TOKEN;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    droppedCount += 1;
    const body = await res.text().catch(() => "");
    console.warn(`[bot] Ingest ${res.status}: ${body.slice(0, 120)}`);
  }
  return res.ok;
}

function enqueueEvent(event: IngestPayload): void {
  ingestQueue = ingestQueue.then(() => postEvent(event).catch(() => false));
}

/* -------------------------------------------------------------------- */
/* Discord client                                                       */
/* -------------------------------------------------------------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

let startedAt = Date.now();

function isAllowed(channel: GuildTextBasedChannel | null | undefined): boolean {
  if (!channel || typeof channel.name !== "string") return false;
  if (ALLOWED_CHANNELS.length === 0) return true;
  return ALLOWED_CHANNELS.includes(channel.name);
}

function nowMs(): number {
  return Date.now();
}

const seenUrlsByChannel = new Map<string, Set<string>>();

interface CapturedLink {
  url: string;
  host: string;
  externalId: string;
  messageId: string;
  channelId: string;
  channelName: string;
  guildId?: string;
  authorName: string;
  messageExcerpt: string;
  detectedAt: number;
  kind: "url" | "attachment";
  filename?: string;
  contentType?: string;
  size?: number;
}

function extractLinks(content: string): { url: string; host: string }[] {
  if (!content) return [];
  const matches = content.match(URL_REGEX);
  if (!matches) return [];
  const out: { url: string; host: string }[] = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[)\]}>.,;]+$/g, "");
    let parsed: URL;
    try {
      parsed = new URL(cleaned);
    } catch {
      continue;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
    out.push({ url: parsed.toString(), host: parsed.hostname.toLowerCase() });
  }
  return out;
}

function isHostAllowed(host: string): boolean {
  if (DEMO_ALLOWED_DOMAINS.length === 0) return true;
  return DEMO_ALLOWED_DOMAINS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

function dedupeKey(messageId: string, url: string): string {
  return `${messageId}::${url}`;
}

function channelDedupSet(channelId: string): Set<string> {
  let set = seenUrlsByChannel.get(channelId);
  if (!set) {
    set = new Set();
    seenUrlsByChannel.set(channelId, set);
  }
  return set;
}

async function postDocumentLink(link: CapturedLink): Promise<boolean> {
  const url = `${API_URL}${DEMO_INGEST_PATH}`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (DEMO_INGEST_TOKEN) headers["x-ingest-token"] = DEMO_INGEST_TOKEN;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(link),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(`[bot] Demo ingest ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.ok;
}

let documentQueue: Promise<boolean> = Promise.resolve(false);
let documentDroppedCount = 0;

function enqueueDocumentLink(link: CapturedLink): void {
  documentQueue = documentQueue
    .then(() => postDocumentLink(link))
    .then((ok) => {
      if (!ok) {
        documentDroppedCount += 1;
      } else {
        console.log(`[bot] demo-ingest OK: ${link.kind}#${link.url}`);
      }
      return ok;
    })
    .catch((err) => {
      documentDroppedCount += 1;
      console.warn(
        `[bot] demo-ingest crashed for ${link.kind} ${link.url}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return false;
    });
}

function handleLinksInMessage(args: {
  content: string;
  messageId: string;
  channelId: string;
  channelName: string;
  guildId?: string;
  authorName: string;
}): CapturedLink[] {
  if (!DEMO_INGEST_ENABLED) return [];
  const links = extractLinks(args.content);
  if (!links.length) return [];
  const seen = channelDedupSet(args.channelId);
  const accepted: CapturedLink[] = [];
  const now = Date.now();
  for (const { url, host } of links) {
    if (!isHostAllowed(host)) continue;
    const key = dedupeKey(args.messageId, url);
    if (seen.has(key)) continue;
    seen.add(key);
    accepted.push({
      url,
      host,
      externalId: key,
      messageId: args.messageId,
      channelId: args.channelId,
      channelName: args.channelName,
      guildId: args.guildId,
      authorName: args.authorName,
      messageExcerpt: args.content.slice(0, 200),
      detectedAt: now,
      kind: "url",
    });
  }
  return accepted;
}

/**
 * Trích các file đính kèm (Discord CDN URL) trong message và build CapturedLink.
 * Mỗi attachment được ingest metadata-only vào demo_documents với status
 * `skipped` (vì fetcher chỉ xử lý HTML).
 */
function handleAttachmentsInMessage(args: {
  attachments: unknown;
  messageId: string;
  channelId: string;
  channelName: string;
  guildId?: string;
  authorName: string;
  messageExcerpt: string;
}): CapturedLink[] {
  if (!DEMO_INGEST_ENABLED) return [];
  if (!Array.isArray(args.attachments) || args.attachments.length === 0) return [];
  const seen = channelDedupSet(args.channelId);
  const accepted: CapturedLink[] = [];
  const now = Date.now();
  for (const raw of args.attachments) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    const url = typeof a.url === "string" ? a.url : "";
    if (!url) continue;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
    if (!isHostAllowed(parsed.hostname.toLowerCase())) continue;
    const key = `${args.messageId}::attachment::${parsed.toString()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const filename = typeof a.name === "string" ? a.name : "";
    const contentType = typeof a.contentType === "string" ? a.contentType : "";
    const sizeRaw = Number(a.size);
    accepted.push({
      url: parsed.toString(),
      host: parsed.hostname.toLowerCase(),
      externalId: key,
      messageId: args.messageId,
      channelId: args.channelId,
      channelName: args.channelName,
      guildId: args.guildId,
      authorName: args.authorName,
      messageExcerpt: args.messageExcerpt,
      detectedAt: now,
      kind: "attachment",
      filename: filename || undefined,
      contentType: contentType || undefined,
      size: Number.isFinite(sizeRaw) && sizeRaw >= 0 ? Math.floor(sizeRaw) : undefined,
    });
  }
  return accepted;
}

async function reportBotReady(): Promise<void> {
  enqueueEvent({
    kind: "bot_ready",
    externalId: `boot-${startedAt}`,
    channelName: "system",
    authorName: String(client.user?.tag || "bot"),
    content: `Bot đã kết nối tới ${client.guilds.cache.size} server(s).`,
    metadata: {
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
    },
    occurredAt: nowMs(),
  });
  console.log(`[bot] Ready • ${client.guilds.cache.size} guild(s)`);
}

/* -------------------------------------------------------------------- */
/* Replay history: quét lịch sử message gần nhất khi bot ready          */
/* -------------------------------------------------------------------- */

const REPLAY_ON_START = (process.env.REPLAY_ON_START || "").toLowerCase() === "true";
const REPLAY_LIMIT = Math.max(1, Math.min(100, Number(process.env.REPLAY_LIMIT) || 100));

type AnyCollection = {
  fetch: (
    options: { limit: number; before?: string },
  ) => Promise<unknown>;
};

interface HistoryMessage {
  id: string;
  guild?: { id?: string };
  author?: { bot?: boolean; displayName?: string; username?: string };
  channel?: GuildTextBasedChannel & { id?: string };
  content: string;
  url: string;
  attachments?: unknown;
  createdTimestamp?: number;
}

async function fetchChannelHistory(
  channel: GuildTextBasedChannel & { id?: string; messages?: AnyCollection },
  limit: number,
): Promise<HistoryMessage[]> {
  if (!channel.messages || typeof channel.messages.fetch !== "function") return [];
  const collected: HistoryMessage[] = [];
  let before: string | undefined;
  let remaining = limit;
  while (remaining > 0) {
    const batchSize = Math.min(remaining, 100);
    const opts: { limit: number; before?: string } = { limit: batchSize };
    if (before) opts.before = before;
    const batch = (await channel.messages.fetch(opts)) as unknown;
    const arr = Array.isArray(batch) ? batch : ((): HistoryMessage[] => {
      // discord.js v14 trả về Collection; map sang array.
      const map = (batch as { values?: () => Iterable<HistoryMessage> }).values;
      if (typeof map === "function") {
        return Array.from(map.call(batch) as Iterable<HistoryMessage>);
      }
      return [];
    })();
    if (arr.length === 0) break;
    for (const m of arr) collected.push(m);
    if (arr.length < batchSize) break;
    const last = arr[arr.length - 1];
    if (!last?.id) break;
    before = String(last.id);
    remaining -= arr.length;
    if (arr.length < batchSize) break;
  }
  // Sắp xếp cũ → mới để ingest theo thứ tự thời gian.
  collected.sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));
  return collected;
}

async function ingestFromMessage(message: HistoryMessage): Promise<void> {
  if (!message.guild) return;
  if (message.author?.bot) return;
  const channel = message.channel;
  if (!isAllowed(channel)) return;
  const authorName = String(
    message.author?.displayName || message.author?.username || "anon",
  );
  const rawContent = String(message.content || "");
  const channelId = String(channel?.id || channel?.name || "");
  const channelName = String(channel?.name || "");
  const guildId = String(message.guild?.id || "");
  const detectedLinks = extractMessageLinks(rawContent);
  const linksForIngest = detectedLinks.slice(0, 10);
  const occurredAt = message.createdTimestamp || nowMs();

  enqueueEvent({
    kind: "message",
    externalId: `replay-${message.id}`,
    channelName,
    authorName,
    content: sanitizeContent(rawContent),
    metadata: {
      messageUrl: String(message.url || ""),
      attachments: Array.isArray(message.attachments) ? message.attachments.length : 0,
      messageExcerpt: buildMessageExcerpt(rawContent),
      links: linksForIngest,
      replay: true,
    },
    occurredAt,
  });

  const capturedLinks = handleLinksInMessage({
    content: rawContent,
    messageId: String(message.id),
    channelId,
    channelName,
    guildId,
    authorName,
  });
  for (const link of capturedLinks) enqueueDocumentLink(link);

  let normalizedAttachments: unknown[] = [];
  if (Array.isArray(message.attachments)) {
    normalizedAttachments = message.attachments;
  } else if (message.attachments && typeof message.attachments === "object") {
    normalizedAttachments = [message.attachments];
  }
  const capturedAttachments = handleAttachmentsInMessage({
    attachments: normalizedAttachments,
    messageId: String(message.id),
    channelId,
    channelName,
    guildId,
    authorName,
    messageExcerpt: rawContent.slice(0, 200),
  });
  for (const att of capturedAttachments) enqueueDocumentLink(att);
}

async function replayHistory(): Promise<void> {
  console.log(`[bot] Replay: quét ${REPLAY_LIMIT} message gần nhất/channel...`);
  let totalScanned = 0;
  let totalIngested = 0;
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (!channel || typeof (channel as { isTextBased?: () => boolean }).isTextBased === "function") {
        if (typeof (channel as { isTextBased?: () => boolean }).isTextBased === "function" &&
          !(channel as { isTextBased: () => boolean }).isTextBased()) continue;
      }
      if (!isAllowed(channel as GuildTextBasedChannel)) continue;
      try {
        const messages = await fetchChannelHistory(
          channel as GuildTextBasedChannel & { id?: string; messages?: AnyCollection },
          REPLAY_LIMIT,
        );
        for (const m of messages) {
          totalScanned += 1;
          if (m.guild && !m.author?.bot) totalIngested += 1;
          await ingestFromMessage(m);
        }
        console.log(
          `[bot]   #${(channel as { name?: string }).name || "?"}: ${messages.length} message(s)`,
        );
      } catch (error) {
        console.warn(
          `[bot] Replay channel #${(channel as { name?: string }).name || "?"} failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }
  console.log(
    `[bot] Replay done: scanned=${totalScanned}, ingested=${totalIngested}`,
  );
}

client.once(Events.ClientReady, async () => {
  startedAt = Date.now();
  await reportBotReady();
  if (REPLAY_ON_START) {
    await replayHistory();
  }
});

// Loose types: discord.js event payloads are unions; cast to `any` once at boundary.
type AnyMessage = {
  guild?: { id?: string; name?: string };
  author?: { bot?: boolean; displayName?: string; username?: string };
  channel?: GuildTextBasedChannel & { id?: string };
  id: string;
  content: string;
  url: string;
  attachments?: { size: number } | unknown[];
};

type AnyReaction = {
  message: {
    id: string;
    guild?: unknown;
    channel?: GuildTextBasedChannel;
    content: string;
    url: string;
  };
  emoji: { name?: string | null; id?: string | null };
};

type AnyUser = {
  bot?: boolean;
  displayName?: string;
  username?: string;
  id: string;
};

type AnyMember = {
  id: string;
  displayName?: string;
  user?: { username?: string };
  guild: { name: string };
  joinedTimestamp?: number;
};

type AnyVoiceState = {
  channelId: string | null | undefined;
  channel: (GuildTextBasedChannel & { name: string }) | null;
  member?: { id: string; displayName?: string; user?: { username?: string } };
};

client.on(Events.MessageCreate, (raw: unknown) => {
  const message = raw as AnyMessage;
  if (!message.guild) return;
  if (message.author?.bot) return;
  if (!isAllowed(message.channel)) return;

  const authorName = String(
    message.author?.displayName || message.author?.username || "anon",
  );
  const rawContent = String(message.content || "");
  const detectedLinks = extractMessageLinks(rawContent);
  const linksForIngest = detectedLinks.slice(0, 10);

  enqueueEvent({
    kind: "message",
    externalId: String(message.id),
    channelName: String(message.channel?.name || ""),
    authorName,
    content: sanitizeContent(rawContent),
    metadata: {
      messageUrl: String(message.url || ""),
      attachments: Array.isArray(message.attachments) ? message.attachments.length : 0,
      messageExcerpt: buildMessageExcerpt(rawContent),
      links: linksForIngest,
    },
    occurredAt: nowMs(),
  });

  // Demo ingest: tách link tài liệu trong message để xử lý bất đồng bộ
  const capturedLinks = handleLinksInMessage({
    content: rawContent,
    messageId: String(message.id),
    channelId: String(message.channel?.id || message.channel?.name || ""),
    channelName: String(message.channel?.name || ""),
    guildId: String(message.guild?.id || ""),
    authorName,
  });
  for (const link of capturedLinks) enqueueDocumentLink(link);

  // Demo ingest: file đính kèm Discord (CDN URL) — chỉ lưu metadata.
  let normalizedAttachments: unknown[] = [];
  if (Array.isArray(message.attachments)) {
    normalizedAttachments = message.attachments;
  } else if (message.attachments && typeof message.attachments === "object") {
    normalizedAttachments = [message.attachments];
  }
  const capturedAttachments = handleAttachmentsInMessage({
    attachments: normalizedAttachments,
    messageId: String(message.id),
    channelId: String(message.channel?.id || message.channel?.name || ""),
    channelName: String(message.channel?.name || ""),
    guildId: String(message.guild?.id || ""),
    authorName,
    messageExcerpt: rawContent.slice(0, 200),
  });
  for (const att of capturedAttachments) enqueueDocumentLink(att);

  if (typeof message.content === "string" && message.content.length) {
    console.log(
      `[bot] #${message.channel?.name} <${message.author?.displayName || "anon"}> ${message.content.slice(0, 80)}`,
    );
  }
});

client.on(
  Events.MessageReactionAdd,
  (rawReaction: unknown, rawUser: unknown) => {
    const reaction = rawReaction as AnyReaction;
    const user = rawUser as AnyUser;
    if (!reaction.message?.guild) return;
    if (user?.bot) return;
    if (!isAllowed(reaction.message.channel)) return;
    const emojiKey = String(reaction.emoji?.name || reaction.emoji?.id || "?");

    enqueueEvent({
      kind: "reaction",
      externalId: `${reaction.message.id}-${user?.id || "?"}-${emojiKey}`,
      channelName: String(reaction.message.channel?.name || ""),
      authorName: String(user?.displayName || user?.username || "anon"),
      content: `${emojiKey} trên "${String(reaction.message.content || "").slice(0, 80)}"`,
      metadata: {
        emoji: emojiKey,
        messageId: String(reaction.message.id),
        messageUrl: String(reaction.message.url || ""),
      },
      occurredAt: nowMs(),
    });
  },
);

client.on(Events.GuildMemberAdd, (raw: unknown) => {
  const member = raw as AnyMember;
  enqueueEvent({
    kind: "member_join",
    externalId: String(member.id),
    channelName: "members",
    authorName: String(member.displayName || member.user?.username || "anon"),
    content: `đã tham gia server ${member.guild?.name || ""}`,
    metadata: { guild: member.guild?.name || "", joinedAt: member.joinedTimestamp },
    occurredAt: nowMs(),
  });
});

client.on(Events.GuildMemberRemove, (raw: unknown) => {
  const member = raw as AnyMember;
  enqueueEvent({
    kind: "member_leave",
    externalId: String(member.id),
    channelName: "members",
    authorName: String(member.displayName || member.user?.username || "anon"),
    content: `đã rời server ${member.guild?.name || ""}`,
    metadata: { guild: member.guild?.name || "" },
    occurredAt: nowMs(),
  });
});

client.on(
  Events.VoiceStateUpdate,
  (oldRaw: unknown, newRaw: unknown) => {
    const oldState = oldRaw as AnyVoiceState;
    const newState = newRaw as AnyVoiceState;
    if (oldState.channelId === newState.channelId) return;
    const left = oldState.channel;
    const joined = newState.channel;
    const member = newState.member || oldState.member;
    if (!member) return;
    if (joined && !isAllowed(joined as GuildTextBasedChannel)) return;
    if (!joined && left && !isAllowed(left as GuildTextBasedChannel)) return;
    const channelName = String(joined?.name || left?.name || "voice");
    const fromChannel = left?.name || null;
    const toChannel = joined?.name || null;
    const action = joined ? "voice_join" : left ? "voice_leave" : "voice";
    const content = joined
      ? `tham gia voice #${toChannel}`
      : left
        ? `rời voice #${fromChannel}`
        : "voice state changed";
    enqueueEvent({
      kind: "voice",
      externalId: `${member.id}-${nowMs()}`,
      channelName,
      authorName: String(member.displayName || member.user?.username || "anon"),
      content,
      metadata: { action, from: fromChannel, to: toChannel },
      occurredAt: nowMs(),
    });
  },
);

async function heartbeat(): Promise<void> {
  enqueueEvent({
    kind: "heartbeat",
    externalId: `hb-${nowMs()}`,
    channelName: "system",
    authorName: String(client.user?.tag || "bot"),
    content: "ping",
    metadata: { uptimeMs: nowMs() - startedAt },
    occurredAt: nowMs(),
  });
}

/* -------------------------------------------------------------------- */
/* Lifecycle                                                            */
/* -------------------------------------------------------------------- */

client.on(Events.Error, (err: unknown) =>
  console.error("[bot] client error:", err instanceof Error ? err.message : err),
);
client.on(Events.Warn, (msg: unknown) => console.warn("[bot] warn:", msg));

process.on("SIGINT", async () => {
  console.log("\n[bot] Đang đóng...");
  await ingestQueue;
  await documentQueue;
  console.log(`[bot] Đã gửi xong các event chờ. Dropped: ${droppedCount}`);
  console.log(`[bot] Document ingest dropped: ${documentDroppedCount}`);
  client.destroy();
  process.exit(0);
});
async function main(): Promise<void> {
  console.log(`[bot] Ingest endpoint: ${API_URL}/api/realtime/ingest`);
  console.log(
    `[bot] Channel filter: ${ALLOWED_CHANNELS.length ? ALLOWED_CHANNELS.join(", ") : "(all)"}`,
  );
  if (DEMO_INGEST_ENABLED) {
    console.log(`[bot] Demo document ingest: ${API_URL}${DEMO_INGEST_PATH}`);
    console.log(
      `[bot] Domain allowlist: ${DEMO_ALLOWED_DOMAINS.length ? DEMO_ALLOWED_DOMAINS.join(", ") : "(any)"}`,
    );
  } else {
    console.log(`[bot] Demo document ingest: disabled (set DEMO_DOCUMENT_INGEST=true)`);
  }
  console.log(
    `[bot] Replay on start: ${REPLAY_ON_START ? `yes (limit ${REPLAY_LIMIT}/channel)` : "no"}`,
  );
  await client.login(TOKEN);

  // Heartbeat loop
  setInterval(() => {
    heartbeat().catch(() => false);
  }, 30_000);
  await wait(60_000);
}

main().catch((err) => {
  console.error("[bot] Fatal:", err);
  process.exit(1);
});

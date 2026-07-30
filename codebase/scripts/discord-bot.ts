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

function sanitizeContent(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/```[\s\S]*?```/g, "[code block]")
    .replace(/`[^`]+`/g, "[code]")
    .replace(/https?:\/\/([^\s/?#]+)[^\s]*/g, (_full, host) => `[${host}]`)
    .slice(0, CONTENT_MAX_LEN);
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

client.once(Events.ClientReady, async () => {
  startedAt = Date.now();
  await reportBotReady();
});

// Loose types: discord.js event payloads are unions; cast to `any` once at boundary.
type AnyMessage = {
  guild?: unknown;
  author?: { bot?: boolean; displayName?: string; username?: string };
  channel?: GuildTextBasedChannel;
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

  enqueueEvent({
    kind: "message",
    externalId: String(message.id),
    channelName: String(message.channel?.name || ""),
    authorName: String(message.author?.displayName || message.author?.username || "anon"),
    content: sanitizeContent(message.content),
    metadata: {
      messageUrl: String(message.url || ""),
      attachments: Array.isArray(message.attachments) ? message.attachments.length : 0,
    },
    occurredAt: nowMs(),
  });

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
  console.log(`[bot] Đã gửi xong các event chờ. Dropped: ${droppedCount}`);
  client.destroy();
  process.exit(0);
});

async function main(): Promise<void> {
  console.log(`[bot] Ingest endpoint: ${API_URL}/api/realtime/ingest`);
  console.log(
    `[bot] Channel filter: ${ALLOWED_CHANNELS.length ? ALLOWED_CHANNELS.join(", ") : "(all)"}`,
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

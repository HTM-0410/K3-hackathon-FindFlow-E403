/**
 * Helpers cho demo document ingest API.
 *
 * - `authorizeDemoIngest`: xác thực token riêng cho dataset demo.
 * - `normalizeDemoLink`: chuẩn hoá payload từ bot Discord (URL link web
 *   hoặc file đính kèm) trước khi ghi DB.
 */

export interface DemoLink {
  url: string;
  host: string;
  externalId: string;
  messageId: string;
  messageUrl: string;
  channelId: string;
  channelName: string;
  guildId: string;
  authorName: string;
  detectedAt: number;
  /** Phân biệt giữa link web và file đính kèm Discord. */
  kind: "url" | "attachment";
  /** Tên file gốc (chỉ có khi kind === 'attachment'). */
  filename?: string;
  /** MIME content type (chỉ có khi kind === 'attachment'). */
  contentType?: string;
  /** Kích thước file (bytes, chỉ có khi kind === 'attachment'). */
  size?: number;
}

const MAX_FIELD = 500;

function clipString(value: unknown, max = MAX_FIELD): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

function parseSafeHttpUrl(raw: unknown): URL | null {
  if (typeof raw !== "string" || !raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed;
}

function parseBool(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const v = raw.toLowerCase().trim();
    return v === "1" || v === "true" || v === "yes";
  }
  return false;
}

/**
 * Chuẩn hoá payload từ bot Discord.
 *
 * Hỗ trợ 2 dạng:
 *   1) URL link web: { url, externalId, messageId, ... }
 *   2) File đính kèm Discord CDN: { url, kind:'attachment', externalId,
 *      messageId, filename?, contentType?, size?, ... }
 *
 * URL bắt buộc là http(s) parseable được (CDN Discord là https).
 */
export function normalizeDemoLink(input: unknown): DemoLink | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const parsed = parseSafeHttpUrl(obj.url);
  if (!parsed) return null;
  const externalId = clipString(obj.externalId, 300);
  const messageId = clipString(obj.messageId, 80);
  if (!externalId || !messageId) return null;
  const detectedRaw = Number(obj.detectedAt);
  const detectedAt = Number.isFinite(detectedRaw) && detectedRaw > 0
    ? Math.floor(detectedRaw)
    : Date.now();
  const kind: "url" | "attachment" = parseBool(obj.kind === "attachment")
    ? "attachment"
    : "url";
  const out: DemoLink = {
    url: parsed.toString(),
    host: clipString(obj.host, 200) || parsed.hostname.toLowerCase(),
    externalId,
    messageId,
    messageUrl: clipString(obj.messageUrl, 300),
    channelId: clipString(obj.channelId, 80),
    channelName: clipString(obj.channelName, 80),
    guildId: clipString(obj.guildId, 80),
    authorName: clipString(obj.authorName, 80),
    detectedAt,
    kind,
  };
  if (kind === "attachment") {
    const filename = clipString(obj.filename, 200);
    const contentType = clipString(obj.contentType, 120);
    const sizeRaw = Number(obj.size);
    if (filename) out.filename = filename;
    if (contentType) out.contentType = contentType;
    if (Number.isFinite(sizeRaw) && sizeRaw >= 0) out.size = Math.floor(sizeRaw);
  }
  return out;
}

interface IngestEnv {
  DEMO_DOCUMENT_INGEST_TOKEN?: string;
}

/** Xác thực token ingest demo. */
export function authorizeDemoIngest(
  request: Request,
  env: IngestEnv | undefined,
): { ok: boolean; mode: "open" | "token" | "denied" } {
  const expected = env?.DEMO_DOCUMENT_INGEST_TOKEN;
  if (!expected) return { ok: true, mode: "open" };
  const got = request.headers.get("x-ingest-token") || "";
  return got && got === expected
    ? { ok: true, mode: "token" }
    : { ok: false, mode: "denied" };
}

/**
 * Đoán MIME từ tên file khi Discord không cung cấp contentType.
 * Trả về undefined nếu không đoán được.
 */
export function guessContentType(filename: string): string | undefined {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".vsix")) return "application/vsix";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
}

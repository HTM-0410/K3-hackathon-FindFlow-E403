/**
 * Demo document fetcher — tải URL công khai, trích nội dung thô để phục vụ
 * dataset demo. Không dùng cho production; không crawl bên ngoài danh sách
 * allowlist.
 *
 * Hỗ trợ HTML cơ bản (title, đoạn văn). Các loại khác (PDF, DOCX, Google Drive)
 * sẽ được thêm ở giai đoạn sau. Trả về object chuẩn hoá hoặc ném lỗi để
 * route ingest ghi trạng thái `failed`.
 */

export const MAX_BYTES = 1_500_000; // 1.5 MB
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB — giới hạn đọc file đính kèm
export const TIMEOUT_MS = 8_000;
export const MAX_REDIRECTS = 3;
export const MAX_BODY_CHARS = 8000;
export const MAX_TITLE_CHARS = 200;

export interface DemoFetchResult {
  finalUrl: string;
  contentType: string;
  title: string;
  body: string;
  snippet: string;
  contentLength: number;
}

/** Lấy host, đảm bảo protocol http(s) — dùng để filter. */
export function parseSafeUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed;
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return stripTags(match[1]).slice(0, MAX_TITLE_CHARS);
}

function extractBody(html: string): string {
  // Ưu tiên <article>, <main>, hoặc <p>
  const block =
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html;
  const paragraphs = Array.from(block.matchAll(/<p[\s\S]*?<\/p>/gi))
    .map((m) => stripTags(m[0]))
    .filter((p) => p.length >= 30);
  let text = paragraphs.length
    ? paragraphs.join("\n\n")
    : stripTags(block);
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text.slice(0, MAX_BODY_CHARS);
}

/** Tự fetch với timeout + giới hạn redirect, không dùng cho local. */
async function fetchWithLimits(
  url: string,
  redirectsLeft: number,
): Promise<Response> {
  const res = await fetch(url, {
    method: "GET",
    redirect: redirectsLeft > 0 ? "follow" : "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent": "DiscordKnowledgeHub-DemoBot/1.0 (+demo)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (
    redirectsLeft > 0 &&
    (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308)
  ) {
    const location = res.headers.get("location");
    if (location) {
      const next = new URL(location, url).toString();
      return fetchWithLimits(next, redirectsLeft - 1);
    }
  }
  return res;
}

/**
 * Download & extract text content từ file đính kèm Discord CDN.
 * Chỉ gọi với URL thuộc `*.discordapp.com` / `*.discordapp.net` (CDN chính thức),
 * có header `Authorization: Bot <DISCORD_BOT_TOKEN>`.
 *
 * Trả về:
 * - ready  — file text/JSON/CSV hoặc PDF đã được extract, có title/body/snippet.
 * - skipped — vượt MAX_ATTACHMENT_BYTES, content-type không hỗ trợ, hoặc rỗng.
 * - fetching — file PDF cần worker Node để extract (Edge runtime không có fs).
 */
export async function fetchDemoAttachment(args: {
  url: string;
  filename?: string;
  contentType?: string;
  declaredSize?: number;
  botToken?: string;
  allowPdf?: boolean;
}): Promise<
  | {
      status: "ready";
      title: string;
      body: string;
      snippet: string;
      contentType: string;
      contentLength: number;
    }
  | { status: "skipped"; reason: string }
  | { status: "fetching" }
> {
  const { url, filename, contentType, declaredSize, botToken, allowPdf } = args;

  // Bảo vệ: chỉ chấp nhận host Discord CDN chính thức.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { status: "skipped", reason: "URL không hợp lệ." };
  }
  const host = parsed.hostname.toLowerCase();
  const isDiscordCdn =
    host === "cdn.discordapp.com" ||
    host.endsWith(".cdn.discordapp.com") ||
    host === "media.discordapp.net" ||
    host.endsWith(".media.discordapp.net");
  if (!isDiscordCdn) {
    return {
      status: "skipped",
      reason: `Host ${host} không thuộc Discord CDN — bỏ qua fetch attachment.`,
    };
  }

  // Bỏ qua ngay nếu kích thước khai báo vượt giới hạn.
  if (typeof declaredSize === "number" && declaredSize > MAX_ATTACHMENT_BYTES) {
    return {
      status: "skipped",
      reason: `File ${formatBytes(declaredSize)} vượt giới hạn ${formatBytes(MAX_ATTACHMENT_BYTES)}.`,
    };
  }

  const headers: Record<string, string> = {
    "user-agent": "DiscordKnowledgeHub-DemoBot/1.0 (+demo)",
  };
  if (botToken) headers.authorization = `Bot ${botToken}`;

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers,
    });
  } catch (error) {
    return {
      status: "skipped",
      reason: `Không tải được attachment: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!res.ok) {
    return {
      status: "skipped",
      reason: `Discord CDN trả về HTTP ${res.status}.`,
    };
  }

  const responseContentType =
    contentType || res.headers.get("content-type") || "";
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_ATTACHMENT_BYTES) {
    return {
      status: "skipped",
      reason: `File tải về ${formatBytes(buf.byteLength)} vượt giới hạn ${formatBytes(MAX_ATTACHMENT_BYTES)}.`,
    };
  }

  const filenameLower = (filename || parsed.pathname.split("/").pop() || "").toLowerCase();

  // 1) PDF — cần Node runtime để chạy pdf-parse. Trên Edge runtime thì trả
  // `fetching` để worker khác (Cloudflare Worker có Node compat) xử lý sau.
  if (
    /application\/pdf/i.test(responseContentType) ||
    filenameLower.endsWith(".pdf")
  ) {
    if (!allowPdf) {
      return {
        status: "fetching",
      };
    }
    try {
      const extracted = await extractPdfText(buf);
      return buildAttachmentResult({
        filename: filename || "document.pdf",
        body: extracted,
        contentType: responseContentType || "application/pdf",
      });
    } catch (error) {
      return {
        status: "skipped",
        reason: `Không đọc được PDF: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // 2) Plain text / markdown / json / csv / xml
  if (
    /^(text\/(plain|markdown|html|csv|xml|json)|application\/(json|xml))/.test(
      responseContentType,
    ) ||
    /\.(md|markdown|txt|csv|json|xml|ya?ml|tsv|log)$/i.test(filenameLower)
  ) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (!text.trim()) {
      return { status: "skipped", reason: "File text rỗng." };
    }
    return buildAttachmentResult({
      filename: filename || "file.txt",
      body: text,
      contentType: responseContentType || "text/plain",
    });
  }

  return {
    status: "skipped",
    reason: `Không hỗ trợ đọc ${responseContentType || filenameLower || "định dạng này"} — chỉ text/markdown/JSON/CSV/PDF.`,
  };
}

function buildAttachmentResult(args: {
  filename: string;
  body: string;
  contentType: string;
}): {
  status: "ready";
  title: string;
  body: string;
  snippet: string;
  contentType: string;
  contentLength: number;
} {
  const title = args.filename.slice(0, MAX_TITLE_CHARS);
  const body = args.body.replace(/\s+\n/g, "\n").trim().slice(0, MAX_BODY_CHARS);
  return {
    status: "ready",
    title,
    body,
    snippet: body.slice(0, 280),
    contentType: args.contentType,
    contentLength: body.length,
  };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function extractPdfText(buf: ArrayBuffer): Promise<string> {
  // pdf-parse dùng CommonJS — load động ở runtime Node để tránh vỡ Edge runtime.
  const mod = await import("pdf-parse");
  const pdfParse = (mod as { default?: (data: ArrayBuffer | Uint8Array) => Promise<{ text: string }> }).default
    || (mod as unknown as (data: ArrayBuffer | Uint8Array) => Promise<{ text: string }>);
  const result = await pdfParse(buf);
  return result.text || "";
}

/** Fetch và chuẩn hoá nội dung cho dataset demo. */
export async function fetchDemoDocument(rawUrl: string): Promise<DemoFetchResult> {
  const parsed = parseSafeUrl(rawUrl);
  if (!parsed) throw new Error("URL không hợp lệ hoặc không phải http(s).");

  const res = await fetchWithLimits(parsed.toString(), MAX_REDIRECTS);
  if (!res.ok) {
    throw new Error(`Fetch trả về ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml/i.test(contentType)) {
    throw new Error(`Bỏ qua vì content-type ${contentType || "(unknown)"}`);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new Error(`Nội dung vượt quá ${MAX_BYTES} bytes.`);
  }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  const title = extractTitle(html);
  const body = extractBody(html);
  if (!body) throw new Error("Không trích được nội dung văn bản.");
  return {
    finalUrl: res.url || parsed.toString(),
    contentType,
    title,
    body,
    snippet: body.slice(0, 280),
    contentLength: body.length,
  };
}

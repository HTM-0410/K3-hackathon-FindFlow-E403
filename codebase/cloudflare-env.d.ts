interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GEMINI_EMBEDDING_MODEL?: string;
    REALTIME_INGEST_TOKEN?: string;
    /** Optional D1 binding (chỉ dùng cho realtime demo, search-only không cần) */
    DB?: unknown;
    /** Optional Cloudflare Images binding (search-only không cần) */
    IMAGES?: unknown;
  };
}
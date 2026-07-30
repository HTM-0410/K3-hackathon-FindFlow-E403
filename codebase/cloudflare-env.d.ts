interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface D1Database {}

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GEMINI_EMBEDDING_MODEL?: string;
    REALTIME_INGEST_TOKEN?: string;
  };
}

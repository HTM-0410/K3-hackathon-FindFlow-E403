export default {
  async fetch(request: Request, env: { GEMINI_API_KEY: string }): Promise<Response> {
    const url = new URL(request.url);
    
    // Path: /v1beta/models/{model}:generateContent
    const pathMatch = url.pathname.match(/^\/v1beta\/models\/(.+?):generateContent$/);
    if (!pathMatch) {
      return new Response(JSON.stringify({ error: { message: "Unsupported endpoint", code: 400 } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const model = pathMatch[1];
    const apiKey = env.GEMINI_API_KEY;

    const upstream = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const body = await request.text();
      const upstreamResp = await fetch(upstream, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        // @ts-ignore - Cloudflare allows this
        cf: { cacheEverything: false },
      });

      const text = await upstreamResp.text();
      return new Response(text, {
        status: upstreamResp.status,
        headers: {
          "content-type": "application/json",
          // Allow CORS from any origin for dev
          "access-control-allow-origin": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: { message: String(err), code: 500 } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
} satisfies ExportedHandler<{ GEMINI_API_KEY: string }>;

export interface Env {
  OPENROUTER_API_KEY: string;
  OPENROUTER_API_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() });
    }

    // Proxy endpoint - forward to OpenRouter
    if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
      const apiUrl = env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://discord-knowledge-hub.workers.dev",
          "X-Title": "Discord Knowledge Hub Proxy",
        },
        body: request.body,
      });

      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};

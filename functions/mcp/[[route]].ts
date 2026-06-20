// ── Pages Function: Remote MCP Server ────────────────────────────────────────
// Mounts an MCP server (Streamable HTTP transport) at https://md-2-pdf.pages.dev/mcp
//
// Any MCP-compatible client (Claude Desktop, Cursor, Antigravity, Cline, OpenCode,
// Gemini CLI, Codex, Qwen, …) can connect by pointing at this single URL – no
// local Node.js, no clone, no build required.
//
// Cloudflare official docs:
//   https://developers.cloudflare.com/agents/model-context-protocol/
// Transport spec:
//   https://modelcontextprotocol.io/specification/2025-06-18/basic/transports

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./tools.js";
import type { Env } from "../types/env.js";

// ── CORS headers shared across all responses ─────────────────────────────────
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, X-Guest-Session, Mcp-Session-Id, Last-Event-ID, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    response.headers.set(k, v);
  }
  return response;
}

// ── Pages Function entry ─────────────────────────────────────────────────────
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context;

  // 1) CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // 2) Human-friendly GET for browsers landing on /mcp directly
  if (request.method === "GET") {
    const accepts = request.headers.get("accept") ?? "";
    if (
      !accepts.includes("text/event-stream") &&
      !accepts.includes("application/json")
    ) {
      return withCors(
        new Response(
          JSON.stringify(
            {
              service: "md-2-pdf MCP",
              version: "2.1.0",
              transport: "streamable-http (stateless)",
              endpoint: new URL(request.url).pathname,
              description:
                "Remote Model Context Protocol server hosted on Cloudflare Pages. Point any MCP client at this URL.",
              docs: "https://md-2-pdf.pages.dev/docs#mcp-setup",
              tools: [
                "convert-markdown-to-pdf",
                "parse-markdown",
                "list-documents",
                "get-document",
                "create-guest-session",
              ],
              usage: {
                "Claude Desktop / Cursor / Cline":
                  "URL: https://md-2-pdf.pages.dev/mcp",
              },
            },
            null,
            2
          ),
          {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        )
      );
    }
  }

  // 3) Hand POST/GET(SSE)/DELETE off to the MCP transport (stateless mode).
  try {
    const server = createMcpServer(env);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // ← stateless (no session pinning, perfect for Pages)
      enableJsonResponse: true, // ← keep it simple: respond with JSON instead of SSE
    });

    // Connect server ↔ transport. waitUntil keeps it alive past response flush.
    waitUntil(server.connect(transport).catch(() => {}));

    const response = await transport.handleRequest(request);
    return withCors(response);
  } catch (err: any) {
    return withCors(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal MCP error",
            data: err?.message ?? String(err),
          },
          id: null,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }
};

// Re-export for tests / tooling
export { createMcpServer };

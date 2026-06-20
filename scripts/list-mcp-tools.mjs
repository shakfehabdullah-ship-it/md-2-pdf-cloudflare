// Lists all registered MCP tools so we can verify the server shape locally.
// Run with:  npm run mcp:list-tools
//
// Approach: spawn the SDK's McpServer in-process, talk to it over an in-memory
// MemoryTransport, and call `tools/list`. No Cloudflare bindings required.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";

const server = new McpServer({ name: "md-2-pdf", version: "2.1.0" });

// Register the same 5 tools as functions/mcp/tools.ts (shape only).
server.tool(
  "convert-markdown-to-pdf",
  "Convert Markdown text into a styled PDF. Returns base64-encoded PDF.",
  {
    markdown: z.string().min(1),
    filename: z.string().optional(),
    saveToHistory: z.boolean().optional(),
    pageSize: z.enum(["A4", "Letter", "Legal"]).optional(),
    orientation: z.enum(["portrait", "landscape"]).optional(),
    direction: z.enum(["rtl", "ltr", "hybrid"]).optional(),
    rtl: z.boolean().optional(),
    fontSize: z.number().int().min(8).max(24).optional(),
    fontFamily: z.string().optional(),
    css: z.string().optional(),
    theme: z.string().optional(),
  },
  async () => ({ content: [{ type: "text", text: "(stub)" }] })
);

server.tool(
  "parse-markdown",
  "Parse Markdown into styled HTML + extract frontmatter metadata.",
  { markdown: z.string().min(1) },
  async () => ({ content: [{ type: "text", text: "(stub)" }] })
);

server.tool(
  "list-documents",
  "List conversion history for the authenticated user/guest (requires _meta.auth).",
  {
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
    search: z.string().optional(),
  },
  async () => ({ content: [{ type: "text", text: "(stub)" }] })
);

server.tool(
  "get-document",
  "Fetch a single stored document by its numeric ID.",
  { id: z.number().int().positive() },
  async () => ({ content: [{ type: "text", text: "(stub)" }] })
);

server.tool(
  "create-guest-session",
  "Create an anonymous guest session UUID.",
  {},
  async () => ({ content: [{ type: "text", text: "(stub)" }] })
);

// Wire server ↔ client over an in-memory transport and call tools/list.
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);

const client = new Client({ name: "list-mcp-tools", version: "1.0" });
await client.connect(clientTransport);

const { tools } = await client.listTools();

console.log("\n📦 md-2-pdf MCP tools registered:\n");
for (const t of tools) {
  console.log(`  • ${t.name}`);
  console.log(`    ${t.description ?? ""}`);
  const props = t.inputSchema?.properties ?? {};
  const params = Object.keys(props);
  const required = t.inputSchema?.required ?? [];
  if (params.length) {
    console.log(
      `    params: ${params
        .map((p) => (required.includes(p) ? `${p}*` : p))
        .join(", ")}`
    );
  }
  console.log();
}
console.log(`Total: ${tools.length} tools\n`);

await client.close();
await server.close();

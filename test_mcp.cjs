// ── Remote MCP test harness ──────────────────────────────────────────────────
// Tests the deployed (or local `wrangler dev`) MCP server over Streamable HTTP.
//
// Usage:
//   node test_mcp.cjs                       # → https://md-2-pdf.pages.dev/mcp
//   MCP_URL=http://localhost:3000/mcp node test_mcp.cjs
//
// Requires Node 18+ (global fetch).

const MCP_URL = process.env.MCP_URL || "https://md-2-pdf.pages.dev/mcp";

const HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/event-stream",
  "MCP-Protocol-Version": "2025-06-18",
};

async function rpc(id, method, params) {
  const body = { jsonrpc: "2.0", id, method, params: params ?? {} };
  const res = await fetch(MCP_URL, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const contentType = res.headers.get("content-type") || "";

  // Streamable HTTP may answer with JSON or SSE. Unwrap SSE if needed.
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    const dataLines = text
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim());
    const last = dataLines[dataLines.length - 1];
    return JSON.parse(last);
  }
  return res.json();
}

(async () => {
  console.log(`\n🧪 Testing MCP server: ${MCP_URL}\n`);

  // 0) Friendly GET (browser landing)
  try {
    const info = await fetch(MCP_URL).then((r) => r.json());
    console.log("✅ Service info :", info.service, "v" + info.version);
    console.log("   endpoint     :", info.endpoint);
    console.log("   transport    :", info.transport);
    console.log("   tools        :", info.tools.join(", "));
  } catch (e) {
    console.warn("⚠️  GET info failed:", e.message);
  }

  // 1) Initialize
  const init = await rpc(1, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test_mcp.cjs", version: "1.0" },
  });
  console.log("\n1️⃣  initialize:", init.result?.serverInfo);
  console.log("   protocol    :", init.result?.protocolVersion);

  // 2) List tools
  const list = await rpc(2, "tools/list", {});
  console.log("\n2️⃣  tools/list :", list.result?.tools.map((t) => t.name).join(", "));

  // 3) Call parse-markdown (fast, no network)
  const parse = await rpc(3, "tools/call", {
    name: "parse-markdown",
    arguments: {
      markdown:
        "---\ntitle: Test Doc\nauthor: Ahmed\n---\n# مرحباً\n\n**نص عريض** و `code`",
      direction: "rtl",
    },
  });
  const parsed = JSON.parse(parse.result?.content?.[0]?.text ?? "{}");
  console.log("\n3️⃣  parse-markdown:", parsed.ok ? "✅ PASS" : "❌ FAIL");
  console.log("   metadata    :", parsed.metadata);
  console.log("   html length :", parsed.htmlLength);

  // 4) Call convert-markdown-to-pdf (hits Render – may be slow / fail offline)
  try {
    const convert = await rpc(4, "tools/call", {
      name: "convert-markdown-to-pdf",
      arguments: {
        markdown: "# MCP Test\n\nConverting from **remote MCP**.\n\n- Item 1\n- Item 2",
        pageSize: "A4",
        direction: "ltr",
      },
    });
    const out = JSON.parse(convert.result?.content?.[0]?.text ?? "{}");
    console.log("\n4️⃣  convert-markdown-to-pdf:", out.ok ? "✅ PASS" : "❌ FAIL");
    if (out.ok) {
      console.log("   filename    :", out.filename);
      console.log("   sizeBytes   :", out.sizeBytes);
      console.log("   payload b64 :", out.payload?.slice(0, 60) + "…");
    } else {
      console.log("   error       :", out);
    }
  } catch (e) {
    console.log("\n4️⃣  convert-markdown-to-pdf: ⏭️  skipped (" + e.message + ")");
  }

  // 5) create-guest-session
  const guest = await rpc(5, "tools/call", {
    name: "create-guest-session",
    arguments: {},
  });
  const guestOut = JSON.parse(guest.result?.content?.[0]?.text ?? "{}");
  console.log("\n5️⃣  create-guest-session:", guestOut.success ? "✅ PASS" : "❌ FAIL");
  if (guestOut.success) console.log("   guestSessionId:", guestOut.guestSessionId);

  console.log("\n✅ Done.\n");
})().catch((e) => {
  console.error("\n❌ Test suite error:", e.message);
  process.exit(1);
});

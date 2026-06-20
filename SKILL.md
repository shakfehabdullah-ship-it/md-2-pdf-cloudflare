# SKILL — md-2-pdf (Cloudflare)

> **Skill document for AI agents.** Paste this file into your agent's context (or register it as a skill) so it can drive the **md-2-pdf** service at `https://md-2-pdf.pages.dev` to convert Markdown into styled HTML / PDF, with first-class Arabic & RTL support.

---

## 1. What this service does

`md-2-pdf` is a hosted Markdown→PDF converter on **Cloudflare Pages + D1**, with an external Render.com Chromium service for the actual PDF rendering.

It is **optimised for Arabic/RTL content** but handles Latin text, code highlighting, KaTeX math, PlantUML diagrams, tables, and frontmatter metadata equally well.

**Base URL:** `https://md-2-pdf.pages.dev`
**Version (verified live):** `2.1.0`
**Protocol versions:** MCP `2025-06-18` · REST JSON

---

## 2. Decision tree: which interface should I use?

```
Do you need a PDF binary (chromium-rendered)?
├── YES → Do you have a Render/PDF service available?
│         ├── YES → use `convert-markdown-to-pdf` tool OR POST /api/convert
│         └── NO  → use `parse-markdown` and print HTML to PDF locally / fall back
│
└── NO (HTML preview, metadata extraction, inspection)
          → use `parse-markdown` tool OR POST /api/parse  (fast, no network)

Need to persist documents for a returning user?
├── Anonymous → create-guest-session, then pass guestSessionId
└── Named     → POST /api/auth/register or /api/auth/login → use JWT

Already integrating Claude/Cursor/Cline/etc.?
└── Use MCP at https://md-2-pdf.pages.dev/mcp  (preferred)
```

### TL;DR preference order

1. **MCP** (`/mcp`) — if your runtime speaks MCP (Claude Code, Cursor, Cline, etc.). Gives you structured tool calls + typed schemas.
2. **REST API** (`/api/*`) — if you only have HTTP (scripts, notebooks, custom agents, `curl`).
3. **Web UI** (`/`) — for human end-users. Don't script against this.

---

## 3. Verified interface status (test the live service first)

Always start a session by pinging these. If they fail, the rest will fail.

| Probe | Expected | What it tells you |
|---|---|---|
| `GET /api/health` | `200 {"status":"ok",...}` | Site is alive |
| `GET /mcp` (no Accept header) | `200` JSON listing tools | MCP server alive |
| `POST /mcp` JSON-RPC `initialize` | `200` with `serverInfo` | MCP transport works |
| `POST /api/parse` with `{markdown:"# hi"}` | `200` `{"success":true,html:...}` | Markdown engine works |

⚠️ **Currently known gap (as of last test):** `POST /api/convert` and the `convert-markdown-to-pdf` MCP tool return `RENDER_ERROR 404` because the external Render/PDF service URL is not wired up on this deployment. **Use `parse-markdown` and render HTML→PDF yourself, or wait for the operator to fix `RENDER_PDF_URL`.** Verify before assuming PDF works.

---

## 4. MCP interface (preferred for agent runtimes)

**Endpoint (single URL, Streamable HTTP, stateless):**
```
https://md-2-pdf.pages.dev/mcp
```

**Required headers** for every JSON-RPC POST:
```
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2025-06-18
```

### 4.1 Handshake

```jsonc
// → initialize
{"jsonrpc":"2.0","id":1,"method":"initialize",
 "params":{"protocolVersion":"2025-06-18","capabilities":{},
           "clientInfo":{"name":"my-agent","version":"1.0"}}}

// ← server replies with serverInfo: {name:"md-2-pdf", version:"2.1.0"}
//   Send the initialized notification, then call tools as needed.
{"jsonrpc":"2.0","method":"notifications/initialized"}
```

### 4.2 Tool catalogue (5 tools)

#### `parse-markdown` — Markdown → styled HTML + metadata ⭐ **most reliable**
Always works. No external rendering. Use this by default.

```jsonc
{"jsonrpc":"2.0","id":2,"method":"tools/call",
 "params":{"name":"parse-markdown","arguments":{
   "markdown":"---\ntitle: Report\nauthor: Sara\n---\n# مرحباً\n\n**bold** `code`",
   "direction":"rtl",            // "rtl" | "ltr" | "hybrid"
   "pageSize":"A4",              // cosmetic unless PDF later
   "fontSize":11
 }}}
```

Returns JSON:
```jsonc
{ "ok": true,
  "metadata": {"title":"Report","author":"Sara","createdAt":"…"},
  "htmlLength": 8421,
  "html": "<!DOCTYPE html>…" }
```
The `html` field is a **complete standalone document** — write it to disk and open in any browser, or pipe it to your own PDF printer (e.g. `puppeteer`, `wkhtmltopdf`, `chromium --headless --print-to-pdf`).

#### `convert-markdown-to-pdf` — full PDF pipeline
⚠️ Requires Render service to be configured. Returns base64 PDF. Supports every option in §6.

```jsonc
{"name":"convert-markdown-to-pdf",
 "arguments":{
   "markdown":"# Title\n…",
   "pageSize":"A4",
   "direction":"rtl",
   "filename":"report.pdf",
   "saveToHistory": false        // true requires auth (see §5)
 }}
```

Response shape:
```jsonc
{ "ok": true, "filename":"report.pdf",
  "mimeType":"application/pdf", "encoding":"base64",
  "sizeBytes": 18342,
  "metadata": {"title":"…"},
  "payload": "JVBERi0xLjQK…" }    // base64 — decode & write bytes to disk
```

#### `create-guest-session` — anonymous identity
Returns a UUID to use as `_meta.auth.guestSessionId` on `list-documents` / `saveToHistory`. Use when you don't want a full account but want history.

```jsonc
{"name":"create-guest-session","arguments":{}}
// → { "success":true, "guestSessionId":"8a991a1d-…", "usage":"…" }
```

#### `list-documents` — paginated history (requires auth)
```jsonc
{"name":"list-documents",
 "arguments":{"limit":10,"offset":0,"search":"report"},
 "_meta":{"auth":{"guestSessionId":"8a991a1d-…"}}}
// or: "_meta":{"auth":{"token":"<JWT>"}}
```

#### `get-document` — fetch one document by ID
```jsonc
{"name":"get-document","arguments":{"id":42}}
```

### 4.3 Minimal MCP client config (Claude / Cursor / Cline / etc.)

```json
{
  "mcpServers": {
    "md-2-pdf": { "url": "https://md-2-pdf.pages.dev/mcp" }
  }
}
```

Or via Claude Code CLI:
```bash
claude mcp add --transport http md-2-pdf https://md-2-pdf.pages.dev/mcp
```

---

## 5. REST API interface (for plain HTTP clients)

All paths below are under `https://md-2-pdf.pages.dev`. Auth headers (when needed):
- `Authorization: Bearer <JWT>` for users, OR
- `x-guest-session: <UUID>` for anonymous sessions

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/health` | – | `{status:"ok",version:"2.1.0"}` | liveness |
| GET | `/api/docs` | – | list of endpoints | machine-readable map |
| POST | `/api/parse` | `{markdown, options?}` | `{success, html, metadata}` | ⭐ reliable |
| POST | `/api/convert` | `{markdown, options?}` | `{success, pdf, metadata}` | ⚠️ needs Render |
| POST | `/api/convert/base64` | `{markdown, options?}` | `{success, pdfBase64, metadata}` | same as above, no history save |
| POST | `/api/auth/register` | `{username,email,password,displayName?}` | `{success, token, user}` | also returns JWT |
| POST | `/api/auth/login` | `{email,password}` | `{success, token, user}` | JWT expires in 7 days |
| POST | `/api/auth/guest` | – | `{success, guestSessionId}` | no body needed |
| GET | `/api/auth/me` | – | `{success, user, isGuest}` | reads `Authorization` |
| GET | `/api/history?limit&offset&search` | – | `{success, documents[]}` | requires auth |
| GET | `/api/history/:id` | – | `{success, document}` | full record incl. markdown |
| GET | `/api/history/stats/summary` | – | `{success, stats}` | counts & sizes |
| DELETE | `/api/history/:id` | – | `{success, deleted}` | requires auth |

### 5.1 Copy-paste examples (verified working)

```bash
# Parse markdown to HTML (works right now)
curl -s -X POST https://md-2-pdf.pages.dev/api/parse \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# مرحباً\n\n**test**","options":{"direction":"rtl"}}' \
  | jq -r .html > out.html

# Anonymous history session
GUEST=$(curl -s -X POST https://md-2-pdf.pages.dev/api/auth/guest | jq -r .guestSessionId)
curl -s https://md-2-pdf.pages.dev/api/history?limit=5 \
  -H "x-guest-session: $GUEST"
```

---

## 6. `ConversionOptions` schema

Identical for both MCP and REST. All fields optional.

| Field | Type | Default | Notes |
|---|---|---|---|
| `pageSize` | `"A4"\|"Letter"\|"Legal"` | `A4` | PDF only |
| `orientation` | `"portrait"\|"landscape"` | `portrait` | PDF only |
| `direction` | `"rtl"\|"ltr"\|"hybrid"` | `rtl` | **Preferred over `rtl` flag.** `hybrid` auto-detects per-paragraph. |
| `rtl` | boolean | `true` | Legacy; prefer `direction` |
| `fontSize` | number (8–24) | `10` | px |
| `fontFamily` | string | `'Segoe UI', Tahoma, Arial, sans-serif` | any CSS font stack |
| `margin` | `{top,right,bottom,left}` | `{20mm,15mm,20mm,15mm}` | CSS lengths |
| `css` | string | – | extra CSS appended to `<style>` |
| `headerTemplate` / `footerTemplate` | string | – | Puppeteer header/footer HTML |
| `title` | string | from frontmatter | overrides metadata title |
| `theme` | string | `"default"` | stored in history |

### Frontmatter (recommended way to set metadata)
```markdown
---
title: تقرير المبيعات Q2
author: فريق التحليل
subject: نتائج الربع الثاني
keywords: [مبيعات, تقرير, Q2]
date: 2026-06-20
---
# المحتوى…
```

---

## 7. Proven workflow patterns

### Pattern A — "I just need pretty HTML fast" (no auth, no Render)
1. `POST /api/parse` with `{markdown, options:{direction:"rtl"}}`
2. Save `response.html` to disk → open in browser or print to PDF locally.

✅ Works today, no auth, sub-second.

### Pattern B — "Convert many files via agent, persist history"
1. Once: `POST /api/auth/guest` → store `guestSessionId`.
2. For each file: `POST /api/convert` with header `x-guest-session: <id>` (when Render is wired up). On failure, fall back to Pattern A.
3. Later: `GET /api/history?search=…` to recall.

### Pattern C — "MCP-driven agent in Claude/Cursor"
1. Register the MCP URL in your client (see §4.3).
2. Ask the agent: *"Convert this markdown to a PDF report with RTL Arabic layout."*
3. The agent will call `convert-markdown-to-pdf` (or `parse-markdown` as fallback) for you.

### Pattern D — "Robust fallback when Render is down"
1. Try `convert-markdown-to-pdf`. If it returns `isError:true` or the JSON has `error:"RENDER_..."`, immediately:
2. Call `parse-markdown` → get `html`.
3. Print HTML→PDF yourself with whatever's available locally (`puppeteer`, `playwright`, `chromium --headless --print-to-pdf=out.pdf file://…/out.html`).

---

## 8. Quirks, gotchas & limits

| Issue | What to do |
|---|---|
| `RENDER_ERROR 404` from `/api/convert` | Render service URL is unset on this deployment. Use Pattern D. |
| MCP `convert-markdown-to-pdf` returns non-JSON ("PDF conversion failed…") | Same root cause as above; the tool returns `isError:true` text. Catch the parse failure and fall back. |
| Arabic shows as `?????` in plain terminals | That's just terminal encoding. The actual bytes are UTF-8 — fine in any file or browser. |
| `direction:"hybrid"` looks weird | Only use `hybrid` for mixed LTR/RTL paragraphs. For pure Arabic, `rtl` is cleaner. |
| MCP responses may be SSE-framed | If `Content-Type: text/event-stream`, parse the last `data:` line as the JSON-RPC response. |
| Stateless MCP (no `Mcp-Session-Id`) | Don't try to resume sessions — each request is independent. |
| 7-day JWT expiry | Re-login if `401`; for long-running agents, prefer guest sessions (UUIDs don't expire). |
| Tables & code blocks page-break | Already handled (`page-break-inside: avoid`). Don't fight it with custom CSS unless necessary. |

---

## 9. Quick "what would a great agent do?" examples

> **User:** "حوّل هاد الماركداون لـ PDF بالعربي."
> **Agent should:**
> 1. Call `convert-markdown-to-pdf` with `{direction:"rtl", saveToHistory:false}`.
> 2. If error → call `parse-markdown`, save `html`, then run local `chromium --headless --print-to-pdf`.
> 3. Return the file path.

> **User:** "خزّن هالتقرير تحت اسمي عشان أرجعله بعدين."
> **Agent should:**
> 1. Call `create-guest-session` once, store the UUID.
> 2. Call `convert-markdown-to-pdf` with `{saveToHistory:true, _meta:{auth:{guestSessionId:UUID}}}`.
> 3. Tell the user the guest session ID so they can resume later via `list-documents`.

> **User:** "أعطيني معاينة سريعة بدون ما تنتظر Chromium."
> **Agent should:** call `parse-markdown` → write `html` → open in browser. Done in <1s.

---

## 10. Health-checking cheat sheet (paste into your agent's first turn)

```
1. GET https://md-2-pdf.pages.dev/api/health       → must be 200 ok
2. GET https://md-2-pdf.pages.dev/mcp              → must list 5 tools
3. POST /api/parse {"markdown":"# t"}              → must return success:true
4. POST /api/convert {"markdown":"# t"}            → if 200 with .pdf → Render OK
                                                   → if RENDER_ERROR → announce
                                                     that PDFs require fallback
```

If steps 1–3 pass, the service is healthy. Step 4 decides whether PDFs work today.

---

## 11. Links

- Live site: <https://md-2-pdf.pages.dev>
- Human docs: <https://md-2-pdf.pages.dev/docs>
- MCP endpoint: <https://md-2-pdf.pages.dev/mcp>
- Source: <https://github.com/shakfehabdullah-ship-it/md-2-pdf-cloudflare>
- MCP spec: <https://modelcontextprotocol.io>
- Cloudflare Agents + MCP: <https://developers.cloudflare.com/agents/model-context-protocol/>

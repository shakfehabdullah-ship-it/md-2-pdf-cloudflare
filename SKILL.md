---
name: md-2-pdf
description: Convert Markdown to styled PDF documents via the md-2-pdf Cloudflare service. Supports Arabic/RTL layouts, LaTeX math, code syntax highlighting (GitHub Dark Dimmed), PlantUML diagrams, multiple themes (blue, red, green, purple, gold), and multi-file upload. Use when the user asks to convert Markdown to PDF, generate PDF documents from text, or use the md-2-pdf MCP server.
---

# MD-2-PDF Skill

Convert Markdown into styled PDF documents with full Arabic/RTL support.

## Quick Start

### Option 1: MCP Server (recommended for AI agents)

Point any MCP-compatible client at:

```
https://md-2-pdf.pages.dev/mcp
```

Available tools:

| Tool | Description |
|------|-------------|
| `convert-markdown-to-pdf` | Markdown → PDF (base64). Supports frontmatter, RTL, LaTeX, PlantUML, code highlighting |
| `parse-markdown` | Markdown → styled HTML (no PDF rendering, fast) |
| `list-documents` | List previously converted documents (requires auth) |
| `get-document` | Fetch a stored document by ID |
| `create-guest-session` | Create anonymous guest session UUID |

### Option 2: REST API

```
POST https://md-2-pdf.pages.dev/api/convert
Content-Type: application/json

{
  "markdown": "# Hello World\n\nThis is **bold** text.",
  "options": {
    "direction": "rtl",       // rtl | ltr | hybrid
    "theme": "blue",          // blue | red | green | purple | gold
    "pageSize": "A4",         // A4 | Letter | Legal
    "orientation": "portrait" // portrait | landscape
  }
}
```

Response: `{ "success": true, "pdf": "<base64>", "metadata": {} }`

### Option 3: Web UI

Visit https://md-2-pdf.pages.dev — write or upload Markdown, preview, and download PDF.

## Conversion Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `direction` | `rtl\|ltr\|hybrid` | `rtl` | Text direction. `hybrid` = auto-detect per paragraph |
| `theme` | `string` | `blue` | Color theme: blue, red, green, purple, gold |
| `pageSize` | `A4\|Letter\|Legal` | `A4` | PDF page size |
| `orientation` | `portrait\|landscape` | `portrait` | Page orientation |
| `fontSize` | `number` | `10` | Body font size (8–24) |
| `fontFamily` | `string` | — | CSS font-family |
| `css` | `string` | — | Extra CSS appended to document |
| `margin` | `object` | `{top:20mm, ...}` | Page margins (CSS lengths) |

## Supported Features

- **RTL/Arabic** — Full right-to-left layout with Arabic typography
- **LaTeX math** — `$inline$` and `$$block$$` via KaTeX
- **Code highlighting** — GitHub Dark Dimmed theme, language label, copy button
- **PlantUML** — ` ```plantuml ` blocks rendered as SVG diagrams
- **Frontmatter** — `title`, `author`, `subject`, `keywords`, `date`
- **Multiple themes** — blue, red, green, purple, gold

## MCP Usage Examples

### Convert Markdown to PDF

```json
{
  "method": "tools/call",
  "params": {
    "name": "convert-markdown-to-pdf",
    "arguments": {
      "markdown": "# تقرير\n\nهذا **نص عربي** مع كود:\n```javascript\nconsole.log('مرحبا');\n```",
      "direction": "rtl",
      "theme": "blue"
    }
  }
}
```

### Parse Markdown (HTML only, no PDF)

```json
{
  "method": "tools/call",
  "params": {
    "name": "parse-markdown",
    "arguments": {
      "markdown": "# Hello\n\n**Bold text**"
    }
  }
}
```

## Authentication (optional)

Auth is needed only for document history persistence.

- **Register**: `POST /api/auth/register` → `{ username, email, password }`
- **Login**: `POST /api/auth/login` → `{ email, password }`
- **Guest**: `POST /api/auth/guest` → returns `{ guestSessionId }`

Pass token as `Authorization: Bearer <token>` header or `_meta.auth.token` in MCP calls.

## Other API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/parse` | Markdown → HTML |
| `GET` | `/api/history` | List documents (auth required) |
| `GET` | `/api/history/:id` | Get single document |
| `DELETE` | `/api/history/:id` | Delete document |

## Limitations

- PDF generation uses Cloudflare Browser Rendering ( Puppeteer). Rate limits may apply.
- Maximum Markdown size: ~100KB recommended.
- PlantUML diagrams fetched from plantuml.com (requires internet).

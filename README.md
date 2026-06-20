# md-2-pdf-cloudflare

> محوّل Markdown → PDF مع دعم كامل للعربية/RTL، مُستضاف على **Cloudflare Pages** + **D1** + خدمة Render خارجية لرسم PDF عبر Chromium.

رابط الإنتاج: <https://md-2-pdf.pages.dev>

---

## ✨ المميزات

- 📝 **محرك تحويل غني**: frontmatter، تلوين كود (GitHub-Dark-Dimmed)، رياضيات KaTeX (`$...$` / `$$...$$`)، رسوم PlantUML، جداول، اقتباسات.
- 🌍 **دعم RTL كامل**: تخطيطات `rtl` / `ltr` / `hybrid` (تلقائي حسب الفقرة) للنصوص العربية/المختلطة.
- 🎨 **CSS احترافي للطباعة**: صفحة غلاف، فواصل صفحات، `print-color-adjust: exact`.
- 🧠 **خادم MCP عن بُعد** — أي عميل MCP (Claude، Cursor، Cline، Gemini CLI، Codex، …) يتصل بـ `https://md-2-pdf.pages.dev/mcp`.
- 🔐 **مصادقة JWT** + جلسات ضيف مجهولة لحفظ السجل في D1.
- 🚀 **REST API** كامل عبر Hono / Pages Functions.

---

## 🏗️ البنية

```
md-2-pdf-cloudflare/
├── functions/                     # Cloudflare Pages Functions (API + MCP)
│   ├── api/[[path]].ts            #   catch-all REST API
│   ├── mcp/[[route]].ts           #   ← Remote MCP server (Streamable HTTP)
│   ├── mcp/tools.ts               #   ← MCP tool registrations
│   ├── routes/{auth,convert,history}.ts
│   ├── engine/converter.ts        #   Markdown → HTML
│   ├── middleware/auth.ts         #   JWT + guest-session
│   ├── db/                        #   D1 helpers + models + migrations.sql
│   └── types/env.d.ts             #   Cloudflare Env bindings
├── public/                        # Static frontend
│   ├── index.html                 #   Converter UI
│   ├── docs.html                  #   API + MCP docs
│   ├── history.html
│   └── {css,js}/…
├── render-service/                # Separate Express + Puppeteer service (Render.com)
│   ├── server.js
│   └── converter.js
├── scripts/list-mcp-tools.mjs     # Local introspection helper
├── test_mcp.cjs                   # HTTP-based MCP test harness
├── wrangler.toml
├── tsconfig.json
└── package.json
```

---

## 🚀 التطوير المحلي

```bash
npm install
npm run dev      # wrangler dev على http://localhost:3000
```

تحتاج إلى:
- Cloudflare account + `wrangler login`
- قاعدة D1 باسم `md2pdf-db` (انظر `wrangler.toml`)
- خدمة Render لطباعة PDF (متغيّر `RENDER_PDF_URL`)

### سكريبتات npm

| Script | الوظيفة |
|---|---|
| `npm run dev` | تشغيل محلي عبر wrangler |
| `npm run build` | فحص أنواع TypeScript (`tsc --noEmit`) |
| `npm run typecheck` | نفس المفعوب |
| `npm run pages:build` | بناء Pages Functions bundle |
| `npm run pages:deploy` | نشر `./public` على Pages |
| `npm run db:migrate` | تنفيذ ترحيلات D1 (إنتاج) |
| `npm run db:migrate:local` | تنفيذ الترحيلات محلياً |
| `npm run mcp:list-tools` | استعراض أدوات MCP المسجّلة محلياً |

---

## 🔌 REST API

كل المسارات تحت `/api`:

| Method | Path | الوصف |
|---|---|---|
| `GET` | `/api/health` | فحص الصحة |
| `GET` | `/api/docs` | قائمة endpoints |
| `POST` | `/api/convert` | Markdown → PDF (base64) + حفظ في السجل |
| `POST` | `/api/convert/base64` | Markdown → PDF (base64 فقط) |
| `POST` | `/api/parse` | Markdown → HTML + metadata |
| `POST` | `/api/auth/register` | إنشاء حساب → JWT |
| `POST` | `/api/auth/login` | تسجيل دخول → JWT |
| `POST` | `/api/auth/guest` | إنشاء UUID جلسة ضيف |
| `GET` | `/api/auth/me` | المستخدم الحالي |
| `GET` | `/api/history` | قائمة المستندات |
| `GET` | `/api/history/:id` | مستند واحد |
| `GET` | `/api/history/stats/summary` | إحصائيات |
| `DELETE` | `/api/history/:id` | حذف مستند |

---

## 🤖 خادم MCP (Remote)

الخادم يعمل على Cloudflare Pages عبر **Streamable HTTP transport** (stateless). لا حاجة لتثبيت أي شيء محلياً — فقط أضف هذا الـ URL لأي عميل MCP:

```
https://md-2-pdf.pages.dev/mcp
```

### الأدوات الخمس

| Tool | الوصف |
|---|---|
| `convert-markdown-to-pdf` | تحويل Markdown → PDF (base64). يدعم جميع خيارات `ConversionOptions`. |
| `parse-markdown` | تحويل Markdown → HTML + استخراج frontmatter (بدون PDF). |
| `list-documents` | قائمة السجل (يتطلب auth في `_meta.auth`). |
| `get-document` | جلب مستند عبر ID. |
| `create-guest-session` | توليد UUID جلسة ضيف. |

### أمثلة الإعداد

**Claude Desktop / Cursor / Cline:**
```json
{
  "mcpServers": {
    "md-2-pdf": { "url": "https://md-2-pdf.pages.dev/mcp" }
  }
}
```

**Claude Code CLI:**
```bash
claude mcp add --transport http md-2-pdf https://md-2-pdf.pages.dev/mcp
```

**Codex (`~/.codex/config.toml`):**
```toml
[mcp_servers.md-2-pdf]
type = "http"
url = "https://md-2-pdf.pages.dev/mcp"
```

### الاختبار

```bash
# ضد الإنتاج
node test_mcp.cjs

# ضد wrangler dev محلياً
MCP_URL=http://localhost:3000/mcp node test_mcp.cjs
```

توثيق تفصيلي (بالعربية): <https://md-2-pdf.pages.dev/docs#mcp-setup>

---

## 🔐 المصادقة في MCP

أدوات `saveToHistory` و `list-documents` تحتاج إلى auth. مرّر إحداهما في `_meta.auth` عند استدعاء الأداة:

```jsonc
// JWT من /api/auth/login
{ "_meta": { "auth": { "token": "<JWT>" } } }

// أو UUID جلسة ضيف من create-guest-session
{ "_meta": { "auth": { "guestSessionId": "<UUID>" } } }
```

---

## 🛠️ خيارات التحويل

```ts
interface ConversionOptions {
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  fontSize?: number;        // 8..24
  fontFamily?: string;
  headerTemplate?: string;  // Puppeteer header HTML
  footerTemplate?: string;  // Puppeteer footer HTML
  css?: string;             // Extra CSS injected
  title?: string;
  rtl?: boolean;
  direction?: "rtl" | "ltr" | "hybrid";
  theme?: string;
}
```

---

## 📦 النشر

```bash
# 1) تأكد من أن D1 مربوط في wrangler.toml
# 2) ثبّت JWT_SECRET كـ Pages secret
wrangler pages secret put JWT_SECRET

# 3) حدّث RENDER_PDF_URL في wrangler.toml لخدمة Render الحقيقية

# 4) انشر
npm run pages:deploy
```

---

## 📄 الرخصة

MIT

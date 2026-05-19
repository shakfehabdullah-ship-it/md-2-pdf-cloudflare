# MD-2-PDF Cloudflare Pages Deployment - Implementation Plan

## Overview

This plan enables deploying the md-2-pdf project to Cloudflare's edge network using **Cloudflare Pages** (not Workers). Pages handles static files natively and uses Functions for the API backend. The original project remains untouched.

## ✅ Live Deployment

- **URL:** https://md-2-pdf.pages.dev
- **Platform:** Cloudflare Pages
- **D1 Database:** `md2pdf-db` (ID: `5b623cd0-f45f-4d71-8585-46904f62ed18`)
- **Browser Rendering:** Enabled (binding: `MYBROWSER`)

## Architecture

| Component | Original | Cloudflare |
|---|---|---|
| **Hosting** | Node.js server | Cloudflare Pages |
| **Static Files** | Express static | Pages (automatic) |
| **API** | Express.js routes | Pages Functions (Hono) |
| **PDF Engine** | Puppeteer + Chrome | @cloudflare/puppeteer (Browser Rendering) |
| **Database** | sql.js (in-memory SQLite) | Cloudflare D1 (edge SQLite) |
| **Auth** | JWT + bcryptjs | JWT + bcryptjs (same) |

## Project Structure

```
md-2-pdf-cloudflare/
├── wrangler.toml              # Cloudflare config (D1, Browser bindings)
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── public/                    # ← Static files (served automatically by Pages)
│   ├── index.html             # Main UI
│   ├── docs.html              # API docs page
│   ├── history.html           # History page
│   ├── css/                   # Stylesheets
│   └── js/                    # Frontend JavaScript
├── functions/                 # ← Pages Functions (API backend)
│   ├── api/
│   │   └── [[path]].ts        # Catch-all API handler (Hono app)
│   ├── routes/
│   │   ├── auth.ts            # Auth routes (register/login/guest)
│   │   ├── convert.ts         # Convert/parse endpoints
│   │   └── history.ts         # Document history
│   ├── middleware/
│   │   └── auth.ts            # JWT auth middleware
│   ├── engine/
│   │   ├── converter.ts       # PDF conversion (Browser Rendering)
│   │   └── index.ts          # Exports
│   ├── db/
│   │   ├── database.ts        # D1 database helpers
│   │   ├── migrations.sql     # D1 SQL schema
│   │   ├── models/
│   │   │   ├── document.ts    # Document model
│   │   │   └── user.ts        # User model
│   │   └── index.ts
│   └── types/
│       └── env.d.ts           # Cloudflare env type bindings
└── ImplementationPlan.md      # This file
```

## Step-by-Step Deployment

### 1. Prerequisites

- Cloudflare account with Pages enabled
- API Token with permissions: Pages, D1, Browser Rendering
- Node.js 18+ and npm
- Wrangler CLI: `npm install -g wrangler`

### 2. Create D1 Database

```bash
wrangler d1 create md2pdf-db
```

Copy the `database_id` from output into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "md2pdf-db"
database_id = "<YOUR_DATABASE_ID>"
```

### 3. Run Migrations

```bash
wrangler d1 execute md2pdf-db --remote --file=./functions/db/migrations.sql
```

### 4. Create Pages Project

```bash
wrangler pages project create md-2-pdf --production-branch=main
```

### 5. Deploy

```bash
CLOUDFLARE_API_TOKEN=your_token wrangler pages deploy public
```

### 6. Set Secrets

```bash
CLOUDFLARE_API_TOKEN=your_token wrangler pages secret put JWT_SECRET --project-name=md-2-pdf
```

### 7. Configure Bindings

In Cloudflare Dashboard → Pages → md-2-pdf → Settings → Functions:

- **D1 Database binding:** `DB` → `md2pdf-db`
- **Browser Rendering binding:** `MYBROWSER`

Or set them in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "md2pdf-db"
database_id = "your-db-id"

[browser]
binding = "MYBROWSER"
```

## How Pages Functions Work

Cloudflare Pages serves static files from `public/` automatically. For API requests, it runs Functions from the `functions/` directory.

The file `functions/api/[[path]].ts` is a **catch-all route** that handles all `/api/*` requests using Hono:

```typescript
import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

const app = new Hono();
app.get("/api/health", (c) => c.json({ status: "ok" }));
// ... other routes

export const onRequest = handle(app);
```

Key points:
- `[[path]]` = catch-all (matches any sub-path under `/api/`)
- `handle()` from `hono/cloudflare-pages` adapts Hono for Pages Functions
- Static files (`public/`) are served automatically, no config needed

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Web interface (static) |
| GET | `/docs` | API docs (static) |
| GET | `/history` | History page (static) |
| GET | `/api/health` | Health check |
| GET | `/api/docs` | API docs JSON |
| POST | `/api/convert` | Markdown → PDF download |
| POST | `/api/convert/base64` | Markdown → PDF (base64 response) |
| POST | `/api/parse` | Parse markdown, return HTML |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/guest` | Create guest session |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/history` | Get document history |
| DELETE | `/api/history/:id` | Delete document |

## Key Code Changes

### Express → Hono

```typescript
// Before (Express)
import express from "express";
const app = express();
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// After (Hono on Pages)
import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
const app = new Hono();
app.get("/api/health", (c) => c.json({ status: "ok" }));
export const onRequest = handle(app);
```

### Puppeteer → @cloudflare/puppeteer

```typescript
// Before
const browser = await puppeteer.launch({ headless: true });

// After (Cloudflare Browser Rendering)
const browser = await puppeteer.launch(env.MYBROWSER);
```

### sql.js → D1

```typescript
// Before (synchronous)
const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

// After (async D1)
const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
```

## Troubleshooting

### Static files return 404
- Ensure files are in `public/` directory
- Redeploy: `wrangler pages deploy public`

### API returns 500
- Check D1 and Browser bindings in Pages settings
- View logs: `wrangler pages deployment tail`

### Browser Rendering not available
- Enable it in Cloudflare Dashboard → Workers & Pages → Settings
- Check `wrangler.toml` has `[browser] binding = "MYBROWSER"`

### CORS issues
- CORS middleware is configured in the Hono app
- For custom domains, update CORS origins

## Cost

| Service | Free Tier |
|---|---|
| Pages | 500 builds/month, unlimited requests |
| D1 | 5GB storage, 5M rows read/day |
| Browser Rendering | 30 min/day (beta) |

## Credits

Original project: [md-2-pdf](https://github.com/abdalganih1/md-2-pdf)
Cloudflare Pages adaptation by Abdullah Shakfeh
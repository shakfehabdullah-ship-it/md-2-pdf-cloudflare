// ── Pages Function: Catch-all API handler ────────────────────────────────────
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/cloudflare-pages";
import authRoutes from "../routes/auth.js";
import historyRoutes from "../routes/history.js";
import convertRoutes from "../routes/convert.js";
import type { Env } from "../types/env.js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.route("/api/auth", authRoutes);
app.route("/api/history", historyRoutes);
app.route("/api", convertRoutes);

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "md-2-pdf",
    version: "2.0.0",
    platform: "cloudflare-pages",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/docs", (c) => {
  return c.json({
    version: "2.0.0",
    baseUrl: "/api",
    endpoints: [
      { method: "GET", path: "/api/health", description: "فحص صحة الخادم" },
      { method: "POST", path: "/api/convert", description: "تحويل Markdown إلى PDF" },
      { method: "POST", path: "/api/convert/base64", description: "تحويل إلى PDF (base64)" },
      { method: "POST", path: "/api/parse", description: "تحليل Markdown" },
      { method: "POST", path: "/api/auth/register", description: "تسجيل مستخدم جديد" },
      { method: "POST", path: "/api/auth/login", description: "تسجيل الدخول" },
      { method: "POST", path: "/api/auth/guest", description: "إنشاء جلسة ضيف" },
      { method: "GET", path: "/api/history", description: "جلب سجلات المستندات" },
    ],
  });
});

export const onRequest = handle(app);
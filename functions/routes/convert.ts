// ── Convert Routes (Hono) ───────────────────────────────────────────────────
import { Hono } from "hono";
import { convertMarkdownToPdf, parseMarkdown, markdownToHtml } from "../engine/converter.js";
import { optionalAuth } from "../middleware/auth.js";
import { DocumentModel } from "../db/models/document.js";
import type { Env } from "../types/env.js";

const convert = new Hono<{ Bindings: Env }>();

convert.use("*", optionalAuth);

// ── Markdown → PDF (base64) ────────────────────────────────────────────────
convert.post("/convert", async (c) => {
  try {
    const body = await c.req.json();
    const { markdown, options = {} } = body;

    if (!markdown) {
      return c.json({ success: false, error: "محتوى Markdown مطلوب" }, 400);
    }

    const result = await convertMarkdownToPdf(markdown, options, c.env.MYBROWSER);

    if (!result.success) {
      // If browser rate-limited, return HTML fallback with helpful message
      if (result.error && result.error.includes("429")) {
        const { metadata, content } = parseMarkdown(markdown);
        const html = markdownToHtml(content, metadata, options);
        return c.json({
          success: false,
          error: "تم تجاوز حد التحويل اليومي. يمكنك استخدام خيار 'تحميل HTML' ثم الطباعة كـ PDF من المتصفح.",
          fallback: true,
          html,
          metadata,
        }, 429);
      }
      return c.json({ success: false, error: result.error }, 500);
    }

    // Save to history if user or guest
    const userId = c.get("userId") as number | undefined;
    const guestId = c.req.header("x-guest-session") as string | undefined;

    if (userId || guestId) {
      try {
        await DocumentModel.create(c.env.DB, {
          user_id: userId || null,
          guest_session_id: guestId || null,
          title: result.metadata.title || "بدون عنوان",
          filename: `${result.metadata.title || "document"}.pdf`,
          markdown_content: markdown,
          markdown_size: new TextEncoder().encode(markdown).length,
          pdf_size: result.pdfBase64 ? atob(result.pdfBase64).length : 0,
          pdf_generated: true,
          theme: options.theme || "default",
          page_size: options.pageSize || "A4",
          orientation: options.orientation || "portrait",
        });
      } catch {
        // History save failure shouldn't block the response
      }
    }

    return c.json({
      success: true,
      pdf: result.pdfBase64,
      metadata: result.metadata,
    });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "خطأ في التحويل" },
      500
    );
  }
});

// ── Markdown → PDF (returns raw PDF) ───────────────────────────────────────
convert.post("/convert/base64", async (c) => {
  try {
    const body = await c.req.json();
    const { markdown, options = {} } = body;

    if (!markdown) {
      return c.json({ success: false, error: "محتوى Markdown مطلوب" }, 400);
    }

    const result = await convertMarkdownToPdf(markdown, options, c.env.MYBROWSER);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 500);
    }

    return c.json({
      success: true,
      pdfBase64: result.pdfBase64,
      metadata: result.metadata,
    });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "خطأ في التحويل" },
      500
    );
  }
});

// ── Parse Markdown (returns HTML, no PDF) ───────────────────────────────────
convert.post("/parse", async (c) => {
  try {
    const body = await c.req.json();
    const { markdown, options = {} } = body;

    if (!markdown) {
      return c.json({ success: false, error: "محتوى Markdown مطلوب" }, 400);
    }

    const { metadata, content } = parseMarkdown(markdown);
    const html = markdownToHtml(content, metadata, options);

    return c.json({
      success: true,
      html,
      metadata,
    });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "خطأ في التحليل" },
      500
    );
  }
});

export default convert;
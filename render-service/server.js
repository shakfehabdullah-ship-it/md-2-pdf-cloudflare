import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertMarkdownToPdf, htmlToPdf } from "./converter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.text({ type: "text/markdown", limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Pure HTML -> PDF printer. Used by the Cloudflare frontend (option B):
// Cloudflare builds the HTML, this service only runs Chromium to print it.
app.post("/print", async (req, res) => {
  try {
    const { html, options = {} } = req.body || {};
    if (!html || typeof html !== "string") {
      return res.status(400).json({ error: "html is required" });
    }
    const pdf = await htmlToPdf(html, options);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdf.length);
    res.end(pdf);
  } catch (err) {
    console.error("print error:", err);
    res.status(500).json({ error: err?.message || "print failed" });
  }
});

app.post("/convert", async (req, res) => {
  try {
    const markdown =
      typeof req.body === "string" ? req.body : req.body?.markdown;
    const options = (typeof req.body === "object" && req.body?.options) || {};

    if (!markdown || typeof markdown !== "string" || !markdown.trim()) {
      return res.status(400).json({ error: "markdown is required" });
    }

    const { pdf, metadata } = await convertMarkdownToPdf(markdown, options);

    const safeName = (metadata.title || "document")
      .replace(/[^\wء-ي\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_") || "document";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}.pdf`
    );
    res.setHeader("Content-Length", pdf.length);
    res.end(pdf);
  } catch (err) {
    console.error("convert error:", err);
    res.status(500).json({ error: err?.message || "conversion failed" });
  }
});

app.listen(PORT, () => {
  console.log(`md-2-pdf service listening on :${PORT}`);
});

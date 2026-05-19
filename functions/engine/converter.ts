import { marked } from "marked";
import hljs from "highlight.js";
import matter from "gray-matter";
import puppeteer from "@cloudflare/puppeteer";
import markedKatex from "marked-katex-extension";
import plantumlEncoder from "plantuml-encoder";

// ── Types ───────────────────────────────────────────────────────────────────

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  createdAt?: string;
}

export interface ConversionOptions {
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  fontSize?: number;
  fontFamily?: string;
  headerTemplate?: string;
  footerTemplate?: string;
  css?: string;
  title?: string;
  rtl?: boolean;
  theme?: string;
}

export interface ConversionResult {
  success: boolean;
  pdfBase64?: string;
  metadata: PdfMetadata;
  error?: string;
}

// ── Markdown → HTML ─────────────────────────────────────────────────────────

// ── Configure marked with custom renderers (plain object, not Renderer instance) ──
marked.use({
  renderer: {
    heading({ text, depth }: { text: string; depth: number }) {
      const id = text
        .toLowerCase()
        .replace(/[^\w\u0621-\u064A]+/g, "-")
        .replace(/^-|-$/g, "");
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },
    code({ text, lang }: { text: string; lang?: string }) {
      // PlantUML support - render as SVG diagram
      if (lang === "plantuml" || lang === "uml") {
        try {
          const encoded = plantumlEncoder.encode(text);
          const svgUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
          return `<div class="plantuml-diagram"><div class="plantuml-header"><span class="plantuml-label">PlantUML</span></div><img src="${svgUrl}" alt="PlantUML Diagram" loading="lazy" onerror="this.outerHTML='<div class=\\'plantuml-error\\'>❌ فشل تحميل المخطط</div>'" /></div>`;
        } catch {
          return `<pre><code class="hljs">${text}</code></pre>`;
        }
      }

      const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(text, { language }).value;
      const langLabel = language !== "plaintext" ? language.toUpperCase() : "CODE";
      return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-block-lang">${langLabel}</span></div><pre><code class="hljs language-${language}">${highlighted}</code></pre></div>`;
    },
  },
});

// KaTeX support via official marked-katex-extension
marked.use(markedKatex({ throwOnError: false, output: "html" }));

/**
 * Parse markdown with frontmatter metadata
 */
export function parseMarkdown(markdownContent: string): {
  metadata: PdfMetadata;
  content: string;
} {
  const { data, content } = matter(markdownContent);

  const metadata: PdfMetadata = {
    title: data.title || undefined,
    author: data.author || undefined,
    subject: data.subject || undefined,
    keywords: data.keywords || undefined,
    createdAt: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
  };

  return { metadata, content };
}

/**
 * Convert markdown content to HTML
 */
export function markdownToHtml(
  markdown: string,
  metadata: PdfMetadata,
  options: ConversionOptions = {}
): string {
  const htmlBody = marked.parse(markdown) as string;

  const fontSize = options.fontSize || 10;
  const fontFamily = options.fontFamily || "'Segoe UI', Tahoma, Arial, sans-serif";
  const marginTop = options.margin?.top || "20mm";
  const marginRight = options.margin?.right || "15mm";
  const marginBottom = options.margin?.bottom || "20mm";
  const marginLeft = options.margin?.left || "15mm";

  const customCss = options.css || "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${metadata.title ? `<title>${metadata.title}</title>` : ""}
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Fira+Code:wght@400&display=swap');

    :root {
      --primary: #1a56db;
      --text: #1f2937;
      --bg: #ffffff;
      --code-bg: #f8fafc;
      --border: #e5e7eb;
      --heading-color: #111827;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${fontFamily}, 'Noto Sans Arabic', sans-serif;
      font-size: ${fontSize}px;
      line-height: 1.8;
      color: var(--text);
      background: var(--bg);
      direction: rtl;
      text-align: right;
      padding: 0;
    }

    .cover-page {
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      min-height: 90vh; text-align: center; page-break-after: always; padding: 40px;
    }
    .cover-page h1 { font-size: 2.5em; color: var(--primary); margin-bottom: 20px; border: none; padding: 0; }
    .cover-page .meta-info { color: #6b7280; font-size: 1.1em; margin-top: 10px; }
    .cover-page .divider { width: 120px; height: 3px; background: var(--primary); margin: 30px auto; border-radius: 2px; }

    h1, h2, h3, h4, h5, h6 { color: var(--heading-color); margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 700; line-height: 1.3; }
    h1 { font-size: 1.8em; border-bottom: 2px solid var(--primary); padding-bottom: 8px; }
    h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    h3 { font-size: 1.25em; }

    p { margin-bottom: 1em; text-align: justify; }
    a { color: var(--primary); text-decoration: none; border-bottom: 1px dotted var(--primary); }
    a:hover { border-bottom-style: solid; }
    strong { color: var(--heading-color); }
    em { color: #4b5563; }

    ul, ol { margin: 0.8em 0; padding-right: 2em; }
    li { margin-bottom: 0.4em; }

    pre { background: #1e293b; border-radius: 8px; padding: 16px; overflow-x: auto; direction: ltr; text-align: left; margin: 1em 0; border: 1px solid #334155; }
    pre code { font-family: 'Fira Code', 'Courier New', monospace; font-size: 0.9em; color: #adbac7; background: transparent; }

    /* highlight.js token colors (GitHub Dark Dimmed) */
    .hljs { color: #adbac7; }
    .hljs-doctag, .hljs-keyword, .hljs-meta .hljs-keyword, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-variable.language_ { color: #f47067; }
    .hljs-title, .hljs-title.class_, .hljs-title.class_.inherited__, .hljs-title.function_ { color: #dcbdfb; }
    .hljs-attr, .hljs-attribute, .hljs-literal, .hljs-meta, .hljs-number, .hljs-operator, .hljs-selector-attr, .hljs-selector-class, .hljs-selector-id, .hljs-variable { color: #6cb6ff; }
    .hljs-meta .hljs-string, .hljs-regexp, .hljs-string { color: #96d0ff; }
    .hljs-built_in, .hljs-symbol { color: #f69d50; }
    .hljs-code, .hljs-comment, .hljs-formula { color: #768390; font-style: italic; }
    .hljs-name, .hljs-quote, .hljs-selector-pseudo, .hljs-selector-tag { color: #8ddb8c; }
    .hljs-section { color: #316dca; font-weight: 700; }
    .hljs-bullet { color: #eac55f; }
    .hljs-addition { color: #b4f1b4; background-color: #1b4721; }
    .hljs-deletion { color: #ffd8b3; background-color: #78191b; }

    /* Code block wrapper with header */
    .code-block-wrapper { margin: 1em 0; border-radius: 8px; overflow: hidden; border: 1px solid #334155; }
    .code-block-wrapper pre { margin: 0; border: none; border-radius: 0; }
    .code-block-header { display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 6px 12px; border-bottom: 1px solid #334155; }
    .code-block-lang { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    /* PlantUML diagrams */
    .plantuml-diagram { margin: 1em 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #fafbfc; text-align: center; direction: ltr; }
    .plantuml-header { background: #1e293b; padding: 6px 12px; display: flex; align-items: center; }
    .plantuml-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .plantuml-diagram img { max-width: 100%; padding: 16px; display: block; margin: 0 auto; }
    .plantuml-error { padding: 20px; color: #dc2626; text-align: center; }
    code { font-family: 'Fira Code', 'Courier New', monospace; background: var(--code-bg); padding: 2px 6px; border-radius: 4px; font-size: 0.88em; color: #dc2626; border: 1px solid var(--border); }

    blockquote { border-right: 4px solid var(--primary); margin: 1em 0; padding: 12px 20px; background: #eff6ff; border-radius: 0 8px 8px 0; color: #374151; }
    blockquote p:last-child { margin-bottom: 0; }

    table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.95em; }
    th { background: var(--primary); color: white; font-weight: 600; padding: 12px 15px; text-align: right; }
    td { padding: 10px 15px; border-bottom: 1px solid var(--border); }
    tr:nth-child(even) { background: #f9fafb; }
    tr:hover { background: #f0f4ff; }

    hr { border: none; height: 2px; background: linear-gradient(to left, transparent, var(--primary), transparent); margin: 2em 0; }
    img { max-width: 100%; border-radius: 8px; margin: 1em auto; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

    @media print {
      body { padding: 0; }
      pre { page-break-inside: avoid; }
      h1, h2, h3 { page-break-after: avoid; }
      img { page-break-inside: avoid; }
    }

    /* KaTeX styling */
    .katex-display { direction: ltr; text-align: center; margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
    .katex-display > .katex { text-align: center; }
    .katex { direction: ltr; }
    .katex-error { color: #dc2626; background: #fef2f2; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; direction: ltr; display: inline-block; }

    ${customCss}
  </style>
</head>
<body>
  ${metadata.title ? `
  <div class="cover-page">
    <h1>${metadata.title}</h1>
    <div class="divider"></div>
    ${metadata.author ? `<p class="meta-info">المؤلف: ${metadata.author}</p>` : ""}
    ${metadata.subject ? `<p class="meta-info">${metadata.subject}</p>` : ""}
    ${metadata.createdAt ? `<p class="meta-info">التاريخ: ${new Date(metadata.createdAt).toLocaleDateString("ar-SA")}</p>` : ""}
    ${metadata.keywords ? `<p class="meta-info">الكلمات المفتاحية: ${metadata.keywords.join("، ")}</p>` : ""}
  </div>` : ""}
  <div class="content">
    ${htmlBody}
  </div>
</body>
</html>`;
}

/**
 * Convert HTML to PDF using Cloudflare Browser Rendering
 */
export async function htmlToPdf(
  html: string,
  options: ConversionOptions = {},
  browserBinding?: any
): Promise<Uint8Array> {
  if (!browserBinding) {
    throw new Error("BROWSER_NOT_AVAILABLE");
  }

  let browser: any;
  try {
    browser = await puppeteer.launch(browserBinding);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: options.pageSize || "A4",
      landscape: options.orientation === "landscape",
      printBackground: true,
      margin: {
        top: options.margin?.top || "20mm",
        right: options.margin?.right || "15mm",
        bottom: options.margin?.bottom || "20mm",
        left: options.margin?.left || "15mm",
      },
      displayHeaderFooter: !!(options.headerTemplate || options.footerTemplate),
      headerTemplate: options.headerTemplate || "<div></div>",
      footerTemplate:
        options.footerTemplate ||
        `<div style="font-size:10px; text-align:center; width:100%; padding:5px 0;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
    });

    return new Uint8Array(pdfBuffer);
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
      throw new Error("RATE_LIMITED");
    }
    throw error;
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

/**
 * Full pipeline: Markdown string → PDF (base64)
 */
export async function convertMarkdownToPdf(
  markdown: string,
  options: ConversionOptions = {},
  browserBinding?: any
): Promise<ConversionResult> {
  try {
    const { metadata, content } = parseMarkdown(markdown);
    const html = markdownToHtml(content, metadata, options);
    const pdfUint8 = await htmlToPdf(html, options, browserBinding);

    return {
      success: true,
      pdfBase64: Buffer.from(pdfUint8).toString("base64"),
      metadata,
    };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg === "RATE_LIMITED") {
      return {
        success: false,
        metadata: {},
        error: "RATE_LIMITED",
      };
    }
    if (errMsg === "BROWSER_NOT_AVAILABLE") {
      return {
        success: false,
        metadata: {},
        error: "BROWSER_NOT_AVAILABLE",
      };
    }
    return {
      success: false,
      metadata: {},
      error: error instanceof Error ? error.message : "Unknown conversion error",
    };
  }
}